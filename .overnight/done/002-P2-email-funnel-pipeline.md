---
id: 2
title: "End-to-end email funnel pipeline"
priority: P2
severity: medium
status: completed
source: project_declared
file: marketplace/backend/routes/funnels.js
line: null
created: "2026-03-09T00:00:00Z"
execution_hint: sequential
context_group: email_funnel
group_reason: "Connects funnels.js, emailMarketingService.js, and frontend landing pages"
---

# End-to-End Email Funnel Pipeline

**Priority:** P2 (medium)
**Source:** project_declared (AGENT_TASKS.md Phase 2 Funnels)
**Location:** marketplace/backend/routes/funnels.js + emailMarketingService.js

## Problem

The individual components exist (funnel routes with Supabase persistence, email marketing sequences, email capture forms) but they are not wired into a complete automated pipeline. A creator cannot currently:
- Create a funnel landing page that auto-enrolls visitors into an email sequence on opt-in
- Have the email sequence automatically trigger based on subscriber list assignment
- See conversion metrics flowing from funnel → email → sale

The pipeline: landing page → email capture → subscriber added → sequence triggered → sale is not fully automated end-to-end.

## How to Fix

1. **Wire funnel opt-in to email sequence enrollment:**
   - In `funnels.js` POST `/funnels/:id/subscribe`, after inserting subscriber, check if the funnel has a `sequence_id` configured
   - If yes, call `emailMarketingService.enrollSubscriber(subscriberId, sequenceId)` (create this method if needed)
   - This should schedule the sequence's first email

2. **Add `sequence_id` field to funnels schema:**
   - Add `sequence_id INTEGER REFERENCES email_sequences(id)` to funnels table in schema.sql
   - Add migration if needed

3. **Add funnel → sequence mapping in admin UI:**
   - In `admin.html`, the Funnels section should have a dropdown to select which email sequence to trigger on opt-in
   - Wire to `PATCH /api/funnels/:id` to save the sequence_id

4. **Confirm `emailMarketingService.enrollSubscriber()` schedules emails:**
   - Check if this method exists; if not, create it to INSERT a subscriber into the sequence processing queue (or directly into scheduled_emails)

5. **Test the pipeline:**
   - Create a funnel → assign sequence → POST to /subscribe → confirm subscriber enrolled in sequence → confirm first email scheduled

## Acceptance Criteria

- [ ] Funnel opt-in auto-enrolls subscriber into linked email sequence
- [ ] Admin UI allows selecting which sequence a funnel triggers
- [ ] First email is scheduled/sent on opt-in
- [ ] Funnel analytics still work (conversion_rate calculated)
- [ ] No regressions in existing funnel or email marketing routes

## Notes

_Generated from project_declared AGENT_TASKS.md Phase 2 Funnels section._
