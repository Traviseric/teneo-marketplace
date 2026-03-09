---
id: 2
title: "Map code expecting 'users' table onto Supabase 'profiles'"
priority: P0
severity: critical
status: completed
source: AGENT_TASKS.md
file: marketplace/backend/database/
line: null
created: "2026-03-09T00:00:00"
execution_hint: sequential
context_group: supabase_migration
group_reason: "Supabase migration group — tasks 002-003 both affect DB adapter and auth paths"
---

# Map Code Expecting 'users' Table onto Supabase 'profiles'

**Priority:** P0 (critical)
**Source:** AGENT_TASKS.md Phase 0 production deployment
**Location:** marketplace/backend/database/, marketplace/backend/auth/

## Problem

The codebase was originally built against a `users` table in SQLite. Supabase uses `profiles` (linked to `auth.users` via FK). The DB adapter has partial mapping but some routes/services may still query `users` directly or expect the `users` table to exist.

When the production backend connects to Supabase and a query hits `users` instead of `profiles`, it will fail with a table-not-found error, breaking auth, checkout, and order flows.

## How to Fix

1. Grep for all references to `users` table in routes/services:
   ```bash
   grep -rn "FROM users\|INTO users\|UPDATE users\|JOIN users\|table.*users" marketplace/backend/
   ```
2. For each hit, determine if it should map to `profiles` in Supabase mode
3. Update the DB adapter (`marketplace/backend/database/`) to translate `users` → `profiles` queries OR update the queries directly to use `profiles`
4. Check auth routes (`marketplace/backend/auth/`) — magic link, OAuth, and Nostr callbacks that store user sessions
5. Check `orderService.js` — any FK references to `users` table in orders
6. Run the parity test script (task 003) after changes to verify

## Acceptance Criteria

- [ ] No raw `FROM users` / `INTO users` queries remain that would break in Supabase mode
- [ ] DB adapter correctly routes user queries to `profiles` when Supabase adapter is active
- [ ] Auth flows (magic link, OAuth) still create/find user records correctly
- [ ] Order creation with user FK still works
- [ ] SQLite mode still works (no regression)

## Notes

_Generated from AGENT_TASKS.md P0 Phase 0 production item. Blocks going live on Supabase._
