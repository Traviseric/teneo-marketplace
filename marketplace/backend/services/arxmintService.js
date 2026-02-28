/**
 * ArxMint Integration Scaffold
 *
 * Provides L402 paywalls, Cashu ecash micropayments, and Fedimint support.
 * Full integration requires ArxMint SDK — set ARXMINT_API_URL to enable.
 *
 * Reference: C:\code\arxmint (local ArxMint project)
 * Port targets:
 *   - L402:  C:\code\arxmint\app\api\l402\route.ts
 *   - Cashu: C:\code\arxmint\lib\cashu-paywall.ts
 */

const axios = require('axios');

class ArxMintService {
  constructor() {
    this.apiUrl = process.env.ARXMINT_API_URL;
    this.enabled = !!this.apiUrl;

    if (!this.enabled) {
      console.warn('[ArxMint] ARXMINT_API_URL not set — ArxMint features disabled');
    } else {
      console.log(`[ArxMint] Enabled — API at ${this.apiUrl}`);
    }
  }

  /**
   * Create an L402 paywall invoice for digital content access.
   * Returns a Lightning invoice + macaroon pair the client must satisfy.
   *
   * @param {number} amountSats - Amount in satoshis
   * @param {string} resourceId  - Unique identifier of the protected resource
   * @param {string} description - Human-readable description for the invoice
   * @returns {Promise<{invoice: string, macaroon: string, paymentHash: string}>}
   *
   * TODO: port from C:\code\arxmint\app\api\l402\route.ts
   */
  async createL402Invoice(amountSats, resourceId, description) {
    if (!this.enabled) {
      throw new Error('[ArxMint] Not configured — set ARXMINT_API_URL');
    }

    // TODO: implement once ArxMint SDK is available
    // const response = await axios.post(`${this.apiUrl}/l402/invoice`, {
    //   amount_sats: amountSats,
    //   resource_id: resourceId,
    //   description,
    // });
    // return response.data; // { invoice, macaroon, payment_hash }

    throw new Error('[ArxMint] createL402Invoice: not yet implemented — see TODO in arxmintService.js');
  }

  /**
   * Verify an L402 preimage payment.
   * Validates the HMAC-signed macaroon and preimage returned by the client.
   *
   * @param {string} preimage  - Payment preimage provided by the client
   * @param {string} macaroon  - Macaroon issued alongside the invoice
   * @returns {Promise<{valid: boolean, resourceId: string}>}
   *
   * TODO: port from C:\code\arxmint\app\api\l402\route.ts
   */
  async verifyL402Payment(preimage, macaroon) {
    if (!this.enabled) {
      throw new Error('[ArxMint] Not configured — set ARXMINT_API_URL');
    }

    // TODO: implement once ArxMint SDK is available
    // const response = await axios.post(`${this.apiUrl}/l402/verify`, {
    //   preimage,
    //   macaroon,
    // });
    // return response.data; // { valid, resource_id }

    throw new Error('[ArxMint] verifyL402Payment: not yet implemented — see TODO in arxmintService.js');
  }

  /**
   * Accept a Cashu ecash token for micropayments.
   * Melts the token and verifies the expected amount was received.
   *
   * @param {string} token          - Cashu V3 token string ("cashuA...")
   * @param {number} expectedAmount - Expected amount in satoshis
   * @returns {Promise<{accepted: boolean, amountSats: number}>}
   *
   * TODO: port from C:\code\arxmint\lib\cashu-paywall.ts
   */
  async acceptCashuToken(token, expectedAmount) {
    if (!this.enabled) {
      throw new Error('[ArxMint] Not configured — set ARXMINT_API_URL');
    }

    // TODO: implement once ArxMint SDK is available
    // const response = await axios.post(`${this.apiUrl}/cashu/melt`, {
    //   token,
    //   expected_amount: expectedAmount,
    // });
    // return response.data; // { accepted, amount_sats }

    throw new Error('[ArxMint] acceptCashuToken: not yet implemented — see TODO in arxmintService.js');
  }

  /**
   * Build WWW-Authenticate L402 challenge header value.
   * Used to signal L402 paywall to HTTP clients.
   *
   * @param {string} invoice  - BOLT11 Lightning invoice
   * @param {string} macaroon - Macaroon to attach
   * @returns {string} Header value for WWW-Authenticate
   */
  buildL402Header(invoice, macaroon) {
    return `L402 macaroon="${macaroon}", invoice="${invoice}"`;
  }
}

module.exports = new ArxMintService();
