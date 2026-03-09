---
id: 8
title: "Fix appStore.test.js 9 failing tests (500 errors)"
priority: P2
severity: medium
status: completed
source: review_audit
file: __tests__/appStore.test.js
line: null
created: "2026-03-06T04:00:00Z"
execution_hint: parallel
context_group: independent
group_reason: "Test-only fix, no overlap with other tasks"
---

# Fix appStore.test.js 9 failing tests (500 errors)

**Priority:** P2 (medium)
**Source:** review_audit (pre-existing issue flagged)
**Location:** `__tests__/appStore.test.js`

## Problem

9 tests in `__tests__/appStore.test.js` expect HTTP 200 status codes but receive 500 (Internal Server Error). This is a pre-existing issue since commit c315924 — not caused by recent worker changes. The test suite runs with 149/158 passing; these 9 failures keep the test suite in a "red" state.

Likely causes:
- Missing seed data or missing mock for the app store database (appStore routes read from SQLite, test environment may not have the table initialized)
- Missing environment variable causing a crash handler to fire
- Route handler throwing on missing/null fields when test database is empty

## How to Fix

1. Run the failing tests in isolation to read the actual error output: `npx jest __tests__/appStore.test.js --verbose`
2. Check if the error is a missing table — if so, ensure `schema-appstore.sql` (or equivalent) is run in the test setup
3. If no schema file exists for app store, check `marketplace/backend/database/init.js` to see if app store tables are initialized there
4. Add proper mocks or test fixtures so the route handlers return real data without crashing
5. Alternatively, if the app store route has a bug causing 500s (e.g., undefined reference), fix the underlying route bug in `marketplace/backend/routes/appStore.js`

## Acceptance Criteria

- [ ] All 9 previously-failing appStore tests now pass
- [ ] Total test count remains 158 (no tests removed)
- [ ] No other tests broken by the fix
- [ ] Root cause documented in a comment if it was a schema/seed issue

## Notes

_Flagged by review_audit as pre-existing. review_audit_output.json: "likely a missing mock or seed data issue". This keeps the test suite green and prevents the issue from masking future failures._
