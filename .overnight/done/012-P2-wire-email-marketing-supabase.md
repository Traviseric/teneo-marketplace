---
id: 12
title: "Wire email marketing routes to Supabase"
priority: P2
severity: medium
status: completed
source: AGENT_TASKS.md
file: marketplace/backend/services/emailMarketingService.js
line: null
created: "2026-03-09T00:00:00"
execution_hint: sequential
context_group: supabase_wiring
group_reason: "Supabase wiring group — tasks 011-013 all wire existing features to Supabase persistence"
---

# Wire Email Marketing Routes to Supabase

**Priority:** P2 (medium)
**Source:** AGENT_TASKS.md Phase 2 Creator Toolkit — Email Marketing
**Location:** marketplace/backend/services/emailMarketingService.js, marketplace/backend/routes/

## Problem

`emailMarketingService.js` implements tracking pixels, click-wrap, broadcast sending, etc. — but subscriber data and email sequences may not be persisted to Supabase. The `subscribers` table is required in Supabase (see HT-009). Without Supabase wiring, email marketing data is lost on server restart or unavailable in production.

## How to Fix

1. **Audit**: Read `emailMarketingService.js` to find which operations currently use SQLite directly vs. the DB adapter
2. **Schema**: Verify `subscribers` table in `schema.sql`:
   ```sql
   CREATE TABLE subscribers (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     email TEXT UNIQUE NOT NULL,
     store_id INTEGER,
     source TEXT,           -- 'email_capture', 'checkout', 'funnel'
     tags TEXT,             -- JSON array
     subscribed INTEGER DEFAULT 1,
     created_at TEXT DEFAULT CURRENT_TIMESTAMP
   );
   ```
3. **Email sequences table** (if not exists):
   ```sql
   CREATE TABLE email_sequences (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     user_id TEXT,
     name TEXT,
     steps_json TEXT,       -- [{delay_hours, subject, body}]
     created_at TEXT DEFAULT CURRENT_TIMESTAMP
   );
   ```
4. **Update** all DB calls in emailMarketingService.js to use the shared DB adapter (not direct sqlite3)
5. **Email sequence builder API**: Add/verify routes for creating and managing email sequences
6. **Broadcast sending**: Ensure broadcast reads subscribers from DB (not in-memory)
7. **Analytics**: Ensure open/click events write to DB (not just log files)

## Acceptance Criteria

- [ ] `subscribers` table in schema
- [ ] All emailMarketingService.js DB operations go through the shared adapter
- [ ] Subscribers persist to Supabase in production
- [ ] Email sequence CRUD API exists
- [ ] Open/click tracking writes to DB

## Notes

_Generated from AGENT_TASKS.md Phase 2 Creator Toolkit. `subscribers` is in the Supabase migration table list (HT-009)._
