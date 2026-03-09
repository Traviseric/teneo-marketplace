---
id: 9
title: "Add funnel analytics admin UI (views, conversions, revenue per funnel)"
priority: P2
severity: medium
status: completed
source: project_declared
file: marketplace/frontend/admin.html
created: "2026-03-09T21:00:00Z"
execution_hint: sequential
context_group: analytics
group_reason: "Analytics UI features for admin panel"
---

# Add funnel analytics admin UI (views, conversions, revenue per funnel)

**Priority:** P2 (medium)
**Source:** project_declared (AGENT_TASKS.md — "Funnel analytics (views, conversions, revenue per funnel)")
**Location:** marketplace/frontend/admin.html + funnel-module/backend/routes/funnels.js

## Problem

The funnel backend already tracks events (pageviews, cta_clicks, checkout_starts, purchases) and computes conversion rates in `funnel-module/backend/routes/funnels.js`. However there is no admin UI that presents these analytics to merchants. Merchants can't see how their funnels are performing.

The backend endpoints that return analytics already exist:
- `GET /api/funnels` returns `pageviews`, `cta_clicks`, `checkout_starts`, `purchases`, `conversion_rate` per funnel
- `GET /api/funnels/:slug/stats` returns stats for a single funnel

## How to Fix

1. Find the funnel section in the admin panel (`marketplace/frontend/admin.html` or dedicated funnel admin page).

2. Add a "Funnel Analytics" section/tab that:
   - Lists all funnels with their key metrics in a table:
     | Funnel Name | Views | CTA Clicks | Checkouts | Purchases | Conv. Rate |
     |-------------|-------|------------|-----------|-----------|------------|
   - Shows a summary bar at the top: "Total Funnel Revenue This Month: $X"
   - Clicking a funnel row expands to show time-series chart (optional) or just the full stats

3. Fetch data from the existing `GET /api/funnels` endpoint.

4. Add a date range filter if the backend supports it, or document that it's a future enhancement.

5. Style consistently with the existing admin panel design.

## Acceptance Criteria

- [ ] Admin panel shows funnel analytics table
- [ ] Each funnel row shows: name, pageviews, CTA clicks, purchases, conversion rate
- [ ] Summary total visible at top
- [ ] Data loads from existing API endpoints (no new backend work needed)
- [ ] Responsive design

## Notes

_Backend analytics already implemented. This is purely a frontend UI task. Generated from AGENT_TASKS.md P2 item._
