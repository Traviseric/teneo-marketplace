'use strict';

// ── Mock Anthropic SDK before requiring the service ──────────────────────────
const mockCreate = jest.fn();
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  }));
});

const {
  buildStoreFromBrief,
  parseEditIntent,
  deepMerge,
  validateStoreConfig,
  filterPatch,
} = require('../services/aiStoreBuilderService');

// ── deepMerge (pure function — no mocks) ─────────────────────────────────────
describe('deepMerge', () => {
  test('merges top-level primitives', () => {
    expect(deepMerge({ a: 1, b: 2 }, { b: 3 })).toEqual({ a: 1, b: 3 });
  });

  test('replaces arrays entirely', () => {
    expect(deepMerge({ arr: [1, 2] }, { arr: [3] })).toEqual({ arr: [3] });
  });

  test('deep-merges nested objects', () => {
    const result = deepMerge(
      { palette: { primary: '#fff', accent: '#000' } },
      { palette: { primary: '#123' } }
    );
    expect(result.palette).toEqual({ primary: '#123', accent: '#000' });
  });

  test('leaves target unchanged when patch is empty', () => {
    const target = { name: 'Shop', tagline: 'hello' };
    expect(deepMerge(target, {})).toEqual(target);
  });
});

// ── validateStoreConfig ───────────────────────────────────────────────────────
describe('validateStoreConfig', () => {
  const validConfig = {
    name: 'My Shop',
    tagline: 'Best shop',
    commerce: { fulfillment_type: 'digital', payment_provider: 'stripe' },
  };

  test('passes valid config through unchanged', () => {
    const result = validateStoreConfig({ ...validConfig, commerce: { ...validConfig.commerce } });
    expect(result.name).toBe('My Shop');
    expect(result.commerce.fulfillment_type).toBe('digital');
  });

  test('throws when name is missing', () => {
    const { name, ...noName } = validConfig;
    expect(() => validateStoreConfig(noName)).toThrow(/missing required field: name/i);
  });

  test('throws when tagline is missing', () => {
    const { tagline, ...noTagline } = validConfig;
    expect(() => validateStoreConfig(noTagline)).toThrow(/missing required field: tagline/i);
  });

  test('throws when commerce is missing', () => {
    const { commerce, ...noCommerce } = validConfig;
    expect(() => validateStoreConfig(noCommerce)).toThrow(/missing required field: commerce/i);
  });

  test('coerces invalid fulfillment_type to digital', () => {
    const config = { ...validConfig, commerce: { fulfillment_type: 'hybrid', payment_provider: 'stripe' } };
    const result = validateStoreConfig(config);
    expect(result.commerce.fulfillment_type).toBe('digital');
  });

  test('coerces invalid payment_provider to stripe', () => {
    const config = { ...validConfig, commerce: { fulfillment_type: 'digital', payment_provider: 'paypal' } };
    const result = validateStoreConfig(config);
    expect(result.commerce.payment_provider).toBe('stripe');
  });

  test('filters out products missing name or price', () => {
    const config = {
      ...validConfig,
      commerce: {
        ...validConfig.commerce,
        products: [
          { name: 'Good Product', price: 10 },
          { name: 'No Price' },
          { price: 5 },
          null,
        ],
      },
    };
    const result = validateStoreConfig(config);
    expect(result.commerce.products).toHaveLength(1);
    expect(result.commerce.products[0].name).toBe('Good Product');
  });

  test('coerces product price to number', () => {
    const config = {
      ...validConfig,
      commerce: {
        ...validConfig.commerce,
        products: [{ name: 'Product', price: '29.99' }],
      },
    };
    const result = validateStoreConfig(config);
    expect(result.commerce.products[0].price).toBe(29.99);
  });

  test('coerces invalid product type to ebook', () => {
    const config = {
      ...validConfig,
      commerce: {
        ...validConfig.commerce,
        products: [{ name: 'P', price: 5, type: 'widget' }],
      },
    };
    const result = validateStoreConfig(config);
    expect(result.commerce.products[0].type).toBe('ebook');
  });
});

// ── filterPatch ───────────────────────────────────────────────────────────────
describe('filterPatch', () => {
  test('keeps known top-level keys', () => {
    const patch = { name: 'New Name', tagline: 'New tagline', palette: { primary: '#000' } };
    expect(filterPatch(patch)).toEqual(patch);
  });

  test('strips unknown keys', () => {
    const patch = { name: 'Good', deleteAll: true, unknown_field: 123 };
    const result = filterPatch(patch);
    expect(result.name).toBe('Good');
    expect(result.deleteAll).toBeUndefined();
    expect(result.unknown_field).toBeUndefined();
  });

  test('returns empty object when no valid keys', () => {
    expect(filterPatch({ hack: true, drop_table: 'users' })).toEqual({});
  });
});

// ── buildStoreFromBrief ───────────────────────────────────────────────────────
describe('buildStoreFromBrief', () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    mockCreate.mockReset();
  });

  const validConfig = {
    name: 'My Candle Shop',
    tagline: 'Handmade with love',
    commerce: { fulfillment_type: 'digital', payment_provider: 'stripe' },
  };

  test('returns parsed config for a valid AI response', async () => {
    mockCreate.mockResolvedValue({
      content: [{ text: JSON.stringify(validConfig) }],
    });
    const result = await buildStoreFromBrief('I sell soy candles online');
    expect(result.name).toBe('My Candle Shop');
    expect(result.commerce.fulfillment_type).toBe('digital');
  });

  test('throws when AI returns no JSON', async () => {
    mockCreate.mockResolvedValue({ content: [{ text: 'Sorry, I cannot help.' }] });
    await expect(buildStoreFromBrief('test brief')).rejects.toThrow('No JSON found');
  });

  test('throws when required field is missing', async () => {
    const noName = { tagline: 'hi', commerce: { fulfillment_type: 'digital', payment_provider: 'stripe' } };
    mockCreate.mockResolvedValue({ content: [{ text: JSON.stringify(noName) }] });
    await expect(buildStoreFromBrief('test brief')).rejects.toThrow(/missing required field: name/i);
  });

  test('coerces invalid fulfillment_type to digital', async () => {
    const badEnum = { ...validConfig, commerce: { ...validConfig.commerce, fulfillment_type: 'hybrid' } };
    mockCreate.mockResolvedValue({ content: [{ text: JSON.stringify(badEnum) }] });
    const result = await buildStoreFromBrief('test brief');
    expect(result.commerce.fulfillment_type).toBe('digital');
  });

  test('throws when ANTHROPIC_API_KEY is missing', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    await expect(buildStoreFromBrief('brief')).rejects.toThrow('ANTHROPIC_API_KEY');
  });
});

// ── parseEditIntent ───────────────────────────────────────────────────────────
describe('parseEditIntent', () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    mockCreate.mockReset();
  });

  test('returns parsed patch for valid AI response', async () => {
    mockCreate.mockResolvedValue({ content: [{ text: '{"tagline": "New tagline"}' }] });
    const patch = await parseEditIntent('change tagline', { name: 'Shop', tagline: 'old' });
    expect(patch.tagline).toBe('New tagline');
  });

  test('strips unknown keys from patch', async () => {
    const badPatch = '{"name": "Good", "deleteAll": true, "unknown_field": 123}';
    mockCreate.mockResolvedValue({ content: [{ text: badPatch }] });
    const patch = await parseEditIntent('change name', {});
    expect(patch.name).toBe('Good');
    expect(patch.deleteAll).toBeUndefined();
    expect(patch.unknown_field).toBeUndefined();
  });

  test('throws when AI returns no JSON', async () => {
    mockCreate.mockResolvedValue({ content: [{ text: 'Cannot parse that.' }] });
    await expect(parseEditIntent('do something', {})).rejects.toThrow('No JSON patch found');
  });
});
