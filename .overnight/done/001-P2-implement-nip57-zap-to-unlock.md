---
id: 1
title: "Implement NIP-57 Zap-to-unlock for items under $5"
priority: P2
severity: medium
status: completed
source: project_declared
file: marketplace/backend/routes/storefront.js
created: "2026-03-09T20:00:00"
execution_hint: sequential
context_group: nostr_payments
group_reason: "Related to NIP-05 task — both extend Nostr identity/payment features"
---

# Implement NIP-57 Zap-to-unlock for items under $5

**Priority:** P2 (medium)
**Source:** project_declared (AGENT_TASKS.md Phase 3: Payments & Identity)
**Location:** marketplace/backend/routes/storefront.js, marketplace/backend/services/

## Problem

The platform has NIP-07 browser auth and NIP-98 HTTP auth but no NIP-57 Zap support.
For low-value digital items (< $5), Lightning Zaps (NIP-57) provide a frictionless
"pay instantly with a Nostr Zap" experience: buyer Zaps the product Nostr pubkey, the
server listens for the zap receipt (kind 9735) on a relay, verifies amount, and unlocks
the download — no checkout form, no cookies, no email required.

This is a key differentiator for AI-agent purchasers and Lightning-native users, and
aligns with the "machine-payable endpoints" goal already in the roadmap.

## How to Fix

1. **Add zap endpoint config** in `marketplace/backend/routes/storefront.js`:
   - For products with `price_usd < 5`, include a `zap_address` (Lightning Address or
     LNURL) and the product's Nostr pubkey in the catalog response.

2. **Create `zapService.js`** in `marketplace/backend/services/`:
   - `generateZapInvoice(productId, amountSats)` — calls ArxMint or lnbits to create
     a BOLT11 invoice with a `zap` description hash per NIP-57.
   - `verifyZapReceipt(kind9735Event, expectedAmountSats, productId)` — validates the
     zap receipt event signature, amount, and product pubkey.

3. **Add `/api/storefront/zap-unlock` POST route**:
   - Accept: `{ kind9735Event, productId }`
   - Verify receipt via `zapService.verifyZapReceipt()`
   - If valid: generate a one-time download token (same pattern as existing download
     tokens in `downloadRoutes.js`) and return it
   - If invalid: return 402 with error

4. **Frontend zap button** in product page / store.html:
   - Show "Zap to Unlock ⚡" button for items < $5
   - Use `window.nostr.signEvent()` (NIP-07) to request a zap from the user's wallet
   - Poll or wait for the kind 9735 receipt
   - Submit to `/api/storefront/zap-unlock` for the download token

5. **Tests**: Add Jest tests for `zapService.js` — mock the relay event, test amount
   validation and invalid-signature rejection.

## Acceptance Criteria

- [ ] Products with price < $5 expose a `zap_address` field in catalog API
- [ ] `/api/storefront/zap-unlock` endpoint verifies NIP-57 zap receipts
- [ ] Valid zap receipt returns a one-time download token
- [ ] Invalid/wrong-amount receipts return 402
- [ ] Frontend shows "Zap to Unlock" button for eligible products
- [ ] Jest tests cover the zap verification logic
- [ ] No regressions in existing Stripe/Lightning checkout flows

## Notes

_Generated from project_declared findings — AGENT_TASKS.md Phase 3 unchecked item._
_ArxMint service is already integrated; reuse its Lightning invoice creation if possible._
_See existing download token pattern in `marketplace/backend/routes/downloadRoutes.js`._
