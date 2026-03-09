---
id: 10
title: "Add email marketing analytics dashboard (open rates, click rates, engagement)"
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

# Add email marketing analytics dashboard (open rates, click rates, engagement)

**Priority:** P2 (medium)
**Source:** project_declared (AGENT_TASKS.md — "Analytics dashboard (open rates, click rates, engagement)")
**Location:** marketplace/frontend/admin.html + marketplace/backend/services/emailMarketingService.js

## Problem

The email marketing UI was added (commit 98147ee) with sequences, broadcasts, and basic analytics UI, but the analytics data (open rates, click rates, engagement over time) may not be fully wired to the backend tracking or the display may be incomplete. Merchants need to see which emails are performing and which sequences need improvement.

## How to Fix

1. Audit what analytics data the backend currently tracks:
   - Check `emailMarketingService.js` for open/click tracking fields
   - Check if there are `email_events` or similar tables in the schema
   - Check `analyticsService.js` for email-related tracking

2. If open/click tracking is not implemented:
   - Add pixel tracking (1x1 image with unique URL) for open tracking
   - Add click tracking (redirect URL wrapper) for link clicks
   - Store events in a new `email_events` table (or existing analytics table)

3. Add a backend endpoint `GET /api/email-marketing/analytics` that returns:
   ```json
   {
     "broadcasts": [
       {"subject": "...", "sent": 500, "opened": 120, "clicked": 45, "open_rate": "24%", "click_rate": "9%"}
     ],
     "sequences": [
       {"name": "Welcome", "subscribers": 200, "step_stats": [...]}
     ]
   }
   ```

4. Add/update the analytics tab in the email marketing admin section with:
   - Broadcast performance table (sorted by date, open rate highlighted)
   - Sequence funnel view (how many subscribers progress through each step)
   - Summary: best-performing subject line, avg open rate

## Acceptance Criteria

- [ ] Open rate and click rate data tracked in database
- [ ] `GET /api/email-marketing/analytics` endpoint returns structured stats
- [ ] Admin UI displays broadcast and sequence analytics
- [ ] Open rate and click rate visible per email/broadcast
- [ ] Dashboard updates on page refresh

## Notes

_Generated from AGENT_TASKS.md P2 item. If open/click tracking infrastructure is missing, that must be built first before the UI can display meaningful data._
