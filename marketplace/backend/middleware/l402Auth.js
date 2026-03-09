'use strict';

/**
 * L402 Paywall Middleware
 *
 * HTTP 402 Payment Required standard for Lightning-native content gating.
 * Flow:
 *   1. Client sends unauthenticated request → server responds HTTP 402
 *      with WWW-Authenticate header containing a Lightning invoice.
 *   2. Client pays invoice → gets payment preimage.
 *   3. Client re-requests with Authorization: L402 <macaroon>:<preimage>
 *   4. Server verifies SHA256(preimage) == payment_hash → allows access.
 *
 * Reference: https://docs.lightning.engineering/the-lightning-network/l402
 */

const crypto = require('crypto');
const db = require('../database/database');

// ArxMint service is optional — loaded lazily to avoid circular deps
let arxmintService = null;
function getArxmintService() {
  if (!arxmintService) {
    try {
      arxmintService = require('../services/arxmintService');
    } catch (_) {
      arxmintService = { enabled: false };
    }
  }
  return arxmintService;
}

/**
 * Ensure l402_payments table exists. Called once at server start via initL402Table().
 */
async function initL402Table() {
  await db.run(`
    CREATE TABLE IF NOT EXISTS l402_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_hash TEXT UNIQUE NOT NULL,
      preimage TEXT,
      amount_sat INTEGER NOT NULL,
      resource_path TEXT NOT NULL,
      paid_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_l402_hash ON l402_payments(payment_hash)`);
}

/**
 * USD cents to satoshis using a configurable rate (default 100,000 sats/USD).
 */
function usdToSats(priceUsd) {
  const rate = parseInt(process.env.BTC_USD_RATE || '100000', 10);
  return Math.max(1, Math.round(priceUsd * rate / 100));
}

/**
 * Generate a mock invoice for development when ArxMint is not configured.
 * Returns a fake bolt11 string and a random payment_hash for testing.
 */
function mockInvoice(amountSat, resourcePath) {
  const paymentHash = crypto.randomBytes(32).toString('hex');
  const macaroon = crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 1000).toISOString();
  return {
    invoice: `lnbc${amountSat}u1mock_invoice_${paymentHash.slice(0, 8)}`,
    payment_hash: paymentHash,
    macaroon,
    amount_sat: amountSat,
    expires_at: expiresAt,
  };
}

/**
 * Create a Lightning invoice via ArxMint or fall back to a mock.
 */
async function createInvoice(amountSat, resourcePath) {
  const arx = getArxmintService();
  if (arx && arx.enabled) {
    try {
      const result = await arx.createL402Invoice(amountSat, resourcePath, `Access: ${resourcePath}`);
      if (result && result.invoice) {
        return result;
      }
    } catch (err) {
      console.warn('[L402] ArxMint invoice creation failed, using mock:', err.message);
    }
  }
  // Fallback: mock invoice (dev/test environments)
  return mockInvoice(amountSat, resourcePath);
}

/**
 * Verify a preimage against a stored payment_hash.
 * SHA256(preimage_bytes) must equal payment_hash_bytes.
 * Returns true if valid, false otherwise.
 */
function verifyPreimage(preimage, paymentHash) {
  try {
    const preimageBytes = Buffer.from(preimage, 'hex');
    const computed = crypto.createHash('sha256').update(preimageBytes).digest('hex');
    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(computed, 'hex'),
      Buffer.from(paymentHash, 'hex')
    );
  } catch (_) {
    return false;
  }
}

/**
 * Middleware factory: requireL402(priceUsd)
 *
 * Wrap any route to require Lightning payment before serving content.
 * On success, sets req.l402Paid = true and calls next().
 *
 * Usage:
 *   router.get('/premium-content', requireL402(4.99), handler);
 *
 * @param {number} priceUsd - Price in USD (e.g. 4.99)
 */
function requireL402(priceUsd) {
  return async function l402Middleware(req, res, next) {
    const authHeader = req.headers['authorization'] || '';
    const resourcePath = req.path || req.url || '/';

    // Check for L402 credential
    if (authHeader.startsWith('L402 ')) {
      const credential = authHeader.slice(5); // strip "L402 "
      const colonIdx = credential.indexOf(':');
      if (colonIdx === -1) {
        return res.status(400).json({ error: 'Invalid L402 Authorization format. Expected: L402 <macaroon>:<preimage>' });
      }
      const macaroon = credential.slice(0, colonIdx);
      const preimage = credential.slice(colonIdx + 1);

      // Look up the pending payment by macaroon (stored as payment_hash lookup)
      const payment = await db.get(
        `SELECT * FROM l402_payments WHERE payment_hash = ? LIMIT 1`,
        [macaroon]
      ).catch(() => null);

      if (!payment) {
        return res.status(401).json({ error: 'Payment record not found. Request a new invoice.' });
      }

      if (payment.paid_at) {
        // Already paid — allow access
        req.l402Paid = true;
        req.l402Payment = payment;
        return next();
      }

      // Verify the preimage
      if (!verifyPreimage(preimage, payment.payment_hash)) {
        return res.status(402).json({
          error: 'Invalid preimage. Payment not verified.',
          payment_hash: payment.payment_hash,
        });
      }

      // Mark as paid
      const now = new Date().toISOString();
      await db.run(
        `UPDATE l402_payments SET preimage = ?, paid_at = ? WHERE payment_hash = ?`,
        [preimage, now, payment.payment_hash]
      ).catch(err => console.error('[L402] Failed to mark payment:', err));

      req.l402Paid = true;
      req.l402Payment = { ...payment, preimage, paid_at: now };
      return next();
    }

    // No L402 credential — issue invoice
    const amountSat = usdToSats(priceUsd);
    let invoiceData;
    try {
      invoiceData = await createInvoice(amountSat, resourcePath);
    } catch (err) {
      console.error('[L402] Invoice creation error:', err);
      // Graceful degradation: if invoice creation fails, skip L402 and allow token-based fallback
      req.l402Paid = false;
      return next();
    }

    // Store pending payment record
    try {
      await db.run(
        `INSERT OR IGNORE INTO l402_payments (payment_hash, amount_sat, resource_path)
         VALUES (?, ?, ?)`,
        [invoiceData.payment_hash, amountSat, resourcePath]
      );
    } catch (err) {
      console.error('[L402] Failed to store payment record:', err);
    }

    // Respond with HTTP 402
    res.setHeader(
      'WWW-Authenticate',
      `L402 macaroon="${invoiceData.payment_hash}", invoice="${invoiceData.invoice}"`
    );
    return res.status(402).json({
      error: 'Payment required',
      invoice: invoiceData.invoice,
      payment_hash: invoiceData.payment_hash,
      amount_sat: amountSat,
      expires_at: invoiceData.expires_at || new Date(Date.now() + 60000).toISOString(),
      instructions: 'Pay the Lightning invoice, then re-request with Authorization: L402 <payment_hash>:<preimage>',
    });
  };
}

module.exports = { requireL402, initL402Table, verifyPreimage, usdToSats };
