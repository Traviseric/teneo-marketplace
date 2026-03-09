---
id: 15
title: "NIP-07 browser auth (Alby, nos2x) — Nostr wallet-based login"
priority: P2
severity: medium
status: completed
source: AGENT_TASKS.md
file: marketplace/backend/auth/
line: null
created: "2026-03-09T00:00:00"
execution_hint: parallel
context_group: payments
group_reason: "Payments/identity group: task 015 is Nostr auth which complements ArxMint Lightning (task 014)"
---

# NIP-07 Browser Auth (Alby, nos2x)

**Priority:** P2 (medium)
**Source:** AGENT_TASKS.md Phase 3 Payments & Identity
**Location:** marketplace/backend/auth/, marketplace/frontend/login.html

## Problem

The auth system supports magic links, OAuth SSO, and basic Nostr login button (task 011). But NIP-07 browser extension auth (Alby, nos2x) is not fully implemented. NIP-07 allows users to sign in using their Nostr identity via a browser extension — no email or password needed. This is a key identity layer for the crypto-native user base.

The CLAUDE.md lookup table notes: "Nostr/Alby Auth: Port from C:\code\arxmint\lib\nostr-auth.ts" — but that path doesn't exist (verified in lessons.json). Will need to implement from scratch.

## How to Fix

1. **Frontend** (`login.html` or a new `nostr-login.html`):
   - Check for `window.nostr` (NIP-07 extension)
   - If available, show "Login with Nostr" button
   - On click: call `window.nostr.getPublicKey()` to get npub
   - Generate a challenge string
   - Call `window.nostr.signEvent(challengeEvent)` to get signed event
   - POST `{ pubkey, sig, event }` to `/api/auth/nostr/verify`

2. **Backend** (`marketplace/backend/auth/` or `routes/auth.js`):
   - `POST /api/auth/nostr/verify`:
     - Validate the NIP-07 signed event (check kind=27235, created_at recency, tags)
     - Verify signature using a Nostr crypto library (or implement schnorr verify manually using secp256k1)
     - If valid: create/find user by pubkey, create session
     - Return session cookie

3. **NIP-98 HTTP Auth** (bonus): For API requests, verify `Authorization: Nostr <base64-event>` header

4. **Dependencies**: Add `@noble/secp256k1` or similar for schnorr signature verification (pure JS, no native deps)

5. **Add tests** for `nostr/verify` endpoint

## Acceptance Criteria

- [ ] "Login with Nostr" button appears on login page when `window.nostr` is available
- [ ] NIP-07 sign flow works (getPublicKey → signEvent → POST to backend)
- [ ] Backend verifies schnorr signature correctly
- [ ] Valid Nostr auth creates a session and logs user in
- [ ] Invalid signatures are rejected with 401
- [ ] Tests added for the verify endpoint

## Notes

_Generated from AGENT_TASKS.md Phase 3 Payments & Identity. The arxmint/lib/nostr-auth.ts source doesn't exist on disk (lessons.json verified_facts_round5), so implementing from scratch using NIP-07/NIP-98 spec and @noble/secp256k1._
