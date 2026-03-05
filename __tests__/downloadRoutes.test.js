/**
 * Tests for downloadRoutes.js — token-based PDF download endpoints.
 * Covers token validation, expiry, download limits, and admin endpoints.
 */

const mockGetOrderByDownloadToken = jest.fn();
const mockLogDownload = jest.fn().mockResolvedValue(true);
const mockIncrementDownloadCount = jest.fn().mockResolvedValue(true);

jest.mock('../marketplace/backend/services/orderService', () => {
    return jest.fn().mockImplementation(() => ({
        getOrderByDownloadToken: mockGetOrderByDownloadToken,
        logDownload: mockLogDownload,
        incrementDownloadCount: mockIncrementDownloadCount
    }));
});

// Mock fs.access and createReadStream
const mockFsAccess = jest.fn();
const mockCreateReadStream = jest.fn();

jest.mock('fs', () => ({
    promises: {
        access: (...args) => mockFsAccess(...args),
        readdir: jest.fn().mockResolvedValue([]),
        stat: jest.fn().mockResolvedValue({ size: 1000, birthtime: new Date(), mtime: new Date() }),
        mkdir: jest.fn().mockResolvedValue(undefined)
    },
    createReadStream: (...args) => mockCreateReadStream(...args)
}));

// Mock arxmintService
jest.mock('../marketplace/backend/services/arxmintService', () => ({
    enabled: false,
    verifyL402Payment: jest.fn()
}));

// Mock multer to avoid disk writes in tests
jest.mock('multer', () => {
    const multer = () => ({
        single: () => (req, res, next) => next()
    });
    multer.diskStorage = () => ({});
    return multer;
});

// Mock authenticateAdmin to approve by default
const mockAuthenticateAdmin = jest.fn((req, res, next) => next());
jest.mock('../marketplace/backend/middleware/auth', () => ({
    authenticateAdmin: (req, res, next) => mockAuthenticateAdmin(req, res, next),
    loginLimiter: (req, res, next) => next()
}));

const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');

const downloadRouter = require('../marketplace/backend/routes/downloadRoutes');

const app = express();
app.use(bodyParser.json());
app.use('/api/download', downloadRouter);

const VALID_ORDER = {
    order_id: 'order_001',
    book_id: 'test-book',
    book_title: 'Test Book',
    customer_email: 'buyer@example.com',
    download_expiry: new Date(Date.now() + 86400000).toISOString(), // 24h from now
    download_count: 0
};

beforeEach(() => {
    jest.clearAllMocks();
    mockAuthenticateAdmin.mockImplementation((req, res, next) => next());
});

// ─── GET /:token — token validation ──────────────────────────────────────────

describe('GET /api/download/:token', () => {
    it('returns 404 when token not found in DB', async () => {
        mockGetOrderByDownloadToken.mockResolvedValue(null);

        const res = await request(app).get('/api/download/invalid-token-xyz');
        expect(res.status).toBe(404);
        expect(res.body.error).toMatch(/invalid or expired/i);
    });

    it('returns 410 when download token is expired', async () => {
        const expiredOrder = {
            ...VALID_ORDER,
            download_expiry: new Date(Date.now() - 1000).toISOString() // past
        };
        mockGetOrderByDownloadToken.mockResolvedValue(expiredOrder);

        const res = await request(app).get('/api/download/expired-token');
        expect(res.status).toBe(410);
        expect(res.body.error).toMatch(/expired/i);
    });

    it('returns 429 when download count is at or above max (5)', async () => {
        const maxedOrder = { ...VALID_ORDER, download_count: 5 };
        mockGetOrderByDownloadToken.mockResolvedValue(maxedOrder);
        mockFsAccess.mockResolvedValue(undefined);

        const res = await request(app).get('/api/download/maxed-token');
        expect(res.status).toBe(429);
        expect(res.body.error).toMatch(/download limit/i);
    });

    it('returns 404 when book PDF file is not found on disk', async () => {
        mockGetOrderByDownloadToken.mockResolvedValue(VALID_ORDER);
        mockFsAccess.mockRejectedValue(new Error('ENOENT: no such file'));

        const res = await request(app).get('/api/download/valid-token');
        expect(res.status).toBe(404);
        expect(res.body.error).toMatch(/book file not found/i);
    });

    it('streams file and returns 200 on successful download', async () => {
        mockGetOrderByDownloadToken.mockResolvedValue(VALID_ORDER);
        mockFsAccess.mockResolvedValue(undefined);

        // Create a fake readable stream that ends immediately
        const { PassThrough } = require('stream');
        const fakeStream = new PassThrough();
        mockCreateReadStream.mockReturnValue(fakeStream);

        const resPromise = request(app).get('/api/download/good-token');
        // End the stream so the response completes
        fakeStream.end(Buffer.from('%PDF-1.4 fake content'));

        const res = await resPromise;
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/application\/pdf/);
        expect(mockIncrementDownloadCount).toHaveBeenCalledWith(VALID_ORDER.order_id);
    });
});

// ─── POST /upload — admin auth ────────────────────────────────────────────────

describe('POST /api/download/upload', () => {
    it('returns 401 without admin auth', async () => {
        mockAuthenticateAdmin.mockImplementation((req, res, next) =>
            res.status(401).json({ error: 'Unauthorized' })
        );

        const res = await request(app)
            .post('/api/download/upload')
            .send({});
        expect(res.status).toBe(401);
    });

    it('returns 400 when no file is uploaded', async () => {
        // Auth passes, but no file (multer mock returns no file)
        const res = await request(app)
            .post('/api/download/upload')
            .field('bookId', 'test-book');
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/no pdf file/i);
    });
});

// ─── GET /token/:token/info — token info ──────────────────────────────────────

describe('GET /api/download/token/:token/info', () => {
    it('returns 404 for unknown token', async () => {
        mockGetOrderByDownloadToken.mockResolvedValue(null);

        const res = await request(app).get('/api/download/token/unknown-token/info');
        expect(res.status).toBe(404);
    });

    it('returns token info for valid token', async () => {
        mockGetOrderByDownloadToken.mockResolvedValue(VALID_ORDER);

        const res = await request(app).get('/api/download/token/valid-token/info');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.tokenInfo.bookId).toBe(VALID_ORDER.book_id);
        expect(res.body.tokenInfo.isExpired).toBe(false);
        expect(res.body.tokenInfo.downloadsRemaining).toBe(5);
    });
});
