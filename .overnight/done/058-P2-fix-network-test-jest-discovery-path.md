---
id: 58
title: "Fix network.test.js Jest discovery — ensure 21 federation tests actually run in CI"
priority: P2
severity: medium
status: completed
source: review_audit
file: marketplace/backend/__tests__/network.test.js
line: 1
created: "2026-03-06T00:00:00Z"
execution_hint: parallel
context_group: test_infrastructure
group_reason: "Test infrastructure fix — independent of feature code"
---

# Fix network.test.js Jest discovery path

**Priority:** P2 (medium)
**Source:** review_audit (task 054 PARTIAL verdict) + code_quality_audit (no tests for network.js)
**Location:** marketplace/backend/__tests__/network.test.js, package.json (Jest config)

## Problem

21 federation tests were added in commit `cb0b1b4` to `marketplace/backend/__tests__/network.test.js`. However, `npm test` runs Jest from the project root, and the Jest config's `testMatch` or `roots` setting may only discover tests under the project-root `__tests__/` directory — not `marketplace/backend/__tests__/`.

If the tests are not discovered, all 21 federation/network tests silently don't run, and the test count in CI never reflects them.

## How to Fix

**Step 1: Verify the issue**
```bash
cd C:/code/openbazaar-ai
npx jest --listTests 2>&1 | grep network
```
If `network.test.js` does NOT appear in the output, the tests are not being discovered.

**Step 2A — If not discovered, update Jest config in root `package.json`:**
Check the current `jest` config block. Add `marketplace/backend/__tests__` to `roots` or ensure `testMatch` glob covers it:
```json
{
  "jest": {
    "roots": ["<rootDir>/__tests__", "<rootDir>/marketplace/backend/__tests__"],
    "testMatch": ["**/__tests__/**/*.test.js"]
  }
}
```

**Step 2B — Alternative: Move test to project root `__tests__/`**
If updating roots is complex, move the file:
```bash
mv marketplace/backend/__tests__/network.test.js __tests__/network.test.js
```
Then fix relative `require()` paths in the test (e.g., `../../routes/network` → `../marketplace/backend/routes/network`).

**Step 3: Verify**
```bash
npx jest --listTests | grep network
npx jest --testPathPattern=network
npm test
```
The test count should increase by ~21 tests.

## Acceptance Criteria

- [ ] `npx jest --listTests` includes `network.test.js`
- [ ] All 21 network federation tests run and pass with `npm test`
- [ ] No other tests broken by the config/path change
- [ ] `npm test` output shows higher test count (149+ → 170+)

## Notes

_Merged finding: review_audit PARTIAL verdict for task 054 + code_quality_audit "No tests for network.js federation routes." The tests exist (commit cb0b1b4, 253 lines) but may not be included in the test run._
