---
id: 6
title: "Unify landing page nav links — fix broken CTAs"
priority: P0
severity: high
status: completed
source: AGENT_TASKS.md
file: openbazaar-site/index.html
line: null
created: "2026-03-06T00:00:00Z"
execution_hint: parallel
context_group: frontend_landing
group_reason: "Frontend-only fix; no overlap with backend tasks"
---

# Unify landing page nav links — fix broken CTAs

**Priority:** P0 (high)
**Source:** AGENT_TASKS.md (Phase 0 — Make It Work)

## Problem

The landing page (`openbazaar-site/index.html`) has CTAs like "Start Selling" and "Browse Marketplace" that either point to `#`, dead pages, or pages that don't yet exist. Visitors clicking these get a broken experience — a critical first impression failure.

## How to Fix

1. Read `openbazaar-site/index.html` and find all nav links and CTA buttons.
2. For each link, determine the correct destination:
   - "Start Selling" → should go to setup wizard or login page (e.g. `/setup-wizard/index.html` or `/login.html`)
   - "Browse Marketplace" → should go to the storefront catalog (e.g. `/marketplace/frontend/index.html` or `/api/storefront/catalog` if the frontend renders it)
   - "Sign In" / "Log In" → should go to `login.html`
   - Other CTAs: map to the nearest working page
3. For CTAs pointing to pages that don't exist yet, either:
   a. Point to the closest working alternative, OR
   b. Add a `coming-soon` page and point there (only if no working alternative exists)
4. Ensure all changed links work locally by checking that target files exist.
5. Check `openbazaar-site/main.js` for any JS-driven nav — fix those too.

## Acceptance Criteria

- [ ] No nav link or CTA button in `index.html` points to `#` or a dead URL
- [ ] "Start Selling" leads to a working page
- [ ] "Browse Marketplace" leads to a working page
- [ ] "Sign In" leads to `login.html` or equivalent
- [ ] All changed links verified against existing file paths
- [ ] No regressions in page layout or styling

## Notes

_Generated from AGENT_TASKS.md P0 item: "Unify nav links — landing page CTAs point to working pages"._
