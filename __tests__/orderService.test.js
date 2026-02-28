/**
 * Unit tests for OrderService CRUD operations.
 * Uses an in-memory SQLite database for full isolation.
 * Covers createOrder, updateOrderStatus (including task-037 whitelist fix),
 * and getOrderByDownloadToken.
 */

const sqlite3 = require('sqlite3').verbose();
const OrderService = require('../marketplace/backend/services/orderService');

// Orders table DDL matching schema.sql
const CREATE_ORDERS_SQL = `
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT UNIQUE NOT NULL,
        stripe_session_id TEXT,
        stripe_payment_intent_id TEXT,
        customer_email TEXT NOT NULL,
        customer_name TEXT,
        book_id TEXT NOT NULL,
        book_title TEXT NOT NULL,
        book_author TEXT NOT NULL,
        format TEXT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        currency TEXT DEFAULT 'USD',
        status TEXT NOT NULL DEFAULT 'pending',
        payment_status TEXT DEFAULT 'pending',
        fulfillment_status TEXT DEFAULT 'pending',
        download_token TEXT,
        download_count INTEGER DEFAULT 0,
        download_expiry DATETIME,
        refund_status TEXT,
        refund_amount DECIMAL(10,2),
        refund_reason TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        refunded_at DATETIME
    )
`;

let service;
let orderCount = 0;

function uniqueOrderId() {
    return `order_test_${Date.now()}_${++orderCount}`;
}

const SAMPLE_ORDER = {
    bookId: 'book-001',
    bookTitle: 'Test Book',
    bookAuthor: 'Test Author',
    format: 'ebook',
    price: 19.99,
    customerEmail: 'buyer@test.com'
};

beforeEach(done => {
    // Each test gets a fresh in-memory DB — total isolation
    process.env.DATABASE_PATH = ':memory:';
    service = new OrderService();
    service.db.run(CREATE_ORDERS_SQL, done);
});

afterEach(() => {
    service.close();
});

describe('OrderService.createOrder()', () => {
    it('inserts a new order and resolves with orderId', async () => {
        const orderId = uniqueOrderId();
        const result = await service.createOrder({ ...SAMPLE_ORDER, orderId });

        expect(result).toBeDefined();
        expect(result.orderId).toBe(orderId);
        expect(typeof result.id).toBe('number');
    });

    it('persists order so getOrder() can retrieve it', async () => {
        const orderId = uniqueOrderId();
        await service.createOrder({ ...SAMPLE_ORDER, orderId });

        const row = await service.getOrder(orderId);
        expect(row).not.toBeNull();
        expect(row.order_id).toBe(orderId);
        expect(row.customer_email).toBe('buyer@test.com');
        expect(row.status).toBe('pending');
        expect(row.payment_status).toBe('pending');
    });
});

describe('OrderService.updateOrderStatus()', () => {
    it('updates a whitelisted column (status) successfully', async () => {
        const orderId = uniqueOrderId();
        await service.createOrder({ ...SAMPLE_ORDER, orderId });

        const result = await service.updateOrderStatus(orderId, { status: 'completed' });
        expect(result.changes).toBe(1);

        const row = await service.getOrder(orderId);
        expect(row.status).toBe('completed');
    });

    it('updates multiple whitelisted columns in one call', async () => {
        const orderId = uniqueOrderId();
        await service.createOrder({ ...SAMPLE_ORDER, orderId });

        await service.updateOrderStatus(orderId, {
            status: 'completed',
            payment_status: 'paid',
            fulfillment_status: 'fulfilled'
        });

        const row = await service.getOrder(orderId);
        expect(row.status).toBe('completed');
        expect(row.payment_status).toBe('paid');
        expect(row.fulfillment_status).toBe('fulfilled');
    });

    it('rejects unknown column names (task-037 SQL injection whitelist fix)', async () => {
        const orderId = uniqueOrderId();
        await service.createOrder({ ...SAMPLE_ORDER, orderId });

        await expect(
            service.updateOrderStatus(orderId, { 'malicious_col; DROP TABLE orders; --': 'value' })
        ).rejects.toThrow(/unknown column/i);
    });

    it('rejects a plausible but non-whitelisted column name', async () => {
        const orderId = uniqueOrderId();
        await service.createOrder({ ...SAMPLE_ORDER, orderId });

        await expect(
            service.updateOrderStatus(orderId, { customer_email: 'attacker@evil.com' })
        ).rejects.toThrow(/unknown column/i);
    });
});

describe('OrderService.getOrderByDownloadToken()', () => {
    it('returns null for an unknown download token', async () => {
        const row = await service.getOrderByDownloadToken('nonexistent_token_abc123');
        expect(row).toBeUndefined(); // sqlite3 db.get returns undefined when no rows match
    });

    it('returns the order when token is valid and not expired', async () => {
        const orderId = uniqueOrderId();
        await service.createOrder({ ...SAMPLE_ORDER, orderId });

        const token = 'valid_test_token_' + Date.now();
        // Set download_token and a far-future expiry using SQLite datetime format
        await service.updateOrderStatus(orderId, {
            download_token: token,
            download_expiry: '2099-12-31 23:59:59'
        });

        const row = await service.getOrderByDownloadToken(token);
        expect(row).not.toBeNull();
        expect(row).not.toBeUndefined();
        expect(row.order_id).toBe(orderId);
        expect(row.download_token).toBe(token);
    });

    it('returns undefined for a token with a past expiry', async () => {
        const orderId = uniqueOrderId();
        await service.createOrder({ ...SAMPLE_ORDER, orderId });

        const token = 'expired_token_' + Date.now();
        // Set expiry in the past
        await service.updateOrderStatus(orderId, {
            download_token: token,
            download_expiry: '2000-01-01 00:00:00'
        });

        const row = await service.getOrderByDownloadToken(token);
        // Expired token should not be returned (download_expiry <= datetime('now'))
        expect(row).toBeUndefined();
    });
});
