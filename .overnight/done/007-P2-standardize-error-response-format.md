---
id: 7
title: "Standardize error response format across routes"
priority: P2
severity: high
status: completed
source: code_quality_audit
file: marketplace/backend/routes/adminRoutes.js
line: 241
created: "2026-03-09T23:45:00Z"
execution_hint: parallel
context_group: independent
group_reason: "Touches multiple routes but no file overlap with other task groups"
---

# Standardize error response format across routes

**Priority:** P2 (high)
**Source:** code_quality_audit
**Location:** marketplace/backend/routes/adminRoutes.js:241, checkout.js, storeBuilder routes

## Problem

Error response shapes are inconsistent across routes. Frontend clients must handle multiple shapes:

- `adminRoutes.js:241` — returns `{error: '...'}` without `success` field
- `checkout.js` — returns `{success: false, error: '...'}` OR `{success: false, stripeDown: true, fallbackUrl: '...'}`
- `storeBuilder` routes — returns `{error: '...'}`
- Most routes use `{success: false, error: '...'}`

This forces frontend code to check multiple possible structures (`if (data.error || !data.success)`), making client code fragile and bug-prone.

**Code with issue (adminRoutes.js ~line 241):**
```javascript
return res.status(400).json({ error: 'Invalid action' });
// Missing success: false field
```

## How to Fix

1. Create a shared error helper in `marketplace/backend/utils/respond.js` (or add to existing `validate.js`):
```javascript
function sendError(res, statusCode, message, extra = {}) {
    return res.status(statusCode).json({ success: false, error: message, ...extra });
}
function sendSuccess(res, data = {}) {
    return res.json({ success: true, ...data });
}
module.exports = { sendError, sendSuccess };
```

2. Audit `adminRoutes.js` for all `res.json({ error: ... })` without `success: false` and fix them.

3. Focus on the public-facing routes first: adminRoutes.js, checkout.js, storefront.js. Don't boil the ocean — just ensure `success: boolean` is always present.

## Acceptance Criteria

- [ ] `adminRoutes.js` error responses all include `success: false`
- [ ] No route returns `{error: '...'}` without a `success` field
- [ ] All existing tests still pass
- [ ] Frontend code that checks `data.success` works consistently

## Notes

_Generated from code_quality_audit findings. Focus on adminRoutes.js since that's the confirmed location. Don't refactor working routes unless the inconsistency is confirmed there too._
