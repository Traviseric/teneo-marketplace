---
id: 13
title: "Standardize authentication middleware across all route files"
priority: P1
severity: high
status: completed
source: gap_analyzer
file: marketplace/backend/routes/catalogRoutes.js
line: 1
created: "2026-02-28T00:00:00"
execution_hint: sequential
context_group: auth_security
group_reason: "Auth consistency fix; touches multiple route files; same area as tasks 2, 3, 4"
---

# Standardize authentication middleware across all route files

**Priority:** P1 (high)
**Source:** gap_analyzer
**Location:** marketplace/backend/routes/catalogRoutes.js, adminRoutes.js, downloadRoutes.js, publishedBooks.js

## Problem

The codebase uses 4 different authentication approaches inconsistently:

1. **Session-based** (`authenticateAdmin` from middleware/auth.js) — used in adminRoutes.js ✓
2. **Token-based** (download tokens with expiry) — used in downloadRoutes.js ✓
3. **Basic Auth with env password** — used in catalogRoutes.js (ad-hoc, not using the pluggable auth system)
4. **TeneoAuth custom JWT** — used in publishedBooks.js

The inconsistency creates:
- Different security guarantees per route (Basic Auth has no session management or audit logging)
- Maintenance burden (4 places to update security logic)
- Confusion for developers about which auth to use
- catalogRoutes.js bypasses the `AuthProvider` abstraction entirely

**Code with issue:**
```javascript
// catalogRoutes.js — ad-hoc Basic Auth instead of using authenticateAdmin
const authHeader = req.headers.authorization;
const base64 = authHeader.split(' ')[1];
const [user, pass] = Buffer.from(base64, 'base64').toString().split(':');
if (pass !== process.env.ADMIN_PASSWORD) { ... }  // ad-hoc check
```

## How to Fix

1. **Audit all auth patterns** — list every route file and which auth method it uses

2. **Migrate catalogRoutes.js** from ad-hoc Basic Auth to `authenticateAdmin` from middleware/auth.js:
```javascript
const { authenticateAdmin } = require('../middleware/auth');
// Replace manual Basic Auth checks with:
router.post('/admin/catalog', authenticateAdmin, async (req, res) => { ... });
```

3. **Document the auth decision tree** in a comment or README:
   - Admin UI operations → `authenticateAdmin` (session-based)
   - Download access → download token (time-limited, one-use)
   - Public API → no auth (with rate limiting)
   - Teneo SSO → TeneoAuthProvider (for publisher-specific routes)

4. **Ensure audit logging** (`auditService`) is called consistently for all admin operations — currently only adminRoutes.js does this.

## Acceptance Criteria

- [ ] catalogRoutes.js no longer uses ad-hoc Basic Auth
- [ ] All admin-level operations use `authenticateAdmin` from middleware/auth.js
- [ ] Auth decision is documented
- [ ] No regression in existing functionality

## Notes

_Generated from gap_analyzer findings. This is a maintainability and security consistency fix rather than a vulnerability per se — downgraded from critical to P1._
