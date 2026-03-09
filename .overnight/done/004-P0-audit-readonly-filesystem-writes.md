---
id: 4
title: "Audit backend for read-only filesystem writes that fail in production"
priority: P0
severity: high
status: completed
source: project_declared
file: marketplace/backend/
created: "2026-03-09T21:00:00Z"
execution_hint: parallel
context_group: deployment
group_reason: "Production readiness / deployment concerns"
---

# Audit backend for read-only filesystem writes that fail in production

**Priority:** P0 (high)
**Source:** project_declared (AGENT_TASKS.md — "Confirm deployed backend no longer writes to read-only filesystem path")
**Location:** marketplace/backend/ (database, services, routes)

## Problem

Serverless/PaaS deployments (Vercel, Render free tier) typically have read-only filesystems — only `/tmp` is writable. If the backend writes SQLite `.db` files or other data to the app directory (e.g., `marketplace/backend/database/marketplace.db`), those writes will fail in production with `EROFS: read-only file system` errors.

Previously confirmed: 16 files reference `.db` paths in backend code.

## How to Fix

1. Find all locations where the code writes to the filesystem:
   ```bash
   grep -rn "\.db\|fs\.write\|fs\.mkdir\|fs\.open\|createWriteStream" marketplace/backend/ --include="*.js"
   ```

2. For each write location, classify:
   - **SQLite database file path** — check if it's configurable via `DATABASE_PATH` env var
   - **Log file writes** — should use stdout/stderr in production, not files
   - **Upload/temp files** — should write to `/tmp` not app directory
   - **PDF stamping output** — check if it writes to app dir

3. Fix write paths:
   - SQLite: ensure `DATABASE_PATH` defaults to `/tmp/marketplace.db` in production, not `./database/marketplace.db`
   - PDF stamping (`services/pdfStampingService.js`): ensure output goes to `/tmp`
   - Any other temp files: redirect to `/tmp`

4. Add an env var guard: if `NODE_ENV=production` and `DATABASE_URL` is not set (meaning SQLite is being used in prod), log a startup warning.

5. Verify the `GET /api/health` endpoint reports DB connectivity correctly.

## Acceptance Criteria

- [ ] All filesystem write paths are identified
- [ ] SQLite `DATABASE_PATH` defaults to a writable location in production
- [ ] PDF stamping and other temp file operations write to `/tmp`
- [ ] Startup warning added if SQLite is used in production without DATABASE_URL
- [ ] No hardcoded relative paths for database files

## Dependencies

- Human action still needed: Check production Render/Vercel logs for EROFS errors (HT-018)
- Worker can prepare all code changes; deployment verification requires human

## Notes

_Generated from project_declared AGENT_TASKS.md P0 item._
