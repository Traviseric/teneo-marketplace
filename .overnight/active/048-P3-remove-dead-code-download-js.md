---
id: 48
title: "Remove dead code download.js (in-memory tokens, replaced by downloadRoutes.js)"
priority: P3
severity: low
status: pending
source: code_quality_audit
file: marketplace/backend/routes/download.js
line: 1
created: "2026-02-28T08:00:00"
execution_hint: parallel
context_group: independent
group_reason: "File deletion, independent of all other tasks"
---

# Remove dead code download.js (in-memory tokens, replaced by downloadRoutes.js)

**Priority:** P3 (low)
**Source:** code_quality_audit
**Location:** marketplace/backend/routes/download.js

## Problem

Two download route files exist in `marketplace/backend/routes/`:
- `download.js` — uses an in-memory `Map` for download tokens (comment says "In production, use database")
- `downloadRoutes.js` — uses the SQLite database, the production implementation

`server.js` only requires `downloadRoutes.js` (confirmed: grep of server.js shows `downloadRoutes`, not `download`). `download.js` is dead code that is never loaded.

Having both files causes confusion about which is authoritative. A future developer might edit `download.js` thinking they're modifying production behavior, when only `downloadRoutes.js` is actually used.

**Code with issue (download.js):**
```javascript
// download.js line 7-8 — never loaded in production:
// In-memory store for download tokens (in production, use database)
const downloadTokens = new Map();
```

## How to Fix

1. **Confirm** `download.js` is not imported anywhere:
```bash
grep -r "require.*routes/download'" marketplace/backend/
# Should only find downloadRoutes, not download
```

2. **Delete** `marketplace/backend/routes/download.js`

3. **Verify** server still starts and downloads work:
```bash
npm start
# Test a download URL
```

No code changes are needed — just deletion of the unused file.

## Acceptance Criteria

- [ ] Confirmed `download.js` has no active `require()` references in the codebase
- [ ] `download.js` is deleted
- [ ] `downloadRoutes.js` remains intact and functional
- [ ] Server starts without errors
- [ ] npm test passes

## Notes

_Generated from code_quality_audit findings. Housekeeping task — removes a confusing dead-code file. The in-memory Map was an early prototype that was superseded by the DB-backed implementation in downloadRoutes.js (which was hardened in tasks 024 and 028)._
