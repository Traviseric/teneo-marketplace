---
id: 95
title: "Replace newsletter.js localStorage stub with real API"
priority: P3
severity: low
status: completed
source: overnight_tasks
file: marketplace/frontend/js/newsletter.js
created: "2026-02-28T12:00:00"
execution_hint: parallel
context_group: frontend_stubs
group_reason: "Same frontend stub fixes group as task 096"
---

# Replace newsletter.js localStorage stub with real API

**Priority:** P3 (low)
**Source:** overnight_tasks (OVERNIGHT_TASKS.md P3 section)
**Location:** marketplace/frontend/js/newsletter.js

## Problem

`marketplace/frontend/js/newsletter.js` uses `setTimeout + localStorage` with no backend API call. Newsletter signups are stored only in the browser's localStorage — they're lost when the user clears storage, never reach the server, and don't appear in admin subscriber lists.

```js
// Current: stores in localStorage only
const subscribers = JSON.parse(localStorage.getItem('newsletter_subscribers') || '[]');
```

## How to Fix

1. Replace `handleNewsletterSubmit()` with a real API call:
   ```js
   async function handleNewsletterSubmit(event) {
     event.preventDefault();
     const email = document.getElementById('newsletter-email').value;
     const name = document.getElementById('newsletter-name')?.value || '';

     try {
       const response = await fetch('/api/email/subscribe', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ email, name, source: 'newsletter_widget' })
       });
       const data = await response.json();
       if (data.success) {
         showMessage('Thank you for subscribing!', 'success');
       } else {
         showMessage(data.error || 'Subscription failed. Please try again.', 'error');
       }
     } catch (err) {
       showMessage('Network error. Please try again.', 'error');
     }
   }
   ```

2. Remove all localStorage references (no longer needed)
3. Remove the demo `getSubscribers()` function that reads from localStorage
4. Verify `POST /api/email/subscribe` exists in emailMarketingService routes (it should from prior tasks)

## Acceptance Criteria

- [ ] Newsletter form submits to /api/email/subscribe endpoint
- [ ] localStorage code removed
- [ ] Success/error messages still work
- [ ] Subscriber appears in email_subscribers table after form submit

## Notes

_From OVERNIGHT_TASKS.md P3 section. Simple wiring fix — the backend endpoint already exists._
