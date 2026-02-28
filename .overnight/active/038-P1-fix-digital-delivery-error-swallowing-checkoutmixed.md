---
id: 38
title: "Fix processDigitalDelivery() silently swallowing errors in checkoutMixed.js"
priority: P1
severity: high
status: completed
source: code_quality_audit
file: marketplace/backend/routes/checkoutMixed.js
line: 244
created: "2026-02-28T08:00:00"
execution_hint: sequential
context_group: checkout_module
group_reason: "Same checkout domain as task 036 (checkoutProduction price fix)"
---

# Fix processDigitalDelivery() silently swallowing errors in checkoutMixed.js

**Priority:** P1 (high)
**Source:** code_quality_audit
**Location:** marketplace/backend/routes/checkoutMixed.js:244

## Problem

`processDigitalDelivery()` catches all errors and only logs them to console. It does not re-throw, notify the customer, or update the order record. A customer who pays for a mixed order (digital + physical items) may successfully complete payment but silently never receive their download links.

**Code with issue:**
```javascript
// checkoutMixed.js line 222-246
async function processDigitalDelivery(orderId, digitalItems, userEmail) {
    try {
        const { downloadToken } = await orderService.completeOrder(orderId, 'digital_fulfilled');
        // ... sends download email ...
    } catch (error) {
        console.error('Digital delivery error:', error);
        // Silent fail! Customer paid but gets nothing.
    }
}
```

The caller at line 208 does `await processDigitalDelivery(...)` — it awaits but never sees the error because the catch block swallows it.

## How to Fix

Add two layers of protection:

**1. Update order record on failure** (so admin can see it):
```javascript
} catch (error) {
    console.error('Digital delivery error:', error);

    // Record the failure on the order so admin can investigate
    try {
        await orderService.updateOrderStatus(orderId, {
            fulfillment_status: 'digital_delivery_failed',
            metadata: JSON.stringify({
                digital_error: error.message,
                failed_at: new Date().toISOString()
            })
        });
    } catch (updateErr) {
        console.error('Failed to record delivery error:', updateErr);
    }

    // Re-throw so the caller (processMixedOrder) is aware
    throw error;
}
```

**2. In the caller (processMixedOrder), handle the re-thrown error**:
```javascript
// Around line 205-210:
if (digitalItemsParsed.length > 0) {
    try {
        await processDigitalDelivery(orderId, digitalItemsParsed, userEmail);
    } catch (digitalErr) {
        console.error('Digital delivery failed for order:', orderId, digitalErr);
        // Don't fail the whole mixed order — physical items may still process.
        // But notify the customer that digital delivery is delayed:
        // emailService.sendDigitalDeliveryFailureNotice(userEmail, orderId);
        // Or at minimum, the fulfillment_status = 'digital_delivery_failed' is now set
    }
}
```

At minimum, the order record must be updated so an admin can identify affected customers and manually resend download links.

## Acceptance Criteria

- [ ] Errors in `processDigitalDelivery()` are no longer silently swallowed
- [ ] On failure, order record is updated with `fulfillment_status: 'digital_delivery_failed'`
- [ ] Error is re-thrown so caller is aware of the failure
- [ ] Mixed order processing continues for physical items even if digital delivery fails
- [ ] Admin can identify affected orders by querying `fulfillment_status = 'digital_delivery_failed'`
- [ ] npm test passes after changes

## Notes

_Generated from code_quality_audit findings. This is a revenue/trust issue: customers pay and don't receive what they paid for, with no error surfaced. The fix ensures failures are visible and recoverable._
