---
id: 6
title: "Mount auth routes in server.js — /api/auth/* not registered"
priority: P0
severity: critical
status: completed
source: researcher
file: marketplace/backend/server.js
line: 1
created: "2026-02-28T00:00:00"
execution_hint: sequential
context_group: deploy_blockers
group_reason: "Core server wiring fix; auth system is broken without this; task 7 (login pages) depends on this"
---

# Mount auth routes in server.js — /api/auth/* not registered

**Priority:** P0 (critical)
**Source:** researcher
**Location:** marketplace/backend/server.js

## Problem

The auth routes file exists (`marketplace/backend/routes/auth.js` or `marketplace/backend/auth/config.js`) and implements all auth endpoints (register, login, magic link, OAuth callback, verify, logout), but these routes are **never mounted** in `server.js`. All `/api/auth/*` requests return 404.

This means:
- User registration is broken
- Login (magic link + OAuth) is broken
- Session verification is broken
- The entire pluggable auth system (LocalAuthProvider + TeneoAuthProvider) is unreachable

**Code with issue:**
```javascript
// server.js — auth routes are MISSING from route mounts
app.use('/api/brands', brandRoutes);
app.use('/api/checkout', checkoutRoutes);
// ... other routes ...
// NO: app.use('/api/auth', authRoutes);  ← THIS IS MISSING
```

## How to Fix

1. Find the auth routes file (check `marketplace/backend/routes/auth.js` and `marketplace/backend/auth/config.js`)

2. Add the import and mount in `server.js`:
```javascript
const authRoutes = require('./routes/auth');
// ...
app.use('/api/auth', authRoutes);
```

3. Verify the auth routes file exports a proper Express Router with all expected endpoints:
- `POST /api/auth/register` — new user registration
- `POST /api/auth/login` — request magic link
- `GET /api/auth/verify` — verify magic link token
- `GET /api/auth/callback` — OAuth callback
- `POST /api/auth/logout` — session termination
- `GET /api/auth/me` — current user info

4. Test each endpoint responds (even if some require SMTP config to fully function).

## Acceptance Criteria

- [ ] Auth routes imported and mounted at `/api/auth` in server.js
- [ ] `GET /api/auth/me` returns 401 for unauthenticated requests (not 404)
- [ ] `POST /api/auth/login` accepts requests and returns appropriate response
- [ ] Server starts without errors after this change

## Notes

_Generated from researcher findings. The auth backend is fully implemented but unreachable. This is a single-line fix that unlocks the entire auth system._
