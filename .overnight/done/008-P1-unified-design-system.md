---
id: 8
title: "Unified design system across HTML pages (normalize inconsistent styling)"
priority: P1
severity: medium
status: completed
source: project_declared
file: marketplace/frontend/
created: "2026-03-09T21:00:00Z"
execution_hint: long_running
context_group: frontend_design
group_reason: "Large refactor spanning many HTML/CSS files"
---

# Unified design system across HTML pages (normalize inconsistent styling)

**Priority:** P1 (medium)
**Source:** project_declared (AGENT_TASKS.md — "Unified design system across 33 HTML pages")
**Location:** marketplace/frontend/ (33 HTML pages with inconsistent styling)

## Problem

The marketplace frontend has 33+ HTML pages each with different styling — different color variables, typography scales, button styles, and spacing patterns. This creates a fragmented visual experience and makes it hard to maintain or update the UI. There is no shared CSS design token system.

## How to Fix

This is a large task. Approach incrementally:

### Phase 1 — Inventory (required first)
1. List all HTML files in `marketplace/frontend/`
2. Check which files already use `styles/variables.css` (CSS custom properties)
3. Identify 3-4 most-visited/important pages that need the most work

### Phase 2 — Define design tokens
1. Create or extend `marketplace/frontend/styles/variables.css` with a complete set of CSS custom properties:
   ```css
   :root {
     --color-primary: #6c47ff;
     --color-bg: #0f0f0f;
     --color-surface: #1a1a1a;
     --color-text: #f5f5f5;
     --color-text-muted: #a0a0a0;
     --font-sans: 'Inter', sans-serif;
     --radius-sm: 4px;
     --radius-md: 8px;
     --radius-lg: 16px;
     --spacing-xs: 4px;
     --spacing-sm: 8px;
     --spacing-md: 16px;
     --spacing-lg: 32px;
   }
   ```

2. Create a shared `marketplace/frontend/styles/base.css` for button, card, form, and typography primitives.

### Phase 3 — Apply to core pages
Apply the shared styles to the 5-10 most important pages first (admin, store, checkout, auth pages). Leave less-used pages for follow-up.

### Phase 4 — Verify
Run through each updated page visually and check mobile responsiveness.

## Acceptance Criteria

- [ ] `styles/variables.css` defines all core design tokens
- [ ] `styles/base.css` provides shared component primitives
- [ ] At least 10 core pages use the shared styles
- [ ] No regressions to functionality (JS interactions still work)
- [ ] Pages are visually consistent in color, typography, and spacing

## Notes

_This is a long-running task spanning many files. Worker should start with Phase 1 inventory before modifying any files. Mark as long_running — expect multiple iterations. Generated from AGENT_TASKS.md P1 preserved item._
