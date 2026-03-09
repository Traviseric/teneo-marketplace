---
id: 3
title: "Add parity test proving DB adapter works for checkout and auth paths"
priority: P0
severity: critical
status: completed
source: AGENT_TASKS.md
file: marketplace/backend/__tests__/
line: null
created: "2026-03-09T00:00:00"
execution_hint: sequential
context_group: supabase_migration
group_reason: "Supabase migration group — tasks 002-003 both affect DB adapter and auth paths"
---

# Add Adapter Parity Test for Checkout and Auth Paths

**Priority:** P0 (critical)
**Source:** AGENT_TASKS.md Phase 0 production item
**Location:** marketplace/backend/__tests__/, marketplace/backend/database/

## Problem

The DB adapter supports both SQLite (local dev) and Supabase/Postgres (production). There are no automated tests proving the adapter correctly handles the critical read/write paths for checkout and auth. Without this, we can't verify Supabase connectivity is working before going live.

## How to Fix

Create `marketplace/backend/__tests__/db-adapter-parity.test.js` (or similar) that:

1. **Tests the SQLite adapter** (always runs in CI):
   - Create a user/profile record
   - Create an order record with user FK
   - Read the order back
   - Update order status
   - Verify auth session lookup works

2. **Tests critical checkout paths through the adapter**:
   - `orderService.createOrder()` — verify it writes and returns a valid order
   - `orderService.getOrder(id)` — verify it reads back
   - `orderService.failOrder(id, reason)` — verify status update with json_set

3. **Optionally** tests Supabase adapter when `DATABASE_URL` env var is set (skip otherwise with `test.skip`)

4. Add the test to the existing Jest config so it runs in `npm test`

The test should be self-contained with test DB setup/teardown and not depend on external state.

## Acceptance Criteria

- [ ] Test file created in `marketplace/backend/__tests__/`
- [ ] Tests cover: create order, read order, update order status, create/find user
- [ ] All tests pass in SQLite mode (no Supabase needed for CI)
- [ ] Test gracefully skips Supabase-specific assertions when `DATABASE_URL` not set
- [ ] `npm test` still exits 0

## Notes

_Generated from AGENT_TASKS.md P0 Phase 0 production item. Proves adapter correctness before live Supabase migration._
