'use strict';
/**
 * Tests for dispute and refund endpoints:
 *   POST /api/orders/:orderId/dispute  (ordersRoutes.js)
 *   POST /api/admin/orders/:orderId/refund  (adminRoutes.js — auth + logic)
 *   OrderService state machine — disputed / refunded states
 */

process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret-32-chars-long-enough!!';
process.env.ADMIN_PASSWORD_HASH = '$2b$10$test.hash.placeholder.that.wont.match.any.password';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../database/database', () => ({
    get: jest.fn(),
    all: jest.fn(),
    run: jest.fn(),
}));

const mockGetOrder = jest.fn();
const mockUpdateOrderStatus = jest.fn();
const mockUpdateOrderState = jest.fn();

jest.mock('../services/orderService', () => {
    return jest.fn().mockImplementation(() => ({
        getOrder: mockGetOrder,
        updateOrderStatus: mockUpdateOrderStatus,
        updateOrderState: mockUpdateOrderState,
    }));
});

jest.mock('../services/analyticsService', () => {
    return jest.fn().mockImplementation(() => ({
        getConversionRate: jest.fn().mockResolvedValue(0),
        getOrderRevenue: jest.fn().mockResolvedValue([]),
    }));
});

jest.mock('../services/auditService', () => ({
    logAdminLogin: jest.fn().mockResolvedValue(undefined),
    logAdminLogout: jest.fn().mockResolvedValue(undefined),
    logAdminAction: jest.fn().mockResolvedValue(undefined),
    logFinancialAction: jest.fn().mockResolvedValue(undefined),
    logDataAccess: jest.fn().mockResolvedValue(undefined),
    log: jest.fn().mockResolvedValue(undefined),
}));

const mockSendRefundConfirmationEmail = jest.fn().mockResolvedValue({ success: true });
const mockSendDisputeAlert = jest.fn().mockResolvedValue({ success: true });

jest.mock('../services/emailService', () => ({
    sendRefundConfirmationEmail: mockSendRefundConfirmationEmail,
    sendDisputeAlert: mockSendDisputeAlert,
}));

jest.mock('fs', () => {
    const actual = jest.requireActual('fs');
    return {
        ...actual,
        promises: {
            ...actual.promises,
            readFile: jest.fn().mockRejectedValue(new Error('ENOENT')),
            writeFile: jest.fn().mockResolvedValue(undefined),
            mkdir: jest.fn().mockResolvedValue(undefined),
        },
    };
});

// ── App helpers ───────────────────────────────────────────────────────────────

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const request = require('supertest');

function buildApp() {
    const app = express();
    app.use(bodyParser.json());
    app.use(session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
    }));
    // Helper to inject admin session
    app.get('/__set-admin-session', (req, res) => {
        req.session.isAdmin = true;
        req.session.loginTime = Date.now();
        res.json({ ok: true });
    });
    app.use('/api/orders', require('../routes/ordersRoutes'));
    app.use('/api/admin', require('../routes/adminRoutes'));
    return app;
}

let consoleLogSpy, consoleWarnSpy, consoleErrorSpy;
beforeAll(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
});
beforeEach(() => {
    jest.clearAllMocks();
});

// ── OrderService state machine ────────────────────────────────────────────────
// Use requireActual to bypass the constructor mock and inspect real exports.

describe('OrderService state machine — disputed state', () => {
    const { ORDER_STATES, VALID_TRANSITIONS } = jest.requireActual('../services/orderService');

    it('exports DISPUTED state', () => {
        expect(ORDER_STATES.DISPUTED).toBe('disputed');
    });

    it('allows completed → disputed transition', () => {
        expect(VALID_TRANSITIONS.completed.has('disputed')).toBe(true);
    });

    it('allows disputed → refunded transition', () => {
        expect(VALID_TRANSITIONS.disputed.has('refunded')).toBe(true);
    });

    it('allows completed → refunded transition (existing)', () => {
        expect(VALID_TRANSITIONS.completed.has('refunded')).toBe(true);
    });

    it('does NOT allow pending → disputed transition', () => {
        expect(VALID_TRANSITIONS.pending.has('disputed')).toBe(false);
    });
});

// ── POST /api/orders/:orderId/dispute ────────────────────────────────────────

describe('POST /api/orders/:orderId/dispute', () => {
    let app;
    beforeAll(() => { app = buildApp(); });

    it('returns 422 when reason is missing', async () => {
        const res = await request(app)
            .post('/api/orders/order-1/dispute')
            .send({ email: 'user@example.com' });
        expect(res.status).toBe(422);
        expect(res.body.success).toBe(false);
    });

    it('returns 422 when email is missing', async () => {
        const res = await request(app)
            .post('/api/orders/order-1/dispute')
            .send({ reason: 'Item not received' });
        expect(res.status).toBe(422);
        expect(res.body.success).toBe(false);
    });

    it('returns 404 when order not found', async () => {
        mockGetOrder.mockResolvedValueOnce(null);
        const res = await request(app)
            .post('/api/orders/order-999/dispute')
            .send({ reason: 'Problem', email: 'user@example.com' });
        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
    });

    it('returns 404 when email does not match order', async () => {
        mockGetOrder.mockResolvedValueOnce({
            order_id: 'order-1',
            customer_email: 'owner@example.com',
            payment_status: 'paid'
        });
        const res = await request(app)
            .post('/api/orders/order-1/dispute')
            .send({ reason: 'Problem', email: 'hacker@evil.com' });
        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
    });

    it('returns 409 when order already refunded', async () => {
        mockGetOrder.mockResolvedValueOnce({
            order_id: 'order-1',
            customer_email: 'user@example.com',
            payment_status: 'refunded'
        });
        const res = await request(app)
            .post('/api/orders/order-1/dispute')
            .send({ reason: 'Problem', email: 'user@example.com' });
        expect(res.status).toBe(409);
        expect(res.body.success).toBe(false);
    });

    it('returns 200 and logs dispute on valid request', async () => {
        mockGetOrder.mockResolvedValueOnce({
            order_id: 'order-1',
            customer_email: 'user@example.com',
            payment_status: 'paid'
        });
        mockUpdateOrderState.mockResolvedValueOnce({ changes: 1 });
        mockSendDisputeAlert.mockResolvedValueOnce({ success: true });

        const res = await request(app)
            .post('/api/orders/order-1/dispute')
            .send({ reason: 'Item not received', email: 'user@example.com' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toMatch(/24 hours/i);
        expect(mockUpdateOrderState).toHaveBeenCalledWith('order-1', 'disputed', expect.objectContaining({ dispute_reason: 'Item not received' }));
        expect(mockSendDisputeAlert).toHaveBeenCalledWith(expect.objectContaining({ orderId: 'order-1', email: 'user@example.com' }));
    });

    it('still returns 200 when state transition fails (already in terminal state)', async () => {
        mockGetOrder.mockResolvedValueOnce({
            order_id: 'order-1',
            customer_email: 'user@example.com',
            payment_status: 'paid'
        });
        mockUpdateOrderState.mockRejectedValueOnce(new Error('invalid transition'));
        mockSendDisputeAlert.mockResolvedValueOnce({ success: true });

        const res = await request(app)
            .post('/api/orders/order-1/dispute')
            .send({ reason: 'Problem', email: 'user@example.com' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
});

// ── POST /api/admin/orders/:orderId/refund ───────────────────────────────────

describe('POST /api/admin/orders/:orderId/refund (auth gate)', () => {
    let app;
    beforeAll(() => { app = buildApp(); });

    it('rejects unauthenticated requests with 401 or 503', async () => {
        const res = await request(app)
            .post('/api/admin/orders/order-1/refund')
            .send({ reason: 'test' });
        expect([401, 503]).toContain(res.status);
    });
});

describe('POST /api/admin/orders/:orderId/refund (authenticated)', () => {
    let agent;
    beforeEach(async () => {
        const app = buildApp();
        agent = request.agent(app);
        await agent.get('/__set-admin-session');
        jest.clearAllMocks();
    });

    it('returns 404 when order not found', async () => {
        mockGetOrder.mockResolvedValueOnce(null);
        const res = await agent
            .post('/api/admin/orders/order-999/refund')
            .send({ reason: 'Customer request' });
        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
    });

    it('returns 409 when order already refunded', async () => {
        mockGetOrder.mockResolvedValueOnce({
            order_id: 'order-1',
            customer_email: 'user@example.com',
            payment_status: 'refunded',
            price: 29.99
        });
        const res = await agent
            .post('/api/admin/orders/order-1/refund')
            .send({ reason: 'duplicate' });
        expect(res.status).toBe(409);
        expect(res.body.success).toBe(false);
    });

    it('handles crypto orders gracefully (no stripe_payment_intent_id)', async () => {
        mockGetOrder.mockResolvedValueOnce({
            order_id: 'order-btc',
            customer_email: 'buyer@example.com',
            payment_status: 'paid',
            price: 10,
            book_title: 'Crypto Book',
            currency: 'USD',
            stripe_payment_intent_id: null
        });
        mockUpdateOrderStatus.mockResolvedValueOnce({ changes: 1 });
        mockUpdateOrderState.mockResolvedValueOnce({ changes: 1 });

        const res = await agent
            .post('/api/admin/orders/order-btc/refund')
            .send({ reason: 'Customer request' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.status).toBe('refunded');
        // No Stripe refundId for crypto
        expect(res.body.refundId).toBeNull();
    });

    it('sends refund confirmation email after successful refund', async () => {
        mockGetOrder.mockResolvedValueOnce({
            order_id: 'order-2',
            customer_email: 'user@example.com',
            payment_status: 'paid',
            price: 29.99,
            book_title: 'Test Book',
            currency: 'USD',
            stripe_payment_intent_id: null
        });
        mockUpdateOrderStatus.mockResolvedValueOnce({ changes: 1 });
        mockUpdateOrderState.mockResolvedValueOnce({ changes: 1 });

        await agent
            .post('/api/admin/orders/order-2/refund')
            .send({ reason: 'Customer request' });

        expect(mockSendRefundConfirmationEmail).toHaveBeenCalledWith(expect.objectContaining({
            userEmail: 'user@example.com',
            orderId: 'order-2',
        }));
    });

    it('still returns success when state machine transition fails', async () => {
        mockGetOrder.mockResolvedValueOnce({
            order_id: 'order-3',
            customer_email: 'user@example.com',
            payment_status: 'paid',
            price: 5,
            book_title: 'Book',
            currency: 'USD',
            stripe_payment_intent_id: null
        });
        mockUpdateOrderStatus.mockResolvedValueOnce({ changes: 1 });
        mockUpdateOrderState.mockRejectedValueOnce(new Error('invalid transition'));

        const res = await agent
            .post('/api/admin/orders/order-3/refund')
            .send({ reason: 'Customer request' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
});
