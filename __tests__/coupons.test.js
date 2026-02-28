/**
 * Tests for POST /api/coupons/validate — server-side coupon validation.
 * Also tests the pure functions calculateDiscount() and getCoupons().
 */
const request = require('supertest');
const app = require('./test-app');
const { calculateDiscount, getCoupons } = require('../marketplace/backend/routes/couponsRoutes');

describe('POST /api/coupons/validate', () => {
    it('returns 400 when no code is provided', async () => {
        const res = await request(app)
            .post('/api/coupons/validate')
            .send({ cartTotal: 50 })
            .set('Content-Type', 'application/json');
        expect(res.status).toBe(400);
        expect(res.body.valid).toBe(false);
    });

    it('returns { valid: false } for an unknown coupon code', async () => {
        const res = await request(app)
            .post('/api/coupons/validate')
            .send({ code: 'DOESNOTEXIST', cartTotal: 50 })
            .set('Content-Type', 'application/json');
        expect(res.status).toBe(200);
        expect(res.body.valid).toBe(false);
    });

    it('returns { valid: true } for a known coupon code SAVE10', async () => {
        const res = await request(app)
            .post('/api/coupons/validate')
            .send({ code: 'SAVE10', cartTotal: 100 })
            .set('Content-Type', 'application/json');
        expect(res.status).toBe(200);
        expect(res.body.valid).toBe(true);
        expect(res.body.discount).toBe(10); // 10% of 100
    });

    it('is case-insensitive — accepts lowercase code', async () => {
        const res = await request(app)
            .post('/api/coupons/validate')
            .send({ code: 'save10', cartTotal: 100 })
            .set('Content-Type', 'application/json');
        expect(res.status).toBe(200);
        expect(res.body.valid).toBe(true);
    });

    it('returns correct fixed discount for 10OFF', async () => {
        const res = await request(app)
            .post('/api/coupons/validate')
            .send({ code: '10OFF', cartTotal: 50 })
            .set('Content-Type', 'application/json');
        expect(res.status).toBe(200);
        expect(res.body.valid).toBe(true);
        expect(res.body.discount).toBe(10); // fixed $10 off
    });

    it('caps fixed discount at cart total', async () => {
        const res = await request(app)
            .post('/api/coupons/validate')
            .send({ code: '10OFF', cartTotal: 5 })
            .set('Content-Type', 'application/json');
        expect(res.status).toBe(200);
        expect(res.body.discount).toBe(5); // capped at cart total
    });
});

describe('calculateDiscount() (unit)', () => {
    it('calculates percent discount correctly', () => {
        const coupon = { type: 'percent', value: 20 };
        expect(calculateDiscount(coupon, 100)).toBe(20);
    });

    it('calculates fixed discount correctly', () => {
        const coupon = { type: 'fixed', value: 15 };
        expect(calculateDiscount(coupon, 100)).toBe(15);
    });

    it('caps fixed discount at cart total', () => {
        const coupon = { type: 'fixed', value: 50 };
        expect(calculateDiscount(coupon, 30)).toBe(30);
    });
});

describe('getCoupons() (unit)', () => {
    it('returns the default coupon map when COUPONS_JSON is not set', () => {
        delete process.env.COUPONS_JSON;
        const coupons = getCoupons();
        expect(coupons).toHaveProperty('SAVE10');
        expect(coupons).toHaveProperty('10OFF');
        expect(coupons).toHaveProperty('WELCOME20');
    });

    it('parses COUPONS_JSON env var when set', () => {
        process.env.COUPONS_JSON = JSON.stringify({ TEST50: { type: 'percent', value: 50 } });
        const coupons = getCoupons();
        expect(coupons).toHaveProperty('TEST50');
        expect(coupons.TEST50.value).toBe(50);
        delete process.env.COUPONS_JSON;
    });
});
