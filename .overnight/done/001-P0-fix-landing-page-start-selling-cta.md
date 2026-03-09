---
id: 1
title: "Fix 'Start Selling' CTA — links to non-existent /login.html"
priority: P0
severity: critical
status: completed
source: project_declared
file: openbazaar-site/index.html
line: 70
created: "2026-03-09T21:00:00Z"
execution_hint: parallel
context_group: landing_site
group_reason: "Landing site HTML changes"
---

# Fix 'Start Selling' CTA — links to non-existent /login.html

**Priority:** P0 (critical)
**Source:** project_declared (AGENT_TASKS.md — "Unify nav links — landing page CTAs point to working pages")
**Location:** openbazaar-site/index.html:70-75

## Problem

The hero section's primary CTA "Start Selling" links to `/login.html` which does not exist in `openbazaar-site/`. The directory contains only `index.html`. This means the primary conversion action on the landing page results in a 404 for any visitor who clicks it.

**Code with issue:**
```html
<a href="/login.html" class="btn btn-lg btn-primary">
  Start Selling
</a>
```

The site at `openbazaar-site/` only has `index.html` — there is no `login.html` page.

## How to Fix

The AI Store Builder intake form section was added to the landing page (commit 944d72d). Update the "Start Selling" CTA to scroll to or link to the AI Store Builder intake form section on the same page (e.g., `#ai-store-builder` or `#intake`).

Steps:
1. Find the id of the AI Store Builder / intake form section in `openbazaar-site/index.html`
2. Update the "Start Selling" href to `#<section-id>` (anchor link to that section)
3. Verify the anchor section exists and the scroll target is correct
4. Check other CTAs: "Post a Job" links to `#gigs` (exists ✓), "Browse Marketplace" links to `#marketplace` (exists ✓)
5. If no intake section exists yet, either add a simple sign-up/interest form or link to the managed store intake page at `/store-builder`

## Acceptance Criteria

- [ ] "Start Selling" CTA no longer links to a 404
- [ ] CTA links to a working page or on-page section
- [ ] Other hero CTAs still work correctly
- [ ] No regressions to existing nav or layout

## Notes

_Generated from project_declared AGENT_TASKS.md P0 item. HUMAN_TASKS.md HT-011 covers live URL testing after deployment._
