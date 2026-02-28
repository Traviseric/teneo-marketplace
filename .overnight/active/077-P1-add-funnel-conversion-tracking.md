---
id: 77
title: "Add funnel conversion tracking events"
priority: P1
severity: high
status: completed
source: feature_audit
file: funnel-module/
created: "2026-02-28T12:00:00"
execution_hint: parallel
context_group: funnel_module
group_reason: "Funnel-specific, independent of email/checkout tasks"
---

# Add funnel conversion tracking events

**Priority:** P1 (high)
**Source:** feature_audit
**Location:** funnel-module/

## Problem

Funnel builder deploys HTML pages but conversion tracking is absent. The README claims 'conversion tracking' as a funnel feature. No analytics event capture (pageviews, CTA clicks, checkout starts, completions) is wired into deployed funnel pages.

Brands building funnels have no visibility into funnel performance — no way to measure conversion rates, identify drop-off points, or optimize CTAs.

## How to Fix

1. Create `POST /api/analytics/funnel-event` endpoint in a new or existing analytics route:
   ```js
   // Body: { funnelId, pageSlug, eventType: 'pageview'|'cta_click'|'checkout_start'|'purchase', metadata: {} }
   ```
2. Add a `funnel_events` table to schema: `id, funnel_id, page_slug, event_type, session_id, metadata JSON, created_at`
3. Create a lightweight client-side tracker script `funnel-tracker.js`:
   - Auto-fires `pageview` on load with `funnelId` from meta tag
   - Adds click listeners to elements with `data-funnel-cta` attribute (fires `cta_click`)
   - Fires `checkout_start` when checkout button clicked
   - Uses `fetch` to POST to `/api/analytics/funnel-event` (non-blocking, fire-and-forget)
4. Embed `<script src="/js/funnel-tracker.js"></script>` in funnel page templates during deploy
5. Add `GET /api/analytics/funnel-stats/:funnelId` endpoint returning pageviews, cta_clicks, checkout_starts, conversions, conversion_rate
6. Display funnel stats in admin dashboard funnel list

## Acceptance Criteria

- [ ] POST /api/analytics/funnel-event endpoint accepts and stores events
- [ ] funnel_events table created in schema
- [ ] funnel-tracker.js embedded in deployed funnel pages
- [ ] Admin can view conversion stats per funnel
- [ ] Pageview, CTA click, and checkout start events tracked

## Notes

_Generated from feature_audit findings. Enables data-driven funnel optimization._
