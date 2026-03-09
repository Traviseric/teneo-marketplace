---
id: 7
title: "Email list import (CSV)"
priority: P2
severity: medium
status: completed
source: project_declared
file: marketplace/backend/routes/adminRoutes.js
line: null
created: "2026-03-09T00:00:00Z"
execution_hint: parallel
context_group: creator_migration
group_reason: "Migration tool alongside task 006 (Gumroad product import)"
---

# Email List CSV Import

**Priority:** P2 (medium)
**Source:** project_declared (AGENT_TASKS.md Phase 4 Network & Scale)
**Location:** marketplace/backend/routes/adminRoutes.js + importService.js

## Problem

Creators migrating from other platforms (Mailchimp, ConvertKit, Gumroad, Substack) have existing email lists. There is no way to import them into OpenBazaar.ai's subscriber system. This blocks creators from switching platforms — they risk losing their list.

## How to Fix

1. **Add `importEmailListCsv(csvContent, brandId, listId?)` to `importService.js`** (create if not exists from task 006, otherwise extend):
   - Parses CSV with columns: email, first_name (optional), last_name (optional), tags (optional)
   - Also handles common export formats from Mailchimp (email, first_name, last_name, status)
   - Skips unsubscribed/bounced contacts (check `status` column for "unsubscribed")
   - Returns `{imported: N, skipped: N, duplicates: N}`

2. **Add admin import endpoint:**
   - `POST /admin/import/email-list` — accepts multipart/form-data with CSV
   - Optional `?list_name=My+Imported+List` query param
   - Inserts valid emails into `subscribers` table (Supabase or SQLite)
   - Uses `INSERT OR IGNORE` to handle duplicates
   - Returns import stats

3. **Add import UI in admin.html:**
   - "Import Email List" section with:
     - CSV file upload (accepts .csv, .txt)
     - Instructions: "Export from Mailchimp: Audience → Export → All Contacts as CSV"
     - Column mapping hint: "Expected columns: email, first_name, last_name (optional)"
     - "Import Subscribers" button
     - Results: "Imported N / Skipped N duplicates"

4. **Validation:**
   - Validate email format before inserting
   - Rate-limit imports to prevent abuse
   - Log import event to admin activity log

5. **Duplicate handling:**
   - Check existing subscribers table for the email before insert
   - Return count of skipped duplicates to UI

## Acceptance Criteria

- [ ] importService.js has importEmailListCsv() method
- [ ] POST /admin/import/email-list endpoint works
- [ ] Admin UI has email list import section
- [ ] Imports go into subscribers table
- [ ] Duplicates are skipped, not errored
- [ ] Invalid emails are rejected with per-row error logging
- [ ] No regressions in existing subscriber/email marketing routes

## Notes

_Generated from project_declared AGENT_TASKS.md Phase 4. importService.js may already exist from task 006 — extend it._
