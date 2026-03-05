---
id: 104
title: "Expand auth and payment integration tests (+15 tests)"
priority: P3
severity: low
status: completed
source: OVERNIGHT_TASKS.md
file: marketplace/backend/tests/
line: null
created: "2026-02-28T18:00:00Z"
execution_hint: parallel
context_group: test_suite
group_reason: "Standalone test file additions; no overlap with task 103"
---

# Expand Auth and Payment Integration Tests

**Priority:** P3 (low)
**Source:** OVERNIGHT_TASKS.md (follow-on to task 097)
**Location:** `marketplace/backend/tests/`

## Problem

The current test suite has 101 passing tests across 12 suites. Several critical auth and payment paths are not covered by automated tests:

1. **Magic link auth flow** — token generation, expiry enforcement, session creation from valid token
2. **Stripe webhook idempotency** — duplicate event handling (same event delivered twice should not double-fulfill)
3. **Lulu POD sandbox** — order creation and shipping calculation in sandbox mode

These paths handle revenue and authentication, making them high-value test targets.

## How to Fix

Create `marketplace/backend/tests/auth-integration.test.js`:

```javascript
const request = require('supertest');
const app = require('../server');

describe('Magic Link Auth Flow', () => {
    test('POST /api/auth/magic-link generates a token', async () => { ... });
    test('Magic link token expires after TTL', async () => { ... });
    test('Valid token creates session on GET /api/auth/verify', async () => { ... });
    test('Expired token returns 401', async () => { ... });
    test('Invalid token returns 401', async () => { ... });
});
```

Create `marketplace/backend/tests/stripe-webhook-idempotency.test.js`:

```javascript
describe('Stripe Webhook Idempotency', () => {
    test('checkout.session.completed processed once on first delivery', async () => { ... });
    test('checkout.session.completed duplicate delivery does not double-fulfill order', async () => { ... });
    test('payment_intent.payment_failed updates order status to failed', async () => { ... });
});
```

Create `marketplace/backend/tests/lulu-pod.test.js` (or add to existing Lulu tests):

```javascript
describe('Lulu POD Sandbox', () => {
    test('createPrintJob() constructs correct Lulu API payload', async () => { ... });
    test('calculateShipping() returns cost for given address and format', async () => { ... });
    test('getPrintJobStatus() returns status for existing job', async () => { ... });
});
```

**Implementation guidance:**
- Use `jest.mock()` for external services (Stripe, Lulu API)
- For auth tests, import the auth service directly and test token generation/validation
- For Stripe webhook idempotency, check if `payment_events` table de-duplication exists; if not, add it
- For Lulu sandbox, use `nock` or `jest.mock` to intercept HTTP calls to `api.lulu.com`

## Acceptance Criteria

- [ ] At least 15 new tests added across the 3 areas
- [ ] All new tests pass
- [ ] Total test count reaches ≥116 passing
- [ ] Test files follow existing naming pattern (`*.test.js` in `tests/`)
- [ ] No existing tests broken

## Notes

_Generated from OVERNIGHT_TASKS.md P3 item — follow-on to task 097 test suite expansion. Target: bring total from 101 to 116+ passing._
