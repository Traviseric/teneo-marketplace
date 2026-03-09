---
id: 4
title: "Implement L402 paywalls (HTTP 402 + Lightning invoice)"
priority: P2
severity: medium
status: completed
source: project_declared
file: marketplace/backend/routes/downloadRoutes.js
line: null
created: "2026-03-09T21:00:00"
execution_hint: long_running
context_group: payments_nostr
group_reason: "Lightning payments — related to ArxMint and NIP-57 stack"
---

# Implement L402 paywalls (HTTP 402 + Lightning invoice)

**Priority:** P2 (medium)
**Source:** project_declared (AGENT_TASKS.md Phase 3 Payments & Identity)
**Location:** marketplace/backend/routes/downloadRoutes.js + new middleware

## Problem

L402 (formerly LSAT) is an HTTP standard where a server responds to an unauthenticated request with `HTTP 402 Payment Required` + a Lightning invoice. The client pays the invoice, receives a preimage, and re-requests with the preimage as a macaroon credential. This enables machine-readable micropayments for content access.

This is listed in the roadmap as a key feature for AI-agent payments and low-cost content gating: `[P2] IMPLEMENT: L402 paywalls — HTTP 402 + macaroon + Lightning invoice`

The existing `arxmintService.js` has stub methods that reference L402, and `HT-007` notes the full port needs the arxmint source. However, L402 can be implemented from scratch using existing libraries.

## How to Fix

1. **Install dependencies:**
   ```bash
   npm install bolt11 lnurl
   ```

2. **Create `marketplace/backend/middleware/l402Auth.js`:**
   - `requireL402(priceUsd)` middleware factory
   - On unauthenticated request: call ArxMint (or LND/LNbits fallback) to create a Lightning invoice
   - Return `HTTP 402` with header `WWW-Authenticate: L402 macaroon="<token>", invoice="<bolt11>"`
   - Include JSON body: `{ error: "Payment required", invoice: "<bolt11>", amount_sat: N, expires_at: "..." }`
   - On request with `Authorization: L402 <macaroon>:<preimage>` header: verify preimage against invoice hash in DB
   - If valid: set `req.l402Paid = true` and call `next()`

3. **Add payment record table** to `database/schema.sql` if not exists:
   ```sql
   CREATE TABLE IF NOT EXISTS l402_payments (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     payment_hash TEXT UNIQUE NOT NULL,
     preimage TEXT,
     amount_sat INTEGER NOT NULL,
     resource_path TEXT NOT NULL,
     paid_at DATETIME,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   );
   ```

4. **Wire into `downloadRoutes.js`:**
   - For items priced under $5, add `requireL402(price)` middleware before the download handler
   - Keep existing token-based download flow as fallback when `req.l402Paid` is false

5. **Add tests** in `marketplace/backend/__tests__/l402.test.js`

6. **Use ArxMint for invoice creation** via `arxmintService.createInvoice(amountSat, memo)` if available, otherwise use a configurable LND REST endpoint.

## Acceptance Criteria

- [ ] `GET /api/download/:id` returns `HTTP 402` with valid L402 header when no payment credential present
- [ ] After paying the Lightning invoice and re-requesting with `Authorization: L402 macaroon:preimage`, download is served
- [ ] Payment record stored in DB with `paid_at` timestamp
- [ ] Middleware is reusable — can wrap any route, not just downloads
- [ ] Graceful degradation: if ArxMint/LND unavailable, falls back to standard token-based download
- [ ] Jest tests cover: 402 response shape, valid preimage acceptance, invalid preimage rejection

## Notes

_Generated from AGENT_TASKS.md. HT-007 notes the ArxMint L402 source is unavailable — implement from scratch using bolt11 library and ArxMint's invoice API. The existing arxmintService.js scaffold (stubs) can be filled in._
