---
id: 81
title: "Verify and fix accessibility tasks 053-058"
priority: P1
severity: high
status: completed
source: overnight_tasks
file: marketplace/frontend/
created: "2026-02-28T12:00:00"
execution_hint: parallel
context_group: accessibility
group_reason: "Frontend-only spot-checks, can run alongside other tasks"
---

# Verify and fix accessibility tasks 053-058

**Priority:** P1 (high)
**Source:** overnight_tasks (OVERNIGHT_TASKS.md P0 section)
**Location:** marketplace/frontend/

## Problem

Tasks 053-058 were marked completed in a prior session but were not independently verified by review_audit. These accessibility fixes may be incomplete, partial, or incorrectly implemented.

Specific unverified items per OVERNIGHT_TASKS.md:
- **053**: account-dashboard.html — avatar `role` attribute, icon `aria-hidden`, related aria checks
- **054**: course-player.html — captions `<track>`, focus indicators on controls, SVG `<title>`
- **055**: crypto-checkout.html — keyboard-accessible payment method divs (currently click-only)
- **056**: admin-course-builder.html — visible labels on all form inputs
- **057**: downloads.html — `aria-disabled` on button state changes
- **058**: admin.html — table `scope` attributes on column/row headers

## How to Fix

For each file, read the current implementation and verify:
1. Open the file and check for the specific accessibility attributes listed above
2. Test keyboard navigation logic where applicable (tab order, focus management)
3. Fix any missing or incorrect attributes

Specific checks:
- `account-dashboard.html`: Look for `role="img"` on avatar, `aria-hidden="true"` on decorative icons
- `course-player.html`: Look for `<track kind="captions">` in video element, focus-visible CSS for controls
- `crypto-checkout.html`: Payment method divs should have `role="radio"` or `role="button"`, `tabindex="0"`, `onkeydown` handler for Enter/Space
- `admin-course-builder.html`: All `<input>` and `<select>` elements should have associated `<label>` or `aria-label`
- `downloads.html`: Disabled download buttons should have `aria-disabled="true"` when `disabled` attr is set
- `admin.html`: `<th>` elements should have `scope="col"` or `scope="row"`

## Acceptance Criteria

- [ ] All 6 files read and verified
- [ ] Missing accessibility attributes identified and added
- [ ] Keyboard navigation works for interactive elements in crypto-checkout.html
- [ ] No regression to existing functionality

## Notes

_From OVERNIGHT_TASKS.md P0 section. These were "completed" but unverified by review_audit._
