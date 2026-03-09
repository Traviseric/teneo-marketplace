---
id: 42
title: "Create store_builds DB table and status-stage service (Phase 1A)"
priority: P1
severity: high
status: completed
source: AGENT_TASKS.md
file: marketplace/backend/database/schema.sql
line: null
created: "2026-03-06T00:00:00Z"
execution_hint: sequential
context_group: ai_store_commercialization
group_reason: "Same feature area as tasks 043 and 044 — Phase 1A managed-service flow"
---

# Create store_builds DB table and status-stage service (Phase 1A)

**Priority:** P1 (high)
**Source:** AGENT_TASKS.md Phase 1A
**Location:** marketplace/backend/database/schema.sql + marketplace/backend/services/

## Problem

Phase 1A of the roadmap requires a managed-service commercialization layer for the AI Store Builder. Currently there is no `store_builds` table or service to track the lifecycle of a build request from intake through delivery.

Needed: a record shape with status stages: `intake → planning → building → qa → delivered → failed`.

Without this, operators cannot track which builds are in progress, hand off work between sessions, or report on delivery status to paying customers.

## How to Fix

1. Add `store_builds` table to `marketplace/backend/database/schema.sql`:
   ```sql
   CREATE TABLE IF NOT EXISTS store_builds (
     id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
     intake_payload TEXT NOT NULL,          -- JSON: business brief, contact, tier
     status TEXT NOT NULL DEFAULT 'intake', -- intake|planning|building|qa|delivered|failed
     store_id TEXT REFERENCES stores(id),   -- set when store is generated
     tier TEXT,                             -- builder|pro|white_label
     operator_notes TEXT,
     error_message TEXT,
     created_at TEXT DEFAULT (datetime('now')),
     updated_at TEXT DEFAULT (datetime('now')),
     delivered_at TEXT
   );
   ```

2. Create `marketplace/backend/services/storeBuildService.js` with:
   - `createBuild(intakePayload, tier)` → inserts row, returns id
   - `updateStatus(buildId, status, notes)` → updates status + updated_at
   - `getBuild(buildId)` → returns build record
   - `listBuilds(filters)` → list by status for operator dashboard
   - Valid status transitions: intake→planning, planning→building, building→qa, qa→delivered, any→failed

3. Add API routes to `marketplace/backend/routes/storeBuilder.js`:
   - `POST /api/store-builder/builds` — create build (requires intake payload)
   - `GET /api/store-builder/builds` — list builds (admin only)
   - `GET /api/store-builder/builds/:id` — get build status
   - `PATCH /api/store-builder/builds/:id/status` — update status (admin only)

4. Run `node marketplace/backend/database/init.js` to apply schema.

## Acceptance Criteria

- [ ] `store_builds` table added to schema.sql
- [ ] `storeBuildService.js` created with CRUD + status transitions
- [ ] API routes added to storeBuilder.js
- [ ] Invalid status transitions rejected with 400 error
- [ ] Admin-only routes protected with existing `requireAdmin` middleware
- [ ] No regressions in existing store builder tests

## Notes

_Generated from AGENT_TASKS.md Phase 1A: "Create store_builds record shape with status stages (intake → planning → building → qa → delivered → failed)"_
