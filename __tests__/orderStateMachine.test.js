/**
 * Unit tests for the payment-agnostic order state machine (task 001-P2).
 * Uses an in-memory SQLite database for full isolation.
 * Covers valid transitions, invalid transitions, terminal states, and
 * state_transitions audit log accumulation.
 */

const sqlite3 = require('sqlite3').verbose();
const OrderService = require('../marketplace/backend/services/orderService');

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
        state TEXT DEFAULT 'pending',
        state_transitions TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        refunded_at DATETIME
    )
`;

const CREATE_NETWORK_REVENUE_SHARES_SQL = `
    CREATE TABLE IF NOT EXISTS network_revenue_shares (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT NOT NULL,
        peer_node_id TEXT NOT NULL,
        peer_node_url TEXT,
        revenue_share_pct REAL NOT NULL DEFAULT 0.0,
        revenue_share_amount REAL,
        currency TEXT DEFAULT 'USD',
        status TEXT NOT NULL DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        paid_at DATETIME
    )
`;

let service;
let counter = 0;

function uid() {
    return `sm_test_${Date.now()}_${++counter}`;
}

const BASE = {
    bookId: 'book-sm-test',
    bookTitle: 'State Machine Test Book',
    bookAuthor: 'Test Author',
    format: 'ebook',
    price: 9.99,
    customerEmail: 'sm-test@example.com',
};

beforeEach(done => {
    process.env.DATABASE_PATH = ':memory:';
    service = new OrderService();
    service.db.serialize(() => {
        service.db.run(CREATE_ORDERS_SQL);
        service.db.run(CREATE_NETWORK_REVENUE_SHARES_SQL, done);
    });
});

afterEach(() => {
    service.close();
});

// ─── Valid transitions ──────────────────────────────────────────────────────

describe('updateOrderState — valid transitions', () => {
    it('transitions pending → processing', async () => {
        const orderId = uid();
        await service.createOrder({ ...BASE, orderId });

        const result = await service.updateOrderState(orderId, 'processing', { provider: 'stripe' });
        expect(result.from).toBe('pending');
        expect(result.to).toBe('processing');
        expect(result.changes).toBe(1);

        const order = await service.getOrder(orderId);
        expect(order.state).toBe('processing');
    });

    it('transitions processing → completed and accumulates state_transitions log', async () => {
        const orderId = uid();
        await service.createOrder({ ...BASE, orderId });

        await service.updateOrderState(orderId, 'processing', { provider: 'stripe' });
        await service.updateOrderState(orderId, 'completed', { downloadToken: 'tok_abc' });

        const order = await service.getOrder(orderId);
        expect(order.state).toBe('completed');

        const log = JSON.parse(order.state_transitions);
        expect(log).toHaveLength(2);
        expect(log[0]).toMatchObject({ from: 'pending', to: 'processing' });
        expect(log[1]).toMatchObject({ from: 'processing', to: 'completed' });
        expect(typeof log[0].at).toBe('string'); // ISO timestamp present
    });

    it('transitions completed → refunded', async () => {
        const orderId = uid();
        await service.createOrder({ ...BASE, orderId });

        await service.updateOrderState(orderId, 'processing');
        await service.updateOrderState(orderId, 'completed');
        const result = await service.updateOrderState(orderId, 'refunded', { refundId: 'ref_123' });

        expect(result.to).toBe('refunded');
        const order = await service.getOrder(orderId);
        expect(order.state).toBe('refunded');
    });

    it('transitions pending → failed directly', async () => {
        const orderId = uid();
        await service.createOrder({ ...BASE, orderId });

        const result = await service.updateOrderState(orderId, 'failed', { reason: 'card_declined' });
        expect(result.from).toBe('pending');
        expect(result.to).toBe('failed');
    });
});

// ─── Invalid transitions ────────────────────────────────────────────────────

describe('updateOrderState — invalid transitions', () => {
    it('rejects pending → completed (must go through processing)', async () => {
        const orderId = uid();
        await service.createOrder({ ...BASE, orderId });

        await expect(
            service.updateOrderState(orderId, 'completed')
        ).rejects.toThrow(/invalid transition/i);
    });

    it('rejects pending → refunded', async () => {
        const orderId = uid();
        await service.createOrder({ ...BASE, orderId });

        await expect(
            service.updateOrderState(orderId, 'refunded')
        ).rejects.toThrow(/invalid transition/i);
    });

    it('rejects transitions out of terminal state (failed → processing)', async () => {
        const orderId = uid();
        await service.createOrder({ ...BASE, orderId });
        await service.updateOrderState(orderId, 'failed', { reason: 'payment_declined' });

        await expect(
            service.updateOrderState(orderId, 'processing')
        ).rejects.toThrow(/invalid transition/i);
    });

    it('rejects transitions out of terminal state (refunded → completed)', async () => {
        const orderId = uid();
        await service.createOrder({ ...BASE, orderId });
        await service.updateOrderState(orderId, 'processing');
        await service.updateOrderState(orderId, 'completed');
        await service.updateOrderState(orderId, 'refunded');

        await expect(
            service.updateOrderState(orderId, 'completed')
        ).rejects.toThrow(/invalid transition/i);
    });

    it('throws when order does not exist', async () => {
        await expect(
            service.updateOrderState('nonexistent_order_id', 'processing')
        ).rejects.toThrow(/not found/i);
    });
});
