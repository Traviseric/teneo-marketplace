/**
 * ArxMintProvider — Payment provider for ArxMint Lightning/ecash checkout.
 *
 * Integration pattern (from BAZAAR_STRATEGY.md):
 *   1. "Buy" button → redirect to arxmint.com/pay/{merchantId}?amount={sats}&memo={product}
 *   2. ArxMint handles Lightning invoice + QR + payment verification
 *   3. After payment, ArxMint POSTs webhook to callbackUrl → triggers fulfillment
 *
 * Config env vars:
 *   ARXMINT_URL         - ArxMint base URL (default: https://arxmint.com)
 *   ARXMINT_MERCHANT_ID - Your merchant ID on ArxMint
 *   ARXMINT_WEBHOOK_SECRET - Shared secret for webhook HMAC verification
 */

'use strict';

const crypto = require('crypto');
const PaymentProvider = require('./paymentProvider');

class ArxMintProvider extends PaymentProvider {
  constructor() {
    super('arxmint');
    this.baseUrl = (process.env.ARXMINT_URL || 'https://arxmint.com').replace(/\/$/, '');
    this.merchantId = process.env.ARXMINT_MERCHANT_ID;
    this.webhookSecret = process.env.ARXMINT_WEBHOOK_SECRET;
    this.enabled = !!(this.merchantId);

    if (!this.enabled) {
      console.warn('[ArxMint Provider] ARXMINT_MERCHANT_ID not set — ArxMint payments disabled');
    }
  }

  /**
   * Create an ArxMint checkout session.
   * Returns a redirect URL to ArxMint's hosted checkout page.
   */
  async createCheckout(params) {
    if (!this.enabled) {
      throw new Error('[ArxMint] Not configured — set ARXMINT_MERCHANT_ID');
    }

    const { amount, currency, memo, productId, callbackUrl } = params;

    // Convert USD cents to sats if needed (approximate, ArxMint handles exact conversion)
    let amountSats = amount;
    if (currency === 'USD') {
      // amount is in cents; ArxMint accepts sats or USD — pass as USD query param
      const amountUsd = (amount / 100).toFixed(2);
      const checkoutUrl = `${this.baseUrl}/pay/${this.merchantId}?amount_usd=${amountUsd}&memo=${encodeURIComponent(memo)}&product_id=${encodeURIComponent(productId)}&callback=${encodeURIComponent(callbackUrl)}`;
      return {
        checkoutUrl,
        sessionId: `arx_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`,
      };
    }

    // amount is already in sats
    const checkoutUrl = `${this.baseUrl}/pay/${this.merchantId}?amount=${amountSats}&memo=${encodeURIComponent(memo)}&product_id=${encodeURIComponent(productId)}&callback=${encodeURIComponent(callbackUrl)}`;

    return {
      checkoutUrl,
      sessionId: `arx_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`,
    };
  }

  /**
   * Check payment status via ArxMint API.
   * Falls back to 'pending' if API is unavailable.
   */
  async checkStatus(sessionId) {
    if (!this.enabled) return 'failed';

    try {
      const axios = require('axios');
      const resp = await axios.get(
        `${this.baseUrl}/api/checkout/status/${sessionId}`,
        { timeout: 5000 }
      );
      return resp.data.status || 'pending';
    } catch {
      return 'pending';
    }
  }

  /**
   * Verify ArxMint webhook signature.
   * ArxMint signs webhooks with HMAC-SHA256 using the shared secret.
   * Signature is in the `x-arxmint-signature` header as hex digest.
   */
  verifyWebhook(rawBody, headers) {
    if (!this.webhookSecret) return false;

    const signature = headers['x-arxmint-signature'];
    if (!signature) return false;

    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected)
      );
    } catch {
      return false;
    }
  }
}

module.exports = new ArxMintProvider();
