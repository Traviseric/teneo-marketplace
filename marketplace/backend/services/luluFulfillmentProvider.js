'use strict';

const crypto = require('crypto');
const FulfillmentProvider = require('./fulfillmentProvider');
const LuluService = require('./luluService');

class LuluFulfillmentProvider extends FulfillmentProvider {
  constructor() {
    super('lulu');
    this.webhookSecret = process.env.LULU_WEBHOOK_SECRET || '';
    this.service = new LuluService();
    this.enabled = Boolean(process.env.LULU_CLIENT_KEY && process.env.LULU_CLIENT_SECRET);

    if (!this.enabled) {
      console.warn('[Lulu Provider] LULU_CLIENT_KEY or LULU_CLIENT_SECRET missing — provider disabled');
    }
  }

  mapShippingAddress(shippingAddress) {
    if (!shippingAddress || typeof shippingAddress !== 'object') return null;

    const mapped = {
      name: shippingAddress.name || 'Customer',
      street1: shippingAddress.street1 || shippingAddress.address1 || '',
      street2: shippingAddress.street2 || shippingAddress.address2 || '',
      city: shippingAddress.city || '',
      state: shippingAddress.state || shippingAddress.state_code || '',
      country: shippingAddress.country || shippingAddress.country_code || 'US',
      zip: shippingAddress.zip || shippingAddress.postcode || '',
      email: shippingAddress.email || '',
      phone: shippingAddress.phone || '',
    };

    if (!mapped.street1 || !mapped.city || !mapped.country || !mapped.zip) {
      return null;
    }

    return mapped;
  }

  normalizeLineItems(lineItems, fallbackQuantity) {
    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      return [];
    }

    return lineItems.map((item, index) => ({
      bookId: item.bookId || item.productId || null,
      formatType: item.formatType || item.format || 'print_trade',
      title: item.title || `Book ${index + 1}`,
      quantity: Number(item.quantity) || Number(fallbackQuantity) || 1,
      podPackageId: item.podPackageId || item.pod_package_id || null,
      printableId: item.printableId || item.printable_id || null,
      coverUrl: item.coverUrl || item.cover_url || null,
      interiorUrl: item.interiorUrl || item.interior_url || null,
      pageCount: Number(item.pageCount || item.page_count) || null,
    }));
  }

  async createOrder(params) {
    if (!this.enabled) {
      throw new Error('[Lulu] Provider not configured');
    }

    const {
      orderId,
      quantity = 1,
      shippingAddress,
      shippingMethod = 'MAIL',
      contactEmail,
      lineItems,
      bookId,
      formatType,
      title,
      podPackageId,
      printableId,
      coverUrl,
      interiorUrl,
      pageCount,
    } = params || {};

    if (!orderId) {
      throw new Error('[Lulu] Missing orderId');
    }

    const mappedAddress = this.mapShippingAddress(shippingAddress);
    if (!mappedAddress) {
      throw new Error('[Lulu] Missing required shipping address fields');
    }

    const normalizedItems = this.normalizeLineItems(lineItems, quantity);
    if (normalizedItems.length === 0) {
      normalizedItems.push({
        bookId: bookId || null,
        formatType: formatType || 'print_trade',
        title: title || 'Book',
        quantity: Number(quantity) || 1,
        podPackageId: podPackageId || null,
        printableId: printableId || null,
        coverUrl: coverUrl || null,
        interiorUrl: interiorUrl || null,
        pageCount: Number(pageCount) || null,
      });
    }

    const result = await this.service.createPrintJob({
      lineItems: normalizedItems,
      shippingAddress: mappedAddress,
      shippingMethod: String(shippingMethod || 'MAIL').toUpperCase(),
      contactEmail: contactEmail || mappedAddress.email || '',
      externalId: String(orderId),
    });

    if (!result || !result.success) {
      throw new Error(`[Lulu] ${result?.error || 'Failed to create print job'}`);
    }

    return {
      provider: this.name,
      orderId: result.printJobId ? String(result.printJobId) : String(result.orderId || orderId),
      status: result.status || 'submitted',
      printJobId: result.printJobId ? String(result.printJobId) : null,
      luluOrderId: result.orderId ? String(result.orderId) : null,
      raw: result,
    };
  }

  async estimateShippingRates(params) {
    if (!this.enabled) {
      throw new Error('[Lulu] Provider not configured');
    }

    const shippingAddress = this.mapShippingAddress(params?.shippingAddress || params?.recipient);
    if (!shippingAddress) {
      throw new Error('[Lulu] Missing required shipping address fields');
    }

    const items = Array.isArray(params?.lineItems) ? params.lineItems : [];
    const shippingItems = items.map((item) => ({
      page_count: Number(item.page_count || item.pageCount || 0),
      pod_package_id: item.pod_package_id || item.podPackageId,
      quantity: Number(item.quantity) || 1,
    }));

    if (shippingItems.length === 0) {
      throw new Error('[Lulu] lineItems required for shipping estimate');
    }

    const result = await this.service.getShippingOptions(shippingItems, shippingAddress);
    if (!result.success) {
      throw new Error(`[Lulu] ${result.error || 'Failed to calculate shipping options'}`);
    }
    return result.options || [];
  }

  verifyWebhook(rawBody, headers) {
    if (!this.webhookSecret) {
      return false;
    }

    const signature =
      headers['x-lulu-signature'] ||
      headers['x-signature'] ||
      '';
    if (!signature) {
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
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  parseWebhookEvent(payload) {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const type = payload.event_type || payload.type || 'unknown';
    const data = payload.data || {};
    const statusName = data.status?.name || data.status || null;
    const upperStatus = String(statusName || '').toUpperCase();

    const normalizedStatus = (() => {
      if (type === 'PRINT_JOB_SHIPPED' || upperStatus === 'SHIPPED' || upperStatus === 'DELIVERED') return 'shipped';
      if (type === 'PRINT_JOB_FAILED' || upperStatus === 'FAILED') return 'failed';
      if (type === 'PRINT_JOB_CANCELED' || upperStatus === 'CANCELED' || upperStatus === 'CANCELLED') return 'canceled';
      if (upperStatus === 'IN_PRODUCTION' || upperStatus === 'UNPAID') return 'processing';
      if (upperStatus === 'PRODUCTION_DELAYED') return 'on_hold';
      return null;
    })();

    return {
      eventId: payload.event_id || payload.id || null,
      type,
      status: normalizedStatus,
      externalOrderId: data.external_id || null,
      providerOrderId: data.print_job_id || data.order_id || null,
      trackingNumber: data.tracking_id || null,
      trackingUrl: Array.isArray(data.tracking_urls) ? (data.tracking_urls[0] || null) : null,
      raw: payload,
    };
  }
}

module.exports = new LuluFulfillmentProvider();
