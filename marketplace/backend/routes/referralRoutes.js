const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../database/database');
const { sanitizeBrandId } = require('../services/checkoutOfferService');
const { safeMessage } = require('../utils/validate');

/**
 * GET /api/referral/code
 * Admin-only. Returns existing referral code for the brand, or generates a new one.
 * Query: ?brandId=xyz
 */
router.get('/code', async (req, res) => {
  try {
    const brandId = sanitizeBrandId(req.query.brandId) || process.env.DEFAULT_BRAND || 'teneo';

    const existing = await db.get(
      'SELECT * FROM referral_codes WHERE referrer_brand_id = ?',
      [brandId]
    );

    if (existing) {
      const baseUrl = process.env.PUBLIC_URL || process.env.FRONTEND_URL || 'http://localhost:3001';
      return res.json({
        success: true,
        code: existing.code,
        referrer_brand_id: existing.referrer_brand_id,
        commission_rate_new: existing.commission_rate_new,
        commission_rate_repeat: existing.commission_rate_repeat,
        referral_url: `${baseUrl}/store/${brandId}?ref=${existing.code}`,
        created_at: existing.created_at,
      });
    }

    // Generate a short alphanumeric code
    const code = crypto.randomBytes(5).toString('hex').toUpperCase(); // 10-char code

    await db.run(
      `INSERT INTO referral_codes (code, referrer_brand_id, commission_rate_new, commission_rate_repeat)
       VALUES (?, ?, 0.15, 0.02)`,
      [code, brandId]
    );

    const baseUrl = process.env.PUBLIC_URL || process.env.FRONTEND_URL || 'http://localhost:3001';
    res.json({
      success: true,
      code,
      referrer_brand_id: brandId,
      commission_rate_new: 0.15,
      commission_rate_repeat: 0.02,
      referral_url: `${baseUrl}/store/${brandId}?ref=${code}`,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[referral/code] Error:', error);
    res.status(500).json({ success: false, error: safeMessage(error) });
  }
});

/**
 * GET /api/referral/stats
 * Admin-only. Returns referral stats for a brand.
 * Query: ?brandId=xyz
 */
router.get('/stats', async (req, res) => {
  try {
    const brandId = sanitizeBrandId(req.query.brandId) || process.env.DEFAULT_BRAND || 'teneo';

    const codeRow = await db.get(
      'SELECT code FROM referral_codes WHERE referrer_brand_id = ?',
      [brandId]
    );

    if (!codeRow) {
      return res.json({ success: true, code: null, stats: { total: 0, pending: 0, paid: 0, cancelled: 0, total_commission: 0, pending_commission: 0 } });
    }

    const stats = await db.get(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
         SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid,
         SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
         SUM(commission_amount) as total_commission,
         SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END) as pending_commission
       FROM referrals WHERE referral_code = ?`,
      [codeRow.code]
    );

    const recent = await db.all(
      `SELECT referred_order_id, referred_email, is_new_customer, commission_amount, status, created_at
       FROM referrals WHERE referral_code = ? ORDER BY created_at DESC LIMIT 20`,
      [codeRow.code]
    );

    res.json({
      success: true,
      code: codeRow.code,
      stats: {
        total: stats.total || 0,
        pending: stats.pending || 0,
        paid: stats.paid || 0,
        cancelled: stats.cancelled || 0,
        total_commission: Number((stats.total_commission || 0).toFixed(2)),
        pending_commission: Number((stats.pending_commission || 0).toFixed(2)),
      },
      recent,
    });
  } catch (error) {
    console.error('[referral/stats] Error:', error);
    res.status(500).json({ success: false, error: safeMessage(error) });
  }
});

/**
 * POST /api/referral/track
 * Internal — called from checkout webhook to record a referral conversion.
 * Body: { referralCode, orderId, customerEmail, orderAmount }
 * Not exposed publicly — used internally by handleCheckoutCompleted.
 */
async function trackReferral({ referralCode, orderId, customerEmail, orderAmount }) {
  try {
    const codeRow = await db.get(
      'SELECT * FROM referral_codes WHERE code = ?',
      [referralCode]
    );
    if (!codeRow) return null;

    // Determine new vs repeat customer by checking prior completed orders
    const priorOrder = await db.get(
      `SELECT id FROM orders WHERE customer_email = ? AND order_id != ? AND status = 'completed' LIMIT 1`,
      [customerEmail, orderId]
    );
    const isNew = !priorOrder;
    const rate = isNew ? codeRow.commission_rate_new : codeRow.commission_rate_repeat;
    const commission = Math.round(orderAmount * rate * 100) / 100;

    await db.run(
      `INSERT INTO referrals (referral_code, referred_order_id, referred_email, is_new_customer, commission_amount, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [referralCode, orderId, customerEmail, isNew ? 1 : 0, commission]
    );

    console.log(`[referral] Tracked: code=${referralCode} order=${orderId} new=${isNew} commission=$${commission}`);
    return { isNew, commission, rate };
  } catch (err) {
    console.warn('[referral] trackReferral failed (non-fatal):', err.message);
    return null;
  }
}

/**
 * GET /api/referral/commissions
 * Admin-only. Returns all referral commissions with optional status filter.
 * Query: ?status=pending|paid|cancelled&limit=50&offset=0
 */
router.get('/commissions', async (req, res) => {
  try {
    const status = req.query.status || null;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const offset = parseInt(req.query.offset, 10) || 0;

    const params = [];
    let whereClause = '';
    if (status) {
      whereClause = 'WHERE r.status = ?';
      params.push(status);
    }

    const rows = await db.all(
      `SELECT r.id, r.referral_code, r.referred_order_id, r.referred_email,
              r.is_new_customer, r.commission_amount, r.status, r.created_at,
              rc.referrer_brand_id
       FROM referrals r
       LEFT JOIN referral_codes rc ON rc.code = r.referral_code
       ${whereClause}
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const totals = await db.get(
      `SELECT COUNT(*) as total,
              SUM(commission_amount) as total_commission,
              SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END) as pending_commission
       FROM referrals ${whereClause}`,
      params
    );

    res.json({
      success: true,
      commissions: rows,
      totals: {
        count: totals.total || 0,
        total_commission: Number((totals.total_commission || 0).toFixed(2)),
        pending_commission: Number((totals.pending_commission || 0).toFixed(2)),
      },
      pagination: { limit, offset },
    });
  } catch (error) {
    console.error('[referral/commissions] Error:', error);
    res.status(500).json({ success: false, error: safeMessage(error) });
  }
});

/**
 * POST /api/referral/commissions/:id/mark-paid
 * Admin-only. Marks a referral commission as paid.
 * Body: { payout_note?: string }
 */
router.post('/commissions/:id/mark-paid', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid commission ID' });
    }

    const row = await db.get('SELECT * FROM referrals WHERE id = ?', [id]);
    if (!row) {
      return res.status(404).json({ success: false, error: 'Commission not found' });
    }
    if (row.status === 'paid') {
      return res.status(409).json({ success: false, error: 'Commission already marked as paid' });
    }

    await db.run(
      `UPDATE referrals SET status = 'paid' WHERE id = ?`,
      [id]
    );

    console.log(`[referral] Commission ${id} marked as paid (was: ${row.status})`);
    res.json({
      success: true,
      id,
      previous_status: row.status,
      status: 'paid',
      commission_amount: row.commission_amount,
      referral_code: row.referral_code,
    });
  } catch (error) {
    console.error('[referral/commissions/mark-paid] Error:', error);
    res.status(500).json({ success: false, error: safeMessage(error) });
  }
});

module.exports = router;
module.exports.trackReferral = trackReferral;
