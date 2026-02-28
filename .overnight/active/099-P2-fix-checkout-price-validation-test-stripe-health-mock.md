---
id: 99
title: "Fix checkout-price-validation.test.js — 7 failures from unmocked stripeHealthService"
priority: P2
severity: medium
status: completed
source: review_audit
file: __tests__/checkout-price-validation.test.js
line: 8
created: "2026-02-28T10:00:00Z"
execution_hint: sequential
context_group: test_fixes
group_reason: "Same test infrastructure as task 101 — both add/fix test mocks"
---

# Fix checkout-price-validation.test.js — 7 failures from unmocked stripeHealthService

**Priority:** P2 (medium)
**Source:** review_audit
**Location:** `__tests__/checkout-price-validation.test.js`

## Problem

7 of 10 tests in `checkout-price-validation.test.js` fail because `marketplace/backend/routes/checkout.js` calls `stripeHealthService.checkStripeHealth()` on every request (line 103), but the test file does NOT mock `stripeHealthService`. The health check attempts a real Stripe API call in the test environment where `STRIPE_SECRET_KEY` is not set, causing the health check to fail and return `{ healthy: false }`. The route then responds with 503 instead of the expected 400/200.

**Code with issue:**
```javascript
// checkout.js line 103 — called on every POST /create-session
const stripeHealth = await stripeHealthService.checkStripeHealth();
if (!stripeHealth.healthy) {
  return res.status(503).json({
    success: false,
    stripeDown: true,
    fallbackUrl: '/checkout/crypto',
    message: 'Stripe payment temporarily unavailable — please use crypto checkout',
  });
}
```

The test file mocks `stripe` module itself but not `stripeHealthService`:
```javascript
// test mocks stripe module but NOT stripeHealthService
jest.mock('stripe', () => () => ({ checkout: { sessions: { create: mockSessionCreate } } }));
// ← stripeHealthService NOT mocked → real health check runs → 503 in test env
```

Result: 7 tests that expect `400` (book not found, missing fields) or `200` (successful checkout) receive `503` instead.

## How to Fix

Add a `jest.mock` for `stripeHealthService` at the top of the test file, returning `{ healthy: true }` so the health check passes and the real route logic runs. Place it alongside the existing mocks:

```javascript
// Mock stripeHealthService to bypass real Stripe API call in tests
jest.mock('../marketplace/backend/services/stripeHealthService', () => ({
  checkStripeHealth: jest.fn().mockResolvedValue({ healthy: true }),
  getStatus: jest.fn().mockReturnValue({ healthy: true, lastChecked: Date.now() })
}));
```

Add this mock block near the top of the file, before the `const request = require('supertest')` line.

No changes to `checkout.js` or `stripeHealthService.js` are needed — the health check design is correct for production. This is purely a test setup gap.

After the fix, run `npx jest __tests__/checkout-price-validation.test.js` to verify all 10 tests pass.

## Acceptance Criteria

- [ ] All 10 tests in `checkout-price-validation.test.js` pass
- [ ] `npx jest` overall passes with 0 new failures introduced
- [ ] `stripeHealthService` mock is added with `jest.mock` before any `require` calls
- [ ] No changes to production code (checkout.js, stripeHealthService.js)

## Notes

_Generated from review_audit new_tasks. Root cause identified by reading checkout.js:100-111 — stripeHealthService.checkStripeHealth() gating all requests. Test file mocks stripe but not stripeHealthService._
