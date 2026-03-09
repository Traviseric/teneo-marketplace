---
id: 6
title: "Create shared databaseHelper.js to eliminate copy-pasted DB helper functions"
priority: P2
severity: high
status: completed
source: code_quality_audit
file: marketplace/backend/services/databaseHelper.js
line: 1
created: "2026-03-09T23:45:00Z"
execution_hint: long_running
context_group: database_layer
group_reason: "Touches multiple files across codebase — needs own worker context"
---

# Create shared databaseHelper.js to eliminate copy-pasted DB helper functions

**Priority:** P2 (high)
**Source:** code_quality_audit
**Location:** marketplace/backend/routes/cryptoCheckout.js:80, courseRoutes.js:35, adminRoutes.js

## Problem

`dbGet`, `dbAll`, and `dbRun` promisified wrappers around the SQLite database are copy-pasted identically in at least 3 files:
- `cryptoCheckout.js` (lines 80-94): defines `dbRun` and `dbGet`
- `courseRoutes.js` (lines 35-58): defines `dbRun`, `dbGet`, `dbAll`
- `adminRoutes.js`: defines same helpers

This is a maintenance hazard — if the database layer changes (e.g., switching to Postgres), all copies must be updated independently. Bugs fixed in one copy don't propagate to others.

**Code with issue (cryptoCheckout.js lines 80-94):**
```javascript
function dbRun(sql, params) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err); else resolve(this);
        });
    });
}
function dbGet(sql, params) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err); else resolve(row);
        });
    });
}
```

## How to Fix

1. Create `marketplace/backend/services/databaseHelper.js`:
```javascript
const db = require('../database/database');

function dbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err); else resolve(this);
        });
    });
}

function dbGet(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err); else resolve(row);
        });
    });
}

function dbAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err); else resolve(rows);
        });
    });
}

module.exports = { dbRun, dbGet, dbAll };
```

2. Replace local definitions in `cryptoCheckout.js`, `courseRoutes.js`, and `adminRoutes.js` with:
```javascript
const { dbRun, dbGet, dbAll } = require('../services/databaseHelper');
```

3. Remove the copy-pasted function definitions from each file.

## Acceptance Criteria

- [ ] `marketplace/backend/services/databaseHelper.js` created with `dbRun`, `dbGet`, `dbAll`
- [ ] `cryptoCheckout.js` local helpers removed, uses shared module
- [ ] `courseRoutes.js` local helpers removed, uses shared module
- [ ] `adminRoutes.js` local helpers removed, uses shared module
- [ ] All tests still pass
- [ ] No behavior changes — purely a refactoring

## Notes

_Generated from code_quality_audit findings. This is a pure refactoring — no behavior changes expected._
