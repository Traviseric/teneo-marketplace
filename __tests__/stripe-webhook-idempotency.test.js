/**
 * Tests for Stripe webhook idempotency in checkout.js.
 * Verifies that duplicate Stripe events are not double-fulfilled and that
 * payment_intent.payment_failed updates order status.
 */

const mockConstructEvent = jest.fn();
const mockOrderService = {
    createOrder: jest.fn().mockResolvedValue({}),
    getOrder: jest.fn().mockResolvedValue(null),
    getOrderBySessionId: jest.fn().mockResolvedValue(null),
    completeOrder: jest.fn().mockResolvedValue({
        downloadToken: 'dl_token_abc',
        downloadExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }),
    updateOrderStatus: jest.fn().mockResolvedValue({ changes: 1 }),
    updateOrderState: jest.fn().mockResolvedValue({ changes: 1 }),
    failOrder: jest.fn().mockResolvedValue({ changes: 1 }),
    getOrderByDownloadToken: jest.fn().mockResolvedValue(null),
    isEventProcessed: jest.fn().mockResolvedValue(false),
    logPaymentEvent: jest.fn().mockResolvedValue({ id: 1 }),
    markEventProcessed: jest.fn().mockResolvedValue({ changes: 1 }),
    logEmail: jest.fn().mockResolvedValue({ id: 1 }),
    fulfillOrder: jest.fn().mockResolvedValue({ changes: 1 }),
    refundOrder: jest.fn().mockResolvedValue({ changes: 1 }),
};

jest.mock('stripe', () => () => ({
    checkout: { sessions: { create: jest.fn(), retrieve: jest.fn() } },
    paymentIntents: { retrieve: jest.fn().mockResolvedValue({ payment_method: 'pm_test_123' }) },
    refunds: { create: jest.fn() },
    webhooks: { constructEvent: mockConstructEvent },
}));

jest.mock('../marketplace/backend/services/orderService', () =>
    jest.fn().mockImplementation(() => mockOrderService)
);

jest.mock('../marketplace/backend/services/emailService', () => ({
    sendOrderConfirmation: jest.fn().mockResolvedValue({ success: true }),
    sendDownloadEmail: jest.fn().mockResolvedValue({ success: true }),
    sendPaymentFailureEmail: jest.fn().mockResolvedValue(true),
    sendRefundConfirmationEmail: jest.fn().mockResolvedValue(true),
    sendLicenseKeyEmail: jest.fn().mockResolvedValue(true),
}));

jest.mock('../marketplace/backend/routes/checkoutMixed', () => ({
    processMixedOrder: jest.fn().mockResolvedValue(true),
}));

jest.mock('../marketplace/backend/services/stripeHealthService', () => ({
    checkStripeHealth: jest.fn().mockResolvedValue({ healthy: true }),
}));

jest.mock('../marketplace/backend/services/couponService', () => ({
    validateCoupon: jest.fn().mockResolvedValue({ valid: false }),
    applyCoupon: jest.fn().mockResolvedValue({}),
}));

jest.mock('../marketplace/backend/services/orderBumpService', () => ({
    getBumpForProduct: jest.fn().mockResolvedValue(null),
    getBumpById: jest.fn().mockResolvedValue(null),
}));

jest.mock('../marketplace/backend/services/btcpayService', () => ({
    createInvoice: jest.fn(),
    verifyWebhookSignature: jest.fn(),
}));

jest.mock('../marketplace/backend/services/arxmintService', () => ({
    createL402Invoice: jest.fn().mockResolvedValue(null),
}));

jest.mock('../marketplace/backend/services/nftService', () => ({
    mintNFT: jest.fn().mockResolvedValue(null),
}));

jest.mock('../marketplace/backend/services/shippingService', () => ({
    getShippingRates: jest.fn().mockResolvedValue([]),
}));

jest.mock('../marketplace/backend/services/licenseKeyService', () => ({
    createLicenseKey: jest.fn().mockResolvedValue({ key: 'LICENSE-123' }),
}));

jest.mock('../marketplace/backend/routes/courseRoutes', () => ({
    enrollUserInCourse: jest.fn().mockResolvedValue({}),
}));

jest.mock('../marketplace/backend/routes/referralRoutes', () => ({
    trackReferral: jest.fn().mockResolvedValue({}),
}));

jest.mock('../marketplace/backend/database/database', () => ({
    run: jest.fn((sql, params, callback) => {
        if (typeof callback === 'function') {
            callback(null);
        }
        return Promise.resolve({ changes: 1 });
    }),
    get: jest.fn((sql, params, callback) => {
        if (typeof callback === 'function') {
            callback(null, null);
        }
        return Promise.resolve(null);
    }),
    all: jest.fn((sql, params, callback) => {
        if (typeof callback === 'function') {
            callback(null, []);
        }
        return Promise.resolve([]);
    }),
}));

const request = require('supertest');
const express = require('express');
const checkoutRouter = require('../marketplace/backend/routes/checkout');
const emailService = require('../marketplace/backend/services/emailService');

let consoleErrorSpy;
let consoleLogSpy;

beforeAll(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

function buildApp() {
    const app = express();
    app.use('/api/checkout/webhook', express.raw({ type: 'application/json' }));
    app.use(express.json());
    app.use((req, _res, next) => {
        req.session = {};
        next();
    });
    app.use('/api/checkout', checkoutRouter);
    return app;
}

const MOCK_SESSION = {
    id: 'cs_test_idempotency_001',
    payment_intent: 'pi_test_001',
    amount_total: 2999,
    payment_method_types: ['card'],
    metadata: {
        bookId: 'consciousness-revolution',
        bookTitle: 'The Consciousness Revolution',
        bookAuthor: 'Dr. Marcus Reid',
        userEmail: 'buyer@example.com',
        orderId: 'order_999_consciousness-revolution',
        format: 'ebook',
    },
};

const MOCK_PAYMENT_INTENT = {
    id: 'pi_test_failed_001',
    metadata: { orderId: 'order_888_somebook' },
    last_payment_error: { message: 'Insufficient funds' },
};

beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
    mockOrderService.isEventProcessed.mockResolvedValue(false);
    mockOrderService.completeOrder.mockResolvedValue({
        downloadToken: 'dl_token_abc',
        downloadExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
});

afterAll(() => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
});

describe('Stripe Webhook Idempotency', () => {
    it('checkout.session.completed is processed once on first delivery', async () => {
        const app = buildApp();

        mockConstructEvent.mockReturnValue({
            id: 'evt_first_delivery',
            type: 'checkout.session.completed',
            data: { object: MOCK_SESSION },
        });

        const res = await request(app)
            .post('/api/checkout/webhook')
            .set('stripe-signature', 'valid-sig')
            .set('Content-Type', 'application/json')
            .send(Buffer.from('{}'));

        expect(res.status).toBe(200);
        expect(res.body.received).toBe(true);
        expect(res.body.skipped).toBeUndefined();
        expect(mockOrderService.completeOrder).toHaveBeenCalledTimes(1);
        expect(mockOrderService.markEventProcessed).toHaveBeenCalledWith('evt_first_delivery', true);
    });

    it('duplicate checkout.session.completed does not double-fulfill order', async () => {
        const app = buildApp();

        mockOrderService.isEventProcessed.mockResolvedValue(true);
        mockConstructEvent.mockReturnValue({
            id: 'evt_duplicate_delivery',
            type: 'checkout.session.completed',
            data: { object: MOCK_SESSION },
        });

        const res = await request(app)
            .post('/api/checkout/webhook')
            .set('stripe-signature', 'valid-sig')
            .set('Content-Type', 'application/json')
            .send(Buffer.from('{}'));

        expect(res.status).toBe(200);
        expect(res.body.received).toBe(true);
        expect(res.body.skipped).toBe(true);
        expect(mockOrderService.completeOrder).not.toHaveBeenCalled();
        expect(emailService.sendOrderConfirmation).not.toHaveBeenCalled();
    });

    it('payment_intent.payment_failed updates order status to failed', async () => {
        const app = buildApp();

        mockConstructEvent.mockReturnValue({
            id: 'evt_payment_failed_001',
            type: 'payment_intent.payment_failed',
            data: { object: MOCK_PAYMENT_INTENT },
        });

        const res = await request(app)
            .post('/api/checkout/webhook')
            .set('stripe-signature', 'valid-sig')
            .set('Content-Type', 'application/json')
            .send(Buffer.from('{}'));

        expect(res.status).toBe(200);
        expect(res.body.received).toBe(true);
        expect(mockOrderService.failOrder).toHaveBeenCalledWith(
            'order_888_somebook',
            expect.any(String)
        );
        expect(mockOrderService.markEventProcessed).toHaveBeenCalledWith('evt_payment_failed_001', true);
    });

    it('event is logged to payment_events before processing', async () => {
        const app = buildApp();

        mockConstructEvent.mockReturnValue({
            id: 'evt_log_test',
            type: 'checkout.session.completed',
            data: { object: MOCK_SESSION },
        });

        await request(app)
            .post('/api/checkout/webhook')
            .set('stripe-signature', 'valid-sig')
            .set('Content-Type', 'application/json')
            .send(Buffer.from('{}'));

        expect(mockOrderService.logPaymentEvent).toHaveBeenCalledWith(
            expect.objectContaining({ stripeEventId: 'evt_log_test' })
        );
    });

    it('invalid stripe signature returns 400', async () => {
        const app = buildApp();

        mockConstructEvent.mockImplementation(() => {
            throw new Error('No signatures found matching expected signature');
        });

        const res = await request(app)
            .post('/api/checkout/webhook')
            .set('stripe-signature', 'bad-sig')
            .set('Content-Type', 'application/json')
            .send(Buffer.from('{}'));

        expect(res.status).toBe(400);
        expect(mockOrderService.isEventProcessed).not.toHaveBeenCalled();
    });

    it('missing webhook secret returns 500', async () => {
        const app = buildApp();
        delete process.env.STRIPE_WEBHOOK_SECRET;

        const res = await request(app)
            .post('/api/checkout/webhook')
            .set('stripe-signature', 'any-sig')
            .set('Content-Type', 'application/json')
            .send(Buffer.from('{}'));

        expect(res.status).toBe(500);
    });
});
