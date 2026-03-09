/**
 * Machine-Payable Endpoints — AI agent commerce API.
 *
 * Allows AI agents to autonomously browse, pay, and receive digital products
 * using Lightning invoices (via ArxMint) without human interaction.
 *
 * Endpoints:
 *   GET  /api/machine/catalog               - Product catalog with sat pricing
 *   POST /api/machine/order                 - Create Lightning invoice for product
 *   GET  /api/machine/order/:id/status      - Poll order status + download URL
 *   POST /api/machine/webhook               - Payment confirmation callback
 *
 * Auth:
 *   POST /api/machine/order requires NIP-98 HTTP auth (X-Agent-Auth header accepted too)
 *
 * Rate limits:
 *   Authenticated agents: 60 req/min
 *   Anonymous (catalog/status): 30 req/min
 */

'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const crypto = require('crypto');
const arxmintProvider = require('../services/arxmintProvider');
const OrderService = require('../services/orderService');
const { requireNip98Auth } = require('../auth/nip98');

const orderService = new OrderService();

// ---------------------------------------------------------------------------
// Rate limiters
// ---------------------------------------------------------------------------

const catalogLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded — 30 req/min for anonymous catalog access' },
});

const orderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded — 60 req/min for authenticated order creation' },
});

// ---------------------------------------------------------------------------
// BTC rate cache (shared pattern from storefront.js)
// ---------------------------------------------------------------------------

const axios = require('axios');
let _btcRateCache = { rate: null, fetchedAt: 0 };
const BTC_RATE_TTL_MS = 5 * 60 * 1000;

async function getBtcUsdRate() {
  if (_btcRateCache.rate && Date.now() - _btcRateCache.fetchedAt < BTC_RATE_TTL_MS) {
    return _btcRateCache.rate;
  }
  try {
    const resp = await axios.get(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
      { timeout: 5000 }
    );
    const rate = resp.data && resp.data.bitcoin && resp.data.bitcoin.usd;
    if (rate) {
      _btcRateCache = { rate, fetchedAt: Date.now() };
      return rate;
    }
  } catch {
    if (_btcRateCache.rate) return _btcRateCache.rate;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateOrderId() {
  return `MACH-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

/**
 * Load products from storefront (reuses storefront loadAllProducts logic).
 * Only returns digital products (machine payments focus on instant delivery).
 */
async function loadMachineProducts() {
  // Re-use the storefront route's loadAllProducts by requiring it fresh
  // to avoid circular dependency issues. This is intentional — storefront.js
  // exposes the helper indirectly via the route, so we duplicate the small
  // loader here to stay decoupled.
  const fs = require('fs').promises;
  const path = require('path');

  const brandsDir = path.join(__dirname, '../../frontend/brands');
  const products = [];

  try {
    const brands = await fs.readdir(brandsDir, { withFileTypes: true });
    for (const brand of brands) {
      if (!brand.isDirectory()) continue;
      if (brand.name === 'master-templates' || brand.name.includes('test')) continue;

      const catalogPath = path.join(brandsDir, brand.name, 'catalog.json');
      try {
        const raw = await fs.readFile(catalogPath, 'utf8');
        const catalog = JSON.parse(raw);
        if (catalog.books && Array.isArray(catalog.books)) {
          for (const book of catalog.books) {
            const fulfillment = book.fulfillment_provider === 'stripe_digital' ? 'digital'
              : book.fulfillment_provider === 'arxmint' ? 'digital'
              : book.fulfillment || 'digital';

            // Machine endpoints only serve digital products
            if (fulfillment !== 'digital') continue;

            products.push({
              id: `${brand.name}:${book.id}`,
              title: book.title,
              description: book.description || '',
              price_usd_cents: Math.round((book.price || 0) * 100),
              type: 'digital',
              category: book.category || 'Books',
              digitalAssetUrl: book.digitalFile || null,
              metadata: {
                author: book.author,
                pages: book.pages,
                brandId: brand.name,
                sourceBookId: book.id,
              },
            });
          }
        }
      } catch {
        // skip brand
      }
    }
  } catch {
    // brands dir missing
  }

  return products;
}

// ---------------------------------------------------------------------------
// GET /api/machine/catalog
// ---------------------------------------------------------------------------

/**
 * Returns digital product catalog with Lightning (sat) pricing.
 * No auth required — public discovery for agents.
 */
router.get('/catalog', catalogLimiter, async (req, res) => {
  try {
    const products = await loadMachineProducts();
    const btcRate = await getBtcUsdRate();

    const enriched = products.map(p => ({
      ...p,
      price_sats: btcRate
        ? Math.ceil((p.price_usd_cents / 100) / btcRate * 1e8)
        : null,
    }));

    res.json({
      products: enriched,
      btcUsdRate: btcRate || null,
      paymentMethods: ['lightning'],
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Machine] catalog error:', err);
    res.status(500).json({ error: 'Failed to load catalog' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/machine/order
// ---------------------------------------------------------------------------

/**
 * Create a Lightning invoice for a product purchase.
 * Requires NIP-98 HTTP auth.
 *
 * Body: { product_id, buyer_pubkey?, payment_method: "lightning" }
 * Returns: { order_id, invoice, checkout_url, expires_at }
 */
router.post('/order', orderLimiter, requireNip98Auth, async (req, res) => {
  try {
    const { product_id, payment_method = 'lightning' } = req.body || {};

    if (!product_id) {
      return res.status(400).json({ error: 'product_id required' });
    }
    if (payment_method !== 'lightning') {
      return res.status(400).json({ error: 'Only payment_method "lightning" is supported' });
    }
    if (!arxmintProvider.enabled) {
      return res.status(503).json({ error: 'Lightning payments not configured (ArxMint not set up)' });
    }

    const products = await loadMachineProducts();
    const product = products.find(p => p.id === product_id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const orderId = generateOrderId();
    const buyerPubkey = req.nostrPubkey || req.body.buyer_pubkey || null;
    const buyerEmail = buyerPubkey ? `nip98+${buyerPubkey.slice(0, 8)}@machine.local` : `machine+${orderId}@local.invalid`;

    const publicUrl = process.env.SITE_URL || process.env.PUBLIC_URL || 'http://localhost:3001';
    const callbackUrl = `${publicUrl}/api/machine/webhook`;

    // Create ArxMint checkout (Lightning invoice)
    const checkout = await arxmintProvider.createCheckout({
      amount: product.price_usd_cents,
      currency: 'USD',
      memo: product.title,
      productId: product.id,
      merchantId: arxmintProvider.merchantId,
      callbackUrl,
      successUrl: `${publicUrl}/success.html`,
      cancelUrl: `${publicUrl}/cancel.html`,
      customerEmail: buyerEmail,
    });

    // Persist pending order
    await orderService.createOrder({
      orderId,
      stripeSessionId: checkout.sessionId,
      customerEmail: buyerEmail,
      customerName: buyerPubkey ? `Agent:${buyerPubkey.slice(0, 16)}` : 'AI Agent',
      bookId: product.id,
      bookTitle: product.title,
      bookAuthor: product.metadata?.author || 'Unknown',
      format: 'digital',
      price: product.price_usd_cents / 100,
      currency: 'USD',
      metadata: {
        source: 'machine',
        paymentProvider: 'arxmint',
        paymentMethod: 'lightning',
        productId: product.id,
        buyerPubkey: buyerPubkey || null,
        sessionId: checkout.sessionId,
        quantity: 1,
      },
    });

    // State machine: set initial state (non-fatal for existing DBs)
    await orderService.updateOrderState(orderId, 'pending', { source: 'machine' })
      .catch(err => console.warn('[machine] state init failed (non-fatal):', err.message));

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min

    res.status(201).json({
      order_id: orderId,
      checkout_url: checkout.checkoutUrl,
      session_id: checkout.sessionId,
      expires_at: expiresAt,
      product: {
        id: product.id,
        title: product.title,
      },
    });
  } catch (err) {
    console.error('[Machine] order error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/machine/order/:id/status
// ---------------------------------------------------------------------------

/**
 * Poll order status. Returns download_url when paid and fulfilled.
 * No auth required — order_id is the capability token.
 */
router.get('/order/:id/status', catalogLimiter, async (req, res) => {
  try {
    const order = await orderService.getOrder(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Only expose machine orders (security: prevent order scraping)
    let meta = {};
    try { meta = JSON.parse(order.metadata || '{}'); } catch { /* ignore */ }
    if (meta.source !== 'machine') {
      return res.status(404).json({ error: 'Order not found' });
    }

    const status = order.payment_status === 'paid' ? 'paid'
      : order.status === 'completed' ? 'paid'
      : 'pending';

    const response = {
      order_id: order.order_id,
      status,
      fulfillment_status: order.fulfillment_status || 'pending',
      created_at: order.created_at,
    };

    // Include download URL when fulfilled
    if (order.download_token) {
      const publicUrl = process.env.SITE_URL || process.env.PUBLIC_URL || 'http://localhost:3001';
      response.download_url = `${publicUrl}/api/download/${order.download_token}`;
    }

    res.json(response);
  } catch (err) {
    console.error('[Machine] status error:', err);
    res.status(500).json({ error: 'Failed to get order status' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/machine/webhook
// ---------------------------------------------------------------------------

/**
 * Receive payment confirmation from ArxMint, fulfill order.
 * Delegates to the storefront fulfill logic after finding the machine order.
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    let body;
    if (Buffer.isBuffer(req.body)) {
      body = JSON.parse(req.body.toString());
    } else {
      body = req.body || {};
    }

    // Verify webhook signature in production
    if (process.env.NODE_ENV === 'production' && !arxmintProvider.webhookSecret) {
      console.error('[Machine webhook] ARXMINT_WEBHOOK_SECRET not set — rejecting request in production');
      return res.status(401).json({ error: 'Webhook authentication not configured' });
    }
    if (arxmintProvider.webhookSecret) {
      const rawBuf = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(body));
      if (!arxmintProvider.verifyWebhook(rawBuf, req.headers)) {
        console.warn('[Machine webhook] Invalid signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const { sessionId, orderId: providedOrderId, productId, amountSats, paidAt } = body;

    // Resolve order
    let order = null;
    if (providedOrderId) {
      order = await orderService.getOrder(providedOrderId);
    } else if (sessionId) {
      order = await orderService.getOrderBySessionId(sessionId);
    }

    if (!order) {
      // Unknown order — could be a non-machine webhook; ignore gracefully
      return res.status(200).json({ received: true, note: 'Order not found — ignored' });
    }

    // Only handle machine orders
    let meta = {};
    try { meta = JSON.parse(order.metadata || '{}'); } catch { /* ignore */ }
    if (meta.source !== 'machine') {
      return res.status(200).json({ received: true, note: 'Not a machine order — ignored' });
    }

    const effectiveOrderId = order.order_id;

    // Mark order paid
    await orderService.updateOrderStatus(effectiveOrderId, {
      payment_status: 'paid',
      metadata: JSON.stringify({
        ...meta,
        amountSats: amountSats || null,
        paidAt: paidAt || new Date().toISOString(),
        paymentProvider: 'arxmint',
      }),
    });

    // Complete order (generates download token) for digital products
    const productList = await loadMachineProducts();
    const product = productList.find(p => p.id === (productId || order.book_id));

    if (product && product.digitalAssetUrl) {
      const completed = await orderService.completeOrder(effectiveOrderId, sessionId || `mach_${Date.now()}`);
      await orderService.updateOrderStatus(effectiveOrderId, {
        status: 'completed',
        fulfillment_status: 'fulfilled',
      });

      // State machine transitions (non-fatal)
      await orderService.updateOrderState(effectiveOrderId, 'processing', { provider: 'arxmint' })
        .then(() => orderService.updateOrderState(effectiveOrderId, 'completed', { fulfillment: 'digital' }))
        .catch(err => console.warn('[machine] state transition failed (non-fatal):', err.message));

      console.log(`[Machine webhook] Fulfilled: order=${effectiveOrderId} token=${completed.downloadToken}`);

      return res.json({
        success: true,
        order_id: effectiveOrderId,
        fulfillment: 'digital',
        download_token: completed.downloadToken,
      });
    }

    // No digital asset — mark paid, pending manual fulfillment
    await orderService.updateOrderStatus(effectiveOrderId, {
      status: 'completed',
      fulfillment_status: 'pending',
    });

    return res.json({ success: true, order_id: effectiveOrderId, fulfillment: 'pending' });
  } catch (err) {
    console.error('[Machine webhook] error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;
