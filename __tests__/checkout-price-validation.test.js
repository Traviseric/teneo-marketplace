/**
 * Tests for server-side price validation in POST /api/checkout/create-session.
 * Verifies that the client-supplied price is never trusted and that the
 * catalog authoritative price is always used (CWE-602 fix).
 */

// Mock stripe before requiring anything that loads it
const mockSessionCreate = jest.fn();
jest.mock('stripe', () => () => ({
    checkout: {
        sessions: {
            create: mockSessionCreate
        }
    }
}));

// Mock services that checkout.js imports transitively
jest.mock('../marketplace/backend/services/emailService', () => ({
    sendOrderConfirmation: jest.fn().mockResolvedValue(true),
    sendDownloadEmail: jest.fn().mockResolvedValue(true)
}));
jest.mock('axios', () => ({ post: jest.fn().mockResolvedValue({ data: { success: false } }) }));
jest.mock('../marketplace/backend/routes/checkoutMixed', () => ({
    processMixedOrder: jest.fn().mockResolvedValue(true),
    router: require('express').Router()
}));

const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const checkoutRouter = require('../marketplace/backend/routes/checkout');

// Build a minimal app with just the checkout route
const app = express();
app.use(bodyParser.json());
app.use('/api/checkout', checkoutRouter);

// A bookId that exists in the teneo brand catalog
const VALID_BOOK_ID = 'consciousness-revolution';
const VALID_BRAND_ID = 'teneo';
// Catalog price for consciousness-revolution ebook = 29.99
const CATALOG_PRICE = 29.99;
// Catalog hardcover price = 69.99
const CATALOG_HARDCOVER_PRICE = 69.99;

const BASE_PAYLOAD = {
    bookId: VALID_BOOK_ID,
    brandId: VALID_BRAND_ID,
    format: 'ebook',
    bookTitle: 'The Consciousness Revolution',
    bookAuthor: 'Dr. Marcus Reid',
    userEmail: 'test@example.com'
};

beforeEach(() => {
    mockSessionCreate.mockResolvedValue({
        id: 'cs_test_mock_session',
        url: 'https://checkout.stripe.com/pay/cs_test_mock_session'
    });
});

afterEach(() => {
    jest.clearAllMocks();
});

describe('POST /api/checkout/create-session — input validation', () => {
    it('returns 400 when bookId is missing', async () => {
        const { bookId, ...payload } = BASE_PAYLOAD;
        const res = await request(app).post('/api/checkout/create-session').send(payload);
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/missing required fields/i);
    });

    it('returns 400 when format is missing', async () => {
        const { format, ...payload } = BASE_PAYLOAD;
        const res = await request(app).post('/api/checkout/create-session').send(payload);
        expect(res.status).toBe(400);
    });

    it('returns 400 when userEmail is missing', async () => {
        const { userEmail, ...payload } = BASE_PAYLOAD;
        const res = await request(app).post('/api/checkout/create-session').send(payload);
        expect(res.status).toBe(400);
    });
});

describe('POST /api/checkout/create-session — price validation (CWE-602)', () => {
    it('returns 400 when bookId is not found in any catalog', async () => {
        const res = await request(app).post('/api/checkout/create-session').send({
            ...BASE_PAYLOAD,
            bookId: 'totally-nonexistent-book-xyz',
            brandId: VALID_BRAND_ID
        });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/book not found in catalog/i);
        // Stripe must not be called when book is not found
        expect(mockSessionCreate).not.toHaveBeenCalled();
    });

    it('returns 400 for unknown bookId even when brandId is not supplied', async () => {
        const { brandId, ...payload } = BASE_PAYLOAD;
        const res = await request(app).post('/api/checkout/create-session').send({
            ...payload,
            bookId: 'fake-book-id-does-not-exist'
        });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/book not found in catalog/i);
        expect(mockSessionCreate).not.toHaveBeenCalled();
    });

    it('ignores client-supplied price and uses catalog price for ebook', async () => {
        const res = await request(app).post('/api/checkout/create-session').send({
            ...BASE_PAYLOAD,
            price: 0.01 // attacker-supplied price
        });
        expect(res.status).toBe(200);
        expect(res.body.checkoutUrl).toBeDefined();

        // Verify Stripe was called with catalog price, not the attacker price
        expect(mockSessionCreate).toHaveBeenCalledTimes(1);
        const stripeArg = mockSessionCreate.mock.calls[0][0];
        const unitAmount = stripeArg.line_items[0].price_data.unit_amount;
        expect(unitAmount).toBe(Math.round(CATALOG_PRICE * 100));
        expect(unitAmount).not.toBe(Math.round(0.01 * 100));
    });

    it('uses hardcoverPrice from catalog when format is hardcover', async () => {
        const res = await request(app).post('/api/checkout/create-session').send({
            ...BASE_PAYLOAD,
            format: 'hardcover',
            price: 1.00 // attacker-supplied price
        });
        expect(res.status).toBe(200);

        const stripeArg = mockSessionCreate.mock.calls[0][0];
        const unitAmount = stripeArg.line_items[0].price_data.unit_amount;
        expect(unitAmount).toBe(Math.round(CATALOG_HARDCOVER_PRICE * 100));
        expect(unitAmount).not.toBe(Math.round(1.00 * 100));
    });

    it('finds book across all brands when brandId is not supplied', async () => {
        const { brandId, ...payload } = BASE_PAYLOAD;
        const res = await request(app).post('/api/checkout/create-session').send(payload);
        expect(res.status).toBe(200);

        const stripeArg = mockSessionCreate.mock.calls[0][0];
        const unitAmount = stripeArg.line_items[0].price_data.unit_amount;
        expect(unitAmount).toBe(Math.round(CATALOG_PRICE * 100));
    });

    it('rejects path-traversal brandId with invalid characters', async () => {
        const res = await request(app).post('/api/checkout/create-session').send({
            ...BASE_PAYLOAD,
            brandId: '../../etc/passwd'
        });
        // Invalid brandId is sanitized to null, falls back to all-brands search
        // which should still find the book
        expect([200, 400]).toContain(res.status);
        if (res.status === 200) {
            const stripeArg = mockSessionCreate.mock.calls[0][0];
            const unitAmount = stripeArg.line_items[0].price_data.unit_amount;
            expect(unitAmount).toBe(Math.round(CATALOG_PRICE * 100));
        }
    });
});

describe('POST /api/checkout/create-session — successful response shape', () => {
    it('returns checkoutUrl, sessionId, and orderId on success', async () => {
        const res = await request(app).post('/api/checkout/create-session').send(BASE_PAYLOAD);
        expect(res.status).toBe(200);
        expect(res.body.checkoutUrl).toBeDefined();
        expect(res.body.sessionId).toBe('cs_test_mock_session');
        expect(res.body.orderId).toMatch(/^order_\d+_consciousness-revolution$/);
    });
});
