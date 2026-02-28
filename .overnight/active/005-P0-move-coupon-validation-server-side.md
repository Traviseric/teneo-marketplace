---
id: 5
title: "Move coupon validation from client-side to server-side"
priority: P0
severity: critical
status: completed
source: gap_analyzer
file: marketplace/frontend/cart-custom.html
line: 529
created: "2026-02-28T00:00:00"
execution_hint: sequential
context_group: auth_security
group_reason: "Security fix — payment integrity; related to checkout flow"
---

# Move coupon validation from client-side to server-side

**Priority:** P0 (critical)
**Source:** gap_analyzer
**Location:** marketplace/frontend/cart-custom.html:529

## Problem

Coupon validation is entirely client-side with hardcoded coupon codes in the frontend JavaScript. Any user can open browser DevTools and apply arbitrary discounts, manipulate prices, or extract all valid coupon codes.

**Code with issue:**
```javascript
// cart-custom.html lines 528-550 — client-side coupon validation
function applyCoupon() {
    const code = document.getElementById('coupon-code').value.trim().toUpperCase();

    // Check coupon (in real app, validate server-side)
    const coupons = {
        'SAVE10': { type: 'percent', value: 10 },
        '10OFF': { type: 'fixed', value: 10 },
        'WELCOME20': { type: 'percent', value: 20 }
    };

    if (coupons[code]) {
        // applies discount directly without server verification
    }
}
```

The final price sent to Stripe checkout must be verified server-side — otherwise buyers can modify JavaScript values before the checkout request.

## How to Fix

**Backend:** Create a coupon validation endpoint:

```javascript
// Add to adminRoutes.js or create coupons.js route
// POST /api/coupons/validate
router.post('/coupons/validate', async (req, res) => {
    const { code, cartTotal } = req.body;
    // Look up coupon from database or env-configured codes
    const coupon = await validateCouponCode(code);
    if (!coupon) return res.json({ valid: false });
    const discount = calculateDiscount(coupon, cartTotal);
    res.json({ valid: true, discount, couponType: coupon.type, couponValue: coupon.value });
});
```

**Frontend:** Replace hardcoded lookup with API call:
```javascript
async function applyCoupon() {
    const code = document.getElementById('coupon-code').value.trim().toUpperCase();
    const subtotal = cart.items.reduce((sum, item) => sum + item.price, 0);

    const resp = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, cartTotal: subtotal })
    });
    const result = await resp.json();
    if (result.valid) {
        cart.discount = result.discount;
        cart.coupon = code;
        updateTotal();
    } else {
        alert('Invalid coupon code');
    }
}
```

**Checkout verification:** In the Stripe session creation endpoint, verify the coupon code and discount server-side before creating the session with the discounted price. Never trust price values from the frontend.

Store coupon codes in environment variables or the database, not in frontend code.

## Acceptance Criteria

- [ ] Coupon codes removed from frontend JavaScript
- [ ] `/api/coupons/validate` endpoint created and working
- [ ] Frontend calls API to validate coupon before displaying discount
- [ ] Stripe checkout session creation verifies coupon on server before applying discount
- [ ] Invalid manipulation of discount in the request is rejected

## Notes

_Generated from gap_analyzer security findings. This is a payment integrity issue — hardcoded client-side discounts allow price manipulation._
