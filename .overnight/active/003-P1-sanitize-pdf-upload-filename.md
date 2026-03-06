---
id: 3
title: "Sanitize bookId used as PDF upload filename in multer"
priority: P1
severity: high
status: completed
source: security_audit
file: marketplace/backend/routes/downloadRoutes.js
line: 26
created: "2026-03-06T00:00:00Z"
execution_hint: parallel
context_group: auth_hardening
group_reason: "Auth hardening and input sanitization; independent file fix"
---

# Sanitize PDF Upload Filename (Path Traversal via bookId)

**Priority:** P1 (high)
**Source:** security_audit
**Location:** marketplace/backend/routes/downloadRoutes.js:26

## Problem

The multer storage configuration uses the client-supplied `bookId` directly as the filename for PDF uploads in the `/api/download/upload` admin endpoint. While admin auth is required, a compromised admin account could supply `bookId` values like `../../../server` to write files outside the `books` directory.

**Code with issue:**
```javascript
const bookId = req.body.bookId || 'unknown';
cb(null, `${bookId}.pdf`);
```

## How to Fix

Sanitize `bookId` with `path.basename()` and a character allowlist before using it as a filename:

```javascript
const rawId = req.body.bookId || 'unknown';
const safeId = path.basename(rawId).replace(/[^a-zA-Z0-9_-]/g, '_');
cb(null, `${safeId}.pdf`);
```

This strips directory traversal sequences and limits the filename to safe characters. Apply the same sanitization wherever `bookId` is used to construct file paths (e.g., the `/:bookId` DELETE route at line 259).

## Acceptance Criteria

- [ ] `bookId` sanitized with `path.basename()` + character allowlist in multer storage config
- [ ] Same sanitization applied to DELETE route file path construction
- [ ] Path traversal inputs like `../../../etc/passwd` are safely converted to `_.._.._etc_passwd`
- [ ] Normal `bookId` values (e.g., `my-book-123`) still work correctly

## Notes

_Generated from security_audit findings. CWE-22._
