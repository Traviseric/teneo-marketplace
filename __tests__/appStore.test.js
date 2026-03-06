const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('./test-app');
const db = require('../marketplace/backend/database/database');

// Seed the in-process SQLite DB with app store schema + fixture data.
// Uses INSERT OR IGNORE so re-runs are idempotent.
beforeAll(async () => {
    const schemaPath = path.join(__dirname, '..', 'marketplace', 'backend', 'database', 'schema-appstore.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await db.exec(schema);

    // te-image-engine — used by GET /api/apps, q=image, discover, manifest tests
    await db.run(
        `INSERT OR IGNORE INTO apps
            (id, publisher_id, name, description, category, capabilities, endpoint_url,
             auth_method, pricing_model, pricing_config, source_url, verification_tier, trust_score, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            'te-image-engine', 'travis-eric', 'Image Engine',
            'AI-powered image generation. Book covers, logos, app icons, game assets, social graphics.',
            'image', '["image.generate","image.cover.book"]',
            'https://bookcovergenerator.ai', 'service_key', 'per_call',
            '{"per_call_sats":300}', 'https://github.com/traviseric/image-engine',
            'official', 9.0, 'active'
        ]
    );
    await db.run(
        `INSERT OR IGNORE INTO app_capabilities (app_id, capability, description) VALUES (?, ?, ?)`,
        ['te-image-engine', 'image.generate', 'Generate images from text prompts']
    );
    await db.run(
        `INSERT OR IGNORE INTO app_capabilities (app_id, capability, description) VALUES (?, ?, ?)`,
        ['te-image-engine', 'image.cover.book', 'Generate book covers with title/author text']
    );
    await db.run(
        `INSERT OR IGNORE INTO app_endpoints
            (app_id, name, method, path, capability, cost_sats, input_schema, output_schema)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            'te-image-engine', 'generate', 'POST', '/api/ai-invoke/generate',
            'image.generate', 300,
            '{"prompt":"string","style":"string","dimensions":"string"}',
            '{"url":"string","format":"string"}'
        ]
    );

    // te-ai-trust — used by category=security filter test (trust_score 9.5 >= 9)
    await db.run(
        `INSERT OR IGNORE INTO apps
            (id, publisher_id, name, description, category, capabilities, endpoint_url,
             auth_method, pricing_model, pricing_config, source_url, verification_tier, trust_score, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            'te-ai-trust', 'travis-eric', 'AI Trust Gateway',
            'Complete AI trust layer. Content quality scoring, PII/PHI detection, model routing.',
            'security', '["content.quality_score","content.pii_scan"]',
            'https://ai-trust-gateway.vercel.app', 'service_key', 'per_call',
            '{"per_call_sats":200}', 'https://github.com/traviseric/ai-trust-stack',
            'official', 9.5, 'active'
        ]
    );
    await db.run(
        `INSERT OR IGNORE INTO app_capabilities (app_id, capability, description) VALUES (?, ?, ?)`,
        ['te-ai-trust', 'content.quality_score', 'Multi-dimensional content quality scoring']
    );
});

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
