---
id: 12
title: "Wire processMixedOrder into webhook handler for mixed digital+physical orders"
priority: P1
severity: high
status: completed
source: gap_analyzer
file: marketplace/backend/routes/checkoutMixed.js
line: 1
created: "2026-02-28T00:00:00"
execution_hint: sequential
context_group: api_hardening
group_reason: "Checkout flow fix; touches webhook and checkout code"
---

# Wire processMixedOrder into webhook handler for mixed digital+physical orders

**Priority:** P1 (high)
**Source:** gap_analyzer
**Location:** marketplace/backend/routes/checkoutMixed.js

## Problem

`checkoutMixed.js` exports `processMixedOrder()` — the function that handles orders containing both digital (PDF download) and physical (Lulu print-on-demand) items. However, this function is **never called** in the Stripe webhook handler when payment completes.

This means:
- Mixed orders (digital + print) are paid for via Stripe but never fulfilled
- Digital delivery is not triggered automatically
- Lulu print job is never submitted
- Customers pay but don't receive their order

**Code with issue:**
```javascript
// checkoutMixed.js
module.exports = { processMixedOrder };  // exported but never imported in webhook

// webhooks.js (approximate issue)
case 'checkout.session.completed':
    // Only handles pure digital orders via orderService
    // processMixedOrder is never called here
```

## How to Fix

1. **In `webhooks.js`**, after a successful `checkout.session.completed` event, check the session metadata or line items to determine if it's a mixed order:

```javascript
const { processMixedOrder } = require('./checkoutMixed');

// In webhook handler
case 'checkout.session.completed': {
    const session = event.data.object;

    // Check if this is a mixed order (has both digital and physical items)
    if (session.metadata && session.metadata.order_type === 'mixed') {
        await processMixedOrder(session);
    } else {
        // existing digital-only fulfillment
        await orderService.fulfillDigitalOrder(session);
    }
    break;
}
```

2. **Ensure mixed checkout session creation** sets `metadata.order_type = 'mixed'` when creating the Stripe session.

3. **Test end-to-end**: Create a mixed order in Stripe test mode → trigger webhook → verify digital download token created AND Lulu print job submitted.

4. **Verify the digital delivery handler** in checkoutMixed.js is complete and calls emailService to send download links.

## Acceptance Criteria

- [ ] `processMixedOrder` is imported in the webhook handler file
- [ ] Mixed orders (identified by metadata or line item type) route to processMixedOrder
- [ ] Pure digital orders continue to work as before
- [ ] Digital delivery (download token + email) completes for mixed orders
- [ ] Lulu print job is created for physical items in mixed orders

## Notes

_Generated from gap_analyzer findings. This is a silent fulfillment failure — customers are charged but orders never arrive._
