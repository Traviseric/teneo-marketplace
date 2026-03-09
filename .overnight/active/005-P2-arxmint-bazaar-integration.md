---
id: 5
title: "ArxMint Bazaar integration — arxmint.com/bazaar consumes storefront catalog API"
priority: P2
severity: medium
status: completed
source: project_declared
file: marketplace/backend/routes/storefront.js
line: ~
created: "2026-03-09T00:00:00Z"
execution_hint: sequential
context_group: arxmint_payments
group_reason: "ArxMint Bazaar integration and fulfillment webhook are closely coupled — share context"
---

# ArxMint Bazaar integration — arxmint.com/bazaar consumes storefront catalog API

**Priority:** P2 (medium)
**Source:** AGENT_TASKS.md (Phase 3 — Payments & Identity), CLAUDE.md (Current Focus)
**Location:** `marketplace/backend/routes/storefront.js`, `marketplace/backend/services/arxmintProvider.js`

## Problem

Per CLAUDE.md, the first integration target is **ArxMint Bazaar** (`arxmint.com/bazaar`) — a live merch store built with OpenBazaar.ai that accepts ArxMint Lightning payments.

The Storefront API (`/api/storefront/catalog`, `/api/storefront/fulfill`) is built and ready. However, the actual integration with ArxMint — where ArxMint calls these endpoints to browse products and trigger fulfillment — has not been wired up end-to-end.

**What's needed:**
1. ArxMint needs to be able to call `/api/storefront/catalog` and get a catalog of physical/digital products with Lightning prices
2. When a user pays via ArxMint Lightning, ArxMint calls `/api/storefront/fulfill` with the order details
3. The ArxMint webhook handler must verify the payment proof and trigger Printful/Lulu fulfillment
4. Products need to have Lightning/sat pricing as well as USD pricing

**Current state (from arxmintProvider.js):**
- `arxmintService.js` has graceful NOT_IMPLEMENTED returns for `createL402Invoice()`, `verifyL402Payment()`, `acceptCashuToken()` (fixed in bf9aa9e)
- `arxmintProvider.js` scaffold exists
- No actual ArxMint API calls are made
- Storefront API accepts `X-Storefront-API-Key` header for auth

## How to Fix

1. **Review ArxMint API docs** (check any docs in `te-btc/internal/arxmint-internal/BAZAAR_STRATEGY.md`):
   - Understand how ArxMint calls the storefront (push vs pull model)
   - What webhook format does ArxMint send for payment confirmations?

2. **Implement `arxmintProvider.js` fulfill handler:**
   - Listen for ArxMint payment webhook at `POST /api/arxmint/webhook`
   - Verify payment signature/proof from ArxMint
   - Extract product ID, quantity, shipping address from webhook payload
   - Call Printful/Lulu fulfillment via existing providers
   - Return success/failure to ArxMint

3. **Add Lightning pricing to catalog:**
   - Catalog products should include both `price_usd_cents` and `price_sats` fields
   - `price_sats` = USD price converted via current BTC/USD rate (use `getConversionRate()` from analyticsService or a live API)
   - Expose pricing in `/api/storefront/catalog` response

4. **Update `/api/storefront/fulfill` to handle ArxMint payment type:**
   - Accept `paymentType: "lightning"` alongside existing `paymentType: "stripe"`
   - Verify ArxMint payment proof before processing fulfillment

5. **Test with ArxMint's staging environment** if available

## Acceptance Criteria

- [ ] `/api/storefront/catalog` returns products with both USD and sat pricing
- [ ] ArxMint webhook verified and fulfillment triggered for Lightning payments
- [ ] Printful order created when ArxMint confirms payment
- [ ] `POST /api/arxmint/webhook` documented in API docs / .env.example
- [ ] `ARXMINT_WEBHOOK_SECRET` env var added to .env.example for signature verification

## Notes

_Generated from AGENT_TASKS.md and CLAUDE.md Current Focus. This is the FIRST REVENUE-GENERATING integration target. The Storefront API is ready; this wires ArxMint as the payment consumer. See te-btc/internal/arxmint-internal/BAZAAR_STRATEGY.md for full plan._
