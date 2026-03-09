---
id: 5
title: "Merchant UI for mapping products to fulfillment providers"
priority: P2
severity: medium
status: completed
source: project_declared
file: marketplace/frontend/admin.html
line: null
created: "2026-03-09T00:00:00Z"
execution_hint: parallel
context_group: independent
group_reason: "Admin UI feature — standalone, no overlap with other tasks"
---

# Merchant UI for Fulfillment Provider Mapping

**Priority:** P2 (medium)
**Source:** project_declared (AGENT_TASKS.md Phase 2 POD Operations)
**Location:** marketplace/frontend/admin.html + marketplace/backend/routes/adminRoutes.js

## Problem

Products can be fulfilled by multiple providers (Stripe for digital, Printful for POD, Lulu for books, ArxMint for crypto). Currently there is no UI for a merchant to specify which fulfillment provider handles each product. This mapping is either hardcoded or inferred from the product's `type` field, making it impossible for merchants to customize.

A merchant should be able to:
- See all their products in the admin panel
- For each product, select which fulfillment provider to use
- Save that mapping so the storefront/checkout uses it correctly

## How to Fix

1. **Add `fulfillment_provider` field to catalog.json schema:**
   ```json
   {
     "id": "product-abc",
     "title": "My Course",
     "fulfillment_provider": "stripe_digital",
     "printful_variant_id": null,
     "lulu_podbook_id": null
   }
   ```
   Supported values: `stripe_digital`, `printful`, `lulu`, `arxmint`, `manual`

2. **Add admin API endpoint:**
   - `PATCH /admin/products/:productId/fulfillment` — takes `{brand_id, fulfillment_provider, printful_variant_id?, lulu_podbook_id?}`
   - Reads the catalog.json, updates the product entry, writes back

3. **Add admin UI section in admin.html:**
   - "Product Fulfillment" section listing all products in the active brand
   - For each product: name, current fulfillment provider (dropdown), optional variant ID field
   - "Save" button per product (PATCH to admin endpoint)
   - Existing Printful section integration (show variant picker when Printful selected)

4. **Update storefront/checkout routing to use the field:**
   - In `storefront.js` fulfill endpoint, check `product.fulfillment_provider` to route to correct provider
   - In `checkout.js`, check `fulfillment_provider` to determine post-payment action

## Acceptance Criteria

- [ ] `fulfillment_provider` field supported in catalog.json
- [ ] Admin PATCH endpoint updates product fulfillment config
- [ ] Admin UI shows fulfillment provider dropdown per product
- [ ] Storefront uses the configured provider for fulfillment
- [ ] No regressions in existing Printful/Lulu/digital checkout flows

## Notes

_Generated from project_declared AGENT_TASKS.md Phase 2 POD Operations._
