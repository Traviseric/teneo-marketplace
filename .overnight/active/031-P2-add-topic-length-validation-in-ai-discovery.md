---
id: 31
title: "Add topic length validation in aiDiscovery.js reading paths query"
priority: P2
severity: medium
status: completed
source: security_audit
file: marketplace/backend/routes/aiDiscovery.js
line: 140
created: "2026-02-28T06:00:00"
execution_hint: parallel
context_group: independent
group_reason: "One-line validation in aiDiscovery.js, independent of other tasks"
cwe: CWE-89
---

# Add topic length validation in aiDiscovery.js reading paths query

**Priority:** P2 (medium — DoS prevention)
**Source:** security_audit
**Location:** marketplace/backend/routes/aiDiscovery.js:140

## Problem

The reading paths query uses parameterized queries correctly (no SQL injection risk), but accepts an unrestricted `topic` parameter for a `LIKE '%<topic>%'` query. An attacker can send a very long `topic` string (e.g., 10,000 characters) causing SQLite to perform an extremely slow `LIKE` scan across the entire `reading_paths` table — a denial of service via query performance.

**Code with issue:**
```javascript
// aiDiscovery.js line 140
let query = 'SELECT * FROM reading_paths WHERE 1=1';
...
if (topic) {
    query += ' AND topic LIKE ?';
    params.push(`%${topic}%`);
}
```

Note: The parameterized `?` placeholder means this is NOT vulnerable to SQL injection — the concern is purely a DoS via slow LIKE queries on very long strings.

## How to Fix

Add length validation on the `topic` parameter before using it in the query:

```javascript
if (topic) {
    // Validate topic length to prevent LIKE query DoS
    if (topic.length > 100) {
        return res.status(400).json({
            success: false,
            error: 'Topic search term too long (max 100 characters)'
        });
    }
    query += ' AND topic LIKE ?';
    params.push(`%${topic}%`);
}
```

Optionally, also add a database index on the `topic` column in the reading_paths table to make LIKE queries faster for legitimate use:

```sql
-- In schema or a migration:
CREATE INDEX IF NOT EXISTS idx_reading_paths_topic ON reading_paths(topic);
```

## Acceptance Criteria

- [ ] `topic` parameter validated to max 100 characters
- [ ] Requests with `topic` > 100 chars return HTTP 400 with error message
- [ ] Normal topic searches (under 100 chars) still work correctly
- [ ] Consider adding topic column index to schema if not already indexed

## Notes

_Generated from security_audit findings. CWE-89 categorization here is specifically for the DoS aspect of LIKE queries (the audit noted the parameterized queries are correct). The fix is a one-liner validation check before the query._
