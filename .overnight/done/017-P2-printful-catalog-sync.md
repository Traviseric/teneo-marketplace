---
id: 17
title: "Printful catalog/variant sync — merchants browse valid variant_ids in UI"
priority: P2
severity: medium
status: completed
source: AGENT_TASKS.md
file: marketplace/backend/routes/
line: null
created: "2026-03-09T00:00:00"
execution_hint: parallel
context_group: pod_operations
group_reason: "POD Operations group: task 017 is standalone Printful catalog sync feature"
---

# Printful Catalog/Variant Sync — Merchant UI for Browsing Valid Variant IDs

**Priority:** P2 (medium)
**Source:** AGENT_TASKS.md Phase 2 POD Operations
**Location:** marketplace/backend/services/, marketplace/backend/routes/, marketplace/frontend/

## Problem

The Printful fulfillment provider (`printfulProvider.js` or similar, added in commit 353254a) can create orders with `variant_id` values. But merchants have no way to browse valid Printful variant IDs from within the OpenBazaar.ai interface — they must look them up manually in the Printful catalog.

This creates friction and errors when merchants configure POD products (wrong variant IDs cause fulfillment failures).

## How to Fix

1. **Read** the existing Printful integration code to understand current API client setup

2. **Printful API integration** — Add a catalog sync service:
   - `GET /api/admin/printful/catalog` — fetches product categories from Printful API
   - `GET /api/admin/printful/catalog/:productId/variants` — fetches variants (sizes, colors) for a product
   - Cache responses in DB or in-memory (Printful catalog changes rarely)
   - Auth: require admin session

3. **Frontend** — Add a variant picker to the admin product configuration UI:
   - Browse Printful products by category
   - Select a product → see variants with sizes/colors and prices
   - "Use this variant" button copies `variant_id` into the product form

4. **Merchant mapping UI**: Allow merchants to map their OpenBazaar products to Printful variants:
   - Store `printful_variant_id` on the product record
   - Validate that the variant exists before saving

5. **Fulfillment validation**: In `storefront.js` fulfill endpoint, validate that `variant_id` is a number > 0 before sending to Printful

## Acceptance Criteria

- [ ] `GET /api/admin/printful/catalog` returns Printful product list (requires PRINTFUL_API_KEY)
- [ ] `GET /api/admin/printful/catalog/:id/variants` returns variant options
- [ ] Admin UI shows a browse/select interface for Printful variants
- [ ] Selected variant_id saved to product record
- [ ] Fulfillment endpoint validates variant_id before Printful API call

## Notes

_Generated from AGENT_TASKS.md Phase 2 POD Operations. PRINTFUL_API_KEY is already in .env.example (per HT-012). Gracefully handle missing PRINTFUL_API_KEY with a clear error message._
