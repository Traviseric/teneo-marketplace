---
id: 15
title: "Remove customer email from public order-status endpoint (CWE-200)"
priority: P1
severity: high
status: completed
source: security_audit
file: marketplace/backend/routes/cryptoCheckout.js
line: 221
created: "2026-03-06T08:00:00Z"
execution_hint: parallel
context_group: independent
group_reason: "Isolated single-file change, no overlap with other tasks"
---

# Remove customer email from public order-status endpoint (CWE-200)

**Priority:** P1 (high)
**Source:** security_audit
**CWE:** CWE-200 (Exposure of Sensitive Information)
**Location:** `marketplace/backend/routes/cryptoCheckout.js:221`

## Problem

`GET /api/crypto/order-status/:orderId` is a public unauthenticated endpoint that returns the customer's email address. Order IDs follow a predictable format (`ORD-{timestamp}-{hex}`), making them enumerable. An attacker can iterate order IDs to harvest customer email addresses at scale.

**Code with issue:**
```javascript
res.json({
    success: true,
    orderId: order.order_id,
    email: order.customer_email,   // PII exposed to unauthenticated callers
    bookTitle: order.book_title,
    amountUsd: order.price,
    status: order.status,
    paymentStatus: order.payment_status,
    createdAt: order.created_at
});
```

The DB query at line 215 also selects `customer_email` unnecessarily for this public endpoint:
```javascript
const order = await dbGet(
    'SELECT order_id, customer_email, book_title, price, status, payment_status, created_at FROM orders WHERE order_id = ?',
    [req.params.orderId]
);
```

## How to Fix

1. Remove `customer_email` from the SELECT query (remove from column list)
2. Remove the `email` field from the JSON response
3. Optionally: also make the orderId less guessable by using a UUID. This is a secondary improvement — the primary fix is removing the email field.

```javascript
// Fixed query — no customer_email
const order = await dbGet(
    'SELECT order_id, book_title, price, status, payment_status, created_at FROM orders WHERE order_id = ?',
    [req.params.orderId]
);

// Fixed response — no email field
res.json({
    success: true,
    orderId: order.order_id,
    bookTitle: order.book_title,
    amountUsd: order.price,
    status: order.status,
    paymentStatus: order.payment_status,
    createdAt: order.created_at
});
```

If any frontend code uses the `email` field from this endpoint (e.g., to pre-fill a form), check for usages first and update them accordingly.

## Acceptance Criteria

- [ ] `GET /api/crypto/order-status/:orderId` response does not include customer email
- [ ] The SELECT query does not fetch customer_email from the DB
- [ ] No frontend code depends on this email field (grep for `order-status` in frontend/)
- [ ] The endpoint still returns order status, title, amount, and timestamps correctly
- [ ] No regressions in existing tests

## Notes

_Generated from security_audit finding (CWE-200). Single-file change in cryptoCheckout.js._
