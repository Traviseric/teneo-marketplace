---
id: 7
title: "Create login.html and account-dashboard.html frontend pages"
priority: P1
severity: high
status: completed
source: overnight_tasks
file: marketplace/frontend/
line: 1
created: "2026-02-28T00:00:00"
execution_hint: sequential
context_group: frontend_module
group_reason: "Depends on task 6 (auth routes mounted); task 8 (fix hardcoded URLs) touches same frontend files"
---

# Create login.html and account-dashboard.html frontend pages

**Priority:** P1 (high)
**Source:** overnight_tasks (Tier 1)
**Location:** marketplace/frontend/

## Problem

No user-facing auth UI exists. The backend auth system (magic links + OAuth) is fully implemented but there are no HTML pages for users to interact with. Currently:
- No login page at all — users cannot authenticate
- No registration flow UI
- No account dashboard to see orders, downloads, course access
- No session detection in the navbar across any page

Users who complete a Stripe purchase cannot log in to access their purchased downloads without a direct download link from email.

## How to Fix

**1. Create `marketplace/frontend/login.html`:**

- Match the existing brand style (use CSS variables from brand themes)
- Three auth options in order:
  1. **Email magic link** (primary): Email input → "Send Magic Link" → success message with instructions
  2. **"Sign in with Teneo" button** for OAuth SSO (only show if `TENEO_AUTH_ENABLED` is configured)
  3. **"Connect with Nostr" button** (NIP-07 extension detection — check `window.nostr`, show if present)
- Wire to `POST /api/auth/login` for magic link
- Wire to OAuth flow start for Teneo SSO
- Show appropriate error/success states

**2. Create `marketplace/frontend/account-dashboard.html`:**

- Check session on load (`GET /api/auth/me`) — redirect to login if not authenticated
- Show: user email, account created date
- Orders section: list past orders with download links
- Downloads section: active download tokens
- Course access section (even if placeholder for now)

**3. Add session detection to navbar:**

- In shared navbar HTML (or via inline script), check `GET /api/auth/me` on page load
- If authenticated: show "My Account" link → account-dashboard.html, "Logout" button
- If not authenticated: show "Sign In" link → login.html

Use the existing vanilla JS patterns from other pages. Follow the existing HTML/CSS style of `marketplace/frontend/admin-login.html` as a reference for form styling.

## Acceptance Criteria

- [ ] `login.html` exists with email magic link form wired to backend
- [ ] Successful magic link request shows success message
- [ ] `account-dashboard.html` exists and redirects to login if not authenticated
- [ ] Navbar updated on at least the store/catalog pages to show auth state
- [ ] Pages follow existing brand styling conventions

## Notes

_Generated from OVERNIGHT_TASKS.md Tier 1. Depends on task 006 (auth routes mounted). Reference admin-login.html for style patterns._
