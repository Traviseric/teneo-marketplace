/**
 * nostrService.js — NIP-99 Product Listing Publisher
 *
 * Publishes OpenBazaar.ai products as Nostr kind 30402 classified listing events,
 * making them discoverable across the Nostr network.
 *
 * Spec: https://github.com/nostr-protocol/nips/blob/master/99.md
 *
 * Requires:
 *   NOSTR_PRIVATE_KEY  - 64-char hex private key for signing events
 *   NOSTR_RELAYS       - comma-separated WSS relay URLs
 *                        defaults to a set of well-known public relays
 */

const { schnorr } = require('@noble/curves/secp256k1');
const { sha256 } = require('@noble/hashes/sha256');
const { utf8ToBytes, bytesToHex, hexToBytes } = require('@noble/hashes/utils');
const WebSocket = require('ws');

const NIP99_KIND = 30402;

const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.nostr.band',
];

/**
 * Compute the canonical Nostr event ID (SHA256 of serialized array).
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
 * Sign a Nostr event with the given private key.
 *
 * @param {object} event - unsigned event (without id/sig)
 * @param {Uint8Array} privKey - 32-byte private key
 * @returns {object} signed event with id and sig
 */
function signEvent(event, privKey) {
  const pubkey = bytesToHex(schnorr.getPublicKey(privKey));
  const signed = { ...event, pubkey };
  signed.id = computeEventId(signed);
  signed.sig = bytesToHex(schnorr.sign(signed.id, privKey));
  return signed;
}

/**
 * Publish a signed event to a single relay over WebSocket.
 * Returns a promise that resolves to { relay, success, error }.
 * Times out after 10 seconds.
 *
 * @param {string} relayUrl
 * @param {object} event - signed Nostr event
 */
function publishToRelay(relayUrl, event) {
  return new Promise((resolve) => {
    let ws;
    const timeout = setTimeout(() => {
      if (ws) ws.terminate();
      resolve({ relay: relayUrl, success: false, error: 'timeout' });
    }, 10000);

    try {
      ws = new WebSocket(relayUrl);
    } catch (err) {
      clearTimeout(timeout);
      return resolve({ relay: relayUrl, success: false, error: err.message });
    }

    ws.on('open', () => {
      ws.send(JSON.stringify(['EVENT', event]));
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        // NIP-01: ["OK", event_id, accepted, message]
        if (Array.isArray(msg) && msg[0] === 'OK') {
          clearTimeout(timeout);
          ws.close();
          resolve({ relay: relayUrl, success: msg[2] === true, error: msg[2] ? null : msg[3] });
        }
      } catch (_) {
        // Ignore non-JSON messages
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      resolve({ relay: relayUrl, success: false, error: err.message });
    });
  });
}

/**
 * Build a NIP-99 kind 30402 classified listing event for a product.
 *
 * @param {object} product - product from catalog.json
 * @param {object} brandConfig - brand config.json { id, name, ... }
 * @param {string} storeUrl - base URL of the storefront (e.g. https://openbazaar.ai)
 * @returns {object} unsigned Nostr event
 */
function buildProductEvent(product, brandConfig, storeUrl) {
  const brandId = brandConfig.id || brandConfig.brand_id || 'default';
  const listingUrl = `${storeUrl}/store/${brandId}`;
  const now = Math.floor(Date.now() / 1000);

  const tags = [
    ['d', String(product.id)],
    ['title', product.title || product.name || ''],
    ['summary', product.description || product.summary || ''],
    ['published_at', String(now)],
    ['location', listingUrl],
    ['price', String(product.price || '0'), 'USD'],
  ];

  if (product.category) tags.push(['t', product.category]);
  if (product.cover_image || product.image_url) {
    tags.push(['image', product.cover_image || product.image_url]);
  }
  if (product.author) tags.push(['author', product.author]);

  return {
    kind: NIP99_KIND,
    created_at: now,
    tags,
    content: product.description || '',
  };
}

/**
 * publishProductListing — create, sign, and publish a single product as a NIP-99 event.
 *
 * @param {object} product - product object from catalog.json
 * @param {object} brandConfig - brand config
 * @param {object} [options]
 * @param {string} [options.storeUrl] - base URL override
 * @returns {Promise<{ event: object, results: Array }>}
 */
async function publishProductListing(product, brandConfig, options = {}) {
  const privKeyHex = process.env.NOSTR_PRIVATE_KEY;
  if (!privKeyHex) {
    console.warn('[nostrService] NOSTR_PRIVATE_KEY not set — skipping publish');
    return { event: null, results: [], skipped: true };
  }

  const storeUrl = options.storeUrl || process.env.STORE_URL || 'https://openbazaar.ai';
  const relays = (process.env.NOSTR_RELAYS || '')
    .split(',')
    .map(r => r.trim())
    .filter(Boolean);
  const relayList = relays.length > 0 ? relays : DEFAULT_RELAYS;

  const unsigned = buildProductEvent(product, brandConfig, storeUrl);
  const privKey = hexToBytes(privKeyHex);
  const event = signEvent(unsigned, privKey);

  const results = await Promise.all(relayList.map(relay => publishToRelay(relay, event)));
  const published = results.filter(r => r.success).length;

  console.log(`[nostrService] Published product "${product.title}" to ${published}/${relayList.length} relays`);

  return { event, results };
}

/**
 * publishAllProducts — publish all products from the given catalog to Nostr.
 *
 * @param {Array} products - array of product objects
 * @param {object} brandConfig
 * @param {object} [options]
 * @returns {Promise<Array>} results per product
 */
async function publishAllProducts(products, brandConfig, options = {}) {
  if (!process.env.NOSTR_PRIVATE_KEY) {
    console.warn('[nostrService] NOSTR_PRIVATE_KEY not set — skipping bulk publish');
    return [];
  }

  const results = [];
  for (const product of products) {
    try {
      const result = await publishProductListing(product, brandConfig, options);
      results.push({ productId: product.id, ...result });
    } catch (err) {
      console.error(`[nostrService] Failed to publish product ${product.id}:`, err.message);
      results.push({ productId: product.id, error: err.message });
    }
  }
  return results;
}

module.exports = {
  publishProductListing,
  publishAllProducts,
  buildProductEvent,
  signEvent,
  // Exported for testing
  computeEventId,
  NIP99_KIND,
};
