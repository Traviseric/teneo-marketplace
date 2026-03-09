---
id: 3
title: "Shipping rate estimation in checkout for physical/POD products"
priority: P2
severity: medium
status: completed
source: project_declared
file: marketplace/backend/routes/checkout.js
line: ~
created: "2026-03-09T00:00:00Z"
execution_hint: sequential
context_group: pod_operations
group_reason: "Shipping estimation + fulfillment status dashboard both touch Printful API and storefront"
---

# Shipping rate estimation in checkout for physical/POD products

**Priority:** P2 (medium)
**Source:** AGENT_TASKS.md (Phase 2 — POD Operations)
**Location:** `marketplace/backend/routes/checkout.js`, `marketplace/backend/services/printfulFulfillmentProvider.js`

## Problem

When a customer adds a physical/POD product to their cart, there is no way to estimate shipping costs before checkout. This creates sticker shock at the payment stage (customers see shipping added to the total without warning) and increases cart abandonment.

Printful (and Lulu) both offer shipping rate estimation APIs. These should be called during checkout to show the customer an estimated shipping cost before they enter payment details.

**Current state:**
- Printful fulfillment is implemented (commit 353254a / ac00bee)
- Printful catalog sync exists (commit 8983ce9)
- No shipping estimation call in checkout.js or storefront.js
- Products in catalog.json don't have `is_physical: true` flag to distinguish from digital

## How to Fix

1. **Add `is_physical` and `fulfillment_provider` fields to product configs** in brand catalog.json files. Example:
   ```json
   {
     "id": "tshirt-001",
     "title": "OpenBazaar T-Shirt",
     "price": 2500,
     "is_physical": true,
     "fulfillment_provider": "printful",
     "printful_variant_id": 12345
   }
   ```

2. **Create `shippingService.js`** in `marketplace/backend/services/`:
   ```js
   // getShippingRates(items, recipientAddress) -> [{carrier, service, rate, currency}]
   // For Printful: POST https://api.printful.com/shipping/rates
   ```

3. **Add GET /api/checkout/shipping-rates endpoint** to checkout.js:
   - Accepts `{ items: [{variantId, quantity}], address: {country, state, zip} }`
   - For each item with `is_physical: true`, calls `shippingService.getShippingRates()`
   - Returns aggregated shipping options with rates

4. **Update checkout frontend** to call shipping rates API when address is entered:
   - Before showing payment form: collect shipping address
   - Call shipping rates API with the address
   - Show cheapest rate + estimated days in the order summary
   - Add shipping amount to Stripe session's `shipping_options` or line items

5. **Handle edge cases:**
   - Mixed cart (digital + physical): only estimate shipping for physical items
   - Multiple POD providers: aggregate rates across providers
   - Printful API failure: show "shipping calculated at checkout" fallback

## Acceptance Criteria

- [ ] `GET /api/checkout/shipping-rates` returns rates for physical products
- [ ] Checkout flow for physical products collects shipping address before payment
- [ ] Shipping cost shown in order summary before payment
- [ ] Stripe checkout session includes shipping cost
- [ ] Digital-only carts skip shipping estimation entirely
- [ ] Graceful fallback if Printful rate API is unavailable

## Notes

_Generated from AGENT_TASKS.md Phase 2 POD Operations. Printful catalog sync (8983ce9) is done, making this the natural next step. Without shipping estimates, POD checkout always surprises customers with unexpected fees._
