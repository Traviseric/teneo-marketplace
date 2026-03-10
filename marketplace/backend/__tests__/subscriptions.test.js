'use strict';

/**
 * Tests for membership subscriptions routes
 * Covers: tier listing, create-session validation, webhook events, admin CRUD
 */

const express = require('express');
const request = require('supertest');

const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

// ---------------------------------------------------------------------------
// Mock stripe before importing routes
// ---------------------------------------------------------------------------

const mockSession = {
  id: 'cs_test_sub_001',
  url: 'https://checkout.stripe.com/pay/cs_test_sub_001',
};

jest.mock('stripe', () =>
  jest.fn(() => ({
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue(mockSession),
      },
    },
    webhooks: {
      constructEvent: jest.fn((body, sig, secret) => {
        if (sig === 'bad-sig') throw new Error('Signature mismatch');
        return typeof body === 'string' ? JSON.parse(body) : body;
      }),
    },
  }))
);

// ---------------------------------------------------------------------------
// Mock SQLite database
// ---------------------------------------------------------------------------

const mockRows = [];
const mockDb = {
  get: jest.fn((sql, params, cb) => cb(null, mockRows[0] || null)),
  all: jest.fn((sql, params, cb) => cb(null, [
    { id: 'tier-1', name: 'Bronze', price_monthly: 9, features: '["Access"]', content_access: '[]' },
  ])),
  run: jest.fn(function (sql, params, cb) {
    if (typeof cb === 'function') cb.call({ lastID: 1, changes: 1 }, null);
  }),
};

jest.mock('../database/database', () => mockDb);

// ---------------------------------------------------------------------------
// Mock auth middleware
// ---------------------------------------------------------------------------

jest.mock('../middleware/auth', () => ({
  authenticateAdmin: (req, res, next) => next(),
}));

const subscriptionRouter = require('../routes/subscriptionRoutes');

// ---------------------------------------------------------------------------
// Test app
// ---------------------------------------------------------------------------

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/subscriptions', subscriptionRouter);
  return app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/subscriptions/tiers/:storeSlug', () => {
  it('returns tiers for a store', async () => {
    const res = await request(buildApp()).get('/api/subscriptions/tiers/my-store');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.tiers)).toBe(true);
    expect(res.body.tiers[0].features).toBeInstanceOf(Array);
  });
});

describe('POST /api/subscriptions/create-session', () => {
  beforeEach(() => {
    // Tier found with stripe_price_id
    mockDb.get.mockImplementation((sql, params, cb) =>
      cb(null, { id: 'tier-1', name: 'Bronze', price_monthly: 9, stripe_price_id: 'price_test_123', active: 1 })
    );
  });

  it('returns 400 when required fields missing', async () => {
    const res = await request(buildApp())
      .post('/api/subscriptions/create-session')
      .send({ tierId: 'tier-1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing/i);
  });

  it('returns 400 for invalid email', async () => {
    const res = await request(buildApp())
      .post('/api/subscriptions/create-session')
      .send({ tierId: 'tier-1', customerEmail: 'not-an-email', storeSlug: 'my-store' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  it('creates Stripe checkout session and returns url', async () => {
    const res = await request(buildApp())
      .post('/api/subscriptions/create-session')
      .send({ tierId: 'tier-1', customerEmail: 'user@example.com', storeSlug: 'my-store' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.url).toContain('checkout.stripe.com');
    expect(res.body.sessionId).toBe('cs_test_sub_001');
  });

  it('returns 404 when tier not found', async () => {
    mockDb.get.mockImplementationOnce((sql, params, cb) => cb(null, null));
    const res = await request(buildApp())
      .post('/api/subscriptions/create-session')
      .send({ tierId: 'bad-tier', customerEmail: 'user@example.com', storeSlug: 'my-store' });
    expect(res.status).toBe(404);
  });

  it('returns 422 when tier has no stripe_price_id', async () => {
    mockDb.get.mockImplementationOnce((sql, params, cb) =>
      cb(null, { id: 'tier-1', name: 'Bronze', price_monthly: 9, stripe_price_id: null, active: 1 })
    );
    const res = await request(buildApp())
      .post('/api/subscriptions/create-session')
      .send({ tierId: 'tier-1', customerEmail: 'user@example.com', storeSlug: 'my-store' });
    expect(res.status).toBe(422);
  });
});

describe('POST /api/subscriptions/webhook', () => {
  const webhookBody = {
    type: 'customer.subscription.created',
    data: {
      object: {
        id: 'sub_123',
        customer: 'cus_abc',
        status: 'active',
        current_period_end: 1800000000,
        metadata: {
          type: 'membership_subscription',
          customer_email: 'user@example.com',
          store_slug: 'my-store',
          tier_id: 'tier-1',
        },
      },
    },
  };

  it('returns 200 and received:true for subscription.created', async () => {
    // No webhook secret set in test, so raw body parsed directly
    const res = await request(buildApp())
      .post('/api/subscriptions/webhook')
      .send(webhookBody);
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
  });

  it('processes subscription.deleted event', async () => {
    const body = {
      type: 'customer.subscription.deleted',
      data: { object: { id: 'sub_123', metadata: {} } },
    };
    const res = await request(buildApp())
      .post('/api/subscriptions/webhook')
      .send(body);
    expect(res.status).toBe(200);
  });

  it('processes invoice.payment_failed event', async () => {
    const body = {
      type: 'invoice.payment_failed',
      data: { object: { subscription: 'sub_123' } },
    };
    const res = await request(buildApp())
      .post('/api/subscriptions/webhook')
      .send(body);
    expect(res.status).toBe(200);
  });
});

describe('Admin tier CRUD', () => {
  it('POST /admin/tiers creates a tier', async () => {
    const res = await request(buildApp())
      .post('/api/subscriptions/admin/tiers')
      .send({ storeSlug: 'my-store', name: 'Gold', price_monthly: 29, features: ['All access'] });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('POST /admin/tiers returns 400 when required fields missing', async () => {
    const res = await request(buildApp())
      .post('/api/subscriptions/admin/tiers')
      .send({ name: 'Gold' });
    expect(res.status).toBe(400);
  });

  it('PUT /admin/tiers/:id updates a tier', async () => {
    const res = await request(buildApp())
      .put('/api/subscriptions/admin/tiers/tier-1')
      .send({ price_monthly: 39 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('DELETE /admin/tiers/:id soft-deletes a tier', async () => {
    const res = await request(buildApp())
      .delete('/api/subscriptions/admin/tiers/tier-1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

afterAll(() => {
  consoleLogSpy.mockRestore();
});
