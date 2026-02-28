---
id: 79
title: "Implement real-time crypto pricing via CoinGecko"
priority: P1
severity: high
status: completed
source: overnight_tasks
file: marketplace/backend/routes/cryptoCheckout.js
created: "2026-02-28T12:00:00"
execution_hint: sequential
context_group: checkout_payment
group_reason: "Same feature area as Stripe failover task 078"
---

# Implement real-time crypto pricing via CoinGecko

**Priority:** P1 (high)
**Source:** overnight_tasks (OVERNIGHT_TASKS.md P2 section), feature_audit
**Location:** marketplace/backend/routes/cryptoCheckout.js

## Problem

`cryptoCheckout.js` uses hardcoded static amounts for crypto payments. Crypto prices fluctuate significantly — a hardcoded BTC price from months ago means customers either overpay or underpay relative to the USD book price. Orders are also not persisted in the database at creation time.

Feature audit confirmed: "Crypto checkout is manual... there is no automated payment detection."

## How to Fix

1. Create `marketplace/backend/services/cryptoPricingService.js`:
   - `getUSDPrice(crypto: 'bitcoin'|'monero'|'litecoin')` — fetches from CoinGecko free API: `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,monero,litecoin&vs_currencies=usd`
   - Cache prices for 5 minutes to avoid rate limiting
   - Returns `{ btc: number, xmr: number, ltc: number, updatedAt: Date }`
   - Fallback: if CoinGecko unreachable, return last cached price or throw error

2. In `cryptoCheckout.js` `POST /api/crypto/create-order`:
   - Fetch current price from `cryptoPricingService.getUSDPrice()`
   - Calculate exact crypto amount: `cryptoAmount = bookPriceUSD / currentUSDPrice`
   - Round to appropriate decimals (BTC: 8, XMR: 12, LTC: 8)
   - Include `priceLockedAt` and `priceExpiresAt` (15 min) in response
   - Persist order to database with `status='pending_crypto'`

3. Add price expiry validation to `POST /api/crypto/verify-payment`:
   - Reject orders where `priceExpiresAt` has passed (customer must restart checkout)
   - Show clear message: "Price has expired — please refresh your order"

4. Frontend: display real-time amounts with "Price valid for 15 minutes" countdown

## Acceptance Criteria

- [ ] cryptoPricingService.js fetches live BTC/XMR/LTC prices from CoinGecko
- [ ] Prices cached for 5 min with fallback to last known price
- [ ] Crypto checkout shows real-time USD conversion
- [ ] Orders persisted to DB at creation with pending_crypto status
- [ ] 15-minute price lock enforced on verify endpoint

## Notes

_From OVERNIGHT_TASKS.md P2 section. Hardcoded prices are a revenue integrity issue._
