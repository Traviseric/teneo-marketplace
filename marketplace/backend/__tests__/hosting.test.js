'use strict';

/**
 * Tests for managed hosting tiers routes
 * Covers: tier listing, subscribe validation, webhook activation/deactivation
 */

const express = require('express');
const request = require('supertest');

const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

// ---------------------------------------------------------------------------
// Mock stripe
// ---------------------------------------------------------------------------

const mockSession = {
  id: 'cs_test_host_001',
  url: 'https://checkout.stripe.com/pay/cs_test_host_001',
};

jest.mock('stripe', () =>
  jest.fn(() => ({
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue(mockSession),
      },
    },
    webhooks: {
      constructEvent: jest.fn((body, sig) => {
        if (sig === 'bad-sig') throw new Error('Signature mismatch');
        return typeof body === 'string' ? JSON.parse(body) : body;
      }),
    },
  }))
);

// ---------------------------------------------------------------------------
// Mock SQLite database
// ---------------------------------------------------------------------------

const mockDb = {
  run: jest.fn(function (sql, params, cb) {
    if (typeof cb === 'function') cb.call({ lastID: 1, changes: 1 }, null);
  }),
};

jest.mock('../database/database', () => mockDb);

// ---------------------------------------------------------------------------
// Set env vars before requiring hostingTiers / routes
// ---------------------------------------------------------------------------

process.env.STRIPE_PRICE_STARTER = 'price_starter_test';
process.env.STRIPE_PRICE_PRO = 'price_pro_test';
process.env.STRIPE_PRICE_WHITELABEL = 'price_wl_test';

const hostingRouter = require('../routes/hostingRoutes');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/hosting', hostingRouter);
  return app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/hosting/tiers', () => {
  it('returns all 3 tiers', async () => {
    const res = await request(buildApp()).get('/api/hosting/tiers');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.tiers).toHaveLength(3);
    const ids = res.body.tiers.map((t) => t.id);
    expect(ids).toContain('starter');
    expect(ids).toContain('pro');
    expect(ids).toContain('whitelabel');
  });

  it('does not expose stripe_price_id in public response', async () => {
    const res = await request(buildApp()).get('/api/hosting/tiers');
    res.body.tiers.forEach((t) => {
      expect(t.stripe_price_id).toBeUndefined();
    });
  });
});

describe('POST /api/hosting/subscribe', () => {
  it('returns 400 when required fields missing', async () => {
    const res = await request(buildApp())
      .post('/api/hosting/subscribe')
      .send({ tierId: 'starter' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing/i);
  });

  it('returns 400 for invalid email', async () => {
    const res = await request(buildApp())
      .post('/api/hosting/subscribe')
      .send({ tierId: 'starter', customerEmail: 'not-valid' });
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown tier', async () => {
    const res = await request(buildApp())
      .post('/api/hosting/subscribe')
      .send({ tierId: 'enterprise', customerEmail: 'user@example.com' });
    expect(res.status).toBe(404);
  });

  it('creates Stripe checkout for starter tier', async () => {
    const res = await request(buildApp())
      .post('/api/hosting/subscribe')
      .send({ tierId: 'starter', customerEmail: 'user@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.url).toContain('checkout.stripe.com');
    expect(res.body.sessionId).toBe('cs_test_host_001');
  });

  it('creates Stripe checkout for pro tier', async () => {
    const res = await request(buildApp())
      .post('/api/hosting/subscribe')
      .send({ tierId: 'pro', customerEmail: 'pro@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('creates Stripe checkout for whitelabel tier', async () => {
    const res = await request(buildApp())
      .post('/api/hosting/subscribe')
      .send({ tierId: 'whitelabel', customerEmail: 'agency@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/hosting/webhook', () => {
  it('processes customer.subscription.created and creates store_build', async () => {
    const body = {
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_host_001',
          customer: 'cus_host_abc',
          status: 'active',
          metadata: { type: 'managed_hosting', tier_id: 'starter', customer_email: 'user@example.com' },
        },
      },
    };
    const res = await request(buildApp())
      .post('/api/hosting/webhook')
      .send(body);
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    expect(mockDb.run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO store_builds'),
      expect.any(Array),
      expect.any(Function)
    );
  });

  it('processes customer.subscription.deleted and suspends store_build', async () => {
    const body = {
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_host_001',
          metadata: { type: 'managed_hosting' },
        },
      },
    };
    mockDb.run.mockClear();
    const res = await request(buildApp())
      .post('/api/hosting/webhook')
      .send(body);
    expect(res.status).toBe(200);
    expect(mockDb.run).toHaveBeenCalledWith(
      expect.stringContaining("status = 'suspended'"),
      expect.any(Array),
      expect.any(Function)
    );
  });

  it('ignores events not tagged managed_hosting', async () => {
    const body = {
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_other_001',
          customer: 'cus_other',
          status: 'active',
          metadata: { type: 'membership_subscription' },
        },
      },
    };
    mockDb.run.mockClear();
    const res = await request(buildApp())
      .post('/api/hosting/webhook')
      .send(body);
    expect(res.status).toBe(200);
    // store_builds INSERT should NOT be called for non-hosting subscription
    const insertCalls = mockDb.run.mock.calls.filter((c) => c[0].includes('INSERT INTO store_builds'));
    expect(insertCalls).toHaveLength(0);
  });
});

afterAll(() => {
  consoleLogSpy.mockRestore();
});
