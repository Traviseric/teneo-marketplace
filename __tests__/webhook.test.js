/**
 * Tests for the Stripe webhook handler in POST /api/checkout/webhook.
 * Covers signature validation, checkout.session.completed handling,
 * and mixed-order routing.
 */

const mockConstructEvent = jest.fn();
const mockSessionCreate = jest.fn();

jest.mock('stripe', () => () => ({
    checkout: {
        sessions: {
            create: mockSessionCreate,
            retrieve: jest.fn()
        }
    },
    webhooks: {
        constructEvent: mockConstructEvent
    }
}));

jest.mock('../marketplace/backend/services/emailService', () => ({
    sendOrderConfirmation: jest.fn().mockResolvedValue(true),
    sendDownloadEmail: jest.fn().mockResolvedValue(true)
}));

const mockProcessMixedOrder = jest.fn().mockResolvedValue(true);
jest.mock('../marketplace/backend/routes/checkoutMixed', () => ({
    processMixedOrder: mockProcessMixedOrder,
    router: require('express').Router()
}));

jest.mock('axios', () => ({
    post: jest.fn().mockResolvedValue({
        data: { success: true, downloadUrl: 'https://example.com/download/token123' }
    }),
    get: jest.fn().mockResolvedValue({ data: {} })
}));

const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const checkoutRouter = require('../marketplace/backend/routes/checkout');
const emailService = require('../marketplace/backend/services/emailService');

const app = express();
app.use(bodyParser.json());
app.use('/api/checkout', checkoutRouter);

const MOCK_SESSION = {
    id: 'cs_test_webhook_001',
    amount_total: 2999,
    metadata: {
        bookId: 'consciousness-revolution',
        bookTitle: 'The Consciousness Revolution',
        bookAuthor: 'Dr. Marcus Reid',
        userEmail: 'buyer@example.com',
        orderId: 'order_123_consciousness-revolution',
        format: 'ebook'
    }
};

beforeEach(() => {
    jest.clearAllMocks();
});

describe('POST /api/checkout/webhook — signature validation', () => {
    it('returns 400 when stripe-signature is invalid', async () => {
        mockConstructEvent.mockImplementation(() => {
            throw new Error('No signatures found matching the expected signature');
        });

        const res = await request(app)
            .post('/api/checkout/webhook')
            .set('stripe-signature', 'bad-sig')
            .set('Content-Type', 'application/json')
            .send(JSON.stringify(MOCK_SESSION));

        expect(res.status).toBe(400);
        expect(res.text).toMatch(/Webhook Error/i);
    });

    it('returns 200 with received:true for any valid event', async () => {
        mockConstructEvent.mockReturnValue({
            id: 'evt_test_unhandled',
            type: 'payment_intent.created',
            data: { object: {} }
        });

        const res = await request(app)
            .post('/api/checkout/webhook')
            .set('stripe-signature', 'valid-sig')
            .set('Content-Type', 'application/json')
            .send('{}');

        expect(res.status).toBe(200);
        expect(res.body.received).toBe(true);
    });
});

describe('POST /api/checkout/webhook — checkout.session.completed', () => {
    it('sends order confirmation email with correct details', async () => {
        mockConstructEvent.mockReturnValue({
            id: 'evt_completed_1',
            type: 'checkout.session.completed',
            data: { object: MOCK_SESSION }
        });

        const res = await request(app)
            .post('/api/checkout/webhook')
            .set('stripe-signature', 'valid-sig')
            .set('Content-Type', 'application/json')
            .send('{}');

        expect(res.status).toBe(200);
        expect(emailService.sendOrderConfirmation).toHaveBeenCalledWith(
            expect.objectContaining({
                userEmail: 'buyer@example.com',
                bookTitle: 'The Consciousness Revolution',
                orderId: 'order_123_consciousness-revolution'
            })
        );
    });

    it('also sends download email when token generation succeeds', async () => {
        mockConstructEvent.mockReturnValue({
            id: 'evt_completed_2',
            type: 'checkout.session.completed',
            data: { object: MOCK_SESSION }
        });

        await request(app)
            .post('/api/checkout/webhook')
            .set('stripe-signature', 'valid-sig')
            .set('Content-Type', 'application/json')
            .send('{}');

        expect(emailService.sendDownloadEmail).toHaveBeenCalledWith(
            expect.objectContaining({
                userEmail: 'buyer@example.com',
                downloadUrl: expect.any(String)
            })
        );
    });

    it('routes mixed orders to processMixedOrder and skips standard flow', async () => {
        const mixedSession = {
            ...MOCK_SESSION,
            metadata: { ...MOCK_SESSION.metadata, orderType: 'mixed' }
        };

        mockConstructEvent.mockReturnValue({
            id: 'evt_mixed_1',
            type: 'checkout.session.completed',
            data: { object: mixedSession }
        });

        const res = await request(app)
            .post('/api/checkout/webhook')
            .set('stripe-signature', 'valid-sig')
            .set('Content-Type', 'application/json')
            .send('{}');

        expect(res.status).toBe(200);
        expect(mockProcessMixedOrder).toHaveBeenCalledWith(mixedSession);
        expect(emailService.sendOrderConfirmation).not.toHaveBeenCalled();
    });
});
