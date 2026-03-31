'use strict';

const express = require('express');
const router = express.Router();
const printfulProvider = require('../services/printfulFulfillmentProvider');
const manualProvider = require('../services/manualFulfillmentProvider');

/**
 * Middleware: require authenticated user session.
 * Uses req.session.userId as the merchantId.
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.isAuthenticated || !req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  req.merchantId = req.session.userId;
  next();
}

// ─── Connect Printful ───────────────────────────────────

/**
 * POST /api/merchant/fulfillment/connect
 * Body: { provider: "printful"|"manual", apiKey?: "...", storeId?: "..." }
 *
 * For "printful": validates API key, encrypts + stores credentials, auto-imports products.
 * For "manual": just marks the connection (no external API).
 */
router.post('/connect', requireAuth, async (req, res) => {
  try {
    const { provider, apiKey, storeId } = req.body;

    // Manual fulfillment — no API key needed
    if (provider === 'manual') {
      await manualProvider.connect(req.merchantId);
      return res.json({ ok: true, provider: 'manual' });
    }

    if (provider !== 'printful') {
      return res.status(400).json({ error: `Unsupported provider: ${provider}. Supported: "printful", "manual".` });
    }
    if (!apiKey) {
      return res.status(400).json({ error: 'apiKey is required' });
    }

    // Derive public base URL for webhook registration
    const webhookBaseUrl = process.env.PUBLIC_URL
      || process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`
      || `${req.protocol}://${req.get('host')}`;

    // Validate + store credentials + auto-register webhook
    const connectResult = await printfulProvider.connect(
      req.merchantId,
      { apiKey, storeId: storeId || undefined },
      { webhookBaseUrl },
    );

    // Auto-import products
    let products = [];
    try {
      products = await printfulProvider.importProducts(req.merchantId);
    } catch (importErr) {
      console.error('[Merchant Fulfillment] Product import failed (connection still saved):', importErr.message);
    }

    return res.json({
      ok: true,
      provider: 'printful',
      storeName: connectResult.storeName,
      storeId: connectResult.storeId,
      webhookRegistered: connectResult.webhookRegistered || false,
      productsImported: products.length,
      products,
    });
  } catch (error) {
    console.error('[Merchant Fulfillment] Connect error:', error.message);
    const status = error.response?.status === 401 ? 401 : 500;
    const message = error.response?.status === 401
      ? 'Invalid Printful API key'
      : error.message || 'Failed to connect fulfillment provider';
    return res.status(status).json({ error: message });
  }
});

// ─── Connection status ──────────────────────────────────

/**
 * GET /api/merchant/fulfillment/status
 * Returns connection state for each provider.
 */
router.get('/status', requireAuth, async (req, res) => {
  try {
    const db = require('../database/database');
    const rows = await db.all(
      'SELECT provider, is_active, connected_at, last_sync_at, product_count FROM merchant_fulfillment_providers WHERE merchant_id = ?',
      [req.merchantId],
    );

    const providers = {};
    for (const r of rows) {
      providers[r.provider] = {
        connected: Boolean(r.is_active),
        connectedAt: r.connected_at,
        lastSyncAt: r.last_sync_at,
        productCount: r.product_count || 0,
      };
    }

    return res.json({
      ok: true,
      providers,
      printful: providers.printful || { connected: false },
    });
  } catch (error) {
    console.error('[Merchant Fulfillment] Status error:', error.message);
    return res.status(500).json({ error: 'Failed to get fulfillment status' });
  }
});

// ─── Disconnect ─────────────────────────────────────────

/**
 * DELETE /api/merchant/fulfillment/disconnect
 * Body: { provider: "printful"|"manual" }
 */
router.delete('/disconnect', requireAuth, async (req, res) => {
  try {
    const { provider } = req.body;
    if (provider === 'manual') {
      await manualProvider.disconnect(req.merchantId);
      return res.json({ ok: true, provider: 'manual', disconnected: true });
    }
    if (provider !== 'printful') {
      return res.status(400).json({ error: 'Unsupported provider' });
    }

    await printfulProvider.disconnect(req.merchantId);
    return res.json({ ok: true, provider: 'printful', disconnected: true });
  } catch (error) {
    console.error('[Merchant Fulfillment] Disconnect error:', error.message);
    return res.status(500).json({ error: 'Failed to disconnect' });
  }
});

// ─── List synced products ───────────────────────────────

/**
 * GET /api/merchant/fulfillment/products
 */
router.get('/products', requireAuth, async (req, res) => {
  try {
    const db = require('../database/database');
    const rows = await db.all(
      'SELECT * FROM fulfillment_products WHERE merchant_id = ? AND provider = ? ORDER BY name',
      [req.merchantId, 'printful'],
    );

    const products = rows.map((r) => ({
      id: r.id,
      externalProductId: r.external_product_id,
      name: r.name,
      thumbnailUrl: r.thumbnail_url,
      retailPrice: r.retail_price,
      retailPriceSats: r.retail_price_sats,
      isActive: Boolean(r.is_active),
      syncedAt: r.synced_at,
      variants: typeof r.variants === 'string' ? JSON.parse(r.variants) : (r.variants || []),
    }));

    return res.json({ ok: true, products });
  } catch (error) {
    console.error('[Merchant Fulfillment] List products error:', error.message);
    return res.status(500).json({ error: 'Failed to list products' });
  }
});

// ─── Update product pricing ─────────────────────────────

/**
 * PUT /api/merchant/fulfillment/products/:id
 * Body: { retailPrice?: number, retailPriceSats?: number, isActive?: boolean }
 */
router.put('/products/:id', requireAuth, async (req, res) => {
  try {
    const db = require('../database/database');
    const { id } = req.params;
    const { retailPrice, retailPriceSats, isActive } = req.body;

    // Verify ownership
    const product = await db.get(
      'SELECT id FROM fulfillment_products WHERE id = ? AND merchant_id = ?',
      [id, req.merchantId],
    );
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const sets = [];
    const params = [];

    if (retailPrice !== undefined) {
      sets.push('retail_price = ?');
      params.push(retailPrice);
    }
    if (retailPriceSats !== undefined) {
      sets.push('retail_price_sats = ?');
      params.push(retailPriceSats);
    }
    if (isActive !== undefined) {
      sets.push('is_active = ?');
      params.push(isActive ? 1 : 0);
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id, req.merchantId);
    await db.run(
      `UPDATE fulfillment_products SET ${sets.join(', ')} WHERE id = ? AND merchant_id = ?`,
      params,
    );

    return res.json({ ok: true, updated: true });
  } catch (error) {
    console.error('[Merchant Fulfillment] Update product error:', error.message);
    return res.status(500).json({ error: 'Failed to update product' });
  }
});

// ─── Re-sync products ───────────────────────────────────

/**
 * POST /api/merchant/fulfillment/sync
 */
router.post('/sync', requireAuth, async (req, res) => {
  try {
    const connected = await printfulProvider.isConnected(req.merchantId);
    if (!connected) {
      return res.status(400).json({ error: 'Printful not connected. Call /connect first.' });
    }

    const products = await printfulProvider.importProducts(req.merchantId);
    return res.json({ ok: true, productsImported: products.length, products });
  } catch (error) {
    console.error('[Merchant Fulfillment] Sync error:', error.message);
    return res.status(500).json({ error: 'Failed to sync products' });
  }
});

// ─── Create fulfillment order ───────────────────────────

/**
 * POST /api/merchant/fulfillment/order
 * Body: { orderId, items: [{ sync_variant_id, quantity }], shippingAddress: { name, address1, city, country_code, zip, ... } }
 */
router.post('/order', requireAuth, async (req, res) => {
  try {
    const { orderId, items, variantId, quantity, shippingAddress, confirm } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }
    if (!shippingAddress) {
      return res.status(400).json({ error: 'shippingAddress is required' });
    }
    if (!items && !variantId) {
      return res.status(400).json({ error: 'items or variantId is required' });
    }

    const result = await printfulProvider.createOrder({
      merchantId: req.merchantId,
      orderId,
      items,
      variantId,
      quantity,
      shippingAddress,
      confirm: confirm !== false,
    });

    return res.json({ ok: true, ...result });
  } catch (error) {
    console.error('[Merchant Fulfillment] Create order error:', error.message);
    return res.status(500).json({ error: error.message || 'Failed to create fulfillment order' });
  }
});

// ─── List fulfillment orders ────────────────────────────

/**
 * GET /api/merchant/fulfillment/orders
 */
router.get('/orders', requireAuth, async (req, res) => {
  try {
    const db = require('../database/database');
    const rows = await db.all(
      'SELECT * FROM fulfillment_orders WHERE merchant_id = ? ORDER BY created_at DESC LIMIT 100',
      [req.merchantId],
    );

    const orders = rows.map((r) => ({
      id: r.id,
      orderId: r.order_id,
      externalOrderId: r.external_order_id,
      status: r.status,
      trackingNumber: r.tracking_number,
      trackingUrl: r.tracking_url,
      carrier: r.carrier,
      recipient: typeof r.recipient === 'string' ? JSON.parse(r.recipient) : r.recipient,
      items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    return res.json({ ok: true, orders });
  } catch (error) {
    console.error('[Merchant Fulfillment] List orders error:', error.message);
    return res.status(500).json({ error: 'Failed to list orders' });
  }
});

// ─── Mark order shipped (manual fulfillment) ────────────

/**
 * POST /api/merchant/fulfillment/orders/:orderId/ship
 * Body: { trackingNumber?, trackingUrl?, carrier? }
 *
 * For manual fulfillment orders — merchant marks them as shipped.
 */
router.post('/orders/:orderId/ship', requireAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { trackingNumber, trackingUrl, carrier } = req.body;

    const result = await manualProvider.markShipped(req.merchantId, orderId, {
      trackingNumber,
      trackingUrl,
      carrier,
    });

    if (!result.updated) {
      return res.status(404).json({ error: 'Order not found or not a manual fulfillment order' });
    }

    return res.json({ ok: true, orderId, status: 'shipped' });
  } catch (error) {
    console.error('[Merchant Fulfillment] Mark shipped error:', error.message);
    return res.status(500).json({ error: 'Failed to mark order as shipped' });
  }
});

// ─── Shipping rate estimator ────────────────────────────

/**
 * POST /api/merchant/fulfillment/shipping-rates
 * Body: { recipient: { address1, city, country_code, zip, state_code? }, items: [{ sync_variant_id, quantity }] }
 *
 * Public-facing (no auth) so checkout pages can call it for any merchant.
 * Requires merchantId in query: ?merchantId=xxx
 */
router.post('/shipping-rates', async (req, res) => {
  try {
    const merchantId = req.query.merchantId || req.body.merchantId;
    if (!merchantId) {
      return res.status(400).json({ error: 'merchantId query param is required' });
    }

    const { recipient, items } = req.body;
    if (!recipient || !recipient.country_code) {
      return res.status(400).json({ error: 'recipient with country_code is required' });
    }
    if (!items || !items.length) {
      return res.status(400).json({ error: 'items array is required' });
    }

    const rates = await printfulProvider.estimateShippingRates({
      merchantId,
      recipient,
      items,
    });

    return res.json({
      ok: true,
      rates: (rates || []).map((r) => ({
        id: r.id,
        name: r.name,
        rate: r.rate,
        currency: r.currency,
        minDeliveryDays: r.minDeliveryDays,
        maxDeliveryDays: r.maxDeliveryDays,
      })),
    });
  } catch (error) {
    console.error('[Merchant Fulfillment] Shipping rates error:', error.message);
    return res.status(500).json({ error: 'Failed to estimate shipping rates' });
  }
});

module.exports = router;
