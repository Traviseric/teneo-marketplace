---
id: 21
title: "Fix CSP unsafe-inline in styleSrc (CWE-693)"
priority: P2
severity: medium
status: completed
source: security_audit
file: marketplace/backend/server.js
line: 119
created: "2026-03-06T12:00:00Z"
execution_hint: parallel
context_group: csp_hardening
group_reason: "CSP hardening — standalone change in server.js Helmet config"
---

# Fix CSP unsafe-inline in styleSrc (CWE-693)

**Priority:** P2 (medium)
**Source:** security_audit
**CWE:** CWE-693 (Protection Mechanism Failure)
**Location:** `marketplace/backend/server.js:119`

## Problem

The Content Security Policy uses `'unsafe-inline'` for `styleSrc`, which weakens CSS injection protection. Inline styles can be used to exfiltrate data (via CSS attribute selectors + external requests) and can assist XSS attacks in some browser configurations.

**Code with issue:**
```javascript
styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
```

The codebase already handles `scriptSrc` correctly with per-request nonces (committed in a prior task). The same nonce mechanism should be applied to inline styles.

## How to Fix

The server already generates a `nonce` per request (for scriptSrc). Extend nonce usage to styleSrc:

1. In `server.js` where the CSP nonce is generated and applied, add the same nonce to `styleSrc`:
```javascript
styleSrc: ["'self'", `'nonce-${nonce}'`, "https://fonts.googleapis.com"],
```
Remove `'unsafe-inline'` from styleSrc.

2. In HTML templates that have `<style>` tags or `style=` attributes, add the nonce:
- `<style nonce="{{CSP_NONCE}}">` for style blocks
- For inline `style=` attributes on individual elements: these cannot use nonces. Either move them to external stylesheets or accept that per-element inline styles remain restricted.

3. Check which HTML pages have `<style>` tags (grep for `<style` in `marketplace/frontend/` and `openbazaar-site/`). Add nonce attribute to each `<style>` tag that needs to remain inline.

Note: If external component styles or third-party embeds rely on `'unsafe-inline'`, document them. A pragmatic fallback: use `'unsafe-hashes'` with explicit style hash values if there are a small number of inline style blocks that can't be nonce-tagged.

## Acceptance Criteria

- [ ] `styleSrc` no longer includes `'unsafe-inline'`
- [ ] Inline `<style>` blocks in HTML templates use the CSP nonce attribute
- [ ] Page styling renders correctly (no style breakage)
- [ ] Browser console shows no CSP violations for styles
- [ ] Google Fonts still load (`https://fonts.googleapis.com` remains in styleSrc)
- [ ] No regressions in existing tests

## Notes

_Generated from security_audit finding (CWE-693). scriptSrc nonces were already implemented in a prior task — this extends the same protection to styles. Verify the nonce generation pattern in server.js first before making changes._
