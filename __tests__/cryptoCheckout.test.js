/**
 * Tests for the crypto payment flow in /api/crypto/*.
 * Mocks the database and axios (CoinGecko) to test route logic in isolation.
 */

// Must be declared before jest.mock() calls — Jest hoists mock variables starting with 'mock'
const mockDbRun = jest.fn();
const mockDbGet = jest.fn();

jest.mock('../marketplace/backend/database/database', () => ({
    run: mockDbRun,
    get: mockDbGet
}));

jest.mock('axios', () => ({
    get: jest.fn().mockImplementation((url) => {
        // Return price data matching the coin in the URL
        const data = {};
        if (url.includes('bitcoin')) data.bitcoin = { usd: 65000 };
        if (url.includes('monero')) data.monero = { usd: 150 };
        return Promise.resolve({ data });
    }),
    post: jest.fn().mockResolvedValue({ data: {} })
}));

const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const cryptoRouter = require('../marketplace/backend/routes/cryptoCheckout');

const app = express();
// Trust X-Forwarded-For so each test can use a unique IP, preventing rate
// limit state from one test affecting another.
app.set('trust proxy', 1);
app.use(bodyParser.json());
app.use('/api/crypto', cryptoRouter);

// Unique IP counter — each /verify-payment test gets its own IP so
// the per-IP rate limiter (max 3 per 15 min) never triggers during normal tests.
let verifyIpCounter = 0;
function nextVerifyIp() {
    return `10.0.0.${++verifyIpCounter}`;
}

beforeEach(() => {
    jest.clearAllMocks();

    // Default db.run: simulate successful INSERT
    mockDbRun.mockImplementation((sql, params, callback) => {
        callback(null);
    });

    // Default db.get: no row found
    mockDbGet.mockImplementation((sql, params, callback) => {
        callback(null, null);
    });
});

describe('POST /api/crypto/create-order — input validation', () => {
    it('returns 400 when bookId is missing', async () => {
        const res = await request(app)
            .post('/api/crypto/create-order')
            .send({ paymentMethod: 'bitcoin', email: 'buyer@example.com' });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error).toMatch(/missing required fields/i);
    });

    it('returns 400 when paymentMethod is missing', async () => {
        const res = await request(app)
            .post('/api/crypto/create-order')
            .send({ bookId: 'book-1', email: 'buyer@example.com' });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it('returns 400 when email is invalid', async () => {
        const res = await request(app)
            .post('/api/crypto/create-order')
            .send({ bookId: 'book-1', paymentMethod: 'bitcoin', email: 'not-an-email' });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error).toMatch(/email/i);
    });
});

describe('POST /api/crypto/create-order — successful order creation', () => {
    it('returns order details with crypto address and amount', async () => {
        const res = await request(app)
            .post('/api/crypto/create-order')
            .send({
                bookId: 'consciousness-revolution',
                bookTitle: 'The Consciousness Revolution',
                bookAuthor: 'Dr. Marcus Reid',
                email: 'buyer@example.com',
                paymentMethod: 'bitcoin',
                amountUsd: 29.99
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.orderId).toMatch(/^ORD-/);
        expect(res.body.paymentMethod).toBe('bitcoin');
        expect(res.body.address).toBeDefined();
        expect(res.body.amount).toBeDefined();
        expect(parseFloat(res.body.amount)).toBeGreaterThan(0);
        expect(res.body.amountUsd).toBe(29.99);
    });

    it('persists order to database (calls db.run)', async () => {
        await request(app)
            .post('/api/crypto/create-order')
            .send({
                bookId: 'test-book',
                email: 'buyer@example.com',
                paymentMethod: 'monero',
                amountUsd: 15.00
            });

        expect(mockDbRun).toHaveBeenCalledTimes(1);
        const [sql] = mockDbRun.mock.calls[0];
        expect(sql).toMatch(/INSERT INTO orders/i);
    });
});

describe('GET /api/crypto/rates', () => {
    it('returns BTC and XMR rates with success flag', async () => {
        const res = await request(app).get('/api/crypto/rates');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.rates).toBeDefined();
        expect(typeof res.body.rates.bitcoin).toBe('number');
        expect(res.body.rates.bitcoin).toBeGreaterThan(0);
        expect(typeof res.body.rates.monero).toBe('number');
        expect(res.body.rates.monero).toBeGreaterThan(0);
        // Lightning uses same price as bitcoin
        expect(res.body.rates.lightning).toBe(res.body.rates.bitcoin);
    });
});

describe('POST /api/crypto/verify-payment — validation', () => {
    // Each test uses a unique IP to avoid hitting the per-IP rate limit (max 3/15min)

    it('returns 400 when orderId is missing', async () => {
        const res = await request(app)
            .post('/api/crypto/verify-payment')
            .set('X-Forwarded-For', nextVerifyIp())
            .send({ email: 'buyer@example.com' });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error).toMatch(/orderId required/i);
    });

    it('returns 404 when order is not found', async () => {
        mockDbGet.mockImplementation((sql, params, callback) => {
            callback(null, null); // no row
        });

        const res = await request(app)
            .post('/api/crypto/verify-payment')
            .set('X-Forwarded-For', nextVerifyIp())
            .send({ orderId: 'ORD-nonexistent', email: 'buyer@example.com' });

        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
    });

    it('returns 403 when email does not match order owner', async () => {
        mockDbGet.mockImplementation((sql, params, callback) => {
            callback(null, { order_id: 'ORD-test-1', customer_email: 'real-owner@example.com' });
        });

        const res = await request(app)
            .post('/api/crypto/verify-payment')
            .set('X-Forwarded-For', nextVerifyIp())
            .send({ orderId: 'ORD-test-1', email: 'attacker@evil.com' });

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
    });

    it('returns 200 when orderId, email, and transactionId are valid', async () => {
        mockDbGet.mockImplementation((sql, params, callback) => {
            callback(null, { order_id: 'ORD-test-2', customer_email: 'buyer@example.com' });
        });
        mockDbRun.mockImplementation((sql, params, callback) => {
            callback(null);
        });

        const res = await request(app)
            .post('/api/crypto/verify-payment')
            .set('X-Forwarded-For', nextVerifyIp())
            .send({ orderId: 'ORD-test-2', email: 'buyer@example.com', transactionId: 'tx_abc123' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.orderId).toBe('ORD-test-2');
    });
});
