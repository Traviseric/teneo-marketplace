/**
 * Tests for download token lifecycle in /api/download/*.
 * Covers token creation, validation, expiry enforcement, and download count limits.
 */

const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const { Readable } = require('stream');

const downloadRouter = require('../marketplace/backend/routes/download');

const app = express();
app.use(bodyParser.json());
app.use('/api/download', downloadRouter);

afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
});

describe('POST /api/download/create-token', () => {
    it('creates a token and returns downloadUrl on valid input', async () => {
        const res = await request(app)
            .post('/api/download/create-token')
            .send({ bookId: 'test-book', orderId: 'ord-001', customerEmail: 'reader@example.com' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.token).toBeDefined();
        expect(typeof res.body.token).toBe('string');
        expect(res.body.token.length).toBe(64); // 32 random bytes → 64 hex chars
        expect(res.body.downloadUrl).toContain('test-book');
    });

    it('returns 400 when required fields are missing', async () => {
        const res = await request(app)
            .post('/api/download/create-token')
            .send({ bookId: 'test-book' }); // missing orderId and customerEmail

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });
});

describe('GET /api/download/verify/:token — token lifecycle', () => {
    it('returns token info for a valid, unexpired token', async () => {
        const createRes = await request(app)
            .post('/api/download/create-token')
            .send({ bookId: 'book-a', orderId: 'ord-a', customerEmail: 'a@test.com' });
        const { token } = createRes.body;

        const res = await request(app).get(`/api/download/verify/${token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.bookId).toBe('book-a');
        expect(res.body.orderId).toBe('ord-a');
        expect(res.body.downloads).toBe(0);
        expect(res.body.maxDownloads).toBe(5);
        expect(res.body.remainingDownloads).toBe(5);
    });

    it('returns error for an unknown/nonexistent token', async () => {
        const res = await request(app).get('/api/download/verify/nonexistent_token_deadbeef1234567890');

        expect(res.status).toBe(200); // verify endpoint always 200, uses body to signal error
        expect(res.body.success).toBe(false);
        expect(res.body.error).toMatch(/invalid/i);
    });

    it('returns expired error after 24 hours have passed', async () => {
        // Create token with real timers (real Date.now())
        const createRes = await request(app)
            .post('/api/download/create-token')
            .send({ bookId: 'book-b', orderId: 'ord-b', customerEmail: 'b@test.com' });
        const { token } = createRes.body;

        // Switch to fake timers and advance clock 25 hours
        // setSystemTime does NOT run pending timers, so the cleanup setTimeout
        // does not fire — the token remains in the Map but is expired.
        jest.useFakeTimers();
        jest.setSystemTime(new Date(Date.now() + 25 * 60 * 60 * 1000));

        const res = await request(app).get(`/api/download/verify/${token}`);

        expect(res.body.success).toBe(false);
        expect(res.body.error).toMatch(/expired/i);
    });
});

describe('GET /api/download/file/:bookId — file serving and token checks', () => {
    it('returns 401 when no token is provided', async () => {
        const res = await request(app).get('/api/download/file/some-book');

        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/token required/i);
    });

    it('returns 403 for an invalid/unknown token', async () => {
        const res = await request(app)
            .get('/api/download/file/some-book')
            .query({ token: 'completely_invalid_token_xyz987' });

        expect(res.status).toBe(403);
        expect(res.body.error).toMatch(/invalid/i);
    });

    it('returns 404 when file does not exist on disk for a valid token', async () => {
        const createRes = await request(app)
            .post('/api/download/create-token')
            .send({ bookId: 'no-file-book', orderId: 'ord-nf', customerEmail: 'nf@test.com' });
        const { token } = createRes.body;

        // fs.existsSync returns false by default (no real file in test env)
        const res = await request(app)
            .get('/api/download/file/no-file-book')
            .query({ token });

        expect(res.status).toBe(404);
        expect(res.body.error).toMatch(/not found/i);
    });

    it('returns 403 after download limit (5) is reached', async () => {
        const createRes = await request(app)
            .post('/api/download/create-token')
            .send({ bookId: 'limit-book', orderId: 'ord-lim', customerEmail: 'lim@test.com' });
        const { token } = createRes.body;

        // Mock fs so the file appears to exist and is readable
        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        jest.spyOn(fs, 'createReadStream').mockImplementation(() => {
            const stream = new Readable({ read() {} });
            process.nextTick(() => stream.push(null)); // end stream immediately
            return stream;
        });

        // Download 5 times (maxDownloads = 5)
        for (let i = 0; i < 5; i++) {
            const r = await request(app)
                .get('/api/download/file/limit-book')
                .query({ token });
            expect(r.status).toBe(200);
        }

        // 6th download should be rejected
        const res = await request(app)
            .get('/api/download/file/limit-book')
            .query({ token });

        expect(res.status).toBe(403);
        expect(res.body.error).toMatch(/limit/i);
    });
});
