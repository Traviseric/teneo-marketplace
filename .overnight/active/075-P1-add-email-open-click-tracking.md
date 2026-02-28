---
id: 75
title: "Add email open/click tracking endpoints"
priority: P1
severity: high
status: completed
source: feature_audit
file: marketplace/backend/services/emailMarketingService.js
created: "2026-02-28T12:00:00"
execution_hint: sequential
context_group: email_marketing
group_reason: "Same service area as cart abandonment task 076"
---

# Add email open/click tracking endpoints

**Priority:** P1 (high)
**Source:** feature_audit
**Location:** marketplace/backend/services/emailMarketingService.js

## Problem

Email marketing service has subscriber management, segments, and sequence enrollment, but there is no open/click tracking implementation. The README claims 'open/click tracking' as a feature. No pixel endpoint, tracking link redirector, or open_count/click_count update logic exists in `emailMarketingService.js`.

Users who rely on email performance analytics are getting no data despite the feature being advertised.

## How to Fix

1. Add database columns (or a separate `email_events` table): `event_type` (open/click), `email_id`, `subscriber_id`, `url` (for clicks), `recorded_at`
2. Add `GET /api/email/track/open/:emailId` route that:
   - Records an open event in the DB
   - Returns a 1x1 transparent GIF (Buffer from `Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')`)
3. Add `GET /api/email/track/click/:emailId?url=<encoded>` route that:
   - Records a click event in the DB
   - Redirects (302) to the decoded `url` parameter
   - Validate URL is not a javascript: or data: URI
4. Embed these URLs in email templates sent by `emailMarketingService.js`:
   - Add `<img src="/api/email/track/open/{{emailId}}" width="1" height="1">` at bottom of HTML emails
   - Wrap any CTA links: `/api/email/track/click/{{emailId}}?url=<encoded-cta-url>`
5. Add `getEmailStats(emailId)` helper that returns open_count, click_count, unique_opens

## Acceptance Criteria

- [ ] GET /api/email/track/open/:emailId returns 1x1 GIF and logs event
- [ ] GET /api/email/track/click/:emailId?url= logs event and redirects safely
- [ ] Email templates include tracking pixel and wrapped links
- [ ] open_count/click_count queryable from admin
- [ ] URL validation prevents open redirect abuse

## Notes

_Generated from feature_audit findings. Medium effort, clearly actionable._
