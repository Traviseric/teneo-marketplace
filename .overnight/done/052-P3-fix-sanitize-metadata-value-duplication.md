---
id: 52
title: "Fix sanitizeMetadataValue duplication — move to shared utils (checkout.js + checkoutProduction.js)"
priority: P3
severity: medium
status: completed
source: code_quality_audit
file: marketplace/backend/routes/checkout.js
line: 33
created: "2026-03-06T00:00:00Z"
execution_hint: parallel
context_group: security_quality
group_reason: "Code quality refactor — independent of UX and feature groups"
---

# Fix sanitizeMetadataValue duplication

**Priority:** P3 (medium)
**Source:** code_quality_audit
**Location:** marketplace/backend/routes/checkout.js:33, checkoutProduction.js:17

## Problem

`sanitizeMetadataValue()` is defined identically in both `checkout.js:33` and `checkoutProduction.js:17`. This copy-paste duplication means any future fix or change to sanitization logic must be made in two places.

**Code with issue:**
```js
// checkout.js:33 AND checkoutProduction.js:17 — identical function:
function sanitizeMetadataValue(value) {
  if (typeof value !== 'string') return String(value || '');
  return value.replace(/[<>"'`]/g, '').substring(0, 500);
}
```

## How to Fix

1. Read `marketplace/backend/utils/validate.js` (or create it if it doesn't exist) to understand existing utilities.

2. Move the function to a shared location:
   ```js
   // marketplace/backend/utils/sanitize.js (new file, or add to existing utils)
   function sanitizeMetadataValue(value) {
     if (typeof value !== 'string') return String(value || '');
     return value.replace(/[<>"'`]/g, '').substring(0, 500);
   }
   module.exports = { sanitizeMetadataValue };
   ```

3. Update `checkout.js` and `checkoutProduction.js` to import it:
   ```js
   const { sanitizeMetadataValue } = require('../utils/sanitize');
   ```

4. Remove the local function definitions from both checkout files.

5. Run `npm test` to ensure no regressions.

## Acceptance Criteria

- [ ] `sanitizeMetadataValue` exists in only one place (shared utils)
- [ ] Both checkout.js and checkoutProduction.js import it from the shared module
- [ ] Function behavior is identical to original (no logic changes)
- [ ] Test suite passes after refactor

## Notes

_Generated from code_quality_audit finding: "sanitizeMetadataValue() is defined identically in checkout.js:33 and checkoutProduction.js:17. Copy-paste duplication of utility logic."_
