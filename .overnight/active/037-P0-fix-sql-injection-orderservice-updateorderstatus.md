---
id: 37
title: "Fix SQL injection via unsanitized Object.keys in orderService.updateOrderStatus()"
priority: P0
severity: critical
status: completed
source: code_quality_audit
file: marketplace/backend/services/orderService.js
line: 70
created: "2026-02-28T08:00:00"
execution_hint: sequential
context_group: database_layer
group_reason: "Same database service layer as task 041 (DB path inconsistency)"
---

# Fix SQL injection via unsanitized Object.keys in orderService.updateOrderStatus()

**Priority:** P0 (critical)
**Source:** code_quality_audit
**Location:** marketplace/backend/services/orderService.js:70

## Problem

`updateOrderStatus()` builds a SQL UPDATE query by directly interpolating column names from `Object.keys(updates)` into the SQL string without any whitelist validation:

**Code with issue:**
```javascript
// orderService.js line 70
Object.keys(updates).forEach(key => {
    fields.push(`${key} = ?`);   // key is interpolated directly into SQL!
    values.push(updates[key]);
});

const sql = `UPDATE orders SET ${fields.join(', ')} WHERE order_id = ?`;
```

If any caller passes an `updates` object with user-influenced keys, an attacker can inject arbitrary SQL column expressions. For example, passing `{ "payment_status = 'paid', evil_col": "value" }` would produce malformed but potentially dangerous SQL. While current callers pass static objects, the pattern is dangerous and a future developer could easily introduce a vulnerability.

The values themselves are parameterized (safe), but the column names are not.

## How to Fix

Add a whitelist of allowed column names. Throw an error if any unknown key is passed:

```javascript
// orderService.js — add whitelist before the forEach:
const ALLOWED_UPDATE_KEYS = new Set([
    'payment_status',
    'fulfillment_status',
    'download_token',
    'download_count',
    'download_expiry',
    'metadata',
    'stripe_session_id',
    'stripe_payment_intent_id',
    'refund_id',
    'refund_amount',
    'lulu_print_job_id',
    'tracking_number',
    'estimated_delivery',
    'shipping_cost'
]);

async updateOrderStatus(orderId, updates) {
    return new Promise((resolve, reject) => {
        const fields = [];
        const values = [];

        Object.keys(updates).forEach(key => {
            if (!ALLOWED_UPDATE_KEYS.has(key)) {
                return reject(new Error(`updateOrderStatus: unknown column '${key}'`));
            }
            fields.push(`${key} = ?`);
            values.push(updates[key]);
        });

        // ... rest of method unchanged
    });
}
```

Audit all callers of `updateOrderStatus()` in the codebase to confirm no user-controlled keys are currently passed. After adding the whitelist, any future caller that passes an unexpected key will get a clear error instead of silently injecting SQL.

## Acceptance Criteria

- [ ] `updateOrderStatus()` validates all keys against a whitelist before building SQL
- [ ] Unknown keys cause a rejected Promise with clear error message
- [ ] Whitelist includes all currently-used column names (no regressions)
- [ ] All existing callers still work (check checkoutMixed.js, checkout.js, checkoutProduction.js, downloadRoutes.js)
- [ ] npm test passes after changes

## Notes

_Generated from code_quality_audit findings. While current callers are safe (all pass static objects), the unsanitized pattern is a latent injection vector. Adding the whitelist is low-effort and high-value defense-in-depth._
