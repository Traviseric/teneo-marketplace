---
id: 5
title: "Implement managed hosting tiers ($29/$79/$149)"
priority: P2
severity: medium
status: completed
source: project_declared
file: marketplace/backend/routes/checkout.js
created: "2026-03-09T22:00:00Z"
execution_hint: sequential
context_group: subscriptions_module
group_reason: "Uses Stripe subscriptions — shares context with memberships task"
---

# Implement managed hosting tiers ($29/$79/$149)

**Priority:** P2 (medium)
**Source:** project_declared (docs/ROADMAP.md Phase 4)
**Location:** marketplace/backend/routes/, openbazaar-site/

## Problem

OpenBazaar.ai plans to offer managed hosting — a recurring SaaS model where operators pay to have their store hosted and maintained. The pricing structure ($29 Starter / $79 Pro / $149 White-label) is defined in strategy docs but not implemented in code. Currently there is no way for customers to sign up for and pay for managed hosting.

This is needed to create recurring revenue for the platform operator (beyond one-time build fees).

## How to Fix

1. **Define tier config** in a new `config/hostingTiers.js`:
   ```js
   module.exports = [
     { id: 'starter', name: 'Starter', price: 29, stripe_price_id: process.env.STRIPE_PRICE_STARTER, features: ['1 store', '100 products', 'email support'] },
     { id: 'pro', name: 'Pro', price: 79, stripe_price_id: process.env.STRIPE_PRICE_PRO, features: ['3 stores', 'unlimited products', 'priority support', 'custom domain'] },
     { id: 'whitelabel', name: 'White-label', price: 149, stripe_price_id: process.env.STRIPE_PRICE_WHITELABEL, features: ['unlimited stores', 'remove OpenBazaar branding', 'dedicated support', 'SLA'] },
   ];
   ```

2. **Stripe Products/Prices:** Add env vars `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_WHITELABEL` to `.env.example` (operator must create these in Stripe dashboard).

3. **API Route:** `POST /api/hosting/subscribe` — creates Stripe subscription checkout for selected tier. After payment, create a `store_builds` record with `tier_id` and mark `status: 'intake'`.

4. **Webhook:** Handle `customer.subscription.created` → activate hosting account. Handle `customer.subscription.deleted` → deactivate (set `status: 'suspended'` on store build).

5. **Pricing Page:** Add hosting tiers pricing section to `openbazaar-site/index.html` with tier cards, feature lists, and "Subscribe" buttons linking to `/api/hosting/subscribe?tier=starter`.

6. Add `.env.example` entries for the 3 Stripe price IDs and log to HUMAN_TASKS that operator must create these prices in Stripe dashboard.

## Acceptance Criteria

- [ ] `config/hostingTiers.js` defines the 3 tiers
- [ ] `POST /api/hosting/subscribe` creates Stripe subscription checkout
- [ ] Stripe webhook activates/deactivates hosting on subscription events
- [ ] `store_builds` record created on subscription
- [ ] Pricing section added to landing site
- [ ] `.env.example` updated with 3 Stripe price ID vars
- [ ] Jest test covers subscription creation route

## Dependencies

- Requires human action: operator must create 3 Stripe Products + Prices in dashboard and set `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_WHITELABEL` env vars.

## Notes

_Generated from docs/ROADMAP.md Phase 4: "Managed hosting tiers ($29/$79/$149)"._
