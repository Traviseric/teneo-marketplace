'use strict';

const FulfillmentProvider = require('./fulfillmentProvider');

/**
 * Manual fulfillment provider — for merchants who ship their own products.
 *
 * Records orders in fulfillment_orders and lets the merchant update
 * tracking info from the dashboard. No external API calls.
 */
class ManualFulfillmentProvider extends FulfillmentProvider {
  constructor() {
    super('manual');
  }

  _db() {
    if (!this._dbRef) {
      this._dbRef = require('../database/database');
    }
    return this._dbRef;
  }

  /**
   * "Connecting" manual fulfillment just stores a marker row — no API key needed.
   */
  async connect(merchantId) {
    if (!merchantId) throw new Error('[Manual] merchantId required');

    await this._db().run(
      `INSERT INTO merchant_fulfillment_providers (merchant_id, provider, credentials_encrypted, is_active, connected_at)
       VALUES (?, 'manual', '{}', 1, CURRENT_TIMESTAMP)
       ON CONFLICT(merchant_id, provider) DO UPDATE SET
         is_active = 1,
         connected_at = CURRENT_TIMESTAMP`,
      [merchantId],
    );

    return { ok: true };
  }

  async disconnect(merchantId) {
    await this._db().run(
      'UPDATE merchant_fulfillment_providers SET is_active = 0 WHERE merchant_id = ? AND provider = ?',
      [merchantId, 'manual'],
    );
  }

  async isConnected(merchantId) {
    const row = await this._db().get(
      'SELECT id FROM merchant_fulfillment_providers WHERE merchant_id = ? AND provider = ? AND is_active = 1',
      [merchantId, 'manual'],
    );
    return Boolean(row);
  }

  /**
   * Create a manual fulfillment order — just records it in the DB.
   * Merchant is responsible for shipping and updating tracking info.
   */
  async createOrder(params) {
    const { merchantId, orderId, items, shippingAddress } = params;

    if (!merchantId) throw new Error('[Manual] merchantId required');
    if (!orderId) throw new Error('[Manual] orderId required');
    if (!shippingAddress) throw new Error('[Manual] shippingAddress required');

    await this._db().run(
      `INSERT INTO fulfillment_orders (merchant_id, provider, order_id, status, recipient, items)
       VALUES (?, 'manual', ?, 'awaiting_shipment', ?, ?)`,
      [
        merchantId,
        orderId,
        JSON.stringify(shippingAddress),
        JSON.stringify(items || []),
      ],
    );

    return {
      provider: this.name,
      orderId,
      status: 'awaiting_shipment',
    };
  }

  /**
   * Merchant marks an order as shipped with tracking info.
   */
  async markShipped(merchantId, orderId, tracking) {
    const { trackingNumber, trackingUrl, carrier } = tracking || {};

    const sets = ['status = ?', 'updated_at = CURRENT_TIMESTAMP'];
    const params = ['shipped'];

    if (trackingNumber) { sets.push('tracking_number = ?'); params.push(trackingNumber); }
    if (trackingUrl) { sets.push('tracking_url = ?'); params.push(trackingUrl); }
    if (carrier) { sets.push('carrier = ?'); params.push(carrier); }

    params.push(orderId, merchantId);
    const result = await this._db().run(
      `UPDATE fulfillment_orders SET ${sets.join(', ')} WHERE order_id = ? AND merchant_id = ? AND provider = 'manual'`,
      params,
    );

    return { ok: true, updated: (result?.changes || 0) > 0 };
  }

  // No external shipping rates — return empty
  async estimateShippingRates() {
    return [];
  }

  // No webhooks for manual fulfillment
  verifyWebhook() { return false; }
  parseWebhookEvent() { return null; }
}

module.exports = new ManualFulfillmentProvider();
