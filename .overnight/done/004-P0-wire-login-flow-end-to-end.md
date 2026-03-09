---
id: 4
title: "Wire login flow end-to-end: login.html → auth → session → dashboard"
priority: P0
severity: critical
status: completed
source: AGENT_TASKS.md
file: marketplace/backend/routes/auth.js
line: null
created: "2026-03-06T00:00:00Z"
execution_hint: sequential
context_group: auth_flow
group_reason: "Depends on database_layer work (tasks 1-3); touches auth routes and frontend login pages"
---

# Wire login flow end-to-end: login.html → auth → session → dashboard

**Priority:** P0 (critical)
**Source:** AGENT_TASKS.md (Phase 0 — Make It Work)

## Problem

Auth routes (`/api/auth/*`) and the frontend login pages exist but the complete flow has not been verified end-to-end. Users hitting `login.html` may get broken redirects, missing session cookies, or land on pages that don't check auth state. The `account-dashboard.html` may not gate on auth or may not display user-specific data.

Known gap: auth routes were noted as "not mounted in server.js" in a previous audit (lessons.json verified_facts). This may have been fixed — verify first.

## How to Fix

1. **Verify auth routes are mounted**: grep `server.js` for `authRoutes`. If missing, add `app.use('/api/auth', require('./routes/auth'));`.
2. **Verify login.html** submits to the correct endpoint (magic link: `POST /api/auth/magic-link`; OAuth: redirect to `/api/auth/oauth/...`).
3. **Verify magic link flow**: email → token in DB → click link → `GET /api/auth/verify?token=...` → session created → redirect to dashboard.
4. **Verify session middleware** is configured in server.js (express-session with SESSION_SECRET, httpOnly cookie, sameSite=strict).
5. **Verify account-dashboard.html** checks session on load: `GET /api/auth/me` → if 401, redirect to login.html.
6. Fix any broken steps found. Keep the fix minimal — don't refactor, just wire up what's missing.

## Acceptance Criteria

- [ ] `/api/auth/*` routes are mounted in server.js
- [ ] Magic link flow completes: request → email sent → token verified → session created
- [ ] `GET /api/auth/me` returns user data when session is valid, 401 when not
- [ ] `account-dashboard.html` redirects to `login.html` when not authenticated
- [ ] Session cookie is httpOnly, secure (in prod), sameSite=strict
- [ ] No regressions in other routes

## Notes

_Generated from AGENT_TASKS.md P0 item: "Wire login flow end-to-end — login.html → magic link or OAuth → session → account-dashboard.html"._
_Previous session verified_fact: "Auth routes not mounted in server.js" — re-verify before assuming this is still true._
