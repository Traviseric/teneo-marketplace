'use strict';

/**
 * Tests for network federation routes:
 *   - routes/network.js   (catalog, search, store-info, ping, stats)
 *   - routes/networkRoutes.js (status, discovery, admin config)
 *
 * Covers acceptance criteria from task 054:
 *   - Catalog query with pagination
 *   - Path traversal guard on brand param (regression for task 014 fix)
 *   - Cross-network search with/without brand filter
 *   - Missing query validation (search requires q)
 *   - Store info and ping heartbeat
 *   - Network status and discovery (public routes)
 *   - Admin peer/trusted-store routes gate (401 without auth)
 */

const express = require('express');
const request = require('supertest');

const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

// ---------------------------------------------------------------------------
// Mock networkConfig — avoids hitting the filesystem and key generation
// ---------------------------------------------------------------------------
jest.mock('../config/network', () => ({
  networkEnabled: false,
  shareCatalog: false,
  acceptReferrals: false,
  referralPercentage: 10,
  publicKey: 'test-public-key',
  privateKey: null,
  networkPeers: [],
  trustedStores: [],
  federationSettings: { maxPeers: 50, syncInterval: 300000, timeout: 30000, retryAttempts: 3 },
  getNetworkStatus: jest.fn(() => ({ networkEnabled: false, shareCatalog: false, peers: 0 })),
  getDiscoveryInfo: jest.fn(() => null),
  getNetworkStats: jest.fn(() => ({ peers: 0, trustedStores: 0 })),
  healthCheck: jest.fn(() => Promise.resolve({ healthy: true })),
  setNetworkEnabled: jest.fn(() => Promise.resolve()),
  setCatalogSharing: jest.fn(() => Promise.resolve()),
  setReferralSettings: jest.fn(() => Promise.resolve()),
  addTrustedStore: jest.fn((id, key, ep) => Promise.resolve({ storeId: id, publicKey: key, endpoint: ep })),
  removeTrustedStore: jest.fn(() => Promise.resolve()),
  addNetworkPeer: jest.fn((id, ep) => Promise.resolve({ peerId: id, endpoint: ep })),
  removeNetworkPeer: jest.fn(() => Promise.resolve()),
  generateKeysIfNeeded: jest.fn(() => Promise.resolve()),
}));

// Mock auth middleware — allows tests to control admin access via header
jest.mock('../middleware/auth', () => ({
  authenticateAdmin: (req, res, next) => {
    if (req.headers['x-admin-token'] === 'test-admin') return next();
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  },
  requireHTTPS: (_req, _res, next) => next(),
}));

const networkCatalogRouter = require('../routes/network');
const networkConfigRouter = require('../routes/networkRoutes');

// ---------------------------------------------------------------------------
// App factories — one per router to avoid route conflicts
// ---------------------------------------------------------------------------

function buildCatalogApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/network', networkCatalogRouter);
  return app;
}

function buildConfigApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/network', networkConfigRouter);
  return app;
}

// ---------------------------------------------------------------------------
// routes/network.js — catalog federation endpoints
// ---------------------------------------------------------------------------

describe('GET /api/network/catalog', () => {
  const app = buildCatalogApp();

  it('returns 200 with books and store info', async () => {
    const res = await request(app).get('/api/network/catalog');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('store');
    expect(Array.isArray(res.body.books)).toBe(true);
  });

  it('accepts brand=teneo and returns books for that brand', async () => {
    const res = await request(app).get('/api/network/catalog?brand=teneo');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 400 for brand=.. (direct parent traversal)', async () => {
    // path.basename('..') === '..' which the guard explicitly rejects
    const res = await request(app).get('/api/network/catalog?brand=..');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('neutralizes ../../etc/passwd — does not serve passwd file (traversal blocked by basename)', async () => {
    // path.basename('../../etc/passwd') === 'passwd' — safely reduced to non-existent brand name
    const res = await request(app).get('/api/network/catalog?brand=../../etc/passwd');
    // Returns 200 with empty books (brand 'passwd' doesn't exist), not file contents
    expect(res.body).not.toHaveProperty('error', '/etc/passwd');
    expect(Array.isArray(res.body.books)).toBe(true);
  });

  it('accepts pagination params without error', async () => {
    const res = await request(app).get('/api/network/catalog?limit=2&offset=0');
    expect(res.status).toBe(200);
    expect(res.body.books.length).toBeLessThanOrEqual(2);
  });
});

describe('GET /api/network/store/info', () => {
  const app = buildCatalogApp();

  it('returns 200 with store metadata', async () => {
    const res = await request(app).get('/api/network/store/info');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.store).toHaveProperty('id');
    expect(res.body.store).toHaveProperty('name');
  });
});

describe('POST /api/network/network/ping', () => {
  const app = buildCatalogApp();

  it('returns 200 pong response', async () => {
    const res = await request(app)
      .post('/api/network/network/ping')
      .send({ fromStore: 'test-peer', timestamp: new Date().toISOString() });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('active');
  });

  it('handles missing fromStore gracefully', async () => {
    const res = await request(app).post('/api/network/network/ping').send({});
    expect(res.status).toBe(200);
  });
});

describe('GET /api/network/search', () => {
  const app = buildCatalogApp();

  it('returns 400 when q is missing', async () => {
    const res = await request(app).get('/api/network/search');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when q is blank', async () => {
    const res = await request(app).get('/api/network/search?q=');
    expect(res.status).toBe(400);
  });

  it('returns 200 with results array for a valid query', async () => {
    const res = await request(app).get('/api/network/search?q=test');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.results)).toBe(true);
  });

  it('returns 400 for brand=.. (direct parent traversal)', async () => {
    const res = await request(app).get('/api/network/search?q=book&brand=..');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('neutralizes ../../etc/passwd in brand — does not expose file contents', async () => {
    const res = await request(app).get('/api/network/search?q=test&brand=../../etc/passwd');
    // Brand 'passwd' doesn't exist → returns 200 with empty results (traversal neutralized by basename)
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.results)).toBe(true);
  });

  it('accepts brand filter without error', async () => {
    const res = await request(app).get('/api/network/search?q=knowledge&brand=teneo');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('query', 'knowledge');
  });
});

describe('GET /api/network/stats', () => {
  const app = buildCatalogApp();

  it('returns 200 with stats object', async () => {
    const res = await request(app).get('/api/network/stats');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.stats).toHaveProperty('totalBooks');
  });
});

// ---------------------------------------------------------------------------
// routes/networkRoutes.js — network config endpoints
// ---------------------------------------------------------------------------

describe('GET /api/network/status (public)', () => {
  const app = buildConfigApp();

  it('returns 200 with network status', async () => {
    const res = await request(app).get('/api/network/status');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('data');
  });
});

describe('GET /api/network/discovery (public)', () => {
  const app = buildConfigApp();

  it('returns 404 when network is disabled', async () => {
    const res = await request(app).get('/api/network/discovery');
    expect(res.status).toBe(404);
  });
});

describe('Admin-gated network config routes (401 without auth)', () => {
  const app = buildConfigApp();

  it('GET /api/network/config returns 401 without auth', async () => {
    const res = await request(app).get('/api/network/config');
    expect(res.status).toBe(401);
  });

  it('POST /api/network/peers returns 401 without auth', async () => {
    const res = await request(app).post('/api/network/peers').send({ peerId: 'p1', endpoint: 'https://peer1.example.com' });
    expect(res.status).toBe(401);
  });

  it('POST /api/network/trusted-stores returns 401 without auth', async () => {
    const res = await request(app).post('/api/network/trusted-stores').send({ storeId: 's1', publicKey: 'key', endpoint: 'https://store1.example.com' });
    expect(res.status).toBe(401);
  });

  it('POST /api/network/peers succeeds with admin token', async () => {
    const res = await request(app)
      .post('/api/network/peers')
      .set('x-admin-token', 'test-admin')
      .send({ peerId: 'peer-1', endpoint: 'https://peer1.example.com' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

afterAll(() => {
  consoleLogSpy.mockRestore();
});
