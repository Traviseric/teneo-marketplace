'use strict';

/**
 * Tests for NIP-05 DNS verification endpoint (/.well-known/nostr.json)
 *
 * Covers:
 *   - Returns correct JSON for a store with a nostr_pubkey
 *   - Returns 404 { names: {} } for unknown handle
 *   - Returns 404 { names: {} } for known store without pubkey
 *   - Includes Access-Control-Allow-Origin: * header
 *   - Returns 400 when name param is missing
 *   - Strips unsafe characters from name param
 */

const express = require('express');
const request = require('supertest');

// ---------------------------------------------------------------------------
// Mock database before requiring the router
// ---------------------------------------------------------------------------

const mockStores = {
  alice: {
    id: 'store-alice-001',
    slug: 'alice',
    nostr_pubkey: 'a'.repeat(64),
  },
  bob: {
    id: 'store-bob-002',
    slug: 'bob',
    nostr_pubkey: null, // saved store but no pubkey yet
  },
};

jest.mock('../marketplace/backend/database/database', () => ({
  get: jest.fn(async (sql, params) => {
    const slug = params && params[0];
    return mockStores[slug] || null;
  }),
}));

const wellKnownRouter = require('../marketplace/backend/routes/wellKnownRoutes');

function buildApp() {
  const app = express();
  app.use('/.well-known', wellKnownRouter);
  return app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /.well-known/nostr.json', () => {
  let app;

  beforeEach(() => {
    app = buildApp();
    jest.clearAllMocks();
  });

  it('returns correct names mapping for a store with a pubkey', async () => {
    const res = await request(app)
      .get('/.well-known/nostr.json?name=alice');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      names: { alice: 'a'.repeat(64) },
    });
  });

  it('returns Access-Control-Allow-Origin: * header', async () => {
    const res = await request(app)
      .get('/.well-known/nostr.json?name=alice');

    expect(res.headers['access-control-allow-origin']).toBe('*');
  });

  it('returns 404 with empty names for an unknown handle', async () => {
    const res = await request(app)
      .get('/.well-known/nostr.json?name=nobody');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ names: {} });
    // Still includes CORS header
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });

  it('returns 404 for a store that has no nostr_pubkey set', async () => {
    const res = await request(app)
      .get('/.well-known/nostr.json?name=bob');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ names: {} });
  });

  it('returns 400 when name param is missing', async () => {
    const res = await request(app)
      .get('/.well-known/nostr.json');

    expect(res.status).toBe(400);
  });

  it('sanitizes name by stripping non-alphanumeric characters before querying', async () => {
    const db = require('../marketplace/backend/database/database');
    // "; DROP TABLE stores" — semicolons, spaces stripped; letters stay
    await request(app)
      .get('/.well-known/nostr.json?name=alice%3B%20DROP%20TABLE%20stores');

    // Semicolons and spaces are stripped; letters remain → 'alicedroptablestores'
    expect(db.get).toHaveBeenCalledWith(
      expect.any(String),
      ['alicedroptablestores']
    );
  });
});
