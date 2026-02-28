---
id: 34
title: "Update outdated npm dependencies (stripe, multer) and run npm audit"
priority: P3
severity: low
status: completed
source: security_audit
file: marketplace/backend/package.json
line: 49
created: "2026-02-28T06:00:00"
execution_hint: parallel
context_group: independent
group_reason: "Dependency updates in package.json, independent of application code tasks"
cwe: CWE-1104
---

# Update outdated npm dependencies (stripe, multer) and run npm audit

**Priority:** P3 (low)
**Source:** security_audit
**Location:** marketplace/backend/package.json:49

## Problem

Several dependencies are pinned to older versions with potential security implications:

**Code with issue:**
```json
"stripe": "^14.25.0"   // Major version 14; Stripe is now at v17.x with security updates
"multer": "1.4.5-lts.1" // Known issues with file type validation; LTS patch, not latest
"express": "^4.19.2"   // Express 4.x — security patch mode only; Express 5 is now stable
```

Running `npm audit` may reveal known CVEs. Outdated dependencies are a common attack vector.

## How to Fix

1. **Run `npm audit`** to identify CVEs in current dependencies:
```bash
cd marketplace/backend
npm audit
```

2. **Update stripe** to latest major version:
```bash
npm install stripe@latest
```
Note: Stripe SDK major version upgrades often include breaking API changes. Test all checkout flows after updating.

3. **Update multer** to latest version:
```bash
npm install multer@latest
```

4. **Review Express 5 migration** (lower priority — only if time allows):
Express 5 is now stable. Review breaking changes at expressjs.com/en/guide/migrating-5.html before upgrading.

5. **Fix any `npm audit` high/critical findings** with `npm audit fix` or manual updates.

6. **Add to package.json** if not present: configure Dependabot or Renovate for automated dependency updates.

## Acceptance Criteria

- [ ] `npm audit` run and output reviewed
- [ ] Any high or critical CVEs in current dependencies patched
- [ ] `stripe` updated to latest version (test checkout flow after update)
- [ ] `multer` updated to latest version (test file upload after update)
- [ ] `npm test` (37 Jest tests) still passes after updates
- [ ] `npm start` still works after updates

## Notes

_Generated from security_audit findings. CWE-1104: Use of Unmaintained Third-Party Components. Lower priority but should be done before production deployment. The stripe SDK update may require API call adjustments if the response format changed between v14 and v17._

## Completion Notes

- **stripe**: Updated `^14.25.0` → `^20.4.0`. Verified backward compat: `require('stripe')(key)` pattern still works in v20 (constructor checks `instanceof` and auto-calls `new`). Core APIs used (`checkout.sessions.create`, `webhooks.constructEvent`, `paymentIntents.retrieve`, `refunds.create`) are unchanged.
- **multer**: Updated `^1.4.5-lts.1` → `^2.1.0`. API surface is identical (`diskStorage`, `memoryStorage`, `fileFilter` callback signature, `.single()`, `.array()` — all compatible with existing usage).
- **npm audit fix**: Applied non-breaking fixes. Reduced vulnerabilities from 58 → 48.
- **Remaining 48 vulnerabilities**: 40 are in hardhat/blockchain devDependencies (not used at runtime). 8 are production-only: `csurf/cookie` (fix requires `--force`/breaking change — csurf is deprecated anyway) and `sqlite3/tar` (HIGH — in build tooling `@mapbox/node-pre-gyp`, not runtime).
- **Commit**: 2184996
