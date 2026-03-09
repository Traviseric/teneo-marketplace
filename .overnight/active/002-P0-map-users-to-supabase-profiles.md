---
id: 2
title: "Map users table references to Supabase profiles"
priority: P0
severity: critical
status: completed
source: project_declared
file: marketplace/backend/
line: null
created: "2026-03-09T21:00:00"
execution_hint: sequential
context_group: supabase_migration
group_reason: "Supabase DB adapter and schema alignment"
---

# Map users table references to Supabase profiles

**Priority:** P0 (critical)
**Source:** project_declared (AGENT_TASKS.md Phase 0 item)
**Location:** marketplace/backend/ (database adapter, auth routes)

## Problem

The codebase was originally built against a SQLite `users` table. Supabase uses `auth.users` and a public `profiles` table (created by `supabase-migration.sql`). Any code that directly queries or references `users` instead of going through the DB adapter's profile methods will fail silently or crash in production.

This is a P0 blocking item: production Supabase queries will return empty results or errors if the table mapping is wrong.

AGENT_TASKS.md: `[P0] IMPLEMENT: Map code that expects users onto Supabase profiles where needed`

## How to Fix

1. Search for all direct `users` table references in the codebase:
   ```
   grep -r "FROM users\|INTO users\|UPDATE users\|JOIN users\|db.get.*users\|db.run.*users\|db.all.*users" marketplace/backend/
   ```
2. For each reference, determine if it should go through `dbAdapter.js` instead
3. Check `dbAdapter.js` methods for user operations — ensure they map to `profiles` table when `SUPABASE_URL` is configured
4. Check `marketplace/backend/routes/auth.js` for any direct `users` table queries
5. Verify `marketplace/backend/database/schema.sql` `users` table is the SQLite fallback equivalent of Supabase `profiles`
6. If the DB adapter is already handling this via `getProfile()` / `createProfile()` methods, verify those are being called everywhere instead of raw SQL
7. Run `node marketplace/backend/database/init.js` and verify startup doesn't error

## Acceptance Criteria

- [ ] No raw SQL queries reference `FROM users` / `INTO users` outside of the SQLite schema init
- [ ] All user lookups go through `dbAdapter.js` methods
- [ ] Auth routes (magic link, OAuth) correctly read/write to `profiles` table in Supabase mode
- [ ] Existing tests still pass after refactor

## Notes

_Generated from AGENT_TASKS.md Phase 0. This task has appeared in previous synthesis runs — verify first whether dbAdapter already handles this mapping before making broad changes._
