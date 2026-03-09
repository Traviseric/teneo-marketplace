---
id: 10
title: "Order bumps — 'add this for $X' on checkout page, per-product config"
priority: P2
severity: medium
status: completed
source: AGENT_TASKS.md
file: marketplace/backend/routes/checkout.js
line: null
created: "2026-03-09T00:00:00"
execution_hint: sequential
context_group: checkout_conversion
group_reason: "Checkout conversion stack: tasks 009-010 all touch checkout flow and order state"
---

# Order Bumps on Checkout

**Priority:** P2 (medium)
**Source:** AGENT_TASKS.md Phase 2 Creator Toolkit — Checkout Conversion Stack
**Location:** marketplace/backend/routes/checkout.js, marketplace/frontend/

## Problem

No order bump functionality exists. Order bumps ("Add [product] for just $X!") are a proven revenue multiplier on checkout pages. Without them, creators leave AOV (average order value) on the table.

## How to Fix

1. **Schema**: Add `order_bumps` table (or add bump config to `products` table):
   ```sql
   CREATE TABLE order_bumps (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     trigger_product_id TEXT,  -- NULL = show on all checkouts
     bump_product_name TEXT NOT NULL,
     bump_description TEXT,
     bump_price REAL NOT NULL,
     bump_stripe_price_id TEXT, -- optional, for Stripe line items
     active INTEGER DEFAULT 1,
     created_at TEXT DEFAULT CURRENT_TIMESTAMP
   );
   ```

2. **API**: Add `GET /api/checkout/bump?productId=X` — returns the active order bump for a given product (or global bump if no product-specific one)

3. **Checkout integration** in `checkout.js`:
   - If `bumpAccepted: true` in request body, add bump product as second Stripe line item
   - Validate bump price server-side (don't trust client-supplied price)

4. **Frontend**: Add order bump UI to checkout flow:
   - Checkbox + description + price below the main product
   - "Yes, add [product] for just $X!" styling
   - POST `bumpAccepted: true` to checkout endpoint when checked

5. **Admin**: Allow configuring order bumps per product or globally

## Acceptance Criteria

- [ ] `order_bumps` table/config created
- [ ] `GET /api/checkout/bump` returns active bump config
- [ ] Checkout accepts and validates `bumpAccepted` flag
- [ ] Bump price added as Stripe line item (not client-controlled price)
- [ ] Checkout UI shows bump offer below main product
- [ ] Admin can enable/disable/configure bumps

## Notes

_Generated from AGENT_TASKS.md Phase 2 Checkout Conversion Stack._
