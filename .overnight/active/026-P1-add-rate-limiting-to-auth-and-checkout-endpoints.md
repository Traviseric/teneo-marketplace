---
id: 26
title: "Add rate limiting to user auth and checkout create-session endpoints"
priority: P1
severity: medium
status: completed
source: security_audit
file: marketplace/backend/routes/auth.js
line: 86
created: "2026-02-28T06:00:00"
execution_hint: parallel
context_group: server_hardening
group_reason: "Rate limiting middleware — parallel with task 025 (helmet). Both add middleware to server.js or route files."
cwe: CWE-307+CWE-770
---

# Add rate limiting to user auth and checkout create-session endpoints

**Priority:** P1 (medium)
**Source:** security_audit
**Locations:** marketplace/backend/routes/auth.js:86, marketplace/backend/routes/checkout.js:8

## Problem

Two rate-limiting gaps exist:

**1. User auth routes (auth.js:86) — CWE-307:**
The `/api/auth/login` and `/api/auth/register` endpoints have no rate limiting. An attacker can:
- Enumerate valid email addresses via unlimited login attempts
- Flood victims' inboxes with magic link emails (email bombing)
- Incur excessive email sending costs (SendGrid/Mailgun rate limits and billing)
- Brute-force magic link tokens via `/api/auth/verify-magic-link`

The admin login has a rate limiter (`loginLimiter`), but user auth routes do not.

```javascript
// auth.js line 86 — no rate limiter applied:
router.post('/login', async (req, res) => {
  try {
    const { email } = req.body;
    const result = await authProvider.login(email);
```

**2. Checkout create-session (checkout.js:8) — CWE-770:**
The Stripe checkout session creation endpoint has no rate limiting. An attacker can create unlimited pending Stripe sessions, leading to Stripe API quota abuse and resource exhaustion.

```javascript
// checkout.js line 8:
router.post('/create-session', async (req, res) => {
```

## How to Fix

Add per-IP rate limiters to both sets of routes. The `express-rate-limit` package is already in `package.json` and used for `loginLimiter` in auth.js.

**For auth routes (auth.js):**
```javascript
const rateLimit = require('express-rate-limit');

// Magic link / login rate limiter (5 attempts per 15 min per IP)
const magicLinkLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { success: false, error: 'Too many auth requests. Please wait 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply to all user auth endpoints:
router.post('/login', magicLinkLimiter, async (req, res) => { ... });
router.post('/register', magicLinkLimiter, async (req, res) => { ... });
router.get('/verify-magic-link', magicLinkLimiter, async (req, res) => { ... });
router.post('/verify-magic-link', magicLinkLimiter, async (req, res) => { ... });
```

**For checkout create-session (checkout.js):**
```javascript
const rateLimit = require('express-rate-limit');

// Checkout session rate limiter (10 per hour per IP)
const checkoutLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: { success: false, error: 'Too many checkout attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post('/create-session', checkoutLimiter, async (req, res) => { ... });
```

## Acceptance Criteria

- [ ] Rate limiter applied to `/api/auth/login` (max 5/15min per IP)
- [ ] Rate limiter applied to `/api/auth/register` (max 5/15min per IP)
- [ ] Rate limiter applied to `/api/auth/verify-magic-link` (max 5/15min per IP)
- [ ] Rate limiter applied to `/checkout/create-session` (max 10/hour per IP)
- [ ] Exceeding limit returns 429 with descriptive error message
- [ ] Normal auth flow still works (rate limit is not too strict for legitimate use)
- [ ] Existing `loginLimiter` on admin routes is unchanged

## Notes

_Generated from security_audit findings. Two separate findings merged: CWE-307 (auth rate limiting) + CWE-770 (checkout resource exhaustion). Same fix pattern (express-rate-limit) already used in the codebase for admin login._
