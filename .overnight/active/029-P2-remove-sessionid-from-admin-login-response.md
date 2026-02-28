---
id: 29
title: "Remove sessionId from admin login JSON response"
priority: P2
severity: low
status: completed
source: security_audit
file: marketplace/backend/routes/adminRoutes.js
line: 86
created: "2026-02-28T06:00:00"
execution_hint: parallel
context_group: independent
group_reason: "One-line fix in adminRoutes.js, no dependency on other tasks"
cwe: CWE-598
---

# Remove sessionId from admin login JSON response

**Priority:** P2 (low — defense-in-depth improvement)
**Source:** security_audit
**Location:** marketplace/backend/routes/adminRoutes.js:86

## Problem

The admin login success response body includes the `sessionId` in plain JSON:

**Code with issue:**
```javascript
// adminRoutes.js line 86
res.json({
    success: true,
    message: 'Login successful',
    sessionId: req.sessionID  // <-- should not be in response body
});
```

The session ID is already transmitted securely via the `Set-Cookie` header (as `teneo.sid` with `httpOnly: true`). Including it additionally in the JSON response body creates an unnecessary attack surface:
- If any frontend code reads and stores `sessionId` in localStorage, it becomes vulnerable to XSS theft
- The `httpOnly` flag on the cookie specifically prevents JavaScript from reading it — returning it in JSON body circumvents this protection

## How to Fix

Remove `sessionId` from the login response body. The session cookie handles session management securely without the client needing to know the raw session ID:

```javascript
// adminRoutes.js — remove sessionId from response:
res.json({
    success: true,
    message: 'Login successful'
    // Removed: sessionId: req.sessionID
});
```

If any admin frontend code currently reads `sessionId` from the login response, update it to rely on the cookie instead (which is automatic — the browser handles the `teneo.sid` cookie transparently).

## Acceptance Criteria

- [ ] `sessionId: req.sessionID` removed from admin login JSON response
- [ ] Login response still returns `{ success: true, message: 'Login successful' }`
- [ ] Admin session (via cookie) still works after login — admin dashboard accessible
- [ ] No frontend code is reading `sessionId` from the login response body

## Notes

_Generated from security_audit findings. CWE-598: Use of GET Request Method with Sensitive Query Strings (broader: sensitive data in response body). Small but meaningful defense-in-depth fix — the httpOnly cookie flag exists specifically to prevent JS access to session IDs, returning it in JSON body defeats that protection._
