'use strict';
/**
 * Tests for adminRoutes.js
 * Coverage: auth-status, login, book CRUD (auth gates), refund, settings load/save
 */

process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret-32-chars-long-enough!!';
process.env.ADMIN_PASSWORD_HASH = '$2b$10$test.hash.placeholder.that.wont.match.any.password';

// ── Mocks (must be hoisted before require) ──────────────────────────────────

jest.mock('../database/database', () => ({
    get: jest.fn(),
    all: jest.fn(),
    run: jest.fn(),
}));

jest.mock('../services/orderService', () => {
    return jest.fn().mockImplementation(() => ({
        getOrder: jest.fn(),
        updateOrderStatus: jest.fn(),
    }));
});

jest.mock('../services/analyticsService', () => {
    return jest.fn().mockImplementation(() => ({
        getConversionRate: jest.fn().mockResolvedValue(0),
        getOrderRevenue: jest.fn().mockResolvedValue([]),
    }));
});

jest.mock('../services/auditService', () => ({
    logAdminLogin: jest.fn().mockResolvedValue(undefined),
    logAdminLogout: jest.fn().mockResolvedValue(undefined),
    logAdminAction: jest.fn().mockResolvedValue(undefined),
    logFinancialAction: jest.fn().mockResolvedValue(undefined),
    logDataAccess: jest.fn().mockResolvedValue(undefined),
}));

// Mock fs.promises for settings file operations
jest.mock('fs', () => {
    const actual = jest.requireActual('fs');
    return {
        ...actual,
        promises: {
            ...actual.promises,
            readFile: jest.fn(),
            writeFile: jest.fn().mockResolvedValue(undefined),
            mkdir: jest.fn().mockResolvedValue(undefined),
        },
    };
});

// ── App setup ────────────────────────────────────────────────────────────────

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const request = require('supertest');
const fs = require('fs');
const db = require('../database/database');

let consoleLogSpy;
let consoleWarnSpy;
let consoleErrorSpy;

beforeAll(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
});

function buildApp() {
    const app = express();
    app.use(bodyParser.json());
    app.use(session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
    }));

    // Mount admin routes
    const adminRoutes = require('../routes/adminRoutes');
    app.use('/api/admin', adminRoutes);
    return app;
}

// ── Test suites ──────────────────────────────────────────────────────────────

describe('GET /api/admin/auth-status', () => {
    let app;
    beforeAll(() => { app = buildApp(); });

    it('returns { authenticated: false } when not logged in', async () => {
        const res = await request(app).get('/api/admin/auth-status');
        expect(res.status).toBe(200);
        expect(res.body.authenticated).toBeFalsy();
    });

    it('returns { authenticated: true } when admin session exists', async () => {
        const agent = request.agent(app);
        // Manually inject session by calling an endpoint that sets it;
        // we use a hook approach: override via direct cookie injection
        // Simulate: set session via a tiny test-only route added to this agent's app
        const testApp = express();
        testApp.use(bodyParser.json());
        const sessionMiddleware = session({
            secret: process.env.SESSION_SECRET,
            resave: false,
            saveUninitialized: false,
        });
        testApp.use(sessionMiddleware);
        testApp.get('/__set-admin-session', (req, res) => {
            req.session.isAdmin = true;
            req.session.loginTime = Date.now();
            res.json({ ok: true });
        });
        const adminRoutes = require('../routes/adminRoutes');
        testApp.use('/api/admin', adminRoutes);

        const testAgent = request.agent(testApp);
        await testAgent.get('/__set-admin-session');
        const res = await testAgent.get('/api/admin/auth-status');
        expect(res.status).toBe(200);
        expect(res.body.authenticated).toBe(true);
    });
});

describe('POST /api/admin/login', () => {
    let app;
    beforeAll(() => { app = buildApp(); });

    it('returns 400 when password is missing', async () => {
        const res = await request(app).post('/api/admin/login').send({});
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it('returns 401 when password is wrong', async () => {
        const res = await request(app)
            .post('/api/admin/login')
            .send({ password: 'wrongpassword' });
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });
});

describe('POST /api/admin/books (auth gate)', () => {
    let app;
    beforeAll(() => { app = buildApp(); });

    it('rejects unauthenticated requests with 401 or 503', async () => {
        const res = await request(app)
            .post('/api/admin/books')
            .send({ title: 'Test Book' });
        expect([401, 503]).toContain(res.status);
    });
});

describe('PUT /api/admin/books/:bookId (auth gate)', () => {
    let app;
    beforeAll(() => { app = buildApp(); });

    it('rejects unauthenticated requests with 401 or 503', async () => {
        const res = await request(app)
            .put('/api/admin/books/book-123')
            .send({ title: 'Updated' });
        expect([401, 503]).toContain(res.status);
    });
});

describe('DELETE /api/admin/books/:bookId (auth gate)', () => {
    let app;
    beforeAll(() => { app = buildApp(); });

    it('rejects unauthenticated requests with 401 or 503', async () => {
        const res = await request(app).delete('/api/admin/books/book-123');
        expect([401, 503]).toContain(res.status);
    });
});

describe('POST /api/admin/orders/:orderId/refund (auth + validation)', () => {
    let app;
    beforeAll(() => { app = buildApp(); });

    it('rejects unauthenticated requests with 401 or 503', async () => {
        const res = await request(app)
            .post('/api/admin/orders/order-123/refund')
            .send({ reason: 'test' });
        expect([401, 503]).toContain(res.status);
    });
});

describe('GET /api/admin/settings', () => {
    let app;
    beforeAll(() => { app = buildApp(); });

    it('rejects unauthenticated requests with 401 or 503', async () => {
        const res = await request(app).get('/api/admin/settings');
        expect([401, 503]).toContain(res.status);
    });

    it('returns settings object when authenticated', async () => {
        // Mock settings file read to return empty (use defaults)
        fs.promises.readFile.mockRejectedValueOnce(new Error('ENOENT'));

        // Also mock db queries used by dashboard/other routes
        db.get.mockImplementation((sql, params, cb) => {
            if (typeof params === 'function') { params(null, { total: 0, count: 0 }); }
            else if (typeof cb === 'function') { cb(null, { total: 0, count: 0 }); }
        });

        const testApp = express();
        testApp.use(bodyParser.json());
        const sessionMiddleware = session({
            secret: process.env.SESSION_SECRET,
            resave: false,
            saveUninitialized: false,
        });
        testApp.use(sessionMiddleware);
        testApp.get('/__set-admin-session', (req, res) => {
            req.session.isAdmin = true;
            req.session.loginTime = Date.now();
            res.json({ ok: true });
        });
        const adminRoutes = require('../routes/adminRoutes');
        testApp.use('/api/admin', adminRoutes);

        const agent = request.agent(testApp);
        await agent.get('/__set-admin-session');

        const res = await agent.get('/api/admin/settings');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('storeName');
    });
});

describe('POST /api/admin/save-all', () => {
    let app;
    beforeAll(() => { app = buildApp(); });

    it('rejects unauthenticated requests with 401 or 503', async () => {
        const res = await request(app)
            .post('/api/admin/save-all')
            .send({ settings: {}, emailTemplates: {} });
        expect([401, 503]).toContain(res.status);
    });

    it('does NOT mutate process.env.STRIPE_SECRET_KEY when saving new key', async () => {
        fs.promises.writeFile.mockResolvedValue(undefined);

        const testApp = express();
        testApp.use(bodyParser.json());
        const sessionMiddleware = session({
            secret: process.env.SESSION_SECRET,
            resave: false,
            saveUninitialized: false,
        });
        testApp.use(sessionMiddleware);
        testApp.get('/__set-admin-session', (req, res) => {
            req.session.isAdmin = true;
            req.session.loginTime = Date.now();
            res.json({ ok: true });
        });
        const adminRoutes = require('../routes/adminRoutes');
        testApp.use('/api/admin', adminRoutes);

        const agent = request.agent(testApp);
        await agent.get('/__set-admin-session');

        const envBefore = process.env.STRIPE_SECRET_KEY;

        const res = await agent.post('/api/admin/save-all').send({
            settings: { stripeSecretKey: 'sk_test_new_key_12345' },
            emailTemplates: {},
        });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        // Key must NOT have been mutated in process.env
        expect(process.env.STRIPE_SECRET_KEY).toBe(envBefore);
    });

    it('does NOT mutate process.env.STRIPE_PUBLISHABLE_KEY when saving new key', async () => {
        fs.promises.writeFile.mockResolvedValue(undefined);

        const testApp = express();
        testApp.use(bodyParser.json());
        const sessionMiddleware = session({
            secret: process.env.SESSION_SECRET,
            resave: false,
            saveUninitialized: false,
        });
        testApp.use(sessionMiddleware);
        testApp.get('/__set-admin-session', (req, res) => {
            req.session.isAdmin = true;
            req.session.loginTime = Date.now();
            res.json({ ok: true });
        });
        const adminRoutes = require('../routes/adminRoutes');
        testApp.use('/api/admin', adminRoutes);

        const agent = request.agent(testApp);
        await agent.get('/__set-admin-session');

        const envBefore = process.env.STRIPE_PUBLISHABLE_KEY;

        await agent.post('/api/admin/save-all').send({
            settings: { stripePublishableKey: 'pk_test_new_key_67890' },
            emailTemplates: {},
        });

        expect(process.env.STRIPE_PUBLISHABLE_KEY).toBe(envBefore);
    });

    it('persists settings to file (writeFile called with settings JSON)', async () => {
        fs.promises.writeFile.mockClear();
        fs.promises.writeFile.mockResolvedValue(undefined);

        const testApp = express();
        testApp.use(bodyParser.json());
        const sessionMiddleware = session({
            secret: process.env.SESSION_SECRET,
            resave: false,
            saveUninitialized: false,
        });
        testApp.use(sessionMiddleware);
        testApp.get('/__set-admin-session', (req, res) => {
            req.session.isAdmin = true;
            req.session.loginTime = Date.now();
            res.json({ ok: true });
        });
        const adminRoutes = require('../routes/adminRoutes');
        testApp.use('/api/admin', adminRoutes);

        const agent = request.agent(testApp);
        await agent.get('/__set-admin-session');

        const settings = { storeName: 'My Store', stripeSecretKey: 'sk_test_abc' };
        const res = await agent.post('/api/admin/save-all').send({
            settings,
            emailTemplates: { orderConfirm: { subject: 'test' } },
        });

        expect(res.status).toBe(200);
        // writeFile should have been called (settings + email templates = 2 calls)
        expect(fs.promises.writeFile).toHaveBeenCalled();
        // First call should write the settings JSON
        const firstCallArgs = fs.promises.writeFile.mock.calls[0];
        const writtenContent = JSON.parse(firstCallArgs[1]);
        expect(writtenContent.storeName).toBe('My Store');
    });
});
