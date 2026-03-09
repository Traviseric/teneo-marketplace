---
id: 4
title: "Fulfillment status dashboard — POD order tracking (submitted, in production, shipped, failed)"
priority: P2
severity: medium
status: completed
source: project_declared
file: marketplace/frontend/admin.html
line: ~
created: "2026-03-09T00:00:00Z"
execution_hint: sequential
context_group: pod_operations
group_reason: "Both POD tasks touch Printful API and admin.html — share context"
---

# Fulfillment status dashboard — POD order tracking

**Priority:** P2 (medium)
**Source:** AGENT_TASKS.md (Phase 2 — POD Operations)
**Location:** `marketplace/frontend/admin.html`, `marketplace/backend/routes/` (new fulfillment dashboard route)

## Problem

When a customer orders a POD product, the order goes to Printful for fulfillment. Currently there is no way for the merchant to see the status of each POD order (submitted to Printful? in production? shipped? failed?). Merchants are flying blind on fulfillment.

Without a status dashboard, merchants can't:
- Identify failed or stuck orders
- Answer customer "where is my order?" questions
- Track delivery rates and issues

**Current state:**
- Printful fulfillment provider exists (printfulFulfillmentProvider.js)
- Orders in `orders` table have a `status` field but it's not POD-specific
- No Printful order ID stored on the order
- Printful webhook for status updates may or may not be implemented

## How to Fix

1. **Add Printful order tracking fields to orders table:**
   ```sql
   ALTER TABLE orders ADD COLUMN printful_order_id TEXT;
   ALTER TABLE orders ADD COLUMN fulfillment_status TEXT; -- submitted|in_production|shipped|failed
   ALTER TABLE orders ADD COLUMN tracking_number TEXT;
   ALTER TABLE orders ADD COLUMN estimated_delivery DATE;
   ```
   (Add via migration or update schema.sql)

2. **Update printfulFulfillmentProvider.js:**
   - After submitting order to Printful, store `printful_order_id` in orders table
   - Add `getOrderStatus(printfulOrderId)` method that calls `GET /orders/{id}` on Printful API

3. **Implement Printful webhook handler** at `POST /api/webhooks/printful`:
   - Listens for `package_shipped`, `order_failed` etc. events
   - Updates `fulfillment_status` and `tracking_number` in orders table

4. **Add Fulfillment Dashboard to admin.html:**
   - New "Fulfillment" tab in admin panel
   - Table: Order ID | Customer | Product | Status | Printful ID | Tracking | Last Updated
   - Status badges: submitted (blue), in_production (orange), shipped (green), failed (red)
   - "Refresh Status" button → calls backend to sync latest status from Printful API
   - Filters: by status (show only failed), by date range

5. **Backend API: GET /api/admin/fulfillment:**
   - Returns orders with `printful_order_id IS NOT NULL`
   - Joined with products for product names
   - Sorted by created_at DESC

## Acceptance Criteria

- [ ] Printful order ID stored in orders table after submission
- [ ] Fulfillment status and tracking number updated by Printful webhook
- [ ] Admin dashboard "Fulfillment" tab shows all POD orders with status
- [ ] "Refresh Status" button syncs latest status from Printful API
- [ ] Failed orders clearly highlighted in red
- [ ] Links to Printful dashboard for each order

## Notes

_Generated from AGENT_TASKS.md Phase 2 POD Operations. Printful catalog sync (8983ce9) and fulfillment provider (ac00bee) are done. This completes the merchant-facing POD workflow._
