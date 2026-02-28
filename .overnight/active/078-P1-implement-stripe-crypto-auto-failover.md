---
id: 78
title: "Implement Stripe→Crypto auto-failover"
priority: P1
severity: high
status: completed
source: overnight_tasks
file: marketplace/backend/routes/checkout.js
created: "2026-02-28T12:00:00"
execution_hint: sequential
context_group: checkout_payment
group_reason: "Same feature area as crypto pricing task 079"
---

# Implement Stripe→Crypto auto-failover

**Priority:** P1 (high)
**Source:** overnight_tasks (OVERNIGHT_TASKS.md P2 section), feature_audit
**Location:** marketplace/backend/routes/checkout.js, marketplace/backend/services/

## Problem

The README and docs prominently advertise automatic Stripe→Crypto failover as a core feature of the dual-mode architecture: "AUTOMATIC FAILOVER" appears in marketing copy. This feature is not implemented. If Stripe goes down, customers get an error with no fallback offered.

The feature_audit confirms: "AUTOMATIC FAILOVER in README but not implemented."

## How to Fix

1. Create `marketplace/backend/services/stripeHealthService.js`:
   - `checkStripeHealth()` — makes a lightweight call to Stripe API (e.g., `stripe.balance.retrieve()`) with a 3-second timeout
   - Cache result for 60 seconds to avoid excessive API calls
   - Returns `{ healthy: boolean, lastChecked: Date, error?: string }`

2. Add health check middleware `checkPaymentAvailability` in checkout routes:
   ```js
   async function checkPaymentAvailability(req, res, next) {
     const health = await stripeHealthService.checkStripeHealth();
     req.stripeAvailable = health.healthy;
     next();
   }
   ```

3. Modify `POST /api/checkout/create-session` in `checkout.js`:
   - If `req.stripeAvailable` is false, return `{ success: false, stripeDown: true, fallbackUrl: '/checkout/crypto' }` instead of attempting Stripe
   - Frontend should detect `stripeDown: true` and redirect to crypto checkout

4. Update the frontend checkout flow to handle `stripeDown: true`:
   - Show "Stripe payment temporarily unavailable — completing your order with crypto payment" banner
   - Auto-redirect to `/checkout/crypto` or present the option

5. Add `GET /api/health/stripe` endpoint for status page display

## Acceptance Criteria

- [ ] stripeHealthService.js created with cached health check
- [ ] Checkout route checks Stripe health before attempting session
- [ ] stripeDown: true response triggers frontend crypto redirect
- [ ] Health check cached to avoid hammering Stripe API
- [ ] GET /api/health/stripe returns current Stripe status

## Notes

_From OVERNIGHT_TASKS.md P2 section. Core differentiator — dual-mode architecture depends on this._
