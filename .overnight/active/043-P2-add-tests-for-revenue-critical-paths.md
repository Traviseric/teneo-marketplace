---
id: 43
title: "Add Jest tests for revenue-critical paths (webhooks, downloads, orders, crypto)"
priority: P2
severity: low
status: completed
source: code_quality_audit
file: __tests__/
line: 1
created: "2026-02-28T08:00:00"
execution_hint: parallel
context_group: independent
group_reason: "Test files are independent — no conflicts with other task groups"
---

# Add Jest tests for revenue-critical paths (webhooks, downloads, orders, crypto)

**Priority:** P2 (low)
**Source:** code_quality_audit
**Location:** __tests__/ (new test files)

## Problem

The codebase has 6 test files (37 passing tests) covering: health, auth, brands, coupons, input validation, and checkout price validation. The most revenue-critical paths have zero test coverage:

- **Stripe webhooks** — No tests for `checkout.session.completed` event handling. If webhook processing breaks, orders are never fulfilled.
- **Download token lifecycle** — No tests for token generation, expiry enforcement, download count limits.
- **Order service CRUD** — No tests for `createOrder()`, `updateOrderStatus()`, `getOrderByDownloadToken()`.
- **Crypto payment flow** — No tests for CoinGecko price fetch, crypto order creation, verify-payment endpoint.

These are the paths where bugs directly lose revenue or deny customers what they paid for.

## How to Fix

Create the following test files following the existing patterns in `__tests__/` (use `test-app.js` fixture, Jest + Supertest):

### 1. `__tests__/webhook.test.js`
```javascript
// Test the Stripe webhook handler
describe('Stripe Webhook', () => {
    test('checkout.session.completed creates order and sends email', async () => {
        // Mock a valid Stripe webhook event
        // POST to /api/checkout/webhook with valid signature
        // Verify: order created in DB with correct status
    });

    test('rejects invalid webhook signature', async () => {
        // POST with wrong stripe-signature header → 400
    });

    test('handles duplicate webhook events idempotently', async () => {
        // Send same event twice → order only created once
    });
});
```

### 2. `__tests__/download.test.js`
```javascript
// Test download token lifecycle
describe('Download Routes', () => {
    test('GET /api/download/:token serves file for valid token', ...);
    test('GET /api/download/:token returns 410 for expired token', ...);
    test('GET /api/download/:token returns 429 after 5 downloads', ...);
    test('GET /api/download/:token returns 404 for unknown token', ...);
});
```

### 3. `__tests__/orderService.test.js`
```javascript
// Test OrderService CRUD
describe('OrderService', () => {
    test('createOrder() returns order with download token', ...);
    test('updateOrderStatus() updates only whitelisted columns', ...);
    test('updateOrderStatus() rejects unknown column names', ...);  // Test the task-037 fix
    test('getOrderByDownloadToken() returns correct order', ...);
});
```

### 4. `__tests__/cryptoCheckout.test.js`
```javascript
// Test crypto payment flow
describe('Crypto Checkout', () => {
    test('POST /api/crypto/create-order returns order with crypto address', ...);
    test('GET /api/crypto/rates returns BTC/XMR prices', ...);
    test('POST /api/crypto/verify-payment rate limits after threshold', ...);
});
```

Reference the existing test patterns from `__tests__/checkout-price-validation.test.js` and `__tests__/coupons.test.js` for how to structure tests with the test app fixture.

## Acceptance Criteria

- [ ] `__tests__/webhook.test.js` created with at least 3 tests
- [ ] `__tests__/download.test.js` created with at least 4 tests (valid, expired, count-exceeded, not-found)
- [ ] `__tests__/orderService.test.js` created with at least 4 tests including one for the task-037 whitelist fix
- [ ] `__tests__/cryptoCheckout.test.js` created with at least 3 tests
- [ ] All new tests pass (`npm test`)
- [ ] Total test count increases from 37 to at least 50

## Notes

_Generated from code_quality_audit findings. The existing 37 tests cover auth and input validation well. This task fills the gap for revenue-critical paths that have no coverage. Prioritize webhook tests as highest value — a broken webhook means undelivered orders._
