---
id: 14
title: "Dual checkout UI — Stripe + ArxMint as parallel payment options"
priority: P2
severity: medium
status: completed
source: AGENT_TASKS.md
file: marketplace/frontend/
line: null
created: "2026-03-09T00:00:00"
execution_hint: parallel
context_group: payments
group_reason: "Payments group: tasks 014-015 both relate to payment/crypto infrastructure, independent of checkout flow tasks"
---

# Dual Checkout UI — Stripe + ArxMint as Parallel Options

**Priority:** P2 (medium)
**Source:** AGENT_TASKS.md Phase 3 Payments & Identity
**Location:** marketplace/frontend/, marketplace/backend/routes/checkout.js

## Problem

Currently checkout is Stripe-primary with a fallback to crypto. The UX doesn't offer ArxMint (Lightning/ecash) as a first-class parallel option. Creators want to offer crypto natively, not just as a failover. ArxMint Bazaar integration is a current focus (per CLAUDE.md).

## How to Fix

1. **Read** the current checkout flow in `store.html` / `checkout.html` to understand the existing payment button structure

2. **Design dual-option UI**:
   ```html
   <div class="payment-options">
     <button class="pay-stripe">Pay with Card (Stripe)</button>
     <button class="pay-arxmint">Pay with Lightning / Bitcoin</button>
   </div>
   ```

3. **Backend**: Add/verify `POST /api/checkout/arxmint` endpoint:
   - Creates an ArxMint Lightning invoice using `arxmintProvider.js`
   - Returns invoice + QR code data
   - Polls for payment completion (webhook or polling endpoint)

4. **BIP21 unified QR** (bonus): On the Lightning payment screen, show a BIP21 QR with `lightning=BOLT11` parameter so both on-chain and LN wallets work

5. **Payment-agnostic order state machine**: Ensure orders created via ArxMint go through the same `createOrder()` / `failOrder()` flow as Stripe orders

6. **Storefront API compatibility**: The `/api/storefront/catalog` and `/api/storefront/fulfill` endpoints should work with ArxMint checkout (ArxMint Bazaar integration)

## Acceptance Criteria

- [ ] Checkout page shows Stripe and ArxMint as parallel options (not fallback)
- [ ] ArxMint option creates a Lightning invoice and shows QR code
- [ ] Payment confirmation via webhook or polling updates order status
- [ ] BIP21 QR with `lightning=` param for universal wallet support
- [ ] Orders from both payment paths use the same order state machine

## Notes

_Generated from AGENT_TASKS.md Phase 3 Payments. arxmintService.js stubs were fixed to return NOT_IMPLEMENTED (task 056, commit bf9aa9e) — the next step is wiring real ArxMint API calls. Depends on HT-007 (ArxMint L402 implementation) for full crypto, but the dual UI can be built now with graceful degradation._
