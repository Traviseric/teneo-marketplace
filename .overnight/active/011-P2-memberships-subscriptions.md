---
id: 11
title: "Memberships & subscriptions — recurring payments, tiers, content gating"
priority: P2
severity: medium
status: pending
source: project_declared
file: marketplace/backend/routes/checkout.js
line: null
created: "2026-03-09T00:00:00Z"
execution_hint: long_running
context_group: subscriptions
group_reason: "Large feature spanning schema, checkout, webhooks, content gating — needs warm context"
---

# Memberships & Subscriptions

**Priority:** P2 (medium)
**Source:** project_declared (AGENT_TASKS.md Phase 4 Network & Scale)
**Location:** marketplace/backend/routes/checkout.js + schema.sql + adminRoutes.js

## Problem

Creators want to offer membership tiers with recurring monthly/yearly payments and gated content. Currently the platform only supports one-time purchases. Without subscriptions, creators with ongoing content (newsletters, communities, cohort courses) cannot use the platform.

## How to Fix

1. **Add subscriptions schema to schema.sql:**
   ```sql
   CREATE TABLE IF NOT EXISTS membership_tiers (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     brand_id TEXT NOT NULL,
     name TEXT NOT NULL,
     description TEXT,
     price_monthly REAL,
     price_yearly REAL,
     stripe_price_id_monthly TEXT,
     stripe_price_id_yearly TEXT,
     features TEXT,  -- JSON array
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   );

   CREATE TABLE IF NOT EXISTS member_subscriptions (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     customer_email TEXT NOT NULL,
     brand_id TEXT NOT NULL,
     tier_id INTEGER REFERENCES membership_tiers(id),
     stripe_subscription_id TEXT UNIQUE,
     status TEXT DEFAULT 'active',  -- active, canceled, past_due
     current_period_end DATETIME,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   );
   ```

2. **Create Stripe recurring price & subscription:**
   - `POST /admin/memberships/tiers` — admin creates a tier, creates Stripe Price object (recurring)
   - Store `stripe_price_id_monthly` and `stripe_price_id_yearly` from Stripe API response

3. **Add membership checkout flow:**
   - `POST /api/checkout/subscribe` — creates Stripe Checkout session in subscription mode
   - Takes `{tier_id, billing_period: 'monthly'|'yearly', brand_id}`
   - Returns Stripe checkout URL

4. **Handle subscription webhooks in checkout.js:**
   - `customer.subscription.created` → insert into member_subscriptions
   - `customer.subscription.deleted` → update status to 'canceled'
   - `invoice.payment_failed` → update status to 'past_due', send email
   - `invoice.paid` → update current_period_end

5. **Content gating middleware:**
   - `requireMembership(brandId, tierIds)` — checks member_subscriptions table for active subscription
   - Apply to gated content routes (e.g., GET /api/courses/:id/lessons for paid courses)

6. **Membership management page:**
   - `GET /account/memberships` — customer page showing active memberships and manage link
   - "Manage Subscription" → Stripe Customer Portal link (`stripe.billingPortal.sessions.create()`)

7. **Admin membership dashboard:**
   - `GET /admin/memberships/subscribers` — list of active members per tier
   - Monthly recurring revenue (MRR) calculation

## Acceptance Criteria

- [ ] membership_tiers and member_subscriptions tables in schema.sql
- [ ] Admin can create tiers (Stripe Price created automatically)
- [ ] Customer can subscribe via Stripe Checkout
- [ ] Webhooks correctly update subscription status
- [ ] requireMembership middleware gates content correctly
- [ ] Stripe Customer Portal link works for self-service cancellation
- [ ] Admin sees MRR and subscriber list
- [ ] No regressions in one-time checkout flow

## Notes

_This is a large feature — implement in order: schema → tiers API → subscribe checkout → webhooks → gating → UI. Mark long_running._
