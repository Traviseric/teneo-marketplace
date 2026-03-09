---
id: 5
title: "Fix checkout unification test failures from d922de6"
priority: P1
severity: high
status: completed
source: project_declared
file: marketplace/backend/routes/checkout.js
line: 1
created: "2026-03-09T23:45:00Z"
execution_hint: sequential
context_group: checkout_module
group_reason: "Tests cover checkout.js — same module as tasks 001, 002, 008"
---

# Fix checkout unification test failures from d922de6

**Priority:** P1 (high)
**Source:** project_declared (AGENT_TASKS.md)
**Location:** marketplace/backend/routes/checkout.js, marketplace/backend/__tests__/

## Problem

Commit d922de6 "refactor(checkout): unify checkout.js and checkoutProduction.js into single route" broke some tests. The checkout unification review (commit 1f4935d) notes this as a partial fix — some tests are still failing.

The conductor output confirms: "Checkout unification (d922de6) broke some tests — needs investigation before touching checkout.js."

Workers have been blocked from touching checkout.js because of this. These test failures need to be identified and fixed so checkout can be hardened.

## How to Fix

1. Run the test suite to identify which tests are failing:
   ```bash
   cd marketplace/backend && npm test -- --testPathPattern=checkout
   ```

2. Examine the failing tests and understand what mock/behavior changed in d922de6.

3. Fix the tests to match the new unified checkout behavior. Note: commit 193d89f "fix(tests): add missing updateOrderState mock to storefront test" may have partially addressed this — check if checkout-specific tests still fail.

4. Do NOT change production checkout logic to pass tests — fix the tests to match correct production behavior.

5. After fixing, run the full test suite to ensure no regressions:
   ```bash
   cd marketplace/backend && npm test
   ```

## Acceptance Criteria

- [ ] All checkout-related tests pass
- [ ] No regressions in other test files
- [ ] Test count >= previous count (no tests deleted)
- [ ] Full test suite passes

## Notes

_Generated from project_declared task in AGENT_TASKS.md. Blocking hardening of checkout.js (tasks 001, 002, 008 in this batch)._
