---
id: 9
title: "Extract magic numbers to named constants in zapService.js"
priority: P3
severity: low
status: completed
source: code_quality_audit
file: marketplace/backend/services/zapService.js
line: 248
created: "2026-03-09T23:45:00Z"
execution_hint: sequential
context_group: zap_service
group_reason: "Same file as task 003 (zapService.js)"
---

# Extract magic numbers to named constants in zapService.js

**Priority:** P3 (low)
**Source:** code_quality_audit
**Location:** marketplace/backend/services/zapService.js:248

## Problem

`zapService.js` line 248 uses a hardcoded magic number for the lookback window:

```javascript
Math.floor(Date.now() / 1000) - 300 // 5-minute lookback hardcoded
```

This makes it hard to tune or understand the polling behavior without reading the code in detail.

## How to Fix

Extract to a named constant at the top of the file:

```javascript
// At top of zapService.js
const ZAP_POLL_LOOKBACK_SECONDS = 300; // 5-minute lookback for zap receipts

// In usage:
const since = Math.floor(Date.now() / 1000) - ZAP_POLL_LOOKBACK_SECONDS;
```

Also check for any other inline numeric literals in zapService.js that would benefit from naming (timeouts, retry counts, etc.).

## Acceptance Criteria

- [ ] `300` (lookback seconds) extracted to named constant `ZAP_POLL_LOOKBACK_SECONDS`
- [ ] Other numeric literals in zapService.js evaluated and extracted if they're configuration values
- [ ] zapService tests still pass
- [ ] No behavior changes

## Notes

_Generated from code_quality_audit findings. Quick win — can be done in minutes alongside task 003._
