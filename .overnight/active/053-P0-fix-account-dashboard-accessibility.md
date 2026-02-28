---
id: 53
title: "Fix account dashboard accessibility in account-dashboard.html"
priority: P0
severity: critical
status: completed
source: ux_audit
file: marketplace/frontend/account-dashboard.html
line: 279
created: "2026-02-28T10:00:00"
execution_hint: sequential
context_group: frontend_accessibility
group_reason: "Same accessibility pattern fixes as other frontend accessibility tasks"
---

# Fix account dashboard accessibility in account-dashboard.html

**Priority:** P0 (critical)
**Source:** ux_audit
**Location:** marketplace/frontend/account-dashboard.html:279

## Problem

**1. User avatar has no accessible name (line 279, CRITICAL):**
The user avatar is rendered as a generic `div` containing the text "?" with no semantic role, `aria-label`, or alt text. Screen readers read out a meaningless "?" with no context about it being an avatar or profile image.

**2. Section header icons lack aria-hidden (line 289, medium):**
```html
<i class="fas fa-receipt"></i> Order History
```
Font Awesome icons used as section type indicators lack `aria-label` or `aria-hidden`. Screen readers either skip them or read meaningless class names like "fas fa-receipt".

**3. Orders API fetch missing r.ok check (line 347, medium):**
```javascript
fetch('/api/orders').then(r => r.json())
```
No check of `r.ok` before parsing JSON. If the server returns a 4xx or 5xx error with an HTML body, the JSON parse fails silently with a cryptic error — users get no helpful feedback.

## How to Fix

**Fix 1 — Avatar accessible name:**
```html
<!-- Before -->
<div class="avatar">?</div>

<!-- After -->
<div class="avatar" role="img" aria-label="User avatar">?</div>
```
When a real profile picture is available:
```html
<img src="${user.avatar}" alt="Profile photo for ${user.name}" class="avatar">
```

**Fix 2 — Decorative icons:**
```html
<!-- Add aria-hidden="true" to all decorative icons -->
<i class="fas fa-receipt" aria-hidden="true"></i>
<span class="sr-only">Order History</span>

<!-- Same pattern for all section icons throughout the dashboard -->
```

Add CSS utility class if not already present:
```css
.sr-only {
  position: absolute; width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0,0,0,0); white-space: nowrap; border: 0;
}
```

**Fix 3 — r.ok check:**
```javascript
fetch('/api/orders')
  .then(r => {
    if (!r.ok) throw new Error('Failed to load orders: ' + r.statusText);
    return r.json();
  })
  .then(data => renderOrders(data))
  .catch(err => {
    ordersContainer.innerHTML = '<p class="error">Unable to load orders. Please refresh the page.</p>';
    console.error('Orders fetch failed:', err);
  });
```

## Acceptance Criteria

- [ ] Avatar div has `role="img"` and `aria-label="User avatar"` (or uses `<img>` with alt text)
- [ ] All decorative Font Awesome icons have `aria-hidden="true"`
- [ ] Section icons have visually-hidden text labels for screen readers
- [ ] Orders API fetch validates `r.ok` before calling `.json()`
- [ ] Error state shows user-friendly message in the orders section
- [ ] No visual regressions in dashboard layout
- [ ] WCAG 1.1.1 violations resolved

## Notes

_Generated from ux_audit findings (3 merged: critical×1 + medium×2). WCAG violations: 1.1.1 (Non-text Content), 1.1.1 (decorative icons)._
