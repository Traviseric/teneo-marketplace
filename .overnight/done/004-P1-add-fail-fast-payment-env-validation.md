---
id: 4
title: "Add fail-fast validation for payment-critical env vars in cryptoCheckout.js"
priority: P1
severity: high
status: completed
source: code_quality_audit
file: marketplace/backend/routes/cryptoCheckout.js
line: 99
created: "2026-03-09T23:45:00Z"
execution_hint: parallel
context_group: independent
group_reason: "Standalone — touches only cryptoCheckout.js and server startup"
---

# Add fail-fast validation for payment-critical env vars in cryptoCheckout.js

**Priority:** P1 (high)
**Source:** code_quality_audit
**Location:** marketplace/backend/routes/cryptoCheckout.js:99

## Problem

`cryptoCheckout.js` uses placeholder strings as fallbacks for payment addresses:

```javascript
function getPaymentAddress(method) {
    const addresses = {
        bitcoin: process.env.BTC_ADDRESS || 'CONFIGURE_BTC_ADDRESS_IN_ENV',
        lightning: process.env.LIGHTNING_ADDRESS || 'CONFIGURE_LIGHTNING_ADDRESS_IN_ENV',
        monero: process.env.XMR_ADDRESS || 'CONFIGURE_XMR_ADDRESS_IN_ENV'
    };
    return addresses[method] || addresses.bitcoin;
}
```

If `BTC_ADDRESS` is not set in a deployment, the route returns the literal string `'CONFIGURE_BTC_ADDRESS_IN_ENV'` as the payment address. The UI will display this placeholder as a Bitcoin address. Customers sending real BTC to this would lose their funds.

The BIP21 URI builder at line 193 has a guard check, but the `address` field (line 207) is still returned raw — exposing the placeholder to the frontend.

## How to Fix

**Option A: Fail-fast at startup** (recommended for production):

Add a startup check in `cryptoCheckout.js` or `server.js`:
```javascript
// In server.js or at module load in cryptoCheckout.js
if (process.env.NODE_ENV === 'production') {
  const requiredPaymentVars = ['SESSION_SECRET', 'STRIPE_SECRET_KEY'];
  // Only require crypto vars if manual crypto checkout is enabled
  if (process.env.ENABLE_MANUAL_CRYPTO_CHECKOUT === 'true') {
    requiredPaymentVars.push('BTC_ADDRESS', 'LIGHTNING_ADDRESS');
  }
  for (const v of requiredPaymentVars) {
    if (!process.env[v]) throw new Error(`[startup] Required env var missing: ${v}`);
  }
}
```

**Option B: Guard the route handler**:
```javascript
function getPaymentAddress(method) {
    const addresses = {
        bitcoin: process.env.BTC_ADDRESS,
        lightning: process.env.LIGHTNING_ADDRESS,
        monero: process.env.XMR_ADDRESS
    };
    const addr = addresses[method] || addresses.bitcoin;
    if (!addr) {
        throw new Error(`Payment address for ${method} not configured. Set ${method.toUpperCase()}_ADDRESS env var.`);
    }
    return addr;
}
```

## Acceptance Criteria

- [ ] Placeholder string `'CONFIGURE_BTC_ADDRESS_IN_ENV'` removed from return value
- [ ] Missing payment address fails with clear error, not silent placeholder
- [ ] Works correctly when env vars are properly set
- [ ] Tests pass

## Notes

_Generated from code_quality_audit findings._
