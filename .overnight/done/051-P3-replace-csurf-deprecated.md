---
id: 51
title: "Replace deprecated csurf package with csrf-csrf (maintained alternative)"
priority: P3
severity: low
status: completed
source: security_audit
file: marketplace/backend/package.json
line: 48
created: "2026-03-06T00:00:00Z"
execution_hint: parallel
context_group: security_quality
group_reason: "Security/quality improvements — independent of UX and feature groups"
---

# Replace deprecated csurf package with csrf-csrf

**Priority:** P3 (low)
**Source:** security_audit
**Location:** marketplace/backend/package.json:48

## Problem

`csurf` is a deprecated npm package (deprecated in 2023). It no longer receives security updates. The project uses it for CSRF protection across all state-mutating routes.

While SameSite=Strict cookies already provide significant CSRF protection (already configured in server.js), the csurf package itself may have unpatched vulnerabilities as it ages.

**Code with issue:**
```json
"csurf": "^1.11.0"
```

## How to Fix

Replace with `csrf-csrf`, the recommended maintained successor:

1. Install: `npm install csrf-csrf` and `npm uninstall csurf`

2. Update `marketplace/backend/server.js` CSRF setup:
   ```js
   // OLD (csurf):
   const csrf = require('csurf');
   const csrfProtection = csrf({ cookie: true });

   // NEW (csrf-csrf):
   const { doubleCsrf } = require('csrf-csrf');
   const { generateToken, doubleCsrfProtection } = doubleCsrf({
     getSecret: () => process.env.SESSION_SECRET,
     cookieName: '__Host-psifi.x-csrf-token',
     cookieOptions: { sameSite: 'strict', secure: process.env.NODE_ENV === 'production' },
     size: 64,
     ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
   });
   ```

3. Update all routes that use `csrfProtection` middleware to use `doubleCsrfProtection`.

4. Update CSRF token generation endpoint (if any) to use `generateToken(req, res)`.

5. Run full test suite: `npm test` — CSRF-related tests should still pass.

**Note:** Review all routes that are CSRF-exempt (e.g., storefront webhook routes) to ensure they remain correctly exempt.

## Acceptance Criteria

- [ ] `csurf` removed from package.json
- [ ] `csrf-csrf` added and configured in server.js
- [ ] All existing CSRF-protected routes still protected
- [ ] CSRF-exempt routes (webhook endpoints) remain unaffected
- [ ] Test suite passes after migration
- [ ] No new `npm audit` high/critical vulnerabilities introduced

## Notes

_Generated from security_audit finding: "csurf is deprecated (2023). No longer receives security updates. CWE-1104."_
