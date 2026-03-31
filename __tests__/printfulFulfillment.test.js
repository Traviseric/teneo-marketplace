/**
 * Unit tests for multi-tenant Printful fulfillment provider.
 * Tests credential encryption, DB storage, webhook parsing, and per-merchant routing.
 */

const sqlite3 = require('sqlite3').verbose();

// Set encryption key before requiring modules
process.env.FULFILLMENT_ENCRYPTION_KEY = 'a]b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';

const { encrypt, decrypt, encryptCredentials, decryptCredentials } = require('../marketplace/backend/services/credentialEncryption');

// ─── Credential Encryption ──────────────────────────────

describe('Credential Encryption', () => {
  test('encrypt/decrypt round-trip', () => {
    const plain = 'my-secret-printful-api-key';
    const encrypted = encrypt(plain);
    expect(encrypted).not.toEqual(plain);
    expect(decrypt(encrypted)).toBe(plain);
  });

  test('different encryptions of same plaintext produce different ciphertexts', () => {
    const plain = 'same-key';
    const a = encrypt(plain);
    const b = encrypt(plain);
    expect(a).not.toEqual(b); // random IV
    expect(decrypt(a)).toBe(plain);
    expect(decrypt(b)).toBe(plain);
  });

  test('encryptCredentials/decryptCredentials round-trip', () => {
    const creds = { apiKey: 'pk_test_abc123', storeId: '17809413', webhookSecret: 'whsec_xyz' };
    const json = encryptCredentials(creds);
    const parsed = JSON.parse(json);

    // apiKey should be encrypted, storeId should be cleartext
    expect(parsed.apiKey_encrypted).toBeDefined();
    expect(parsed.storeId).toBe('17809413');
    expect(parsed.webhookSecret).toBeDefined();
    expect(parsed.webhookSecret).not.toBe('whsec_xyz'); // encrypted

    const decrypted = decryptCredentials(json);
    expect(decrypted.apiKey).toBe('pk_test_abc123');
    expect(decrypted.storeId).toBe('17809413');
    expect(decrypted.webhookSecret).toBe('whsec_xyz');
  });

  test('encryptCredentials without webhookSecret stores null', () => {
    const json = encryptCredentials({ apiKey: 'key123' });
    const parsed = JSON.parse(json);
    expect(parsed.webhookSecret).toBeNull();

    const decrypted = decryptCredentials(json);
    expect(decrypted.apiKey).toBe('key123');
    expect(decrypted.webhookSecret).toBeNull();
  });

  test('throws without FULFILLMENT_ENCRYPTION_KEY', () => {
    const saved = process.env.FULFILLMENT_ENCRYPTION_KEY;
    delete process.env.FULFILLMENT_ENCRYPTION_KEY;

    // Need to bypass the module cache to test the throw
    expect(() => {
      // Call the internal getKey indirectly via encrypt
      const fresh = require('../marketplace/backend/services/credentialEncryption');
      fresh.encrypt('test');
    }).toThrow('FULFILLMENT_ENCRYPTION_KEY');

    process.env.FULFILLMENT_ENCRYPTION_KEY = saved;
  });
});

// ─── Webhook Event Parsing ──────────────────────────────

// Mock axios (ESM module) before requiring the provider
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  delete: jest.fn(),
}));

describe('Printful Webhook Parsing', () => {
  let provider;

  beforeAll(() => {
    process.env.DATABASE_PATH = ':memory:';
    provider = require('../marketplace/backend/services/printfulFulfillmentProvider');
  });

  test('parses package_shipped event', () => {
    const event = provider.parseWebhookEvent({
      id: 'evt_123',
      type: 'package_shipped',
      data: {
        external_id: 'order_abc',
        order_id: 12345,
        shipment: {
          tracking_number: '1Z999AA10123456784',
          tracking_url: 'https://ups.com/track/1Z999AA10123456784',
          carrier: 'UPS',
        },
      },
    });

    expect(event).not.toBeNull();
    expect(event.eventId).toBe('evt_123');
    expect(event.type).toBe('package_shipped');
    expect(event.status).toBe('shipped');
    expect(event.externalOrderId).toBe('order_abc');
    expect(event.providerOrderId).toBe(12345);
    expect(event.trackingNumber).toBe('1Z999AA10123456784');
    expect(event.trackingUrl).toBe('https://ups.com/track/1Z999AA10123456784');
    expect(event.carrier).toBe('UPS');
  });

  test('parses order_failed event', () => {
    const event = provider.parseWebhookEvent({
      type: 'order_failed',
      data: { external_id: 'order_xyz', order_id: 999 },
    });

    expect(event.status).toBe('failed');
    expect(event.externalOrderId).toBe('order_xyz');
  });

  test('parses order_canceled event', () => {
    const event = provider.parseWebhookEvent({ type: 'order_canceled', data: {} });
    expect(event.status).toBe('canceled');
  });

  test('returns null for invalid payload', () => {
    expect(provider.parseWebhookEvent(null)).toBeNull();
    expect(provider.parseWebhookEvent(undefined)).toBeNull();
    expect(provider.parseWebhookEvent('string')).toBeNull();
  });
});

// ─── DB Schema ──────────────────────────────────────────

describe('Fulfillment DB Tables', () => {
  let db;

  beforeAll((done) => {
    db = new sqlite3.Database(':memory:', (err) => {
      if (err) return done(err);
      db.exec(`
        CREATE TABLE IF NOT EXISTS merchant_fulfillment_providers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            merchant_id TEXT NOT NULL,
            provider TEXT NOT NULL,
            credentials_encrypted TEXT NOT NULL,
            is_active BOOLEAN DEFAULT 1,
            connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_sync_at DATETIME,
            product_count INTEGER DEFAULT 0
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_mfp_merchant_provider
            ON merchant_fulfillment_providers(merchant_id, provider);

        CREATE TABLE IF NOT EXISTS fulfillment_products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            merchant_id TEXT NOT NULL,
            provider TEXT NOT NULL,
            external_product_id TEXT NOT NULL,
            name TEXT NOT NULL,
            thumbnail_url TEXT,
            retail_price DECIMAL(10,2),
            retail_price_sats INTEGER,
            is_active BOOLEAN DEFAULT 1,
            synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            variants TEXT NOT NULL DEFAULT '[]'
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_fp_merchant_provider_ext
            ON fulfillment_products(merchant_id, provider, external_product_id);

        CREATE TABLE IF NOT EXISTS fulfillment_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            merchant_id TEXT NOT NULL,
            provider TEXT NOT NULL,
            order_id TEXT NOT NULL,
            external_order_id TEXT,
            status TEXT DEFAULT 'pending',
            tracking_number TEXT,
            tracking_url TEXT,
            carrier TEXT,
            recipient TEXT NOT NULL,
            items TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `, done);
    });
  });

  afterAll((done) => {
    db.close(done);
  });

  test('can insert and retrieve merchant provider connection', (done) => {
    const encJson = encryptCredentials({ apiKey: 'test_key', storeId: '12345' });
    db.run(
      'INSERT INTO merchant_fulfillment_providers (merchant_id, provider, credentials_encrypted) VALUES (?, ?, ?)',
      ['merchant_001', 'printful', encJson],
      function (err) {
        expect(err).toBeNull();
        expect(this.lastID).toBeGreaterThan(0);

        db.get(
          'SELECT * FROM merchant_fulfillment_providers WHERE merchant_id = ?',
          ['merchant_001'],
          (err2, row) => {
            expect(err2).toBeNull();
            expect(row.provider).toBe('printful');
            expect(row.is_active).toBe(1);

            const creds = decryptCredentials(row.credentials_encrypted);
            expect(creds.apiKey).toBe('test_key');
            expect(creds.storeId).toBe('12345');
            done();
          },
        );
      },
    );
  });

  test('unique constraint prevents duplicate merchant+provider', (done) => {
    const encJson = encryptCredentials({ apiKey: 'another_key', storeId: '99999' });
    db.run(
      'INSERT INTO merchant_fulfillment_providers (merchant_id, provider, credentials_encrypted) VALUES (?, ?, ?)',
      ['merchant_001', 'printful', encJson],
      (err) => {
        expect(err).not.toBeNull();
        expect(err.message).toMatch(/UNIQUE/);
        done();
      },
    );
  });

  test('can insert fulfillment product with variants', (done) => {
    const variants = JSON.stringify([
      { id: 1, name: 'S / Black', price: '24.99', external_variant_id: 100 },
      { id: 2, name: 'M / Black', price: '24.99', external_variant_id: 101 },
    ]);
    db.run(
      'INSERT INTO fulfillment_products (merchant_id, provider, external_product_id, name, variants) VALUES (?, ?, ?, ?, ?)',
      ['merchant_001', 'printful', 'prod_123', 'Test T-Shirt', variants],
      function (err) {
        expect(err).toBeNull();

        db.get('SELECT * FROM fulfillment_products WHERE external_product_id = ?', ['prod_123'], (err2, row) => {
          expect(err2).toBeNull();
          expect(row.name).toBe('Test T-Shirt');
          const parsed = JSON.parse(row.variants);
          expect(parsed).toHaveLength(2);
          expect(parsed[0].name).toBe('S / Black');
          done();
        });
      },
    );
  });

  test('can insert and query fulfillment order', (done) => {
    const recipient = JSON.stringify({ name: 'John Doe', address1: '123 Main St', city: 'NYC', country_code: 'US', zip: '10001' });
    const items = JSON.stringify([{ sync_variant_id: 100, quantity: 2 }]);

    db.run(
      'INSERT INTO fulfillment_orders (merchant_id, provider, order_id, external_order_id, status, recipient, items) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['merchant_001', 'printful', 'ob_order_456', 'pf_789', 'submitted', recipient, items],
      function (err) {
        expect(err).toBeNull();

        db.get('SELECT * FROM fulfillment_orders WHERE order_id = ?', ['ob_order_456'], (err2, row) => {
          expect(err2).toBeNull();
          expect(row.external_order_id).toBe('pf_789');
          expect(row.status).toBe('submitted');
          expect(JSON.parse(row.recipient).name).toBe('John Doe');
          expect(JSON.parse(row.items)[0].quantity).toBe(2);
          done();
        });
      },
    );
  });
});
