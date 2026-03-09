/**
 * Storefront API — Standardized catalog and fulfillment endpoints.
 *
 * This is the API that external consumers (like ArxMint's /bazaar page) use
 * to fetch product catalogs and trigger order fulfillment.
 *
 * Endpoints:
 *   GET  /api/storefront/catalog           - Full product catalog (standardized schema)
 *   GET  /api/storefront/catalog/:category  - Products filtered by category
 *   GET  /api/storefront/product/:id        - Single product detail
 *   POST /api/storefront/checkout           - Create checkout session (routes to payment provider)
 *   POST /api/storefront/fulfill            - Webhook: payment confirmed → fulfill order
 *
 * Schema matches BAZAAR_STRATEGY.md Product interface.
 */

'use strict';

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const arxmintProvider = require('../services/arxmintProvider');
const OrderService = require('../services/orderService');
const emailService = require('../services/emailService');
const fulfillmentService = require('../services/fulfillmentService');

const orderService = new OrderService();

// ---------------------------------------------------------------------------
// BTC/USD rate cache — used to add sat pricing to catalog products
// ---------------------------------------------------------------------------

let _btcRateCache = { rate: null, fetchedAt: 0 };
const BTC_RATE_TTL_MS = 5 * 60 * 1000; // 5 minutes

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
    // CoinGecko unavailable — return cached value if we have one
    if (_btcRateCache.rate) return _btcRateCache.rate;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert internal book catalog format to standardized Product schema.
 * Maps the existing brand/catalog.json format to the schema ArxMint expects.
 */
function bookToProduct(book, brandId) {
  const inferredPrintfulVariant = book.podVariantId || book.printfulVariantId || null;
  const inferredLuluPackage = book.podPackageId || book.pod_package_id || book.luluPodPackageId || null;
  const inferredLuluPrintable = book.luluPrintableId || book.printableId || book.printable_id || null;
  const inferredProvider = (() => {
    if (book.podProvider) return String(book.podProvider).toLowerCase();
    if (inferredPrintfulVariant) return 'printful';
    if (inferredLuluPackage || inferredLuluPrintable) return 'lulu';
    return null;
  })();
  const inferredPodVariant = inferredProvider === 'lulu'
    ? inferredLuluPackage
    : inferredPrintfulVariant;
  const inferredFulfillment = book.fulfillment || (inferredProvider ? 'pod' : 'digital');

  return {
    id: `${brandId}:${book.id}`,
    title: book.title,
    description: book.description || '',
    longDescription: book.longDescription || '',
    price: Math.round((book.price || 0) * 100), // USD cents
    currency: 'USD',
    images: book.coverImage ? [book.coverImage] : [],
    category: book.category || 'Books',
    variants: buildVariants(book),
    fulfillment: inferredFulfillment,
    digitalAssetUrl: book.digitalFile || null,
    podProvider: inferredProvider,
    podProductId: book.podProductId || null,
    podVariantId: inferredPodVariant,
    podPackageId: inferredLuluPackage,
    luluPrintableId: inferredLuluPrintable,
    luluCoverUrl: book.luluCoverUrl || book.coverUrl || book.cover_url || null,
    luluInteriorUrl: book.luluInteriorUrl || book.interiorUrl || book.interior_url || null,
    luluShippingLevel: book.luluShippingLevel || book.shippingMethod || null,
    stock: null, // unlimited for digital
    active: true,
    metadata: {
      author: book.author,
      pages: book.pages,
      rating: book.rating,
      badge: book.badge,
      format: book.format,
      sourceBookId: book.id,
      brandId,
    },
  };
}

function buildVariants(book) {
  if (!book.format || book.format.length <= 1) return [];
  const variants = [];
  if (book.format.includes('hardcover') && book.hardcoverPrice) {
    variants.push({
      id: 'hardcover',
      name: 'Format',
      options: ['hardcover'],
      priceModifier: Math.round((book.hardcoverPrice - book.price) * 100),
    });
  }
  return variants;
}

/**
 * Load all brand catalogs and merge into a single product list.
 */
async function loadAllProducts() {
  const brandsDir = path.join(__dirname, '../../frontend/brands');
  const products = [];

  try {
    const brands = await fs.readdir(brandsDir, { withFileTypes: true });

    for (const brand of brands) {
      if (!brand.isDirectory()) continue;
      // skip test/template brands
      if (brand.name === 'master-templates' || brand.name.includes('test')) continue;

      const catalogPath = path.join(brandsDir, brand.name, 'catalog.json');
      try {
        const raw = await fs.readFile(catalogPath, 'utf8');
        const catalog = JSON.parse(raw);
        if (catalog.books && Array.isArray(catalog.books)) {
          for (const book of catalog.books) {
            products.push(bookToProduct(book, brand.name));
          }
        }
      } catch {
        // brand has no catalog or invalid JSON — skip
      }
    }
  } catch {
    // brands dir doesn't exist
  }

  return products;
}

/**
 * Extract unique categories from product list.
 */
function extractCategories(products) {
  return [...new Set(products.map(p => p.category))].sort();
}

function generateOrderId() {
  return `ORD-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

function parseJsonObject(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function normalizeShippingAddress(shippingAddress, customerName, customerEmail) {
  if (!shippingAddress || typeof shippingAddress !== 'object') return null;
  if (!shippingAddress.address1 || !shippingAddress.city || !shippingAddress.country_code || !shippingAddress.zip) {
    return null;
  }

  return {
    name: shippingAddress.name || customerName || 'Customer',
    address1: shippingAddress.address1,
    address2: shippingAddress.address2 || '',
    city: shippingAddress.city,
    state_code: shippingAddress.state_code || shippingAddress.state || '',
    country_code: shippingAddress.country_code,
    zip: shippingAddress.zip,
    email: shippingAddress.email || customerEmail || '',
  };
}

function normalizePodProvider(value) {
  if (!value) return null;
  return String(value).trim().toLowerCase();
}

// ---------------------------------------------------------------------------
// API key authentication for state-changing storefront endpoints (CWE-352)
// External callers (ArxMint, etc.) must include X-Api-Key header for POST requests.
// Set STOREFRONT_API_KEY in .env to enable enforcement; omit to allow unauthenticated access (dev).
// ---------------------------------------------------------------------------

const STOREFRONT_API_KEY = process.env.STOREFRONT_API_KEY;

function requireStorefrontApiKey(req, res, next) {
  if (!STOREFRONT_API_KEY) {
    // Fail closed in production — open access is only safe for dev/legacy
    if (process.env.NODE_ENV === 'production') {
      console.error('[Storefront] STOREFRONT_API_KEY not set — rejecting request in production mode');
      return res.status(401).json({ error: 'API key required' });
    }
    // Dev/legacy mode: allow but warn
    console.warn('[Storefront] STOREFRONT_API_KEY not set — open access (dev mode only)');
    return next();
  }
  const providedKey = req.headers['x-api-key'];
  if (providedKey !== STOREFRONT_API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * GET /api/storefront/catalog
 * Returns full product catalog in standardized schema.
 * Query params: ?category=Books&active=true
 */
router.get('/catalog', async (req, res) => {
  try {
    let products = await loadAllProducts();

    // Filter by category if specified
    if (req.query.category) {
      products = products.filter(p =>
        p.category.toLowerCase() === req.query.category.toLowerCase()
      );
    }

    // Filter by active status (default: only active)
    if (req.query.active !== 'false') {
      products = products.filter(p => p.active);
    }

    // Enrich with sat pricing (best-effort; skipped if CoinGecko is unavailable)
    const btcRate = await getBtcUsdRate();
    if (btcRate) {
      for (const product of products) {
        product.price_sats = Math.ceil((product.price / 100) / btcRate * 1e8);
      }
    }

    const storeId = process.env.STORE_ID || 'openbazaar-default';
    const storeName = process.env.STORE_NAME || 'OpenBazaar Store';

    res.json({
      storeId,
      storeName,
      btcUsdRate: btcRate || null,
      products,
      categories: extractCategories(products),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error loading catalog:', error);
    res.status(500).json({ error: 'Failed to load catalog' });
  }
});

/**
 * GET /api/storefront/catalog/:category
 * Products filtered by category.
 */
router.get('/catalog/:category', async (req, res) => {
  try {
    const products = await loadAllProducts();
    const filtered = products.filter(p =>
      p.category.toLowerCase() === req.params.category.toLowerCase() && p.active
    );

    res.json({
      category: req.params.category,
      products: filtered,
      count: filtered.length,
    });
  } catch (error) {
    console.error('Error loading category:', error);
    res.status(500).json({ error: 'Failed to load category' });
  }
});

/**
 * GET /api/storefront/product/:id
 * Single product detail. ID format: brandId:productId
 */
router.get('/product/:id', async (req, res) => {
  try {
    const products = await loadAllProducts();
    const product = products.find(p => p.id === req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const btcRate = await getBtcUsdRate();
    if (btcRate) {
      product.price_sats = Math.ceil((product.price / 100) / btcRate * 1e8);
    }

    res.json(product);
  } catch (error) {
    console.error('Error loading product:', error);
    res.status(500).json({ error: 'Failed to load product' });
  }
});

/**
 * POST /api/storefront/checkout
 * Create a checkout session via the configured payment provider.
 *
 * Body: { productId, provider: 'arxmint' | 'stripe', customerEmail? }
 * Returns: { checkoutUrl, sessionId }
 */
router.post('/checkout', requireStorefrontApiKey, async (req, res) => {
  try {
    const {
      productId,
      provider,
      customerEmail,
      customerName,
      shippingAddress,
      shippingMethod,
      quantity = 1,
    } = req.body || {};

    if (!productId) {
      return res.status(400).json({ error: 'productId required' });
    }

    // Look up the product
    const products = await loadAllProducts();
    const product = products.find(p => p.id === productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const normalizedShipping = normalizeShippingAddress(shippingAddress, customerName, customerEmail);
    if ((product.fulfillment === 'physical' || product.fulfillment === 'pod') && !normalizedShipping) {
      return res.status(400).json({
        error: 'shippingAddress with address1/city/country_code/zip is required for physical/POD products',
      });
    }

    const publicUrl = process.env.SITE_URL || process.env.PUBLIC_URL || 'http://localhost:3001';
    const callbackUrl = `${publicUrl}/api/storefront/fulfill`;

    if (provider === 'arxmint') {
      if (!arxmintProvider.enabled) {
        return res.status(503).json({ error: 'ArxMint payments not configured' });
      }

      const result = await arxmintProvider.createCheckout({
        amount: product.price,
        currency: product.currency,
        memo: product.title,
        productId: product.id,
        merchantId: arxmintProvider.merchantId,
        callbackUrl,
        successUrl: `${publicUrl}/success.html`,
        cancelUrl: `${publicUrl}/cancel.html`,
        customerEmail,
      });

      // Persist a pending internal order now so webhook-driven fulfillment has context.
      const orderId = generateOrderId();
      const fallbackEmail = customerEmail || `no-email+${orderId}@local.invalid`;
      await orderService.createOrder({
        orderId,
        stripeSessionId: result.sessionId,
        customerEmail: fallbackEmail,
        customerName: customerName || null,
        bookId: product.id,
        bookTitle: product.title,
        bookAuthor: product.metadata?.author || 'Unknown',
        format: product.fulfillment || 'digital',
        price: Number(product.price || 0) / 100,
        currency: product.currency || 'USD',
        metadata: {
          source: 'storefront',
          paymentProvider: 'arxmint',
          productId: product.id,
          quantity: Number(quantity) || 1,
          shippingAddress: normalizedShipping,
          shippingMethod: shippingMethod || null,
          podProvider: normalizePodProvider(product.podProvider),
          podVariantId: product.podVariantId || null,
          podPackageId: product.podPackageId || null,
          luluPrintableId: product.luluPrintableId || null,
          luluCoverUrl: product.luluCoverUrl || null,
          luluInteriorUrl: product.luluInteriorUrl || null,
          luluShippingLevel: product.luluShippingLevel || null,
        },
      });

      return res.json({
        ...result,
        orderId,
      });
    }

    // Default: return info for Stripe checkout (existing flow handles this)
    return res.json({
      message: 'Use /api/checkout for Stripe payments',
      productId: product.id,
      price: product.price,
      currency: product.currency,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Checkout failed' });
  }
});

/**
 * POST /api/storefront/fulfill
 * Webhook endpoint for payment providers to confirm payment and trigger fulfillment.
 *
 * Body (from ArxMint):
 * {
 *   sessionId: string,
 *   productId: string,
 *   paymentProvider: 'arxmint',
 *   amountSats: number,
 *   paidAt: string (ISO date),
 *   customerEmail?: string
 * }
 */
async function handleFulfill(req, res) {
  try {
    // Parse body — may arrive as raw buffer (for signature verification) or parsed JSON
    let body;
    if (Buffer.isBuffer(req.body)) {
      body = JSON.parse(req.body.toString());
    } else {
      body = req.body;
    }

    // Fail closed in production when no webhook secret is configured
    if (process.env.NODE_ENV === 'production' && !arxmintProvider.webhookSecret) {
      console.error('[Fulfill] ARXMINT_WEBHOOK_SECRET not set — rejecting unauthenticated fulfill request');
      return res.status(401).json({ error: 'Webhook authentication not configured' });
    }

    // Always verify signature when secret is configured, regardless of body type (CWE-306 fix)
    if (arxmintProvider.webhookSecret) {
      const bodyBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(body));
      const isValid = arxmintProvider.verifyWebhook(bodyBuffer, req.headers);
      if (!isValid) {
        console.warn('[Fulfill] Invalid webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const {
      sessionId,
      orderId: providedOrderId,
      productId: providedProductId,
      paymentProvider,
      amountSats,
      paidAt,
      customerEmail,
      customerName,
      shippingAddress,
      shippingMethod,
      quantity = 1,
    } = body || {};

    if (!paymentProvider) {
      return res.status(400).json({ error: 'paymentProvider required' });
    }

    console.log(`[Fulfill] Payment confirmed: provider=${paymentProvider} product=${providedProductId || 'n/a'} amount=${amountSats || 'n/a'} sats`);

    // Rehydrate internal order context when available
    let existingOrder = null;
    if (providedOrderId) {
      existingOrder = await orderService.getOrder(providedOrderId);
    } else if (sessionId) {
      existingOrder = await orderService.getOrderBySessionId(sessionId);
    }

    const existingMeta = parseJsonObject(existingOrder?.metadata);
    const effectiveOrderId = existingOrder?.order_id || providedOrderId || generateOrderId();
    const effectiveProductId = providedProductId || existingOrder?.book_id;
    const effectiveCustomerEmail = customerEmail || existingOrder?.customer_email || `no-email+${effectiveOrderId}@local.invalid`;
    const effectiveCustomerName = customerName || existingOrder?.customer_name || '';
    const effectiveShipping = normalizeShippingAddress(
      shippingAddress || existingMeta.shippingAddress,
      effectiveCustomerName,
      effectiveCustomerEmail
    );

    if (!effectiveProductId) {
      return res.status(400).json({ error: 'productId required (or resolvable from orderId/sessionId)' });
    }

    // Look up product for fulfillment details
    const products = await loadAllProducts();
    const product = products.find(p => p.id === effectiveProductId);

    if (!product) {
      console.error(`[Fulfill] Product not found: ${effectiveProductId}`);
      return res.status(404).json({ error: 'Product not found' });
    }

    // Ensure internal order exists
    if (!existingOrder) {
      await orderService.createOrder({
        orderId: effectiveOrderId,
        stripeSessionId: sessionId || null,
        customerEmail: effectiveCustomerEmail,
        customerName: effectiveCustomerName || null,
        bookId: product.id,
        bookTitle: product.title,
        bookAuthor: product.metadata?.author || 'Unknown',
        format: product.fulfillment || 'digital',
        price: Number(product.price || 0) / 100,
        currency: product.currency || 'USD',
        metadata: {
          source: 'storefront',
          paymentProvider,
          quantity: Number(quantity) || 1,
          shippingAddress: effectiveShipping,
          shippingMethod: shippingMethod || existingMeta.shippingMethod || null,
          podProvider: normalizePodProvider(product.podProvider) || normalizePodProvider(existingMeta.podProvider),
          podVariantId: product.podVariantId || null,
          podPackageId: product.podPackageId || null,
          luluPrintableId: product.luluPrintableId || null,
          luluCoverUrl: product.luluCoverUrl || null,
          luluInteriorUrl: product.luluInteriorUrl || null,
          luluShippingLevel: product.luluShippingLevel || null,
        },
      });
      existingOrder = await orderService.getOrder(effectiveOrderId);
    }

    const paymentMeta = {
      ...existingMeta,
      paymentProvider,
      amountSats: amountSats || null,
      paidAt: paidAt || new Date().toISOString(),
      shippingAddress: effectiveShipping || existingMeta.shippingAddress || null,
      shippingMethod: shippingMethod || existingMeta.shippingMethod || null,
      podProvider: normalizePodProvider(product.podProvider) || normalizePodProvider(existingMeta.podProvider),
      podVariantId: product.podVariantId || existingMeta.podVariantId || null,
      podPackageId: product.podPackageId || existingMeta.podPackageId || null,
      luluPrintableId: product.luluPrintableId || existingMeta.luluPrintableId || null,
      luluCoverUrl: product.luluCoverUrl || existingMeta.luluCoverUrl || null,
      luluInteriorUrl: product.luluInteriorUrl || existingMeta.luluInteriorUrl || null,
      luluShippingLevel: product.luluShippingLevel || existingMeta.luluShippingLevel || null,
    };

    // Fulfill based on product type
    if (product.fulfillment === 'digital' && product.digitalAssetUrl) {
      const completed = await orderService.completeOrder(effectiveOrderId, sessionId || `ext_${Date.now()}`);
      const publicUrl = process.env.SITE_URL || process.env.PUBLIC_URL || 'http://localhost:3001';
      const downloadUrl = `${publicUrl}/api/download/${completed.downloadToken}`;

      console.log(`[Fulfill] Digital delivery: order=${effectiveOrderId} product=${product.title}`);

      // Send download email if we have customer email
      if (effectiveCustomerEmail && !effectiveCustomerEmail.endsWith('@local.invalid')) {
        try {
          await emailService.sendDownloadEmail({
            userEmail: effectiveCustomerEmail,
            bookTitle: product.title,
            bookAuthor: product.metadata?.author || 'Unknown',
            downloadUrl,
            orderId: effectiveOrderId,
          });
        } catch (emailErr) {
          console.error('[Fulfill] Email send failed:', emailErr.message);
        }
      }

      await orderService.updateOrderStatus(effectiveOrderId, {
        status: 'completed',
        payment_status: 'paid',
        fulfillment_status: 'fulfilled',
        metadata: JSON.stringify(paymentMeta),
      });

      return res.json({
        success: true,
        orderId: effectiveOrderId,
        fulfillment: 'digital',
        downloadToken: completed.downloadToken,
        message: 'Order fulfilled — download link sent',
      });
    }

    if (product.fulfillment === 'physical' || product.fulfillment === 'pod') {
      if (!effectiveShipping) {
        return res.status(400).json({ error: 'shippingAddress is required for physical/POD fulfillment' });
      }

      await orderService.updateOrderStatus(effectiveOrderId, {
        status: 'completed',
        payment_status: 'paid',
        fulfillment_status: 'processing',
        order_type: product.fulfillment === 'pod' ? 'physical' : product.fulfillment,
        contains_physical: 1,
        shipping_address: JSON.stringify(effectiveShipping),
        shipping_method: paymentMeta.shippingMethod || paymentMeta.luluShippingLevel || null,
        metadata: JSON.stringify(paymentMeta),
      });

      if (product.fulfillment === 'pod') {
        const providerName = normalizePodProvider(product.podProvider || paymentMeta.podProvider) || 'printful';
        const providerParams = {
          orderId: effectiveOrderId,
          quantity: Number(quantity) || 1,
          shippingAddress: effectiveShipping,
          confirm: true,
        };

        if (providerName === 'printful') {
          const variantId = product.podVariantId || paymentMeta.podVariantId;
          if (!variantId) {
            return res.status(422).json({ error: 'podVariantId is required for Printful POD fulfillment' });
          }
          const variantIdNum = Number(variantId);
          if (!Number.isInteger(variantIdNum) || variantIdNum <= 0) {
            return res.status(422).json({ error: 'podVariantId must be a positive integer (valid Printful variant ID)' });
          }
          providerParams.variantId = variantIdNum;
        } else if (providerName === 'lulu') {
          const podPackageId = product.podPackageId || paymentMeta.podPackageId || product.podVariantId || paymentMeta.podVariantId;
          const luluPrintableId = product.luluPrintableId || paymentMeta.luluPrintableId || null;
          if (!podPackageId && !luluPrintableId) {
            return res.status(422).json({ error: 'podPackageId or luluPrintableId is required for Lulu POD fulfillment' });
          }

          const sourceBookId = product.metadata?.sourceBookId || (product.id.includes(':') ? product.id.split(':')[1] : product.id);
          const sourceFormat = Array.isArray(product.metadata?.format)
            ? product.metadata.format[0]
            : (product.metadata?.format || 'print_trade');

          providerParams.shippingMethod = String(paymentMeta.shippingMethod || paymentMeta.luluShippingLevel || 'MAIL').toUpperCase();
          providerParams.lineItems = [
            {
              bookId: sourceBookId,
              formatType: sourceFormat,
              title: product.title,
              quantity: Number(quantity) || 1,
              podPackageId,
              printableId: luluPrintableId || undefined,
              coverUrl: product.luluCoverUrl || paymentMeta.luluCoverUrl || undefined,
              interiorUrl: product.luluInteriorUrl || paymentMeta.luluInteriorUrl || undefined,
              pageCount: Number(product.metadata?.pages) || undefined,
            },
          ];
        } else {
          return res.status(422).json({ error: `Unsupported POD provider: ${providerName}` });
        }

        const fulfillmentResult = await fulfillmentService.createOrder(providerName, providerParams);

        const fulfillmentUpdates = {
          fulfillment_status: 'pod_submitted',
          metadata: JSON.stringify({
            ...paymentMeta,
            podSubmittedAt: new Date().toISOString(),
            podProvider: providerName,
            podOrderId: fulfillmentResult.orderId,
            podPrintJobId: fulfillmentResult.printJobId || null,
          }),
        };
        if (providerName === 'printful' && fulfillmentResult.orderId) {
          fulfillmentUpdates.printful_order_id = String(fulfillmentResult.orderId);
        }
        if (providerName === 'lulu' && (fulfillmentResult.printJobId || fulfillmentResult.orderId)) {
          fulfillmentUpdates.lulu_print_job_id = String(fulfillmentResult.printJobId || fulfillmentResult.orderId);
        }

        await orderService.updateOrderStatus(effectiveOrderId, fulfillmentUpdates);

        return res.json({
          success: true,
          orderId: effectiveOrderId,
          fulfillment: 'pod',
          provider: providerName,
          providerOrderId: fulfillmentResult.orderId,
          printJobId: fulfillmentResult.printJobId || null,
          status: fulfillmentResult.status,
          message: 'POD order submitted to fulfillment provider',
        });
      }

      // Non-POD physical fulfillment: keep pending for manual flow
      await orderService.updateOrderStatus(effectiveOrderId, {
        fulfillment_status: 'physical_pending',
      });

      return res.json({
        success: true,
        orderId: effectiveOrderId,
        fulfillment: product.fulfillment,
        message: 'Order recorded — physical fulfillment pending',
        requiresShipping: true,
      });
    }

    // Fallback
    await orderService.updateOrderStatus(effectiveOrderId, {
      status: 'completed',
      payment_status: 'paid',
      fulfillment_status: 'pending',
      metadata: JSON.stringify(paymentMeta),
    });

    return res.json({
      success: true,
      orderId: effectiveOrderId,
      fulfillment: product.fulfillment || 'unknown',
      message: 'Order recorded',
    });
  } catch (error) {
    console.error('[Fulfill] Error:', error);
    res.status(500).json({ error: 'Fulfillment failed' });
  }
}

// Register /fulfill route using the named handler (also exported for /api/arxmint/webhook alias)
router.post('/fulfill', express.raw({ type: 'application/json' }), handleFulfill);

module.exports = router;
module.exports.handleFulfill = handleFulfill;
