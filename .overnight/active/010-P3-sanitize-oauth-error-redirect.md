---
id: 10
title: "Sanitize OAuth error message in login redirect URL"
priority: P3
severity: low
status: completed
source: security_audit
file: marketplace/backend/routes/auth.js
line: 213
created: "2026-03-06T00:00:00Z"
execution_hint: parallel
context_group: auth_hardening
group_reason: "Auth hardening; quick fix same area as task 002"
---

# Sanitize OAuth Error Message in Login Redirect URL

**Priority:** P3 (low)
**Source:** security_audit
**Location:** marketplace/backend/routes/auth.js:213

## Problem

OAuth callback errors redirect to `/login` with the raw `error.message` encoded in the URL query parameter. This could expose internal error details (auth server URLs, token exchange errors, internal service names) to the user's browser history, analytics logging, and any browser plugins.

**Code with issue:**
```javascript
res.redirect('/login?error=auth_failed&message=' + encodeURIComponent(error.message));
```

## How to Fix

Use only a generic error code in the redirect, and log the detailed message server-side:

```javascript
// Log detailed error server-side
console.error('[OAuth callback error]', error.message);

// Redirect with generic code only
res.redirect('/login?error=auth_failed');
```

The login page should map `?error=auth_failed` to a user-friendly message like "Sign-in failed. Please try again." without exposing technical details.

## Acceptance Criteria

- [ ] `error.message` removed from redirect URL
- [ ] Detailed error logged server-side with `console.error` or logger
- [ ] Generic `?error=auth_failed` still triggers appropriate user-visible message on login page
- [ ] No internal service details exposed in browser URL bar

## Notes

_Generated from security_audit findings. CWE-209._
