---
id: 85
title: "Scaffold automated crypto payment verification (BTCPay/OpenNode)"
priority: P2
severity: high
status: completed
source: feature_audit
file: marketplace/backend/routes/cryptoCheckout.js
created: "2026-02-28T12:00:00"
execution_hint: sequential
context_group: checkout_payment
group_reason: "Same payment area as tasks 078, 079"
---

# Scaffold automated crypto payment verification (BTCPay/OpenNode)

**Priority:** P2 (high)
**Source:** feature_audit
**Location:** marketplace/backend/routes/cryptoCheckout.js

## Problem

Crypto checkout is fully manual: orders are created in the DB, the user is asked to send crypto to a static wallet address and email a transaction ID. There is no automated payment detection, no BTCPay Server integration, no Lightning invoice generation, and no webhook from any blockchain.

The verify-payment endpoint only stores the self-reported transaction ID for later manual admin review — meaning fraud is trivially easy (claim any transaction ID and get access).

## How to Fix

Scope: scaffold the BTCPay Server integration (not full deployment — that requires human to set up BTCPay instance).

1. Add `BTCPAY_URL`, `BTCPAY_API_KEY`, `BTCPAY_STORE_ID` to `.env.example` with documentation
2. Create `marketplace/backend/services/btcpayService.js`:
   - `createInvoice(amountUSD, orderId, customerEmail)` — calls BTCPay REST API to create an invoice with callback URL
   - `getInvoiceStatus(invoiceId)` — checks payment status
   - `verifyWebhookSignature(body, signature)` — validates BTCPay webhook signature using HMAC
3. Add `POST /api/crypto/btcpay/webhook` route:
   - Verify webhook signature from BTCPay
   - On `InvoiceSettled` event: update order status to 'completed', generate download token, send fulfillment email
4. Update `POST /api/crypto/create-order` to try BTCPay first:
   - If BTCPAY_URL is configured: create BTCPay invoice, return payment URL
   - If not configured: fall back to existing manual flow (no regression)
5. Update frontend crypto checkout to handle BTCPay invoice URL redirect

## Dependencies

- Requires human action: Set up a BTCPay Server instance (self-hosted or use BTCPay's hosted service) and configure BTCPAY_URL, BTCPAY_API_KEY in .env
- Worker can prepare the full code integration; deployment needs human BTCPay account

## Acceptance Criteria

- [ ] btcpayService.js created with invoice creation and webhook verification
- [ ] POST /api/crypto/btcpay/webhook route validates signature and fulfills orders
- [ ] BTCPAY_URL, BTCPAY_API_KEY, BTCPAY_STORE_ID documented in .env.example
- [ ] Graceful fallback to manual flow when BTCPay not configured
- [ ] No regression to existing manual crypto checkout

## Notes

_Generated from feature_audit high-severity finding. Human must set up BTCPay instance for full functionality._
