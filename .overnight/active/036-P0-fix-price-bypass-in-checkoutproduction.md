---
id: 36
title: "Fix client-supplied price bypass in checkoutProduction.js"
priority: P0
severity: critical
status: completed
source: code_quality_audit
file: marketplace/backend/routes/checkoutProduction.js
line: 19
created: "2026-02-28T08:00:00"
execution_hint: sequential
context_group: checkout_module
group_reason: "Same checkout domain as task 038 (checkoutMixed error swallowing)"
---

# Fix client-supplied price bypass in checkoutProduction.js

**Priority:** P0 (critical)
**Source:** code_quality_audit
**Location:** marketplace/backend/routes/checkoutProduction.js:19

## Problem

`checkoutProduction.js` is the route loaded in production (`NODE_ENV === 'production'` check in server.js line 61-63). It extracts `price` from `req.body` and uses it directly to create the Stripe session — with only a basic range check ($0.01–$9999), but no catalog lookup.

Note: `checkout.js` (the dev route) was already fixed in task 020, but `checkoutProduction.js` was NOT updated at that time. The production route is still vulnerable.

**Code with issue:**
```javascript
// checkoutProduction.js line 19
const { bookId, format, price, bookTitle, bookAuthor, userEmail } = req.body;

// Validate price — only range check, no catalog verification:
if (price <= 0 || price > 9999) {
    return res.status(400).json({ error: 'Invalid price...' });
}

// Price from client used directly:
unit_amount: Math.round(price * 100),
```

An attacker submits `price: 0.01` for any book and pays $0.01. Stripe happily charges $0.01 because we told it to. This is a live revenue bypass in production.

## How to Fix

Port the exact same `lookupBookPrice()` fix that was applied to `checkout.js` in task 020. Look up the authoritative price server-side before creating the Stripe session:

```javascript
// 1. Remove 'price' from destructuring:
const { bookId, format, bookTitle, bookAuthor, userEmail } = req.body;

// 2. Look up authoritative price (use same pattern as checkout.js):
const catalogPrice = await lookupBookPrice(bookId, format);
if (!catalogPrice) {
    return res.status(400).json({
        error: 'Book not found in catalog',
        bookId, format
    });
}

// 3. Use catalogPrice in Stripe session:
unit_amount: Math.round(catalogPrice * 100),
```

Read `checkout.js` first to copy the exact `lookupBookPrice()` implementation already used there. The two files should share identical price-lookup logic.

## Acceptance Criteria

- [ ] Client-supplied `price` field is no longer trusted in checkoutProduction.js
- [ ] Price is looked up server-side from catalog using `bookId` and `format`
- [ ] If book not found in catalog, request rejected with 400
- [ ] Stripe session created with server-authoritative price
- [ ] checkoutProduction.js uses same lookup pattern as checkout.js
- [ ] Existing tests still pass (npm test)

## Notes

_Generated from code_quality_audit findings. This is the same vulnerability that was fixed in checkout.js (task 020) but was missed in the production variant. Fix before any production deployment._
