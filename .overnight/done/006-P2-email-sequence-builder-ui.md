---
id: 6
title: "Email sequence builder UI and broadcast sending UI"
priority: P2
severity: medium
status: completed
source: project_declared
file: marketplace/frontend/admin.html
line: ~
created: "2026-03-09T00:00:00Z"
execution_hint: sequential
context_group: email_marketing
group_reason: "Email sequence builder and cart abandonment share emailMarketingService context"
---

# Email sequence builder UI and broadcast sending UI

**Priority:** P2 (medium)
**Source:** AGENT_TASKS.md (Phase 2 — Email Marketing)
**Location:** `marketplace/frontend/admin.html`, `marketplace/backend/routes/`, `marketplace/backend/services/emailMarketingService.js`

## Problem

The email marketing backend (`emailMarketingService.js`, 978 lines) and routes exist, and they've been wired to Supabase (f4b0050). However, there is no frontend UI for:
1. Building email sequences (drip campaigns: email 1 on day 0, email 2 on day 3, etc.)
2. Sending broadcast emails to all subscribers or a segment
3. Viewing open rates, click rates, and engagement stats

Without a UI, email marketing is unusable by non-technical operators. The backend is sitting idle.

## How to Fix

1. **Add "Email" tab to admin.html** with three sub-sections:
   - **Sequences** — manage drip campaigns
   - **Broadcasts** — send one-time emails to all/segments
   - **Analytics** — open rates, click rates, subscriber growth

2. **Sequences UI:**
   - List existing sequences (GET /api/email/sequences)
   - Create sequence: name + trigger (e.g. "on signup", "after purchase", "7 days before event")
   - Add steps: delay (days) + subject + body (HTML/text with {{name}}, {{email}} variables)
   - Activate/deactivate sequences
   - CRUD: POST /api/email/sequences, PUT /api/email/sequences/:id, DELETE /api/email/sequences/:id

3. **Broadcast UI:**
   - Subject line input
   - Recipient segment selector: "All subscribers", "Paid customers", "Leads (no purchase)"
   - HTML body editor (simple textarea + preview toggle)
   - "Send Test" → sends to admin email first
   - "Send Broadcast" → POST /api/email/broadcast with confirmation dialog
   - Scheduled send: pick date/time for future send

4. **Analytics panel:**
   - Table: Email Subject | Sent | Opens | Clicks | Unsubscribes | Date
   - Data from emailTracking.js route and email_events table
   - Simple bar chart if data available

5. **Use existing API endpoints** from emailMarketingService — don't rebuild what exists

## Acceptance Criteria

- [ ] Admin panel has Email tab with Sequences, Broadcasts, Analytics sub-sections
- [ ] Can create, edit, delete email sequences through the UI
- [ ] Can send a broadcast email to all subscribers
- [ ] "Send Test" email works before sending to all
- [ ] Analytics table shows sent/open/click counts for past broadcasts
- [ ] UI is mobile-responsive

## Notes

_Generated from AGENT_TASKS.md Phase 2 Email Marketing. emailMarketingService.js backend is complete with Supabase wiring (f4b0050). This is purely frontend UI work to expose the backend capabilities to operators._
