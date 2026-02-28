---
id: 25
title: "Add helmet.js security headers to server.js"
priority: P1
severity: medium
status: completed
source: security_audit
file: marketplace/backend/server.js
line: 41
created: "2026-02-28T06:00:00"
execution_hint: parallel
context_group: server_hardening
group_reason: "Server.js middleware configuration — parallel with task 026 (rate limit) as both add middleware to server.js"
cwe: CWE-693
---

# Add helmet.js security headers to server.js

**Priority:** P1 (medium severity but easy win)
**Source:** security_audit
**Location:** marketplace/backend/server.js:41

## Problem

The server does not set standard HTTP security headers. Without these headers, the application is exposed to:
- **Clickjacking** (missing X-Frame-Options)
- **MIME confusion attacks** (missing X-Content-Type-Options)
- **XSS** (missing Content-Security-Policy)
- **HTTPS downgrade attacks** (missing Strict-Transport-Security)
- No Referrer-Policy or Permissions-Policy

Currently there is no helmet import or equivalent in server.js.

**Code with issue:**
```javascript
// server.js line 41 — no helmet or security headers configured
const express = require('express');
// No helmet import or equivalent security headers middleware
```

## How to Fix

Install and configure helmet.js as early middleware:

```bash
npm install helmet
```

```javascript
// server.js — add near the top, after express import:
const helmet = require('helmet');

// Add early in middleware chain (before routes):
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://api.stripe.com"]
        }
    },
    crossOriginEmbedderPolicy: false // Disable if causing issues with external resources
}));
```

Note: The Stripe checkout iframe requires `frameSrc: ["https://js.stripe.com"]` in CSP, and Stripe.js requires `scriptSrc: ["https://js.stripe.com"]`. Adjust the CSP to match the actual external resources used by the frontend. Test thoroughly after adding CSP — it can break pages if misconfigured.

Add `helmet` to `package.json` dependencies:
```json
"helmet": "^8.0.0"
```

## Acceptance Criteria

- [ ] `helmet` added to package.json dependencies
- [ ] `npm install` completes with helmet installed
- [ ] `app.use(helmet(...))` added to server.js early in middleware chain (before routes)
- [ ] Content-Security-Policy configured to allow Stripe resources
- [ ] X-Frame-Options, X-Content-Type-Options, HSTS headers are set on all responses
- [ ] Existing frontend pages still load correctly (no CSP breakage)
- [ ] Stripe checkout still works (frameSrc/scriptSrc allow stripe.com)
- [ ] curl -I http://localhost:3001/api/health shows security headers in response

## Notes

_Generated from security_audit findings. CWE-693: Protection Mechanism Failure. Helmet.js is a single npm install + one line of middleware that adds ~8 security headers. High value, low effort. Test with a real page render after adding CSP._
