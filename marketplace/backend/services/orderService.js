const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

// Whitelist of columns that may be updated via updateOrderStatus().
// Prevents SQL injection if a caller ever passes user-controlled keys.
const ALLOWED_UPDATE_KEYS = new Set([
    'status',
    'payment_status',
    'fulfillment_status',
    'download_token',
    'download_count',
    'download_expiry',
    'metadata',
    'stripe_session_id',
    'stripe_payment_intent_id',
    'refund_id',
    'refund_status',
    'refund_amount',
    'refund_reason',
    'lulu_print_job_id',
    'tracking_number',
    'estimated_delivery',
    'shipping_cost',
]);

class OrderService {
    constructor() {
        const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../database/orders.db');
        this.db = new sqlite3.Database(dbPath);
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

            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, orderId });
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
                    metadata = json_patch(metadata, '$.failure_reason', ?),
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

        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                // Start transaction
                this.db.run('BEGIN TRANSACTION');

                // Update order
                const updateOrderSql = `
                    UPDATE orders 
                    SET refund_status = 'refunded',
                        refund_amount = ?,
                        refund_reason = ?,
                        refunded_at = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE order_id = ?
                `;

                this.db.run(updateOrderSql, [amount, reason, orderId], (err) => {
                    if (err) {
                        this.db.run('ROLLBACK');
                        reject(err);
                        return;
                    }

                    // Insert refund record
                    const insertRefundSql = `
                        INSERT INTO refunds (
                            refund_id, order_id, stripe_refund_id, 
                            amount, reason, status
                        ) VALUES (?, ?, ?, ?, ?, 'completed')
                    `;

                    this.db.run(insertRefundSql, [refundId, orderId, stripeRefundId, amount, reason], (err) => {
                        if (err) {
                            this.db.run('ROLLBACK');
                            reject(err);
                        } else {
                            this.db.run('COMMIT');
                            resolve({ success: true });
                        }
                    });
                });
            });
        });
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
        this.db.close();
    }
}

module.exports = OrderService;