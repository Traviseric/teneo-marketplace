/**
 * Tests for GET /api/health
 */
const request = require('supertest');
const app = require('./test-app');

describe('Health endpoint', () => {
    it('returns 200 with status healthy', async () => {
        const res = await request(app).get('/api/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('healthy');
    });

    it('includes a timestamp in the response', async () => {
        const res = await request(app).get('/api/health');
        expect(res.body.timestamp).toBeDefined();
        expect(new Date(res.body.timestamp).getTime()).not.toBeNaN();
    });

    it('includes the service name', async () => {
        const res = await request(app).get('/api/health');
        expect(res.body.service).toBe('teneo-marketplace-api');
    });
});
