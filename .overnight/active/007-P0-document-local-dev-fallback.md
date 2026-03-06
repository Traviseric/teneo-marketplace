---
id: 7
title: "Document local dev fallback story (SQLite vs Supabase)"
priority: P0
severity: medium
status: completed
source: AGENT_TASKS.md
file: docs/
line: null
created: "2026-03-06T00:00:00Z"
execution_hint: parallel
context_group: documentation
group_reason: "Documentation task; independent of code changes"
---

# Document local dev fallback story (SQLite vs Supabase)

**Priority:** P0 (medium)
**Source:** AGENT_TASKS.md (Phase 0 — Make It Work)

## Problem

The DB adapter supports SQLite locally and Supabase/Postgres in production, but this is not documented. Developers don't know:
- When SQLite is used vs Supabase
- What env vars to set for each mode
- How to run locally without a Supabase account
- What schema differences to expect between modes

## How to Fix

Update `docs/DEVELOPMENT_SETUP.md` (create if missing) with a section:

```markdown
## Database Modes

### Local Development (SQLite — default)
No configuration needed. Run `node marketplace/backend/database/init.js` to initialize.
SQLite file created at `marketplace/backend/marketplace.db`.

### Production / Supabase
Set `DATABASE_URL` or `SUPABASE_DB_URL` to your Supabase Postgres connection string.
The adapter auto-detects which mode to use at startup.

### Schema
- Local: `marketplace/backend/database/schema.sql`
- Supabase: `marketplace/backend/database/supabase-migration.sql`
```

Also add a startup log in `database.js` that prints which mode is active:
```js
console.log(`[DB] Mode: ${SQLITE_MODE ? 'SQLite (local)' : 'Postgres/Supabase'}`);
```

And in `marketplace/backend/.env.example`, add clear comments explaining when to set `DATABASE_URL`.

## Acceptance Criteria

- [ ] `docs/DEVELOPMENT_SETUP.md` has database mode documentation
- [ ] `database.js` logs which mode is active at startup
- [ ] `.env.example` has clear comments about `DATABASE_URL` / `SUPABASE_DB_URL`
- [ ] README or CLAUDE.md updated if needed to reference the setup doc

## Notes

_Generated from AGENT_TASKS.md P0 item: "Verify and document local dev fallback story (when SQLite vs when Supabase)"._
