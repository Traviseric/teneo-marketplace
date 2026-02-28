---
id: 2
title: "Add authentication to all brand management API routes"
priority: P0
severity: critical
status: completed
source: gap_analyzer
file: marketplace/backend/routes/brandRoutes.js
line: 1
created: "2026-02-28T00:00:00"
execution_hint: sequential
context_group: auth_security
group_reason: "Same security pattern as tasks 3, 4 — all need requireAdmin middleware added to admin routes"
---

# Add authentication to all brand management API routes

**Priority:** P0 (critical)
**Source:** gap_analyzer
**Location:** marketplace/backend/routes/brandRoutes.js

## Problem

All 10 brand management CRUD endpoints have ZERO authentication. Anyone on the internet can:
- Create new brands
- Modify existing brand configurations
- Delete brands
- Upload files (potential file upload attack vector)
- Modify book catalogs
- Access brand admin data

The `marketplace/backend/middleware/auth.js` exports `authenticateAdmin` middleware which is already used in `adminRoutes.js`, but it is not imported or applied anywhere in `brandRoutes.js`.

**Code with issue:**
```javascript
// brandRoutes.js — all routes are unprotected
router.get('/brands', async (req, res) => { ... });         // list all brands
router.post('/brands', async (req, res) => { ... });        // CREATE brand — NO AUTH
router.put('/brands/:brandId', async (req, res) => { ... }); // UPDATE brand — NO AUTH
router.delete('/brands/:brandId', async (req, res) => { ... }); // DELETE brand — NO AUTH
// + file upload, catalog modification endpoints — ALL UNPROTECTED
```

## How to Fix

1. Import the `authenticateAdmin` middleware at the top of `brandRoutes.js`:
```javascript
const { authenticateAdmin } = require('../middleware/auth');
```

2. Apply `authenticateAdmin` to all write operations (POST, PUT, DELETE, PATCH) and any admin-only GET endpoints. Public catalog browsing can remain unauthenticated.

```javascript
// Public reads — no auth needed
router.get('/brands', async (req, res) => { ... });

// Write operations — require admin auth
router.post('/brands', authenticateAdmin, async (req, res) => { ... });
router.put('/brands/:brandId', authenticateAdmin, async (req, res) => { ... });
router.delete('/brands/:brandId', authenticateAdmin, async (req, res) => { ... });
router.post('/brands/:brandId/upload', authenticateAdmin, async (req, res) => { ... });
// Apply to ALL catalog modification endpoints
```

3. Verify the admin session check works correctly by testing with and without a valid admin session cookie.

## Acceptance Criteria

- [ ] All POST, PUT, DELETE brand routes require valid admin session
- [ ] Unauthenticated requests receive 401 Unauthorized response
- [ ] Authenticated admin requests still work correctly
- [ ] Public read endpoints (brand listing, catalog viewing) still work without auth
- [ ] File upload endpoints are protected

## Notes

_Generated from gap_analyzer security findings. The `authenticateAdmin` middleware already exists in middleware/auth.js — this is purely a matter of applying it to the right routes._
