---
id: 12
title: "ArxMint fulfillment webhook — handle payment confirmation → trigger fulfillment"
priority: P2
severity: medium
status: completed
source: project_declared
file: marketplace/backend/services/arxmintProvider.js
created: "2026-03-09T21:00:00Z"
execution_hint: parallel
context_group: payments
group_reason: "ArxMint/Lightning payment integration"
---

# ArxMint fulfillment webhook — handle payment confirmation → trigger fulfillment

**Priority:** P2 (medium)
**Source:** project_declared (AGENT_TASKS.md — "ArxMint fulfillment webhook")
**Location:** marketplace/backend/services/arxmintProvider.js + marketplace/backend/routes/checkout.js

## Problem

The ArxMint Bazaar integration (commit 020cc86) wires the catalog so ArxMint can display products and generate Lightning invoices. However, when a Lightning payment completes on the ArxMint side, there is no webhook handler to:
1. Confirm the payment on our backend
2. Mark the order as paid
3. Trigger product fulfillment (download link delivery or POD order submission)

Currently `arxmintProvider.js` has stub methods that return `NOT_IMPLEMENTED`.

## How to Fix

1. Read `marketplace/backend/services/arxmintProvider.js` and `marketplace/backend/services/arxmintService.js` to understand the current stub structure.

2. Implement the webhook endpoint `POST /api/arxmint/webhook`:
   - Verify the request signature (HMAC or ArxMint's verification method — check ArxMint docs or their API)
   - Parse the payment event: `{ order_id, payment_hash, amount_sat, status }`
   - When `status === 'paid'`: mark order as paid in DB, trigger fulfillment

3. Implement fulfillment trigger:
   - For digital products: generate a download token and send delivery email
   - For POD products: submit to Printful/Lulu via existing fulfillment provider

4. Update `arxmintProvider.js` `handleWebhook()` stub to call the above logic.

5. Add the webhook route to `server.js`.

6. Add a test for the webhook handler.

## Acceptance Criteria

- [ ] `POST /api/arxmint/webhook` endpoint exists and handles payment events
- [ ] Payment signature verified before processing
- [ ] Paid orders are marked as `paid` in database
- [ ] Digital products: download email sent after Lightning payment
- [ ] Test coverage for webhook handler

## Dependencies

- ArxMint webhook signature format may need verification against ArxMint docs/source
- If ArxMint uses a different verification method, document it and implement accordingly

## Notes

_Generated from AGENT_TASKS.md P2 item. The catalog half of ArxMint integration is done (020cc86); this is the payment completion/fulfillment half._
