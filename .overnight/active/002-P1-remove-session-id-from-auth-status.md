---
id: 2
title: "Remove session ID from admin auth-status response"
priority: P1
severity: high
status: completed
source: security_audit
file: marketplace/backend/routes/adminRoutes.js
line: 152
created: "2026-03-06T00:00:00Z"
execution_hint: parallel
context_group: auth_hardening
group_reason: "Auth hardening tasks; independent from other files"
---

# Remove Session ID from Admin Auth-Status Response

**Priority:** P1 (high)
**Source:** security_audit
**Location:** marketplace/backend/routes/adminRoutes.js:152

## Problem

The `/api/admin/auth-status` endpoint exposes the raw session ID in the JSON response body. Session IDs should never be transmitted in response bodies — they can be captured by XSS attacks, logged by proxies/CDNs, or appear in browser history/developer tools, enabling session hijacking.

**Code with issue:**
```javascript
res.json({ authenticated: isAuthenticated, sessionId: isAuthenticated ? req.sessionID : null });
```

## How to Fix

Remove `sessionId` from the response entirely. The session cookie is already `httpOnly` and `sameSite=strict`; clients have no legitimate need for the raw session ID — they can determine authentication state from the `authenticated` boolean.

```javascript
res.json({ authenticated: isAuthenticated });
```

## Acceptance Criteria

- [ ] `sessionId` field removed from `/api/admin/auth-status` response
- [ ] `authenticated` boolean still returned correctly
- [ ] Any frontend code that reads `sessionId` from this response is updated (grep for `sessionId` in frontend JS)
- [ ] No regressions in admin login flow

## Notes

_Generated from security_audit findings. CWE-200._
