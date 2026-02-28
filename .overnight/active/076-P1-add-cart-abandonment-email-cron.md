---
id: 76
title: "Add cart abandonment email automation cron job"
priority: P1
severity: high
status: completed
source: feature_audit
file: marketplace/backend/services/cronJobs.js
created: "2026-02-28T12:00:00"
execution_hint: sequential
context_group: email_marketing
group_reason: "Same service area as email tracking task 075"
---

# Add cart abandonment email automation cron job

**Priority:** P1 (high)
**Source:** feature_audit
**Location:** marketplace/backend/services/cronJobs.js

## Problem

Cart abandonment automation is claimed in the README ('cart abandonment' sequences) but no cart abandonment detection logic, timer, or trigger exists. Cron jobs (`cronJobs.js`) do not include any abandoned cart recovery job.

Orders with status='pending' older than a threshold represent abandoned carts — these buyers added items but never completed payment. Without recovery emails, this revenue is permanently lost.

## How to Fix

1. In `cronJobs.js`, add a new cron job scheduled every 2 hours (or `0 */2 * * *`)
2. Query: find orders with `status = 'pending'` created 2-24 hours ago where customer has no `status = 'completed'` order for the same book
3. For each abandoned order, check that no abandonment email was already sent (add `abandonment_email_sent_at` column to orders table, or check `email_events`)
4. Enroll qualifying customers in a 'cart_abandonment' email sequence via `emailMarketingService.enrollInSequence(email, 'cart_abandonment', { bookTitle, orderId, checkoutUrl })`
5. Create the 'cart_abandonment' email sequence definition if it doesn't exist:
   - Email 1 (immediate): "You left something behind" with book title and checkout link
   - Email 2 (24h later): "Your cart is expiring" with urgency CTA
6. Mark `abandonment_email_sent_at = NOW()` on processed orders to prevent re-sending

## Acceptance Criteria

- [ ] Cron job runs every 2 hours scanning pending orders
- [ ] Customers with pending orders 2-24h old receive abandonment email
- [ ] No duplicate emails sent for same order
- [ ] Cart abandonment sequence defined with at least 1 email template
- [ ] abandonment_email_sent_at column added to orders schema

## Notes

_Generated from feature_audit findings. Direct revenue recovery feature._
