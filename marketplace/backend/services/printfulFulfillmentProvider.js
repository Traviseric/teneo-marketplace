'use strict';

const axios = require('axios');
const crypto = require('crypto');
const FulfillmentProvider = require('./fulfillmentProvider');
const { encryptCredentials, decryptCredentials } = require('./credentialEncryption');

const PRINTFUL_API = 'https://api.printful.com';

/**
 * Multi-tenant Printful fulfillment provider.
 *
 * Each merchant stores their own Printful API key + store ID encrypted in the
 * merchant_fulfillment_providers table. Methods that hit the Printful API accept
 * either a merchantId (looked up from DB) or explicit credentials.
 *
 * Legacy env-var mode still works as fallback for single-tenant / ArxMint bazaar.
 */
class PrintfulFulfillmentProvider extends FulfillmentProvider {
  constructor() {
    super('printful');
    this.baseUrl = (process.env.PRINTFUL_API_BASE || PRINTFUL_API).replace(/\/$/, '');

    // Legacy single-tenant env vars (ArxMint bazaar fallback)
    this._legacyApiKey = process.env.PRINTFUL_API_KEY || '';
    this._legacyStoreId = process.env.PRINTFUL_STORE_ID || '';
    this._legacyWebhookSecret = process.env.PRINTFUL_WEBHOOK_SECRET || '';
    this.legacyEnabled = Boolean(this._legacyApiKey && this._legacyStoreId);
  }

  // ─── Credential resolution ────────────────────────────

  /**
   * Get a DB handle. Lazy-required so this module can be loaded before the DB is ready.
   */
  _db() {
    if (!this._dbRef) {
      this._dbRef = require('../database/database');
    }
    return this._dbRef;
  }

  /**
   * Resolve Printful credentials for a merchant.
   * Falls back to legacy env vars if no merchantId or merchant has no connection.
   */
  async _resolveCredentials(merchantId) {
    if (merchantId) {
      const row = await this._db().get(
        'SELECT credentials_encrypted FROM merchant_fulfillment_providers WHERE merchant_id = ? AND provider = ? AND is_active = 1',
        [merchantId, 'printful'],
      );
      if (row && row.credentials_encrypted) {
        return decryptCredentials(row.credentials_encrypted);
      }
    }
    // Legacy fallback
    if (!this.legacyEnabled) {
      throw new Error('[Printful] No credentials for merchant and legacy env vars not configured');
    }
    return {
      apiKey: this._legacyApiKey,
      storeId: this._legacyStoreId,
      webhookSecret: this._legacyWebhookSecret,
    };
  }

  _getHeaders(creds) {
    const headers = {
      Authorization: `Bearer ${creds.apiKey}`,
      'Content-Type': 'application/json',
    };
    if (creds.storeId) {
      headers['X-PF-Store-Id'] = creds.storeId;
    }
    return headers;
  }

  // ─── Connection management ────────────────────────────

  /**
   * Validate Printful API key by calling GET /store, then store encrypted credentials.
   * If a webhookBaseUrl is provided, automatically registers a per-merchant webhook with Printful.
   *
   * @param {string} merchantId
   * @param {object} credentials  { apiKey, storeId?, webhookSecret? }
   * @param {object} [options]    { webhookBaseUrl?: string }
   */
  async connect(merchantId, credentials, options = {}) {
    if (!merchantId) throw new Error('[Printful] merchantId required');
    if (!credentials || !credentials.apiKey) throw new Error('[Printful] apiKey required');

    // Validate by calling Printful's store info endpoint
    const headers = this._getHeaders(credentials);
    const storeResponse = await axios.get(`${this.baseUrl}/store`, {
      headers,
      timeout: 10000,
    });

    const storeInfo = storeResponse.data?.result || {};
    const storeId = credentials.storeId || String(storeInfo.id || '');

    // Auto-register webhook with Printful if base URL is known
    let webhookSecret = credentials.webhookSecret || null;
    let webhookRegistered = false;
    if (options.webhookBaseUrl) {
      try {
        const webhookResult = await this._registerWebhook(
          headers,
          `${options.webhookBaseUrl}/api/webhooks/printful/${merchantId}`,
        );
        if (webhookResult.secret) {
          webhookSecret = webhookResult.secret;
        }
        webhookRegistered = true;
      } catch (err) {
        // Non-fatal — webhook can be registered manually later
        console.warn('[Printful] Auto webhook registration failed:', err.message);
      }
    }

    const encryptedJson = encryptCredentials({
      apiKey: credentials.apiKey,
      storeId,
      webhookSecret,
    });

    await this._db().run(
      `INSERT INTO merchant_fulfillment_providers (merchant_id, provider, credentials_encrypted, is_active, connected_at)
       VALUES (?, 'printful', ?, 1, CURRENT_TIMESTAMP)
       ON CONFLICT(merchant_id, provider) DO UPDATE SET
         credentials_encrypted = excluded.credentials_encrypted,
         is_active = 1,
         connected_at = CURRENT_TIMESTAMP`,
      [merchantId, encryptedJson],
    );

    return {
      ok: true,
      storeName: storeInfo.name || null,
      storeId,
      webhookRegistered,
    };
  }

  /**
   * Register (or update) a webhook URL with the Printful API.
   * Printful returns the webhook config; we extract the signing secret if available.
   */
  async _registerWebhook(headers, webhookUrl) {
    const WEBHOOK_TYPES = [
      'package_shipped',
      'order_failed',
      'order_canceled',
      'order_put_hold',
      'order_remove_hold',
    ];

    const response = await axios.post(
      `${this.baseUrl}/webhooks`,
      { url: webhookUrl, types: WEBHOOK_TYPES },
      { headers, timeout: 10000 },
    );

    const result = response.data?.result || {};
    return {
      url: result.url || webhookUrl,
      secret: result.secret || result.webhook_secret || null,
      types: result.types || WEBHOOK_TYPES,
    };
  }

  async disconnect(merchantId) {
    await this._db().run(
      'UPDATE merchant_fulfillment_providers SET is_active = 0 WHERE merchant_id = ? AND provider = ?',
      [merchantId, 'printful'],
    );
  }

  async isConnected(merchantId) {
    const row = await this._db().get(
      'SELECT id FROM merchant_fulfillment_providers WHERE merchant_id = ? AND provider = ? AND is_active = 1',
      [merchantId, 'printful'],
    );
    return Boolean(row);
  }

  // ─── Product sync ─────────────────────────────────────

  /**
   * Import all products from merchant's Printful store into fulfillment_products.
   */
  async importProducts(merchantId) {
    const creds = await this._resolveCredentials(merchantId);
    const headers = this._getHeaders(creds);

    // List all sync products
    const listResp = await axios.get(`${this.baseUrl}/store/products`, {
      headers,
      timeout: 15000,
    });
    const products = listResp.data?.result || [];

    const imported = [];
    for (const product of products) {
      // Get full product details with variants
      const detailResp = await axios.get(`${this.baseUrl}/store/products/${product.id}`, {
        headers,
        timeout: 15000,
      });
      const syncProduct = detailResp.data?.result?.sync_product || {};
      const syncVariants = detailResp.data?.result?.sync_variants || [];

      const variantsJson = JSON.stringify(
        syncVariants.map((v) => ({
          id: v.id,
          name: v.name,
          price: v.retail_price,
          currency: v.currency,
          sku: v.sku || null,
          external_variant_id: v.variant_id,
        })),
      );

      await this._db().run(
        `INSERT INTO fulfillment_products (merchant_id, provider, external_product_id, name, thumbnail_url, variants, synced_at)
         VALUES (?, 'printful', ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(merchant_id, provider, external_product_id) DO UPDATE SET
           name = excluded.name,
           thumbnail_url = excluded.thumbnail_url,
           variants = excluded.variants,
           synced_at = CURRENT_TIMESTAMP`,
        [merchantId, String(product.id), syncProduct.name || product.name, product.thumbnail_url || null, variantsJson],
      );

      imported.push({
        externalProductId: String(product.id),
        name: syncProduct.name || product.name,
        variantCount: syncVariants.length,
      });
    }

    // Update product count + last sync time
    await this._db().run(
      'UPDATE merchant_fulfillment_providers SET product_count = ?, last_sync_at = CURRENT_TIMESTAMP WHERE merchant_id = ? AND provider = ?',
      [imported.length, merchantId, 'printful'],
    );

    return imported;
  }

  // ─── Order fulfillment ────────────────────────────────

  /**
   * Create a Printful order using merchant credentials.
   */
  async createOrder(params) {
    const {
      merchantId,
      orderId,
      variantId,
      items,
      quantity = 1,
      shippingAddress,
      confirm = true,
    } = params;

    const creds = await this._resolveCredentials(merchantId);

    if (!shippingAddress || !shippingAddress.name || !shippingAddress.address1 || !shippingAddress.city || !shippingAddress.country_code || !shippingAddress.zip) {
      throw new Error('[Printful] Missing required shipping address fields');
    }

    // Build items array — support both single variantId and items array
    const orderItems = items || [{ sync_variant_id: Number(variantId), quantity: Number(quantity) || 1 }];

    const body = {
      recipient: {
        name: shippingAddress.name,
        address1: shippingAddress.address1,
        address2: shippingAddress.address2 || undefined,
        city: shippingAddress.city,
        state_code: shippingAddress.state_code || undefined,
        country_code: shippingAddress.country_code,
        zip: shippingAddress.zip,
        email: shippingAddress.email || undefined,
      },
      items: orderItems,
      external_id: orderId,
      confirm: Boolean(confirm),
    };

    const response = await axios.post(`${this.baseUrl}/orders`, body, {
      headers: this._getHeaders(creds),
      timeout: 15000,
    });

    const result = response.data?.result || {};

    // Record in fulfillment_orders
    if (merchantId) {
      await this._db().run(
        `INSERT INTO fulfillment_orders (merchant_id, provider, order_id, external_order_id, status, recipient, items)
         VALUES (?, 'printful', ?, ?, ?, ?, ?)`,
        [
          merchantId,
          orderId,
          String(result.id || ''),
          result.status || 'submitted',
          JSON.stringify(body.recipient),
          JSON.stringify(orderItems),
        ],
      );
    }

    return {
      provider: this.name,
      orderId: result.id,
      status: result.status || 'submitted',
      raw: response.data,
    };
  }

  async getOrderStatus(merchantId, externalOrderId) {
    const creds = await this._resolveCredentials(merchantId);
    const response = await axios.get(`${this.baseUrl}/orders/${externalOrderId}`, {
      headers: this._getHeaders(creds),
      timeout: 15000,
    });
    return response.data?.result || null;
  }

  async cancelOrder(merchantId, externalOrderId) {
    const creds = await this._resolveCredentials(merchantId);
    const response = await axios.delete(`${this.baseUrl}/orders/${externalOrderId}`, {
      headers: this._getHeaders(creds),
      timeout: 15000,
    });
    return response.status >= 200 && response.status < 300;
  }

  async estimateShippingRates(params) {
    const { merchantId, recipient, items, currency = 'USD' } = params || {};
    const creds = await this._resolveCredentials(merchantId);

    const body = { recipient, items, currency };
    const response = await axios.post(`${this.baseUrl}/shipping/rates`, body, {
      headers: this._getHeaders(creds),
      timeout: 10000,
    });
    return response.data?.result || [];
  }

  // ─── Webhooks ─────────────────────────────────────────

  /**
   * Verify webhook signature using merchant-specific or legacy secret.
   */
  verifyWebhook(rawBody, headers, webhookSecret) {
    const secret = webhookSecret || this._legacyWebhookSecret;
    if (!secret) {
      return false;
    }

    const provided =
      headers['x-printful-signature'] ||
      headers['x-pf-signature'] ||
      headers['x-pf-webhook-signature'] ||
      headers['x-signature'];
    if (!provided) {
      return false;
    }

    const payload =
      Buffer.isBuffer(rawBody) ? rawBody
        : typeof rawBody === 'string' ? Buffer.from(rawBody)
          : Buffer.from(JSON.stringify(rawBody || {}));

    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  parseWebhookEvent(payload) {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const type = payload.type || payload.event_type || payload.event || 'unknown';
    const data = payload.data || payload.result || payload;
    const shipment = data.shipment || data;

    const trackingNumber =
      shipment.tracking_number ||
      shipment.trackingNumber ||
      shipment.tracking_code ||
      null;

    const trackingUrl =
      shipment.tracking_url ||
      shipment.trackingUrl ||
      (Array.isArray(shipment.tracking_urls) ? shipment.tracking_urls[0] : null) ||
      null;

    const normalizedStatus = (() => {
      if (type === 'package_shipped') return 'shipped';
      if (type === 'order_failed') return 'failed';
      if (type === 'order_canceled') return 'canceled';
      if (type === 'order_put_hold') return 'on_hold';
      if (type === 'order_remove_hold') return 'processing';
      return null;
    })();

    return {
      eventId: payload.id || payload.event_id || null,
      type,
      status: normalizedStatus,
      externalOrderId: String(data.external_id || data.externalId || '').trim() || null,
      providerOrderId: data.order_id || data.orderId || data.id || null,
      trackingNumber,
      trackingUrl,
      carrier: shipment.carrier || null,
      raw: payload,
    };
  }
}

module.exports = new PrintfulFulfillmentProvider();
