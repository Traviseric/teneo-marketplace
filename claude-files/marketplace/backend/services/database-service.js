const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database configuration
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../database/marketplace.db');

// Ensure database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Create database connection with promise support
class DatabaseService {
    constructor() {
        this.db = null;
        this.connected = false;
    }

    // Connect to database
    connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(dbPath, (err) => {
                if (err) {
                    console.error('Database connection error:', err);
                    reject(err);
                } else {
                    console.log('Connected to database:', dbPath);
                    this.connected = true;
                    this.db.run('PRAGMA foreign_keys = ON');
                    resolve();
                }
            });
        });
    }

    // Close database connection
    close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        this.connected = false;
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }

    // Run a query (INSERT, UPDATE, DELETE)
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        id: this.lastID,
                        changes: this.changes
                    });
                }
            });
        });
    }

    // Get a single row
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // Get all rows
    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Customer operations
    async createCustomer(email, name = null, stripeCustomerId = null) {
        const sql = `
            INSERT INTO customers (email, name, stripe_customer_id)
            VALUES (?, ?, ?)
            ON CONFLICT(email) DO UPDATE SET
                name = COALESCE(excluded.name, name),
                stripe_customer_id = COALESCE(excluded.stripe_customer_id, stripe_customer_id),
                updated_at = CURRENT_TIMESTAMP
        `;
        const result = await this.run(sql, [email, name, stripeCustomerId]);
        return this.getCustomerByEmail(email);
    }

    async getCustomerByEmail(email) {
        const sql = 'SELECT * FROM customers WHERE email = ?';
        return this.get(sql, [email]);
    }

    async getCustomerById(id) {
        const sql = 'SELECT * FROM customers WHERE id = ?';
        return this.get(sql, [id]);
    }

    // Order operations
    async createOrder(orderData) {
        const {
            orderId,
            customerId,
            stripeSessionId,
            stripePaymentIntent,
            brand = 'default',
            total,
            currency = 'USD',
            status = 'pending',
            paymentStatus = 'pending',
            metadata = null
        } = orderData;

        const sql = `
            INSERT INTO orders (
                order_id, customer_id, stripe_session_id, stripe_payment_intent,
                brand, total, currency, status, payment_status, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            orderId, customerId, stripeSessionId, stripePaymentIntent,
            brand, total, currency, status, paymentStatus,
            metadata ? JSON.stringify(metadata) : null
        ];

        const result = await this.run(sql, params);
        return result.id;
    }

    async getOrderById(orderId) {
        const sql = `
            SELECT o.*, c.email, c.name as customer_name
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            WHERE o.order_id = ?
        `;
        return this.get(sql, [orderId]);
    }

    async updateOrderStatus(orderId, status, paymentStatus = null) {
        let sql = 'UPDATE orders SET status = ?';
        const params = [status];

        if (paymentStatus) {
            sql += ', payment_status = ?';
            params.push(paymentStatus);
        }

        if (status === 'completed') {
            sql += ', completed_at = CURRENT_TIMESTAMP';
        }

        sql += ' WHERE order_id = ?';
        params.push(orderId);

        return this.run(sql, params);
    }

    // Order items operations
    async addOrderItems(orderId, items) {
        const sql = `
            INSERT INTO order_items (
                order_id, book_id, title, author, price, 
                quantity, subtotal, digital_file_path
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const promises = items.map(item => {
            const params = [
                orderId,
                item.id || item.bookId,
                item.title,
                item.author,
                item.price,
                item.quantity || 1,
                item.price * (item.quantity || 1),
                item.digitalFilePath || `/books/${item.brand || 'default'}/${item.id || item.bookId}.pdf`
            ];
            return this.run(sql, params);
        });

        return Promise.all(promises);
    }

    async getOrderItems(orderId) {
        const sql = `
            SELECT * FROM order_items 
            WHERE order_id = (
                SELECT id FROM orders WHERE order_id = ?
            )
        `;
        return this.all(sql, [orderId]);
    }

    // Download token operations
    async createDownloadToken(tokenData) {
        const {
            token,
            orderId,
            bookId,
            customerEmail,
            maxDownloads = 5,
            expiresAt
        } = tokenData;

        const sql = `
            INSERT INTO download_tokens (
                token, order_id, book_id, customer_email, 
                max_downloads, expires_at
            ) VALUES (?, (SELECT id FROM orders WHERE order_id = ?), ?, ?, ?, ?)
        `;

        const params = [token, orderId, bookId, customerEmail, maxDownloads, expiresAt];
        return this.run(sql, params);
    }

    async getDownloadToken(token) {
        const sql = 'SELECT * FROM download_tokens WHERE token = ?';
        return this.get(sql, [token]);
    }

    async incrementDownloadCount(token, ipAddress) {
        const sql = `
            UPDATE download_tokens 
            SET downloads = downloads + 1,
                last_download_at = CURRENT_TIMESTAMP,
                ip_addresses = CASE 
                    WHEN ip_addresses IS NULL THEN ?
                    ELSE ip_addresses || ',' || ?
                END
            WHERE token = ?
        `;
        return this.run(sql, [ipAddress, ipAddress, token]);
    }

    // Email log operations
    async logEmail(emailData) {
        const {
            orderId,
            customerEmail,
            emailType,
            subject,
            status = 'pending',
            messageId = null,
            error = null
        } = emailData;

        const sql = `
            INSERT INTO email_logs (
                order_id, customer_email, email_type, 
                subject, status, message_id, error, sent_at
            ) VALUES (
                (SELECT id FROM orders WHERE order_id = ?), 
                ?, ?, ?, ?, ?, ?, 
                CASE WHEN ? = 'sent' THEN CURRENT_TIMESTAMP ELSE NULL END
            )
        `;

        const params = [
            orderId, customerEmail, emailType, subject, 
            status, messageId, error, status
        ];

        return this.run(sql, params);
    }

    // Analytics operations
    async trackEvent(eventData) {
        const {
            eventType,
            bookId = null,
            orderId = null,
            customerId = null,
            brand = null,
            ipAddress = null,
            userAgent = null,
            referrer = null,
            metadata = null
        } = eventData;

        const sql = `
            INSERT INTO analytics (
                event_type, book_id, order_id, customer_id,
                brand, ip_address, user_agent, referrer, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            eventType, bookId, orderId, customerId,
            brand, ipAddress, userAgent, referrer,
            metadata ? JSON.stringify(metadata) : null
        ];

        return this.run(sql, params);
    }

    // Get analytics summary
    async getAnalyticsSummary(days = 30) {
        const sql = `
            SELECT 
                COUNT(DISTINCT CASE WHEN event_type = 'page_view' THEN ip_address END) as unique_visitors,
                COUNT(CASE WHEN event_type = 'download' THEN 1 END) as total_downloads,
                COUNT(DISTINCT order_id) as total_orders,
                COUNT(DISTINCT customer_id) as total_customers
            FROM analytics
            WHERE created_at >= datetime('now', '-${days} days')
        `;
        return this.get(sql);
    }

    // Stripe webhook operations
    async recordWebhook(eventId, eventType, data) {
        const sql = `
            INSERT INTO stripe_webhooks (stripe_event_id, event_type, data)
            VALUES (?, ?, ?)
            ON CONFLICT(stripe_event_id) DO NOTHING
        `;
        return this.run(sql, [eventId, eventType, JSON.stringify(data)]);
    }

    async isWebhookProcessed(eventId) {
        const sql = 'SELECT processed FROM stripe_webhooks WHERE stripe_event_id = ?';
        const result = await this.get(sql, [eventId]);
        return result && result.processed === 1;
    }

    async markWebhookProcessed(eventId) {
        const sql = `
            UPDATE stripe_webhooks 
            SET processed = 1, processed_at = CURRENT_TIMESTAMP 
            WHERE stripe_event_id = ?
        `;
        return this.run(sql, [eventId]);
    }

    // Order summary for customer
    async getCustomerOrders(email) {
        const sql = `
            SELECT o.*, COUNT(oi.id) as item_count
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            LEFT JOIN order_items oi ON oi.order_id = o.id
            WHERE c.email = ?
            GROUP BY o.id
            ORDER BY o.created_at DESC
        `;
        return this.all(sql, [email]);
    }

    // Get complete order details
    async getCompleteOrder(orderId) {
        const order = await this.getOrderById(orderId);
        if (!order) return null;

        const items = await this.getOrderItems(orderId);
        order.items = items;

        return order;
    }
}

// Create singleton instance
const dbService = new DatabaseService();

// Auto-connect on first use
let connectionPromise = null;
const ensureConnected = async () => {
    if (!dbService.connected && !connectionPromise) {
        connectionPromise = dbService.connect();
    }
    if (connectionPromise) {
        await connectionPromise;
    }
};

// Wrap all methods to ensure connection
const wrappedService = new Proxy(dbService, {
    get(target, prop) {
        const original = target[prop];
        if (typeof original === 'function' && prop !== 'connect' && prop !== 'close') {
            return async (...args) => {
                await ensureConnected();
                return original.apply(target, args);
            };
        }
        return original;
    }
});

module.exports = wrappedService;