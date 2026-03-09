---
id: 22
title: "Fail closed: reject storefront POST requests when STOREFRONT_API_KEY not set in production"
priority: P2
severity: medium
status: completed
source: security_audit
file: marketplace/backend/routes/storefront.js
line: 190
created: "2026-03-06T12:00:00Z"
execution_hint: sequential
context_group: checkout_security
group_reason: "Storefront security — same checkout area as tasks 016, 018"
---

# Fail closed: reject storefront POST requests when STOREFRONT_API_KEY not set in production

**Priority:** P2 (medium)
**Source:** security_audit
**CWE:** CWE-306 (Missing Authentication for Critical Function)
**Location:** `marketplace/backend/routes/storefront.js:190`

## Problem

Storefront POST endpoints (checkout, fulfill) are fully open when `STOREFRONT_API_KEY` is not set. The code comment says "No key configured — open access (dev/legacy mode)" — but there is no guard preventing this in production. If the env var is omitted from a production deployment, the storefront API is publicly writable.

**Code with issue:**
```javascript
if (!STOREFRONT_API_KEY) {
  // No key configured — open access (dev/legacy mode)
  return next();
}
```

## How to Fix

Add a production guard that fails closed when the API key is not set:

```javascript
if (!STOREFRONT_API_KEY) {
  // Fail closed in production — open access is only for dev/legacy
  if (process.env.NODE_ENV === 'production') {
    console.error('[Storefront] STOREFRONT_API_KEY not set — rejecting request in production mode');
    return res.status(401).json({ error: 'API key required' });
  }
  // Dev/legacy mode: allow but warn
  console.warn('[Storefront] STOREFRONT_API_KEY not set — open access (dev mode only)');
  return next();
}
```

Also add `STOREFRONT_API_KEY` to `marketplace/backend/.env.example` with a clear comment:
```env
# Storefront API key — REQUIRED in production
# Clients (ArxMint, external integrations) must send this as Bearer token
# Generate: openssl rand -hex 32
STOREFRONT_API_KEY=your-storefront-api-key-here
```

## Acceptance Criteria

- [ ] When `NODE_ENV=production` and `STOREFRONT_API_KEY` is not set, POST requests to storefront endpoints return 401
- [ ] When `NODE_ENV` is not production, behavior is unchanged (open access with warning log)
- [ ] When `STOREFRONT_API_KEY` is set, existing API key validation logic is unchanged
- [ ] `STOREFRONT_API_KEY` documented in `.env.example` as required for production
- [ ] No regressions in existing tests (test env is not NODE_ENV=production)

## Notes

_Generated from security_audit finding (CWE-306). The "fail open" default for a POST endpoint that creates orders and triggers downloads is a deployment risk. Fail closed in production is a better default._
