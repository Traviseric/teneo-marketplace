---
id: 6
title: "Define AI Store Builder payment tiers (Builder / Pro / White-label)"
priority: P1
severity: medium
status: completed
source: project_declared
file: marketplace/backend/routes/
created: "2026-03-09T21:00:00Z"
execution_hint: parallel
context_group: monetization
group_reason: "Managed service monetization features"
---

# Define AI Store Builder payment tiers (Builder / Pro / White-label)

**Priority:** P1 (medium)
**Source:** project_declared (AGENT_TASKS.md — "Define payment trigger and first external offer tiers (Builder, Pro, White-label)")
**Location:** marketplace/backend/routes/ and openbazaar-site/

## Problem

The AI Store Builder managed service has intake and build infrastructure but no defined pricing model or payment trigger. Potential customers who submit an intake form have no pricing information and no automated payment path. The ROADMAP mentions "Builder, Pro, White-label" tiers but these aren't defined in code or config anywhere.

## How to Fix

1. Define the service tiers in a config file (e.g., `marketplace/backend/config/store-builder-tiers.json`):
   ```json
   {
     "tiers": [
       {
         "id": "builder",
         "name": "Builder",
         "price_usd": 97,
         "description": "AI-generated store, 1 revision, delivered in 48h",
         "features": ["Store config generation", "1 product catalog", "Email capture", "1 revision"]
       },
       {
         "id": "pro",
         "name": "Pro",
         "price_usd": 297,
         "description": "Full store with funnel + email sequence, 3 revisions",
         "features": ["Everything in Builder", "Funnel page", "3-email sequence", "3 revisions", "30-day support"]
       },
       {
         "id": "whitelabel",
         "name": "White-label",
         "price_usd": 997,
         "description": "Custom-branded platform deployment",
         "features": ["Everything in Pro", "Custom domain", "Brand kit", "Operator dashboard", "Unlimited revisions for 90 days"]
       }
     ]
   }
   ```

2. Add a `GET /api/store-builder/tiers` endpoint that returns the tier config.

3. Update the intake form (`openbazaar-site/index.html` or the store-builder intake section) to show pricing tiers before the form.

4. Wire the intake `POST /intake` route to:
   - Accept a `tier` field in the request body
   - Create a Stripe Payment Link or Stripe Checkout session for the selected tier
   - Return the payment URL in the acknowledgment email or API response

5. When payment completes (Stripe webhook), update the `store_builds` record status from `intake` → `paid` → `planning`.

## Acceptance Criteria

- [ ] Tier config exists in a structured config file
- [ ] `GET /api/store-builder/tiers` returns tier pricing
- [ ] Intake form shows pricing options
- [ ] Stripe payment trigger created for at least one tier
- [ ] Stripe webhook updates build status on payment completion

## Notes

_Generated from project_declared AGENT_TASKS.md P1 item. Pricing values above are suggested — adjust based on business decisions. This does NOT require human action (code can wire the payment flow; Stripe account setup is already done per HT-004)._
