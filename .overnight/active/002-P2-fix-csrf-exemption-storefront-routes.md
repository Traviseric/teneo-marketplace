---
id: 2
title: "Audit and fix CSRF exemption for /api/storefront routes"
priority: P2
severity: medium
status: completed
source: security_audit
file: marketplace/backend/server.js
line: 187
created: "2026-03-06T00:00:00Z"
execution_hint: sequential
context_group: csrf_hardening
group_reason: "CSRF middleware config in server.js; may touch storefront routes"
---

# Audit and Fix CSRF Exemption for /api/storefront Routes

**Priority:** P2 (medium)
**Source:** security_audit
**Location:** marketplace/backend/server.js:187

## Problem

CSRF protection is completely bypassed for all `/api/storefront` and `/api/apps` routes for ALL HTTP methods, including state-changing POST/PUT/DELETE operations:

**Code with issue:**
```javascript
if (req.method === 'GET' || req.path.startsWith('/api/health') || req.path.startsWith('/api/network/status') || req.path.startsWith('/api/apps') || req.path.startsWith('/api/storefront')) {
    return next();
}
```

While `/api/storefront` is designed for external consumption by third parties (e.g., ArxMint), any state-changing endpoints under this path are unprotected against CSRF attacks. Similarly, `/api/apps` is fully exempt for all methods including state-mutating ones.

## How to Fix

1. Audit all routes mounted under `/api/storefront` and `/api/apps` in `routes/storefront.js` to identify which are state-changing (POST/PUT/DELETE).

2. For state-changing storefront endpoints that require external access without CSRF tokens, replace CSRF protection with **API key authentication** or **webhook signature validation** (e.g., HMAC signature on the request body). This is more appropriate for server-to-server API calls than CSRF tokens.

3. If any storefront endpoints are truly read-only (GET-only), they are already safe. Narrow the exemption to GET-only:

```javascript
// Option A: Narrow exemption to GET methods only for storefront
if (req.method === 'GET' ||
    req.path.startsWith('/api/health') ||
    req.path.startsWith('/api/network/status') ||
    ((req.path.startsWith('/api/storefront') || req.path.startsWith('/api/apps')) && req.method === 'GET')) {
    return next();
}
```

4. For POST endpoints under `/api/storefront` (like `/api/storefront/fulfill`), add an API key check:
```javascript
// Require X-Api-Key header for external storefront API calls
const STOREFRONT_API_KEY = process.env.STOREFRONT_API_KEY;
if (STOREFRONT_API_KEY && req.headers['x-api-key'] !== STOREFRONT_API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
}
```

## Acceptance Criteria

- [ ] All state-changing endpoints under `/api/storefront` identified
- [ ] CSRF exemption narrowed: GET-only requests remain exempt; POST/PUT/DELETE require API key or CSRF token
- [ ] `/api/storefront/fulfill` (or equivalent) protected by API key authentication
- [ ] `STOREFRONT_API_KEY` added to `.env.example` with description
- [ ] No regressions in existing ArxMint/storefront integration tests

## Notes

_Generated from security_audit findings. CWE-352. The sameSite=strict session cookie provides some CSRF protection for browser-based requests, but server-to-server storefront API calls don't use cookies at all, making this exemption higher risk than it appears._
