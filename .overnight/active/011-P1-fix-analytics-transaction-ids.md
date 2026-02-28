---
id: 11
title: "Fix analytics tracking to use real order IDs instead of Date.now()"
priority: P1
severity: high
status: completed
source: gap_analyzer
file: marketplace/frontend/success.html
line: 1
created: "2026-02-28T00:00:00"
execution_hint: parallel
context_group: frontend_module
group_reason: "Frontend fixes alongside tasks 7, 8; independent enough to parallelize"
---

# Fix analytics tracking to use real order IDs instead of Date.now()

**Priority:** P1 (high)
**Source:** gap_analyzer
**Location:** marketplace/frontend/success.html, marketplace/frontend/brands/master-templates/purchase-success.html

## Problem

The purchase success page has broken analytics tracking:

1. **Fake transaction IDs**: Google Analytics purchase events use `Date.now().toString()` as transaction_id — this creates duplicate events if the page is refreshed and makes revenue attribution impossible
2. **URL-parameter prices**: Purchase values are read from URL parameters which are unreliable (can be tampered, may be missing) instead of from the verified Stripe session
3. **Unrendered template variables**: `{{ANALYTICS_ID}}` appears as a literal string in rendered HTML — the template substitution system is not processing analytics config variables
4. **Facebook Pixel**: Same issues — fake order IDs, URL-parameter values

**Code with issue:**
```javascript
// success.html
gtag('event', 'purchase', {
    transaction_id: Date.now().toString(),  // ← fake ID, duplicates on refresh
    value: parseFloat(new URLSearchParams(location.search).get('amount') || 0),  // ← URL param, unreliable
});
```

## How to Fix

1. **Pass real order data from backend**: After Stripe payment success, redirect to `/success?session_id=cs_xxx`. On success page load, fetch order details from backend:
   ```javascript
   const sessionId = new URLSearchParams(location.search).get('session_id');
   const orderData = await fetch(`/api/checkout/session/${sessionId}`).then(r => r.json());
   ```

2. **Use real order ID in analytics**:
   ```javascript
   gtag('event', 'purchase', {
       transaction_id: orderData.orderId,  // real DB order ID
       value: orderData.amount / 100,       // from Stripe session, cents → dollars
       currency: 'USD',
       items: orderData.items
   });
   ```

3. **Fix template variable rendering**: Ensure `{{ANALYTICS_ID}}` is replaced server-side before serving the page, or remove if not using dynamic brand analytics IDs.

4. **Prevent duplicate firing**: Store a flag in sessionStorage after firing analytics event so it doesn't re-fire on page refresh.

## Acceptance Criteria

- [ ] Transaction IDs in GA events match actual order IDs from database
- [ ] Purchase values come from verified Stripe session data, not URL params
- [ ] `{{ANALYTICS_ID}}` template variables are rendered or removed
- [ ] Analytics events only fire once (not on page refresh)
- [ ] Facebook Pixel tracking uses same real order data

## Notes

_Generated from gap_analyzer findings. Inaccurate analytics corrupts revenue tracking and makes ROI calculation impossible._
