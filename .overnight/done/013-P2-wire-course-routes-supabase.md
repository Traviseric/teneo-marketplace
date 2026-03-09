---
id: 13
title: "Wire course routes to Supabase"
priority: P2
severity: medium
status: completed
source: AGENT_TASKS.md
file: marketplace/backend/routes/courseRoutes.js
line: null
created: "2026-03-09T00:00:00"
execution_hint: sequential
context_group: supabase_wiring
group_reason: "Supabase wiring group — tasks 011-013 all wire existing features to Supabase persistence"
---

# Wire Course Routes to Supabase

**Priority:** P2 (medium)
**Source:** AGENT_TASKS.md Phase 2 Creator Toolkit — Course Platform
**Location:** marketplace/backend/routes/courseRoutes.js, marketplace/backend/database/schema.sql

## Problem

`courseRoutes.js` implements a full course CRUD + enrollment + progress API (verified fact from lessons.json). However, this likely uses the SQLite adapter directly rather than the shared DB adapter, meaning it won't work with Supabase in production. The `courses` table is listed as required in the Supabase migration (HT-009).

## How to Fix

1. **Audit** `courseRoutes.js` and any associated service files:
   - Find all direct `db.query()` / `db.run()` / `sqlite3` calls
   - Map them to the shared DB adapter

2. **Schema**: Verify `courses` table in `schema.sql`:
   ```sql
   CREATE TABLE courses (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     user_id TEXT,
     title TEXT NOT NULL,
     description TEXT,
     price REAL,
     stripe_price_id TEXT,
     modules_json TEXT,    -- JSON array of modules with lessons
     published INTEGER DEFAULT 0,
     created_at TEXT DEFAULT CURRENT_TIMESTAMP
   );
   CREATE TABLE enrollments (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     course_id INTEGER,
     student_email TEXT,
     enrolled_at TEXT DEFAULT CURRENT_TIMESTAMP
   );
   CREATE TABLE course_progress (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     enrollment_id INTEGER,
     lesson_id TEXT,
     completed_at TEXT
   );
   ```

3. **Update** all DB operations in courseRoutes.js to use the shared DB adapter

4. **Enrollment auth**: Verify that `requireEnrollment` middleware checks session (not just email param) — lessons.json verified_facts_round2 noted this was a bypass risk

5. **Fix enrollment auth** if still email-only: require valid session OR a secure enrollment token (not ?email= param)

## Acceptance Criteria

- [ ] `courses`, `enrollments`, `course_progress` tables in schema
- [ ] All DB calls in courseRoutes.js go through the shared adapter (Supabase-compatible)
- [ ] `requireEnrollment` checks session or secure token (not just email param)
- [ ] Enrollment via Stripe webhook still works
- [ ] Tests pass

## Notes

_Generated from AGENT_TASKS.md Phase 2 Course Platform. `courses` is in the Supabase migration table list (HT-009). Enrollment auth bypass was a known risk from lessons.json round2._
