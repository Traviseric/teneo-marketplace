---
id: 11
title: "Add Nostr NIP-07 sign-in button to login.html frontend"
priority: P2
severity: medium
status: completed
source: feature_audit
file: marketplace/frontend/login.html
line: null
created: "2026-03-06T04:00:00Z"
execution_hint: sequential
context_group: auth_module
group_reason: "Auth UI — same area as frontend auth UI task (preserved non-roadmap)"
---

# Add Nostr NIP-07 sign-in button to login.html frontend

**Priority:** P2 (medium)
**Source:** feature_audit
**Location:** `marketplace/frontend/login.html`, `marketplace/backend/routes/auth.js`

## Problem

The Nostr auth backend is complete: `NostrAuthProvider.js` implements NIP-98 HTTP auth verification, and the `/api/auth/nostr/verify` endpoint exists. However, there is no frontend UI for users to sign in with Alby or nos2x (NIP-07 browser extensions).

Users who have a Nostr identity (Alby wallet, nos2x, etc.) cannot authenticate from any page in the app because there is no "Sign in with Nostr" button anywhere.

## How to Fix

1. In `login.html`, add a "Sign in with Nostr" button below or alongside the existing magic link / OAuth options.

2. Wire the button to a JavaScript handler:
```js
async function signInWithNostr() {
  if (!window.nostr) {
    alert('No Nostr extension found. Install Alby or nos2x.');
    return;
  }
  // Create NIP-98 HTTP auth event
  const event = {
    kind: 27235,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['u', window.location.origin + '/api/auth/nostr/verify'],
      ['method', 'POST']
    ],
    content: ''
  };
  const signedEvent = await window.nostr.signEvent(event);
  const authHeader = 'Nostr ' + btoa(JSON.stringify(signedEvent));
  const res = await fetch('/api/auth/nostr/verify', {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json'
    }
  });
  if (res.ok) {
    window.location.href = '/account-dashboard.html';
  } else {
    alert('Nostr sign-in failed.');
  }
}
```

3. Add a button element with click handler:
```html
<button onclick="signInWithNostr()" class="btn-nostr">
  ⚡ Sign in with Nostr
</button>
```

4. Style consistently with other auth buttons on the page.

## Acceptance Criteria

- [ ] "Sign in with Nostr" button is visible on `login.html`
- [ ] Button calls `window.nostr.signEvent` (NIP-07) and sends signed event to `/api/auth/nostr/verify`
- [ ] Successful auth redirects to `/account-dashboard.html`
- [ ] Graceful error when no Nostr extension is present (helpful message, no crash)
- [ ] Works with Alby browser extension in Chrome/Firefox

## Notes

_feature_audit finding: "Nostr Auth (NIP-07) has a complete backend provider but no frontend UI. Users cannot authenticate with Nostr from any page in the app. The backend is ready — this is a frontend-only gap."_
