/**
 * Tests for POST /api/auth/nostr/verify
 *
 * Covers the full NIP-98 verification flow including:
 * - Input validation (missing / malformed event)
 * - NIP-98 structure checks (kind, expiry, URL/method tags)
 * - Schnorr signature verification (valid and invalid)
 * - Happy path: valid signature creates a session
 *
 * Uses @noble/curves (already a project dependency via NostrAuthProvider).
 */

// @noble/curves is installed in the backend's node_modules
const { schnorr } = require('../marketplace/backend/node_modules/@noble/curves/secp256k1');
const { sha256 } = require('../marketplace/backend/node_modules/@noble/hashes/sha256');
const { utf8ToBytes, bytesToHex } = require('../marketplace/backend/node_modules/@noble/hashes/utils');

// Mock the database so user creation doesn't require a real SQLite DB
const mockDbRun = jest.fn();
const mockDbGet = jest.fn();

jest.mock('../marketplace/backend/database/db', () => ({
    run: mockDbRun,
    get: mockDbGet,
    prepare: jest.fn(),
    isPostgres: false,
}));

const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const crypto = require('crypto');

const authRouter = require('../marketplace/backend/routes/auth');

const app = express();
app.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, sameSite: 'strict' },
}));
app.use(bodyParser.json());
// Trust proxy so each test can use a distinct IP for rate limiter isolation
app.set('trust proxy', 1);
app.use('/api/auth', authRouter);

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Compute the canonical Nostr event ID (SHA256 of serialized event data). */
function computeEventId(event) {
    const serialized = JSON.stringify([
        0,
        event.pubkey,
        event.created_at,
        event.kind,
        event.tags,
        event.content,
    ]);
    return bytesToHex(sha256(utf8ToBytes(serialized)));
}

/**
 * Build and sign a NIP-98 HTTP auth event using the given private key.
 * Returns a base64-encoded JSON string ready for POST body.
 */
async function buildNip98Token(privkey, { url, method = 'POST', ageSec = 0 } = {}) {
    const pubkey = bytesToHex(schnorr.getPublicKey(privkey));
    const created_at = Math.floor(Date.now() / 1000) - ageSec;
    const tags = [];
    if (url) tags.push(['u', url]);
    tags.push(['method', method.toUpperCase()]);

    const event = {
        kind: 27235,
        pubkey,
        created_at,
        tags,
        content: '',
    };

    event.id = computeEventId(event);
    event.sig = bytesToHex(await schnorr.sign(event.id, privkey));

    return Buffer.from(JSON.stringify(event)).toString('base64');
}

// ── Tests ─────────────────────────────────────────────────────────────────────

// Use distinct IPs per describe block to avoid rate limiter carryover
let ipCounter = 100;
function nextIp() { return `10.0.1.${++ipCounter}`; }

beforeEach(() => {
    jest.clearAllMocks();

    // Default: no existing user found (new user creation path)
    mockDbGet.mockImplementation((sql, params, callback) => {
        if (callback) callback(null, null);
        return Promise.resolve(null);
    });

    // Default: INSERT succeeds
    mockDbRun.mockImplementation((sql, params, callback) => {
        if (callback) callback(null);
        return Promise.resolve({ lastID: 1, changes: 1 });
    });
});

afterAll(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
});

describe('POST /api/auth/nostr/verify — input validation', () => {
    it('returns 400 when event body is missing', async () => {
        const res = await request(app)
            .post('/api/auth/nostr/verify')
            .set('X-Forwarded-For', nextIp())
            .send({})
            .set('Content-Type', 'application/json');
        expect(res.status).toBe(400);
        expect(res.body.error).toBeDefined();
    });

    it('returns 400 when event is not a string', async () => {
        const res = await request(app)
            .post('/api/auth/nostr/verify')
            .set('X-Forwarded-For', nextIp())
            .send({ event: 12345 })
            .set('Content-Type', 'application/json');
        expect(res.status).toBe(400);
    });

    it('returns 401 for non-base64 event string', async () => {
        const res = await request(app)
            .post('/api/auth/nostr/verify')
            .set('X-Forwarded-For', nextIp())
            .send({ event: '!!!not-base64!!!' })
            .set('Content-Type', 'application/json');
        expect(res.status).toBe(401);
    });
});

describe('POST /api/auth/nostr/verify — NIP-98 structure checks', () => {
    function makeToken(overrides) {
        const event = {
            kind: 27235,
            pubkey: 'a'.repeat(64),
            sig: 'b'.repeat(128),
            id: 'c'.repeat(64),
            created_at: Math.floor(Date.now() / 1000),
            tags: [],
            content: '',
            ...overrides,
        };
        return Buffer.from(JSON.stringify(event)).toString('base64');
    }

    it('returns 401 for wrong kind (not 27235)', async () => {
        const token = makeToken({ kind: 1 });
        const res = await request(app)
            .post('/api/auth/nostr/verify')
            .set('X-Forwarded-For', nextIp())
            .send({ event: token })
            .set('Content-Type', 'application/json');
        expect(res.status).toBe(401);
        expect(res.body.error).toBeDefined();
    });

    it('returns 401 for invalid pubkey (not 64-char hex)', async () => {
        const token = makeToken({ pubkey: 'not-hex' });
        const res = await request(app)
            .post('/api/auth/nostr/verify')
            .set('X-Forwarded-For', nextIp())
            .send({ event: token })
            .set('Content-Type', 'application/json');
        expect(res.status).toBe(401);
    });

    it('returns 401 for expired event (created_at > 60s ago)', async () => {
        const token = makeToken({ created_at: Math.floor(Date.now() / 1000) - 120 });
        const res = await request(app)
            .post('/api/auth/nostr/verify')
            .set('X-Forwarded-For', nextIp())
            .send({ event: token })
            .set('Content-Type', 'application/json');
        expect(res.status).toBe(401);
    });
});

describe('POST /api/auth/nostr/verify — signature verification', () => {
    it('returns 401 for structurally valid event with wrong signature', async () => {
        const privkey = schnorr.utils.randomPrivateKey();
        const pubkey = bytesToHex(schnorr.getPublicKey(privkey));
        const created_at = Math.floor(Date.now() / 1000);

        // Create a structurally valid event but use a fake (wrong) signature
        const event = {
            kind: 27235,
            pubkey,
            created_at,
            tags: [['u', 'http://localhost/api/auth/nostr/verify'], ['method', 'POST']],
            content: '',
        };
        event.id = computeEventId(event);
        // Wrong sig: random 64 bytes instead of the real signature
        event.sig = bytesToHex(schnorr.utils.randomPrivateKey()) + bytesToHex(schnorr.utils.randomPrivateKey());

        const token = Buffer.from(JSON.stringify(event)).toString('base64');
        const res = await request(app)
            .post('/api/auth/nostr/verify')
            .set('X-Forwarded-For', nextIp())
            .send({ event: token })
            .set('Content-Type', 'application/json');
        expect(res.status).toBe(401);
    });

    it('returns 401 when event.id does not match computed hash', async () => {
        const privkey = schnorr.utils.randomPrivateKey();
        const pubkey = bytesToHex(schnorr.getPublicKey(privkey));
        const created_at = Math.floor(Date.now() / 1000);

        const event = {
            kind: 27235,
            pubkey,
            created_at,
            tags: [],
            content: '',
            id: 'deadbeef'.repeat(8), // tampered ID
            sig: 'b'.repeat(128),
        };
        const token = Buffer.from(JSON.stringify(event)).toString('base64');
        const res = await request(app)
            .post('/api/auth/nostr/verify')
            .set('X-Forwarded-For', nextIp())
            .send({ event: token })
            .set('Content-Type', 'application/json');
        expect(res.status).toBe(401);
    });

    it('returns 200 and creates session for a valid Schnorr-signed NIP-98 event', async () => {
        const privkey = schnorr.utils.randomPrivateKey();
        const pubkey = bytesToHex(schnorr.getPublicKey(privkey));

        // Simulate "no existing user" → then successful INSERT
        mockDbGet
            .mockImplementationOnce((sql, params, callback) => {
                // First call: lookup by nostr_pubkey column → not found
                if (callback) callback(null, null);
                return Promise.resolve(null);
            })
            .mockImplementationOnce((sql, params, callback) => {
                // Second call: lookup by synthetic email → not found
                if (callback) callback(null, null);
                return Promise.resolve(null);
            });

        mockDbRun.mockImplementation((sql, params, callback) => {
            if (callback) callback(null);
            return Promise.resolve({ lastID: 1, changes: 1 });
        });

        // Build a valid signed NIP-98 event
        // Build token with URL matching what the backend will derive from Host header
        const verifyUrl = 'http://localhost/api/auth/nostr/verify';
        const token = await buildNip98Token(privkey, { url: verifyUrl });

        const res = await request(app)
            .post('/api/auth/nostr/verify')
            .set('X-Forwarded-For', nextIp())
            .set('Host', 'localhost')
            .send({ event: token })
            .set('Content-Type', 'application/json');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.user).toBeDefined();
        expect(res.body.user.pubkey).toBe(pubkey);
    });

    it('returns 200 for existing user (login, not new account)', async () => {
        const privkey = schnorr.utils.randomPrivateKey();
        const pubkey = bytesToHex(schnorr.getPublicKey(privkey));
        const existingUserId = crypto.randomUUID();

        // Simulate existing user found on first DB lookup
        mockDbGet.mockImplementationOnce((sql, params, callback) => {
            const fakeUser = {
                id: existingUserId,
                email: pubkey + '@nostr.local',
                name: 'nostr:' + pubkey.slice(0, 8) + '...',
                avatar_url: null,
                credits: 0,
                account_status: 'active',
            };
            if (callback) callback(null, fakeUser);
            return Promise.resolve(fakeUser);
        });

        // UPDATE last_login call
        mockDbRun.mockImplementation((sql, params, callback) => {
            if (callback) callback(null);
            return Promise.resolve({ changes: 1 });
        });

        const verifyUrl = 'http://localhost/api/auth/nostr/verify';
        const token = await buildNip98Token(privkey, { url: verifyUrl });

        const res = await request(app)
            .post('/api/auth/nostr/verify')
            .set('X-Forwarded-For', nextIp())
            .set('Host', 'localhost')
            .send({ event: token })
            .set('Content-Type', 'application/json');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.user.pubkey).toBe(pubkey);
    });
});
