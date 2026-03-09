---
id: 17
title: "Fix json_patch → json_set in orderService.failOrder (data corruption)"
priority: P1
severity: high
status: completed
source: code_quality_audit
file: marketplace/backend/services/orderService.js
line: 270
created: "2026-03-06T12:00:00Z"
execution_hint: parallel
context_group: order_service
group_reason: "Single-file fix in orderService.js"
---

# Fix json_patch → json_set in orderService.failOrder (data corruption)

**Priority:** P1 (high)
**Source:** code_quality_audit
**Location:** `marketplace/backend/services/orderService.js:270`

## Problem

`failOrder()` uses `json_patch(metadata, '$.failure_reason', ?)` — this is the wrong SQLite JSON function. `json_patch()` applies RFC 7396 merge patches (expects a full JSON object as its second argument, not a JSONPath expression like `'$.failure_reason'`). Using it with a path expression will silently corrupt or miswrite the metadata field. The correct function for setting a nested key by path is `json_set()`.

**Code with issue:**
```javascript
// orderService.js line ~270
metadata = json_patch(metadata, '$.failure_reason', ?),
```

This SQL query is semantically wrong. When this runs, it will either fail silently or write unexpected data to the `metadata` column.

## How to Fix

Replace `json_patch` with `json_set` and ensure the metadata column is initialized if NULL:

```javascript
// Fixed: use json_set to correctly set a nested key by JSONPath
metadata = json_set(COALESCE(metadata, '{}'), '$.failure_reason', ?),
```

Full context of the UPDATE statement fix:
```sql
UPDATE orders
SET
  status = 'failed',
  payment_status = 'failed',
  metadata = json_set(COALESCE(metadata, '{}'), '$.failure_reason', ?),
  updated_at = CURRENT_TIMESTAMP
WHERE order_id = ?
```

The parameters stay the same — just replace `json_patch` with `json_set` and wrap `metadata` in `COALESCE(metadata, '{}')` to handle NULL metadata gracefully.

## Acceptance Criteria

- [ ] `orderService.failOrder()` uses `json_set` instead of `json_patch`
- [ ] COALESCE guard added so NULL metadata doesn't break the update
- [ ] Calling `failOrder('ORD-123', 'payment timeout')` correctly sets `metadata.failure_reason = 'payment timeout'`
- [ ] Existing tests still pass; add a quick test verifying `failOrder` sets failure_reason correctly
- [ ] No other occurrences of `json_patch` used with JSONPath expressions (grep to confirm)

## Notes

_Generated from code_quality_audit finding. This is a silent data corruption bug — failed orders will not have their failure_reason recorded correctly. High priority because it affects order tracking and debugging._
