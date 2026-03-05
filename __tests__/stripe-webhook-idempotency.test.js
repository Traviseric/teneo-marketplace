/**
 * Tests for Stripe webhook idempotency in checkoutProduction.js.
 * Verifies that duplicate Stripe events are not double-fulfilled and that
 * payment_intent.payment_failed updates order status.
 */

// --- Mock Stripe ---
const mockConstructEvent = jest.fn();
jest.mock('stripe', () => () => ({
    checkout: { sessions: { create: jest.fn(), retrieve: jest.fn() } },
    webhooks: { constructEvent: mockConstructEvent },
}));

// --- Mock OrderService ---
const mockIsEventProcessed = jest.fn();
const mockLogPaymentEvent = jest.fn().mockResolvedValue({ id: 1 });
const mockMarkEventProcessed = jest.fn().mockResolvedValue({ changes: 1 });
const mockCompleteOrder = jest.fn().mockResolvedValue({
    downloadToken: 'dl_token_abc',
    downloadExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
});
const mockUpdateOrderStatus = jest.fn().mockResolvedValue({ changes: 1 });
const mockFailOrder = jest.fn().mockResolvedValue({ changes: 1 });
const mockGetOrder = jest.fn().mockResolvedValue(null);
const mockLogEmail = jest.fn().mockResolvedValue({ id: 1 });
const mockFulfillOrder = jest.fn().mockResolvedValue({ changes: 1 });

jest.mock('../marketplace/backend/services/orderService', () =>
    jest.fn().mockImplementation(() => ({
        isEventProcessed: mockIsEventProcessed,
        logPaymentEvent: mockLogPaymentEvent,
        markEventProcessed: mockMarkEventProcessed,
        completeOrder: mockCompleteOrder,
        updateOrderStatus: mockUpdateOrderStatus,
        failOrder: mockFailOrder,
        getOrder: mockGetOrder,
        logEmail: mockLogEmail,
        fulfillOrder: mockFulfillOrder,
    }))
);

// --- Mock email service ---
jest.mock('../marketplace/backend/services/emailService', () => ({
    sendOrderConfirmation: jest.fn().mockResolvedValue({ success: true }),
    sendDownloadEmail: jest.fn().mockResolvedValue({ success: true }),
    sendPaymentFailureEmail: jest.fn().mockResolvedValue(true),
}));

// --- Mock axios (for digital delivery token) ---
jest.mock('axios', () => ({
    post: jest.fn().mockResolvedValue({
        data: { success: true, downloadUrl: 'https://example.com/download/token' },
    }),
    get: jest.fn().mockResolvedValue({ data: {} }),
}));

// --- Mock checkoutMixed ---
const mockProcessMixedOrder = jest.fn().mockResolvedValue(true);
jest.mock('../marketplace/backend/routes/checkoutMixed', () => ({
    processMixedOrder: mockProcessMixedOrder,
    router: require('express').Router(),
}));

const request = require('supertest');
const express = require('express');

// Build test app around checkoutProduction
const app = express();
app.use(express.json());
app.use('/api/checkout', require('../marketplace/backend/routes/checkoutProduction'));

const emailService = require('../marketplace/backend/services/emailService');

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
});

afterAll(() => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
});

describe('Stripe Webhook Idempotency', () => {
    test('checkout.session.completed is processed once on first delivery', async () => {
        mockIsEventProcessed.mockResolvedValue(false); // not yet seen
        mockConstructEvent.mockReturnValue({
            id: 'evt_first_delivery',
            type: 'checkout.session.completed',
            data: { object: MOCK_SESSION },
        });

        const res = await request(app)
            .post('/api/checkout/webhook')
            .set('stripe-signature', 'valid-sig')
            .set('Content-Type', 'application/json')
            .send('{}');

        expect(res.status).toBe(200);
        expect(res.body.received).toBe(true);
        expect(res.body.skipped).toBeUndefined();
        expect(mockCompleteOrder).toHaveBeenCalledTimes(1);
        expect(mockMarkEventProcessed).toHaveBeenCalledWith('evt_first_delivery', true);
    });

    test('duplicate checkout.session.completed does not double-fulfill order', async () => {
        mockIsEventProcessed.mockResolvedValue(true); // already processed
        mockConstructEvent.mockReturnValue({
            id: 'evt_duplicate_delivery',
            type: 'checkout.session.completed',
            data: { object: MOCK_SESSION },
        });

        const res = await request(app)
            .post('/api/checkout/webhook')
            .set('stripe-signature', 'valid-sig')
            .set('Content-Type', 'application/json')
            .send('{}');

        expect(res.status).toBe(200);
        expect(res.body.received).toBe(true);
        expect(res.body.skipped).toBe(true);
        // completeOrder must NOT be called again
        expect(mockCompleteOrder).not.toHaveBeenCalled();
        expect(emailService.sendOrderConfirmation).not.toHaveBeenCalled();
    });

    test('payment_intent.payment_failed updates order status to failed', async () => {
        mockIsEventProcessed.mockResolvedValue(false);
        mockConstructEvent.mockReturnValue({
            id: 'evt_payment_failed_001',
            type: 'payment_intent.payment_failed',
            data: { object: MOCK_PAYMENT_INTENT },
        });

        const res = await request(app)
            .post('/api/checkout/webhook')
            .set('stripe-signature', 'valid-sig')
            .set('Content-Type', 'application/json')
            .send('{}');

        expect(res.status).toBe(200);
        expect(res.body.received).toBe(true);
        expect(mockFailOrder).toHaveBeenCalledWith(
            'order_888_somebook',
            expect.any(String)
        );
        expect(mockMarkEventProcessed).toHaveBeenCalledWith('evt_payment_failed_001', true);
    });

    test('event is logged to payment_events before processing', async () => {
        mockIsEventProcessed.mockResolvedValue(false);
        mockConstructEvent.mockReturnValue({
            id: 'evt_log_test',
            type: 'checkout.session.completed',
            data: { object: MOCK_SESSION },
        });

        await request(app)
            .post('/api/checkout/webhook')
            .set('stripe-signature', 'valid-sig')
            .set('Content-Type', 'application/json')
            .send('{}');

        expect(mockLogPaymentEvent).toHaveBeenCalledWith(
            expect.objectContaining({ stripeEventId: 'evt_log_test' })
        );
    });

    test('invalid stripe signature returns 400', async () => {
        mockConstructEvent.mockImplementation(() => {
            throw new Error('No signatures found matching expected signature');
        });

        const res = await request(app)
            .post('/api/checkout/webhook')
            .set('stripe-signature', 'bad-sig')
            .set('Content-Type', 'application/json')
            .send('{}');

        expect(res.status).toBe(400);
        expect(mockIsEventProcessed).not.toHaveBeenCalled();
    });

    test('missing webhook secret returns 500', async () => {
        delete process.env.STRIPE_WEBHOOK_SECRET;

        const res = await request(app)
            .post('/api/checkout/webhook')
            .set('stripe-signature', 'any-sig')
            .set('Content-Type', 'application/json')
            .send('{}');

        expect(res.status).toBe(500);
    });
});
