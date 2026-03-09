---
id: 1
title: "Unified design system across HTML pages"
priority: P1
severity: high
status: completed
source: project_declared
file: marketplace/frontend/
line: null
created: "2026-03-09T00:00:00Z"
execution_hint: long_running
context_group: frontend_design
group_reason: "Large refactor touching many HTML files; needs warm context across iterations"
---

# Unified Design System Across HTML Pages

**Priority:** P1 (high)
**Source:** project_declared (preserved non-roadmap task)
**Location:** marketplace/frontend/*.html (33+ pages)

## Problem

Each HTML page in the project has different styling — inline styles, different color values, different typography, different button appearances. There is no shared CSS design system. This creates:
- Inconsistent user experience across the product
- Difficult maintenance (must change every page separately)
- Unprofessional appearance that harms conversion

Key observations from audit:
- store.html, admin.html, login.html, cart-custom.html, crypto-checkout.html, account-dashboard.html, etc. each have independent CSS
- No shared design tokens (CSS variables) for colors, fonts, spacing
- Button styles differ wildly between pages
- No global nav component

## How to Fix

1. Create `marketplace/frontend/css/design-system.css` with:
   - CSS custom properties (variables): `--color-primary`, `--color-text`, `--color-bg`, `--font-body`, `--font-heading`, `--border-radius`, `--spacing-*`
   - Base reset + typography
   - Reusable component classes: `.btn`, `.btn-primary`, `.btn-secondary`, `.card`, `.input`, `.form-group`, `.alert`, `.badge`
   - Responsive grid helpers

2. Create `marketplace/frontend/css/layout.css` with:
   - Shared header/nav styles
   - Footer styles
   - Page wrapper styles

3. Update the 5 most-trafficked pages first:
   - `store.html` — storefront (customer-facing)
   - `login.html` — auth entry point
   - `cart-custom.html` — checkout funnel
   - `crypto-checkout.html` — crypto payment page
   - `account-dashboard.html` — post-purchase

4. Add `<link rel="stylesheet" href="/css/design-system.css">` to each updated page

5. Remove or consolidate duplicate inline styles on updated pages

6. Document the design tokens in a comment block at the top of design-system.css

**Do NOT rewrite all 33 pages in one commit** — start with the 5 pages above, validate visually, then extend.

## Acceptance Criteria

- [ ] design-system.css created with CSS variables and component classes
- [ ] 5 key pages updated to use shared styles
- [ ] Visual consistency confirmed (buttons, forms, colors match)
- [ ] No regressions on existing functionality
- [ ] Existing test suites still pass

## Notes

_Generated from preserved non-roadmap audit task. Mark as long_running — large refactor spanning many files._
