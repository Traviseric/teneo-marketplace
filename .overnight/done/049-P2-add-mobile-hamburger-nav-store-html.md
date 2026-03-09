---
id: 49
title: "Add mobile hamburger nav to store.html (missing below 640px)"
priority: P2
severity: medium
status: completed
source: ux_audit
file: marketplace/frontend/store.html
line: 341
created: "2026-03-06T00:00:00Z"
execution_hint: sequential
context_group: store_ux
group_reason: "store.html UX fixes — same file as tasks 046, 047"
---

# Add mobile hamburger nav to store.html

**Priority:** P2 (medium)
**Source:** ux_audit
**Location:** marketplace/frontend/store.html:341

## Problem

`store.html` has no mobile hamburger menu. At 768px the nav links compress to `gap:1rem`, but on very small screens (320–375px) navigation items overflow or become unreadable. There is no mobile-specific nav collapse pattern.

The `openbazaar-site/index.html` landing page already has a working hamburger pattern — store.html should match it.

**Code with issue:**
```css
/* store.html nav — no @media breakpoint with hamburger */
.nav-links { display: flex; gap: 1rem; }
/* Links stay visible at all widths, overflowing on mobile */
```

## How to Fix

1. Read `openbazaar-site/index.html` nav section to understand the existing hamburger pattern.

2. Add hamburger button to `store.html` nav:
   ```html
   <button
     id="mobile-nav-toggle"
     class="hamburger-btn"
     aria-label="Toggle navigation"
     aria-expanded="false"
     aria-controls="nav-links-list"
     style="display:none">
     &#9776;
   </button>
   <ul id="nav-links-list" class="nav-links">...</ul>
   ```

3. Add CSS for breakpoint < 640px:
   ```css
   @media (max-width: 639px) {
     .hamburger-btn { display: block; }
     .nav-links {
       display: none;
       flex-direction: column;
       position: absolute;
       top: 100%;
       left: 0;
       right: 0;
       background: var(--bg-color, #fff);
       box-shadow: 0 4px 8px rgba(0,0,0,0.1);
       z-index: 100;
     }
     .nav-links.open { display: flex; }
   }
   ```

4. Add toggle JS:
   ```js
   document.getElementById('mobile-nav-toggle').addEventListener('click', () => {
     const nav = document.getElementById('nav-links-list');
     const btn = document.getElementById('mobile-nav-toggle');
     const isOpen = nav.classList.toggle('open');
     btn.setAttribute('aria-expanded', isOpen);
   });
   ```

## Acceptance Criteria

- [ ] Hamburger button appears on screens ≤ 639px
- [ ] Nav links hidden by default on mobile, revealed on toggle
- [ ] Toggle button has `aria-expanded` updated on open/close
- [ ] Nav closes when a link is clicked (on mobile)
- [ ] Desktop layout (≥ 640px) unchanged
- [ ] Consistent visual style with existing nav

## Notes

_Generated from ux_audit finding: "store.html:341 — Navigation has no hamburger menu for mobile viewports. Nav items overflow on small screens (320-375px)."_
