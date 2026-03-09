---
id: 1
title: "Audit direct sqlite3 usage and isolate production paths"
priority: P0
severity: critical
status: completed
source: AGENT_TASKS.md
file: marketplace/backend/database/
line: null
created: "2026-03-06T00:00:00Z"
execution_hint: sequential
context_group: database_layer
group_reason: "Same db/adapter feature area as tasks 2 and 3"
---

# Audit direct sqlite3 usage and isolate production paths

**Priority:** P0 (critical)
**Source:** AGENT_TASKS.md (Phase 0 — Make It Work)
**Location:** marketplace/backend/ (12 files)

## Problem

12 files in `marketplace/backend/` import `sqlite3` directly or use `new Database(...)` bypassing the shared `database.js` adapter. On Render/Vercel the filesystem is read-only, so any code that opens a SQLite file at runtime will crash with `SQLITE_CANTOPEN` or similar. The adapter at `marketplace/backend/database/database.js` correctly routes to Postgres when `DATABASE_URL` is set — but only if code uses it.

Known direct-sqlite3 users (from grep):
- `marketplace/backend/services/orderService.js`
- `marketplace/backend/database/init.js`
- `marketplace/backend/database/database.js` (the adapter itself — fine)
- `marketplace/backend/auth/providers/NostrAuthProvider.js`
- `marketplace/backend/scripts/seed-appstore.js`
- `marketplace/backend/scripts/seed-dogfooding.js`
- `marketplace/backend/routes/emailTracking.js`
- `marketplace/backend/services/cronJobs.js`
- `marketplace/backend/services/database-service.js`
- `marketplace/backend/scripts/init-ai-discovery.js`
- `marketplace/backend/scripts/init-censorship-tracker.js`
- `marketplace/backend/database/setup.js`

Scripts (seed-*, init-*) are dev/admin tools — they can stay SQLite-only but should be clearly marked and never called in production server startup.

## How to Fix

1. For each **non-script** file (routes, services, providers): replace direct `sqlite3`/`new Database` with `require('../database/database')` (or the correct relative path) and use the adapter's `.run()`, `.get()`, `.all()` methods.
2. For **script files** (seed-*, init-*): add a guard at the top: `if (process.env.DATABASE_URL) { console.error('Use Supabase migration instead'); process.exit(1); }` to prevent accidental production runs.
3. Confirm no hardcoded SQLite file path (e.g. `marketplace.db`, `./database/`) is used outside the adapter.
4. In the adapter (`database.js`), ensure the SQLite file path uses a writable location (e.g. `/tmp/marketplace.db`) when running in a read-only container environment.

## Acceptance Criteria

- [ ] No non-script file directly imports `sqlite3` outside `database.js`
- [ ] All production routes/services use the shared adapter
- [ ] Script files are guarded against production runs
- [ ] SQLite file path in adapter falls back to `/tmp/` when on read-only FS (check `DATABASE_URL` or env)
- [ ] No regressions in existing tests

## Notes

_Generated from AGENT_TASKS.md P0 items: "Audit direct sqlite3 usage" + "Confirm deployed backend no longer writes to read-only filesystem path"._
