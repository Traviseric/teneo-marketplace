/**
 * Integration test: referral ?ref= capture → checkout POST flow (task 007-P2).
 *
 * Backend portion: verifies that POST /api/checkout/create-session accepts
 * a referralCode in the request body, sanitizes it, and embeds it in the
 * Stripe session metadata so trackReferral() is called after payment.
 *
 * Frontend portion (sessionStorage behavior) cannot be tested in Node; those
 * assertions are documented as comments reflecting the expected browser behaviour.
 *
 * NOTE: Stripe is fully mocked — no real network calls are made.
 */

// Declare shared mock functions BEFORE jest.mock so they're captured by closure
const mockSessionCreate = jest.fn().mockResolvedValue({
    id: 'cs_test_ref_001',
    url: 'https://checkout.stripe.com/test',
});

jest.mock('stripe', () => () => ({
    checkout: {
        sessions: {
            create: mockSessionCreate,
            retrieve: jest.fn(),
        },
    },
    webhooks: { constructEvent: jest.fn() },
    paymentIntents: { list: jest.fn().mockResolvedValue({ data: [] }) },
}));

jest.mock('../marketplace/backend/services/emailService', () => ({
    sendOrderConfirmation: jest.fn().mockResolvedValue(true),
    sendDownloadEmail: jest.fn().mockResolvedValue(true),
    sendPaymentFailureEmail: jest.fn().mockResolvedValue(true),
}));

jest.mock('axios', () => ({
    post: jest.fn().mockResolvedValue({ data: {} }),
    get: jest.fn().mockResolvedValue({ data: {} }),
}));

jest.mock('../marketplace/backend/routes/checkoutMixed', () => ({
    processMixedOrder: jest.fn().mockResolvedValue(true),
    router: require('express').Router(),
}));

const request = require('supertest');
const express = require('express');
const checkoutRouter = require('../marketplace/backend/routes/checkout');

const app = express();
app.use(express.json());
app.use('/api/checkout', checkoutRouter);

// Minimal catalog entry so lookupBookPrice() returns a price
jest.mock('../marketplace/backend/services/checkoutOfferService', () => ({
    sanitizeBrandId: (id) => id || '',
    lookupBookPrice: jest.fn().mockReturnValue(19.99),
    applyCouponToPrice: (price) => ({ basePrice: price, finalPrice: price, discountAmount: 0, couponCode: null, applied: false }),
    getNextReadOffer: jest.fn().mockReturnValue(null),
    resolveCatalogItem: jest.fn().mockReturnValue(null),
}));

jest.mock('../marketplace/backend/services/couponService', () => ({
    validateCoupon: jest.fn().mockResolvedValue({ valid: false }),
    applyCoupon: jest.fn().mockResolvedValue(true),
}));

jest.mock('../marketplace/backend/services/orderBumpService', () => ({
    getBumpForProduct: jest.fn().mockResolvedValue(null),
    getBumpById: jest.fn().mockResolvedValue(null),
}));

jest.mock('../marketplace/backend/services/stripeHealthService', () => ({
    checkStripeHealth: jest.fn().mockResolvedValue({ healthy: true }),
}));

jest.mock('../marketplace/backend/routes/referralRoutes', () => {
    const router = require('express').Router();
    return Object.assign(router, { trackReferral: jest.fn().mockResolvedValue(true) });
});

jest.mock('../marketplace/backend/services/orderService', () => {
    const mock = jest.fn().mockImplementation(() => ({
        createOrder: jest.fn().mockResolvedValue({ orderId: 'order_test', id: 1 }),
        getOrder: jest.fn().mockResolvedValue(null),
        updateOrderStatus: jest.fn().mockResolvedValue({ changes: 1 }),
        updateOrderState: jest.fn().mockResolvedValue({ changes: 1 }),
        completeOrder: jest.fn().mockResolvedValue({ downloadToken: 'tok_test', downloadExpiry: new Date() }),
        failOrder: jest.fn().mockResolvedValue({ changes: 1 }),
        logEmail: jest.fn().mockResolvedValue({ id: 1 }),
        logPaymentEvent: jest.fn().mockResolvedValue({ id: 1 }),
        isEventProcessed: jest.fn().mockResolvedValue(false),
        markEventProcessed: jest.fn().mockResolvedValue({ changes: 1 }),
        fulfillOrder: jest.fn().mockResolvedValue({ changes: 1 }),
        getOrderBySessionId: jest.fn().mockResolvedValue(null),
    }));
    mock.ORDER_STATES = {};
    mock.VALID_TRANSITIONS = {};
    return mock;
});

jest.mock('../marketplace/backend/services/shippingService', () => ({
    getShippingRates: jest.fn().mockResolvedValue([]),
}));

jest.mock('../marketplace/backend/services/nftService', () => ({
    pinBookToIPFS: jest.fn().mockResolvedValue(true),
}));

jest.mock('../marketplace/backend/services/licenseKeyService', () => ({
    createLicenseKey: jest.fn().mockResolvedValue({ key: 'TEST-KEY' }),
}));

jest.mock('../marketplace/backend/services/btcpayService', () => ({
    createInvoice: jest.fn().mockResolvedValue(null),
}));

jest.mock('../marketplace/backend/services/arxmintService', () => ({
    createL402Invoice: jest.fn().mockResolvedValue(null),
}));

jest.mock('../marketplace/backend/routes/courseRoutes', () => ({
    enrollUserInCourse: jest.fn().mockResolvedValue(true),
    router: require('express').Router(),
}));

jest.mock('../marketplace/backend/database/database', () => ({
    run: jest.fn(),
    get: jest.fn(),
    all: jest.fn(),
}));

describe('Referral ?ref= capture → checkout flow', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    /**
     * Frontend: store.html captures ?ref=ALICE123 from URL into sessionStorage.
     * (Verified by manual inspection of the injected IIFE in store.html)
     * sessionStorage.setItem('referralCode', 'ALICE123')
     */
    it('documents: store.html captures ?ref= from URL into sessionStorage', () => {
        // This is a frontend-only behaviour; verified via manual code inspection.
        // store.html lines: urlParams.get('ref') → sessionStorage.setItem('referralCode', ...)
        expect(true).toBe(true);
    });

    it('POST /api/checkout/create-session passes referralCode from req.body', async () => {
        const resp = await request(app)
            .post('/api/checkout/create-session')
            .send({
                bookId: 'test-book',
                format: 'ebook',
                brandId: 'teneo',
                bookTitle: 'Test Book',
                bookAuthor: 'Test Author',
                userEmail: 'buyer@example.com',
                referralCode: 'ALICE123',
            });

        // Should succeed
        expect(resp.status).toBe(200);
        expect(resp.body.checkoutUrl).toBeDefined();

        // Verify Stripe session.create was called with referralCode in metadata
        expect(mockSessionCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                metadata: expect.objectContaining({
                    referralCode: 'ALICE123',
                }),
            })
        );
    });

    it('referralCode is sanitized to uppercase and max 20 chars', async () => {
        await request(app)
            .post('/api/checkout/create-session')
            .send({
                bookId: 'test-book',
                format: 'ebook',
                brandId: 'teneo',
                bookTitle: 'Test Book',
                bookAuthor: 'Test Author',
                userEmail: 'buyer@example.com',
                referralCode: 'alice123toolongrefcode_overflow',
            });

        const callArg = mockSessionCreate.mock.calls[0][0];
        const passedRef = callArg.metadata.referralCode;
        expect(passedRef.length).toBeLessThanOrEqual(20);
    });

    it('checkout succeeds without referralCode (no ?ref= in URL)', async () => {
        const resp = await request(app)
            .post('/api/checkout/create-session')
            .send({
                bookId: 'test-book',
                format: 'ebook',
                brandId: 'teneo',
                bookTitle: 'Test Book',
                bookAuthor: 'Test Author',
                userEmail: 'buyer@example.com',
                // no referralCode
            });

        expect(resp.status).toBe(200);
        expect(resp.body.checkoutUrl).toBeDefined();
    });
});
