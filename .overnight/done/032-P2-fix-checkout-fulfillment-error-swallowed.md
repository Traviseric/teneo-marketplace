---
id: 32
title: "Stop swallowing fulfillment errors in Stripe webhook handler"
priority: P2
severity: low
status: completed
source: code_quality_audit
file: marketplace/backend/routes/checkout.js
line: 313
created: "2026-03-06T14:00:00Z"
execution_hint: parallel
context_group: checkout_backend
group_reason: "checkout.js standalone — no overlap with other pending tasks"
---

# Stop swallowing fulfillment errors in Stripe webhook handler

**Priority:** P2 (low → elevated because it silently loses orders)
**Source:** code_quality_audit
**Location:** marketplace/backend/routes/checkout.js:313

## Problem

The outer catch block in the Stripe webhook handler (checkout.session.completed event) catches fulfillment errors but still returns `{received: true}` to Stripe. This means:

1. If download token generation fails, or email delivery fails, or course enrollment fails — Stripe sees a 200 OK and will **never retry** the webhook
2. The operator has no visibility into fulfillment failures — they only see a generic "Error processing payment completion" log line without orderId, customerId, or event type
3. Customers who paid may not receive their download or course access, with no automated recovery mechanism

**Code with issue:**
```javascript
// checkout.js lines 310-315 (approximate)
} catch (err) {
  console.error('Error processing payment completion', err);
  // Webhook still returns 200 — Stripe will not retry
  res.json({ received: true });
}
```

## How to Fix

1. **Log with structured context** — include orderId, eventType, customerId, and full error stack:
```javascript
} catch (err) {
  console.error('Fulfillment error', {
    event: event.type,
    sessionId: session?.id,
    orderId: order?.order_id,
    customerEmail: session?.customer_details?.email,
    error: err.message,
    stack: err.stack
  });
```

2. **Mark the order as failed in the database** — call `orderService.failOrder(orderId, err.message)` so operators can see failed orders in the admin dashboard

3. **Consider returning 500 for critical fulfillment failures** — Stripe will retry webhook delivery up to 3 days if the endpoint returns 5xx. However, be careful: only return 500 for transient failures (network, DB down), not for permanent failures (invalid data). The safest approach is to always return 200 but persist a `fulfillment_failed` flag in the order record.

4. **Add a failed orders view in admin** — alert operators to orders with `status = 'failed'` or `fulfillment_failed = true`

Minimal acceptable fix:
```javascript
} catch (err) {
  console.error('Fulfillment error', {
    eventType: event?.type,
    sessionId: session?.id,
    error: err.message,
    stack: err.stack
  });
  // Mark order as failed if we have orderId
  if (orderId) {
    await orderService.failOrder(orderId, err.message).catch(() => {});
  }
  res.json({ received: true });
}
```

## Acceptance Criteria

- [ ] Catch block logs structured context: at minimum event type, session ID, error message, stack
- [ ] If `orderId` is available, `orderService.failOrder()` is called to persist the failure
- [ ] Webhook still returns 200 (do not change Stripe retry behavior without careful consideration)
- [ ] Same pattern applied in `cryptoCheckout.js` BTCPay webhook handler if it has the same issue
- [ ] Existing tests still pass

## Notes

_Generated from code_quality_audit low finding: "The outer catch block logs 'Error processing payment completion' but swallows the error — the webhook still returns {received: true} even when fulfillment fails. A failed fulfillment is invisible to operators."_
