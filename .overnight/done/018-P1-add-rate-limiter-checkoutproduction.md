---
id: 18
title: "Add rate limiter to checkoutProduction.js POST /create-session"
priority: P1
severity: high
status: completed
source: code_quality_audit
file: marketplace/backend/routes/checkoutProduction.js
line: 31
created: "2026-03-06T12:00:00Z"
execution_hint: sequential
context_group: checkout_security
group_reason: "Same checkout/security area as task 016"
---

# Add rate limiter to checkoutProduction.js POST /create-session

**Priority:** P1 (high)
**Source:** code_quality_audit
**Location:** `marketplace/backend/routes/checkoutProduction.js:31`

## Problem

The production Stripe checkout route `POST /create-session` in `checkoutProduction.js` has no rate limiter. The dev version `checkout.js` applies `checkoutLimiter` (10 requests/hour per IP), but `checkoutProduction.js` skips it entirely, leaving the production Stripe session endpoint unprotected against abuse.

An attacker can spam `POST /create-session` to create thousands of Stripe sessions (causing API rate limit hits on Stripe), enumerate product IDs, or stress-test the server.

**Code with issue:**
```javascript
// checkoutProduction.js line 31 — POST handler with no rate limiting
router.post('/create-session', async (req, res) => {
  // No checkoutLimiter middleware applied
```

Compare with checkout.js which correctly applies:
```javascript
router.post('/create-session', checkoutLimiter, async (req, res) => {
```

## How to Fix

1. Import or define the same `checkoutLimiter` rate limiter used in `checkout.js`:
```javascript
const rateLimit = require('express-rate-limit');
const checkoutLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,                    // 10 requests per IP per hour
  message: { error: 'Too many checkout attempts. Please try again in an hour.' }
});
```

2. Apply it to the POST /create-session route:
```javascript
router.post('/create-session', checkoutLimiter, async (req, res) => {
```

Note: `express-rate-limit` is already in `package.json` — no new dependency needed.

Alternatively, extract the shared `checkoutLimiter` into a middleware file and import it in both checkout files (reduces duplication).

## Acceptance Criteria

- [ ] `POST /create-session` in `checkoutProduction.js` is rate-limited (max 10/hr per IP)
- [ ] Rate limit parameters match `checkout.js` (or are stricter)
- [ ] `express-rate-limit` import confirmed present (no new dep needed)
- [ ] Rate limiter returns a clear 429 error message, not a 500
- [ ] No regressions in existing tests

## Notes

_Generated from code_quality_audit finding. This is effectively a security issue — rate limiting on financial endpoints prevents abuse. `checkout.js` does it right; `checkoutProduction.js` was an oversight._
