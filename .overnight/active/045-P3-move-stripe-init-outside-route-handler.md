---
id: 45
title: "Move Stripe client initialization outside the refund route handler in adminRoutes.js"
priority: P3
severity: medium
status: completed
source: code_quality_audit
file: marketplace/backend/routes/adminRoutes.js
line: 200
created: "2026-02-28T08:00:00"
execution_hint: sequential
context_group: admin_dashboard
group_reason: "Same adminRoutes.js file as tasks 040 (conversion rate) and 047 (duplicate helpers)"
---

# Move Stripe client initialization outside the refund route handler in adminRoutes.js

**Priority:** P3 (medium)
**Source:** code_quality_audit
**Location:** marketplace/backend/routes/adminRoutes.js:200

## Problem

`require('stripe')(process.env.STRIPE_SECRET_KEY)` is called inside the route handler for `POST /orders/:orderId/refund`. This re-instantiates the Stripe SDK client on every refund request, wasting resources and bypassing connection pooling/client caching.

**Code with issue:**
```javascript
// adminRoutes.js line ~200 — inside route handler:
router.post('/orders/:orderId/refund', authenticateAdmin, async (req, res) => {
    try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);  // ← per-request init!
        // ...
    }
});
```

The Stripe client should be a singleton instantiated once at module load. Re-creating it per-request wastes memory and loses any internal connection pooling benefits.

## How to Fix

Move the Stripe initialization to module level, alongside the other imports:

```javascript
// adminRoutes.js — at the top with other requires:
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Then in the route handler — just use the already-initialized client:
router.post('/orders/:orderId/refund', authenticateAdmin, async (req, res) => {
    try {
        // stripe is already initialized, use it directly
        const refund = await stripe.refunds.create({ ... });
    }
});
```

Check if `STRIPE_SECRET_KEY` might be undefined at module load time (e.g., if it's set later). If so, use lazy initialization with a getter:

```javascript
let _stripe = null;
function getStripe() {
    if (!_stripe) _stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    return _stripe;
}
// Then in route: const refund = await getStripe().refunds.create(...)
```

## Acceptance Criteria

- [ ] Stripe client initialized once at module level (not per-request)
- [ ] Refund route uses the module-level Stripe instance
- [ ] If STRIPE_SECRET_KEY is conditionally available, lazy init getter is used
- [ ] npm test passes after changes

## Notes

_Generated from code_quality_audit findings. P3 — performance/best-practice fix, not a correctness bug. Quick change that improves resource efficiency. Bundle with other adminRoutes.js changes in tasks 040 and 047._
