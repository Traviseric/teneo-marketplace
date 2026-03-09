---
id: 3
title: "Fix Stripe lazy initialization race condition in adminRoutes.js"
priority: P2
severity: medium
status: completed
source: code_quality_audit
file: marketplace/backend/routes/adminRoutes.js
line: 26
created: "2026-03-09T16:00:00Z"
execution_hint: parallel
context_group: independent
group_reason: "Single-file fix, no overlap with other tasks"
---

# Fix Stripe lazy initialization race condition in adminRoutes.js

**Priority:** P2 (medium)
**Source:** code_quality_audit
**Location:** marketplace/backend/routes/adminRoutes.js:26

## Problem

`adminRoutes.js` uses a lazy Stripe initialization pattern with a module-level mutable variable:

```javascript
let _stripe = null;
// ...
if (!_stripe) {
  _stripe = require('stripe')(key);
}
```

Under concurrent requests, two requests can both read `_stripe === null` and both attempt to initialize it, creating a race condition. While Node.js is single-threaded and this rarely causes actual failures (the second init just overwrites), it is nonetheless a code smell that can cause issues if initialization has side effects or if the pattern is used in async contexts. The same pattern exists in `aiDiscoveryService.js`.

Beyond the race: this pattern makes `_stripe` mutable at the module level, meaning a bad key rotation in one request can affect all subsequent requests.

## How to Fix

Replace the mutable lazy init with a module-level promise that initializes once:

```javascript
// adminRoutes.js — module level
function createStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.warn('[admin] STRIPE_SECRET_KEY not set — Stripe routes will fail');
    return null;
  }
  return require('stripe')(key);
}

const stripe = createStripeClient();
```

Or if the key might not be available at module load time (env not yet set):

```javascript
let _stripePromise = null;
function getStripe() {
  if (!_stripePromise) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
    _stripePromise = Promise.resolve(require('stripe')(key));
  }
  return _stripePromise;
}
```

Steps:
1. Open `marketplace/backend/routes/adminRoutes.js`
2. Find the `let _stripe = null` pattern (line 26) and the initialization block
3. Replace with a module-level `const stripe = createStripeClient()` approach
4. Update all usages from `_stripe` to `stripe`
5. Check `aiDiscoveryService.js` for the same pattern and apply the same fix
6. Run existing tests to verify no regressions

## Acceptance Criteria

- [ ] `let _stripe = null` mutable pattern removed from adminRoutes.js
- [ ] Stripe client initialized once at module load (or safely via promise)
- [ ] Same pattern fixed in aiDiscoveryService.js if present
- [ ] All existing admin tests still pass
- [ ] Code follows project patterns (consistent with how checkout.js initializes Stripe)

## Notes

_Generated from code_quality_audit finding (medium severity). checkout.js already uses `const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)` at module level — adminRoutes.js should match that pattern._
