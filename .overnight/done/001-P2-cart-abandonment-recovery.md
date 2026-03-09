---
id: 1
title: "Cart abandonment recovery — detect abandoned carts, automated 1h/24h/72h email sequences"
priority: P2
severity: medium
status: completed
source: project_declared
file: marketplace/backend/routes/checkout.js
line: ~
created: "2026-03-09T00:00:00Z"
execution_hint: sequential
context_group: email_marketing
group_reason: "Email sequences require emailMarketingService and cronJobs — shares context with email flow tasks"
---

# Cart abandonment recovery — detect abandoned carts, automated 1h/24h/72h email sequences

**Priority:** P2 (medium)
**Source:** AGENT_TASKS.md (Phase 2 — Checkout Conversion Stack)
**Location:** `marketplace/backend/routes/checkout.js`, `marketplace/backend/services/emailMarketingService.js`, `marketplace/backend/services/cronJobs.js`

## Problem

When a user starts a checkout (Stripe session created) but doesn't complete the purchase, there is no mechanism to:
1. Detect that the cart was abandoned (session expired without a webhook success event)
2. Capture the email before payment to enable recovery
3. Send an automated recovery email sequence (1h, 24h, 72h)

This is one of the highest-ROI features for any e-commerce platform — recovering even 5-10% of abandoned carts significantly increases revenue.

**Current state:**
- `cronJobs.js` exists in `services/` but likely doesn't have an abandonment detection job
- `checkout.js` creates Stripe sessions but doesn't capture email to a pending_carts table
- No `pending_carts` or `abandoned_carts` table in schema

## How to Fix

1. **Add `pending_carts` table to schema:**
   ```sql
   CREATE TABLE IF NOT EXISTS pending_carts (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     session_id TEXT UNIQUE,
     customer_email TEXT,
     cart_data TEXT, -- JSON: items, amounts
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
     recovered_at DATETIME,
     email_stage INTEGER DEFAULT 0 -- 0=none, 1=1h sent, 2=24h sent, 3=72h sent
   );
   ```

2. **Capture email early in checkout.js** (POST /create-session):
   - If `req.body.customerEmail` is present, INSERT into `pending_carts` with session_id + email + cart data
   - On `checkout.session.completed` webhook → mark `recovered_at = NOW()` (no more emails)

3. **Add abandonment detection to cronJobs.js:**
   - Every 15 minutes, find pending_carts where:
     - created_at > 45 minutes ago AND email_stage = 0 → send 1h recovery email, set stage=1
     - created_at > 23 hours ago AND email_stage = 1 → send 24h email, set stage=2
     - created_at > 71 hours ago AND email_stage = 2 → send 72h email, set stage=3
   - Skip rows with recovered_at set

4. **Add recovery email templates to emailService/emailMarketingService:**
   - Subject: "You left something behind..."
   - Body: Product list, urgency nudge, direct checkout link (rebuild Stripe session or link to cart)

5. **Add `checkout_link` to cart data** — store the original checkout URL so recovery emails can link directly back

## Acceptance Criteria

- [ ] `pending_carts` table created in schema + init.js
- [ ] Email captured in checkout.js before redirecting to Stripe
- [ ] Webhook marks cart as recovered when payment completes
- [ ] cronJobs.js sends 1h, 24h, 72h recovery emails to uncompleted carts
- [ ] Recovery emails use correct brand/product data from cart
- [ ] Opt-out respected (if user has unsubscribed from emailMarketingService)

## Notes

_Generated from AGENT_TASKS.md Phase 2 Checkout Conversion Stack. cronJobs.js exists (confirmed in lessons.json round6). This is the highest direct-revenue-recovery feature remaining in Phase 2._
