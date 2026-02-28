---
id: 82
title: "Run browser last-mile tests (console errors, responsive, images)"
priority: P1
severity: high
status: completed
source: overnight_tasks
file: marketplace/frontend/
created: "2026-02-28T12:00:00"
execution_hint: sequential
context_group: accessibility
group_reason: "Browser testing related to accessibility task 081"
---

# Run browser last-mile tests (console errors, responsive, images)

**Priority:** P1 (high)
**Source:** overnight_tasks (OVERNIGHT_TASKS.md P0 section)
**Location:** marketplace/frontend/ (browser automation against localhost:3003)

## Problem

3 last-mile scenarios were skipped in the prior session due to HTTP-only testing limitations:
1. **console_errors** — check browser console for JS errors on key pages
2. **responsive_layout** — resize viewport to 375px and verify mobile layout
3. **images_load** — verify all images render without broken icons

The last-mile verdict is currently PARTIAL. Completing these 3 tests upgrades it to GO and confirms the frontend is production-ready.

## How to Fix

Prerequisites: Start the dev server if not running (`npm run dev` in the project root), server listens on port 3003 (or 3001 — check .env PORT).

Using browser automation tools:

1. **console_errors test**: Navigate to each key page (/, /catalog, /checkout, /admin), check browser console for errors. Fix any JS errors found.

2. **responsive_layout test**: Set viewport to 375x812 (mobile). Visit homepage and catalog. Verify:
   - Navigation menu collapses or adapts
   - Text is readable without horizontal scrolling
   - CTA buttons are touch-friendly (min 44px tap target)
   - Fix any layout overflow or text truncation issues

3. **images_load test**: Visit pages and check for broken image icons. Verify:
   - Book cover images load (or show graceful fallback)
   - Logo renders correctly
   - No 404 errors for image assets in network tab
   - Fix any broken image paths

After completing all 3 tests, update `.overnight/last_mile_test_output.json` with results and change verdict to GO if all pass.

## Acceptance Criteria

- [ ] console_errors test: zero JS errors on homepage and catalog
- [ ] responsive_layout test: no horizontal scroll at 375px width
- [ ] images_load test: no broken image icons on any key page
- [ ] Any issues found are fixed
- [ ] Last-mile verdict upgraded to GO

## Notes

_From OVERNIGHT_TASKS.md P0 section. Requires a running local server._
