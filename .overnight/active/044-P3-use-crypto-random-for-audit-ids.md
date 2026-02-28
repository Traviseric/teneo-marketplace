---
id: 44
title: "Use crypto.randomUUID() instead of Math.random() for audit action IDs"
priority: P3
severity: low
status: completed
source: code_quality_audit
file: marketplace/backend/services/auditService.js
line: 52
created: "2026-02-28T08:00:00"
execution_hint: parallel
context_group: independent
group_reason: "Single-file change, independent of all other tasks"
---

# Use crypto.randomUUID() instead of Math.random() for audit action IDs

**Priority:** P3 (low)
**Source:** code_quality_audit
**Location:** marketplace/backend/services/auditService.js:52

## Problem

`generateActionId()` uses `Math.random()` to generate audit log IDs, which is not cryptographically secure. Audit log IDs should be unguessable to prevent enumeration or forgery.

**Code with issue:**
```javascript
// auditService.js line 52 (approximate)
function generateActionId() {
    return 'audit_' + Math.random().toString(36).substring(7);
}
```

`Math.random()` is a PRNG that can be predicted with enough samples and timing information. While this isn't an immediate exploit, audit log IDs should be unguessable to prevent:
- Enumeration attacks (guessing IDs to look up specific audit records)
- ID forgery in systems that authenticate by ID

## How to Fix

Replace with `crypto.randomUUID()` or `crypto.randomBytes()`:

```javascript
const crypto = require('crypto');

function generateActionId() {
    // Option 1: UUID (128 bits, standard format)
    return 'audit_' + crypto.randomUUID();

    // Option 2: Hex string (64 bits — matches existing format)
    // return 'audit_' + crypto.randomBytes(8).toString('hex');
}
```

`crypto.randomUUID()` is available in Node.js 14.17+ and is simpler. Node.js 18 (project requirement) fully supports it.

## Acceptance Criteria

- [ ] `generateActionId()` uses `crypto.randomUUID()` or `crypto.randomBytes()` instead of `Math.random()`
- [ ] `crypto` is imported at the top of auditService.js (may already be imported)
- [ ] Existing audit log functionality still works
- [ ] npm test passes after changes

## Notes

_Generated from code_quality_audit findings. Low priority — quick single-line fix. Recommended to bundle with other small P3 fixes in the same session._
