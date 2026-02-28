---
id: 30
title: "Add HTML escaping to emailService.js templates for user-supplied values"
priority: P2
severity: low
status: completed
source: security_audit
file: marketplace/backend/services/emailService.js
line: 191
created: "2026-02-28T06:00:00"
execution_hint: parallel
context_group: independent
group_reason: "Self-contained fix in emailService.js, no dependency on other tasks"
cwe: CWE-79
---

# Add HTML escaping to emailService.js templates for user-supplied values

**Priority:** P2 (low)
**Source:** security_audit
**Location:** marketplace/backend/services/emailService.js:191

## Problem

Email HTML templates directly interpolate user-supplied data (bookTitle, bookAuthor, orderId, downloadUrl, etc.) into HTML strings without escaping. If any of these fields contain HTML/script tags (e.g., a book title like `<script>alert(1)</script>`), the resulting email would contain malicious HTML.

**Code with issue:**
```javascript
// emailService.js line 191
<div class="book-title">${bookTitle}</div>
<div class="book-author">by ${bookAuthor}</div>
```

While most email clients strip `<script>` tags, HTML injection can still:
- Manipulate email layout (inject extra HTML elements)
- Override styles
- Inject misleading links/content that looks like it's from the email author
- Cause issues with email clients that render HTML more permissively

Book titles and author names are stored in the database and may contain user-controlled or externally-sourced data.

## How to Fix

Add an `escapeHtml` helper function and apply it to all user-supplied values in email templates:

```javascript
// Add this helper near the top of emailService.js:
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

// Then apply to all template interpolations:
<div class="book-title">${escapeHtml(bookTitle)}</div>
<div class="book-author">by ${escapeHtml(bookAuthor)}</div>
<div class="order-id">${escapeHtml(orderId)}</div>
// etc. for ALL user-supplied values in all email template methods
```

Apply `escapeHtml()` to every user-supplied value in every email template method in the file (order confirmation, download link, magic link, etc.). Fixed values (like button labels, static text) do not need escaping.

## Acceptance Criteria

- [ ] `escapeHtml()` helper function added to emailService.js
- [ ] All user-supplied values (bookTitle, bookAuthor, orderId, userEmail, etc.) wrapped with `escapeHtml()` in all template methods
- [ ] Static text/labels in templates left unchanged (no unnecessary escaping)
- [ ] A book title like `<b>Test</b>` renders as literal text `<b>Test</b>` in email, not as bold
- [ ] Existing email template rendering not broken (send a test email)

## Notes

_Generated from security_audit findings. CWE-79: Cross-site Scripting (applied to email HTML context). Low severity since most email clients filter scripts, but HTML injection is still a real risk. Simple 5-minute fix — add helper + search-replace all template interpolations._
