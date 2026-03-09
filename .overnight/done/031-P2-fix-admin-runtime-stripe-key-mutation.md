---
id: 31
title: "Remove runtime process.env mutation for Stripe keys in adminRoutes.js"
priority: P2
severity: high
status: completed
source: code_quality_audit
file: marketplace/backend/routes/adminRoutes.js
line: 508
created: "2026-03-06T14:00:00Z"
execution_hint: sequential
context_group: admin_backend
group_reason: "adminRoutes.js area — same file as task 036 (add admin tests)"
---

# Remove runtime process.env mutation for Stripe keys in adminRoutes.js

**Priority:** P2 (high)
**Source:** code_quality_audit
**Location:** marketplace/backend/routes/adminRoutes.js:508

## Problem

`POST /admin/save-all` mutates `process.env.STRIPE_SECRET_KEY` and `process.env.STRIPE_PUBLISHABLE_KEY` at runtime. This is a dangerous anti-pattern with three consequences:

1. **Does not persist across restarts** — saved settings are lost on every server restart, giving a false impression they were saved
2. **Unsafe in multi-process deployments** — in a cluster or worker-thread setup, each process has its own env, so the mutation only affects one process
3. **Stale Stripe client** — if the Stripe client is initialized once at module load time (common pattern), mutating `process.env` afterwards has no effect on the already-initialized client, causing silent key mismatch

**Code with issue:**
```javascript
// adminRoutes.js ~line 508
process.env.STRIPE_SECRET_KEY = settings.stripeSecretKey;
process.env.STRIPE_PUBLISHABLE_KEY = settings.stripePublishableKey;
```

## How to Fix

1. **Remove the `process.env` mutation lines** from `POST /admin/save-all`
2. **Store Stripe keys in the settings database table** (they already appear to be stored there — this is the save endpoint)
3. **Re-initialize the Stripe client on each request** (or read keys from DB settings on each request) rather than using a module-level constant
4. Alternatively, create a `getStripeClient()` helper that reads the key from DB settings each time (with a short TTL cache if performance is a concern)

```javascript
// services/stripeService.js
async function getStripeClient() {
  const settings = await db.get('SELECT stripe_secret_key FROM settings LIMIT 1');
  const key = settings?.stripe_secret_key || process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Stripe secret key not configured');
  return new Stripe(key, { apiVersion: '2023-10-16' });
}
```

Then in checkout routes, replace the top-level `const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)` with `const stripe = await getStripeClient()`.

## Acceptance Criteria

- [ ] `process.env.STRIPE_SECRET_KEY` and `process.env.STRIPE_PUBLISHABLE_KEY` are NOT mutated in `POST /admin/save-all`
- [ ] Stripe keys saved via admin settings are persisted to the database
- [ ] Stripe client reads keys from database settings (or env as fallback) at request time
- [ ] Existing checkout tests still pass
- [ ] No regressions in payment flow

## Notes

_Generated from code_quality_audit high finding: "POST /admin/save-all mutates process.env.STRIPE_SECRET_KEY at runtime. Does not persist across restarts, unsafe in multi-process deployments, Stripe client may silently use stale key."_
