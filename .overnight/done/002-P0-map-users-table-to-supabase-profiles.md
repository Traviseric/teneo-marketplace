---
id: 2
title: "Map code expecting users table onto Supabase profiles"
priority: P0
severity: critical
status: completed
source: AGENT_TASKS.md
file: marketplace/backend/
line: null
created: "2026-03-06T00:00:00Z"
execution_hint: sequential
context_group: database_layer
group_reason: "Same db/adapter feature area as tasks 1 and 3"
---

# Map code expecting `users` table onto Supabase `profiles`

**Priority:** P0 (critical)
**Source:** AGENT_TASKS.md (Phase 0 — Make It Work)

## Problem

SQLite schema uses a `users` table. Supabase uses `auth.users` (managed by Supabase Auth) and a `profiles` table for app-level user data. Any backend code that runs `SELECT * FROM users` or `INSERT INTO users` will fail when connected to Supabase because the table doesn't exist in the `public` schema.

This affects auth flows, session checks, admin routes, and any feature that stores or reads user data.

## How to Fix

1. Grep for all SQL queries referencing `users` table: `SELECT.*FROM users`, `INSERT INTO users`, `UPDATE users`, `DELETE FROM users`.
2. For each match, determine whether it should map to:
   - `profiles` (app-level user data: name, email, role, plan)
   - `auth.users` (Supabase-managed: id, email, created_at — read-only via Supabase Admin API)
3. Update all SQL queries to use the correct table name.
4. Ensure `supabase-migration.sql` has a `profiles` table with the same columns that backend code expects (id, email, name, role, etc.). If columns are missing, add them to the migration.
5. Update `database/schema.sql` comments to note the Supabase equivalent for each table.

## Acceptance Criteria

- [ ] No SQL query references `FROM users` or `INTO users` when running against Supabase
- [ ] `profiles` table in `supabase-migration.sql` has all columns backend code expects
- [ ] Auth flows (magic link, OAuth) successfully create/fetch user records via `profiles`
- [ ] No regressions in SQLite mode (local dev still works)

## Notes

_Generated from AGENT_TASKS.md P0 item: "Map code that expects users onto Supabase profiles where needed"._
