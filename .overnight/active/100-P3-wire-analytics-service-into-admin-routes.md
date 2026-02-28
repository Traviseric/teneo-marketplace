---
id: 100
title: "Wire AnalyticsService into adminRoutes dashboard endpoint"
priority: P3
severity: low
status: completed
source: review_audit
file: marketplace/backend/routes/adminRoutes.js
line: 562
created: "2026-02-28T10:00:00Z"
execution_hint: parallel
context_group: admin_analytics
group_reason: "Isolated to adminRoutes.js + analyticsService.js — no overlap with other pending tasks"
---

# Wire AnalyticsService into adminRoutes dashboard endpoint

**Priority:** P3 (low)
**Source:** review_audit (partial verdict on task 094)
**Location:** `marketplace/backend/routes/adminRoutes.js:562` and `marketplace/backend/services/analyticsService.js:429`

## Problem

Task 094 added real DB-backed `getConversionRate()` and `getOrderRevenue()` methods to `analyticsService.js`, but `adminRoutes.js` still uses its own locally-defined `getConversionRate()` function that returns a hardcoded placeholder of `2.5`. The AnalyticsService methods exist but are disconnected from the admin dashboard stats endpoint.

**Code with issue in adminRoutes.js:**
```javascript
// adminRoutes.js line 562 — local standalone function (never imports analyticsService)
async function getConversionRate() {
    // ... returns hardcoded 2.5 placeholder
}

// adminRoutes.js line 161 — uses local function instead of analyticsService
const conversionRate = await getConversionRate();
```

**The real implementation in analyticsService.js (unused by adminRoutes):**
```javascript
// analyticsService.js line 429 — real DB-backed implementation
async getConversionRate(days = 30) {
    // ... queries DB for real conversion data
}

// analyticsService.js line 456
async getOrderRevenue(days = 30) {
    // ... queries DB for real revenue data
}
```

## How to Fix

1. Import `AnalyticsService` at the top of `adminRoutes.js`:
```javascript
const AnalyticsService = require('../services/analyticsService');
const analyticsService = new AnalyticsService();
```

2. In the dashboard stats endpoint (around line 161), replace:
```javascript
const conversionRate = await getConversionRate();
```
with:
```javascript
const conversionRate = await analyticsService.getConversionRate(30);
```

3. Also wire `getOrderRevenue`:
```javascript
const revenueStats = await analyticsService.getOrderRevenue(30);
```

4. Remove or deprecate the local `getConversionRate()` function at line 562 since it's now replaced by the service method.

Verify the dashboard endpoint still returns valid JSON with real (non-placeholder) conversion stats.

## Acceptance Criteria

- [ ] `adminRoutes.js` imports `AnalyticsService` and uses it for dashboard stats
- [ ] Local `getConversionRate()` function in adminRoutes.js removed or unused
- [ ] Admin dashboard `/api/admin/dashboard` returns real conversion rate from DB
- [ ] No regression in admin dashboard endpoint response shape

## Notes

_Generated from review_audit PARTIAL verdict on task 094 — "AnalyticsService has real methods but adminRoutes.js still uses its own local getConversionRate() function." Fix is straightforward wiring._
