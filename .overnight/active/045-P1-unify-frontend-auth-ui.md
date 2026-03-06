---
id: 45
title: "Unify frontend auth UI — login/register pages with consistent design and clear journey"
priority: P1
severity: high
status: completed
source: AGENT_TASKS.md
file: marketplace/frontend/login.html
line: null
created: "2026-03-06T00:00:00Z"
execution_hint: sequential
context_group: frontend_auth
group_reason: "Auth UI files share session/redirect logic and need unified treatment"
---

# Unify frontend auth UI — login/register pages consistent design + clear user journey

**Priority:** P1 (high)
**Source:** AGENT_TASKS.md — Preserved Non-Roadmap Work
**Location:** marketplace/frontend/login.html (and related auth pages)

## Problem

The backend auth system is complete (magic links, OAuth, Nostr NIP-07 all implemented), but the frontend auth UI is not unified. Login and registration pages have different styling from the rest of the app and the user journey (login → session → redirect to dashboard) is inconsistent across flows.

Key issues:
- login.html may not clearly surface all three auth options (magic link, OAuth, Nostr)
- Post-login redirect to `account-dashboard.html` may not work reliably across flows
- Register vs login distinction may be unclear (magic link auth collapses these)
- Error states from auth failures may not display clearly in UI

## How to Fix

1. Audit `marketplace/frontend/login.html`:
   - Read the current file to understand what's there
   - Identify which auth methods are currently shown
   - Check if Nostr sign-in button exists (task 011 added it, verify)
   - Check post-login redirect logic

2. Ensure login.html has:
   - Magic link section: email input + "Send Magic Link" button
   - OAuth section: "Sign in with [provider]" button (if OAuth configured)
   - Nostr section: "Sign in with Nostr" button using `window.nostr.signEvent`
   - Clear error display (no alert() calls) with `role='alert'` container
   - Post-auth redirect to `account-dashboard.html` or `?redirect=` param
   - Loading states on each auth button

3. Ensure `account-dashboard.html` exists and handles the post-login state:
   - Shows session user info (`GET /api/auth/status`)
   - Has a sign-out button that calls `POST /api/auth/logout`
   - Gracefully redirects to login.html if session is missing

4. Apply consistent styling using the existing CSS variables/design tokens from other frontend pages (match the brand template color/font system).

5. Test each auth flow manually with the dev server to confirm the full journey works.

## Acceptance Criteria

- [ ] login.html has all three auth options clearly presented
- [ ] No alert() or prompt() in auth UI
- [ ] Post-auth redirect to dashboard works for all three flows
- [ ] Error states shown inline with role='alert'
- [ ] account-dashboard.html shows auth status and logout button
- [ ] Styling consistent with rest of frontend
- [ ] Loading state on auth buttons during async operations

## Notes

_Generated from AGENT_TASKS.md preserved non-roadmap item: "Frontend auth UI — backend done, login/register pages not unified"_
