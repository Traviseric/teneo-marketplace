---
id: 1
title: "Fix error.message leak in magic link verify redirect"
priority: P2
severity: medium
status: completed
source: review_audit
file: marketplace/backend/routes/auth.js
line: 243
created: "2026-03-06T00:00:00Z"
execution_hint: parallel
context_group: auth_hardening
group_reason: "Auth module fix; same file as prior OAuth callback fix (line 213)"
---

# Fix error.message leak in magic link verify redirect

**Priority:** P2 (medium)
**Source:** review_audit (new_tasks)
**Location:** marketplace/backend/routes/auth.js:243

## Problem

Worker 003 fixed the OAuth callback redirect at auth.js:213 to use a generic error code (removing `error.message` from the redirect URL, CWE-209). However, the adjacent magic link verify path at line 243 still leaks `error.message` in the redirect URL:

**Code with issue:**
```javascript
res.redirect('/login?error=invalid_link&message=' + encodeURIComponent(error.message));
```

This exposes internal error details (token lookup failures, DB errors, expiry messages) in the browser URL bar, browser history, and any analytics/logging middleware that captures query parameters. The pattern is identical to CWE-209 that was already fixed at line 213.

## How to Fix

Replace `error.message` in the redirect with a generic string and log the detailed error server-side only — matching the fix already applied to the OAuth callback at line 213:

```javascript
// Log detailed error server-side only
console.error('[Auth] Magic link verification error:', error);

// Redirect with generic code only — no internal details in URL
res.redirect('/login?error=invalid_link');
```

The login page should map `?error=invalid_link` to a user-friendly message like "This link is invalid or has expired. Please request a new one." without exposing technical details.

## Acceptance Criteria

- [ ] `error.message` removed from the magic link verify redirect URL at auth.js:243
- [ ] Detailed error still logged server-side via `console.error`
- [ ] Generic `?error=invalid_link` still triggers appropriate user-visible message on login page
- [ ] Fix is consistent with the OAuth callback fix at line 213 in the same file
- [ ] No regressions in magic link auth flow

## Notes

_Generated from review_audit new_tasks finding. CWE-209. This is the remaining half of the fix that Worker 003 partially completed in commit 9ce08d3._
