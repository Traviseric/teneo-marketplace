---
id: 1
title: "Fix crypto checkout client-supplied price bypass"
priority: P1
severity: high
status: completed
source: security_audit
file: marketplace/backend/routes/cryptoCheckout.js
line: 118
created: "2026-03-06T00:00:00Z"
execution_hint: sequential
context_group: checkout_pricing
group_reason: "Same feature area as any price-validation fixes; depends on checkoutOfferService pattern used in checkout.js"
---

# Fix Crypto Checkout Client-Supplied Price Bypass

**Priority:** P1 (high)
**Source:** security_audit
**Location:** marketplace/backend/routes/cryptoCheckout.js:118

## Problem

The crypto checkout `/api/crypto/create-order` endpoint accepts the price from the client request body (`amountUsd`) with no server-side validation against the catalog price. An attacker can send `amountUsd=0.01` to purchase any book for $0.01 worth of crypto.

**Code with issue:**
```javascript
const usdAmount = parseFloat(amountUsd) || 10; // default $10 if not provided
```

Unlike the Stripe checkout flow (which uses `lookupBookPrice` from `checkoutOfferService`), the crypto flow has no server-side price enforcement. The client-supplied `amountUsd` is trusted directly.

## How to Fix

Use `lookupBookPrice(bookId, format, brandId)` from `checkoutOfferService` (or the equivalent from `checkoutProductionService`) to fetch the authoritative catalog price server-side, identical to how `checkout.js` handles it. Reject or override any client-supplied price.

```javascript
const { lookupBookPrice } = require('../services/checkoutOfferService');
// ...
const catalogPrice = await lookupBookPrice(bookId, format || 'ebook', brandId);
if (!catalogPrice) {
  return res.status(400).json({ error: 'Product not found' });
}
const usdAmount = catalogPrice; // use catalog price, ignore client amountUsd
```

## Acceptance Criteria

- [ ] `amountUsd` from request body is ignored; server fetches price from catalog
- [ ] Sending `amountUsd=0.01` results in the correct catalog price being charged
- [ ] Missing/invalid `bookId` returns a 400 error
- [ ] No regressions in existing crypto checkout flow

## Notes

_Generated from security_audit findings. CWE-602._
