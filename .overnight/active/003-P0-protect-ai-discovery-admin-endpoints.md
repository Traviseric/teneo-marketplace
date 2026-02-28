---
id: 3
title: "Add authentication to AI Discovery admin endpoints"
priority: P0
severity: critical
status: completed
source: gap_analyzer
file: marketplace/backend/routes/aiDiscovery.js
line: 1
created: "2026-02-28T00:00:00"
execution_hint: sequential
context_group: auth_security
group_reason: "Same pattern as tasks 2, 4 — unprotected admin routes needing authenticateAdmin middleware"
---

# Add authentication to AI Discovery admin endpoints

**Priority:** P0 (critical)
**Source:** gap_analyzer
**Location:** marketplace/backend/routes/aiDiscovery.js

## Problem

The AI Discovery admin endpoints have NO authentication. Anyone can:
- **POST /api/discovery/admin/generate-embeddings** — Trigger OpenAI API calls (costly, consumes API credits)
- **POST /api/discovery/admin/process-embeddings** — Modify search indexes
- **GET /api/discovery/admin/queue-status** — View internal queue state

This allows unauthenticated attackers to run up OpenAI API bills and corrupt search data.

**Code with issue:**
```javascript
// aiDiscovery.js — admin endpoints with no middleware
router.post('/admin/generate-embeddings', async (req, res) => { ... });
router.post('/admin/process-embeddings', async (req, res) => { ... });
router.get('/admin/queue-status', async (req, res) => { ... });
```

## How to Fix

1. Import `authenticateAdmin` from the auth middleware:
```javascript
const { authenticateAdmin } = require('../middleware/auth');
```

2. Apply to all `/admin/*` routes:
```javascript
router.post('/admin/generate-embeddings', authenticateAdmin, async (req, res) => { ... });
router.post('/admin/process-embeddings', authenticateAdmin, async (req, res) => { ... });
router.get('/admin/queue-status', authenticateAdmin, async (req, res) => { ... });
```

3. Leave public discovery endpoints (`/search`, `/similar`, etc.) unauthenticated.

## Acceptance Criteria

- [ ] All `/admin/*` routes in aiDiscovery.js require valid admin session
- [ ] Unauthenticated requests get 401 response
- [ ] Public search endpoints remain accessible without auth
- [ ] Admin can still trigger embedding generation when logged in

## Notes

_Generated from gap_analyzer security findings._
