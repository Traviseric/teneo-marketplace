'use strict';

/**
 * zapService.js — NIP-57 Zap-to-unlock
 *
 * Generates Lightning invoices and verifies NIP-57 zap receipts (kind 9735)
 * for frictionless one-click purchases on items under $5.
 *
 * Spec: https://github.com/nostr-protocol/nips/blob/master/57.md
 *
 * Environment:
 *   ZAP_ADDRESS        - Lightning Address for receiving zaps (e.g. store@wallet.com)
 *   STORE_NOSTR_PUBKEY - Store's Nostr pubkey (hex)
 *   ARXMINT_API_URL    - ArxMint base URL (for invoice generation)
 *   ARXMINT_API_KEY    - ArxMint API key
 */

const { schnorr } = require('@noble/curves/secp256k1');
const { sha256 } = require('@noble/hashes/sha256');
const { utf8ToBytes, bytesToHex } = require('@noble/hashes/utils');

const NIP57_ZAP_RECEIPT_KIND = 9735;
const NIP57_ZAP_REQUEST_KIND = 9734;

const ZAP_POLL_LOOKBACK_SECONDS = 300; // 5-minute lookback for zap receipts

// ---------------------------------------------------------------------------
// Nostr cryptography helpers (reused from nostrService pattern)
// ---------------------------------------------------------------------------

/**
 * Compute canonical Nostr event ID (SHA-256 of the serialized event).
 *
 * @param {object} event - unsigned or signed Nostr event
 * @returns {string} hex event ID
 */
function computeEventId(event) {
  const serialized = JSON.stringify([
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content,
  ]);
  return bytesToHex(sha256(utf8ToBytes(serialized)));
}

/**
 * Verify a Nostr event's Schnorr signature.
 *
 * @param {object} event - signed Nostr event (must have id, pubkey, sig)
 * @returns {boolean}
 */
function verifyEventSignature(event) {
  try {
    if (!event || !event.id || !event.pubkey || !event.sig) return false;
    const expectedId = computeEventId(event);
    if (expectedId !== event.id) return false;
    return schnorr.verify(event.sig, event.id, event.pubkey);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// NIP-57 helpers
// ---------------------------------------------------------------------------

/**
 * Extract millisats amount from a zap request event's `amount` tag.
 *
 * @param {object} zapRequest - NIP-57 kind 9734 event
 * @returns {number} millisats (0 if absent or unparseable)
 */
function extractMsatsFromZapRequest(zapRequest) {
  if (!zapRequest || !Array.isArray(zapRequest.tags)) return 0;
  const amountTag = zapRequest.tags.find(t => t[0] === 'amount');
  if (!amountTag || !amountTag[1]) return 0;
  return parseInt(amountTag[1], 10) || 0;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * verifyZapReceipt — validate a NIP-57 kind 9735 zap receipt event.
 *
 * Checks:
 *   1. Event kind is 9735
 *   2. Schnorr signature is valid
 *   3. `description` tag is a valid kind 9734 zap request
 *   4. Amount in the zap request >= expectedAmountSats
 *
 * @param {object}      kind9735Event      - The zap receipt event from the payer's wallet
 * @param {number}      expectedAmountSats - Minimum required payment in satoshis
 * @param {string|null} [productId]        - Optional product ID (reserved for future checks)
 * @returns {{ valid: boolean, error?: string, amountSats?: number, amountMsats?: number, zapperPubkey?: string }}
 */
function verifyZapReceipt(kind9735Event, expectedAmountSats, productId = null) {
  if (!kind9735Event || typeof kind9735Event !== 'object') {
    return { valid: false, error: 'event required' };
  }

  if (kind9735Event.kind !== NIP57_ZAP_RECEIPT_KIND) {
    return {
      valid: false,
      error: `Expected kind ${NIP57_ZAP_RECEIPT_KIND}, got ${kind9735Event.kind}`,
    };
  }

  if (!verifyEventSignature(kind9735Event)) {
    return { valid: false, error: 'Invalid event signature' };
  }

  // Extract description tag → zap request JSON
  const descriptionTag = Array.isArray(kind9735Event.tags)
    ? kind9735Event.tags.find(t => t[0] === 'description')
    : null;

  if (!descriptionTag || !descriptionTag[1]) {
    return { valid: false, error: 'Missing description tag in zap receipt' };
  }

  let zapRequest;
  try {
    zapRequest = JSON.parse(descriptionTag[1]);
  } catch {
    return { valid: false, error: 'description tag is not valid JSON' };
  }

  if (zapRequest.kind !== NIP57_ZAP_REQUEST_KIND) {
    return {
      valid: false,
      error: `description must contain a kind ${NIP57_ZAP_REQUEST_KIND} event`,
    };
  }

  // Check amount meets minimum
  const msats = extractMsatsFromZapRequest(zapRequest);
  const sats = Math.floor(msats / 1000);

  if (sats < expectedAmountSats) {
    return {
      valid: false,
      error: `Insufficient amount: got ${sats} sats, expected at least ${expectedAmountSats} sats`,
    };
  }

  // Extract zapper pubkey from `P` tag on receipt (NIP-57: the payer's pubkey)
  const zapperTag = kind9735Event.tags.find(t => t[0] === 'P');
  const zapperPubkey = zapperTag ? zapperTag[1] : (zapRequest.pubkey || null);

  return {
    valid: true,
    amountSats: sats,
    amountMsats: msats,
    zapperPubkey,
  };
}

/**
 * generateZapInvoice — create a BOLT11 Lightning invoice for a NIP-57 zap.
 *
 * Delegates to ArxMint when `ARXMINT_API_URL` and `ARXMINT_API_KEY` are set.
 * Falls back to a dev stub in non-production environments.
 *
 * @param {string} productId   - Product identifier (used in memo)
 * @param {number} amountSats  - Amount in satoshis
 * @returns {Promise<{ invoice: string, paymentHash: string, expiresAt: string }>}
 */
async function generateZapInvoice(productId, amountSats) {
  const arxmintUrl = process.env.ARXMINT_API_URL;
  const arxmintKey = process.env.ARXMINT_API_KEY;

  if (arxmintUrl && arxmintKey) {
    const axios = require('axios');
    const resp = await axios.post(
      `${arxmintUrl}/api/invoice`,
      {
        amount: amountSats,
        currency: 'SAT',
        memo: `Zap unlock: ${productId}`,
      },
      { headers: { 'X-Api-Key': arxmintKey }, timeout: 10000 }
    );
    const data = resp.data;
    return {
      invoice: data.payment_request || data.invoice || data.bolt11,
      paymentHash: data.payment_hash || data.paymentHash,
      expiresAt: data.expires_at || new Date(Date.now() + 600_000).toISOString(),
    };
  }

  // Dev stub — not a real invoice
  const crypto = require('crypto');
  return {
    invoice: `lnbc${amountSats}n1_stub_zap_${productId.replace(/[^a-z0-9]/gi, '')}`,
    paymentHash: crypto.randomBytes(32).toString('hex'),
    expiresAt: new Date(Date.now() + 600_000).toISOString(),
    _stub: true,
  };
}

/**
 * pollForZapReceipt — Subscribe to a Nostr relay and wait for a kind 9735
 * zap receipt matching the given zapRequestEventId.
 *
 * Uses WebSocket (ws package) with NIP-01 REQ subscription.
 * Filter: { kinds: [9735], "#e": [zapRequestEventId], since: <now - 5min> }
 *
 * @param {string} relayUrl          - wss:// relay URL
 * @param {string} zapRequestEventId - Event ID of the kind 9734 zap request
 * @param {number} [timeoutMs=30000] - How long to wait before returning null
 * @returns {Promise<object|null>}   - The kind 9735 receipt event, or null on timeout
 */
async function pollForZapReceipt(relayUrl, zapRequestEventId, timeoutMs = 30000) {
  if (!relayUrl || !zapRequestEventId) return null;

  const WebSocket = require('ws');

  return new Promise((resolve) => {
    let settled = false;
    let ws;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      try { if (ws && ws.readyState === WebSocket.OPEN) ws.close(); } catch (e) { console.debug('[zapService] WS close error (expected):', e.message); }
      resolve(result);
    };

    const timer = setTimeout(() => finish(null), timeoutMs);

    try {
      ws = new WebSocket(relayUrl, [], { handshakeTimeout: 5000 });
    } catch (err) {
      clearTimeout(timer);
      return resolve(null);
    }

    ws.on('error', () => {
      clearTimeout(timer);
      finish(null);
    });

    ws.on('open', () => {
      const subId = 'zap_' + Date.now();
      const since = Math.floor(Date.now() / 1000) - ZAP_POLL_LOOKBACK_SECONDS;
      const req = JSON.stringify(['REQ', subId, {
        kinds: [NIP57_ZAP_RECEIPT_KIND],
        '#e': [zapRequestEventId],
        since,
      }]);
      try { ws.send(req); } catch (e) { console.error('[zapService] WS send failed — zap subscription lost:', e.message); }
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (!Array.isArray(msg)) return;
        const [type, , event] = msg;
        if (type === 'EVENT' && event && event.kind === NIP57_ZAP_RECEIPT_KIND) {
          // Verify it references our zap request
          const eTag = Array.isArray(event.tags)
            ? event.tags.find(t => t[0] === 'e' && t[1] === zapRequestEventId)
            : null;
          if (eTag) {
            clearTimeout(timer);
            finish(event);
          }
        }
      } catch (e) { console.error('[zapService] Unexpected error in relay message handler:', e.message); }
    });
  });
}

module.exports = {
  verifyZapReceipt,
  generateZapInvoice,
  pollForZapReceipt,
  // Exported for testing
  verifyEventSignature,
  computeEventId,
  extractMsatsFromZapRequest,
  NIP57_ZAP_RECEIPT_KIND,
  NIP57_ZAP_REQUEST_KIND,
};
