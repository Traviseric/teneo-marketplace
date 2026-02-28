/**
 * btcpayService.js
 *
 * Scaffold for BTCPay Server integration.
 *
 * Full automated crypto payment verification requires a BTCPay Server instance.
 * Configure the following env vars to enable this path:
 *   BTCPAY_URL        — e.g. https://btcpay.yourdomain.com
 *   BTCPAY_API_KEY    — store-level API key (Greenfield API)
 *   BTCPAY_STORE_ID   — BTCPay store ID
 *   BTCPAY_WEBHOOK_SECRET — shared secret for webhook HMAC validation
 *
 * When BTCPAY_URL is NOT configured the service returns null from createInvoice
 * so the caller falls back to the existing manual crypto flow — no regression.
 */

'use strict';

const crypto = require('crypto');
const axios = require('axios');

/** Returns true if BTCPay is configured in the environment. */
function isBtcpayConfigured() {
    return !!(process.env.BTCPAY_URL && process.env.BTCPAY_API_KEY && process.env.BTCPAY_STORE_ID);
}

/**
 * Create a BTCPay invoice.
 *
 * @param {number}  amountUSD     - Order total in USD
 * @param {string}  orderId       - Internal order ID (stored in BTCPay metadata)
 * @param {string}  customerEmail - Buyer email address
 * @returns {Promise<{invoiceId: string, checkoutUrl: string}|null>}
 *   Returns null when BTCPay is not configured.
 */
async function createInvoice(amountUSD, orderId, customerEmail) {
    if (!isBtcpayConfigured()) {
        return null;
    }

    const baseUrl = process.env.BTCPAY_URL.replace(/\/$/, '');
    const storeId = process.env.BTCPAY_STORE_ID;
    const callbackUrl = `${process.env.PUBLIC_URL || process.env.FRONTEND_URL || 'http://localhost:3001'}/api/crypto/btcpay/webhook`;

    const response = await axios.post(
        `${baseUrl}/api/v1/stores/${storeId}/invoices`,
        {
            amount: amountUSD,
            currency: 'USD',
            metadata: {
                orderId,
                buyerEmail: customerEmail,
            },
            checkout: {
                redirectURL: `${process.env.PUBLIC_URL || 'http://localhost:3001'}/success.html?orderId=${orderId}`,
                defaultPaymentMethod: 'BTC',
            },
            notifications: {
                url: callbackUrl,
            },
        },
        {
            headers: {
                Authorization: `token ${process.env.BTCPAY_API_KEY}`,
                'Content-Type': 'application/json',
            },
            timeout: 10000,
        }
    );

    return {
        invoiceId: response.data.id,
        checkoutUrl: response.data.checkoutLink,
    };
}

/**
 * Retrieve the current status of a BTCPay invoice.
 *
 * @param {string} invoiceId - BTCPay invoice ID
 * @returns {Promise<{id: string, status: string, paid: boolean}|null>}
 */
async function getInvoiceStatus(invoiceId) {
    if (!isBtcpayConfigured()) {
        return null;
    }

    const baseUrl = process.env.BTCPAY_URL.replace(/\/$/, '');
    const storeId = process.env.BTCPAY_STORE_ID;

    const response = await axios.get(
        `${baseUrl}/api/v1/stores/${storeId}/invoices/${invoiceId}`,
        {
            headers: { Authorization: `token ${process.env.BTCPAY_API_KEY}` },
            timeout: 10000,
        }
    );

    const { id, status } = response.data;
    return {
        id,
        status,
        paid: status === 'Settled',
    };
}

/**
 * Verify a BTCPay webhook signature.
 *
 * BTCPay signs webhook requests using HMAC-SHA256 over the raw body with
 * the BTCPAY_WEBHOOK_SECRET key and sends the hex digest in the
 * `BTCPay-Sig1` header as `sha256=<hex>`.
 *
 * @param {Buffer|string} rawBody  - Raw (un-parsed) request body
 * @param {string}        signature - Value of the BTCPay-Sig1 header
 * @returns {boolean}
 */
function verifyWebhookSignature(rawBody, signature) {
    const secret = process.env.BTCPAY_WEBHOOK_SECRET;
    if (!secret) {
        // If no secret configured we cannot verify — reject for safety
        return false;
    }

    const expected = 'sha256=' + crypto
        .createHmac('sha256', secret)
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

module.exports = { isBtcpayConfigured, createInvoice, getInvoiceStatus, verifyWebhookSignature };
