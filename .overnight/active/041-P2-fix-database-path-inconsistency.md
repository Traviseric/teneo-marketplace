---
id: 41
title: "Fix inconsistent database path defaults across modules (orders.db vs marketplace.db)"
priority: P2
severity: medium
status: completed
source: code_quality_audit
file: marketplace/backend/services/orderService.js
line: 7
created: "2026-02-28T08:00:00"
execution_hint: sequential
context_group: database_layer
group_reason: "Same database layer as task 037 (orderService SQL injection fix)"
---

# Fix inconsistent database path defaults across modules (orders.db vs marketplace.db)

**Priority:** P2 (medium)
**Source:** code_quality_audit
**Location:** Multiple files — orderService.js:7, database-service.js:6, setup.js:6, database.js:5

## Problem

Four modules use different default SQLite database filenames. This means code using `orderService.js` writes to `orders.db` while code using `database-service.js` reads from `marketplace.db` — two separate databases. Data written by one module is invisible to the other unless `DATABASE_PATH` env var is explicitly set.

**Inconsistent defaults:**
```javascript
// orderService.js line 7:
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../database/orders.db');

// luluService.js line 14:
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../database/orders.db');

// database/database.js line 5:
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'orders.db');

// database/init.js line 5:
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'orders.db');

// database-service.js line 6:  ← Different!
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../database/marketplace.db');

// database/setup.js line 6:  ← Different!
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'marketplace.db');
```

Any developer or deployment that doesn't set `DATABASE_PATH` will have split data across two files. This is a data integrity bug.

## How to Fix

Standardize on `marketplace.db` as the single default (it appears to be the more recent convention):

```javascript
// Update ALL of these files to use marketplace.db:

// orderService.js line 7:
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../database/marketplace.db');

// luluService.js line 14 (if it also uses orders.db):
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../database/marketplace.db');

// database/database.js line 5:
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'marketplace.db');

// database/init.js line 5:
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'marketplace.db');
```

Files already using `marketplace.db` (`database-service.js`, `database/setup.js`) need no changes.

Also update `database/db.js` alias file if it exists and points to a specific file.

After the change, check `.env.example` to confirm `DATABASE_PATH=./marketplace/backend/database/marketplace.db` (or similar) is the documented default.

## Acceptance Criteria

- [ ] All modules that default to `orders.db` are updated to use `marketplace.db`
- [ ] All `dbPath` defaults across orderService.js, luluService.js, database.js, init.js, database-service.js, setup.js now point to the same file
- [ ] `.env.example` `DATABASE_PATH` value matches the new default
- [ ] `npm test` passes after changes (Jest tests use a test DB via env var, so no test DB should be affected)
- [ ] Server starts and orders can be created/retrieved correctly

## Notes

_Generated from code_quality_audit findings. This is a latent data-split bug: without DATABASE_PATH set, two modules silently use different databases. Any developer who runs `npm start` without a .env file will experience this. Fix before production deployment to avoid split data in the wild._
