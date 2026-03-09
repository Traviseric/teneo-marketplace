---
id: 10
title: "Cross-store referral system (15-20% new, 0-5% repeat)"
priority: P2
severity: medium
status: completed
source: project_declared
file: marketplace/backend/routes/checkout.js
line: null
created: "2026-03-09T00:00:00Z"
execution_hint: sequential
context_group: referral_system
group_reason: "Extends checkout + network revenue share; related to existing network_revenue_shares table"
---

# Cross-Store Referral System

**Priority:** P2 (medium)
**Source:** project_declared (AGENT_TASKS.md Phase 4 Network & Scale — 15-20% new, 0-5% repeat)
**Location:** marketplace/backend/routes/checkout.js + network.js + adminRoutes.js

## Problem

OpenBazaar.ai has federation/network infrastructure (network.js, network_revenue_shares table) but no cross-store referral system for the end-user experience. Creators cannot currently earn referral commissions when they send buyers to other creators' stores, and there is no affiliate link system.

The roadmap specifies: 15-20% commission for new customer referrals, 0-5% for repeat customers.

## How to Fix

1. **Add `referral_codes` table to schema.sql:**
   ```sql
   CREATE TABLE IF NOT EXISTS referral_codes (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     code TEXT UNIQUE NOT NULL,
     referrer_brand_id TEXT NOT NULL,
     commission_rate_new REAL DEFAULT 0.15,
     commission_rate_repeat REAL DEFAULT 0.02,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   );
   ```

2. **Add `referrals` table:**
   ```sql
   CREATE TABLE IF NOT EXISTS referrals (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     referral_code TEXT NOT NULL,
     referred_order_id TEXT,
     is_new_customer INTEGER DEFAULT 1,
     commission_amount REAL,
     status TEXT DEFAULT 'pending',
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   );
   ```

3. **Generate referral links:**
   - `GET /api/referral/code` — admin-only, returns or creates the brand's referral code
   - Referral URL format: `https://openbazaar.ai/store/{brand_id}?ref={code}`
   - Store referral code in session/cookie when buyer lands on store

4. **Track referrals at checkout:**
   - In `checkout.js` handleCheckoutCompleted webhook handler:
     - Read referral code from order metadata (add `ref` field to Stripe metadata)
     - Look up referral_codes table
     - Determine if new vs repeat customer (check if buyer's email has prior orders)
     - Calculate commission: `order_amount * commission_rate`
     - Insert into `referrals` table with status 'pending'

5. **Store referral in checkout session creation:**
   - In `POST /api/checkout/create-session`, accept optional `referral_code` in body
   - Pass it into Stripe session metadata as `ref`

6. **Referral dashboard in admin.html:**
   - "Referrals" section showing: referral link, total referrals, pending commissions, paid commissions
   - `GET /admin/referrals` endpoint returning stats for current brand

7. **Commission payout (defer to manual for now):**
   - Mark commissions as "pending" — payout manually via Stripe or crypto
   - Show pending commissions in dashboard for human review

## Acceptance Criteria

- [ ] referral_codes and referrals tables in schema.sql
- [ ] GET /api/referral/code generates referral code for admin
- [ ] Referral code tracked through checkout → Stripe webhook → referrals table
- [ ] New vs repeat customer classification works
- [ ] Commission calculated at correct rate
- [ ] Admin dashboard shows referral stats
- [ ] No regressions in checkout flow

## Notes

_Commission payout automation deferred — focus on tracking and reporting first._
