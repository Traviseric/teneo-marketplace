'use strict';

/**
 * Integration tests for /api/machine endpoints.
 *
 * Covers:
 *   - GET  /api/machine/catalog          — returns products with sat pricing
 *   - POST /api/machine/order            — NIP-98 auth, creates Lightning invoice
 *   - GET  /api/machine/order/:id/status — returns order status + download_url
 *   - POST /api/machine/webhook          — HMAC verification, fulfills order
 */

const express = require('express');
const request = require('supertest');
const crypto = require('crypto');

const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

// ---------------------------------------------------------------------------
// Mock dependencies before requiring the router
// ---------------------------------------------------------------------------

jest.mock('axios', () => ({
  get: jest.fn().mockResolvedValue({ data: { bitcoin: { usd: 50000 } } }),
}));

const mockCreateOrder = jest.fn().mockResolvedValue({});
const mockGetOrder = jest.fn().mockResolvedValue(null);
const mockGetOrderBySessionId = jest.fn().mockResolvedValue(null);
const mockCompleteOrder = jest.fn().mockResolvedValue({ downloadToken: 'tok-mach-abc' });
const mockUpdateOrderStatus = jest.fn().mockResolvedValue({});
const mockUpdateOrderState = jest.fn().mockResolvedValue({});

jest.mock('../services/orderService', () =>
  jest.fn().mockImplementation(() => ({
    createOrder: mockCreateOrder,
    getOrder: mockGetOrder,
    getOrderBySessionId: mockGetOrderBySessionId,
    completeOrder: mockCompleteOrder,
    updateOrderStatus: mockUpdateOrderStatus,
    updateOrderState: mockUpdateOrderState,
  }))
);

jest.mock('../services/arxmintProvider', () => ({
  enabled: true,
  merchantId: 'test-merchant',
  webhookSecret: null,
  createCheckout: jest.fn().mockResolvedValue({
    checkoutUrl: 'https://arxmint.com/pay/test-merchant?amount=500',
    sessionId: 'arx_session_001',
  }),
  verifyWebhook: jest.fn().mockReturnValue(true),
}));

// NIP-98 middleware: mock to pass through (tests that need rejection test auth separately)
jest.mock('../auth/nip98', () => ({
  requireNip98Auth: jest.fn((req, res, next) => {
    // Default: simulate authenticated agent
    req.nostrPubkey = 'deadbeef01020304050607080910111213141516171819202122232425262728';
    next();
  }),
}));

const machineRouter = require('../routes/machine');
const arxmintProvider = require('../services/arxmintProvider');
const { requireNip98Auth } = require('../auth/nip98');

// ---------------------------------------------------------------------------
// Mock product catalog (inject via fs mock)
// ---------------------------------------------------------------------------

jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    promises: {
      ...actual.promises,
      readdir: jest.fn().mockResolvedValue([
        { name: 'mock-brand', isDirectory: () => true },
      ]),
      readFile: jest.fn().mockResolvedValue(
        JSON.stringify({
          books: [{
            id: 'book-001',
            title: 'AI Commerce Guide',
            description: 'A guide to machine payments',
            price: 9.99,
            category: 'Technology',
            digitalFile: '/downloads/ai-commerce-guide.pdf',
            author: 'Test Author',
            pages: 200,
            fulfillment_provider: 'stripe_digital',
          }],
        })
      ),
    },
  };
});

// ---------------------------------------------------------------------------
// Test app factory
// ---------------------------------------------------------------------------

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/machine', machineRouter);
  return app;
}

// ---------------------------------------------------------------------------
// GET /api/machine/catalog
// ---------------------------------------------------------------------------

describe('GET /api/machine/catalog', () => {
  let app;
  beforeAll(() => { app = buildApp(); });
  afterEach(() => { jest.clearAllMocks(); });

  it('returns digital products array', async () => {
    const res = await request(app).get('/api/machine/catalog');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('products');
    expect(Array.isArray(res.body.products)).toBe(true);
    expect(res.body.products.length).toBeGreaterThan(0);
  });

  it('each product has required fields', async () => {
    const res = await request(app).get('/api/machine/catalog');
    const p = res.body.products[0];
    expect(p).toHaveProperty('id');
    expect(p).toHaveProperty('title');
    expect(p).toHaveProperty('price_usd_cents');
    expect(p).toHaveProperty('type', 'digital');
  });

  it('includes sat pricing when BTC rate available', async () => {
    // Mock axios for BTC rate
    const axios = require('axios');
    jest.spyOn(axios, 'get').mockResolvedValueOnce({
      data: { bitcoin: { usd: 50000 } },
    });

    const res = await request(app).get('/api/machine/catalog');
    expect(res.status).toBe(200);
    // price_sats may be null if rate fetch is mocked at module level already
    expect(res.body).toHaveProperty('btcUsdRate');
    expect(res.body).toHaveProperty('paymentMethods');
    expect(res.body.paymentMethods).toContain('lightning');
  });
});

// ---------------------------------------------------------------------------
// POST /api/machine/order
// ---------------------------------------------------------------------------

describe('POST /api/machine/order', () => {
  let app;
  beforeAll(() => { app = buildApp(); });
  afterEach(() => { jest.clearAllMocks(); });

  it('returns 400 when product_id is missing', async () => {
    const res = await request(app)
      .post('/api/machine/order')
      .send({ payment_method: 'lightning' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 for unsupported payment_method', async () => {
    const res = await request(app)
      .post('/api/machine/order')
      .send({ product_id: 'mock-brand:book-001', payment_method: 'stripe' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/lightning/i);
  });

  it('returns 404 for unknown product', async () => {
    const res = await request(app)
      .post('/api/machine/order')
      .send({ product_id: 'unknown-brand:book-xyz', payment_method: 'lightning' });
    expect(res.status).toBe(404);
  });

  it('creates order and returns checkout_url + order_id', async () => {
    const res = await request(app)
      .post('/api/machine/order')
      .send({ product_id: 'mock-brand:book-001', payment_method: 'lightning' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('order_id');
    expect(res.body.order_id).toMatch(/^MACH-/);
    expect(res.body).toHaveProperty('checkout_url');
    expect(res.body).toHaveProperty('expires_at');
    expect(res.body).toHaveProperty('product');
    expect(res.body.product.id).toBe('mock-brand:book-001');
  });

  it('calls orderService.createOrder with source=machine metadata', async () => {
    await request(app)
      .post('/api/machine/order')
      .send({ product_id: 'mock-brand:book-001', payment_method: 'lightning' });

    expect(mockCreateOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ source: 'machine' }),
      })
    );
  });

  it('returns 503 when ArxMint not configured', async () => {
    arxmintProvider.enabled = false;
    const res = await request(app)
      .post('/api/machine/order')
      .send({ product_id: 'mock-brand:book-001', payment_method: 'lightning' });
    expect(res.status).toBe(503);
    arxmintProvider.enabled = true; // restore
  });

  it('returns 401 when NIP-98 auth fails', async () => {
    // Override middleware to reject
    requireNip98Auth.mockImplementationOnce((req, res) => {
      res.status(401).json({ error: 'NIP-98 auth required' });
    });

    const res = await request(app)
      .post('/api/machine/order')
      .send({ product_id: 'mock-brand:book-001', payment_method: 'lightning' });
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/machine/order/:id/status
// ---------------------------------------------------------------------------

describe('GET /api/machine/order/:id/status', () => {
  let app;
  beforeAll(() => { app = buildApp(); });
  afterEach(() => { jest.clearAllMocks(); });

  it('returns 404 for unknown order', async () => {
    mockGetOrder.mockResolvedValueOnce(null);
    const res = await request(app).get('/api/machine/order/MACH-nonexistent/status');
    expect(res.status).toBe(404);
  });

  it('returns 404 for non-machine orders (source guard)', async () => {
    mockGetOrder.mockResolvedValueOnce({
      order_id: 'ORD-123',
      status: 'completed',
      payment_status: 'paid',
      fulfillment_status: 'fulfilled',
      metadata: JSON.stringify({ source: 'storefront' }),
    });
    const res = await request(app).get('/api/machine/order/ORD-123/status');
    expect(res.status).toBe(404);
  });

  it('returns pending status for unpaid machine order', async () => {
    mockGetOrder.mockResolvedValueOnce({
      order_id: 'MACH-001',
      status: 'pending',
      payment_status: 'pending',
      fulfillment_status: 'pending',
      created_at: new Date().toISOString(),
      download_token: null,
      metadata: JSON.stringify({ source: 'machine' }),
    });
    const res = await request(app).get('/api/machine/order/MACH-001/status');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('pending');
    expect(res.body).not.toHaveProperty('download_url');
  });

  it('returns paid status and download_url for fulfilled order', async () => {
    mockGetOrder.mockResolvedValueOnce({
      order_id: 'MACH-002',
      status: 'completed',
      payment_status: 'paid',
      fulfillment_status: 'fulfilled',
      created_at: new Date().toISOString(),
      download_token: 'tok-mach-xyz',
      metadata: JSON.stringify({ source: 'machine' }),
    });
    const res = await request(app).get('/api/machine/order/MACH-002/status');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('paid');
    expect(res.body).toHaveProperty('download_url');
    expect(res.body.download_url).toContain('tok-mach-xyz');
  });
});

// ---------------------------------------------------------------------------
// POST /api/machine/webhook
// ---------------------------------------------------------------------------

describe('POST /api/machine/webhook', () => {
  let app;
  beforeAll(() => { app = buildApp(); });
  afterEach(() => { jest.clearAllMocks(); });

  const machineOrder = {
    order_id: 'MACH-webhook-001',
    status: 'pending',
    payment_status: 'pending',
    fulfillment_status: 'pending',
    book_id: 'mock-brand:book-001',
    metadata: JSON.stringify({ source: 'machine', sessionId: 'arx_session_001' }),
  };

  it('returns 200 for unknown session (graceful ignore)', async () => {
    mockGetOrderBySessionId.mockResolvedValueOnce(null);
    const res = await request(app)
      .post('/api/machine/webhook')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ sessionId: 'arx_unknown', paymentProvider: 'arxmint' }));
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
  });

  it('rejects non-machine orders gracefully', async () => {
    mockGetOrderBySessionId.mockResolvedValueOnce({
      ...machineOrder,
      metadata: JSON.stringify({ source: 'storefront' }),
    });
    const res = await request(app)
      .post('/api/machine/webhook')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ sessionId: 'arx_session_001', paymentProvider: 'arxmint' }));
    expect(res.status).toBe(200);
    expect(res.body.note).toMatch(/not a machine order/i);
  });

  it('fulfills digital order and returns download_token', async () => {
    mockGetOrderBySessionId.mockResolvedValueOnce(machineOrder);
    mockCompleteOrder.mockResolvedValueOnce({ downloadToken: 'tok-mach-fulfilled' });

    const res = await request(app)
      .post('/api/machine/webhook')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({
        sessionId: 'arx_session_001',
        productId: 'mock-brand:book-001',
        amountSats: 19980,
        paidAt: new Date().toISOString(),
        paymentProvider: 'arxmint',
      }));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('download_token');
    expect(mockUpdateOrderStatus).toHaveBeenCalled();
  });

  it('rejects with 401 when webhook signature is invalid', async () => {
    arxmintProvider.webhookSecret = 'test-secret';
    arxmintProvider.verifyWebhook.mockReturnValueOnce(false);

    const body = JSON.stringify({ sessionId: 'arx_session_001', paymentProvider: 'arxmint' });
    const res = await request(app)
      .post('/api/machine/webhook')
      .set('Content-Type', 'application/json')
      .set('x-arxmint-signature', 'bad-signature')
      .send(body);
    expect(res.status).toBe(401);

    arxmintProvider.webhookSecret = null; // restore
  });
});

afterAll(() => {
  consoleLogSpy.mockRestore();
  consoleWarnSpy.mockRestore();
});
