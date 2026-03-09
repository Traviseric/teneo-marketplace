---
id: 2
title: "Remove hardcoded BTC price ($60k) and extract magic numbers in checkout.js"
priority: P0
severity: critical
status: completed
source: code_quality_audit
file: marketplace/backend/routes/checkout.js
line: 921
created: "2026-03-09T23:45:00Z"
execution_hint: sequential
context_group: checkout_module
group_reason: "Same file as tasks 001, 005, 008"
---

# Remove hardcoded BTC price ($60k) and extract magic numbers in checkout.js

**Priority:** P0 (critical)
**Source:** code_quality_audit
**Location:** marketplace/backend/routes/checkout.js:921

## Problem

`checkout.js` line 921 has a hardcoded BTC price of $60,000 used to calculate satoshi amounts for ArxMint:

```javascript
const amountSats = Math.round((usdAmount / 60000) * 1e8); // rough sats estimate for ArxMint
```

This is **dangerous** — if BTC price diverges significantly from $60k, buyers will be charged wrong amounts. If BTC drops to $30k, buyers pay half price. If BTC rises to $120k, buyers overpay by 2x.

Additionally, scattered magic numbers in checkout.js make the code hard to maintain:
- `windowMs: 60 * 60 * 1000` — rate limit window (1 hour)
- `windowMs: 60 * 1000, max: 30` — second rate limiter
- `max: 10` — checkout rate limit max

**Code with issue:**
```javascript
const amountSats = Math.round((usdAmount / 60000) * 1e8); // rough sats estimate for ArxMint
```

## How to Fix

**For the hardcoded BTC price:**

Option A (preferred): Reuse the `getUsdPrice()` function already available in `cryptoCheckout.js` — extract it to a shared service or import it.

Option B (quick fix): Add an env var fallback with a warning:
```javascript
const BTC_FALLBACK_PRICE_USD = parseInt(process.env.BTC_FALLBACK_PRICE_USD || '0', 10);
if (!BTC_FALLBACK_PRICE_USD) {
  console.error('[checkout] BTC_FALLBACK_PRICE_USD not set — cannot calculate sats amount accurately');
  return res.status(503).json({ success: false, error: 'Lightning payment temporarily unavailable' });
}
const amountSats = Math.round((usdAmount / BTC_FALLBACK_PRICE_USD) * 1e8);
```

**For magic numbers:** Extract to named constants at the top of checkout.js:
```javascript
const CHECKOUT_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const CHECKOUT_RATE_LIMIT_MAX = 10;
const WEBHOOK_RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const WEBHOOK_RATE_LIMIT_MAX = 30;
```

## Acceptance Criteria

- [ ] Hardcoded `60000` BTC price removed from checkout.js
- [ ] Either use live price API or env var with fail-fast behavior
- [ ] Named constants extracted for rate limiter magic numbers
- [ ] Tests still pass
- [ ] No hardcoded prices remain in checkout.js

## Notes

_Generated from code_quality_audit findings._
