/**
 * Integration tests for the course enrollment flow.
 *
 * Covers:
 *   - enrollUserInCourse() helper (called by Stripe webhook after payment)
 *   - requireEnrollment middleware: unauthenticated → 401
 *   - requireEnrollment middleware: authenticated but not enrolled → 403
 *   - requireEnrollment middleware: enrolled user → 200
 *   - requireEnrollment middleware: expired enrollment → 403
 */

// ─── Mocks (must be declared before any require) ─────────────────────────────

const mockDbGet = jest.fn();
const mockDbAll = jest.fn();
const mockDbRun = jest.fn();

jest.mock('../marketplace/backend/database/database', () => ({
    get: mockDbGet,
    all: mockDbAll,
    run: mockDbRun
}));

jest.mock('../marketplace/backend/middleware/auth', () => ({
    authenticateAdmin: (req, res, _next) =>
        res.status(401).json({ error: 'admin auth required' })
}));

jest.mock('../marketplace/backend/services/certificateService', () => ({
    isEligible: jest.fn().mockResolvedValue({ eligible: false, reasons: [] }),
    generateCertificate: jest.fn().mockResolvedValue({ certId: 'cert-1', verificationUrl: 'http://x' }),
    getCertificate: jest.fn().mockResolvedValue(null)
}));

// ─── Test helpers ─────────────────────────────────────────────────────────────

const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');

const courseRouter = require('../marketplace/backend/routes/courseRoutes');
const { enrollUserInCourse } = courseRouter;

/**
 * Build a minimal test Express app with optional session data injected.
 * @param {Object|null} sessionData  Properties to merge into req.session.
 */
function buildApp(sessionData = null) {
    const app = express();
    app.use(bodyParser.json());
    app.use(session({
        secret: 'test-session-secret',
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false }
    }));
    if (sessionData) {
        // Inject test session values so requireEnrollment sees a logged-in user
        app.use((req, _res, next) => {
            Object.assign(req.session, sessionData);
            next();
        });
    }
    app.use('/api/courses', courseRouter);
    return app;
}

beforeEach(() => {
    jest.clearAllMocks();
});

// ─── enrollUserInCourse (direct unit tests) ───────────────────────────────────

describe('enrollUserInCourse()', () => {
    it('inserts enrollment record when course is found', async () => {
        mockDbGet.mockImplementation((sql, params, callback) => {
            callback(null, { id: 42 });
        });
        mockDbRun.mockImplementation(function (sql, params, callback) {
            callback.call({ lastID: 1, changes: 1 }, null);
        });

        await expect(
            enrollUserInCourse('test-course', 'user@example.com', 'order_001')
        ).resolves.toBeUndefined();

        expect(mockDbRun).toHaveBeenCalledWith(
            expect.stringContaining('INSERT OR IGNORE INTO course_enrollments'),
            [42, 'user@example.com', 'order_001'],
            expect.any(Function)
        );
    });

    it('normalises email to lowercase before storing', async () => {
        mockDbGet.mockImplementation((sql, params, callback) => {
            callback(null, { id: 10 });
        });
        mockDbRun.mockImplementation(function (sql, params, callback) {
            callback.call({ lastID: 2 }, null);
        });

        await enrollUserInCourse('course-slug', 'User@EXAMPLE.COM', 'order_002');

        const insertParams = mockDbRun.mock.calls[0][1];
        expect(insertParams[1]).toBe('user@example.com');
    });

    it('throws when course slug is not found in the database', async () => {
        mockDbGet.mockImplementation((sql, params, callback) => {
            callback(null, undefined); // no row
        });

        await expect(
            enrollUserInCourse('missing-slug', 'user@example.com', 'order_003')
        ).rejects.toThrow('Course not found: missing-slug');

        expect(mockDbRun).not.toHaveBeenCalled();
    });
});

// ─── requireEnrollment middleware ─────────────────────────────────────────────

describe('GET /api/courses/:slug/learn — requireEnrollment middleware', () => {
    it('returns 401 when request has no authenticated session', async () => {
        const app = buildApp(); // no session injected
        const res = await request(app).get('/api/courses/any-slug/learn');
        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/authentication required/i);
    });

    it('returns 403 when authenticated but not enrolled in course', async () => {
        // First db.get call: find course by slug → returns course
        mockDbGet.mockImplementationOnce((sql, params, callback) => {
            callback(null, { id: 5 });
        });
        // Second db.get call: find enrollment → returns nothing
        mockDbGet.mockImplementationOnce((sql, params, callback) => {
            callback(null, undefined);
        });

        const app = buildApp({ isAuthenticated: true, email: 'buyer@example.com' });
        const res = await request(app).get('/api/courses/test-course/learn');
        expect(res.status).toBe(403);
        expect(res.body.error).toMatch(/not enrolled/i);
    });

    it('returns 403 when enrollment has expired', async () => {
        mockDbGet.mockImplementationOnce((sql, params, callback) => {
            callback(null, { id: 5 });
        });
        // Enrollment exists but expired in the past
        mockDbGet.mockImplementationOnce((sql, params, callback) => {
            callback(null, { id: 77, course_id: 5, expires_at: '2000-01-01T00:00:00.000Z' });
        });

        const app = buildApp({ isAuthenticated: true, email: 'buyer@example.com' });
        const res = await request(app).get('/api/courses/test-course/learn');
        expect(res.status).toBe(403);
        expect(res.body.error).toMatch(/expired/i);
    });

    it('returns 200 with course modules for an enrolled user', async () => {
        // requireEnrollment: course found
        mockDbGet.mockImplementationOnce((sql, params, callback) => {
            callback(null, { id: 5 });
        });
        // requireEnrollment: active enrollment found (no expiry)
        mockDbGet.mockImplementationOnce((sql, params, callback) => {
            callback(null, { id: 99, course_id: 5, expires_at: null });
        });
        // route handler: modules query → empty list
        mockDbAll.mockImplementationOnce((sql, params, callback) => {
            callback(null, []);
        });
        // route handler: progress query → empty list
        mockDbAll.mockImplementationOnce((sql, params, callback) => {
            callback(null, []);
        });

        const app = buildApp({ isAuthenticated: true, email: 'buyer@example.com' });
        const res = await request(app).get('/api/courses/test-course/learn');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.modules)).toBe(true);
        expect(Array.isArray(res.body.completedLessons)).toBe(true);
    });
});
