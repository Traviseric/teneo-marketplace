const crypto = require('crypto');

// Canonical order states for the payment-agnostic state machine.
const ORDER_STATES = Object.freeze({
    PENDING:    'pending',
    PROCESSING: 'processing',
    COMPLETED:  'completed',
    FAILED:     'failed',
    REFUNDED:   'refunded',
    DISPUTED:   'disputed',
});

// Valid state transitions — enforces lifecycle rules.
const VALID_TRANSITIONS = Object.freeze({
    pending:    new Set(['processing', 'failed']),
    processing: new Set(['completed', 'failed']),
    completed:  new Set(['refunded', 'disputed']),
    disputed:   new Set(['refunded', 'completed']),
    failed:     new Set(),
    refunded:   new Set(),
});

// Whitelist of columns that may be updated via updateOrderStatus().
// Prevents SQL injection if a caller ever passes user-controlled keys.
const ALLOWED_UPDATE_KEYS = new Set([
    'status',
    'payment_status',
    'fulfillment_status',
    'order_type',
    'download_token',
    'download_count',
    'download_expiry',
    'metadata',
    'shipping_address',
    'shipping_method',
    'contains_physical',
    'stripe_session_id',
    'stripe_payment_intent_id',
    'refund_id',
    'refund_status',
    'refund_amount',
    'refund_reason',
    'lulu_print_job_id',
    'printful_order_id',
    'tracking_number',
    'tracking_url',
    'estimated_delivery',
    'shipping_cost',
    'state',
    'state_transitions',
]);

class OrderService {
    constructor(options = {}) {
        if (options.db) {
            this.db = options.db;
            this.ownsConnection = false;
            return;
        }

        // Keep test behavior: if tests request in-memory DB, use an isolated sqlite connection.
        // sqlite3 is required via the shared adapter helper to avoid direct imports in services/.
        if (process.env.DATABASE_PATH === ':memory:') {
            // eslint-disable-next-line global-require
            const { createRawSqliteDb } = require('../database/database');
            this.db = createRawSqliteDb(':memory:');
            this.ownsConnection = true;
            return;
        }

        // Default runtime path uses shared adapter (SQLite fallback or Postgres via DATABASE_URL).
        // eslint-disable-next-line global-require
        this.db = require('../database/database');
        this.ownsConnection = false;
    }

    // Create a new order
    async createOrder(orderData) {
        return new Promise((resolve, reject) => {
            const {
                orderId,
                stripeSessionId,
                customerEmail,
                customerName,
                bookId,
                bookTitle,
                bookAuthor,
                format,
                price,
                currency = 'USD',
                metadata = {}
            } = orderData;

            const sql = `
                INSERT INTO orders (
                    order_id, stripe_session_id, customer_email, customer_name,
                    book_id, book_title, book_author, format, price, currency,
                    status, payment_status, fulfillment_status, metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const params = [
                orderId,
                stripeSessionId,
                customerEmail,
                customerName || null,
                bookId,
                bookTitle,
                bookAuthor,
                format,
                price,
                currency,
                'pending',
                'pending',
                'pending',
                JSON.stringify(metadata)
            ];

            const db = this.db;
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve({ id: this.lastID, orderId });

                // Persist federation revenue share if this order originated from a peer node
                if (metadata.sourceNode && metadata.revenueSharePct) {
                    const revShareSql = `
                        INSERT INTO network_revenue_shares
                            (order_id, peer_node_id, peer_node_url, revenue_share_pct,
                             revenue_share_amount, currency, status)
                        VALUES (?, ?, ?, ?, ?, ?, 'pending')
                    `;
                    const revenueAmount = price * (metadata.revenueSharePct / 100);
                    db.run(revShareSql, [
                        orderId,
                        metadata.sourceNode,
                        metadata.sourceNodeUrl || null,
                        metadata.revenueSharePct,
                        revenueAmount,
                        currency
                    ], (revErr) => {
                        if (revErr) {
                            console.error('[OrderService] Failed to persist revenue share:', revErr.message);
                        }
                    });
                }
            });
        });
    }

    // Update order status
    async updateOrderStatus(orderId, updates) {
        return new Promise((resolve, reject) => {
            const fields = [];
            const values = [];

            // Build dynamic update query — validate all keys against whitelist (CWE-89)
            for (const key of Object.keys(updates)) {
                if (!ALLOWED_UPDATE_KEYS.has(key)) {
                    return reject(new Error(`updateOrderStatus: unknown column '${key}'`));
                }
                fields.push(`${key} = ?`);
                values.push(updates[key]);
            }

            // Always update updated_at
            fields.push('updated_at = CURRENT_TIMESTAMP');
            values.push(orderId);

            const sql = `UPDATE orders SET ${fields.join(', ')} WHERE order_id = ?`;

            this.db.run(sql, values, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });
    }

    /**
     * Payment-agnostic state machine transition.
     *
     * Validates the transition (current → newState) against VALID_TRANSITIONS
     * and writes the new state + appends a timestamped transition entry to
     * state_transitions (JSON array).
     *
     * @param {string} orderId
     * @param {string} newState  One of ORDER_STATES values
     * @param {object} metadata  Optional context about the transition
     * @throws if order not found or transition is invalid
     */
    async updateOrderState(orderId, newState, metadata = {}) {
        const order = await this.getOrder(orderId);
        if (!order) {
            throw new Error(`updateOrderState: order '${orderId}' not found`);
        }

        const currentState = order.state || 'pending';
        const allowed = VALID_TRANSITIONS[currentState];

        if (!allowed) {
            throw new Error(`updateOrderState: unknown current state '${currentState}'`);
        }
        if (!allowed.has(newState)) {
            throw new Error(
                `updateOrderState: invalid transition ${currentState} → ${newState}. ` +
                `Allowed from '${currentState}': [${[...allowed].join(', ')}]`
            );
        }

        let transitions;
        try {
            transitions = JSON.parse(order.state_transitions || '[]');
            if (!Array.isArray(transitions)) transitions = [];
        } catch {
            transitions = [];
        }
        transitions.push({ from: currentState, to: newState, at: new Date().toISOString(), metadata });

        return new Promise((resolve, reject) => {
            const sql = `
                UPDATE orders
                SET state = ?, state_transitions = ?, updated_at = CURRENT_TIMESTAMP
                WHERE order_id = ?
            `;
            this.db.run(sql, [newState, JSON.stringify(transitions), orderId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes, from: currentState, to: newState });
                }
            });
        });
    }

    // Get order by ID
    async getOrder(orderId) {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM orders WHERE order_id = ?';
            
            this.db.get(sql, [orderId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // Get order by Stripe session ID
    async getOrderBySessionId(sessionId) {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM orders WHERE stripe_session_id = ?';
            
            this.db.get(sql, [sessionId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // Get order by Printful order ID
    async getOrderByPrintfulOrderId(printfulOrderId) {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM orders WHERE printful_order_id = ?';

            this.db.get(sql, [printfulOrderId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // Get order by Lulu print job ID
    async getOrderByLuluPrintJobId(luluPrintJobId) {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM orders WHERE lulu_print_job_id = ?';

            this.db.get(sql, [luluPrintJobId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // Mark order as completed
    async completeOrder(orderId, paymentIntentId) {
        const downloadToken = crypto.randomBytes(32).toString('hex');
        const downloadExpiry = new Date();
        downloadExpiry.setHours(downloadExpiry.getHours() + 24);

        return new Promise((resolve, reject) => {
            const sql = `
                UPDATE orders 
                SET status = 'completed',
                    payment_status = 'paid',
                    fulfillment_status = 'pending',
                    stripe_payment_intent_id = ?,
                    download_token = ?,
                    download_expiry = ?,
                    completed_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE order_id = ?
            `;

            this.db.run(sql, [paymentIntentId, downloadToken, downloadExpiry.toISOString(), orderId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ 
                        changes: this.changes, 
                        downloadToken,
                        downloadExpiry 
                    });
                }
            });
        });
    }

    // Mark order as fulfilled
    async fulfillOrder(orderId) {
        return this.updateOrderStatus(orderId, {
            fulfillment_status: 'fulfilled'
        });
    }

    // Handle failed payment
    async failOrder(orderId, reason) {
        return new Promise((resolve, reject) => {
            const sql = `
                UPDATE orders 
                SET status = 'failed',
                    payment_status = 'failed',
                    metadata = json_set(COALESCE(metadata, '{}'), '$.failure_reason', ?),
                    updated_at = CURRENT_TIMESTAMP
                WHERE order_id = ?
            `;

            this.db.run(sql, [reason, orderId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });
    }

    // Process refund
    async refundOrder(orderId, refundData) {
        const { refundId, stripeRefundId, amount, reason } = refundData;
        const updateOrderSql = `
            UPDATE orders 
            SET refund_status = 'refunded',
                refund_amount = ?,
                refund_reason = ?,
                refunded_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE order_id = ?
        `;

        const insertRefundSql = `
            INSERT INTO refunds (
                refund_id, order_id, stripe_refund_id, 
                amount, reason, status
            ) VALUES (?, ?, ?, ?, ?, 'completed')
        `;

        if (typeof this.db.transaction === 'function') {
            await this.db.transaction(async (tx) => {
                await tx.run(updateOrderSql, [amount, reason, orderId]);
                await tx.run(insertRefundSql, [refundId, orderId, stripeRefundId, amount, reason]);
            });
        } else {
            await new Promise((resolve, reject) => {
                this.db.serialize(() => {
                    this.db.run('BEGIN TRANSACTION');
                    this.db.run(updateOrderSql, [amount, reason, orderId], (updateErr) => {
                        if (updateErr) {
                            this.db.run('ROLLBACK');
                            reject(updateErr);
                            return;
                        }

                        this.db.run(insertRefundSql, [refundId, orderId, stripeRefundId, amount, reason], (insertErr) => {
                            if (insertErr) {
                                this.db.run('ROLLBACK');
                                reject(insertErr);
                                return;
                            }
                            this.db.run('COMMIT');
                            resolve();
                        });
                    });
                });
            });
        }

        return { success: true };
    }

    // Log download attempt
    async logDownload(orderId, token, ipAddress, userAgent, status, errorMessage = null) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO download_logs (
                    order_id, download_token, ip_address, 
                    user_agent, download_status, error_message
                ) VALUES (?, ?, ?, ?, ?, ?)
            `;

            this.db.run(sql, [orderId, token, ipAddress, userAgent, status, errorMessage], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID });
                }
            });
        });
    }

    // Increment download count
    async incrementDownloadCount(orderId) {
        return new Promise((resolve, reject) => {
            const sql = `
                UPDATE orders 
                SET download_count = download_count + 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE order_id = ?
            `;

            this.db.run(sql, [orderId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });
    }

    // Get order by download token
    async getOrderByDownloadToken(token) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT * FROM orders 
                WHERE download_token = ? 
                AND download_expiry > datetime('now')
            `;
            
            this.db.get(sql, [token], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // Log payment event
    async logPaymentEvent(eventData) {
        const { stripeEventId, eventType, orderId, payload } = eventData;

        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO payment_events (
                    stripe_event_id, event_type, order_id, payload
                ) VALUES (?, ?, ?, ?)
            `;

            this.db.run(sql, [stripeEventId, eventType, orderId, JSON.stringify(payload)], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID });
                }
            });
        });
    }

    // Mark payment event as processed
    async markEventProcessed(stripeEventId, success = true, errorMessage = null) {
        return new Promise((resolve, reject) => {
            const sql = `
                UPDATE payment_events 
                SET processed = 1,
                    processed_at = CURRENT_TIMESTAMP,
                    error_message = ?
                WHERE stripe_event_id = ?
            `;

            this.db.run(sql, [errorMessage, stripeEventId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });
    }

    // Check if event was already processed
    async isEventProcessed(stripeEventId) {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT processed FROM payment_events WHERE stripe_event_id = ?';
            
            this.db.get(sql, [stripeEventId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row && row.processed === 1);
                }
            });
        });
    }

    // Log email
    async logEmail(emailData) {
        const { orderId, emailType, recipientEmail, subject, status, errorMessage, messageId } = emailData;

        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO email_logs (
                    order_id, email_type, recipient_email, 
                    subject, status, error_message, message_id, sent_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const sentAt = status === 'sent' ? new Date().toISOString() : null;

            this.db.run(sql, [orderId, emailType, recipientEmail, subject, status, errorMessage, messageId, sentAt], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID });
                }
            });
        });
    }

    // Get customer orders
    async getCustomerOrders(email) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT * FROM orders 
                WHERE customer_email = ? 
                ORDER BY created_at DESC
            `;
            
            this.db.all(sql, [email], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Get recent orders (admin)
    async getRecentOrders(limit = 50) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT * FROM orders 
                ORDER BY created_at DESC 
                LIMIT ?
            `;
            
            this.db.all(sql, [limit], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Close database connection
    close() {
        if (this.ownsConnection && this.db && typeof this.db.close === 'function') {
            this.db.close();
        }
    }
}

module.exports = OrderService;
module.exports.ORDER_STATES = ORDER_STATES;
module.exports.VALID_TRANSITIONS = VALID_TRANSITIONS;
