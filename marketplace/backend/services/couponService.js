/**
 * couponService — DB-backed coupon validation with expiry and usage limits.
 * Falls back to static env-var coupons (SAVE10, WELCOME20 etc.) when a code
 * is not found in the database.
 */
const db = require('../database/database');

// Static coupons — override via COUPONS_JSON env var in production.
function getStaticCoupons() {
  if (process.env.COUPONS_JSON) {
    try {
      return JSON.parse(process.env.COUPONS_JSON);
    } catch (e) {
      console.error('[couponService] Invalid COUPONS_JSON env var:', e.message);
    }
  }
  return {
    'SAVE10':     { type: 'percent', value: 10 },
    '10OFF':      { type: 'fixed',   value: 10 },
    'WELCOME20':  { type: 'percent', value: 20 },
    'NEXTREAD15': { type: 'percent', value: 15 },
  };
}

function calcDiscount(type, amount, cartTotal) {
  if (type === 'percentage' || type === 'percent') {
    return Math.round(cartTotal * (amount / 100) * 100) / 100;
  }
  // fixed — cap at cart total
  return Math.min(amount, cartTotal);
}

/**
 * Validate a coupon code against DB (expiry, usage limits) then static fallback.
 * @param {string} code
 * @param {number} cartTotal
 * @returns {{ valid: boolean, code?: string, discountType?: string, discountAmount?: number, message?: string, source?: string }}
 */
async function validateCoupon(code, cartTotal) {
  if (!code || typeof code !== 'string') {
    return { valid: false, message: 'Coupon code is required' };
  }

  const normalizedCode = code.trim().toUpperCase();
  const amount = parseFloat(cartTotal) || 0;

  // --- DB lookup ---
  try {
    const row = await db.get(
      'SELECT * FROM coupons WHERE code = ? AND active = 1',
      [normalizedCode]
    );

    if (row) {
      if (row.expires_at && new Date(row.expires_at) < new Date()) {
        return { valid: false, message: 'Coupon has expired' };
      }
      if (row.max_uses !== null && row.max_uses !== undefined && row.used_count >= row.max_uses) {
        return { valid: false, message: 'Coupon usage limit reached' };
      }

      const discount = calcDiscount(row.type, row.amount, amount);
      return {
        valid: true,
        code: normalizedCode,
        discountType: row.type,
        discountAmount: discount,
        source: 'db',
      };
    }
  } catch (err) {
    console.error('[couponService] DB lookup error:', err.message);
  }

  // --- Static fallback ---
  const staticCoupons = getStaticCoupons();
  const staticCoupon = staticCoupons[normalizedCode];
  if (!staticCoupon) {
    return { valid: false };
  }

  const discount = calcDiscount(staticCoupon.type, staticCoupon.value, amount);
  return {
    valid: true,
    code: normalizedCode,
    discountType: staticCoupon.type,
    discountAmount: discount,
    source: 'static',
  };
}

/**
 * Increment used_count for a DB coupon. No-op for static coupons.
 * Call after a successful payment (checkout.session.completed).
 */
async function applyCoupon(code) {
  if (!code || typeof code !== 'string') return;
  const normalizedCode = code.trim().toUpperCase();
  try {
    await db.run(
      'UPDATE coupons SET used_count = used_count + 1 WHERE code = ? AND active = 1',
      [normalizedCode]
    );
  } catch (err) {
    console.error('[couponService] applyCoupon error:', err.message);
  }
}

/**
 * Create a new coupon in the database.
 * @param {{ code: string, type: 'percentage'|'fixed', amount: number, expires_at?: string, max_uses?: number }} data
 */
async function createCoupon(data) {
  const { code, type, amount, expires_at, max_uses } = data;
  if (!code || !type || amount == null) {
    throw new Error('code, type, and amount are required');
  }
  if (!['percentage', 'fixed'].includes(type)) {
    throw new Error('type must be "percentage" or "fixed"');
  }
  const normalizedCode = code.trim().toUpperCase();
  const result = await db.run(
    'INSERT INTO coupons (code, type, amount, expires_at, max_uses) VALUES (?, ?, ?, ?, ?)',
    [normalizedCode, type, Number(amount), expires_at || null, max_uses || null]
  );
  return { id: result.lastID, code: normalizedCode };
}

/** List all coupons (admin). */
async function listCoupons() {
  return db.all('SELECT * FROM coupons ORDER BY created_at DESC');
}

/** Soft-delete a coupon by ID (admin). */
async function deactivateCoupon(id) {
  await db.run('UPDATE coupons SET active = 0 WHERE id = ?', [id]);
}

module.exports = {
  validateCoupon,
  applyCoupon,
  createCoupon,
  listCoupons,
  deactivateCoupon,
};
