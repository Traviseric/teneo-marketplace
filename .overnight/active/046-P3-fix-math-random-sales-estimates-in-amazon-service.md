---
id: 46
title: "Fix Math.random() sales estimates in amazonService.js analytics dashboard"
priority: P3
severity: low
status: pending
source: code_quality_audit
file: marketplace/backend/services/amazonService.js
line: 413
created: "2026-02-28T08:00:00"
execution_hint: parallel
context_group: independent
group_reason: "Single service file, independent of other active tasks"
---

# Fix Math.random() sales estimates in amazonService.js analytics dashboard

**Priority:** P3 (low)
**Source:** code_quality_audit
**Location:** marketplace/backend/services/amazonService.js:413

## Problem

`estimateDailySales()` uses `Math.random()` to generate sales figures displayed in the published books dashboard. Random data in an analytics dashboard creates non-reproducible results and misleads book authors about their sales performance.

**Code with issue:**
```javascript
// amazonService.js line 413 (approximate)
function estimateDailySales(bookId) {
    // Random estimate between 1-50 sales/day
    return Math.floor(Math.random() * 50) + 1;
}
```

Authors see different numbers on every page refresh. This erodes trust and makes the dashboard useless for actual business decisions.

## How to Fix

Option 1: Return `null` and show "Sales data unavailable" in the UI until real tracking is implemented:
```javascript
function estimateDailySales(bookId) {
    // Real sales data requires integration with distribution channels
    // Return null until actual tracking is implemented
    return null;
}
```

Option 2: Use a deterministic estimate based on available data (price, listing age) rather than random:
```javascript
function estimateDailySales(bookId, bookData) {
    if (!bookData) return null;
    // Rough estimate based on price tier (lower price = more sales)
    // This is still an estimate but at least stable/reproducible
    const priceTier = bookData.price < 5 ? 'budget' : bookData.price < 15 ? 'mid' : 'premium';
    const baseEstimates = { budget: 10, mid: 3, premium: 1 };
    return baseEstimates[priceTier] || null;
}
```

Option 3: Query actual order data from the DB for real sales figures (best, if available).

Update the dashboard template to handle `null` sales gracefully (show "—" or "N/A").

## Acceptance Criteria

- [ ] `estimateDailySales()` no longer uses `Math.random()`
- [ ] Returns `null` or a deterministic value (not random) when real data is unavailable
- [ ] Dashboard template handles `null` sales gracefully
- [ ] Sales figure is the same on every page load for the same book (reproducible)
- [ ] npm test passes after changes

## Notes

_Generated from code_quality_audit findings. Random analytics data actively misleads users. Either show real data or show nothing — never show random numbers labeled as estimates._
