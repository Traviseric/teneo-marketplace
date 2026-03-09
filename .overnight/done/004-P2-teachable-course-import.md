---
id: 4
title: "Implement Teachable course import"
priority: P2
severity: low
status: completed
source: project_declared
file: marketplace/backend/routes/
created: "2026-03-09T22:00:00Z"
execution_hint: parallel
context_group: import_tools
group_reason: "Standalone importer — independent of other feature work, similar to Gumroad import already done"
---

# Implement Teachable course import

**Priority:** P2 (low)
**Source:** project_declared (docs/ROADMAP.md Phase 4)
**Location:** marketplace/backend/routes/, marketplace/backend/services/

## Problem

Creators migrating from Teachable have no way to bring their course content into OpenBazaar.ai. The Gumroad product import (CSV) and email list import are already done. Teachable is the other major course platform creators migrate from.

Teachable offers a course export as JSON (school data export from Settings → Export). This file contains course structure, sections, lectures, and enrollment data.

## How to Fix

1. **Parse Teachable Export:** Create `services/teachableImportService.js` that parses Teachable school export JSON:
   - Map Teachable `courses[]` → OpenBazaar `courses` table rows
   - Map `sections[]` → course modules
   - Map `lectures[]` → course lessons
   - Map `students[]` → `subscribers` table (email + enrollment)

2. **API Route:** `POST /api/admin/import/teachable` (multipart form, JSON file upload):
   - Validate file format
   - Call `teachableImportService.parse(json)`
   - Insert courses, modules, lessons into DB
   - Return import summary `{courses: N, lessons: M, students: K}`

3. **Admin UI:** Add "Import from Teachable" card to admin panel (alongside existing Gumroad import card). Accept `.json` file upload.

4. **Enrollment Mapping:** For imported students, mark them as enrolled in the corresponding course in the `subscribers` table with `source: 'teachable_import'`.

**Reference:** See existing Gumroad importer at `marketplace/backend/routes/importRoutes.js` for pattern to follow.

## Acceptance Criteria

- [ ] `teachableImportService.js` parses Teachable school export JSON
- [ ] `POST /api/admin/import/teachable` route accepts JSON upload
- [ ] Courses, modules, and lessons are correctly inserted into DB
- [ ] Students mapped to `subscribers` table
- [ ] Admin UI shows Teachable import option
- [ ] Import summary returned with counts
- [ ] Jest unit tests for parser with sample Teachable export fixture

## Notes

_Generated from docs/ROADMAP.md Phase 4: "Teachable course import"._
_Reference: existing Gumroad import (f50d40c) for route and service pattern._
