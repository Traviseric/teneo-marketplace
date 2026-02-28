/**
 * Tests for /api/brands endpoints.
 */
const request = require('supertest');
const app = require('./test-app');

describe('GET /api/brands', () => {
    it('returns 200 with success:true and brands array', async () => {
        const res = await request(app).get('/api/brands');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.brands)).toBe(true);
    });

    it('includes a count matching the brands array length', async () => {
        const res = await request(app).get('/api/brands');
        expect(res.status).toBe(200);
        expect(res.body.count).toBe(res.body.brands.length);
    });

    it('returns brand objects with id field', async () => {
        const res = await request(app).get('/api/brands');
        expect(res.status).toBe(200);
        // At least one brand should exist in the repo
        if (res.body.brands.length > 0) {
            expect(res.body.brands[0].id).toBeDefined();
        }
    });
});

describe('POST /api/brands (auth-protected)', () => {
    it('returns 401 when not authenticated', async () => {
        const res = await request(app)
            .post('/api/brands')
            .send({ id: 'test-brand', name: 'Test Brand' })
            .set('Content-Type', 'application/json');
        expect(res.status).toBe(401);
    });
});

describe('DELETE /api/brands/:id (auth-protected)', () => {
    it('returns 401 when not authenticated', async () => {
        const res = await request(app)
            .delete('/api/brands/nonexistent-brand');
        expect(res.status).toBe(401);
    });
});
