---
id: 24
title: "Replace download routes custom Basic Auth with authenticateAdmin middleware"
priority: P1
severity: high
status: completed
source: security_audit
file: marketplace/backend/routes/downloadRoutes.js
line: 44
created: "2026-02-28T06:00:00"
execution_hint: sequential
context_group: auth_module
group_reason: "Replaces ad-hoc auth with authenticateAdmin — same pattern as task 013 (already completed for catalogRoutes)"
cwe: CWE-916
---

# Replace download routes custom Basic Auth with authenticateAdmin middleware

**Priority:** P1 (high)
**Source:** security_audit
**Location:** marketplace/backend/routes/downloadRoutes.js:44

## Problem

The download routes use a custom Basic Auth implementation with a plaintext password comparison (not timing-safe), falling back to the literal string `'use-admin-dashboard'` if `ADMIN_PASSWORD` is not set. This creates multiple problems:

1. **Not timing-safe**: `password !== AUTH_PASSWORD` is a direct string comparison, vulnerable to timing attacks
2. **Public default**: `'use-admin-dashboard'` is documented in source code — any attacker knows to try it
3. **Inconsistency**: A second auth mechanism separate from the admin session system
4. **Wrong env var**: Uses `ADMIN_PASSWORD` (plaintext) instead of `ADMIN_PASSWORD_HASH` (bcrypt)

**Code with issue:**
```javascript
// downloadRoutes.js line 44
const AUTH_PASSWORD = process.env.ADMIN_PASSWORD || 'use-admin-dashboard';
...
if (password !== AUTH_PASSWORD) { return res.status(401)... }
```

## How to Fix

Replace the custom Basic Auth with the existing `authenticateAdmin` session middleware from `marketplace/backend/middleware/auth.js`. This was already done for catalogRoutes.js (task 013) — apply the same pattern here.

```javascript
// downloadRoutes.js — at the top:
const { authenticateAdmin } = require('../middleware/auth');

// Remove the entire custom AUTH_PASSWORD block:
// REMOVE: const AUTH_PASSWORD = process.env.ADMIN_PASSWORD || 'use-admin-dashboard';
// REMOVE: The Authorization header parsing in each route handler

// Apply authenticateAdmin to admin-only download management routes:
router.get('/admin/list', authenticateAdmin, async (req, res) => { ... });
router.delete('/admin/:token', authenticateAdmin, async (req, res) => { ... });
// etc. for any route that requires admin auth

// Public download routes (accessed by download token) should NOT use authenticateAdmin:
router.get('/:token', async (req, res) => {
    // These use the download token for auth, not admin session — keep as-is
    const order = await orderService.getOrderByDownloadToken(token);
    ...
});
```

Note: If download routes include both admin-management routes AND customer-facing download routes, only add `authenticateAdmin` to the admin management routes. Customer download routes already authenticate via the download token itself.

## Acceptance Criteria

- [ ] Custom Basic Auth implementation removed from downloadRoutes.js
- [ ] `AUTH_PASSWORD` constant and `process.env.ADMIN_PASSWORD` fallback removed
- [ ] `authenticateAdmin` from auth.js imported and applied to admin download management routes
- [ ] Customer-facing download routes (by token) remain accessible without admin session
- [ ] No plaintext password comparison remains in the file
- [ ] Admin download management routes still work when logged into admin session
- [ ] Consistency with the pattern established in catalogRoutes.js (task 013)

## Notes

_Generated from security_audit findings. CWE-916: Use of Password System for Primary Authentication — specifically the timing-unsafe plaintext comparison and known-default password. Task 013 (standardize auth) already fixed catalogRoutes.js with the same pattern — apply here._
