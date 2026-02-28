---
id: 4
title: "Add authentication to censorship tracker admin endpoints"
priority: P0
severity: critical
status: completed
source: gap_analyzer
file: marketplace/backend/routes/censorshipTracker.js
line: 248
created: "2026-02-28T00:00:00"
execution_hint: sequential
context_group: auth_security
group_reason: "Same pattern as tasks 2, 3 — unprotected admin routes needing authenticateAdmin middleware"
---

# Add authentication to censorship tracker admin endpoints

**Priority:** P0 (critical)
**Source:** gap_analyzer
**Location:** marketplace/backend/routes/censorshipTracker.js:248

## Problem

All censorship tracker admin endpoints have NO authentication. Anyone can:
- **POST /api/censorship/admin/start-monitoring** — Start monitoring processes (consumes server resources)
- **POST /api/censorship/admin/stop-monitoring** — Stop monitoring
- **POST /api/censorship/admin/check-now** — Trigger immediate checks
- **POST /api/censorship/admin/add-book** — Add books to monitoring list
- **GET /api/censorship/admin/monitored-books** — View all monitored books

**Code with issue:**
```javascript
// censorshipTracker.js
router.post('/admin/start-monitoring', async (req, res) => { ... });  // NO AUTH
router.post('/admin/stop-monitoring', async (req, res) => { ... });   // NO AUTH
router.post('/admin/add-book', async (req, res) => { ... });          // NO AUTH
```

## How to Fix

1. Import `authenticateAdmin` middleware:
```javascript
const { authenticateAdmin } = require('../middleware/auth');
```

2. Apply to all admin routes:
```javascript
router.post('/admin/start-monitoring', authenticateAdmin, async (req, res) => { ... });
router.post('/admin/stop-monitoring', authenticateAdmin, async (req, res) => { ... });
router.post('/admin/check-now', authenticateAdmin, async (req, res) => { ... });
router.post('/admin/add-book', authenticateAdmin, async (req, res) => { ... });
router.get('/admin/monitored-books', authenticateAdmin, async (req, res) => { ... });
```

3. Keep public endpoints (censorship event viewing, subscription) unauthenticated.

## Acceptance Criteria

- [ ] All `/admin/*` routes require valid admin session
- [ ] Unauthenticated requests return 401
- [ ] Public endpoints (view events, subscribe alerts) still work
- [ ] Admin monitoring control works when authenticated

## Notes

_Generated from gap_analyzer security findings._
