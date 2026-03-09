/**
 * NIP-98 HTTP Auth Middleware
 *
 * Standalone middleware for authenticating stateless/headless API clients
 * using Nostr NIP-98 signed events (kind 27235).
 *
 * Usage:
 *   const { requireNip98Auth } = require('../auth/nip98');
 *   router.get('/protected', requireNip98Auth, handler);
 *
 * Client must include:
 *   Authorization: Nostr <base64-encoded NIP-98 event JSON>
 *
 * Spec: https://github.com/nostr-protocol/nips/blob/master/98.md
 */

const { schnorr } = require('@noble/curves/secp256k1');
const { sha256 } = require('@noble/hashes/sha256');
const { utf8ToBytes, bytesToHex } = require('@noble/hashes/utils');

const NIP98_KIND = 27235;
const MAX_EVENT_AGE_SEC = 60;

/**
 * Parse base64-encoded NIP-98 Authorization header value.
 * Header format: "Nostr <base64>"
 *
 * @param {string} header - raw Authorization header value
 * @returns {object} parsed Nostr event
 */
function parseAuthHeader(header) {
  if (!header || typeof header !== 'string') {
    throw new Error('Missing Authorization header');
  }

  const [scheme, token] = header.split(' ');
  if (scheme !== 'Nostr' || !token) {
    throw new Error('Authorization header must use "Nostr" scheme');
  }

  let json;
  try {
    json = Buffer.from(token, 'base64').toString('utf8');
  } catch (_) {
    throw new Error('Authorization token is not valid base64');
  }

  try {
    return JSON.parse(json);
  } catch (_) {
    throw new Error('Authorization token is not valid JSON after base64 decode');
  }
}

/**
 * Validate NIP-98 event structure: kind, pubkey, sig, id, freshness, URL, method.
 *
 * @param {object} event - decoded Nostr event
 * @param {string|null} expectedUrl - full URL of the request (null to skip check)
 * @param {string|null} expectedMethod - HTTP method (null to skip check)
 */
function validateEventStructure(event, expectedUrl, expectedMethod) {
  if (!event || typeof event !== 'object') {
    throw new Error('NIP-98 event is not an object');
  }
  if (event.kind !== NIP98_KIND) {
    throw new Error(`NIP-98 event kind must be ${NIP98_KIND}, got ${event.kind}`);
  }
  if (!event.pubkey || !/^[0-9a-f]{64}$/i.test(event.pubkey)) {
    throw new Error('NIP-98 pubkey must be a 64-character hex string');
  }
  if (!event.sig || !/^[0-9a-f]{128}$/i.test(event.sig)) {
    throw new Error('NIP-98 sig must be a 128-character hex string');
  }
  if (!event.id || !/^[0-9a-f]{64}$/i.test(event.id)) {
    throw new Error('NIP-98 id must be a 64-character hex string');
  }

  // Freshness — reject events older than MAX_EVENT_AGE_SEC (replay prevention)
  const now = Math.floor(Date.now() / 1000);
  const age = Math.abs(now - event.created_at);
  if (age > MAX_EVENT_AGE_SEC) {
    throw new Error(`NIP-98 event expired (age: ${age}s, max: ${MAX_EVENT_AGE_SEC}s)`);
  }

  // URL tag
  if (expectedUrl) {
    const urlTag = Array.isArray(event.tags) && event.tags.find(t => t[0] === 'u');
    if (!urlTag || urlTag[1] !== expectedUrl) {
      throw new Error('NIP-98 URL tag does not match request URL');
    }
  }

  // Method tag
  if (expectedMethod) {
    const methodTag = Array.isArray(event.tags) && event.tags.find(t => t[0] === 'method');
    if (!methodTag || methodTag[1] !== expectedMethod.toUpperCase()) {
      throw new Error('NIP-98 method tag does not match request method');
    }
  }
}

/**
 * Verify the Schnorr signature on a Nostr event.
 * 1. Recompute canonical event ID (SHA256 of serialized array)
 * 2. Check event.id matches computed hash
 * 3. Verify Schnorr sig with @noble/curves
 *
 * @param {object} event
 */
function verifySignature(event) {
  const serialized = JSON.stringify([
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content,
  ]);

  const computedId = bytesToHex(sha256(utf8ToBytes(serialized)));

  if (event.id !== computedId) {
    throw new Error('NIP-98 event ID mismatch — possible tampering');
  }

  const isValid = schnorr.verify(event.sig, event.id, event.pubkey);
  if (!isValid) {
    throw new Error('NIP-98 Schnorr signature is invalid');
  }
}

/**
 * verifyNip98Auth — parse, validate, and verify a NIP-98 HTTP auth event.
 *
 * @param {object} req - Express request object
 * @returns {{ valid: true, pubkey: string } | { valid: false, error: string }}
 */
function verifyNip98Auth(req) {
  try {
    const authHeader = req.headers['authorization'];
    const event = parseAuthHeader(authHeader);

    // Build expected URL from request
    const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const expectedUrl = host ? `${protocol}://${host}${req.originalUrl}` : null;

    validateEventStructure(event, expectedUrl, req.method);
    verifySignature(event);

    return { valid: true, pubkey: event.pubkey };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

/**
 * requireNip98Auth — Express middleware that enforces NIP-98 HTTP auth.
 *
 * On success: sets req.nostrPubkey and calls next().
 * On failure: responds 401 with error message.
 *
 * Apply to any route that should accept stateless Nostr auth:
 *   router.post('/protected', requireNip98Auth, handler);
 */
function requireNip98Auth(req, res, next) {
  const result = verifyNip98Auth(req);
  if (!result.valid) {
    return res.status(401).json({
      error: 'NIP-98 authentication required',
      message: result.error,
    });
  }
  req.nostrPubkey = result.pubkey;
  next();
}

module.exports = {
  verifyNip98Auth,
  requireNip98Auth,
  // Exported for testing
  parseAuthHeader,
  validateEventStructure,
  verifySignature,
  NIP98_KIND,
  MAX_EVENT_AGE_SEC,
};
