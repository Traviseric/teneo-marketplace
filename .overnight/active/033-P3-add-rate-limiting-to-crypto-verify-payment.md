---
id: 33
title: "Add rate limiting to crypto verify-payment endpoint"
priority: P3
severity: low
status: completed
source: security_audit
file: marketplace/backend/routes/cryptoCheckout.js
line: 200
created: "2026-02-28T06:00:00"
execution_hint: parallel
context_group: independent
group_reason: "Small addition to cryptoCheckout.js, independent of other tasks"
cwe: CWE-306
---

# Add rate limiting to crypto verify-payment endpoint

**Priority:** P3 (low)
**Source:** security_audit
**Location:** marketplace/backend/routes/cryptoCheckout.js:200

## Problem

The crypto payment verification endpoint accepts any `orderId` and `transactionId` without authentication or rate limiting. Anyone can submit bogus transaction IDs for any order, potentially:
- Polluting order records with fake transaction IDs
- Causing denial of service by flooding orders with fake verification attempts
- Interfering with manual review of legitimate payments

**Code with issue:**
```javascript
// cryptoCheckout.js line 200
router.post('/verify-payment', async (req, res) => {
    try {
        const { orderId, transactionId } = req.body;
        if (!orderId) return res.status(400)...
        await dbRun(`UPDATE orders SET metadata = json_set(...)`, [transactionId || '', orderId]);
```

While crypto payment verification is ultimately manual, flooding the endpoint can pollute the order database and disrupt admin review.

## How to Fix

Add rate limiting to prevent abuse:

```javascript
const rateLimit = require('express-rate-limit');

// Crypto verify-payment rate limiter (3 attempts per 15 min per IP)
const cryptoVerifyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    message: { success: false, error: 'Too many verification attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post('/verify-payment', cryptoVerifyLimiter, async (req, res) => { ... });
```

Optionally, also require `email` in the request body and verify it matches the order's `user_email` before updating:

```javascript
const { orderId, transactionId, email } = req.body;
const order = await dbGet('SELECT * FROM orders WHERE id = ?', [orderId]);
if (!order || order.user_email.toLowerCase() !== email?.toLowerCase()) {
    return res.status(403).json({ success: false, error: 'Verification failed' });
}
```

## Acceptance Criteria

- [ ] Rate limiter applied to POST `/api/crypto/verify-payment` (max 3/15min per IP)
- [ ] Exceeding rate limit returns 429
- [ ] Legitimate payment verification still works within the rate limit
- [ ] Optionally: email verification added so only order owner can submit verification

## Notes

_Generated from security_audit findings. CWE-306: Missing Authentication for Critical Function. Low priority since crypto payments are manual review anyway, but rate limiting prevents database flooding._
