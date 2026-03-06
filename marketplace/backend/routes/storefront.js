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
const arxmintProvider = require('../services/arxmintProvider');
const OrderService = require('../services/orderService');
const emailService = require('../services/emailService');

const orderService = new OrderService();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert internal book catalog format to standardized Product schema.
 * Maps the existing brand/catalog.json format to the schema ArxMint expects.
 */
function bookToProduct(book, brandId) {
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
    fulfillment: 'digital',
    digitalAssetUrl: book.digitalFile || null,
    podProvider: null,
    podProductId: null,
    stock: null, // unlimited for digital
    active: true,
    metadata: {
      author: book.author,
      pages: book.pages,
      rating: book.rating,
      badge: book.badge,
      format: book.format,
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

    const storeId = process.env.STORE_ID || 'openbazaar-default';
    const storeName = process.env.STORE_NAME || 'OpenBazaar Store';

    res.json({
      storeId,
      storeName,
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
router.post('/checkout', async (req, res) => {
  try {
    const { productId, provider, customerEmail } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'productId required' });
    }

    // Look up the product
    const products = await loadAllProducts();
    const product = products.find(p => p.id === productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
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

      return res.json(result);
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
router.post('/fulfill', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    // Parse body — may arrive as raw buffer (for signature verification) or parsed JSON
    let body;
    if (Buffer.isBuffer(req.body)) {
      // Verify webhook signature if ArxMint
      const isValid = arxmintProvider.verifyWebhook(req.body, req.headers);
      if (arxmintProvider.webhookSecret && !isValid) {
        console.warn('[Fulfill] Invalid webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
      body = JSON.parse(req.body.toString());
    } else {
      body = req.body;
    }

    const { sessionId, productId, paymentProvider, amountSats, paidAt, customerEmail } = body;

    if (!productId || !paymentProvider) {
      return res.status(400).json({ error: 'productId and paymentProvider required' });
    }

    console.log(`[Fulfill] Payment confirmed: provider=${paymentProvider} product=${productId} amount=${amountSats} sats`);

    // Look up product for fulfillment details
    const products = await loadAllProducts();
    const product = products.find(p => p.id === productId);

    if (!product) {
      console.error(`[Fulfill] Product not found: ${productId}`);
      return res.status(404).json({ error: 'Product not found' });
    }

    // Generate order ID
    const orderId = 'ORD-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex');

    // Fulfill based on product type
    if (product.fulfillment === 'digital' && product.digitalAssetUrl) {
      // Generate download token
      const downloadToken = crypto.randomBytes(32).toString('hex');

      console.log(`[Fulfill] Digital delivery: order=${orderId} product=${product.title}`);

      // Send download email if we have customer email
      if (customerEmail) {
        try {
          await emailService.sendOrderConfirmation(customerEmail, {
            orderId,
            bookTitle: product.title,
            downloadToken,
          });
        } catch (emailErr) {
          console.error('[Fulfill] Email send failed:', emailErr.message);
        }
      }

      return res.json({
        success: true,
        orderId,
        fulfillment: 'digital',
        downloadToken,
        message: 'Order fulfilled — download link sent',
      });
    }

    if (product.fulfillment === 'physical' || product.fulfillment === 'pod') {
      // For physical / POD: log the order for manual fulfillment or Printful trigger
      console.log(`[Fulfill] Physical/POD order: ${orderId} — requires shipping address`);

      return res.json({
        success: true,
        orderId,
        fulfillment: product.fulfillment,
        message: 'Order recorded — physical fulfillment pending',
        requiresShipping: true,
      });
    }

    // Fallback
    return res.json({
      success: true,
      orderId,
      fulfillment: product.fulfillment || 'unknown',
      message: 'Order recorded',
    });
  } catch (error) {
    console.error('[Fulfill] Error:', error);
    res.status(500).json({ error: 'Fulfillment failed' });
  }
});

module.exports = router;
