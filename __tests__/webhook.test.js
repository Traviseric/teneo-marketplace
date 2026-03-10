/**
 * Tests for the Stripe webhook handler in POST /api/checkout/webhook.
 * Covers signature validation, checkout.session.completed handling,
 * and mixed-order routing.
 */

const mockConstructEvent = jest.fn();
const mockOrderService = {
    createOrder: jest.fn().mockResolvedValue({}),
    getOrder: jest.fn().mockResolvedValue(null),
    getOrderBySessionId: jest.fn().mockResolvedValue(null),
    completeOrder: jest.fn().mockResolvedValue({ downloadToken: 'tok-webhook-123' }),
    updateOrderStatus: jest.fn().mockResolvedValue({}),
    updateOrderState: jest.fn().mockResolvedValue({}),
    isEventProcessed: jest.fn().mockResolvedValue(false),
    logPaymentEvent: jest.fn().mockResolvedValue({}),
    markEventProcessed: jest.fn().mockResolvedValue({}),
    failOrder: jest.fn().mockResolvedValue({}),
    logEmail: jest.fn().mockResolvedValue({}),
    fulfillOrder: jest.fn().mockResolvedValue({}),
    refundOrder: jest.fn().mockResolvedValue({}),
};

jest.mock('stripe', () => () => ({
    checkout: {
        sessions: {
            create: jest.fn(),
            retrieve: jest.fn(),
        },
    },
    paymentIntents: {
        retrieve: jest.fn().mockResolvedValue({ payment_method: 'pm_test_123' }),
    },
    refunds: {
        create: jest.fn(),
    },
    webhooks: {
        constructEvent: mockConstructEvent,
    },
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

const mockProcessMixedOrder = jest.fn().mockResolvedValue(true);
jest.mock('../marketplace/backend/routes/checkoutMixed', () => ({
    processMixedOrder: mockProcessMixedOrder,
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

let consoleLogSpy;
let consoleErrorSpy;

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
    id: 'cs_test_webhook_001',
    payment_intent: 'pi_test_webhook_001',
    payment_method_types: ['card'],
    amount_total: 2999,
    metadata: {
        bookId: 'consciousness-revolution',
        bookTitle: 'The Consciousness Revolution',
        bookAuthor: 'Dr. Marcus Reid',
        userEmail: 'buyer@example.com',
        orderId: 'order_123_consciousness-revolution',
        format: 'ebook',
    },
};

beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_fake';
    mockOrderService.isEventProcessed.mockResolvedValue(false);
    mockOrderService.completeOrder.mockResolvedValue({ downloadToken: 'tok-webhook-123' });
});

afterAll(() => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
});

describe('POST /api/checkout/webhook - signature validation', () => {
    it('returns 400 when stripe-signature is invalid', async () => {
        const app = buildApp();

        mockConstructEvent.mockImplementation(() => {
            throw new Error('No signatures found matching the expected signature');
        });

        const res = await request(app)
            .post('/api/checkout/webhook')
            .set('stripe-signature', 'bad-sig')
            .set('Content-Type', 'application/json')
            .send(Buffer.from(JSON.stringify(MOCK_SESSION)));

        expect(res.status).toBe(400);
        expect(res.text).toMatch(/Webhook Error/i);
    });

    it('returns 200 with received:true for any valid event', async () => {
        const app = buildApp();

        mockConstructEvent.mockReturnValue({
            id: 'evt_test_unhandled',
            type: 'payment_intent.created',
            data: { object: {} },
        });

        const res = await request(app)
            .post('/api/checkout/webhook')
            .set('stripe-signature', 'valid-sig')
            .set('Content-Type', 'application/json')
            .send(Buffer.from('{}'));

        expect(res.status).toBe(200);
        expect(res.body.received).toBe(true);
    });
});

describe('POST /api/checkout/webhook - checkout.session.completed', () => {
    it('sends order confirmation email with correct details', async () => {
        const app = buildApp();

        mockConstructEvent.mockReturnValue({
            id: 'evt_completed_1',
            type: 'checkout.session.completed',
            data: { object: MOCK_SESSION },
        });

        const res = await request(app)
            .post('/api/checkout/webhook')
            .set('stripe-signature', 'valid-sig')
            .set('Content-Type', 'application/json')
            .send(Buffer.from('{}'));

        expect(res.status).toBe(200);
        expect(emailService.sendOrderConfirmation).toHaveBeenCalledWith(
            expect.objectContaining({
                userEmail: 'buyer@example.com',
                bookTitle: 'The Consciousness Revolution',
                orderId: 'order_123_consciousness-revolution',
            })
        );
    });

    it('also sends download email when token generation succeeds', async () => {
        const app = buildApp();

        mockConstructEvent.mockReturnValue({
            id: 'evt_completed_2',
            type: 'checkout.session.completed',
            data: { object: MOCK_SESSION },
        });

        await request(app)
            .post('/api/checkout/webhook')
            .set('stripe-signature', 'valid-sig')
            .set('Content-Type', 'application/json')
            .send(Buffer.from('{}'));

        expect(emailService.sendDownloadEmail).toHaveBeenCalledWith(
            expect.objectContaining({
                userEmail: 'buyer@example.com',
                downloadUrl: expect.stringContaining('/api/download/tok-webhook-123'),
            })
        );
    });

    it('routes mixed orders to processMixedOrder and skips standard flow', async () => {
        const app = buildApp();
        const mixedSession = {
            ...MOCK_SESSION,
            metadata: { ...MOCK_SESSION.metadata, orderType: 'mixed' },
        };

        mockConstructEvent.mockReturnValue({
            id: 'evt_mixed_1',
            type: 'checkout.session.completed',
            data: { object: mixedSession },
        });

        const res = await request(app)
            .post('/api/checkout/webhook')
            .set('stripe-signature', 'valid-sig')
            .set('Content-Type', 'application/json')
            .send(Buffer.from('{}'));

        expect(res.status).toBe(200);
        expect(mockProcessMixedOrder).toHaveBeenCalledWith(mixedSession);
        expect(emailService.sendOrderConfirmation).not.toHaveBeenCalled();
    });
});
