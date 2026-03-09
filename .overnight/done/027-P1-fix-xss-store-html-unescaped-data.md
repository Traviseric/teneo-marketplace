---
id: 27
title: "Fix XSS vulnerability — escape user data before innerHTML in store.html"
priority: P1
severity: critical
status: completed
source: ux_audit
file: marketplace/frontend/store.html
line: 488
created: "2026-03-06T14:00:00Z"
execution_hint: parallel
context_group: frontend_store
group_reason: "Frontend store.html fixes — same file as tasks 034"
---

# Fix XSS vulnerability — escape user data before innerHTML in store.html

**Priority:** P1 (critical)
**Source:** ux_audit
**Location:** marketplace/frontend/store.html:488

## Problem

Book cards are rendered via `innerHTML` with unescaped user data injected directly into HTML strings. The fields `book.id`, `book.title`, `book.author`, and `book.description` are inserted raw into template literals used with `innerHTML`. This is a stored XSS vector: if any book title/author/description contains `<script>` tags or event attributes, they execute in the user's browser. It also causes unpredictable rendering when titles contain quotes or special characters.

**Code with issue:**
```javascript
// store.html line 488 (approximate)
bookCard.innerHTML = `
  <div class="book-card" onclick="viewBook('${book.id}')">
    <h3>${book.title}</h3>
    <p class="author">${book.author}</p>
    <p class="description">${book.description}</p>
    <button>Purchase Now</button>
  </div>
`;
```

## How to Fix

Add an HTML escaping utility and use `textContent`/`createElement` instead of raw `innerHTML`, or sanitize all fields before injection:

```javascript
function encodeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

Then replace all `${book.title}`, `${book.author}`, `${book.description}`, `${book.id}` in innerHTML template literals with `${encodeHTML(book.title)}` etc.

Alternatively, use `createElement`/`textContent` for any field displayed as text (preferred for title, author, description), and only use `encodeHTML` for fields used in HTML attributes (e.g., onclick, data-id).

## Acceptance Criteria

- [ ] `encodeHTML()` utility function defined once at top of store.html JS section (or imported)
- [ ] All `book.*` fields escaped before use in `innerHTML` template literals
- [ ] Book `id` used in onclick/data attributes is also escaped
- [ ] Store page still displays book cards correctly after fix
- [ ] No raw user-controlled data appears unescaped in innerHTML

## Notes

_Generated from ux_audit critical finding: "Book cards rendered via innerHTML with unescaped user data". This is also a security issue (XSS), not just a UX issue — treat as P1._
