'use strict';

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

/**
 * Returns the 32-byte encryption key derived from FULFILLMENT_ENCRYPTION_KEY env var.
 * If the env var is a 64-char hex string it is used directly; otherwise it is
 * SHA-256 hashed to produce a deterministic 32-byte key.
 */
function getKey() {
  const raw = process.env.FULFILLMENT_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('FULFILLMENT_ENCRYPTION_KEY env var is required for credential storage');
  }
  if (/^[0-9a-f]{64}$/i.test(raw)) {
    return Buffer.from(raw, 'hex');
  }
  return crypto.createHash('sha256').update(raw).digest();
}

/**
 * Encrypt a plaintext string with AES-256-GCM.
 * Returns a hex-encoded string: iv + ciphertext + authTag.
 */
function encrypt(plaintext) {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, encrypted, tag]).toString('hex');
}

/**
 * Decrypt a hex-encoded AES-256-GCM payload back to plaintext.
 */
function decrypt(hex) {
  const key = getKey();
  const buf = Buffer.from(hex, 'hex');

  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(buf.length - TAG_LENGTH);
  const ciphertext = buf.subarray(IV_LENGTH, buf.length - TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return decipher.update(ciphertext, undefined, 'utf8') + decipher.final('utf8');
}

/**
 * Encrypt a credentials object (e.g. { apiKey, storeId }).
 * Stores non-secret fields in cleartext, encrypts only the apiKey.
 */
function encryptCredentials(credentials) {
  if (!credentials || !credentials.apiKey) {
    throw new Error('credentials.apiKey is required');
  }
  return JSON.stringify({
    apiKey_encrypted: encrypt(credentials.apiKey),
    storeId: credentials.storeId || null,
    webhookSecret: credentials.webhookSecret ? encrypt(credentials.webhookSecret) : null,
  });
}

/**
 * Decrypt a stored credentials JSON string back to { apiKey, storeId, webhookSecret }.
 */
function decryptCredentials(json) {
  const obj = typeof json === 'string' ? JSON.parse(json) : json;
  return {
    apiKey: decrypt(obj.apiKey_encrypted),
    storeId: obj.storeId || null,
    webhookSecret: obj.webhookSecret ? decrypt(obj.webhookSecret) : null,
  };
}

module.exports = { encrypt, decrypt, encryptCredentials, decryptCredentials };
