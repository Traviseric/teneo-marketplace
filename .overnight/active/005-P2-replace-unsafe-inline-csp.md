---
id: 5
title: "Replace unsafe-inline in Content Security Policy"
priority: P2
severity: medium
status: completed
source: security_audit
file: marketplace/backend/server.js
line: 111
created: "2026-03-06T00:00:00Z"
execution_hint: long_running
context_group: server_hardening
group_reason: "Requires auditing inline scripts/styles across all frontend HTML files"
---

# Replace unsafe-inline in Content Security Policy

**Priority:** P2 (medium)
**Source:** security_audit
**Location:** marketplace/backend/server.js:111

## Problem

The Content-Security-Policy allows `'unsafe-inline'` for both scripts and styles. This negates most XSS protections offered by CSP — any inline script injected via an XSS vulnerability would execute freely.

**Code with issue:**
```javascript
scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
```

## How to Fix

Replace `'unsafe-inline'` with nonces or hashes for the specific inline scripts/styles that exist in the HTML files. This requires:

1. Audit all HTML files for `<script>` and `<style>` tags with inline content
2. Generate a nonce per request (random 128-bit base64 value) and inject it into the CSP header and all inline script/style tags
3. For Stripe, use `'strict-dynamic'` with a nonce approach
4. For static inline styles, compute SHA-256 hashes and add them to the CSP

Alternatively, for a quick improvement, move inline scripts to external `.js` files — this removes the need for `'unsafe-inline'` for scripts entirely.

```javascript
// Per-request nonce approach (in middleware):
app.use((req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
});

// In helmet config:
scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.cspNonce}'`, "https://js.stripe.com"],
```

## Acceptance Criteria

- [ ] `'unsafe-inline'` removed from `scriptSrc` in CSP
- [ ] `'unsafe-inline'` removed or narrowed in `styleSrc`
- [ ] All inline scripts/styles have corresponding nonces or hashes
- [ ] Frontend pages still function correctly (Stripe, brand manager, etc.)
- [ ] CSP validated with browser devtools (no CSP violation errors)

## Notes

_Generated from security_audit findings. CWE-693. This is a long-running task requiring frontend HTML audit._
