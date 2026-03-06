'use strict';

/**
 * FulfillmentProvider — abstract interface for physical/POD fulfillment backends.
 *
 * Implementations:
 *   - PrintfulFulfillmentProvider
 *   - LuluFulfillmentProvider (future)
 *   - ShipStationProvider (future)
 */
class FulfillmentProvider {
  /**
   * @param {string} name Provider identifier (e.g. 'printful')
   */
  constructor(name) {
    this.name = name;
  }

  /**
   * Submit a fulfillment order.
   *
   * @param {object} params
   * @returns {Promise<object>}
   */
  async createOrder(params) {
    throw new Error(`${this.name}: createOrder() not implemented`);
  }

  /**
   * Optional shipping estimator.
   *
   * @param {object} params
   * @returns {Promise<object[]>}
   */
  async estimateShippingRates(params) {
    throw new Error(`${this.name}: estimateShippingRates() not implemented`);
  }

  /**
   * Verify provider webhook signature.
   *
   * @param {Buffer|string} rawBody
   * @param {object} headers
   * @returns {boolean}
   */
  verifyWebhook(rawBody, headers) {
    throw new Error(`${this.name}: verifyWebhook() not implemented`);
  }

  /**
   * Normalize a provider webhook payload into a canonical event shape.
   *
   * @param {object} payload
   * @returns {{
   *   eventId: string|null,
   *   type: string,
   *   status: string|null,
   *   externalOrderId: string|null,
   *   providerOrderId: string|null,
   *   trackingNumber: string|null,
   *   trackingUrl: string|null,
   *   raw: object
   * }|null}
   */
  parseWebhookEvent(payload) {
    throw new Error(`${this.name}: parseWebhookEvent() not implemented`);
  }
}

module.exports = FulfillmentProvider;

