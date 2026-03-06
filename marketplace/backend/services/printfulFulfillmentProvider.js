'use strict';

const axios = require('axios');
const crypto = require('crypto');
const FulfillmentProvider = require('./fulfillmentProvider');

class PrintfulFulfillmentProvider extends FulfillmentProvider {
  constructor() {
    super('printful');
    this.baseUrl = (process.env.PRINTFUL_API_BASE || 'https://api.printful.com').replace(/\/$/, '');
    this.apiKey = process.env.PRINTFUL_API_KEY || '';
    this.storeId = process.env.PRINTFUL_STORE_ID || '';
    this.webhookSecret = process.env.PRINTFUL_WEBHOOK_SECRET || '';
    this.enabled = Boolean(this.apiKey && this.storeId);

    if (!this.enabled) {
      console.warn('[Printful Provider] PRINTFUL_API_KEY or PRINTFUL_STORE_ID missing — provider disabled');
    }
  }

  getHeaders() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'X-PF-Store-Id': this.storeId,
    };
  }

  /**
   * Create a confirmed Printful order in the configured store.
   *
   * @param {object} params
   * @param {string} params.orderId
   * @param {number|string} params.variantId
   * @param {number} [params.quantity]
   * @param {object} params.shippingAddress
   * @param {string} params.shippingAddress.name
   * @param {string} params.shippingAddress.address1
   * @param {string} params.shippingAddress.city
   * @param {string} [params.shippingAddress.state_code]
   * @param {string} params.shippingAddress.country_code
   * @param {string} params.shippingAddress.zip
   * @param {string} [params.shippingAddress.email]
   * @param {boolean} [params.confirm]
   * @returns {Promise<{provider: string, orderId: string|number, status: string, raw: object}>}
   */
  async createOrder(params) {
    if (!this.enabled) {
      throw new Error('[Printful] Provider not configured');
    }

    const {
      orderId,
      variantId,
      quantity = 1,
      shippingAddress,
      confirm = true,
    } = params;

    if (!variantId) {
      throw new Error('[Printful] Missing variantId');
    }
    if (!shippingAddress || !shippingAddress.name || !shippingAddress.address1 || !shippingAddress.city || !shippingAddress.country_code || !shippingAddress.zip) {
      throw new Error('[Printful] Missing required shipping address fields');
    }

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
      items: [
        {
          sync_variant_id: Number(variantId),
          quantity: Number(quantity) || 1,
        },
      ],
      external_id: orderId,
      confirm: Boolean(confirm),
    };

    const response = await axios.post(`${this.baseUrl}/orders`, body, {
      headers: this.getHeaders(),
      timeout: 15000,
    });

    const result = response.data?.result || {};
    return {
      provider: this.name,
      orderId: result.id,
      status: result.status || 'submitted',
      raw: response.data,
    };
  }

  async estimateShippingRates(params) {
    if (!this.enabled) {
      throw new Error('[Printful] Provider not configured');
    }

    const { recipient, items, currency = 'USD' } = params || {};
    const body = { recipient, items, currency };
    const response = await axios.post(`${this.baseUrl}/shipping/rates`, body, {
      headers: this.getHeaders(),
      timeout: 10000,
    });
    return response.data?.result || [];
  }

  verifyWebhook(rawBody, headers) {
    if (!this.webhookSecret) {
      return false;
    }

    const provided =
      headers['x-printful-signature'] ||
      headers['x-pf-signature'] ||
      headers['x-signature'];
    if (!provided) {
      return false;
    }

    const payload =
      Buffer.isBuffer(rawBody) ? rawBody
        : typeof rawBody === 'string' ? Buffer.from(rawBody)
          : Buffer.from(JSON.stringify(rawBody || {}));

    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
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
      raw: payload,
    };
  }
}

module.exports = new PrintfulFulfillmentProvider();

