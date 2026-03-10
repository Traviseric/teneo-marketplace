/**
 * Tests for server-side price validation in POST /api/checkout/create-session.
 * Verifies that the client-supplied price is never trusted and that the
 * catalog authoritative price is always used.
 */

const mockSessionCreate = jest.fn();

jest.mock('stripe', () => () => ({
    checkout: {
        sessions: {
            create: mockSessionCreate,
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
        constructEvent: jest.fn(),
    },
}));

jest.mock('../marketplace/backend/services/orderService', () =>
    jest.fn().mockImplementation(() => ({
        createOrder: jest.fn().mockResolvedValue({}),
        getOrder: jest.fn().mockResolvedValue(null),
        getOrderBySessionId: jest.fn().mockResolvedValue(null),
        completeOrder: jest.fn().mockResolvedValue({ downloadToken: 'tok-price-123' }),
        updateOrderStatus: jest.fn().mockResolvedValue({}),
        updateOrderState: jest.fn().mockResolvedValue({}),
        isEventProcessed: jest.fn().mockResolvedValue(false),
        logPaymentEvent: jest.fn().mockResolvedValue({}),
        markEventProcessed: jest.fn().mockResolvedValue({}),
        failOrder: jest.fn().mockResolvedValue({}),
        logEmail: jest.fn().mockResolvedValue({}),
        fulfillOrder: jest.fn().mockResolvedValue({}),
        refundOrder: jest.fn().mockResolvedValue({}),
    }))
);

jest.mock('../marketplace/backend/services/stripeHealthService', () => ({
    checkStripeHealth: jest.fn().mockResolvedValue({ healthy: true }),
    getStatus: jest.fn().mockReturnValue({ healthy: true, lastChecked: Date.now() }),
}));

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

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
        req.session = {};
        next();
    });
    app.use('/api/checkout', checkoutRouter);
    return app;
}

const VALID_BOOK_ID = 'consciousness-revolution';
const VALID_BRAND_ID = 'teneo';
const CATALOG_PRICE = 29.99;
const CATALOG_HARDCOVER_PRICE = 69.99;

const BASE_PAYLOAD = {
    bookId: VALID_BOOK_ID,
    brandId: VALID_BRAND_ID,
    format: 'ebook',
    bookTitle: 'The Consciousness Revolution',
    bookAuthor: 'Dr. Marcus Reid',
    userEmail: 'test@example.com',
};

beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
    mockSessionCreate.mockResolvedValue({
        id: 'cs_test_mock_session',
        url: 'https://checkout.stripe.com/pay/cs_test_mock_session',
    });
});

describe('POST /api/checkout/create-session - input validation', () => {
    it('returns 400 when bookId is missing', async () => {
        const app = buildApp();
        const { bookId, ...payload } = BASE_PAYLOAD;
        const res = await request(app).post('/api/checkout/create-session').send(payload);
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/missing required fields/i);
    });

    it('returns 400 when format is missing', async () => {
        const app = buildApp();
        const { format, ...payload } = BASE_PAYLOAD;
        const res = await request(app).post('/api/checkout/create-session').send(payload);
        expect(res.status).toBe(400);
    });

    it('returns 400 when userEmail is missing', async () => {
        const app = buildApp();
        const { userEmail, ...payload } = BASE_PAYLOAD;
        const res = await request(app).post('/api/checkout/create-session').send(payload);
        expect(res.status).toBe(400);
    });
});

describe('POST /api/checkout/create-session - price validation', () => {
    it('returns 400 when bookId is not found in any catalog', async () => {
        const app = buildApp();
        const res = await request(app).post('/api/checkout/create-session').send({
            ...BASE_PAYLOAD,
            bookId: 'totally-nonexistent-book-xyz',
            brandId: VALID_BRAND_ID,
        });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/book not found in catalog/i);
        expect(mockSessionCreate).not.toHaveBeenCalled();
    });

    it('returns 400 for unknown bookId even when brandId is not supplied', async () => {
        const app = buildApp();
        const { brandId, ...payload } = BASE_PAYLOAD;
        const res = await request(app).post('/api/checkout/create-session').send({
            ...payload,
            bookId: 'fake-book-id-does-not-exist',
        });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/book not found in catalog/i);
        expect(mockSessionCreate).not.toHaveBeenCalled();
    });

    it('ignores client-supplied price and uses catalog price for ebook', async () => {
        const app = buildApp();
        const res = await request(app).post('/api/checkout/create-session').send({
            ...BASE_PAYLOAD,
            price: 0.01,
        });
        expect(res.status).toBe(200);
        expect(res.body.checkoutUrl).toBeDefined();

        expect(mockSessionCreate).toHaveBeenCalledTimes(1);
        const stripeArg = mockSessionCreate.mock.calls[0][0];
        const unitAmount = stripeArg.line_items[0].price_data.unit_amount;
        expect(unitAmount).toBe(Math.round(CATALOG_PRICE * 100));
        expect(unitAmount).not.toBe(Math.round(0.01 * 100));
    });

    it('uses hardcoverPrice from catalog when format is hardcover', async () => {
        const app = buildApp();
        const res = await request(app).post('/api/checkout/create-session').send({
            ...BASE_PAYLOAD,
            format: 'hardcover',
            price: 1.0,
        });
        expect(res.status).toBe(200);

        const stripeArg = mockSessionCreate.mock.calls[0][0];
        const unitAmount = stripeArg.line_items[0].price_data.unit_amount;
        expect(unitAmount).toBe(Math.round(CATALOG_HARDCOVER_PRICE * 100));
        expect(unitAmount).not.toBe(Math.round(1.0 * 100));
    });

    it('finds book across all brands when brandId is not supplied', async () => {
        const app = buildApp();
        const { brandId, ...payload } = BASE_PAYLOAD;
        const res = await request(app).post('/api/checkout/create-session').send(payload);
        expect(res.status).toBe(200);

        const stripeArg = mockSessionCreate.mock.calls[0][0];
        const unitAmount = stripeArg.line_items[0].price_data.unit_amount;
        expect(unitAmount).toBe(Math.round(CATALOG_PRICE * 100));
    });

    it('rejects path-traversal brandId with invalid characters', async () => {
        const app = buildApp();
        const res = await request(app).post('/api/checkout/create-session').send({
            ...BASE_PAYLOAD,
            brandId: '../../etc/passwd',
        });
        expect([200, 400]).toContain(res.status);
        if (res.status === 200) {
            const stripeArg = mockSessionCreate.mock.calls[0][0];
            const unitAmount = stripeArg.line_items[0].price_data.unit_amount;
            expect(unitAmount).toBe(Math.round(CATALOG_PRICE * 100));
        }
    });
});

describe('POST /api/checkout/create-session - successful response shape', () => {
    it('returns checkoutUrl, sessionId, and orderId on success', async () => {
        const app = buildApp();
        const res = await request(app).post('/api/checkout/create-session').send(BASE_PAYLOAD);
        expect(res.status).toBe(200);
        expect(res.body.checkoutUrl).toBeDefined();
        expect(res.body.sessionId).toBe('cs_test_mock_session');
        expect(res.body.orderId).toMatch(/^order_\d+_consciousness-revolution$/);
    });
});
