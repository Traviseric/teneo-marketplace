---
id: 6
title: "Fix hardcoded fallback prices in crypto checkout"
priority: P2
severity: medium
status: completed
source: security_audit
file: marketplace/backend/routes/cryptoCheckout.js
line: 59
created: "2026-03-06T00:00:00Z"
execution_hint: sequential
context_group: checkout_pricing
group_reason: "Same file as task 001 (crypto checkout price bypass)"
---

# Fix Hardcoded Fallback Prices in Crypto Checkout

**Priority:** P2 (medium)
**Source:** security_audit
**Location:** marketplace/backend/routes/cryptoCheckout.js:59

## Problem

When CoinGecko is unavailable, the crypto checkout uses hardcoded fallback prices ($65,000 for BTC, $150 for XMR). These stale values could significantly over- or under-charge customers as market prices move, and will become increasingly wrong as the codebase ages without updates.

**Code with issue:**
```javascript
const fallbacks = { bitcoin: 65000, monero: 150 };
return fallbacks[coinId] || 65000;
```

## How to Fix

When CoinGecko is unavailable, return an error to the client and require the user to retry, rather than silently accepting stale hardcoded prices. Alternatively, add a secondary price oracle (e.g., Kraken public API) as a real fallback.

**Option A (Fail safe — recommended):**
```javascript
// In getCryptoPrice() when CoinGecko fails:
throw new Error('Price oracle temporarily unavailable. Please try again in a moment.');
// Route returns 503 to client with retry message
```

**Option B (Secondary oracle):**
```javascript
// Try Kraken as fallback when CoinGecko fails
const KRAKEN_PAIRS = { bitcoin: 'XXBTZUSD', monero: 'XMRUSD' };
const krakenUrl = `https://api.kraken.com/0/public/Ticker?pair=${KRAKEN_PAIRS[coinId]}`;
const krakenRes = await axios.get(krakenUrl, { timeout: 3000 });
// Parse and return Kraken price
```

## Acceptance Criteria

- [ ] Hardcoded `{ bitcoin: 65000, monero: 150 }` fallback removed
- [ ] CoinGecko failure returns a clear error to the client (503 with retry message) OR a live secondary oracle is queried
- [ ] Client-side shows a user-friendly "price temporarily unavailable, please retry" message

## Notes

_Generated from security_audit findings. CWE-330. Should be done in same session as task 001 (same file)._
