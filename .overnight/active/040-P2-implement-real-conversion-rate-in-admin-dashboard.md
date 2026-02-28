---
id: 40
title: "Implement real conversion rate calculation in admin dashboard"
priority: P2
severity: high
status: completed
source: code_quality_audit
file: marketplace/backend/routes/adminRoutes.js
line: 550
created: "2026-02-28T08:00:00"
execution_hint: sequential
context_group: admin_dashboard
group_reason: "Same adminRoutes.js file as tasks 045 (Stripe init) and 047 (duplicate helpers)"
---

# Implement real conversion rate calculation in admin dashboard

**Priority:** P2 (high)
**Source:** code_quality_audit
**Location:** marketplace/backend/routes/adminRoutes.js:550

## Problem

`getConversionRate()` returns a hardcoded value of 2.5 labeled as a "Placeholder". This fake metric is displayed in the admin dashboard alongside real data (total revenue, total orders, active books, recent orders), giving administrators false confidence in a fabricated conversion number.

**Code with issue:**
```javascript
// adminRoutes.js line 550-552
async function getConversionRate() {
    // Simplified conversion rate calculation
    return 2.5; // Placeholder
}
```

Business decisions made on a permanently-fake metric (pricing, marketing spend, campaign ROI) are misleading. A 2.5% rate may be wildly off from reality.

## How to Fix

Implement a real conversion rate from the orders table. A reasonable proxy: completed orders in the last 30 days vs. total catalog visits (if tracked), or simply compute the ratio of paid orders to total orders created:

```javascript
async function getConversionRate() {
    return new Promise((resolve, reject) => {
        // Approach 1: If session/visit tracking exists, use it.
        // Approach 2: Use orders data as proxy (% of orders that completed payment)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        const sql = `
            SELECT
                COUNT(*) AS total_orders,
                SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) AS paid_orders
            FROM orders
            WHERE created_at >= ?
        `;

        db.get(sql, [thirtyDaysAgo], (err, row) => {
            if (err || !row || row.total_orders === 0) {
                resolve(null);  // Return null, not a fake number
                return;
            }
            const rate = (row.paid_orders / row.total_orders) * 100;
            resolve(Math.round(rate * 10) / 10);  // One decimal place
        });
    });
}
```

If the orders table doesn't have enough data for a meaningful rate, return `null` and update the dashboard template to show "N/A — not enough data" instead of a fake percentage.

Update the dashboard response to handle `null`:
```javascript
res.json({
    totalRevenue,
    totalOrders,
    activeBooks,
    conversionRate: conversionRate ?? null,  // null instead of fake 2.5
    recentOrders
});
```

## Acceptance Criteria

- [ ] `getConversionRate()` queries real order data from the database
- [ ] Returns `null` instead of a hardcoded number when data is insufficient
- [ ] Dashboard response passes `null` through rather than fabricating a value
- [ ] The 30-day window approach (or better) is used
- [ ] npm test passes after changes

## Notes

_Generated from code_quality_audit findings. The placeholder 2.5 is displayed to admins as real data. Even returning null/"N/A" is better than a fake metric that could mislead business decisions._
