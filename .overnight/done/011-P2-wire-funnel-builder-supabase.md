---
id: 11
title: "Wire funnel builder to Supabase — save/load funnels, funnel analytics"
priority: P2
severity: medium
status: completed
source: AGENT_TASKS.md
file: marketplace/backend/routes/funnels.js
line: null
created: "2026-03-09T00:00:00"
execution_hint: sequential
context_group: supabase_wiring
group_reason: "Supabase wiring group — tasks 011-013 all wire existing features to Supabase persistence"
---

# Wire Funnel Builder to Supabase

**Priority:** P2 (medium)
**Source:** AGENT_TASKS.md Phase 2 Creator Toolkit — Funnels
**Location:** marketplace/backend/routes/funnels.js, marketplace/backend/services/, marketplace/backend/database/schema.sql

## Problem

The funnel builder has local tracking and a `/track` endpoint, but funnels are not persisted to Supabase. Creators can't save/load their funnels across sessions or view funnel analytics in a dashboard. The `funnels` table is listed as a required Supabase table in HT-009.

## How to Fix

1. **Schema**: Verify `funnels` table exists in `schema.sql` with at minimum:
   ```sql
   CREATE TABLE funnels (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     user_id TEXT,
     name TEXT NOT NULL,
     config_json TEXT,    -- funnel steps, products, email sequences
     conversion_rate REAL,
     created_at TEXT DEFAULT CURRENT_TIMESTAMP,
     updated_at TEXT DEFAULT CURRENT_TIMESTAMP
   );
   ```

2. **Funnels routes** (`routes/funnels.js`):
   - `POST /api/funnels` — create/save funnel (persist config to `funnels` table)
   - `GET /api/funnels` — list user's funnels
   - `GET /api/funnels/:id` — load funnel config
   - `PUT /api/funnels/:id` — update funnel
   - `DELETE /api/funnels/:id` — delete funnel

3. **Analytics**: Wire `/api/funnels/:id/track` events to the `funnels` table (update `conversion_rate`, track step completions)

4. **Auth**: Ensure funnel CRUD requires authentication (session check) — funnels belong to a user

5. **Landing page → email capture → sequence pipeline**: Document the config shape that enables this pipeline and ensure the funnel config supports: landing page URL, email capture form config, email sequence IDs, conversion product

## Acceptance Criteria

- [ ] `funnels` table in schema with user_id FK
- [ ] CRUD API endpoints for funnels (create, read, update, delete, list)
- [ ] Funnels save to DB and load correctly
- [ ] Auth required for funnel CRUD (no unauthenticated access)
- [ ] Funnel analytics (/track) updates conversion_rate in DB

## Notes

_Generated from AGENT_TASKS.md Phase 2 Creator Toolkit. `funnels` is in the Supabase migration table list (HT-009)._
