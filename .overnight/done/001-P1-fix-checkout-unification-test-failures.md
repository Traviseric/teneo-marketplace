---
id: 1
title: "Fix checkout unification test failures"
priority: P1
severity: high
status: completed
source: AGENT_TASKS.md
file: marketplace/backend/routes/checkout.js
line: null
created: "2026-03-09T00:00:00"
execution_hint: sequential
context_group: checkout_module
group_reason: "Checkout route was recently unified (d922de6); tests need updating to match new structure"
---

# Fix Checkout Unification Test Failures

**Priority:** P1 (high)
**Source:** AGENT_TASKS.md (preserved non-roadmap work) / review_audit 1f4935d
**Location:** marketplace/backend/routes/checkout.js, marketplace/backend/__tests__/

## Problem

Commit `d922de6` refactored checkout by unifying `checkout.js` and `checkoutProduction.js` into a single route file. The review audit (commit `1f4935d`) confirmed this broke existing tests — 1 task was marked PARTIAL with a note that "checkout unification broke tests".

The test suite likely still references the old file/structure (e.g., importing `checkoutProduction.js` directly, expecting separate Stripe session creation paths, or having mocks that assumed the old module boundaries).

## How to Fix

1. Run `npm test` in `marketplace/backend/` and capture which tests fail
2. Read the failing test files to understand what they expect
3. Read the current `checkout.js` (unified route) to understand the new structure
4. Update test imports, mocks, and assertions to match the unified structure
5. Ensure the unified checkout still passes all the scenarios the old tests covered:
   - Stripe session creation (price validation, metadata sanitization)
   - Crypto checkout fallback path
   - Webhook handling (`checkout.session.completed`)
   - Rate limiting middleware
   - Error handling and `failOrder()` path
6. Run `npm test` again — all tests must pass with no regressions

## Acceptance Criteria

- [ ] All tests in `marketplace/backend/__tests__/` pass
- [ ] No regressions introduced in checkout functionality
- [ ] Test coverage for both Stripe and crypto checkout paths
- [ ] `npm test` exits 0

## Notes

_Generated from AGENT_TASKS.md preserved non-roadmap work. Blocking CI. Commit d922de6 is the source of breakage._
