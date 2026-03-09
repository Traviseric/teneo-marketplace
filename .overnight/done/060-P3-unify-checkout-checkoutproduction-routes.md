---
id: 60
title: "Unify checkout.js and checkoutProduction.js into single maintainable route"
priority: P3
severity: medium
status: completed
source: code_quality_audit
file: marketplace/backend/routes/checkoutProduction.js
line: 1
created: "2026-03-06T00:00:00Z"
execution_hint: long_running
context_group: checkout_routes
group_reason: "Large refactor of checkout routes — run standalone with full test cycle"
---

# Unify checkout.js and checkoutProduction.js

**Priority:** P3 (medium)
**Source:** code_quality_audit
**Location:** marketplace/backend/routes/checkout.js + marketplace/backend/routes/checkoutProduction.js

## Problem

`checkoutProduction.js` duplicates ~80% of `checkout.js`. The two files have diverged:
- `checkoutProduction.js` may lack: `courseSlug` handling, `stripeHealthService` check (verify)
- `checkout.js` may lack: `statement_descriptor` and other production-specific Stripe settings

Any bug fixed in one file must be manually applied to the other. This divergence will grow over time and has already caused inconsistencies (e.g., rate limiter was originally only in checkout.js).

Now that ESLint (task 053) and test coverage (tasks 036-038) are in place, this refactor is safer to attempt.

## How to Fix

**Step 1 — Diff the two files**
```bash
diff marketplace/backend/routes/checkout.js marketplace/backend/routes/checkoutProduction.js
```
List every difference. Classify each as:
- **env-specific config:** Use `process.env.NODE_ENV === 'production'` or a config object
- **feature gap:** Add the missing feature to both paths
- **intentional difference:** Document why and keep with a comment

**Step 2 — Unified approach**

Create a single `checkout.js` that:
1. Reads env-specific options from `process.env.NODE_ENV`
2. Applies ALL features uniformly: courseSlug, stripeHealthService, rate limiter, statement_descriptor
3. Uses a config object for Stripe session options that vary by env:
   ```js
   const stripeSessionConfig = {
     ...(process.env.NODE_ENV === 'production' && {
       statement_descriptor: 'OpenBazaar'
     })
   };
   ```

**Step 3 — Migration**
1. Replace the contents of `checkout.js` with the unified version
2. Delete `checkoutProduction.js` (or move to `_archive/`)
3. Update `server.js` to remove the `checkoutProduction` mount — only `checkout` route needed
4. Run full test suite: `npm test`
5. Manually test a Stripe checkout in dev mode to confirm nothing broke

## Acceptance Criteria

- [ ] Single checkout route file handles both dev and prod configurations
- [ ] No feature gaps between environments (courseSlug, stripeHealthService, rate limiter all present)
- [ ] `checkoutProduction.js` removed or clearly archived
- [ ] All existing checkout tests pass
- [ ] `server.js` updated to use unified route only

## Notes

_code_quality_audit finding: "checkoutProduction/checkout duplication ~80%." Previously deferred in round 15 as "high-risk refactor." Now creating as P3 with long_running hint. Do not start unless P0/P1/P2 tasks are complete._

_WARNING: High-effort task. Diff carefully before making changes. Run full test suite after each significant change._
