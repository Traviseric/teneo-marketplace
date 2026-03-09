---
id: 3
title: "Add DB adapter parity test script for checkout and auth paths"
priority: P0
severity: critical
status: completed
source: AGENT_TASKS.md
file: marketplace/backend/scripts/
line: null
created: "2026-03-06T00:00:00Z"
execution_hint: sequential
context_group: database_layer
group_reason: "Validates the db adapter work in tasks 1 and 2"
---

# Add DB adapter parity test script for checkout and auth paths

**Priority:** P0 (critical)
**Source:** AGENT_TASKS.md (Phase 0 — Make It Work)

## Problem

The Supabase/Postgres adapter was wired in commit 7edc961, but there is no test proving it works end-to-end for the two most critical paths: checkout (order creation) and auth (user lookup/creation). Without this, we can't confidently deploy to production.

## How to Fix

Create `marketplace/backend/scripts/test-adapter-parity.js`:

```js
// Run: node test-adapter-parity.js
// Tests DB adapter works for critical checkout + auth paths in both SQLite and Postgres modes
const db = require('../database/database');

async function runTests() {
  let passed = 0;
  let failed = 0;

  // Test 1: Can insert + read an order
  // Test 2: Can insert + read a user/profile
  // Test 3: Can run the orders query that checkout uses
  // Test 4: Can run the profiles/users query that auth uses
  // Print PASS/FAIL for each
  // Exit 1 if any failures
}
runTests().catch(err => { console.error(err); process.exit(1); });
```

The script should:
1. Use the shared adapter (not direct sqlite3)
2. Create a test order record, read it back, verify fields, clean up
3. Create a test user/profile record, read it back, verify fields, clean up
4. Print `[PASS]` / `[FAIL]` for each test with details
5. Exit with code 1 if any test fails (for CI use)
6. Work in both SQLite mode (no DATABASE_URL) and Postgres mode (DATABASE_URL set)

Also add an npm script in `marketplace/backend/package.json`: `"test:adapter": "node scripts/test-adapter-parity.js"`

## Acceptance Criteria

- [ ] `node scripts/test-adapter-parity.js` runs without errors in SQLite mode
- [ ] All tests print `[PASS]`
- [ ] Script cleans up test data after itself
- [ ] npm script `test:adapter` is added to package.json
- [ ] Script is documented in a comment at the top explaining how to run it against Supabase

## Notes

_Generated from AGENT_TASKS.md P0 item: "Add parity test/script proving adapter can read/write critical checkout and auth paths"._
