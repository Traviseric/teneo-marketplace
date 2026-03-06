---
id: 8
title: "Sanitize book title in Content-Disposition download header"
priority: P3
severity: low
status: completed
source: security_audit
file: marketplace/backend/routes/downloadRoutes.js
line: 154
created: "2026-03-06T00:00:00Z"
execution_hint: sequential
context_group: download_hardening
group_reason: "Same file as task 003 (downloadRoutes.js hardening)"
---

# Sanitize Book Title in Content-Disposition Download Header

**Priority:** P3 (low)
**Source:** security_audit
**Location:** marketplace/backend/routes/downloadRoutes.js:154

## Problem

The book title from the database is embedded directly in the `Content-Disposition` header without sanitization. A book title containing special characters (quotes, semicolons, newlines) could potentially manipulate the header value or cause issues with download clients.

**Code with issue:**
```javascript
res.setHeader('Content-Disposition', `attachment; filename="${order.book_title}.pdf"`);
```

## How to Fix

Use RFC 5987 encoding for the filename, which handles all Unicode characters safely:

```javascript
const safeFilename = encodeURIComponent(order.book_title || 'download').replace(/['()]/g, escape);
res.setHeader(
  'Content-Disposition',
  `attachment; filename="${order.book_title.replace(/[^a-zA-Z0-9 _-]/g, '_')}.pdf"; filename*=UTF-8''${safeFilename}.pdf`
);
```

Or the simpler approach of stripping problematic characters:
```javascript
const safeTitle = (order.book_title || 'download').replace(/["\\;\r\n]/g, '_');
res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.pdf"`);
```

## Acceptance Criteria

- [ ] Special characters in book titles cannot break the Content-Disposition header
- [ ] Normal book titles (with spaces, apostrophes) still produce clean filenames
- [ ] Downloaded file has a meaningful name (not generic)

## Notes

_Generated from security_audit findings. CWE-116. Should be done in same session as task 003 (same file)._
