'use strict';

/**
 * Tests for L402 Lightning-native download routes.
 *
 * Covers:
 *   - 402 response with invoice when no Authorization header
 *   - 200 response with file when valid L402 payment proof provided
 *   - 401 for payment record not found (invalid/expired token)
 *   - 404 when resource file does not exist
 *   - /status/:paymentHash endpoint
 */

const crypto = require('crypto');
const request = require('supertest');
const express = require('express');

// ---------------------------------------------------------------------------
// Mocks — must be set up before requiring modules that use them
// ---------------------------------------------------------------------------

const mockDbGet = jest.fn();
const mockDbRun = jest.fn().mockResolvedValue({});

jest.mock('../database/database', () => ({
  get: mockDbGet,
  run: mockDbRun,
}));

jest.mock('../services/arxmintService', () => ({ enabled: false }));

// Mock fs so we can control file existence
const mockFsAccess = jest.fn();
const mockFsStat = jest.fn();
const mockFsReadFile = jest.fn();

jest.mock('fs', () => ({
  promises: {
    access: (...args) => mockFsAccess(...args),
    stat: (...args) => mockFsStat(...args),
    readFile: (...args) => mockFsReadFile(...args),
  },
}));

// ---------------------------------------------------------------------------
// Build test app
// ---------------------------------------------------------------------------

const l402Routes = require('../routes/l402Routes');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/l402', l402Routes);
  return app;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validPreimageAndHash() {
  const preimage = crypto.randomBytes(32).toString('hex');
  const paymentHash = crypto.createHash('sha256')
    .update(Buffer.from(preimage, 'hex'))
    .digest('hex');
  return { preimage, paymentHash };
}

const DUMMY_PDF = Buffer.from('%PDF-1.4 dummy content');

// ---------------------------------------------------------------------------
// Tests: GET /api/l402/download/:resource
// ---------------------------------------------------------------------------

describe('GET /api/l402/download/:resource', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
    // Default: no existing payment record
    mockDbGet.mockResolvedValue(null);
    // Default: file exists and is readable
    mockFsAccess.mockResolvedValue(undefined);
    mockFsStat.mockResolvedValue({ size: DUMMY_PDF.length });
    mockFsReadFile.mockResolvedValue(DUMMY_PDF);
  });

  it('returns 402 with BOLT11 invoice when no Authorization header', async () => {
    const res = await request(app).get('/api/l402/download/my-ebook');

    expect(res.status).toBe(402);
    expect(res.body).toMatchObject({
      error: 'Payment required',
      invoice: expect.any(String),
      payment_hash: expect.any(String),
      amount_sat: expect.any(Number),
      expires_at: expect.any(String),
      instructions: expect.any(String),
    });
    // WWW-Authenticate header must be present
    expect(res.headers['www-authenticate']).toMatch(/^L402 macaroon="[0-9a-f]+", invoice=".+"/);
  });

  it('returns 200 with file content when valid L402 payment proof provided', async () => {
    const { preimage, paymentHash } = validPreimageAndHash();

    mockDbGet.mockResolvedValue({
      id: 1,
      payment_hash: paymentHash,
      preimage: null,
      amount_sat: 499,
      resource_path: '/api/l402/download/my-ebook',
      paid_at: null,
    });

    const res = await request(app)
      .get('/api/l402/download/my-ebook')
      .set('Authorization', `L402 ${paymentHash}:${preimage}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="my-ebook.pdf"/);
    expect(res.headers['x-l402-resource']).toBe('my-ebook');
  });

  it('returns 401 when payment record not found (invalid/expired token)', async () => {
    mockDbGet.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/l402/download/my-ebook')
      .set('Authorization', 'L402 deadbeef00000000000000000000000000000000000000000000000000000000:deadpreimage');

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ error: expect.stringContaining('not found') });
  });

  it('returns 404 when resource file does not exist', async () => {
    const { preimage, paymentHash } = validPreimageAndHash();

    mockDbGet.mockResolvedValue({
      id: 2,
      payment_hash: paymentHash,
      preimage: null,
      amount_sat: 499,
      resource_path: '/api/l402/download/missing-book',
      paid_at: null,
    });

    // File does not exist
    mockFsAccess.mockRejectedValue(new Error('ENOENT: no such file'));

    const res = await request(app)
      .get('/api/l402/download/missing-book')
      .set('Authorization', `L402 ${paymentHash}:${preimage}`);

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, error: 'Resource not found' });
  });

  it('allows reuse of already-paid credential', async () => {
    const paymentHash = crypto.randomBytes(32).toString('hex');

    mockDbGet.mockResolvedValue({
      id: 3,
      payment_hash: paymentHash,
      preimage: 'some_preimage',
      amount_sat: 499,
      resource_path: '/api/l402/download/my-ebook',
      paid_at: new Date().toISOString(),
    });

    const res = await request(app)
      .get('/api/l402/download/my-ebook')
      .set('Authorization', `L402 ${paymentHash}:some_preimage`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
  });

  it('stores payment record in DB on 402 response', async () => {
    await request(app).get('/api/l402/download/my-ebook');

    expect(mockDbRun).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR IGNORE INTO l402_payments'),
      expect.arrayContaining([expect.any(String), expect.any(Number), expect.any(String)])
    );
  });
});

// ---------------------------------------------------------------------------
// Tests: GET /api/l402/status/:paymentHash
// ---------------------------------------------------------------------------

describe('GET /api/l402/status/:paymentHash', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
  });

  it('returns payment status for a known payment hash', async () => {
    const paymentHash = crypto.randomBytes(32).toString('hex');
    const now = new Date().toISOString();

    mockDbGet.mockResolvedValue({
      payment_hash: paymentHash,
      amount_sat: 499,
      resource_path: '/api/l402/download/my-ebook',
      paid_at: now,
      created_at: now,
    });

    const res = await request(app).get(`/api/l402/status/${paymentHash}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      payment_hash: paymentHash,
      paid: true,
      amount_sat: 499,
    });
  });

  it('returns 404 for unknown payment hash', async () => {
    const paymentHash = crypto.randomBytes(32).toString('hex');
    mockDbGet.mockResolvedValue(null);

    const res = await request(app).get(`/api/l402/status/${paymentHash}`);

    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid payment hash format', async () => {
    const res = await request(app).get('/api/l402/status/not-a-valid-hash');

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: expect.stringContaining('Invalid') });
  });
});
