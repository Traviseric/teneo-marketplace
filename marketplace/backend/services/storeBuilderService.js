'use strict';

/**
 * storeBuilderService — persistence layer for the AI Store Builder.
 *
 * Wraps all DB operations for stores, products, and subscribers so routes
 * stay thin and the logic is testable in isolation.
 */

const { randomUUID } = require('crypto');
const db = require('../database/database');

// ──────────────────────────────────────────────────
// Slug helpers
// ──────────────────────────────────────────────────

/**
 * Convert an arbitrary string to a URL-safe slug.
 * e.g. "My Candle Shop!" → "my-candle-shop"
 */
function toSlug(str) {
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Return a slug that is unique within the stores table.
 * Appends the first 8 chars of a UUID if the base slug is already taken.
 *
 * @param {string} base  - derived from store name
 * @returns {Promise<string>}
 */
async function uniqueSlug(base) {
  const candidate = base || 'store';
  const existing = await db.get('SELECT id FROM stores WHERE slug = ?', [candidate]);
  if (!existing) return candidate;
  return `${candidate}-${randomUUID().slice(0, 8)}`;
}

// ──────────────────────────────────────────────────
// Store CRUD
// ──────────────────────────────────────────────────

/**
 * Persist a new store record.
 *
 * @param {object} storeConfig   - AI-generated store config (must have .name)
 * @param {string|null} html     - pre-rendered HTML (optional, generated on demand if absent)
 * @param {string|null} userId   - authenticated user id
 * @param {string|null} providedSlug - explicit slug override (optional)
 * @returns {Promise<{storeId: string, slug: string, url: string}>}
 */
async function saveStore(storeConfig, html = null, userId = null, providedSlug = null) {
  if (!storeConfig || !storeConfig.name) {
    throw new Error('storeConfig.name is required');
  }

  const storeId = randomUUID();
  const baseSlug = toSlug(storeConfig.name);
  const slug = providedSlug || (await uniqueSlug(baseSlug + '-' + storeId.slice(0, 8)));

  await db.run(
    'INSERT INTO stores (id, user_id, slug, config, html, status) VALUES (?, ?, ?, ?, ?, ?)',
    [storeId, userId, slug, JSON.stringify(storeConfig), html, 'draft']
  );

  return { storeId, slug, url: `/store/${slug}` };
}

/**
 * Bulk-insert products for a store.
 * Skips products with missing name/price.
 *
 * @param {string}   storeId
 * @param {object[]} products  - array of { name, price, description?, type? }
 * @returns {Promise<number>}  count of inserted products
 */
async function saveProducts(storeId, products = []) {
  let inserted = 0;
  for (const product of products) {
    if (!product || !product.name || product.price == null) continue;
    await db.run(
      'INSERT INTO store_products (id, store_id, name, price, description, type) VALUES (?, ?, ?, ?, ?, ?)',
      [
        randomUUID(),
        storeId,
        product.name,
        product.price,
        product.description || '',
        product.type || 'digital',
      ]
    );
    inserted++;
  }
  return inserted;
}

/**
 * Fetch a published store by slug.
 * Returns { id, slug, config, html, status, created_at } or null.
 *
 * @param {string} slug
 * @returns {Promise<object|null>}
 */
async function getStoreBySlug(slug) {
  const store = await db.get(
    "SELECT id, slug, config, html, status, created_at FROM stores WHERE slug = ? AND status = 'published'",
    [slug]
  );
  if (!store) return null;

  let config = store.config;
  try {
    config = typeof config === 'string' ? JSON.parse(config) : config;
  } catch (_) { /* leave raw */ }

  return { ...store, config };
}

/**
 * Fetch any store by slug (including drafts) for owner access.
 *
 * @param {string} slug
 * @returns {Promise<object|null>}
 */
async function getStoreBySlugAny(slug) {
  const store = await db.get(
    'SELECT id, slug, config, html, status, user_id, created_at, updated_at FROM stores WHERE slug = ?',
    [slug]
  );
  if (!store) return null;

  let config = store.config;
  try {
    config = typeof config === 'string' ? JSON.parse(config) : config;
  } catch (_) { /* leave raw */ }

  return { ...store, config };
}

/**
 * List stores belonging to a user.
 *
 * @param {string} userId
 * @returns {Promise<object[]>}
 */
async function listStoresByUser(userId) {
  return db.all(
    'SELECT id, slug, status, created_at, updated_at FROM stores WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );
}

/**
 * Fetch a store by id and userId (ownership check).
 *
 * @param {string} storeId
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
async function getStoreById(storeId, userId) {
  const store = await db.get(
    'SELECT * FROM stores WHERE id = ? AND user_id = ?',
    [storeId, userId]
  );
  if (!store) return null;

  let config = store.config;
  try {
    config = typeof config === 'string' ? JSON.parse(config) : config;
  } catch (_) { /* leave raw */ }

  return { ...store, config };
}

// ──────────────────────────────────────────────────
// Subscriber capture
// ──────────────────────────────────────────────────

/**
 * Add an email subscriber for a store.
 * Silently ignores duplicate (store_id, email) pairs.
 *
 * @param {string} storeId
 * @param {string} email
 * @param {object} [opts]
 * @param {string} [opts.name]
 * @param {string} [opts.source]  defaults to 'storefront'
 * @returns {Promise<{id: string}>}
 */
async function addSubscriber(storeId, email, { name = null, source = 'storefront' } = {}) {
  const id = randomUUID().replace(/-/g, '');
  try {
    await db.run(
      'INSERT INTO store_subscribers (id, store_id, email, name, source) VALUES (?, ?, ?, ?, ?)',
      [id, storeId, email.toLowerCase().trim(), name, source]
    );
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint')) {
      // Already subscribed — not an error
      const existing = await db.get(
        'SELECT id FROM store_subscribers WHERE store_id = ? AND email = ?',
        [storeId, email.toLowerCase().trim()]
      );
      return { id: existing ? existing.id : id, alreadySubscribed: true };
    }
    throw err;
  }
  return { id };
}

/**
 * List subscribers for a store.
 *
 * @param {string} storeId
 * @returns {Promise<object[]>}
 */
async function listSubscribers(storeId) {
  return db.all(
    'SELECT id, email, name, source, status, created_at FROM store_subscribers WHERE store_id = ? ORDER BY created_at DESC',
    [storeId]
  );
}

// ──────────────────────────────────────────────────
// Exports
// ──────────────────────────────────────────────────

module.exports = {
  toSlug,
  uniqueSlug,
  saveStore,
  saveProducts,
  getStoreBySlug,
  getStoreBySlugAny,
  listStoresByUser,
  getStoreById,
  addSubscriber,
  listSubscribers,
};
