---
id: 20
title: "Fix session fixation in auth routes — call req.session.regenerate() (CWE-384)"
priority: P2
severity: medium
status: completed
source: security_audit
file: marketplace/backend/routes/auth.js
line: 199
created: "2026-03-06T12:00:00Z"
execution_hint: sequential
context_group: auth_security
group_reason: "Auth security area — same group as orchestrator webhook auth task"
---

# Fix session fixation in auth routes — call req.session.regenerate() (CWE-384)

**Priority:** P2 (medium)
**Source:** security_audit
**CWE:** CWE-384 (Session Fixation)
**Location:** `marketplace/backend/routes/auth.js:199` (OAuth), `auth.js:233` (magic link), `auth.js:313` (Nostr)

## Problem

After successful authentication in all three auth flows (OAuth callback, magic link, Nostr), the existing session ID is not regenerated. An attacker who can set a victim's session cookie before login (e.g., via network interception, session fixation attack, or a shared browser) can take over the authenticated session.

**Code with issue (OAuth callback, line 199):**
```javascript
req.session.userId = user.id;
req.session.isAuthenticated = true;
// Session ID is the SAME before and after login — session fixation risk
```

Same pattern at lines 233 (magic link) and 313 (Nostr).

## How to Fix

Call `req.session.regenerate()` before setting session properties after successful authentication. `express-session` supports this natively:

```javascript
// Replace the direct session assignment with:
req.session.regenerate((err) => {
  if (err) {
    console.error('Session regeneration failed:', err);
    return res.status(500).json({ error: 'Authentication error' });
  }
  // Now safe to set session properties — new session ID issued
  req.session.userId = user.id;
  req.session.isAuthenticated = true;
  req.session.email = user.email;
  // Continue with redirect or response...
  res.redirect('/account-dashboard.html');
});
```

Apply this pattern to all 3 authentication success paths in `auth.js`:
1. OAuth callback (around line 199)
2. Magic link verification (around line 233)
3. Nostr verification (around line 313)

Note: `regenerate()` is async (callback-based). If the surrounding code uses async/await, promisify it:
```javascript
await new Promise((resolve, reject) => req.session.regenerate(err => err ? reject(err) : resolve()));
```

## Acceptance Criteria

- [ ] OAuth callback calls `req.session.regenerate()` before setting session properties
- [ ] Magic link verification calls `req.session.regenerate()` before setting session properties
- [ ] Nostr verification calls `req.session.regenerate()` before setting session properties
- [ ] Session ID changes after login (verify in browser dev tools: session cookie value differs before/after login)
- [ ] No regressions in auth flow — login still works end-to-end
- [ ] Existing auth tests still pass

## Notes

_Generated from security_audit finding (CWE-384). Session fixation is a well-known attack. Adding `regenerate()` is a one-line fix per auth path. express-session makes this trivial._
