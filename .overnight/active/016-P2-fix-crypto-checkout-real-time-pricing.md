---
id: 16
title: "Fix crypto checkout to use real-time pricing instead of hardcoded amounts"
priority: P2
severity: high
status: completed
source: feature_audit
file: marketplace/backend/routes/cryptoCheckout.js
line: 1
created: "2026-02-28T00:00:00"
execution_hint: sequential
context_group: features
group_reason: "Crypto checkout improvements; touches cryptoCheckout.js"
---

# Fix crypto checkout to use real-time pricing instead of hardcoded amounts

**Priority:** P2 (high effort, not blocking core Stripe flow)
**Source:** feature_audit
**Location:** marketplace/backend/routes/cryptoCheckout.js

## Problem

The crypto checkout is a stub masquerading as automation:

1. **Hardcoded placeholder amounts**: `getCryptoAmount()` returns fixed values instead of real-time conversion rates
2. **Orders not saved to database**: `// For now, just return the order info` — orders created via crypto checkout are never persisted
3. **Manual verification**: Payment requires buyer to email proof and wait 24 hours for manual review — this is not "automated" crypto payments
4. **Static wallet addresses**: `getPaymentAddress()` returns env vars with 'CONFIGURE' fallback — no HD wallet derivation for unique per-order addresses

The README claims "Bitcoin/Lightning/Monero" as supported payment methods suggesting automation. The reality is a form that shows a wallet address and asks users to send funds manually.

**Code with issue:**
```javascript
// cryptoCheckout.js
function getCryptoAmount(currency, usdAmount) {
    // Hardcoded approximate amounts (not real-time)
    const rates = { BTC: 0.000025, LTC: 0.005 };  // will be wrong within days
    return (usdAmount * rates[currency]).toFixed(8);
}
// Order creation comment: "For now, just return the order info"
```

## How to Fix

**Priority Fix 1: Real-time pricing** via CoinGecko free API (no API key needed):
```javascript
async function getCryptoAmount(currency, usdAmount) {
    const coinIds = { BTC: 'bitcoin', ETH: 'ethereum', XMR: 'monero' };
    const coinId = coinIds[currency];
    const resp = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`);
    const usdPerCoin = resp.data[coinId].usd;
    return (usdAmount / usdPerCoin).toFixed(8);
}
```

**Priority Fix 2: Save crypto orders to database**:
```javascript
// In the order creation endpoint
const orderId = await orderService.createCryptoOrder({
    email, items, totalUsd, currency, cryptoAmount, walletAddress,
    status: 'pending_payment'
});
```

**Priority Fix 3: Add order status tracking page** — give customer a URL to check their order status, reducing "email us proof" friction.

**Longer term**: BTCPay Server integration for automated on-chain verification (high effort — separate task).

## Acceptance Criteria

- [ ] `getCryptoAmount()` fetches real-time rates from CoinGecko (with caching to avoid rate limits)
- [ ] Crypto orders are saved to the database with `pending_payment` status
- [ ] Customer receives order confirmation email with payment instructions and order ID
- [ ] Order status endpoint allows checking payment status by order ID

## Notes

_Generated from feature_audit findings. Full BTCPay integration is a separate high-effort task. These fixes make the existing manual flow significantly less broken._
