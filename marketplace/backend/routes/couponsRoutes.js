const express = require('express');
const router = express.Router();

// Coupon definitions stored server-side only.
// Override via COUPONS_JSON env var: '{"SAVE10":{"type":"percent","value":10}}'
function getCoupons() {
    if (process.env.COUPONS_JSON) {
        try {
            return JSON.parse(process.env.COUPONS_JSON);
        } catch (e) {
            console.error('Invalid COUPONS_JSON env var:', e.message);
        }
    }
    // Default coupons — set COUPONS_JSON in production to override
    return {
        'SAVE10':    { type: 'percent', value: 10 },
        '10OFF':     { type: 'fixed',   value: 10 },
        'WELCOME20': { type: 'percent', value: 20 }
    };
}

function calculateDiscount(coupon, cartTotal) {
    if (coupon.type === 'percent') {
        return Math.round(cartTotal * (coupon.value / 100) * 100) / 100;
    }
    // fixed — cap at cart total
    return Math.min(coupon.value, cartTotal);
}

// POST /api/coupons/validate
// Public endpoint — validates coupon code server-side and returns discount amount.
// Never exposes the full coupon list; only confirms validity for a specific code.
router.post('/validate', async (req, res) => {
    try {
        const { code, cartTotal } = req.body;

        if (!code || typeof code !== 'string') {
            return res.status(400).json({ valid: false, error: 'Coupon code is required' });
        }

        const normalizedCode = code.trim().toUpperCase();
        const cartAmount = parseFloat(cartTotal) || 0;

        const coupons = getCoupons();
        const coupon = coupons[normalizedCode];

        if (!coupon) {
            return res.json({ valid: false });
        }

        const discount = calculateDiscount(coupon, cartAmount);

        res.json({
            valid: true,
            code: normalizedCode,
            couponType: coupon.type,
            couponValue: coupon.value,
            discount
        });
    } catch (error) {
        console.error('Coupon validation error:', error);
        res.status(500).json({ valid: false, error: 'Coupon validation failed' });
    }
});

// Export the discount calculator so checkout routes can re-verify server-side
module.exports = router;
module.exports.calculateDiscount = calculateDiscount;
module.exports.getCoupons = getCoupons;
