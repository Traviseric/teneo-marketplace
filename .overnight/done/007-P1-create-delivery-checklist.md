---
id: 7
title: "Create delivery checklist — working URL, checkout test, email capture test, mobile"
priority: P1
severity: medium
status: completed
source: AGENT_TASKS.md
file: marketplace/backend/scripts/
line: null
created: "2026-03-09T00:00:00"
execution_hint: parallel
context_group: managed_service
group_reason: "Phase 1A managed-service tasks: 006-007-008 are delivery/tooling improvements"
---

# Create Delivery Checklist for AI Store Builds

**Priority:** P1 (medium)
**Source:** AGENT_TASKS.md Phase 1A Managed-Service Commercialization
**Location:** marketplace/backend/scripts/

## Problem

When a managed AI store build is delivered to a client, there is no automated checklist to verify the deliverable is actually working. Without a delivery checklist, broken stores could be delivered (404 pages, broken checkout, no email capture, mobile layout issues).

## How to Fix

Create `marketplace/backend/scripts/delivery-check.js <store_slug>` that:

1. **Working URL check**: Fetch `GET /store/{slug}` and assert HTTP 200 + non-empty HTML body
2. **Checkout test**: Verify the store page has a checkout link/button that points to a valid `/checkout` or `/api/checkout` endpoint (CSS selector check, not a real payment)
3. **Email capture test**: Verify the store page has an `<input type="email">` or email capture form present
4. **Mobile responsiveness check**: Verify `<meta name="viewport">` tag exists, no fixed pixel widths over 768px in inline styles (static HTML check)
5. **Required meta tags**: `<title>`, `<meta name="description">`, og:image for social sharing
6. **Output a checklist report**:
   ```
   ✓ Working URL (HTTP 200)
   ✓ Checkout button present
   ✓ Email capture form present
   ✓ Mobile viewport meta tag
   ✗ Missing og:image meta tag
   ```
7. Exit code 0 if all checks pass, 1 if any fail

The script should be runnable standalone and also callable from the operator build command (task 006) as a QA stage.

## Acceptance Criteria

- [ ] Script accepts a store slug as argument
- [ ] Checks: HTTP 200, checkout button, email capture form, mobile viewport, title tag
- [ ] Prints pass/fail for each check
- [ ] Exit code 0 on all pass, 1 on any fail
- [ ] Can be integrated into the QA stage of the operator build command

## Notes

_Generated from AGENT_TASKS.md Phase 1A. Enables confidence in managed store deliverables._
