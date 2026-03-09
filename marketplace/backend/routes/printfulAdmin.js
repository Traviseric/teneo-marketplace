'use strict';

const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/auth');
const printfulCatalog = require('../services/printfulCatalogService');

// Require admin session for all routes in this file
router.use(authenticateAdmin);

/**
 * GET /api/admin/printful/catalog
 * Returns the Printful product catalog (cached).
 * Requires PRINTFUL_API_KEY env var.
 */
router.get('/catalog', async (req, res) => {
  if (!printfulCatalog.enabled) {
    return res.status(503).json({
      error: 'Printful integration not configured',
      hint: 'Set PRINTFUL_API_KEY in your environment variables',
    });
  }

  try {
    const products = await printfulCatalog.getProducts();
    res.json({ success: true, count: products.length, products });
  } catch (err) {
    console.error('[Printful Admin] catalog fetch failed:', err.message);
    const status = err.response?.status || 500;
    res.status(status).json({ error: 'Failed to fetch Printful catalog', detail: err.message });
  }
});

/**
 * GET /api/admin/printful/catalog/:productId/variants
 * Returns variant options (sizes, colors, prices) for a Printful catalog product.
 * Requires PRINTFUL_API_KEY env var.
 */
router.get('/catalog/:productId/variants', async (req, res) => {
  if (!printfulCatalog.enabled) {
    return res.status(503).json({
      error: 'Printful integration not configured',
      hint: 'Set PRINTFUL_API_KEY in your environment variables',
    });
  }

  const { productId } = req.params;
  if (!productId || !/^\d+$/.test(productId)) {
    return res.status(400).json({ error: 'productId must be a positive integer' });
  }

  try {
    const data = await printfulCatalog.getVariants(productId);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('[Printful Admin] variants fetch failed:', err.message);
    const status = err.response?.status || 500;
    res.status(status).json({ error: 'Failed to fetch Printful variants', detail: err.message });
  }
});

/**
 * POST /api/admin/printful/cache/clear
 * Clears the in-memory Printful catalog cache (useful after Printful catalog updates).
 */
router.post('/cache/clear', (req, res) => {
  printfulCatalog.clearCache();
  res.json({ success: true, message: 'Printful catalog cache cleared' });
});

module.exports = router;
