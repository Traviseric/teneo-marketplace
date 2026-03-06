'use strict';

/**
 * Tests for POST /api/store-builder/intake (task 043)
 * and store_builds CRUD routes (task 042).
 */

const express = require('express');
const request = require('supertest');

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('../services/storeBuildService', () => ({
  createBuild: jest.fn().mockResolvedValue('build-abc-123'),
  getBuild: jest.fn().mockResolvedValue({
    id: 'build-abc-123',
    status: 'intake',
    tier: 'builder',
    created_at: '2026-03-06T00:00:00',
    updated_at: '2026-03-06T00:00:00',
    delivered_at: null,
    intake_payload: {},
    operator_notes: null,
    error_message: null,
  }),
  updateStatus: jest.fn().mockResolvedValue(undefined),
  listBuilds: jest.fn().mockResolvedValue([]),
  VALID_STATUSES: ['intake', 'planning', 'building', 'qa', 'delivered', 'failed'],
}));

jest.mock('../services/aiStoreBuilderService', () => ({
  buildStoreFromBrief: jest.fn().mockResolvedValue({ name: 'Test Store' }),
  parseEditIntent: jest.fn().mockResolvedValue({}),
  deepMerge: jest.fn((a, b) => ({ ...a, ...b })),
}));

jest.mock('../services/storeRendererService', () => ({
  renderStorePage: jest.fn().mockReturnValue('<html>store</html>'),
}));

jest.mock('../services/emailService', () =>
  jest.fn().mockImplementation(() => ({
    sendEmail: jest.fn().mockResolvedValue({ success: true }),
  }))
);

jest.mock('../database/database', () => ({
  run: jest.fn().mockResolvedValue({}),
  get: jest.fn().mockResolvedValue(null),
  all: jest.fn().mockResolvedValue([]),
}));

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------

function buildApp() {
  const app = express();
  app.use(express.json());

  // Minimal session mock for requireAuth + authenticateAdmin
  app.use((req, res, next) => {
    req.session = { isAuthenticated: true, userId: 'user-1' };
    next();
  });

  // Mock authenticateAdmin: pass through in test
  jest.mock('../middleware/auth', () => ({
    authenticateAdmin: (req, res, next) => next(),
  }), { virtual: false });

  app.use('/api/store-builder', require('../routes/storeBuilder'));
  return app;
}

// ---------------------------------------------------------------------------
// Tests — POST /api/store-builder/intake
// ---------------------------------------------------------------------------

describe('POST /api/store-builder/intake', () => {
  let app;
  let storeBuildService;

  beforeAll(() => {
    app = buildApp();
    storeBuildService = require('../services/storeBuildService');
  });

  const validPayload = {
    business_brief: 'We sell handmade soy candles with earthy and botanical scents, targeting eco-conscious buyers.',
    contact_email: 'founder@example.com',
    tier: 'builder',
  };

  test('returns 201 with build_id on valid payload', async () => {
    const res = await request(app)
      .post('/api/store-builder/intake')
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.build_id).toBe('build-abc-123');
    expect(res.body.status).toBe('intake');
    expect(res.body.estimated_delivery).toBe('48h');
  });

  test('calls storeBuildService.createBuild with correct tier', async () => {
    storeBuildService.createBuild.mockClear();
    await request(app).post('/api/store-builder/intake').send(validPayload);
    expect(storeBuildService.createBuild).toHaveBeenCalledWith(
      expect.objectContaining({ contact_email: 'founder@example.com', tier: 'builder' }),
      'builder'
    );
  });

  test('returns 400 when business_brief is missing', async () => {
    const res = await request(app)
      .post('/api/store-builder/intake')
      .send({ contact_email: 'a@b.com', tier: 'builder' });

    expect(res.status).toBe(400);
    expect(res.body.fields.business_brief).toBeDefined();
  });

  test('returns 400 when business_brief is too short', async () => {
    const res = await request(app)
      .post('/api/store-builder/intake')
      .send({ ...validPayload, business_brief: 'too short' });

    expect(res.status).toBe(400);
    expect(res.body.fields.business_brief).toMatch(/50/);
  });

  test('returns 400 when contact_email is missing', async () => {
    const res = await request(app)
      .post('/api/store-builder/intake')
      .send({ business_brief: validPayload.business_brief, tier: 'builder' });

    expect(res.status).toBe(400);
    expect(res.body.fields.contact_email).toBeDefined();
  });

  test('returns 400 when contact_email is invalid', async () => {
    const res = await request(app)
      .post('/api/store-builder/intake')
      .send({ ...validPayload, contact_email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.fields.contact_email).toMatch(/valid email/i);
  });

  test('returns 400 when tier is missing', async () => {
    const res = await request(app)
      .post('/api/store-builder/intake')
      .send({ business_brief: validPayload.business_brief, contact_email: 'a@b.com' });

    expect(res.status).toBe(400);
    expect(res.body.fields.tier).toBeDefined();
  });

  test('returns 400 when tier is invalid', async () => {
    const res = await request(app)
      .post('/api/store-builder/intake')
      .send({ ...validPayload, tier: 'invalid_tier' });

    expect(res.status).toBe(400);
    expect(res.body.fields.tier).toMatch(/builder/);
  });

  test('returns 400 with multiple field errors at once', async () => {
    const res = await request(app)
      .post('/api/store-builder/intake')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.fields.business_brief).toBeDefined();
    expect(res.body.fields.contact_email).toBeDefined();
    expect(res.body.fields.tier).toBeDefined();
  });

  test('accepts all valid tiers', async () => {
    for (const tier of ['builder', 'pro', 'white_label']) {
      const res = await request(app)
        .post('/api/store-builder/intake')
        .send({ ...validPayload, tier });
      expect(res.status).toBe(201);
    }
  });

  test('accepts optional fields without error', async () => {
    const res = await request(app)
      .post('/api/store-builder/intake')
      .send({
        ...validPayload,
        contact_name: 'Jane',
        website_url: 'https://example.com',
        notes: 'Please prioritize mobile layout',
      });
    expect(res.status).toBe(201);
  });
});

// ---------------------------------------------------------------------------
// Tests — GET /api/store-builder/builds/:id
// ---------------------------------------------------------------------------

describe('GET /api/store-builder/builds/:id', () => {
  let app;
  let storeBuildService;

  beforeAll(() => {
    app = buildApp();
    storeBuildService = require('../services/storeBuildService');
  });

  test('returns safe build subset for existing build', async () => {
    const res = await request(app).get('/api/store-builder/builds/build-abc-123');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.build).toHaveProperty('id');
    expect(res.body.build).toHaveProperty('status');
    // Should NOT expose intake_payload or operator_notes to unauthenticated caller
    expect(res.body.build.intake_payload).toBeUndefined();
    expect(res.body.build.operator_notes).toBeUndefined();
  });

  test('returns 404 for missing build', async () => {
    storeBuildService.getBuild.mockResolvedValueOnce(null);
    const res = await request(app).get('/api/store-builder/builds/nonexistent');
    expect(res.status).toBe(404);
  });
});
