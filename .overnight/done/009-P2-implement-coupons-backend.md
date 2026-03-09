---
id: 9
title: "Implement coupons — percentage/fixed discounts, expiry, usage limits, analytics"
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

# Implement Coupons Backend

**Priority:** P2 (medium)
**Source:** AGENT_TASKS.md Phase 2 Creator Toolkit — Checkout Conversion Stack
**Location:** marketplace/backend/routes/checkout.js, marketplace/backend/services/, marketplace/backend/database/schema.sql

## Problem

There is currently no coupon/discount system. Hardcoded coupon codes exist client-side in `cart-custom.html:529` (SAVE10, 10OFF, WELCOME20) — these are trivially bypassable and have no expiry or usage limits.

A proper server-side coupon system is needed for the Creator Toolkit and blocks switching creators from competitors (per roadmap Research #3).

## How to Fix

1. **Schema**: Add `coupons` table to `schema.sql`:
   ```sql
   CREATE TABLE coupons (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     code TEXT UNIQUE NOT NULL,
     type TEXT NOT NULL, -- 'percentage' | 'fixed'
     amount REAL NOT NULL, -- percentage (0-100) or fixed USD
     expires_at TEXT,      -- ISO datetime or NULL
     max_uses INTEGER,     -- NULL = unlimited
     used_count INTEGER DEFAULT 0,
     active INTEGER DEFAULT 1,
     created_at TEXT DEFAULT CURRENT_TIMESTAMP
   );
   ```

2. **Service**: Create `marketplace/backend/services/couponService.js`:
   - `validateCoupon(code, cartTotal)` — checks: exists, active, not expired, under use limit; returns discount amount
   - `applyCoupon(code)` — increments `used_count`
   - `createCoupon(data)` — admin API

3. **Route**: Add `POST /api/coupons/validate` endpoint (no auth — called from cart):
   - Input: `{ code, cartTotal }`
   - Output: `{ valid, discountAmount, discountType, message }`

4. **Admin routes**: Add to `adminRoutes.js`:
   - `POST /admin/coupons` — create coupon
   - `GET /admin/coupons` — list all coupons
   - `DELETE /admin/coupons/:id` — deactivate

5. **Checkout integration**: In `checkout.js`, if `couponCode` is in the request body:
   - Validate server-side before creating Stripe session
   - Apply discount to `line_items.amount`

6. **Remove client-side hardcoded codes** from `cart-custom.html:529`

7. **Add tests** for couponService.validateCoupon()

## Acceptance Criteria

- [ ] `coupons` table created in schema
- [ ] `couponService.validateCoupon()` correctly enforces expiry and usage limits
- [ ] `POST /api/coupons/validate` returns discount amount
- [ ] Checkout applies discount when valid coupon code provided
- [ ] Hardcoded client-side coupon codes removed from cart-custom.html
- [ ] Admin CRUD endpoints for coupon management
- [ ] Tests added and passing

## Notes

_Generated from AGENT_TASKS.md Phase 2 Checkout Conversion Stack. Replaces insecure client-side coupon codes (verified fact in lessons.json — SAVE10/10OFF/WELCOME20 hardcoded at cart-custom.html:529)._
