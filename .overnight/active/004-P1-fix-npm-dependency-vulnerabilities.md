---
id: 4
title: "Fix high-severity npm dependency vulnerabilities"
priority: P1
severity: high
status: completed
source: security_audit
file: marketplace/backend/package.json
line: 57
created: "2026-03-06T00:00:00Z"
execution_hint: parallel
context_group: deps_upgrade
group_reason: "All dependency upgrades can be done together in one npm session"
---

# Fix High-Severity npm Dependency Vulnerabilities

**Priority:** P1 (high)
**Source:** security_audit
**Location:** marketplace/backend/package.json

## Problem

Four high-severity vulnerabilities exist in the dependency tree:

1. **multer 2.1.0** (direct dep, line 57) — DoS via uncontrolled recursion when parsing deeply nested multipart form data (GHSA-5528-5vmv-3xc2, CWE-674, affects <2.1.1)

2. **tar <=7.5.9** (transitive via sqlite3/node-gyp) — Multiple path traversal CVEs: GHSA-34x7-hfp2-rc4v (CVSS 8.2, hardlink arbitrary file overwrite), GHSA-8qq5-rm4j-mr97 (symlink overwrite), GHSA-83g3-92jg-28cx (symlink chain read/write), GHSA-qffp-2rhf-9h96 (hardlink traversal)

3. **serialize-javascript <=7.0.2** (devDep via mocha/hardhat) — RCE via RegExp.flags (GHSA-5c6j-r48x-rmvq, CWE-96, CVSS 8.1)

4. **immutable <4.3.8** (devDep via hardhat) — Prototype Pollution (GHSA-wf6x-7x77-mvgw, CWE-1321)

**Code with issue:**
```json
"multer": "^2.1.0"
```

## How to Fix

Run from `marketplace/backend/`:

```bash
# Fix multer directly
npm install multer@latest

# Fix tar (transitive via sqlite3) and other transitive deps
npm audit fix

# Fix devDep issues (serialize-javascript, immutable via hardhat)
npm install @nomicfoundation/hardhat-toolbox@latest --save-dev

# Verify
npm audit
```

Check that no breaking changes were introduced in multer's API after the upgrade. Review the multer changelog for any API differences between 2.1.0 and the latest version.

## Acceptance Criteria

- [ ] multer upgraded to >=2.1.1
- [ ] `npm audit` shows no high-severity vulnerabilities remaining
- [ ] Server starts without errors after upgrade
- [ ] PDF upload functionality still works (multer API compatible)

## Notes

_Generated from security_audit findings. Merges 4 dep-related findings (multer, tar, serialize-javascript, immutable)._
