---
id: 1
title: "Implement payment-agnostic order state machine"
priority: P2
severity: medium
status: completed
source: project_declared
file: marketplace/backend/routes/checkout.js
created: "2026-03-09T22:00:00Z"
execution_hint: sequential
context_group: payments_module
group_reason: "Touches checkout.js and order lifecycle — same area as task 007"
---

# Implement payment-agnostic order state machine

**Priority:** P2 (medium)
**Source:** project_declared (docs/ROADMAP.md Phase 3)
**Location:** marketplace/backend/routes/checkout.js, marketplace/backend/services/orderService.js

## Problem

The current checkout flow has separate code paths for Stripe and ArxMint (Lightning/ecash) payments. There is no unified order state machine — each payment provider handles order lifecycle differently. This makes it hard to add new providers and creates inconsistency in how orders transition through states (pending → processing → completed → failed → refunded).

As we add more payment methods (ArxMint, L402, Zap), each needs its own bespoke completion logic. A payment-agnostic state machine would centralize order state transitions so providers just emit events.

## How to Fix

1. Define canonical order states in `orderService.js`:
   - `pending` → created, awaiting payment
   - `processing` → payment received, fulfillment starting
   - `completed` → fulfilled (download link sent / POD order submitted)
   - `failed` → payment failed or fulfillment error
   - `refunded` → refund processed

2. Create `updateOrderState(orderId, newState, metadata)` function that:
   - Validates state transitions (no jumping from pending → refunded)
   - Logs transition with timestamp and metadata
   - Emits any side effects (send email on `completed`, log on `failed`)

3. Refactor Stripe webhook handler (`handleCheckoutCompleted`) and ArxMint webhook handler (`handleFulfill`) to call `updateOrderState` instead of ad-hoc DB updates.

4. Add `state` and `state_transitions` columns to orders table (JSON array of `{from, to, at, metadata}`).

5. Test: write 5 Jest tests covering valid and invalid state transitions.

## Acceptance Criteria

- [ ] Canonical states defined and documented
- [ ] `updateOrderState()` enforces valid transitions
- [ ] Stripe and ArxMint webhooks use the unified state machine
- [ ] Orders table has `state` and `state_transitions` columns
- [ ] Jest tests for state machine pass
- [ ] No regressions in existing checkout tests

## Notes

_Generated from docs/ROADMAP.md Phase 3: "Payment-agnostic order state machine"._
