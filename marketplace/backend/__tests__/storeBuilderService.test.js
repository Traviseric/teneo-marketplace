'use strict';

/**
 * Unit tests for storeBuilderService.js
 *
 * Tests: saveStore, saveProducts, getStoreBySlug, addSubscriber,
 *        listSubscribers, listStoresByUser, toSlug, uniqueSlug
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

const service = require('../services/storeBuilderService');

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// toSlug
// ---------------------------------------------------------------------------

describe('toSlug', () => {
  test('lowercases and replaces spaces with hyphens', () => {
    expect(service.toSlug('My Candle Shop')).toBe('my-candle-shop');
  });

  test('strips leading/trailing hyphens', () => {
    expect(service.toSlug('  hello  ')).toBe('hello');
  });

  test('collapses multiple special chars', () => {
    expect(service.toSlug('Foo & Bar!! Shop')).toBe('foo-bar-shop');
  });

  test('handles already-slugified string', () => {
    expect(service.toSlug('already-a-slug')).toBe('already-a-slug');
  });

  test('handles numeric names', () => {
    expect(service.toSlug('Store 42')).toBe('store-42');
  });
});

// ---------------------------------------------------------------------------
// uniqueSlug
// ---------------------------------------------------------------------------

describe('uniqueSlug', () => {
  test('returns base slug when not taken', async () => {
    mockDb.get.mockResolvedValueOnce(null);
    const slug = await service.uniqueSlug('my-store');
    expect(slug).toBe('my-store');
  });

  test('appends suffix when base slug is taken', async () => {
    mockDb.get.mockResolvedValueOnce({ id: 'existing' }); // slug exists
    const slug = await service.uniqueSlug('my-store');
    expect(slug).toMatch(/^my-store-[a-z0-9]{8}$/);
  });

  test('uses "store" as fallback for empty base', async () => {
    mockDb.get.mockResolvedValueOnce(null);
    const slug = await service.uniqueSlug('');
    expect(slug).toBe('store');
  });
});

// ---------------------------------------------------------------------------
// saveStore
// ---------------------------------------------------------------------------

describe('saveStore', () => {
  test('inserts a record and returns storeId, slug, url', async () => {
    mockDb.get.mockResolvedValueOnce(null); // uniqueSlug: not taken
    const result = await service.saveStore({ name: 'Eco Candles' }, '<html/>', 'user-1');

    expect(mockDb.run).toHaveBeenCalledTimes(1);
    const [sql, params] = mockDb.run.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO stores/);
    expect(params[2]).toMatch(/^eco-candles-/);  // slug
    expect(params[3]).toContain('Eco Candles');  // config JSON
    expect(params[4]).toBe('<html/>');            // html

    expect(result).toMatchObject({
      storeId: expect.any(String),
      slug: expect.stringMatching(/^eco-candles-/),
      url: expect.stringMatching(/^\/store\/eco-candles-/),
    });
  });

  test('throws when storeConfig.name is missing', async () => {
    await expect(service.saveStore({})).rejects.toThrow('storeConfig.name is required');
    await expect(service.saveStore(null)).rejects.toThrow('storeConfig.name is required');
  });

  test('uses provided slug override', async () => {
    const result = await service.saveStore({ name: 'Shop' }, null, null, 'custom-slug');
    const [, params] = mockDb.run.mock.calls[0];
    expect(params[2]).toBe('custom-slug');
    expect(result.slug).toBe('custom-slug');
  });

  test('returns url with /store/ prefix', async () => {
    mockDb.get.mockResolvedValueOnce(null);
    const { url } = await service.saveStore({ name: 'Test' }, null, 'u1');
    expect(url).toMatch(/^\/store\//);
  });
});

// ---------------------------------------------------------------------------
// saveProducts
// ---------------------------------------------------------------------------

describe('saveProducts', () => {
  test('inserts each valid product', async () => {
    const products = [
      { name: 'Widget A', price: 9.99, description: 'Great widget', type: 'physical' },
      { name: 'Widget B', price: 4.99 },
    ];
    const count = await service.saveProducts('store-1', products);
    expect(count).toBe(2);
    expect(mockDb.run).toHaveBeenCalledTimes(2);
  });

  test('skips products with missing name', async () => {
    const products = [{ price: 5 }, { name: 'Good', price: 3 }];
    const count = await service.saveProducts('store-1', products);
    expect(count).toBe(1);
  });

  test('skips products with null price', async () => {
    const products = [{ name: 'Incomplete' }];
    const count = await service.saveProducts('store-1', products);
    expect(count).toBe(0);
  });

  test('returns 0 for empty array', async () => {
    const count = await service.saveProducts('store-1', []);
    expect(count).toBe(0);
    expect(mockDb.run).not.toHaveBeenCalled();
  });

  test('defaults type to "digital"', async () => {
    await service.saveProducts('store-1', [{ name: 'eBook', price: 12 }]);
    const [, params] = mockDb.run.mock.calls[0];
    expect(params[5]).toBe('digital');
  });
});

// ---------------------------------------------------------------------------
// getStoreBySlug
// ---------------------------------------------------------------------------

describe('getStoreBySlug', () => {
  test('returns parsed store for published slug', async () => {
    const raw = { id: 's1', slug: 'my-shop', config: '{"name":"My Shop"}', html: '<h1/>', status: 'published', created_at: '2026-01-01' };
    mockDb.get.mockResolvedValueOnce(raw);

    const store = await service.getStoreBySlug('my-shop');
    expect(store).not.toBeNull();
    expect(store.config).toEqual({ name: 'My Shop' });
    expect(store.slug).toBe('my-shop');
  });

  test('returns null when store not found or not published', async () => {
    mockDb.get.mockResolvedValueOnce(null);
    const store = await service.getStoreBySlug('nonexistent');
    expect(store).toBeNull();
  });

  test('queries with published status filter', async () => {
    mockDb.get.mockResolvedValueOnce(null);
    await service.getStoreBySlug('test-slug');
    const [sql] = mockDb.get.mock.calls[0];
    expect(sql).toContain("status = 'published'");
  });
});

// ---------------------------------------------------------------------------
// listStoresByUser
// ---------------------------------------------------------------------------

describe('listStoresByUser', () => {
  test('queries stores by user_id', async () => {
    mockDb.all.mockResolvedValueOnce([{ id: 's1', slug: 'shop' }]);
    const stores = await service.listStoresByUser('user-1');
    expect(stores).toHaveLength(1);
    const [sql, params] = mockDb.all.mock.calls[0];
    expect(sql).toContain('WHERE user_id = ?');
    expect(params[0]).toBe('user-1');
  });
});

// ---------------------------------------------------------------------------
// addSubscriber
// ---------------------------------------------------------------------------

describe('addSubscriber', () => {
  test('inserts subscriber and returns id', async () => {
    const result = await service.addSubscriber('store-1', 'fan@example.com');
    expect(mockDb.run).toHaveBeenCalledTimes(1);
    const [sql, params] = mockDb.run.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO store_subscribers/);
    expect(params[2]).toBe('fan@example.com');
    expect(result).toHaveProperty('id');
  });

  test('lowercases and trims email', async () => {
    await service.addSubscriber('store-1', '  FAN@EXAMPLE.COM  ');
    const [, params] = mockDb.run.mock.calls[0];
    expect(params[2]).toBe('fan@example.com');
  });

  test('stores name and source options', async () => {
    await service.addSubscriber('store-1', 'a@b.com', { name: 'Alice', source: 'footer' });
    const [, params] = mockDb.run.mock.calls[0];
    expect(params[3]).toBe('Alice');
    expect(params[4]).toBe('footer');
  });

  test('handles duplicate gracefully and returns alreadySubscribed', async () => {
    mockDb.run.mockRejectedValueOnce(new Error('UNIQUE constraint failed'));
    mockDb.get.mockResolvedValueOnce({ id: 'existing-sub-id' });

    const result = await service.addSubscriber('store-1', 'dup@example.com');
    expect(result.alreadySubscribed).toBe(true);
    expect(result.id).toBe('existing-sub-id');
  });

  test('rethrows non-UNIQUE errors', async () => {
    mockDb.run.mockRejectedValueOnce(new Error('disk full'));
    await expect(service.addSubscriber('store-1', 'x@y.com')).rejects.toThrow('disk full');
  });
});

// ---------------------------------------------------------------------------
// listSubscribers
// ---------------------------------------------------------------------------

describe('listSubscribers', () => {
  test('returns subscriber list for store', async () => {
    const rows = [{ id: 'sub-1', email: 'a@b.com', name: null, source: 'storefront', status: 'active', created_at: '2026-01-01' }];
    mockDb.all.mockResolvedValueOnce(rows);

    const subscribers = await service.listSubscribers('store-1');
    expect(subscribers).toEqual(rows);
    const [sql, params] = mockDb.all.mock.calls[0];
    expect(sql).toContain('WHERE store_id = ?');
    expect(params[0]).toBe('store-1');
  });

  test('returns empty array when no subscribers', async () => {
    mockDb.all.mockResolvedValueOnce([]);
    const subscribers = await service.listSubscribers('store-empty');
    expect(subscribers).toEqual([]);
  });
});
