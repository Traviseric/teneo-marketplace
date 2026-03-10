'use strict';

/**
 * Tests for marketplace/backend/routes/storefront.js
 *
 * Covers:
 *   - GET /api/storefront/catalog
 *   - GET /api/storefront/catalog/:category
 *   - GET /api/storefront/product/:id
 *   - POST /api/storefront/checkout (API key enforcement)
 *   - POST /api/storefront/fulfill  (HMAC signature verification)
 */

const express = require('express');
const request = require('supertest');

let consoleLogSpy;
let consoleWarnSpy;
let consoleErrorSpy;

// ---------------------------------------------------------------------------
// Mock all heavy service dependencies before requiring the router
// ---------------------------------------------------------------------------

jest.mock('../services/orderService', () =>
  jest.fn().mockImplementation(() => ({
    createOrder: jest.fn().mockResolvedValue({}),
    getOrder: jest.fn().mockResolvedValue(null),
    getOrderBySessionId: jest.fn().mockResolvedValue(null),
    completeOrder: jest.fn().mockResolvedValue({ downloadToken: 'tok-test-123' }),
    updateOrderStatus: jest.fn().mockResolvedValue({}),
    // updateOrderState added: checkout unification introduced state-machine transitions
    updateOrderState: jest.fn().mockResolvedValue({}),
  }))
);

jest.mock('../services/emailService', () => ({
  sendDownloadEmail: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('../services/fulfillmentService', () => ({
  createOrder: jest.fn().mockResolvedValue({ orderId: 'POD-001', status: 'pending' }),
}));

jest.mock('../services/arxmintProvider', () => ({
  enabled: false,
  webhookSecret: null,
  merchantId: 'test-merchant',
  createCheckout: jest.fn(),
  verifyWebhook: jest.fn(),
}));

const storefrontRouter = require('../routes/storefront');
const arxmintProvider = require('../services/arxmintProvider');

beforeAll(() => {
  consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

// ---------------------------------------------------------------------------
// Test app factory — rebuilding each suite avoids NODE_ENV side-effects
// ---------------------------------------------------------------------------

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/storefront', storefrontRouter);
  return app;
}

// Save and restore NODE_ENV around the whole file
let savedNodeEnv;
beforeAll(() => { savedNodeEnv = process.env.NODE_ENV; });
afterAll(() => {
  process.env.NODE_ENV = savedNodeEnv;
  consoleLogSpy.mockRestore();
  consoleWarnSpy.mockRestore();
  consoleErrorSpy.mockRestore();
});

// ---------------------------------------------------------------------------
// GET /api/storefront/catalog
// ---------------------------------------------------------------------------

describe('GET /api/storefront/catalog', () => {
  const app = buildApp();

  it('returns 200 with a products array', async () => {
    const res = await request(app).get('/api/storefront/catalog');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('products');
    expect(Array.isArray(res.body.products)).toBe(true);
  });

  it('returns a categories array alongside products', async () => {
    const res = await request(app).get('/api/storefront/catalog');
    expect(res.body).toHaveProperty('categories');
    expect(Array.isArray(res.body.categories)).toBe(true);
  });

  it('accepts ?category query param without error', async () => {
    const res = await request(app).get('/api/storefront/catalog?category=Books');
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// GET /api/storefront/catalog/:category
// ---------------------------------------------------------------------------

describe('GET /api/storefront/catalog/:category', () => {
  const app = buildApp();

  it('returns 200 with filtered products', async () => {
    const res = await request(app).get('/api/storefront/catalog/Books');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('products');
    expect(Array.isArray(res.body.products)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// GET /api/storefront/product/:id
// ---------------------------------------------------------------------------

describe('GET /api/storefront/product/:id', () => {
  const app = buildApp();

  it('returns 404 for an unknown product id', async () => {
    const res = await request(app).get('/api/storefront/product/nobody:nothing');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// POST /api/storefront/checkout
// STOREFRONT_API_KEY is captured at module load time (undefined in tests).
// NODE_ENV is read per-request so we can control auth behavior per test.
// ---------------------------------------------------------------------------

describe('POST /api/storefront/checkout — API key enforcement', () => {
  afterEach(() => {
    process.env.NODE_ENV = savedNodeEnv;
  });

  it('returns 401 in production mode when STOREFRONT_API_KEY is not configured', async () => {
    process.env.NODE_ENV = 'production';
    const app = buildApp();
    const res = await request(app)
      .post('/api/storefront/checkout')
      .send({ productId: 'test:product' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when productId is missing in dev mode', async () => {
    delete process.env.NODE_ENV;
    const app = buildApp();
    const res = await request(app)
      .post('/api/storefront/checkout')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/productId/i);
  });

  it('returns 404 when productId does not match any product in dev mode', async () => {
    delete process.env.NODE_ENV;
    const app = buildApp();
    const res = await request(app)
      .post('/api/storefront/checkout')
      .send({ productId: 'no-brand:no-product' });
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// POST /api/storefront/fulfill — HMAC signature verification
// arxmintProvider is mocked; we control verifyWebhook return value per test.
// ---------------------------------------------------------------------------

describe('POST /api/storefront/fulfill — HMAC signature verification', () => {
  const WEBHOOK_SECRET = 'test-secret-key';

  beforeEach(() => {
    arxmintProvider.webhookSecret = WEBHOOK_SECRET;
    arxmintProvider.verifyWebhook.mockReset();
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    arxmintProvider.webhookSecret = null;
  });

  it('rejects request with invalid HMAC signature — returns 401', async () => {
    arxmintProvider.verifyWebhook.mockReturnValue(false);
    const app = buildApp();
    const res = await request(app)
      .post('/api/storefront/fulfill')
      .set('Content-Type', 'application/json')
      .set('x-arxmint-signature', 'bad-signature-value')
      .send({ paymentProvider: 'arxmint', productId: 'test:prod' });
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('proceeds past signature check when HMAC is valid — not 401', async () => {
    arxmintProvider.verifyWebhook.mockReturnValue(true);
    const app = buildApp();
    const res = await request(app)
      .post('/api/storefront/fulfill')
      .set('Content-Type', 'application/json')
      .set('x-arxmint-signature', 'valid-hmac-sig')
      .send({ paymentProvider: 'arxmint', productId: 'nonexistent:prod' });
    // Signature accepted — product lookup returns 404, but NOT a 401
    expect(res.status).not.toBe(401);
  });

  it('returns 400 when paymentProvider field is missing (after valid sig)', async () => {
    arxmintProvider.verifyWebhook.mockReturnValue(true);
    const app = buildApp();
    const res = await request(app)
      .post('/api/storefront/fulfill')
      .set('Content-Type', 'application/json')
      .set('x-arxmint-signature', 'valid-hmac-sig')
      .send({ productId: 'test:prod' }); // missing paymentProvider
    expect(res.status).toBe(400);
  });

  it('calls verifyWebhook exactly once per request', async () => {
    arxmintProvider.verifyWebhook.mockReturnValue(false);
    const app = buildApp();
    await request(app)
      .post('/api/storefront/fulfill')
      .set('Content-Type', 'application/json')
      .set('x-arxmint-signature', 'any-sig')
      .send({ paymentProvider: 'arxmint' });
    expect(arxmintProvider.verifyWebhook).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// POST /api/storefront/fulfill — digital fulfillment happy path
// Uses a known product from teneo brand catalog (consciousness-revolution).
// ---------------------------------------------------------------------------

describe('POST /api/storefront/fulfill — digital fulfillment happy path', () => {
  const OrderService = require('../services/orderService');
  const emailService = require('../services/emailService');

  beforeEach(() => {
    arxmintProvider.webhookSecret = 'test-secret';
    arxmintProvider.verifyWebhook.mockReset();
    arxmintProvider.verifyWebhook.mockReturnValue(true);
    // Reset order service mock state
    const instance = OrderService.mock.results[0]?.value;
    if (instance) {
      instance.completeOrder.mockClear().mockResolvedValue({ downloadToken: 'tok-digital-789' });
      instance.updateOrderStatus.mockClear().mockResolvedValue({});
      instance.updateOrderState.mockClear().mockResolvedValue({});
      instance.createOrder.mockClear().mockResolvedValue({});
      instance.getOrder.mockClear().mockResolvedValue(null);
      instance.getOrderBySessionId.mockClear().mockResolvedValue(null);
    }
    emailService.sendDownloadEmail.mockClear();
  });

  afterEach(() => {
    arxmintProvider.webhookSecret = null;
  });

  it('returns 200 and triggers download email for a known digital product', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/storefront/fulfill')
      .set('Content-Type', 'application/json')
      .set('x-arxmint-signature', 'valid-sig')
      .send({
        paymentProvider: 'arxmint',
        productId: 'teneo:consciousness-revolution',
        customerEmail: 'buyer@test.com',
        status: 'paid',
      });

    // Product exists and is digital — should succeed
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.fulfillment).toBe('digital');
  });

  it('marks order as paid in DB and sends download link', async () => {
    const OrderService = require('../services/orderService');
    const instance = OrderService.mock.results[0]?.value;
    const app = buildApp();

    await request(app)
      .post('/api/storefront/fulfill')
      .set('Content-Type', 'application/json')
      .set('x-arxmint-signature', 'valid-sig')
      .send({
        paymentProvider: 'arxmint',
        productId: 'teneo:consciousness-revolution',
        customerEmail: 'buyer@test.com',
        status: 'paid',
      });

    expect(emailService.sendDownloadEmail).toHaveBeenCalledTimes(1);
    expect(emailService.sendDownloadEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        userEmail: 'buyer@test.com',
        downloadUrl: expect.stringContaining('tok-digital-789'),
      })
    );

    if (instance) {
      expect(instance.completeOrder).toHaveBeenCalledTimes(1);
    }
  });
});
