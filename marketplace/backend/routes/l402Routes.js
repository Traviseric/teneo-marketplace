'use strict';

/**
 * L402 Lightning-native download routes.
 *
 * Enables AI agents and Lightning wallets to pay-and-retrieve digital content
 * in a single round-trip without going through Stripe checkout.
 *
 * Flow:
 *   GET /api/l402/download/:resource
 *     → 402 + BOLT11 invoice  (no Authorization header)
 *     → 200 + file            (Authorization: L402 <macaroon>:<preimage>)
 *
 * Resource = book_id (slug or ID used in catalog.json / the /books directory).
 *
 * Price: set L402_DEFAULT_PRICE_USD env var (default: 4.99).
 * Only items at or below L402_PRICE_THRESHOLD_CENTS (default: 500 = $5.00)
 * should be routed here; higher-priced items should use the Stripe checkout flow.
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const { requireL402 } = require('../middleware/l402Auth');
const db = require('../database/database');

const defaultBooksDir = process.env.NODE_ENV === 'production'
  ? '/tmp/books'
  : path.join(__dirname, '../books');
const booksDir = process.env.BOOKS_DIR || defaultBooksDir;

// Price charged for L402 downloads. Can be overridden per-request via query param
// (validated against L402_PRICE_THRESHOLD_CENTS ceiling).
const DEFAULT_PRICE_USD = parseFloat(process.env.L402_DEFAULT_PRICE_USD || '4.99');
const THRESHOLD_CENTS = parseInt(process.env.L402_PRICE_THRESHOLD_CENTS || '500', 10);

/**
 * Resolve the file path for a given resource slug.
 * Checks product_versions first (most recent), then falls back to booksDir/<resource>.pdf.
 */
async function resolveFilePath(resource) {
  // Sanitize to prevent path traversal (CWE-22)
  const safeResource = path.basename(resource).replace(/[^a-zA-Z0-9_-]/g, '_');

  // Check for a versioned file in the DB
  try {
    const row = await db.get(
      `SELECT file_path FROM product_versions
       WHERE product_id = ? AND file_path IS NOT NULL
       ORDER BY created_at DESC LIMIT 1`,
      [safeResource]
    );
    if (row && row.file_path) {
      return { filePath: row.file_path, safeResource };
    }
  } catch (_) { /* version lookup failure — fall through */ }

  return { filePath: path.join(booksDir, `${safeResource}.pdf`), safeResource };
}

/**
 * GET /api/l402/download/:resource
 *
 * Protected by L402 paywall middleware.
 * On first call (no Authorization header): returns HTTP 402 with Lightning invoice.
 * After payment: client re-requests with Authorization: L402 <hash>:<preimage> → file served.
 *
 * Query params:
 *   price_usd (optional) — override price, capped at L402_PRICE_THRESHOLD_CENTS
 */
router.get('/download/:resource',
  (req, res, next) => {
    // Determine price for this resource (optional override, capped at threshold)
    let priceUsd = DEFAULT_PRICE_USD;
    if (req.query.price_usd) {
      const requested = parseFloat(req.query.price_usd);
      if (!isNaN(requested) && requested > 0) {
        const requestedCents = Math.round(requested * 100);
        priceUsd = requestedCents <= THRESHOLD_CENTS ? requested : DEFAULT_PRICE_USD;
      }
    }
    // Attach to request so handler can read it
    req._l402PriceUsd = priceUsd;
    // Run L402 middleware with resolved price
    return requireL402(priceUsd)(req, res, next);
  },
  async (req, res) => {
    try {
      const { resource } = req.params;
      const { filePath, safeResource } = await resolveFilePath(resource);

      // Verify file exists
      try {
        await fs.access(filePath);
      } catch (_) {
        return res.status(404).json({
          success: false,
          error: 'Resource not found',
          resource: safeResource,
        });
      }

      const stat = await fs.stat(filePath);
      const buffer = await fs.readFile(filePath);

      // Determine content type (only PDFs supported for now)
      const isPdf = filePath.endsWith('.pdf');
      const contentType = isPdf ? 'application/pdf' : 'application/octet-stream';
      const filename = isPdf ? `${safeResource}.pdf` : safeResource;

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('X-L402-Resource', safeResource);
      res.setHeader('X-L402-Payment-Hash', req.l402Payment ? req.l402Payment.payment_hash : '');

      res.end(buffer);
    } catch (err) {
      console.error('[L402 Routes] Error serving resource:', err);
      res.status(500).json({ success: false, error: 'Failed to serve resource' });
    }
  }
);

/**
 * GET /api/l402/status/:paymentHash
 *
 * Check whether a payment has been settled.
 * Useful for clients polling before re-requesting with the preimage.
 */
router.get('/status/:paymentHash', async (req, res) => {
  try {
    const { paymentHash } = req.params;
    // Sanitize: payment hashes are 64 hex chars
    if (!/^[0-9a-f]{64}$/i.test(paymentHash)) {
      return res.status(400).json({ error: 'Invalid payment_hash format' });
    }

    const payment = await db.get(
      `SELECT payment_hash, amount_sat, resource_path, paid_at, created_at
       FROM l402_payments WHERE payment_hash = ? LIMIT 1`,
      [paymentHash]
    );

    if (!payment) {
      return res.status(404).json({ error: 'Payment record not found' });
    }

    res.json({
      payment_hash: payment.payment_hash,
      amount_sat: payment.amount_sat,
      resource_path: payment.resource_path,
      paid: !!payment.paid_at,
      paid_at: payment.paid_at || null,
      created_at: payment.created_at,
    });
  } catch (err) {
    console.error('[L402 Routes] Status lookup error:', err);
    res.status(500).json({ error: 'Status lookup failed' });
  }
});

module.exports = router;
