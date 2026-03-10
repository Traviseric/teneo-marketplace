/**
 * Tests for downloadRoutes.js - token-based PDF download endpoints.
 * Covers token validation, expiry, download limits, and admin endpoints.
 */

const mockGetOrderByDownloadToken = jest.fn();
const mockLogDownload = jest.fn().mockResolvedValue(true);
const mockIncrementDownloadCount = jest.fn().mockResolvedValue(true);
const mockDbGet = jest.fn();
const mockAuthenticateAdmin = jest.fn((req, res, next) => next());
const mockFsAccess = jest.fn();
const mockFsReadFile = jest.fn();
const mockStampPdf = jest.fn();

jest.mock('../marketplace/backend/services/orderService', () => {
    return jest.fn().mockImplementation(() => ({
        getOrderByDownloadToken: mockGetOrderByDownloadToken,
        logDownload: mockLogDownload,
        incrementDownloadCount: mockIncrementDownloadCount,
    }));
});

jest.mock('../marketplace/backend/database/database', () => ({
    run: jest.fn().mockResolvedValue({ changes: 1 }),
    get: (...args) => mockDbGet(...args),
    all: jest.fn().mockResolvedValue([]),
}));

jest.mock('../marketplace/backend/middleware/l402Auth', () => ({
    requireL402: () => (req, res, next) => next(),
    initL402Table: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../marketplace/backend/services/pdfStampingService', () => ({
    stampPDF: (...args) => mockStampPdf(...args),
}));

jest.mock('fs', () => ({
    promises: {
        access: (...args) => mockFsAccess(...args),
        readFile: (...args) => mockFsReadFile(...args),
        readdir: jest.fn().mockResolvedValue([]),
        stat: jest.fn().mockResolvedValue({ size: 1000, birthtime: new Date(), mtime: new Date() }),
        mkdir: jest.fn().mockResolvedValue(undefined),
        unlink: jest.fn().mockResolvedValue(undefined),
    },
}));

jest.mock('../marketplace/backend/services/arxmintService', () => ({
    enabled: false,
    verifyL402Payment: jest.fn(),
}));

jest.mock('multer', () => {
    const multer = () => ({
        single: () => (req, res, next) => next(),
    });
    multer.diskStorage = () => ({});
    return multer;
});

jest.mock('../marketplace/backend/middleware/auth', () => ({
    authenticateAdmin: (req, res, next) => mockAuthenticateAdmin(req, res, next),
    loginLimiter: (req, res, next) => next(),
}));

const request = require('supertest');
const express = require('express');
const downloadRouter = require('../marketplace/backend/routes/downloadRoutes');

let consoleLogSpy;

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/download', downloadRouter);
    return app;
}

const VALID_ORDER = {
    order_id: 'order_001',
    book_id: 'test-book',
    book_title: 'Test Book',
    customer_email: 'buyer@example.com',
    customer_name: 'Buyer Example',
    download_expiry: new Date(Date.now() + 86400000).toISOString(),
    download_count: 0,
    created_at: new Date().toISOString(),
};

beforeEach(() => {
    jest.clearAllMocks();
    mockAuthenticateAdmin.mockImplementation((req, res, next) => next());
    mockDbGet.mockImplementation((sql) => {
        if (sql.includes('COUNT(*) as count')) {
            return Promise.resolve({ count: 0 });
        }
        return Promise.resolve(null);
    });
    mockFsAccess.mockResolvedValue(undefined);
    mockFsReadFile.mockResolvedValue(Buffer.from('%PDF-1.4 fake content'));
    mockStampPdf.mockResolvedValue(Buffer.from('%PDF-1.4 stamped content'));
});

beforeAll(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll(() => {
    consoleLogSpy.mockRestore();
});

describe('GET /api/download/:token', () => {
    it('returns 404 when token not found in DB', async () => {
        const app = buildApp();
        mockGetOrderByDownloadToken.mockResolvedValue(null);

        const res = await request(app).get('/api/download/invalid-token-xyz');
        expect(res.status).toBe(404);
        expect(res.body.error).toMatch(/invalid or expired/i);
    });

    it('returns 410 when download token is expired', async () => {
        const app = buildApp();
        const expiredOrder = {
            ...VALID_ORDER,
            download_expiry: new Date(Date.now() - 1000).toISOString(),
        };
        mockGetOrderByDownloadToken.mockResolvedValue(expiredOrder);

        const res = await request(app).get('/api/download/expired-token');
        expect(res.status).toBe(410);
        expect(res.body.error).toMatch(/expired/i);
    });

    it('returns 429 when download count is at or above max (5)', async () => {
        const app = buildApp();
        const maxedOrder = { ...VALID_ORDER, download_count: 5 };
        mockGetOrderByDownloadToken.mockResolvedValue(maxedOrder);

        const res = await request(app).get('/api/download/maxed-token');
        expect(res.status).toBe(429);
        expect(res.body.error).toMatch(/download limit/i);
    });

    it('returns 404 when book PDF file is not found on disk', async () => {
        const app = buildApp();
        mockGetOrderByDownloadToken.mockResolvedValue(VALID_ORDER);
        mockFsAccess.mockRejectedValue(new Error('ENOENT: no such file'));

        const res = await request(app).get('/api/download/valid-token');
        expect(res.status).toBe(404);
        expect(res.body.error).toMatch(/book file not found/i);
    });

    it('serves stamped PDF bytes and returns 200 on successful download', async () => {
        const app = buildApp();
        mockGetOrderByDownloadToken.mockResolvedValue(VALID_ORDER);

        const res = await request(app)
            .get('/api/download/good-token')
            .buffer(true)
            .parse((response, callback) => {
                const chunks = [];
                response.on('data', (chunk) => chunks.push(chunk));
                response.on('end', () => callback(null, Buffer.concat(chunks)));
            });

        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/application\/pdf/);
        expect(mockIncrementDownloadCount).toHaveBeenCalledWith(VALID_ORDER.order_id);
        expect(mockStampPdf).toHaveBeenCalledWith(
            expect.any(Buffer),
            VALID_ORDER.customer_email,
            VALID_ORDER.customer_name
        );
    });
});

describe('POST /api/download/upload', () => {
    it('returns 401 without admin auth', async () => {
        const app = buildApp();
        mockAuthenticateAdmin.mockImplementation((req, res, next) =>
            res.status(401).json({ error: 'Unauthorized' })
        );

        const res = await request(app)
            .post('/api/download/upload')
            .send({});
        expect(res.status).toBe(401);
    });

    it('returns 400 when no file is uploaded', async () => {
        const app = buildApp();
        const res = await request(app)
            .post('/api/download/upload')
            .field('bookId', 'test-book');
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/no pdf file/i);
    });
});

describe('GET /api/download/token/:token/info', () => {
    it('returns 404 for unknown token', async () => {
        const app = buildApp();
        mockGetOrderByDownloadToken.mockResolvedValue(null);

        const res = await request(app).get('/api/download/token/unknown-token/info');
        expect(res.status).toBe(404);
    });

    it('returns token info for valid token', async () => {
        const app = buildApp();
        mockGetOrderByDownloadToken.mockResolvedValue(VALID_ORDER);

        const res = await request(app).get('/api/download/token/valid-token/info');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.tokenInfo.bookId).toBe(VALID_ORDER.book_id);
        expect(res.body.tokenInfo.isExpired).toBe(false);
        expect(res.body.tokenInfo.downloadsRemaining).toBe(5);
    });
});
