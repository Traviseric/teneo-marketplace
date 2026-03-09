'use strict';

/**
 * Tests for L402 paywall middleware.
 *
 * Covers:
 *   - HTTP 402 response shape when no credential present
 *   - WWW-Authenticate header format
 *   - Valid preimage accepted → 200 (next() called)
 *   - Invalid preimage rejected → 402
 *   - Already-paid credential reused → allowed
 *   - verifyPreimage helper
 *   - usdToSats conversion
 */

const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Mock database before requiring middleware
// ---------------------------------------------------------------------------

const mockDbGet = jest.fn();
const mockDbRun = jest.fn().mockResolvedValue({});

jest.mock('../database/database', () => ({
  get: mockDbGet,
  run: mockDbRun,
}));

// Mock arxmintService — disabled by default
jest.mock('../services/arxmintService', () => ({
  enabled: false,
}));

const { requireL402, verifyPreimage, usdToSats } = require('../middleware/l402Auth');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildReq(overrides = {}) {
  return {
    headers: {},
    path: '/api/download/test-token',
    url: '/api/download/test-token',
    ...overrides,
  };
}

function buildRes() {
  const res = {
    _status: 200,
    _headers: {},
    _json: null,
    status(code) { this._status = code; return this; },
    setHeader(k, v) { this._headers[k] = v; },
    json(body) { this._json = body; return this; },
  };
  return res;
}

// ---------------------------------------------------------------------------
// verifyPreimage
// ---------------------------------------------------------------------------

describe('verifyPreimage', () => {
  it('returns true for valid preimage/hash pair', () => {
    const preimage = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256')
      .update(Buffer.from(preimage, 'hex'))
      .digest('hex');
    expect(verifyPreimage(preimage, hash)).toBe(true);
  });

  it('returns false for incorrect preimage', () => {
    const preimage = crypto.randomBytes(32).toString('hex');
    const wrongHash = crypto.randomBytes(32).toString('hex');
    expect(verifyPreimage(preimage, wrongHash)).toBe(false);
  });

  it('returns false for malformed input', () => {
    expect(verifyPreimage('not-hex!!!', 'also-not-hex')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// usdToSats
// ---------------------------------------------------------------------------

describe('usdToSats', () => {
  it('converts $1.00 to 1000 sats at default 100000 sats/USD', () => {
    delete process.env.BTC_USD_RATE;
    expect(usdToSats(1.00)).toBe(1000);
  });

  it('respects BTC_USD_RATE env override', () => {
    process.env.BTC_USD_RATE = '50000';
    expect(usdToSats(1.00)).toBe(500);
    delete process.env.BTC_USD_RATE;
  });

  it('returns at least 1 sat for tiny prices', () => {
    delete process.env.BTC_USD_RATE;
    expect(usdToSats(0.000001)).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// requireL402 middleware
// ---------------------------------------------------------------------------

describe('requireL402 middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no existing payment record
    mockDbGet.mockResolvedValue(null);
  });

  it('responds 402 with invoice when no Authorization header', async () => {
    const middleware = requireL402(4.99);
    const req = buildReq();
    const res = buildRes();
    const next = jest.fn();

    await middleware(req, res, next);

    expect(res._status).toBe(402);
    expect(res._json).toMatchObject({
      error: 'Payment required',
      invoice: expect.any(String),
      payment_hash: expect.any(String),
      amount_sat: expect.any(Number),
      expires_at: expect.any(String),
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('sets WWW-Authenticate header on 402', async () => {
    const middleware = requireL402(4.99);
    const req = buildReq();
    const res = buildRes();
    const next = jest.fn();

    await middleware(req, res, next);

    expect(res._headers['WWW-Authenticate']).toMatch(/^L402 macaroon="[0-9a-f]+", invoice=".+"/);
  });

  it('stores payment record in DB on 402', async () => {
    const middleware = requireL402(4.99);
    const req = buildReq();
    const res = buildRes();
    const next = jest.fn();

    await middleware(req, res, next);

    expect(mockDbRun).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR IGNORE INTO l402_payments'),
      expect.arrayContaining([expect.any(String), expect.any(Number), expect.any(String)])
    );
  });

  it('accepts valid preimage and calls next()', async () => {
    const preimage = crypto.randomBytes(32).toString('hex');
    const paymentHash = crypto.createHash('sha256')
      .update(Buffer.from(preimage, 'hex'))
      .digest('hex');

    // DB returns a pending payment
    mockDbGet.mockResolvedValue({
      id: 1,
      payment_hash: paymentHash,
      preimage: null,
      amount_sat: 499,
      resource_path: '/api/download/test',
      paid_at: null,
    });

    const middleware = requireL402(4.99);
    const req = buildReq({
      headers: { authorization: `L402 ${paymentHash}:${preimage}` },
    });
    const res = buildRes();
    const next = jest.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.l402Paid).toBe(true);
    expect(res._status).toBe(200); // not changed — next() was called
  });

  it('rejects invalid preimage with 402', async () => {
    const paymentHash = crypto.randomBytes(32).toString('hex');
    const wrongPreimage = crypto.randomBytes(32).toString('hex');

    mockDbGet.mockResolvedValue({
      id: 1,
      payment_hash: paymentHash,
      preimage: null,
      amount_sat: 499,
      resource_path: '/api/download/test',
      paid_at: null,
    });

    const middleware = requireL402(4.99);
    const req = buildReq({
      headers: { authorization: `L402 ${paymentHash}:${wrongPreimage}` },
    });
    const res = buildRes();
    const next = jest.fn();

    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(402);
    expect(res._json).toMatchObject({ error: expect.stringContaining('Invalid preimage') });
  });

  it('allows reuse of already-paid credential', async () => {
    const paymentHash = crypto.randomBytes(32).toString('hex');

    mockDbGet.mockResolvedValue({
      id: 1,
      payment_hash: paymentHash,
      preimage: 'some_preimage',
      amount_sat: 499,
      resource_path: '/api/download/test',
      paid_at: new Date().toISOString(),
    });

    const middleware = requireL402(4.99);
    const req = buildReq({
      headers: { authorization: `L402 ${paymentHash}:some_preimage` },
    });
    const res = buildRes();
    const next = jest.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.l402Paid).toBe(true);
  });

  it('returns 401 when payment record not found', async () => {
    mockDbGet.mockResolvedValue(null);

    const middleware = requireL402(4.99);
    const req = buildReq({
      headers: { authorization: 'L402 unknownhash:somepreimage' },
    });
    const res = buildRes();
    const next = jest.fn();

    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(401);
  });

  it('returns 400 for malformed L402 header (no colon)', async () => {
    const middleware = requireL402(4.99);
    const req = buildReq({
      headers: { authorization: 'L402 macaroonwithoutcolon' },
    });
    const res = buildRes();
    const next = jest.fn();

    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(400);
  });
});
