---
id: 9
title: "BIP21 unified QR — on-chain URI with lightning= BOLT11 for crypto checkout"
priority: P2
severity: low
status: completed
source: project_declared
file: marketplace/frontend/crypto-checkout.html
line: ~
created: "2026-03-09T00:00:00Z"
execution_hint: parallel
context_group: arxmint_payments
group_reason: "BIP21 and ArxMint Bazaar both serve crypto payment UX — share Lightning context"
---

# BIP21 unified QR — on-chain URI with lightning= BOLT11 for crypto checkout

**Priority:** P2 (low)
**Source:** AGENT_TASKS.md (Phase 3 — Payments & Identity)
**Location:** `marketplace/frontend/crypto-checkout.html`, `marketplace/backend/routes/cryptoCheckout.js`

## Problem

Currently, the crypto checkout page (`crypto-checkout.html`) shows either a Bitcoin on-chain address OR a Lightning invoice, but not both in a unified way. Users with different wallet capabilities (some support on-chain only, some Lightning, some both) have to pick manually.

BIP21 is a Bitcoin URI scheme that supports both: `bitcoin:ADDRESS?amount=0.001&lightning=BOLT11INVOICE`. A single QR code encodes this URI, and wallets pick whichever they support. This is the modern standard for Bitcoin payments.

**Current state:**
- Dual checkout UI is implemented (47c89d9) with Stripe + Lightning as parallel options
- On-chain Bitcoin address is shown in crypto-checkout.html
- Lightning invoice support exists but may be generated separately
- No BIP21 unified QR generation

## How to Fix

1. **Generate BIP21 URI in `cryptoCheckout.js`:**
   ```js
   // POST /api/crypto/create-order returns:
   {
     "bip21_uri": "bitcoin:bc1qxyz?amount=0.001&label=Order%23123&lightning=lnbc1000n...",
     "btc_address": "bc1qxyz",
     "lightning_invoice": "lnbc1000n...",
     "amount_btc": "0.001",
     "amount_sats": 100000
   }
   ```

2. **Generate QR code client-side** using `qrcode.js` library (add via CDN in crypto-checkout.html):
   - Encode the `bip21_uri` (not just the address) into the QR code
   - Display QR code image replacing the plain address display

3. **Update crypto-checkout.html:**
   - Show unified QR for BIP21 URI (if Lightning invoice available)
   - Show plain on-chain QR + separate Lightning QR as fallback tabs
   - "Copy BIP21 URI" button + "Copy address only" link for older wallets
   - Display amount in both BTC and sats

4. **Backend: generate Lightning invoice** (if not already done) at order creation time:
   - If `LIGHTNING_NODE_URL` or `LNBITS_URL` set: generate BOLT11 invoice
   - Include in the BIP21 URI as `?lightning=BOLT11`
   - If Lightning not configured: just show on-chain QR without the `lightning=` param

5. **Track which payment method was used** (on-chain vs Lightning) in the order record

## Acceptance Criteria

- [ ] `POST /api/crypto/create-order` returns `bip21_uri` when Lightning is configured
- [ ] QR code on crypto-checkout.html encodes the BIP21 URI
- [ ] QR code can be scanned by BRD, BlueWallet, Phoenix, and similar wallets
- [ ] Fallback to on-chain-only QR when Lightning invoice is unavailable
- [ ] "Copy BIP21 URI" and "Copy address" buttons both work

## Notes

_Generated from AGENT_TASKS.md Phase 3 Payments. Dual checkout UI done (47c89d9). BIP21 is a quality-of-life improvement for Bitcoin power users and a differentiator for the crypto-native merchant audience._
