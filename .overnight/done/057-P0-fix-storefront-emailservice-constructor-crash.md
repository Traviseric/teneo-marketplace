---
id: 57
title: "Fix storeBuilder.js EmailService constructor crash — module fails to load"
priority: P0
severity: critical
status: completed
source: review_audit
file: marketplace/backend/routes/storeBuilder.js
line: 6
created: "2026-03-06T00:00:00Z"
execution_hint: parallel
context_group: store_builder_fix
group_reason: "Single-file crash fix — isolated and independent"
---

# Fix storeBuilder.js EmailService constructor crash

**Priority:** P0 (critical)
**Source:** review_audit (task 043 BROKEN verdict — WORKER_003)
**Location:** marketplace/backend/routes/storeBuilder.js:6, 21

## Problem

`storeBuilder.js` imports `emailService.js` as if it were a class constructor, but `emailService.js` exports a singleton instance (`module.exports = new EmailService()`). This causes a `TypeError: EmailService is not a constructor` at module load time. **All storeBuilder routes are dead** — the server cannot load the module and the `/api/store-builder/*` endpoints return 500.

This also means the review_audit reported `build_passes: false`.

**Code with issue:**
```js
// storeBuilder.js line 6:
const EmailService = require('../services/emailService');  // imports singleton INSTANCE, not class
// storeBuilder.js line 21:
const emailService = new EmailService();  // FAILS: TypeError: EmailService is not a constructor
```

## How to Fix

In `marketplace/backend/routes/storeBuilder.js`:

1. Change line 6 from:
   ```js
   const EmailService = require('../services/emailService');
   ```
   to:
   ```js
   const emailService = require('../services/emailService');
   ```

2. Remove line 21 (`const emailService = new EmailService();`) — the variable is now set at line 6 directly.

3. Verify the rest of the file uses `emailService` (lowercase) — it should already, so only the import and constructor lines change.

4. Restart the server. Verify no `TypeError` in logs on startup.

5. Run `npm test` — all 149+ tests should pass.

## Acceptance Criteria

- [ ] Server starts without `TypeError: EmailService is not a constructor`
- [ ] `POST /api/store-builder/intake` returns 400 on invalid payload (not 500)
- [ ] `POST /api/store-builder/intake` returns 200 with `build_id` on valid payload
- [ ] All existing tests pass (`npm test`)
- [ ] No module load errors in server startup logs

## Notes

_Identified as BROKEN by review_audit. Single-line fix unblocks all storeBuilder routes. The same pattern (singleton export) is used by emailService everywhere else in the codebase — this was an import style inconsistency introduced in task 043._
