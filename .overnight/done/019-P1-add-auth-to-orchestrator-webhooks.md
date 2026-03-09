---
id: 19
title: "Add HMAC auth to orchestrator webhook endpoints (CWE-306)"
priority: P1
severity: medium
status: completed
source: security_audit
file: marketplace/backend/routes/webhooks.js
line: 147
created: "2026-03-06T12:00:00Z"
execution_hint: parallel
context_group: auth_security
group_reason: "Auth/security area — same group as session fixation task"
---

# Add HMAC auth to orchestrator webhook endpoints (CWE-306)

**Priority:** P1 (medium)
**Source:** security_audit
**CWE:** CWE-306 (Missing Authentication for Critical Function)
**Location:** `marketplace/backend/routes/webhooks.js:147`

## Problem

`POST /webhooks/orchestrator/book-generated` and `POST /webhooks/orchestrator/seo-generated` have no authentication or signature verification. An attacker can call these endpoints to inject arbitrary books into the catalog or overwrite SEO content without any credential.

The brand-created webhook (`/webhooks/orchestrator/brand-created`) has the same issue. All three orchestrator webhooks are fully open.

**Code with issue:**
```javascript
router.post('/orchestrator/book-generated', async (req, res) => {
  console.log('Webhook received: book-generated');
  // No auth check — any caller can inject books
```

Compare with Stripe webhooks which correctly verify `stripe-signature` header.

## How to Fix

Add a shared secret header check to all orchestrator webhook routes. Use `ORCHESTRATOR_WEBHOOK_SECRET` env var:

```javascript
// Add this middleware at the top of the orchestrator section (or as a router-level middleware):
const verifyOrchestratorSecret = (req, res, next) => {
  const secret = process.env.ORCHESTRATOR_WEBHOOK_SECRET;
  if (!secret) {
    // In production, reject if not configured
    if (process.env.NODE_ENV === 'production') {
      return res.status(401).json({ error: 'Webhook authentication not configured' });
    }
    // In dev, allow (but log a warning)
    console.warn('[Orchestrator Webhook] ORCHESTRATOR_WEBHOOK_SECRET not set — open access in dev mode');
    return next();
  }
  const providedSecret = req.headers['x-orchestrator-secret'] || req.headers['authorization'];
  if (providedSecret !== `Bearer ${secret}` && providedSecret !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Apply to all orchestrator routes:
router.post('/orchestrator/brand-created', verifyOrchestratorSecret, async (req, res) => { ... });
router.post('/orchestrator/book-generated', verifyOrchestratorSecret, async (req, res) => { ... });
router.post('/orchestrator/seo-generated', verifyOrchestratorSecret, async (req, res) => { ... });
```

Then add to `.env.example`:
```env
# Orchestrator Integration
ORCHESTRATOR_WEBHOOK_SECRET=your-shared-secret-here
```

## Acceptance Criteria

- [ ] All 3 orchestrator webhook endpoints require `x-orchestrator-secret` header or Bearer token
- [ ] Requests without the correct secret return 401
- [ ] In dev mode (no secret set), requests are allowed but a warning is logged
- [ ] In production mode, requests are rejected if secret is not configured
- [ ] `ORCHESTRATOR_WEBHOOK_SECRET` added to `.env.example`
- [ ] No regressions in existing tests

## Notes

_Generated from security_audit finding (CWE-306). An unauthenticated book injection endpoint can be used to inject spam/malicious content into the product catalog. Simple shared secret is sufficient for this internal-facing integration._
