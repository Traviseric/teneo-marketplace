---
id: 13
title: "Wire cross-store revenue sharing to checkout (auto-pay referral commissions)"
priority: P2
severity: medium
status: completed
source: project_declared
file: marketplace/backend/routes/checkout.js
created: "2026-03-09T21:00:00Z"
execution_hint: sequential
context_group: checkout_module
group_reason: "Checkout routes and related payment logic"
---

# Wire cross-store revenue sharing to checkout (auto-pay referral commissions)

**Priority:** P2 (medium)
**Source:** project_declared (AGENT_TASKS.md — "Revenue sharing wired to checkout")
**Location:** marketplace/backend/routes/checkout.js + marketplace/backend/routes/network.js

## Problem

The cross-store referral system was added (commit ff9369c) with commission tracking, but the commission payout logic may not be automatically triggered at checkout time. When a referred purchase is made, the referral commission should be automatically recorded and (eventually) paid out to the referring node/store.

## How to Fix

1. Read `marketplace/backend/routes/checkout.js` and the referral service from ff9369c to understand current wiring.

2. Check if checkout already calls the referral tracking:
   ```bash
   grep -n "referral\|commission\|revenue.shar" marketplace/backend/routes/checkout.js
   ```

3. If not wired:
   - At checkout order completion (after payment confirmed), check if the order has a referral source (`req.session.referral_code` or `?ref=` query param stored in session)
   - If referral exists, call `referralService.recordCommission(referral_code, order_amount, order_id)`
   - Store commission record with status `pending_payout`

4. Add a `GET /api/admin/referrals/commissions` endpoint to view pending commissions.

5. Add an admin action to mark commissions as paid (manual payout trigger for now; auto-payout can be a future task).

6. Ensure referral cookie/session is set when a visitor arrives via a referral link (`?ref=<store-slug>`).

## Acceptance Criteria

- [ ] Checkout detects referral source from session/cookie
- [ ] Commission is recorded in DB on successful payment
- [ ] Commission record includes: referring store, order ID, amount, commission %, status
- [ ] Admin can view pending commissions
- [ ] No regression to non-referral checkout flows

## Notes

_Generated from AGENT_TASKS.md P2 item. Cross-store referral system (ff9369c) is the dependency — revenue sharing needs to hook into the same checkout completion event._
