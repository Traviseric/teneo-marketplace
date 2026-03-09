---
id: 8
title: "Add input validation for format parameter in checkout.js"
priority: P2
severity: medium
status: completed
source: code_quality_audit
file: marketplace/backend/routes/checkout.js
line: 88
created: "2026-03-09T23:45:00Z"
execution_hint: sequential
context_group: checkout_module
group_reason: "Same file as tasks 001, 002, 005"
---

# Add input validation for format parameter in checkout.js

**Priority:** P2 (medium)
**Source:** code_quality_audit
**Location:** marketplace/backend/routes/checkout.js:88

## Problem

The `format` parameter received from user input is used in catalog lookups without validation against allowed formats. If a user sends `format: "../../etc/passwd"` or `format: "<script>alert(1)</script>"`, it could be used in downstream operations without sanitization.

**Code with issue (checkout.js ~line 88):**
```javascript
// format comes from req.body without validation
const usdAmount = lookupBookPrice(bookId, format || 'ebook', brandId);
```

The `format` field is passed directly from user input into `lookupBookPrice()` without first confirming it's one of the expected values (`pdf`, `epub`, `print`, `ebook`).

## How to Fix

Add an allowlist validation at the route handler entry:
```javascript
const ALLOWED_FORMATS = ['pdf', 'epub', 'print', 'ebook', 'digital', 'bundle'];

router.post('/create-session', async (req, res) => {
    const { bookId, format, email, brandId } = req.body;

    // Validate format against allowlist
    const safeFormat = ALLOWED_FORMATS.includes(format) ? format : 'ebook';

    // Use safeFormat instead of format in all subsequent calls
    const usdAmount = lookupBookPrice(bookId, safeFormat, brandId);
    // ...
});
```

Check all checkout route handlers that accept `format` from user input and add the same allowlist validation.

## Acceptance Criteria

- [ ] `format` parameter validated against `ALLOWED_FORMATS` allowlist before use
- [ ] Invalid format values default to `'ebook'` or return a clear error
- [ ] All checkout handlers that accept `format` have this validation
- [ ] Tests verify invalid format is rejected/defaulted appropriately
- [ ] No regressions in normal checkout flow

## Notes

_Generated from code_quality_audit findings._
