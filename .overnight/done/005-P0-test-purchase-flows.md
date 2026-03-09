---
id: 5
title: "Write test scripts for Stripe and POD purchase flows"
priority: P0
severity: critical
status: completed
source: AGENT_TASKS.md
file: marketplace/backend/
line: null
created: "2026-03-06T00:00:00Z"
execution_hint: parallel
context_group: testing
group_reason: "Independent test scripts; no file overlap with other tasks"
---

# Write test scripts for Stripe and POD purchase flows

**Priority:** P0 (critical)
**Source:** AGENT_TASKS.md (Phase 0 — Make It Work)

## Problem

Two critical purchase flows have no automated tests proving they work end-to-end:
1. Stripe checkout → order created in DB → download link delivered
2. POD (Printful) checkout → `/api/storefront/fulfill` called → Printful order created → webhook updates order status

Without these tests, regressions in checkout or fulfillment go undetected.

## How to Fix

### Stripe flow test (`scripts/test-stripe-flow.js`):
1. Mock or use Stripe test mode
2. POST to `/api/checkout/create-session` with a test product
3. Verify Stripe session is created (has `url` field)
4. Simulate Stripe webhook `checkout.session.completed`
5. Verify order appears in DB with status `completed`
6. Verify `/api/download/:token` route is accessible (or download email would be sent)
7. Print `[PASS]`/`[FAIL]` for each step

### POD flow test (`scripts/test-pod-flow.js`):
1. POST to `/api/storefront/checkout` with a POD product (type=pod, variant_id set)
2. Mock Printful API response (or use Printful sandbox if keys available)
3. POST to `/api/storefront/webhooks/printful` with a fulfillment event
4. Verify order status updated in DB
5. Print `[PASS]`/`[FAIL]` for each step

Both scripts should:
- Use the shared DB adapter (not direct sqlite3)
- Clean up test records after completion
- Exit with code 1 on failure

Add npm scripts in package.json:
- `"test:stripe-flow": "node scripts/test-stripe-flow.js"`
- `"test:pod-flow": "node scripts/test-pod-flow.js"`

## Acceptance Criteria

- [ ] `test-stripe-flow.js` runs without errors and all steps pass
- [ ] `test-pod-flow.js` runs without errors and all steps pass
- [ ] Both scripts clean up after themselves
- [ ] npm scripts added to package.json
- [ ] Scripts documented with instructions for test vs production mode

## Notes

_Generated from AGENT_TASKS.md P0 items: "Test Stripe purchase flow" and "Test POD purchase flow"._
