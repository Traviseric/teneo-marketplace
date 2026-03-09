---
id: 16
title: "Fix storefront fulfill webhook signature bypass (CWE-306)"
priority: P1
severity: high
status: completed
source: security_audit
file: marketplace/backend/routes/storefront.js
line: 411
created: "2026-03-06T12:00:00Z"
execution_hint: sequential
context_group: checkout_security
group_reason: "Same storefront/checkout security area as task 018"
---

# Fix storefront fulfill webhook signature bypass (CWE-306)

**Priority:** P1 (high)
**Source:** security_audit
**CWE:** CWE-306 (Missing Authentication for Critical Function)
**Location:** `marketplace/backend/routes/storefront.js:411`

## Problem

`POST /api/storefront/fulfill` only enforces webhook signature verification when (a) the body arrives as a raw Buffer AND (b) `ARXMINT_WEBHOOK_SECRET` is configured. If the body is parsed JSON (body-parser ran first) or `webhookSecret` is unset, the signature check is bypassed entirely. Any caller can trigger order fulfillment and cause download links to be sent.

**Code with issue:**
```javascript
let body;
if (Buffer.isBuffer(req.body)) {
  // Verify webhook signature if ArxMint
  const isValid = arxmintProvider.verifyWebhook(req.body, req.headers);
  if (arxmintProvider.webhookSecret && !isValid) {
    console.warn('[Fulfill] Invalid webhook signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }
  // ... else: if body is NOT a Buffer, signature check is skipped entirely
```

The check is doubly conditional: `Buffer.isBuffer(req.body)` AND `arxmintProvider.webhookSecret`. Either condition failing results in no auth check.

## How to Fix

1. Make the signature check mandatory when `ARXMINT_WEBHOOK_SECRET` is set, regardless of body type:
```javascript
// Always verify if secret is configured — fail closed
if (arxmintProvider.webhookSecret) {
  const bodyBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
  const isValid = arxmintProvider.verifyWebhook(bodyBuffer, req.headers);
  if (!isValid) {
    console.warn('[Fulfill] Invalid webhook signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }
}
```

2. Additionally, fail closed in production when no secret is configured:
```javascript
if (process.env.NODE_ENV === 'production' && !arxmintProvider.webhookSecret) {
  console.error('[Fulfill] ARXMINT_WEBHOOK_SECRET not set — rejecting unauthenticated fulfill request');
  return res.status(401).json({ error: 'Webhook authentication not configured' });
}
```

3. Add `ARXMINT_WEBHOOK_SECRET` to `.env.example` with a comment explaining it is required in production.

## Acceptance Criteria

- [ ] Signature check runs regardless of whether body arrived as Buffer or parsed JSON
- [ ] In production (`NODE_ENV=production`), requests are rejected if `ARXMINT_WEBHOOK_SECRET` is not set
- [ ] Valid signed requests still work correctly
- [ ] `ARXMINT_WEBHOOK_SECRET` documented in `.env.example`
- [ ] No regressions in existing tests

## Notes

_Generated from security_audit finding (CWE-306). The fulfill endpoint can trigger download emails — unauthenticated access is a direct business impact (fraudulent downloads)._
