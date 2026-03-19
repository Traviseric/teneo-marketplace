'use strict';

/**
 * Unit tests for storeBuildService.js — artifact capture and QA checklist.
 *
 * Tests: runQaChecklist, recordDeliveryArtifacts, getBuild (JSON parsing of artifact fields)
 */

// ---------------------------------------------------------------------------
// DB mock
// ---------------------------------------------------------------------------

const mockDb = {
  run: jest.fn().mockResolvedValue({}),
  get: jest.fn().mockResolvedValue(null),
  all: jest.fn().mockResolvedValue([]),
};

jest.mock('../database/database', () => mockDb);

// ---------------------------------------------------------------------------
// Subject under test
// ---------------------------------------------------------------------------

const service = require('../services/storeBuildService');

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// runQaChecklist
// ---------------------------------------------------------------------------

describe('runQaChecklist', () => {
  test('returns all true for a complete config', async () => {
    const config = {
      name: 'Eco Candles',
      tagline: 'Light naturally',
      commerce: {
        payment_provider: 'stripe',
        products: [{ name: 'Candle A', price: 12 }],
      },
      modules: { email_capture: true },
    };

    const result = await service.runQaChecklist('eco-candles', config);

    expect(result.has_checkout).toBe(true);
    expect(result.has_products).toBe(true);
    expect(result.has_delivery_url).toBe(true);
    expect(result.has_email_capture).toBe(true);
    expect(result.config_valid).toBe(true);
    expect(result.checked_at).toBeTruthy();
  });

  test('returns false flags for a minimal/incomplete config', async () => {
    const result = await service.runQaChecklist('', {});

    expect(result.has_checkout).toBe(false);
    expect(result.has_products).toBe(false);
    expect(result.has_delivery_url).toBe(false);
    expect(result.has_email_capture).toBe(false);
    expect(result.config_valid).toBe(false);
  });

  test('has_products is false when products array is empty', async () => {
    const config = {
      name: 'Shop',
      tagline: 'Shop tagline',
      commerce: { payment_provider: 'stripe', products: [] },
    };
    const result = await service.runQaChecklist('shop', config);
    expect(result.has_products).toBe(false);
  });

  test('returns checked_at ISO timestamp', async () => {
    const result = await service.runQaChecklist('slug', { name: 'X', tagline: 'Y', commerce: {} });
    expect(result.checked_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ---------------------------------------------------------------------------
// recordDeliveryArtifacts
// ---------------------------------------------------------------------------

describe('recordDeliveryArtifacts', () => {
  test('updates all artifact columns and sets status=delivered', async () => {
    const config = {
      name: 'My Shop',
      tagline: 'Best shop',
      commerce: { payment_provider: 'stripe', products: [{ name: 'Widget', price: 9 }] },
    };
    const qaResults = { has_checkout: true, has_products: true, checked_at: '2026-03-18T00:00:00Z' };

    await service.recordDeliveryArtifacts('build-123', {
      config,
      deliveryUrl: '/store/my-shop',
      qaResults,
    });

    expect(mockDb.run).toHaveBeenCalledTimes(1);
    const [sql, params] = mockDb.run.mock.calls[0];

    expect(sql).toContain('rendered_config');
    expect(sql).toContain('delivery_url');
    expect(sql).toContain('qa_results');
    expect(sql).toContain('artifact_summary');
    expect(sql).toContain("status = 'delivered'");

    // params order: rendered_config, delivery_url, qa_results, artifact_summary, buildId
    expect(JSON.parse(params[0])).toMatchObject({ name: 'My Shop' });
    expect(params[1]).toBe('/store/my-shop');
    expect(JSON.parse(params[2])).toMatchObject({ has_checkout: true });

    const summary = JSON.parse(params[3]);
    expect(summary.product_count).toBe(1);
    expect(summary.renderer_version).toBe('1.0');
    expect(summary.captured_at).toBeTruthy();

    expect(params[4]).toBe('build-123');
  });

  test('artifact_summary product_count is 0 when no products', async () => {
    await service.recordDeliveryArtifacts('build-456', {
      config: { name: 'Empty', tagline: 'None', commerce: {} },
      deliveryUrl: '/store/empty',
      qaResults: {},
    });

    const [, params] = mockDb.run.mock.calls[0];
    const summary = JSON.parse(params[3]);
    expect(summary.product_count).toBe(0);
  });

  test('artifact_summary product_count reflects product array length', async () => {
    const config = {
      commerce: { products: [{ name: 'A' }, { name: 'B' }, { name: 'C' }] },
    };
    await service.recordDeliveryArtifacts('build-789', {
      config,
      deliveryUrl: '/store/abc',
      qaResults: {},
    });

    const [, params] = mockDb.run.mock.calls[0];
    const summary = JSON.parse(params[3]);
    expect(summary.product_count).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// getBuild — parses artifact JSON fields
// ---------------------------------------------------------------------------

describe('getBuild artifact field parsing', () => {
  test('parses rendered_config, qa_results, artifact_summary from JSON strings', async () => {
    const config = { name: 'Store' };
    const qa = { has_checkout: true };
    const summary = { product_count: 2, renderer_version: '1.0' };

    mockDb.get.mockResolvedValueOnce({
      id: 'build-1',
      status: 'delivered',
      intake_payload: '{"brief":"test"}',
      rendered_config: JSON.stringify(config),
      delivery_url: '/store/store',
      qa_results: JSON.stringify(qa),
      artifact_summary: JSON.stringify(summary),
    });

    const build = await service.getBuild('build-1');

    expect(build.rendered_config).toEqual(config);
    expect(build.qa_results).toEqual(qa);
    expect(build.artifact_summary).toEqual(summary);
    expect(build.intake_payload).toEqual({ brief: 'test' });
  });

  test('leaves null artifact fields as null', async () => {
    mockDb.get.mockResolvedValueOnce({
      id: 'build-2',
      status: 'planning',
      intake_payload: '{}',
      rendered_config: null,
      delivery_url: null,
      qa_results: null,
      artifact_summary: null,
    });

    const build = await service.getBuild('build-2');
    expect(build.rendered_config).toBeNull();
    expect(build.qa_results).toBeNull();
    expect(build.artifact_summary).toBeNull();
  });
});
