---
id: 55
title: "Upgrade download rate limiting from in-memory Map to DB-backed persistent store"
priority: P3
severity: medium
status: completed
source: security_audit
file: marketplace/backend/routes/downloadRoutes.js
line: 17
created: "2026-03-06T00:00:00Z"
execution_hint: parallel
context_group: security_quality
group_reason: "Security improvement — independent of UX and feature groups"
---

# Upgrade download rate limiting from in-memory Map to DB-backed persistent store

**Priority:** P3 (medium)
**Source:** security_audit
**Location:** marketplace/backend/routes/downloadRoutes.js:17

## Problem

Download rate limiting uses an in-memory `Map` (`downloadAttempts`) that resets on every server restart. In production with process managers that restart on crash (PM2, Docker), or with rolling deployments, this rate limit is trivially bypassed by triggering a restart.

**Code with issue:**
```js
const downloadAttempts = new Map();  // line 17 — resets on restart
```

The current limit is 5 downloads per order (tracked in DB by `download_count`), but the in-memory Map is used for additional short-window rate limiting. This should persist across restarts.

## How to Fix

**Option A (preferred — use existing database):**

Add a `download_rate_limits` table or use the existing `orders` table with a `last_download_at` timestamp.

The simpler approach is to track attempts in the `orders` table itself using an existing or new column, and check download_count there:

1. The existing `download_count` field in the `orders` table (or `downloads` table) already tracks cumulative downloads — use that as the persistent rate limit check.

2. Remove the in-memory `downloadAttempts` Map.

3. If a per-IP / per-time-window limit is needed beyond the per-order limit, add a `download_events` table:
   ```sql
   CREATE TABLE IF NOT EXISTS download_events (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     order_id TEXT NOT NULL,
     ip_address TEXT,
     attempted_at TEXT DEFAULT (datetime('now'))
   );
   ```
   Then query: `SELECT COUNT(*) FROM download_events WHERE order_id=? AND attempted_at > datetime('now', '-1 hour')`.

4. Alternatively, if the in-memory Map is purely supplemental and the per-order `download_count` limit is the real gate, consider removing the Map entirely and relying solely on the DB-backed per-order count.

**Option B:** Integrate a lightweight rate-limit middleware that uses the DB (express-rate-limit with a custom store backed by SQLite).

Read `downloadRoutes.js` first to understand the exact usage before implementing.

## Acceptance Criteria

- [ ] In-memory `downloadAttempts` Map removed or replaced
- [ ] Download rate limiting state persists across server restarts
- [ ] Per-order download limit still enforced (download_count check)
- [ ] Performance acceptable (no N+1 DB queries per download attempt)
- [ ] Existing download tests still pass

## Notes

_Generated from security_audit finding: "downloadRoutes.js:17 — In-memory rate limiting resets on every server restart. Trivially bypassed with process restarts. CWE-770."_
