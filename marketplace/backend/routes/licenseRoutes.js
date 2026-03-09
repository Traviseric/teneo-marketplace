const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const licenseKeyService = require('../services/licenseKeyService');
const { safeMessage } = require('../utils/validate');

const validateLimiter = process.env.NODE_ENV === 'test'
  ? (req, res, next) => next()
  : rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });

const activateLimiter = process.env.NODE_ENV === 'test'
  ? (req, res, next) => next()
  : rateLimit({ windowMs: 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

/**
 * GET /api/license/validate?key=XXXX-XXXX-XXXX-XXXX
 * Public endpoint — sellers embed this in their software to verify buyer licenses.
 * Returns: { valid, product_id, email_masked, activations, max_activations, activations_left }
 */
router.get('/validate', validateLimiter, async (req, res) => {
  try {
    const { key } = req.query;
    if (!key || typeof key !== 'string' || key.length > 20) {
      return res.status(400).json({ valid: false, error: 'key parameter is required' });
    }
    const result = await licenseKeyService.validateKey(key.toUpperCase().trim());
    res.json(result);
  } catch (error) {
    console.error('[license/validate] Error:', error);
    res.status(500).json({ valid: false, error: safeMessage(error) });
  }
});

/**
 * POST /api/license/activate
 * Body: { key }
 * Increments activation count (enforces max_activations limit).
 * Returns: { success, activations_left } or { success: false, error }
 */
router.post('/activate', activateLimiter, async (req, res) => {
  try {
    const { key } = req.body;
    if (!key || typeof key !== 'string' || key.length > 20) {
      return res.status(400).json({ success: false, error: 'key is required' });
    }
    const result = await licenseKeyService.activateKey(key.toUpperCase().trim());
    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
  } catch (error) {
    console.error('[license/activate] Error:', error);
    res.status(500).json({ success: false, error: safeMessage(error) });
  }
});

/**
 * GET /api/license/keys (admin — requires session auth)
 * Query params: email, productId, limit, offset
 */
router.get('/keys', async (req, res) => {
  try {
    if (!req.session || !req.session.admin) {
      return res.status(401).json({ error: 'Admin authentication required' });
    }
    const { email, productId, limit = '100', offset = '0' } = req.query;
    const keys = await licenseKeyService.listKeys({
      email: email || null,
      productId: productId || null,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });
    res.json({ success: true, keys });
  } catch (error) {
    console.error('[license/keys] Error:', error);
    res.status(500).json({ error: safeMessage(error) });
  }
});

/**
 * POST /api/license/revoke (admin — requires session auth)
 * Body: { key }
 */
router.post('/revoke', async (req, res) => {
  try {
    if (!req.session || !req.session.admin) {
      return res.status(401).json({ error: 'Admin authentication required' });
    }
    const { key } = req.body;
    if (!key) return res.status(400).json({ error: 'key is required' });
    await licenseKeyService.revokeKey(key.toUpperCase().trim());
    res.json({ success: true, message: 'License key revoked' });
  } catch (error) {
    console.error('[license/revoke] Error:', error);
    res.status(500).json({ error: safeMessage(error) });
  }
});

module.exports = router;
