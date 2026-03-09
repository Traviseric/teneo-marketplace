/**
 * orderBumpService — fetches and validates order bump offers.
 * Order bumps are "add this for $X" upsell offers shown on the checkout page.
 */
const db = require('../database/database');

/**
 * Get the active order bump for a given product.
 * Returns the most specific (product-specific) bump first, then global bump.
 * @param {string|null} productId
 * @returns {Promise<object|null>}
 */
async function getBumpForProduct(productId) {
  try {
    // Try product-specific bump first
    if (productId) {
      const specific = await db.get(
        'SELECT * FROM order_bumps WHERE trigger_product_id = ? AND active = 1 LIMIT 1',
        [productId]
      );
      if (specific) return specific;
    }
    // Fall back to global bump (trigger_product_id IS NULL)
    const global = await db.get(
      'SELECT * FROM order_bumps WHERE trigger_product_id IS NULL AND active = 1 LIMIT 1'
    );
    return global || null;
  } catch (err) {
    console.error('[orderBumpService] getBumpForProduct error:', err.message);
    return null;
  }
}

/**
 * Get a bump by ID (used for server-side price validation at checkout).
 * @param {number} id
 */
async function getBumpById(id) {
  try {
    return await db.get('SELECT * FROM order_bumps WHERE id = ? AND active = 1', [id]);
  } catch (err) {
    console.error('[orderBumpService] getBumpById error:', err.message);
    return null;
  }
}

/**
 * Create a new order bump.
 */
async function createBump(data) {
  const { trigger_product_id, bump_product_name, bump_description, bump_price, bump_stripe_price_id } = data;
  if (!bump_product_name || bump_price == null) {
    throw new Error('bump_product_name and bump_price are required');
  }
  const result = await db.run(
    `INSERT INTO order_bumps (trigger_product_id, bump_product_name, bump_description, bump_price, bump_stripe_price_id)
     VALUES (?, ?, ?, ?, ?)`,
    [trigger_product_id || null, bump_product_name, bump_description || null, Number(bump_price), bump_stripe_price_id || null]
  );
  return { id: result.lastID };
}

/** List all order bumps (admin). */
async function listBumps() {
  return db.all('SELECT * FROM order_bumps ORDER BY created_at DESC');
}

/** Deactivate an order bump (admin). */
async function deactivateBump(id) {
  await db.run('UPDATE order_bumps SET active = 0 WHERE id = ?', [id]);
}

module.exports = { getBumpForProduct, getBumpById, createBump, listBumps, deactivateBump };
