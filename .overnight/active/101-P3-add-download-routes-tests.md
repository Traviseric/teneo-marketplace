---
id: 101
title: "Add downloadRoutes.js tests to replace deleted download.test.js"
priority: P3
severity: low
status: completed
source: review_audit
file: marketplace/backend/routes/downloadRoutes.js
line: 1
created: "2026-02-28T10:00:00Z"
execution_hint: sequential
context_group: test_fixes
group_reason: "Same test infrastructure as task 099 — both in __tests__/ directory"
---

# Add downloadRoutes.js tests to replace deleted download.test.js

**Priority:** P3 (low)
**Source:** review_audit (PARTIAL verdict on task 043 + task 048 deletion)
**Location:** `marketplace/backend/routes/downloadRoutes.js`

## Problem

Task 043 originally created `__tests__/download.test.js` with 10 tests covering download token lifecycle. Task 048 then deleted `download.js` (dead code) and the test file was also removed, leaving `downloadRoutes.js` — the active, DB-backed download implementation — completely without test coverage.

`downloadRoutes.js` handles:
- `GET /:token` — validate token, enforce expiry, stream file
- `POST /generate-token` — create signed download token (admin)
- `POST /upload` — upload book PDF (admin + multer)
- L402/ArxMint payment verification integration

This is revenue-critical code (wrong token = no download, or worse, unauthorized download) with zero test coverage.

**Current test coverage for downloadRoutes.js:**
```
__tests__/webhook.test.js          — 5 tests (not download)
__tests__/orderService.test.js     — 9 tests (not download)
__tests__/cryptoCheckout.test.js   — 10 tests (not download)
__tests__/downloadRoutes.test.js   — DOES NOT EXIST ← gap
```

## How to Fix

Create `__tests__/downloadRoutes.test.js` with tests for the download token lifecycle:

```javascript
// Mock database
jest.mock('../marketplace/backend/database/database', () => ({
  get: jest.fn(),
  run: jest.fn(),
  all: jest.fn()
}));

// Mock file system (fs.promises)
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    stat: jest.fn(),
    readFile: jest.fn()
  }
}));

// Mock arxmintService
jest.mock('../marketplace/backend/services/arxmintService', () => ({
  verifyL402Payment: jest.fn()
}));

// Test cases to cover:
// 1. GET /:token — returns 400 when token is missing/empty
// 2. GET /:token — returns 404 when token not found in DB
// 3. GET /:token — returns 410 when token is expired
// 4. GET /:token — returns 410 when download_count >= max_downloads
// 5. GET /:token — returns 404 when book file not found on disk
// 6. GET /:token — streams file and increments download_count on success
// 7. POST /generate-token — returns 401 without admin auth
// 8. POST /generate-token — returns 400 when orderId is missing
// 9. POST /generate-token — returns 200 with token on valid request
// 10. POST /upload — returns 401 without admin auth
```

Use supertest + express for integration-style tests. Mock the `db` module to simulate token records without needing a real SQLite DB.

## Acceptance Criteria

- [ ] `__tests__/downloadRoutes.test.js` created with at minimum 8 tests
- [ ] Tests cover: token not found (404), token expired (410), max downloads exceeded (410), file not found (404), valid download (200)
- [ ] Tests cover admin endpoints: generate-token (requires auth), upload (requires auth)
- [ ] All new tests pass with `npx jest __tests__/downloadRoutes.test.js`
- [ ] No regressions in other test files

## Notes

_Generated from review_audit PARTIAL verdict on task 043 + confirmed deletion by task 048. downloadRoutes.js is the active download implementation with no test coverage. Revenue-critical path: wrong download logic = customer support burden._
