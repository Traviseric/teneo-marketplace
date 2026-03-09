---
id: 9
title: "Fix orderService.js direct sqlite3 import bypassing shared adapter"
priority: P3
severity: low
status: completed
source: review_audit
file: marketplace/backend/services/orderService.js
line: 42
created: "2026-03-06T04:00:00Z"
execution_hint: sequential
context_group: database_layer
group_reason: "Same database/adapter area as task 001"
---

# Fix orderService.js direct sqlite3 import bypassing shared adapter

**Priority:** P3 (low)
**Source:** review_audit (PARTIAL verdict on task 001)
**Location:** `marketplace/backend/services/orderService.js:42`

## Problem

`orderService.js` line 42 directly requires `sqlite3` when `DATABASE_PATH=':memory:'` (in-memory mode used for tests). This path bypasses the shared `database.js` adapter. While it is guarded by the `:memory:` path check and won't run in Supabase production mode, it technically violates the adapter contract established in task 001.

Risk: If someone accidentally sets `DATABASE_PATH=:memory:` in production (or a new test setup doesn't set `DATABASE_URL`), `orderService` would open a fresh in-memory SQLite database instead of using the adapter — silently diverging from the rest of the system.

**Code with issue:**
```js
// orderService.js line ~42
const sqlite3 = require('sqlite3').verbose();
// ... used when DATABASE_PATH === ':memory:'
```

## How to Fix

Option A (preferred): Replace the direct sqlite3 require with the shared adapter's in-memory mode. The adapter already supports `:memory:` paths — use it:
```js
const db = require('../database/database');
// No special sqlite3 import needed — adapter handles :memory: internally
```

Option B: Add an explicit guard preventing this code path from running when `DATABASE_URL` is set:
```js
if (process.env.DATABASE_URL) {
  throw new Error('orderService: in-memory SQLite path must not activate in Supabase mode');
}
```

## Acceptance Criteria

- [ ] `orderService.js` no longer directly imports `sqlite3` outside of `database.js`
- [ ] Tests that depend on the in-memory path still pass
- [ ] `grep -r "require('sqlite3')" marketplace/backend/services/` returns no results (excluding database.js)
- [ ] No regressions in existing test suite

## Notes

_review_audit verdict on task 001 was PARTIAL specifically because of this. Completing this makes task 001 fully VERIFIED._
