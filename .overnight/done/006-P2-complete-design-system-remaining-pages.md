---
id: 6
title: "Complete CSS design system migration on remaining 18 HTML pages"
priority: P2
severity: low
status: completed
source: worker_001_suggestion
file: marketplace/frontend/
created: "2026-03-09T22:00:00Z"
execution_hint: parallel
context_group: design_system
group_reason: "Pure CSS migration work — independent of all feature tasks"
---

# Complete CSS design system migration on remaining 18 HTML pages

**Priority:** P2 (low)
**Source:** Worker 001 suggestion (task 008-P1-unified-design-system.md completion notes)
**Location:** marketplace/frontend/*.html

## Problem

The unified CSS design system (variables.css + base.css) was applied to 15 core pages in commit 29b9f65. Worker 001 noted that 18 HTML pages still have inline `:root` blocks with hardcoded CSS variables that duplicate or conflict with the new design tokens in `variables.css`.

Pages with inline `:root` blocks that still need migration:
- `manage-books.html`
- `setup.html`
- `components.html`
- `store-example.html`
- Brand master-templates and showcase pages
- Any remaining pages with duplicate `:root {}` definitions

## How to Fix

1. **Audit remaining pages:** Find all `.html` files in `marketplace/frontend/` that have inline `<style>` blocks with `:root {` declarations.

2. **For each page:**
   - Add `<link rel="stylesheet" href="styles/variables.css">` and `<link rel="stylesheet" href="styles/base.css">` to `<head>` if not present
   - Remove the inline `:root { }` block (its vars are now in variables.css)
   - Map any page-specific CSS variables to their canonical equivalents from variables.css
   - If a variable is page-specific (not in variables.css), keep it but move to a scoped style block

3. **Brand master-templates:** In `marketplace/frontend/brands/*/templates/`, link variables.css and remove inline `:root` blocks. These use `{{VARIABLE}}` template syntax — don't break substitution.

4. **Verify:** After migration, load each page in a browser (or run visual diff) to confirm no styling regressions.

## Acceptance Criteria

- [ ] All `marketplace/frontend/*.html` pages link `styles/variables.css` and `styles/base.css`
- [ ] No inline `:root {}` blocks duplicating variables already in variables.css
- [ ] Brand master-template pages still render correctly with template variable substitution
- [ ] No visual regressions on migrated pages (compare before/after screenshots or code review)

## Notes

_Follow-up to task 008-P1-unified-design-system.md (commit 29b9f65). Worker noted "18 remaining HTML pages still have inline :root blocks that could be migrated in a follow-up pass."_
