---
id: 7
title: "Wire referral ?ref= session cookie on store frontend pages"
priority: P2
severity: medium
status: completed
source: worker_002_suggestion
file: marketplace/frontend/store.html
created: "2026-03-09T22:00:00Z"
execution_hint: sequential
context_group: payments_module
group_reason: "Extends referral system — touches store.html, checkout flow, and referral session middleware"
---

# Wire referral ?ref= session cookie on store frontend pages

**Priority:** P2 (medium)
**Source:** Worker 002 suggestion (task 013-P2-revenue-sharing-wired-to-checkout.md completion notes)
**Location:** marketplace/frontend/store.html, marketplace/backend/routes/checkout.js

## Problem

The backend referral system is implemented — `trackReferral()` is called from `handleCheckoutCompleted` and the `?ref=` session middleware exists. However, Worker 002 noted: "Wire the referral session cookie on the frontend store pages (/store/:slug?ref=CODE) so the ?ref= param is captured on first visit, then persists through the checkout flow."

Currently, if a user visits `/store/mybrand?ref=ALICE123` and then navigates to checkout, the referral code may not persist into the checkout session because it's not being set as a cookie or session variable on the frontend when the page loads.

## How to Fix

1. **Frontend (store.html):** On page load, read `?ref=` from the URL query string. If present, store in `sessionStorage` as `referralCode`:
   ```js
   const params = new URLSearchParams(window.location.search);
   const ref = params.get('ref');
   if (ref) sessionStorage.setItem('referralCode', ref);
   ```

2. **Checkout initiation:** When the user clicks "Checkout" and the cart sends a `POST /api/checkout/create-session`, include the referral code from `sessionStorage`:
   ```js
   const ref = sessionStorage.getItem('referralCode');
   const body = { items, ...(ref ? { ref } : {}) };
   ```

3. **Backend verification:** Confirm `checkout.js` `create-session` handler reads `req.body.ref` (or falls back to `req.session.referralCode`) and calls `trackReferral` before creating the Stripe session. The session middleware already exists — verify it's being invoked correctly with the `ref` from the request body as a fallback.

4. **Test:** Write a test that:
   - Simulates store page load with `?ref=ALICE123`
   - Verifies `sessionStorage.referralCode` is set
   - Simulates checkout POST with `ref: 'ALICE123'`
   - Verifies `trackReferral('ALICE123', orderId)` is called

## Acceptance Criteria

- [ ] `store.html` captures `?ref=` from URL on page load and stores in `sessionStorage`
- [ ] Cart/checkout form includes referral code in POST body
- [ ] Backend `create-session` reads `ref` from request body and passes to `trackReferral`
- [ ] Referral code persists through multi-page navigation within the session
- [ ] Jest test (or integration test) verifies the full referral capture → checkout flow
- [ ] No regressions in existing checkout tests

## Notes

_Follow-up to task 013-P2-revenue-sharing-wired-to-checkout.md (commit b646a2e). Worker 002 specifically identified this as the next recommended step._
