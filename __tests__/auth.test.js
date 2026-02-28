/**
 * Tests for /api/auth endpoints — validation layer only.
 * Does not require SMTP or OAuth to be configured.
 */
const request = require('supertest');
const app = require('./test-app');

describe('POST /api/auth/login', () => {
    it('returns 400 when email is missing', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({})
            .set('Content-Type', 'application/json');
        expect(res.status).toBe(400);
        expect(res.body.error).toBeDefined();
    });

    it('returns 400 when email is invalid', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'not-an-email' })
            .set('Content-Type', 'application/json');
        expect(res.status).toBe(400);
        expect(res.body.error).toBeDefined();
    });

    it('returns 400 for malformed email like @@example.com', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: '@@example.com' })
            .set('Content-Type', 'application/json');
        expect(res.status).toBe(400);
    });
});

describe('POST /api/auth/register', () => {
    it('returns 400 when both email and name are missing', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({})
            .set('Content-Type', 'application/json');
        expect(res.status).toBe(400);
        expect(res.body.error).toBeDefined();
    });

    it('returns 400 when name is missing', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'user@example.com' })
            .set('Content-Type', 'application/json');
        expect(res.status).toBe(400);
    });

    it('returns 400 when email is invalid', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'bad-email', name: 'Test User' })
            .set('Content-Type', 'application/json');
        expect(res.status).toBe(400);
    });
});

describe('GET /api/auth/config', () => {
    it('returns auth provider config', async () => {
        const res = await request(app).get('/api/auth/config');
        expect(res.status).toBe(200);
        expect(res.body).toBeDefined();
    });
});

describe('POST /api/auth/nostr/verify', () => {
    it('returns 400 when event is missing', async () => {
        const res = await request(app)
            .post('/api/auth/nostr/verify')
            .send({})
            .set('Content-Type', 'application/json');
        expect(res.status).toBe(400);
        expect(res.body.error).toBeDefined();
    });

    it('returns 401 for a malformed base64 event', async () => {
        const res = await request(app)
            .post('/api/auth/nostr/verify')
            .send({ event: 'not-valid-base64!!!' })
            .set('Content-Type', 'application/json');
        expect(res.status).toBe(401);
    });

    it('returns 401 for an event with wrong kind', async () => {
        const badEvent = { kind: 1, pubkey: 'a'.repeat(64), sig: 'b'.repeat(128), id: 'c'.repeat(64), created_at: Math.floor(Date.now() / 1000), tags: [], content: '' };
        const token = Buffer.from(JSON.stringify(badEvent)).toString('base64');
        const res = await request(app)
            .post('/api/auth/nostr/verify')
            .send({ event: token })
            .set('Content-Type', 'application/json');
        expect(res.status).toBe(401);
    });

    it('returns 401 for an expired event', async () => {
        const expiredEvent = { kind: 27235, pubkey: 'a'.repeat(64), sig: 'b'.repeat(128), id: 'c'.repeat(64), created_at: Math.floor(Date.now() / 1000) - 120, tags: [], content: '' };
        const token = Buffer.from(JSON.stringify(expiredEvent)).toString('base64');
        const res = await request(app)
            .post('/api/auth/nostr/verify')
            .send({ event: token })
            .set('Content-Type', 'application/json');
        expect(res.status).toBe(401);
    });
});
