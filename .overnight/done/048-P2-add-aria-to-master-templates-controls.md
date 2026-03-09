---
id: 48
title: "Add ARIA attributes to master-templates/index.html interactive controls"
priority: P2
severity: medium
status: completed
source: ux_audit
file: marketplace/frontend/brands/master-templates/index.html
line: 59
created: "2026-03-06T00:00:00Z"
execution_hint: parallel
context_group: accessibility_templates
group_reason: "Template ARIA fixes — same file, independent of store_ux group"
---

# Add ARIA attributes to master-templates/index.html interactive controls

**Priority:** P2 (medium)
**Source:** ux_audit
**Location:** marketplace/frontend/brands/master-templates/index.html

## Problem

The master brand template (`index.html`) has multiple interactive controls with missing ARIA attributes, making them inaccessible to screen reader users. This template is used as the base for all brand storefronts. Four issues:

**1. Mobile menu toggle (line 82):** No `aria-label`, `aria-expanded`, or `aria-controls`.
```html
<button onclick="toggleMobile()"><!-- icon --></button>
```
Screen reader announces as unlabeled button. Menu open/closed state not communicated.

**2. Announcement bar dismiss (line 59):** Button shows only "×" with no accessible name.
```html
<button onclick="dismissAnnouncement()">×</button>
```
Screen readers announce as "times" or unknown symbol.

**3. Testimonial slider dots (line 227):** Navigation dots are `<button>` elements with no text or `aria-label`.
```html
<button class="dot" onclick="goToSlide(0)"></button>
```

**4. Social media icon links (line 276):** Footer social links contain only icon elements with no text or `aria-label`.
```html
<a href="..."><i class="fab fa-facebook"></i></a>
```

## How to Fix

**1. Mobile menu toggle:**
```html
<button
  onclick="toggleMobile()"
  aria-label="Toggle navigation menu"
  aria-expanded="false"
  aria-controls="mobile-nav-menu"
  id="mobile-menu-toggle">
  <!-- icon -->
</button>
<nav id="mobile-nav-menu" ...>...</nav>
```
In `toggleMobile()` JS function, update `aria-expanded` to match open/closed state.

**2. Announcement bar dismiss:**
```html
<button onclick="dismissAnnouncement()" aria-label="Dismiss announcement">×</button>
```

**3. Testimonial dots:**
```html
<button class="dot" onclick="goToSlide(0)" aria-label="Go to testimonial 1" aria-current="true"></button>
<button class="dot" onclick="goToSlide(1)" aria-label="Go to testimonial 2"></button>
```
Update `aria-current` dynamically in the slide navigation JS.

**4. Social media links:**
```html
<a href="..." aria-label="Facebook"><i class="fab fa-facebook" aria-hidden="true"></i></a>
<a href="..." aria-label="Twitter"><i class="fab fa-twitter" aria-hidden="true"></i></a>
<a href="..." aria-label="Instagram"><i class="fab fa-instagram" aria-hidden="true"></i></a>
```
Add `aria-hidden="true"` to icon elements (decorative) and `aria-label` to the link.

## Acceptance Criteria

- [ ] Mobile menu toggle has `aria-label`, `aria-expanded` (dynamically updated), `aria-controls`
- [ ] Announcement dismiss button has `aria-label='Dismiss announcement'`
- [ ] Testimonial dots have descriptive `aria-label` and `aria-current` on active dot
- [ ] Social links have `aria-label` with platform name; icons have `aria-hidden='true'`
- [ ] JS functions updated to maintain ARIA state during interactions

## Notes

_Generated from ux_audit findings: mobile menu WCAG 4.1.2, announcement bar WCAG 4.1.2, testimonial dots WCAG 4.1.2, social links WCAG 2.4.4 / 4.1.2._
