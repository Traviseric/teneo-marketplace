const request = require('supertest');
const app = require('./test-app');

describe('Agent App Store API', () => {
    describe('GET /api/apps', () => {
        it('should return list of apps', async () => {
            const res = await request(app).get('/api/apps');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.apps).toBeInstanceOf(Array);
            expect(res.body.apps.length).toBeGreaterThan(0);
        });

        it('should filter by category', async () => {
            const res = await request(app).get('/api/apps?category=security');
            expect(res.status).toBe(200);
            res.body.apps.forEach(a => expect(a.category).toBe('security'));
        });

        it('should search by query', async () => {
            const res = await request(app).get('/api/apps?q=image');
            expect(res.status).toBe(200);
            expect(res.body.apps.length).toBeGreaterThan(0);
        });
    });

    describe('GET /api/apps/discover', () => {
        it('should discover apps by capability', async () => {
            const res = await request(app).get('/api/apps/discover?capability=image.generate');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.apps.length).toBeGreaterThan(0);
            expect(res.body.apps[0].endpoints).toBeInstanceOf(Array);
        });

        it('should discover apps by task description', async () => {
            const res = await request(app).get('/api/apps/discover?task=generate+book+cover');
            expect(res.status).toBe(200);
            expect(res.body.apps.length).toBeGreaterThan(0);
        });

        it('should filter by min_trust', async () => {
            const res = await request(app).get('/api/apps/discover?capability=image&min_trust=9');
            expect(res.status).toBe(200);
            res.body.apps.forEach(a => expect(a.trust_score).toBeGreaterThanOrEqual(9));
        });

        it('should require capability or task', async () => {
            const res = await request(app).get('/api/apps/discover');
            expect(res.status).toBe(400);
        });
    });

    describe('GET /api/apps/:id', () => {
        it('should return app detail with endpoints and stats', async () => {
            const res = await request(app).get('/api/apps/te-image-engine');
            expect(res.status).toBe(200);
            expect(res.body.app.name).toBe('Image Engine');
            expect(res.body.app.endpoints).toBeInstanceOf(Array);
            expect(res.body.app.reviews).toBeInstanceOf(Array);
            expect(res.body.app.stats).toBeDefined();
        });

        it('should return 404 for unknown app', async () => {
            const res = await request(app).get('/api/apps/nonexistent');
            expect(res.status).toBe(404);
        });
    });

    describe('GET /api/apps/:id/manifest', () => {
        it('should return machine-readable manifest', async () => {
            const res = await request(app).get('/api/apps/te-image-engine/manifest');
            expect(res.status).toBe(200);
            expect(res.body.id).toBe('te-image-engine');
            expect(res.body.capabilities).toBeInstanceOf(Array);
            expect(res.body.capabilities).toContain('image.generate');
            expect(res.body.endpoints).toBeDefined();
            expect(res.body.endpoints.generate).toBeDefined();
            expect(res.body.auth).toBe('service_key');
            expect(res.body.verification).toBe('official');
        });
    });
});
