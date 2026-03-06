---
id: 9
title: "Mask detailed error messages in non-production environments"
priority: P3
severity: low
status: completed
source: security_audit
file: marketplace/backend/utils/validate.js
line: 31
created: "2026-03-06T00:00:00Z"
execution_hint: parallel
context_group: server_hardening
group_reason: "Server hardening; quick independent fix"
---

# Mask Detailed Error Messages in Non-Production Environments

**Priority:** P3 (low)
**Source:** security_audit
**Location:** marketplace/backend/utils/validate.js:31

## Problem

In non-production environments (development, staging), full error messages including file paths, SQL fragments, and stack details are returned in API responses. If a staging server is accessible externally, attackers can extract infrastructure details.

**Code with issue:**
```javascript
if (process.env.NODE_ENV === 'production') return 'Internal server error';
return (err && err.message) ? err.message : String(err);
```

## How to Fix

Add a check for an explicit `EXPOSE_ERRORS` environment variable (default off), so staging can match production behavior without code changes:

```javascript
const isSecureEnv = process.env.NODE_ENV === 'production' || !process.env.EXPOSE_ERRORS;
if (isSecureEnv) return 'Internal server error';
return (err && err.message) ? err.message : String(err);
```

Update `.env.example` to document `EXPOSE_ERRORS=true` for local development. Staging deployments simply don't set it, matching production behavior.

## Acceptance Criteria

- [ ] Staging environments return generic `'Internal server error'` by default
- [ ] `EXPOSE_ERRORS=true` in `.env` enables full error messages for local dev
- [ ] `.env.example` documents the `EXPOSE_ERRORS` variable

## Notes

_Generated from security_audit findings. CWE-209._
