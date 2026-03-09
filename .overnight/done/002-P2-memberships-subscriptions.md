---
id: 2
title: "Implement memberships and subscriptions"
priority: P2
severity: medium
status: completed
source: project_declared
file: marketplace/backend/routes/checkout.js
created: "2026-03-09T22:00:00Z"
execution_hint: long_running
context_group: subscriptions_module
group_reason: "Large feature touching checkout, DB, email, and frontend — independent of other groups"
---

# Implement memberships and subscriptions

**Priority:** P2 (medium)
**Source:** project_declared (docs/ROADMAP.md Phase 4)
**Location:** marketplace/backend/routes/, marketplace/backend/database/schema.sql, marketplace/frontend/

## Problem

There is no recurring payment support. Creators cannot sell membership tiers or subscription access to content. This is a major revenue unlock — SaaS-style recurring income vs one-time sales. Without it, creators must rely solely on one-time product sales.

The existing Stripe integration supports one-time charges only. Need Stripe Subscriptions + recurring billing + content gating by tier.

## How to Fix

1. **Database:** Add `subscriptions` table:
   ```sql
   CREATE TABLE subscriptions (
     id TEXT PRIMARY KEY,
     customer_email TEXT NOT NULL,
     store_slug TEXT NOT NULL,
     tier_id TEXT NOT NULL,
     stripe_subscription_id TEXT,
     status TEXT DEFAULT 'active', -- active | cancelled | past_due
     current_period_end INTEGER,
     created_at INTEGER DEFAULT (strftime('%s','now'))
   );
   ```
   Add `membership_tiers` table with `id`, `store_slug`, `name`, `price_monthly`, `features` (JSON), `content_access` (JSON array of product IDs).

2. **Stripe Integration:** Add `POST /api/subscriptions/create-session` route that creates a Stripe Checkout session with `mode: 'subscription'` and the selected `price_id`. Handle `customer.subscription.created`, `customer.subscription.deleted`, `invoice.payment_failed` webhook events.

3. **Content Gating:** Add middleware `requiresSubscription(tierId)` that checks the `subscriptions` table for an active subscription before serving gated content (downloads, course modules).

4. **Admin UI:** Add membership tier management to admin panel — create/edit tiers, set monthly price, define which products/courses are gated.

5. **Store Frontend:** Show membership tiers on store page with "Subscribe" CTA. After subscription, show member-only content.

## Acceptance Criteria

- [ ] `subscriptions` and `membership_tiers` tables created in migration
- [ ] `POST /api/subscriptions/create-session` creates Stripe subscription checkout
- [ ] Stripe webhook handles subscription lifecycle events
- [ ] Content gating middleware blocks non-subscribers from gated products
- [ ] Admin can create/edit membership tiers
- [ ] Store page shows tier options
- [ ] Jest tests cover subscription creation and content gating

## Notes

_Generated from docs/ROADMAP.md Phase 4: "Memberships & subscriptions — recurring payments, tiers, content gating"._
