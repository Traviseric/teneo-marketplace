---
id: 2
title: "Post-purchase upsells — one-click add after payment confirmation"
priority: P2
severity: medium
status: completed
source: project_declared
file: marketplace/frontend/
line: ~
created: "2026-03-09T00:00:00Z"
execution_hint: sequential
context_group: checkout_conversion
group_reason: "Builds on coupons+order bumps already done (d2d5fb0); shares checkout.js context"
---

# Post-purchase upsells — one-click add after payment confirmation

**Priority:** P2 (medium)
**Source:** AGENT_TASKS.md (Phase 2 — Checkout Conversion Stack)
**Location:** `marketplace/frontend/` (confirmation page), `marketplace/backend/routes/checkout.js`

## Problem

After a successful Stripe payment, the customer is redirected to a success/thank-you page. Currently this page is a dead end — no opportunity to offer related products.

Post-purchase upsells (also called "one-click upsells" or OTOs) offer a complementary product IMMEDIATELY after payment when buyer intent is highest. The customer doesn't need to re-enter payment details — just click "Add to Order".

Server-side coupons and order bumps are already implemented (d2d5fb0). Post-purchase upsells are the next logical step in the conversion stack.

## How to Fix

1. **Create/update the success page** (`marketplace/frontend/success.html` or the existing Stripe success redirect):
   - Show order confirmation details
   - Display upsell offer: one product with a discounted price and one-click "Add to My Order" button
   - Upsell config comes from admin panel (per-product config)

2. **Add `upsells` table to schema:**
   ```sql
   CREATE TABLE IF NOT EXISTS upsells (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     product_id TEXT,
     upsell_product_id TEXT, -- product to offer after purchasing product_id
     upsell_price_cents INTEGER,
     headline TEXT,
     description TEXT,
     active INTEGER DEFAULT 1
   );
   ```

3. **Backend: POST /api/checkout/upsell endpoint:**
   - Accepts `{ orderId, upsellProductId }` (no payment info needed — same Stripe customer)
   - Creates a second Stripe charge or PaymentIntent for the upsell amount
   - Uses `stripe.customers.retrieve` from original order to charge without re-entering card
   - Creates new order record in orders table
   - Returns `{ success: true, newOrderId }` or `{ success: false, error }`

4. **Admin panel: upsell configuration:**
   - Add upsell management to admin.html → associate Product A → Upsell Product B with price
   - API: GET/POST/DELETE /api/admin/upsells

5. **Success page flow:**
   - On page load: fetch upsell offer for just-purchased product(s) from GET /api/checkout/upsell-offer?orderId=X
   - Display offer with 15-minute countdown timer (urgency)
   - "Yes! Add to My Order" → POST /api/checkout/upsell
   - "No thanks" → dismiss the offer, show normal thank-you content

## Acceptance Criteria

- [ ] success.html shows upsell offer when one is configured for the purchased product
- [ ] One-click upsell works: charge goes through without re-entering card
- [ ] Admin can configure upsell offers per product
- [ ] Upsell is skipped gracefully if no offer configured or product sold out
- [ ] Mobile-friendly layout on success page

## Notes

_Generated from AGENT_TASKS.md Phase 2 Checkout Conversion Stack. Coupons and order bumps done (d2d5fb0). This completes the post-purchase conversion trifecta. Requires Stripe customer ID to be stored on the order to enable re-charging without card re-entry._
