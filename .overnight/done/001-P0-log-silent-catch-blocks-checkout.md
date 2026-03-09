---
id: 1
title: "Log silent .catch(() => {}) blocks in checkout.js and cryptoCheckout.js"
priority: P0
severity: critical
status: completed
source: code_quality_audit
file: marketplace/backend/routes/checkout.js
line: 559
created: "2026-03-09T23:45:00Z"
execution_hint: sequential
context_group: checkout_module
group_reason: "Same file/feature area as tasks 002, 005, 008"
---

# Log silent .catch(() => {}) blocks in checkout.js and cryptoCheckout.js

**Priority:** P0 (critical)
**Source:** code_quality_audit
**Location:** marketplace/backend/routes/checkout.js:559, cryptoCheckout.js:398

## Problem

Unhandled promise rejections using `.catch(() => {})` pattern silently swallow errors in payment-critical code paths. When `orderService.failOrder()` or `orderService.updateOrderState()` fails, the failure is completely invisible — no log, no alert, no retry. This means:

1. `checkout.js:559` — `await orderService.failOrder(orderId, error.message).catch(() => {})` — a failed order update goes unnoticed
2. `checkout.js:563` — `}).catch(() => {})` — similarly silenced
3. `cryptoCheckout.js:398` — `await orderService.failOrder(order.order_id, fulfillErr.message).catch(() => {})` — BTCPay webhook fulfillment failures silently ignored

This means orders can get stuck in broken states with no visibility.

**Code with issue (checkout.js ~line 559):**
```javascript
await orderService.failOrder(orderId, error.message).catch(() => {});
```

**Code with issue (cryptoCheckout.js ~line 398):**
```javascript
await orderService.failOrder(order.order_id, fulfillErr.message).catch(() => {});
```

## How to Fix

Replace empty `.catch(() => {})` with logging catch handlers:

```javascript
// checkout.js
await orderService.failOrder(orderId, error.message)
  .catch(err => console.error('[checkout] Failed to mark order failed:', orderId, err));

// cryptoCheckout.js
await orderService.failOrder(order.order_id, fulfillErr.message)
  .catch(err => console.error('[btcpay-webhook] Failed to mark order failed:', order.order_id, err));
```

Search for ALL `.catch(() => {})` occurrences in checkout.js and cryptoCheckout.js and replace them. Note: `.catch(() => {})` in emailTracking.js is intentional (analytics fire-and-forget) — do NOT change those.

## Acceptance Criteria

- [ ] All `.catch(() => {})` in checkout.js replaced with logging catch handlers
- [ ] All `.catch(() => {})` in cryptoCheckout.js replaced with logging catch handlers
- [ ] emailTracking.js `.catch(() => {})` intentionally left alone (analytics tracking)
- [ ] No regressions introduced
- [ ] Tests still pass

## Notes

_Generated from code_quality_audit findings._
