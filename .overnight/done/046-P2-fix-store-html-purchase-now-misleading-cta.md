---
id: 46
title: "Fix 'Purchase Now' button in store.html — misleading CTA navigates to detail page not checkout"
priority: P2
severity: high
status: completed
source: ux_audit
file: marketplace/frontend/store.html
line: 502
created: "2026-03-06T00:00:00Z"
execution_hint: sequential
context_group: store_ux
group_reason: "store.html UX fixes — same file as tasks 047, 049"
---

# Fix 'Purchase Now' button in store.html — misleading CTA

**Priority:** P2 (high)
**Source:** ux_audit
**Location:** marketplace/frontend/store.html:502

## Problem

Book cards in `store.html` contain a `<button>` labeled "Purchase Now" nested inside a `<div onclick='viewBook()'>`. Clicking the button triggers the parent onclick which routes to `/book-detail.html`, NOT the checkout page. The button label says "Purchase Now" but the actual action is navigating to a detail page — this is a misleading flow that will confuse buyers and hurt conversion.

**Code with issue:**
```html
<div onclick="viewBook(book.id)" ...>
  ...
  <button class="...">Purchase Now</button>
</div>
```

The `<button>` has no separate click handler, so it falls through to the parent div's `onclick` which navigates to the book detail page. The label "Purchase Now" implies immediate checkout, not navigation.

## How to Fix

Two options — pick the cleaner one based on the current book card markup:

**Option A (preferred):** Change the button label to "View Details" to accurately describe the action. The card navigating to the book detail page is fine — the checkout button lives on the detail page.

```html
<button class="...">View Details</button>
```

**Option B:** Wire the button directly to checkout (skip detail page for impulse purchases). Only do this if checkout can happen without the detail page context (price, product ID all available in card data).

Either way:
- Remove the parent div's `onclick` wrapper and make the card an `<a href="/book-detail.html?id=...">` element instead (this is also the keyboard accessibility pattern from task 034's approach)
- Ensure the button either navigates the whole card OR has its own `onclick` that stops event propagation and goes to checkout

## Acceptance Criteria

- [ ] Button label accurately describes the action (no "Purchase Now" on a navigation action)
- [ ] Parent div onclick removed or card converted to `<a>` element
- [ ] Clicking the button/card navigates to the intended destination
- [ ] No event propagation conflicts between card and button

## Notes

_Generated from ux_audit finding: "store.html:502 — Book cards contain a button ('Purchase Now') nested inside a div onclick('viewBook()'). Clicking the button triggers the parent onclick which routes to /book-detail.html, not the checkout page."_
