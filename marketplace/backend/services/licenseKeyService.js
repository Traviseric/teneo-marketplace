const crypto = require('crypto');
const db = require('../database/database');

/**
 * Generates a formatted license key: XXXX-XXXX-XXXX-XXXX (UUID-based, uppercase hex).
 */
function generateKey() {
  const raw = crypto.randomBytes(8).toString('hex').toUpperCase();
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
}

/**
 * Creates a new license key record for a completed order.
 * @returns {Promise<{key: string}>}
 */
async function createLicenseKey(orderId, productId, email, maxActivations = 3) {
  const key = generateKey();
  await db.run(
    `INSERT INTO license_keys (key, order_id, product_id, customer_email, max_activations)
     VALUES (?, ?, ?, ?, ?)`,
    [key, orderId, productId, email, maxActivations]
  );
  return { key };
}

/**
 * Validates a license key.
 * @returns {Promise<{valid: boolean, product_id?, email_masked?, activations?, max_activations?, activations_left?}>}
 */
async function validateKey(key) {
  const row = await db.get(
    `SELECT * FROM license_keys WHERE key = ?`,
    [key]
  );
  if (!row) return { valid: false };
  if (!row.active || row.revoked_at) return { valid: false, reason: 'revoked' };

  const emailParts = row.customer_email.split('@');
  const emailMasked = emailParts[0].slice(0, 2) + '***@' + emailParts[1];

  return {
    valid: true,
    product_id: row.product_id,
    email_masked: emailMasked,
    activations: row.activations,
    max_activations: row.max_activations,
    activations_left: Math.max(0, row.max_activations - row.activations),
  };
}

/**
 * Increments the activation counter, enforcing max_activations limit.
 * @returns {Promise<{success: boolean, activations_left?: number, error?: string}>}
 */
async function activateKey(key) {
  const row = await db.get(`SELECT * FROM license_keys WHERE key = ?`, [key]);
  if (!row) return { success: false, error: 'Invalid license key' };
  if (!row.active || row.revoked_at) return { success: false, error: 'License key has been revoked' };
  if (row.activations >= row.max_activations) {
    return { success: false, error: `Activation limit reached (${row.max_activations} max)` };
  }

  await db.run(
    `UPDATE license_keys SET activations = activations + 1 WHERE key = ?`,
    [key]
  );

  return {
    success: true,
    activations_left: Math.max(0, row.max_activations - row.activations - 1),
  };
}

/**
 * Revokes a license key, preventing further use or activations.
 */
async function revokeKey(key) {
  const result = await db.run(
    `UPDATE license_keys SET active = 0, revoked_at = datetime('now') WHERE key = ?`,
    [key]
  );
  return { success: true };
}

/**
 * Lists all license keys (for admin panel).
 */
async function listKeys({ limit = 100, offset = 0, email, productId } = {}) {
  let sql = `SELECT * FROM license_keys`;
  const params = [];
  const conditions = [];

  if (email) {
    conditions.push(`customer_email = ?`);
    params.push(email);
  }
  if (productId) {
    conditions.push(`product_id = ?`);
    params.push(productId);
  }
  if (conditions.length) sql += ` WHERE ${conditions.join(' AND ')}`;
  sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  return db.all(sql, params);
}

/**
 * Gets all license keys for a specific order.
 */
async function getKeysForOrder(orderId) {
  return db.all(`SELECT * FROM license_keys WHERE order_id = ?`, [orderId]);
}

module.exports = {
  generateKey,
  createLicenseKey,
  validateKey,
  activateKey,
  revokeKey,
  listKeys,
  getKeysForOrder,
};
