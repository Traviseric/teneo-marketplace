---
id: 34
title: "Fix book cards keyboard accessibility and misleading button flow in store.html"
priority: P2
severity: critical
status: completed
source: ux_audit
file: marketplace/frontend/store.html
line: 488
created: "2026-03-06T14:00:00Z"
execution_hint: sequential
context_group: frontend_store
group_reason: "Frontend store.html fixes — same file as task 027 (XSS fix)"
---

# Fix book cards keyboard accessibility and misleading button flow in store.html

**Priority:** P2 (critical accessibility + high UX)
**Source:** ux_audit
**Location:** marketplace/frontend/store.html:488, 502

## Problem

Two related issues in store.html book cards:

1. **Book cards are not keyboard accessible (line 488):** Cards are `<div>` elements with `onclick="viewBook('${book.id}')"` handlers but have no `tabindex`, no `role="button"`, and no `keydown` event listener. Keyboard-only users cannot navigate to or activate any book card. This is a WCAG 2.1 Level A failure (2.1.1 Keyboard).

2. **Misleading button label and click conflict (line 502):** Each card has a `<button>` labeled "Purchase Now" nested inside the `<div onclick="viewBook()">`. Clicking the button triggers the parent `onclick` which routes to `/book-detail.html` — NOT to checkout. The button says "Purchase" but the action is navigation to a detail page, confusing users. Additionally, the nested interactive element inside a non-interactive element is HTML spec-invalid.

**Code with issue:**
```javascript
// line 488 (approximate)
bookCard.innerHTML = `
  <div class="book-card" onclick="viewBook('${book.id}')">
    <img src="${book.cover}" alt="${book.title}">
    <h3>${book.title}</h3>
    <p>${book.author}</p>
    <p class="price">$${book.price}</p>
    <button>Purchase Now</button>
  </div>
`;
```

## How to Fix

### Option A (preferred): Convert card to `<a>` element

```javascript
bookCard.innerHTML = `
  <a href="/book-detail.html?id=${encodeURIComponent(book.id)}" class="book-card">
    <img src="${book.cover}" alt="">
    <h3>${book.title}</h3>
    <p class="author">${book.author}</p>
    <p class="price">$${book.price}</p>
    <span class="cta-label" aria-hidden="true">View Details</span>
  </a>
`;
```

- Remove `onclick="viewBook()"` wrapper entirely — the `<a href>` handles navigation
- Remove the nested `<button>` — the entire card is the clickable target
- Add `alt=""` to the image (decorative — title already describes the book)
- Update CSS to style the `<a>` as a card (it will behave like the current div)

### Option B: Keep div, add accessibility attributes

If keeping the `<div onclick>` pattern:
```javascript
bookCard.innerHTML = `
  <div class="book-card" role="button" tabindex="0"
       onclick="viewBook('${encodeURIComponent(book.id)}')"
       onkeydown="if(event.key==='Enter'||event.key===' ')viewBook('${encodeURIComponent(book.id)}')">
    ...
    <span class="cta-label">View Details</span>
  </div>
`;
```

Option A is strongly preferred (simpler, semantic, no JS needed for keyboard).

### Fix the viewBook() function

Whether using Option A or B, ensure `viewBook()` navigates to the book detail page correctly, or if it should go directly to checkout, rename/update both the function and the label to match.

## Acceptance Criteria

- [ ] All book cards are keyboard-focusable and activatable via Enter/Space
- [ ] Tab order reaches every book card in a logical sequence
- [ ] No `<button>` or interactive element nested inside an `<div onclick>` (spec violation)
- [ ] CTA label accurately describes the action ("View Details" if going to book-detail.html)
- [ ] Book cards are navigable via `<a href>` or have correct role/tabindex/keydown pattern
- [ ] Existing visual design of book cards is preserved
- [ ] Works in conjunction with XSS fix (task 027) — both touch the same innerHTML

## Notes

_Generated from ux_audit critical finding (keyboard inaccessible cards), merged with high finding (misleading button label/click conflict). Both issues are in the same book card rendering code — fix together. Coordinate with task 027 (XSS) since both modify the same innerHTML._
