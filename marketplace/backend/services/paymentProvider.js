/**
 * PaymentProvider — Abstract interface for pluggable payment backends.
 *
 * Implementations: StripeProvider (built-in), ArxMintProvider, BTCPayProvider.
 * Stores configure which provider(s) to use via env vars or admin settings.
 *
 * Flow:
 *   1. Store calls provider.createCheckout(params) → gets { checkoutUrl, sessionId }
 *   2. Customer is redirected to checkoutUrl (Stripe Checkout, ArxMint /pay, etc.)
 *   3. Provider confirms payment via webhook → POST /api/orders/fulfill
 *   4. OpenBazaar fulfills the order (download link, Printful POD, etc.)
 */

'use strict';

class PaymentProvider {
  /**
   * @param {string} name - Provider identifier (e.g. 'stripe', 'arxmint', 'btcpay')
   */
  constructor(name) {
    this.name = name;
  }

  /**
   * Create a checkout session / payment request.
   *
   * @param {object} params
   * @param {number} params.amount       - Amount in smallest unit (cents for USD, sats for BTC)
   * @param {string} params.currency     - 'USD' | 'sats'
   * @param {string} params.memo         - Human-readable description
   * @param {string} params.productId    - Product identifier
   * @param {string} params.merchantId   - Merchant/store identifier
   * @param {string} params.callbackUrl  - Webhook URL for payment confirmation
   * @param {string} [params.successUrl] - Redirect after successful payment
   * @param {string} [params.cancelUrl]  - Redirect if customer cancels
   * @param {string} [params.customerEmail]
   * @returns {Promise<{ checkoutUrl: string, sessionId: string }>}
   */
  async createCheckout(params) {
    throw new Error(`${this.name}: createCheckout() not implemented`);
  }

  /**
   * Check the status of a payment session.
   *
   * @param {string} sessionId
   * @returns {Promise<'pending' | 'paid' | 'expired' | 'failed'>}
   */
  async checkStatus(sessionId) {
    throw new Error(`${this.name}: checkStatus() not implemented`);
  }

  /**
   * Verify a webhook signature from this provider.
   *
   * @param {Buffer|string} rawBody - Raw request body
   * @param {object} headers - Request headers
   * @returns {boolean}
   */
  verifyWebhook(rawBody, headers) {
    throw new Error(`${this.name}: verifyWebhook() not implemented`);
  }
}

module.exports = PaymentProvider;
