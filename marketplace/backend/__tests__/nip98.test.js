/**
 * Unit tests for NIP-98 HTTP Auth middleware (auth/nip98.js)
 *
 * Tests cover:
 * - parseAuthHeader: valid, missing, wrong scheme, bad base64, bad JSON
 * - validateEventStructure: valid, expired, URL mismatch, method mismatch
 * - verifyNip98Auth: integration using real secp256k1 key pair
 * - requireNip98Auth middleware: pass-through and rejection
 */

const {
  parseAuthHeader,
  validateEventStructure,
  verifyNip98Auth,
  requireNip98Auth,
  NIP98_KIND,
  MAX_EVENT_AGE_SEC,
} = require('../auth/nip98');

const { schnorr } = require('@noble/curves/secp256k1');
const { sha256 } = require('@noble/hashes/sha256');
const { utf8ToBytes, bytesToHex, hexToBytes } = require('@noble/hashes/utils');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Compute canonical Nostr event ID */
function computeEventId(event) {
  const s = JSON.stringify([0, event.pubkey, event.created_at, event.kind, event.tags, event.content]);
  return bytesToHex(sha256(utf8ToBytes(s)));
}

/** Create and sign a valid NIP-98 event */
function makeNip98Event({ privKeyHex, url, method, createdAt } = {}) {
  const privKey = privKeyHex ? hexToBytes(privKeyHex) : schnorr.utils.randomPrivateKey();
  const pubkey = bytesToHex(schnorr.getPublicKey(privKey));
  const now = createdAt !== undefined ? createdAt : Math.floor(Date.now() / 1000);

  const event = {
    kind: NIP98_KIND,
    pubkey,
    created_at: now,
    tags: [
      ['u', url || 'http://localhost/api/test'],
      ['method', (method || 'POST').toUpperCase()],
    ],
    content: '',
  };

  event.id = computeEventId(event);
  event.sig = bytesToHex(schnorr.sign(event.id, privKey));
  return { event, privKey, pubkey };
}

function toBase64(event) {
  return Buffer.from(JSON.stringify(event)).toString('base64');
}

// ─── parseAuthHeader ─────────────────────────────────────────────────────────

describe('parseAuthHeader', () => {
  it('parses a valid Nostr Authorization header', () => {
    const { event } = makeNip98Event();
    const token = toBase64(event);
    const parsed = parseAuthHeader(`Nostr ${token}`);
    expect(parsed.kind).toBe(NIP98_KIND);
  });

  it('throws on missing header', () => {
    expect(() => parseAuthHeader(undefined)).toThrow('Missing Authorization header');
    expect(() => parseAuthHeader('')).toThrow('Missing Authorization header');
  });

  it('throws on wrong scheme', () => {
    expect(() => parseAuthHeader('Bearer sometoken')).toThrow('"Nostr" scheme');
  });

  it('throws on bad base64', () => {
    expect(() => parseAuthHeader('Nostr !!!not_base64!!!')).toThrow();
  });

  it('throws on base64 that is not JSON', () => {
    const notJson = Buffer.from('hello world').toString('base64');
    expect(() => parseAuthHeader(`Nostr ${notJson}`)).toThrow('not valid JSON');
  });
});

// ─── validateEventStructure ───────────────────────────────────────────────────

describe('validateEventStructure', () => {
  it('accepts a valid event with matching URL and method', () => {
    const { event } = makeNip98Event({ url: 'http://localhost/api/test', method: 'POST' });
    expect(() =>
      validateEventStructure(event, 'http://localhost/api/test', 'POST')
    ).not.toThrow();
  });

  it('rejects wrong kind', () => {
    const { event } = makeNip98Event();
    expect(() => validateEventStructure({ ...event, kind: 1 }, null, null)).toThrow('kind');
  });

  it('rejects expired events', () => {
    const { event } = makeNip98Event({ createdAt: Math.floor(Date.now() / 1000) - 120 });
    expect(() => validateEventStructure(event, null, null)).toThrow('expired');
  });

  it('rejects future events beyond tolerance', () => {
    const { event } = makeNip98Event({ createdAt: Math.floor(Date.now() / 1000) + 120 });
    expect(() => validateEventStructure(event, null, null)).toThrow('expired');
  });

  it('rejects URL mismatch', () => {
    const { event } = makeNip98Event({ url: 'http://localhost/api/test' });
    expect(() =>
      validateEventStructure(event, 'http://localhost/api/other', null)
    ).toThrow('URL');
  });

  it('rejects method mismatch', () => {
    const { event } = makeNip98Event({ method: 'POST' });
    expect(() =>
      validateEventStructure(event, null, 'GET')
    ).toThrow('method');
  });

  it('accepts event when URL/method checks are skipped (null)', () => {
    const { event } = makeNip98Event();
    expect(() => validateEventStructure(event, null, null)).not.toThrow();
  });
});

// ─── verifyNip98Auth ──────────────────────────────────────────────────────────

describe('verifyNip98Auth', () => {
  it('returns valid:true for a correctly signed event', () => {
    const url = 'http://localhost/api/test';
    const { event, pubkey } = makeNip98Event({ url, method: 'POST' });

    const req = {
      headers: {
        authorization: `Nostr ${toBase64(event)}`,
        host: 'localhost',
      },
      secure: false,
      method: 'POST',
      originalUrl: '/api/test',
    };

    const result = verifyNip98Auth(req);
    expect(result.valid).toBe(true);
    expect(result.pubkey).toBe(pubkey);
  });

  it('returns valid:false for missing Authorization header', () => {
    const req = { headers: {}, secure: false, method: 'POST', originalUrl: '/api/test' };
    const result = verifyNip98Auth(req);
    expect(result.valid).toBe(false);
  });

  it('returns valid:false for an expired event', () => {
    const { event } = makeNip98Event({
      url: 'http://localhost/api/test',
      method: 'POST',
      createdAt: Math.floor(Date.now() / 1000) - 200,
    });
    const req = {
      headers: { authorization: `Nostr ${toBase64(event)}`, host: 'localhost' },
      secure: false,
      method: 'POST',
      originalUrl: '/api/test',
    };
    const result = verifyNip98Auth(req);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/expired/);
  });

  it('returns valid:false for tampered event ID', () => {
    const url = 'http://localhost/api/test';
    const { event } = makeNip98Event({ url, method: 'POST' });
    const tampered = { ...event, id: event.id.replace('a', 'b') };

    const req = {
      headers: { authorization: `Nostr ${toBase64(tampered)}`, host: 'localhost' },
      secure: false,
      method: 'POST',
      originalUrl: '/api/test',
    };
    const result = verifyNip98Auth(req);
    expect(result.valid).toBe(false);
  });
});

// ─── requireNip98Auth middleware ──────────────────────────────────────────────

describe('requireNip98Auth middleware', () => {
  it('calls next() and sets req.nostrPubkey for valid auth', () => {
    const url = 'http://localhost/api/test';
    const { event, pubkey } = makeNip98Event({ url, method: 'GET' });

    const req = {
      headers: { authorization: `Nostr ${toBase64(event)}`, host: 'localhost' },
      secure: false,
      method: 'GET',
      originalUrl: '/api/test',
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    requireNip98Auth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.nostrPubkey).toBe(pubkey);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 401 for missing Authorization header', () => {
    const req = { headers: {}, secure: false, method: 'GET', originalUrl: '/api/test' };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    requireNip98Auth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
  });

  it('returns 401 for expired event', () => {
    const { event } = makeNip98Event({
      url: 'http://localhost/api/test',
      method: 'POST',
      createdAt: Math.floor(Date.now() / 1000) - 200,
    });
    const req = {
      headers: { authorization: `Nostr ${toBase64(event)}`, host: 'localhost' },
      secure: false,
      method: 'POST',
      originalUrl: '/api/test',
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    requireNip98Auth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
