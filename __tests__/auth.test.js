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
