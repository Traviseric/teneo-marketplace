/**
 * Agent Routes — Machine-readable API for AI agent commerce.
 *
 * Provides structured product discovery, quoting, and purchasing
 * for AI agents (LangChain, OpenAI plugins, Claude tools, etc.).
 *
 * Endpoints:
 *   GET  /api/agent/catalog           — Structured catalog with capabilities[]
 *   POST /api/agent/quote             — Multi-product purchase quote
 *   POST /api/agent/purchase          — Initiate payment (Lightning or Stripe)
 *   GET  /api/agent/order/:orderId    — Order status + download URL
 *
 * Auth:
 *   POST endpoints accept either:
 *     - NIP-98 HTTP auth (Authorization: Nostr <base64>)
 *     - API key auth (X-Api-Key: <AGENT_API_KEY env var>)
 *   GET endpoints are public (rate-limited)
 *
 *   X-Agent-ID header is accepted on all endpoints for audit logging.
 *
 * Rate limits:
 *   GET /catalog, GET /order: 30 req/min
 *   POST /quote, POST /purchase: 20 req/min
 *
 * Schema:
 *   GET /catalog returns X-Schema header with schema version.
 *   Response structure is OpenAPI-compatible.
 */

'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const router = express.Router();
const axios = require('axios');
const OrderService = require('../services/orderService');
const arxmintProvider = require('../services/arxmintProvider');
const { verifyNip98Auth } = require('../auth/nip98');

const orderService = new OrderService();

// ---------------------------------------------------------------------------
// Rate limiters
// ---------------------------------------------------------------------------

const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded — 30 req/min for catalog/status' },
});

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded — 20 req/min for quote/purchase' },
});

// ---------------------------------------------------------------------------
// Auth middleware — accepts NIP-98 OR X-Api-Key
// ---------------------------------------------------------------------------

const AGENT_API_KEY = process.env.AGENT_API_KEY;

/**
 * requireAgentAuth — middleware that accepts either:
 *   1. NIP-98 HTTP auth: Authorization: Nostr <base64 event>
 *   2. API key:          X-Api-Key: <AGENT_API_KEY>
 *
 * Sets req.agentPubkey (NIP-98) or req.agentId (API key / X-Agent-ID header).
 */
function requireAgentAuth(req, res, next) {
  const agentId = req.headers['x-agent-id'] || null;

  // Try API key first
  if (AGENT_API_KEY) {
    const provided = req.headers['x-api-key'];
    if (provided === AGENT_API_KEY) {
      req.agentId = agentId || 'api-key-agent';
      return next();
    }
  }

  // Try NIP-98 auth
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Nostr ')) {
    const result = verifyNip98Auth(req);
    if (result.valid) {
      req.agentPubkey = result.pubkey;
      req.agentId = agentId || `npub:${result.pubkey.slice(0, 16)}`;
      return next();
    }
    return res.status(401).json({
      error: 'Authentication failed',
      message: result.error,
      hint: 'Provide a valid NIP-98 Authorization header or X-Api-Key',
    });
  }

  // No auth provided — check if AGENT_API_KEY is configured
  if (AGENT_API_KEY) {
    return res.status(401).json({
      error: 'Authentication required',
      hint: 'Provide X-Api-Key header (API key) or Authorization: Nostr <base64> (NIP-98)',
    });
  }

  // Dev mode: no key configured — allow with warning
  if (process.env.NODE_ENV === 'production') {
    console.error('[AgentAPI] AGENT_API_KEY not set — rejecting unauthenticated request in production');
    return res.status(401).json({ error: 'Authentication required' });
  }
  console.warn('[AgentAPI] AGENT_API_KEY not set — open access (dev mode only)');
  req.agentId = agentId || 'anonymous';
  next();
}

// ---------------------------------------------------------------------------
// Audit logger — logs all agent requests
// ---------------------------------------------------------------------------

router.use((req, res, next) => {
  const agentId = req.headers['x-agent-id'] || req.agentId || 'anonymous';
  const ip = req.headers['x-forwarded-for'] || req.ip || 'unknown';
  console.log(`[AgentAPI] ${req.method} ${req.path} agent=${agentId} ip=${ip}`);
  next();
});

// ---------------------------------------------------------------------------
// BTC rate cache
// ---------------------------------------------------------------------------

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
// In-memory quote cache (TTL: 15 minutes)
// ---------------------------------------------------------------------------

const QUOTE_TTL_MS = 15 * 60 * 1000;
const _quotes = new Map(); // quoteId → { quote, expiresAt }

function storeQuote(quoteId, quote) {
  _quotes.set(quoteId, { quote, expiresAt: Date.now() + QUOTE_TTL_MS });
  // Purge expired quotes opportunistically (keep memory bounded)
  if (_quotes.size > 500) {
    const now = Date.now();
    for (const [id, entry] of _quotes) {
      if (entry.expiresAt < now) _quotes.delete(id);
    }
  }
}

function getQuote(quoteId) {
  const entry = _quotes.get(quoteId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    _quotes.delete(quoteId);
    return null;
  }
  return entry.quote;
}

// ---------------------------------------------------------------------------
// Product loader — reuses brands catalog; enriches with agent-specific fields
// ---------------------------------------------------------------------------

const fs = require('fs').promises;
const path = require('path');

/**
 * Infer agent capabilities from a catalog book entry.
 */
function inferCapabilities(book, fulfillment) {
  const caps = [];
  if (fulfillment === 'digital') caps.push('digital_download', 'instant_delivery');
  if (fulfillment === 'pod' || fulfillment === 'physical') caps.push('physical_shipping');
  if (book.format && (Array.isArray(book.format) ? book.format.includes('course') : book.format === 'course')) {
    caps.push('course_access');
  }
  return caps;
}

/**
 * Build a machine-readable agent_description (concise, structured, no marketing fluff).
 */
function buildAgentDescription(book, capabilities) {
  const parts = [];
  if (book.author) parts.push(`by ${book.author}`);
  if (book.pages) parts.push(`${book.pages} pages`);
  if (book.category) parts.push(`category: ${book.category}`);
  if (capabilities.length) parts.push(`capabilities: ${capabilities.join(', ')}`);
  const base = book.description
    ? book.description.slice(0, 200).replace(/\s+/g, ' ').trim()
    : 'No description available';
  return parts.length ? `${base} [${parts.join(' | ')}]` : base;
}

async function loadAgentProducts() {
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
        if (!catalog.books || !Array.isArray(catalog.books)) continue;

        for (const book of catalog.books) {
          const fulfillment = book.fulfillment_provider === 'stripe_digital' ? 'digital'
            : book.fulfillment_provider === 'arxmint' ? 'digital'
            : book.fulfillment_provider === 'lulu' ? 'pod'
            : book.fulfillment_provider === 'printful' ? 'pod'
            : book.fulfillment || 'digital';

          const capabilities = inferCapabilities(book, fulfillment);
          const agentDescription = buildAgentDescription(book, capabilities);
          const priceUsdCents = Math.round((book.price || 0) * 100);

          products.push({
            id: `${brand.name}:${book.id}`,
            title: book.title,
            description: book.description || '',
            agent_description: agentDescription,
            price_usd_cents: priceUsdCents,
            currency: 'USD',
            type: fulfillment,
            category: book.category || 'Books',
            capabilities,
            requirements: fulfillment !== 'digital' ? ['shipping_address'] : [],
            images: book.coverImage ? [book.coverImage] : [],
            active: true,
            metadata: {
              author: book.author || null,
              pages: book.pages || null,
              brandId: brand.name,
              sourceBookId: book.id,
            },
          });
        }
      } catch {
        // skip invalid brand
      }
    }
  } catch {
    // brands dir missing
  }

  return products;
}

// ---------------------------------------------------------------------------
// Product schema (OpenAPI-compatible, returned in X-Schema header)
// ---------------------------------------------------------------------------

const CATALOG_SCHEMA_VERSION = '1.0';
const CATALOG_SCHEMA = JSON.stringify({
  openapi: '3.0.0',
  version: CATALOG_SCHEMA_VERSION,
  schemas: {
    Product: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Unique product ID (brandId:productId)' },
        title: { type: 'string' },
        description: { type: 'string' },
        agent_description: { type: 'string', description: 'Machine-optimized description with structured metadata' },
        price_usd_cents: { type: 'integer', description: 'Price in USD cents' },
        price_sats: { type: 'integer', description: 'Price in satoshis (Lightning)' },
        currency: { type: 'string', enum: ['USD'] },
        type: { type: 'string', enum: ['digital', 'pod', 'physical'] },
        category: { type: 'string' },
        capabilities: { type: 'array', items: { type: 'string' } },
        requirements: { type: 'array', items: { type: 'string' } },
      },
    },
  },
});

// ---------------------------------------------------------------------------
// GET /api/agent/catalog
// ---------------------------------------------------------------------------

/**
 * Returns structured product catalog for AI agents.
 * Includes capabilities[], agent_description, and Lightning (sat) pricing.
 * OpenAPI-compatible schema is returned in X-Schema response header.
 */
router.get('/catalog', readLimiter, async (req, res) => {
  try {
    let products = await loadAgentProducts();

    // Optional filter by type
    if (req.query.type) {
      products = products.filter(p => p.type === req.query.type);
    }
    // Optional filter by capability
    if (req.query.capability) {
      products = products.filter(p => p.capabilities.includes(req.query.capability));
    }

    const btcRate = await getBtcUsdRate();
    if (btcRate) {
      for (const p of products) {
        p.price_sats = Math.ceil((p.price_usd_cents / 100) / btcRate * 1e8);
      }
    }

    const storeId = process.env.STORE_ID || 'openbazaar-default';
    const storeName = process.env.STORE_NAME || 'OpenBazaar Store';
    const publicUrl = process.env.SITE_URL || process.env.PUBLIC_URL || 'http://localhost:3001';

    res.set('X-Schema', CATALOG_SCHEMA_VERSION);
    res.set('X-Schema-Url', `${publicUrl}/.well-known/agent-capabilities.json`);

    res.json({
      schema_version: CATALOG_SCHEMA_VERSION,
      store_id: storeId,
      store_name: storeName,
      products,
      product_count: products.length,
      btc_usd_rate: btcRate || null,
      payment_methods: ['lightning', 'stripe'],
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[AgentAPI] catalog error:', err);
    res.status(500).json({ error: 'Failed to load catalog' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/agent/quote
// ---------------------------------------------------------------------------

/**
 * Returns a purchase quote for one or more products.
 *
 * Body: { items: [{ product_id, quantity }], agent_id? }
 * Returns: { quote_id, items, subtotal_usd_cents, subtotal_sats, expires_at,
 *             payment_options: [{ method, instructions }] }
 */
router.post('/quote', writeLimiter, requireAgentAuth, async (req, res) => {
  try {
    const { items, agent_id } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required' });
    }

    const products = await loadAgentProducts();
    const btcRate = await getBtcUsdRate();
    const publicUrl = process.env.SITE_URL || process.env.PUBLIC_URL || 'http://localhost:3001';

    const resolvedItems = [];
    let subtotalCents = 0;

    for (const item of items) {
      const { product_id, quantity = 1 } = item;
      if (!product_id) {
        return res.status(400).json({ error: 'Each item must include product_id' });
      }
      const qty = Math.max(1, Math.min(100, parseInt(quantity, 10) || 1));
      const product = products.find(p => p.id === product_id);
      if (!product) {
        return res.status(404).json({ error: `Product not found: ${product_id}` });
      }
      const lineCents = product.price_usd_cents * qty;
      subtotalCents += lineCents;
      resolvedItems.push({
        product_id: product.id,
        title: product.title,
        quantity: qty,
        unit_price_usd_cents: product.price_usd_cents,
        line_total_usd_cents: lineCents,
        capabilities: product.capabilities,
        requirements: product.requirements,
      });
    }

    const quoteId = `QUOTE-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const expiresAt = new Date(Date.now() + QUOTE_TTL_MS).toISOString();
    const subtotalSats = btcRate ? Math.ceil((subtotalCents / 100) / btcRate * 1e8) : null;

    const paymentOptions = [];

    if (arxmintProvider.enabled) {
      paymentOptions.push({
        method: 'lightning',
        currency: 'sats',
        amount: subtotalSats,
        instructions: `POST /api/agent/purchase with quote_id="${quoteId}" and payment_method="lightning"`,
        endpoint: `${publicUrl}/api/agent/purchase`,
      });
    }

    paymentOptions.push({
      method: 'stripe',
      currency: 'USD',
      amount_usd_cents: subtotalCents,
      instructions: `POST /api/agent/purchase with quote_id="${quoteId}" and payment_method="stripe"`,
      endpoint: `${publicUrl}/api/agent/purchase`,
    });

    const quote = {
      quote_id: quoteId,
      agent_id: agent_id || req.agentId || null,
      items: resolvedItems,
      subtotal_usd_cents: subtotalCents,
      subtotal_sats: subtotalSats,
      btc_usd_rate: btcRate || null,
      expires_at: expiresAt,
      payment_options: paymentOptions,
    };

    storeQuote(quoteId, quote);

    res.json(quote);
  } catch (err) {
    console.error('[AgentAPI] quote error:', err);
    res.status(500).json({ error: 'Failed to generate quote' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/agent/purchase
// ---------------------------------------------------------------------------

/**
 * Initiate a purchase — returns a Lightning invoice or Stripe checkout URL.
 *
 * Body (with quote):   { quote_id, payment_method: "lightning"|"stripe", customer_email? }
 * Body (direct):       { items: [{ product_id, quantity }], payment_method, customer_email? }
 * Returns: { order_id, payment_method, checkout_url?, invoice?, expires_at }
 */
router.post('/purchase', writeLimiter, requireAgentAuth, async (req, res) => {
  try {
    const { quote_id, items: directItems, payment_method = 'lightning', customer_email } = req.body || {};

    // Resolve items: from quote or from direct items
    let resolvedItems = [];
    let subtotalCents = 0;

    if (quote_id) {
      const quote = getQuote(quote_id);
      if (!quote) {
        return res.status(404).json({ error: 'Quote not found or expired' });
      }
      resolvedItems = quote.items;
      subtotalCents = quote.subtotal_usd_cents;
    } else if (Array.isArray(directItems) && directItems.length > 0) {
      const products = await loadAgentProducts();
      for (const item of directItems) {
        const { product_id, quantity = 1 } = item;
        if (!product_id) {
          return res.status(400).json({ error: 'Each item must include product_id' });
        }
        const qty = Math.max(1, Math.min(100, parseInt(quantity, 10) || 1));
        const product = products.find(p => p.id === product_id);
        if (!product) {
          return res.status(404).json({ error: `Product not found: ${product_id}` });
        }
        const lineCents = product.price_usd_cents * qty;
        subtotalCents += lineCents;
        resolvedItems.push({
          product_id: product.id,
          title: product.title,
          quantity: qty,
          unit_price_usd_cents: product.price_usd_cents,
          line_total_usd_cents: lineCents,
        });
      }
    } else {
      return res.status(400).json({ error: 'Provide quote_id or items array' });
    }

    if (!['lightning', 'stripe'].includes(payment_method)) {
      return res.status(400).json({ error: 'payment_method must be "lightning" or "stripe"' });
    }

    // For single-item purchases, use the product directly; multi-item bundles use first item's
    // product context for order metadata (full item list stored in metadata)
    const firstProductId = resolvedItems[0]?.product_id;
    const allProducts = await loadAgentProducts();
    const firstProduct = allProducts.find(p => p.id === firstProductId);

    const orderId = `AGENT-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const buyerPubkey = req.agentPubkey || null;
    const buyerEmail = customer_email
      || (buyerPubkey ? `agent+${buyerPubkey.slice(0, 8)}@nostr.machine` : `agent+${orderId}@machine.local`);
    const publicUrl = process.env.SITE_URL || process.env.PUBLIC_URL || 'http://localhost:3001';

    if (payment_method === 'lightning') {
      if (!arxmintProvider.enabled) {
        return res.status(503).json({ error: 'Lightning payments not configured (ArxMint not set up)' });
      }

      const callbackUrl = `${publicUrl}/api/machine/webhook`;
      const memo = resolvedItems.length === 1
        ? resolvedItems[0].title
        : `${resolvedItems.length} items from OpenBazaar`;

      const checkout = await arxmintProvider.createCheckout({
        amount: subtotalCents,
        currency: 'USD',
        memo,
        productId: firstProductId,
        merchantId: arxmintProvider.merchantId,
        callbackUrl,
        successUrl: `${publicUrl}/success.html`,
        cancelUrl: `${publicUrl}/cancel.html`,
        customerEmail: buyerEmail,
      });

      await orderService.createOrder({
        orderId,
        stripeSessionId: checkout.sessionId,
        customerEmail: buyerEmail,
        customerName: buyerPubkey ? `Agent:${buyerPubkey.slice(0, 16)}` : 'AI Agent',
        bookId: firstProductId || 'bundle',
        bookTitle: memo,
        bookAuthor: firstProduct?.metadata?.author || 'Unknown',
        format: 'digital',
        price: subtotalCents / 100,
        currency: 'USD',
        metadata: {
          source: 'agent',
          paymentProvider: 'arxmint',
          paymentMethod: 'lightning',
          quoteId: quote_id || null,
          items: resolvedItems,
          buyerPubkey: buyerPubkey || null,
          agentId: req.agentId || null,
          sessionId: checkout.sessionId,
        },
      });

      await orderService.updateOrderState(orderId, 'pending', { source: 'agent' })
        .catch(err => console.warn('[agent] state init failed (non-fatal):', err.message));

      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

      return res.status(201).json({
        order_id: orderId,
        payment_method: 'lightning',
        checkout_url: checkout.checkoutUrl,
        session_id: checkout.sessionId,
        total_usd_cents: subtotalCents,
        expires_at: expiresAt,
        status_url: `${publicUrl}/api/agent/order/${orderId}`,
        items: resolvedItems,
      });
    }

    // Stripe: return a link to the standard Stripe checkout (human-assisted)
    const stripeCheckoutUrl = `${publicUrl}/api/checkout?product_id=${encodeURIComponent(firstProductId || '')}&source=agent&order_id=${orderId}`;

    await orderService.createOrder({
      orderId,
      stripeSessionId: `stripe_pending_${orderId}`,
      customerEmail: buyerEmail,
      customerName: buyerPubkey ? `Agent:${buyerPubkey.slice(0, 16)}` : 'AI Agent',
      bookId: firstProductId || 'bundle',
      bookTitle: resolvedItems[0]?.title || 'Bundle',
      bookAuthor: firstProduct?.metadata?.author || 'Unknown',
      format: 'digital',
      price: subtotalCents / 100,
      currency: 'USD',
      metadata: {
        source: 'agent',
        paymentProvider: 'stripe',
        paymentMethod: 'stripe',
        quoteId: quote_id || null,
        items: resolvedItems,
        buyerPubkey: buyerPubkey || null,
        agentId: req.agentId || null,
      },
    });

    return res.status(201).json({
      order_id: orderId,
      payment_method: 'stripe',
      checkout_url: stripeCheckoutUrl,
      total_usd_cents: subtotalCents,
      status_url: `${publicUrl}/api/agent/order/${orderId}`,
      items: resolvedItems,
      note: 'Stripe checkout requires human interaction to complete payment',
    });
  } catch (err) {
    console.error('[AgentAPI] purchase error:', err);
    res.status(500).json({ error: 'Failed to initiate purchase' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/agent/order/:orderId
// ---------------------------------------------------------------------------

/**
 * Check order status. Returns download_url when paid and fulfilled.
 * No auth — orderId is the capability token.
 */
router.get('/order/:orderId', readLimiter, async (req, res) => {
  try {
    // Validate orderId format to prevent log injection
    const orderId = req.params.orderId;
    if (!/^[A-Z0-9-]{6,64}$/i.test(orderId)) {
      return res.status(400).json({ error: 'Invalid order ID format' });
    }

    const order = await orderService.getOrder(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Only expose agent or machine orders (prevent enumeration of human orders)
    let meta = {};
    try { meta = JSON.parse(order.metadata || '{}'); } catch { /* ignore */ }
    if (meta.source !== 'agent' && meta.source !== 'machine') {
      return res.status(404).json({ error: 'Order not found' });
    }

    const status = order.payment_status === 'paid' ? 'paid'
      : order.status === 'completed' ? 'paid'
      : 'pending';

    const response = {
      order_id: order.order_id,
      status,
      fulfillment_status: order.fulfillment_status || 'pending',
      payment_method: meta.paymentMethod || null,
      total_usd_cents: order.price ? Math.round(order.price * 100) : null,
      created_at: order.created_at,
    };

    if (order.download_token) {
      const publicUrl = process.env.SITE_URL || process.env.PUBLIC_URL || 'http://localhost:3001';
      response.download_url = `${publicUrl}/api/download/${order.download_token}`;
      response.fulfillment_status = 'fulfilled';
    }

    res.json(response);
  } catch (err) {
    console.error('[AgentAPI] order status error:', err);
    res.status(500).json({ error: 'Failed to get order status' });
  }
});

module.exports = router;
