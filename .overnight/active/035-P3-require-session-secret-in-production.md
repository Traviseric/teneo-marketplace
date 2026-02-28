---
id: 35
title: "Require SESSION_SECRET explicitly in production (fail hard if missing)"
priority: P3
severity: low
status: completed
source: security_audit
file: marketplace/backend/server.js
line: 88
created: "2026-02-28T06:00:00"
execution_hint: parallel
context_group: server_hardening
group_reason: "server.js startup validation — parallel with task 025 (helmet) and 023 (ADMIN_PASSWORD_HASH)"
cwe: CWE-330
---

# Require SESSION_SECRET explicitly in production (fail hard if missing)

**Priority:** P3 (low)
**Source:** security_audit
**Location:** marketplace/backend/server.js:88

## Problem

If `SESSION_SECRET` is not set in production, a new random secret is generated on each process start, invalidating all existing sessions. While `validateEnvironment()` generates and stores the secret in `process.env`, there is a subtle double-generation risk, and users experience unexpected logouts on every server restart.

**Code with issue:**
```javascript
// server.js line 88
const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex');
```

In production, this silently generates a temporary secret instead of failing loudly — a misconfiguration that causes user-facing issues and security risks.

## How to Fix

Add a startup check that fails hard in production if `SESSION_SECRET` is not explicitly configured:

```javascript
// server.js — in validateEnvironment() or at startup:
function validateEnvironment() {
    const errors = [];

    if (process.env.NODE_ENV === 'production') {
        if (!process.env.SESSION_SECRET) {
            errors.push('SESSION_SECRET must be set in production (min 32 chars)');
        } else if (process.env.SESSION_SECRET.length < 32) {
            errors.push('SESSION_SECRET must be at least 32 characters in production');
        }
    }

    if (errors.length > 0) {
        console.error('FATAL: Missing required environment configuration:');
        errors.forEach(e => console.error(' -', e));
        process.exit(1);
    }
}

// Then the session setup:
const sessionSecret = process.env.SESSION_SECRET ||
    (process.env.NODE_ENV !== 'production'
        ? crypto.randomBytes(64).toString('hex')  // OK in dev
        : (() => { throw new Error('SESSION_SECRET required'); })());
```

In development, the auto-generation behavior can remain (convenient for local dev). Only production needs the hard fail.

## Acceptance Criteria

- [ ] Production startup fails with clear error if `SESSION_SECRET` is not set
- [ ] Error message explains what to do (set SESSION_SECRET in environment)
- [ ] Development mode still auto-generates SESSION_SECRET (no breaking change for dev)
- [ ] Minimum length validation (32+ chars) applied in production
- [ ] `npm start` in development still works without SESSION_SECRET env var

## Notes

_Generated from security_audit findings. CWE-330: Use of Insufficiently Random Values. Low priority since this mainly causes UX issues (unexpected logouts) rather than a direct security breach. Bundle with task 023 (ADMIN_PASSWORD_HASH production check) for efficiency — same pattern._
