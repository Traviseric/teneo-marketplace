---
id: 1
title: "Wire L402 middleware onto AI-accessible download routes"
priority: P2
severity: medium
status: completed
source: worker_suggestion
file: marketplace/backend/routes/downloadRoutes.js
line: null
created: "2026-03-09T22:00:00"
execution_hint: sequential
context_group: l402_module
group_reason: "Extends existing l402Auth.js middleware — same feature area as any L402 tasks"
---

# Wire L402 middleware onto AI-accessible download routes

**Priority:** P2 (medium)
**Source:** worker_002 post-completion suggestion
**Location:** marketplace/backend/routes/downloadRoutes.js, marketplace/backend/middleware/l402Auth.js

## Problem

L402 paywall middleware (`l402Auth.js`) was implemented in commit `9f87cdf` with 14 passing tests, but it is not yet wired onto any actual routes. Lightning-native AI agents cannot currently access downloadable content autonomously — they must go through the full Stripe checkout flow.

The natural next step is to apply `requireL402()` to specific low-price download routes (< $5 items) and add a dedicated `/api/l402/download/:resource` endpoint, enabling AI agents to pay-and-retrieve content via Lightning in one round-trip.

Worker_002 explicitly noted: "Next: wire requireL402() onto specific low-price download routes (< $5) and add an L402-only /api/l402/download/:resource endpoint so Lightning-native AI agents can access content without a purchase token"

## How to Fix

1. Read `marketplace/backend/middleware/l402Auth.js` to understand `requireL402()` signature and `L402_PRICE_THRESHOLD_CENTS` env var
2. In `marketplace/backend/routes/downloadRoutes.js`:
   - Identify routes that serve low-price digital downloads (< $5 / 500 cents)
   - Add `requireL402()` as middleware on those routes (or conditionally based on price)
3. Add a new dedicated endpoint: `GET /api/l402/download/:resource`
   - Protected by `requireL402()` middleware
   - Looks up the resource by ID/slug from the products table
   - Returns the file if L402 payment is verified
   - Returns 402 with BOLT11 invoice if not paid
4. Update `marketplace/backend/server.js` or the appropriate router mount point to include the new endpoint
5. Add at least 3 Jest tests in `marketplace/backend/__tests__/l402Routes.test.js`:
   - 402 response with invoice when no payment token
   - 200 response with file when valid payment token
   - 401 for invalid/expired token
6. Test with a mock Lightning payment flow to confirm end-to-end behavior

## Acceptance Criteria

- [ ] `requireL402()` applied to at least one download route for items under $5
- [ ] `GET /api/l402/download/:resource` endpoint exists and returns 402 + invoice when unpaid
- [ ] Endpoint returns file content when valid L402 payment proof provided
- [ ] Jest tests pass (no regressions in existing 14 l402 tests)
- [ ] Endpoint is documented in a comment or inline doc

## Notes

_Generated from worker_002 post-completion suggestion after implementing L402 paywall middleware (commit 9f87cdf). The middleware exists — this task wires it onto real routes._
