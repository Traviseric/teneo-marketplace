---
id: 5
title: "Add NIP-57 zap receipt relay polling endpoint"
priority: P2
severity: medium
status: completed
source: worker_suggestion
file: marketplace/backend/routes/storefront.js
line: null
created: "2026-03-09T21:00:00"
execution_hint: sequential
context_group: payments_nostr
group_reason: "Builds on NIP-57 zapService.js from commit 00aeccd"
---

# Add NIP-57 zap receipt relay polling endpoint

**Priority:** P2 (medium)
**Source:** worker_001 suggestion (post-NIP-57 implementation, commit 00aeccd)
**Location:** marketplace/backend/routes/storefront.js + marketplace/frontend/store.html

## Problem

The NIP-57 Zap-to-unlock feature (implemented in commit 00aeccd) requires the buyer to manually copy-paste the zap receipt (kind 9735 event) to prove payment. This is a poor UX — the backend should poll the Nostr relay for the receipt automatically and unlock the content without requiring manual action from the buyer.

From worker_001 suggestion: "add a relay-subscription polling endpoint so the frontend can receive the kind 9735 receipt automatically without manual copy-paste."

Also: "verify window._adminStoreSlug is set by the admin.html store management JS when the settings tab loads" — this should be verified as part of this task.

## How to Fix

1. **Add server-side relay polling to `zapService.js`:**
   ```js
   // Poll relay for kind 9735 event matching paymentHash
   async function pollForZapReceipt(relayUrl, paymentHash, timeoutMs = 60000) {
     // Use nostr-tools or WebSocket to subscribe to relay
     // Filter: { kinds: [9735], "#e": [zapRequestEventId] }
     // Return receipt when found or null on timeout
   }
   ```

2. **Add polling endpoint to `storefront.js` (or new route file):**
   ```
   GET /api/zap/receipt?payment_hash=<hash>&relay=<relayUrl>
   ```
   - Server opens a short-lived WebSocket to the relay
   - Subscribes to kind 9735 events with matching `#bolt11` or `#p` tag
   - Responds with the receipt JSON when found, or `{ status: "pending" }` if not yet available
   - Timeout after 30s with `{ status: "timeout" }`

3. **Update `store.html` zap unlock flow:**
   - After showing the Lightning invoice, start polling `GET /api/zap/receipt?payment_hash=...` every 3 seconds
   - When receipt is returned, auto-unlock the content (call existing `/api/storefront/zap-verify` or equivalent)
   - Show a "Payment detected! Unlocking..." message without requiring manual paste

4. **Verify `window._adminStoreSlug`** is correctly set in `admin.html` when the store settings tab loads:
   - Search for `_adminStoreSlug` in admin.html
   - If missing, set it from the store data loaded on tab open

5. **Add tests** in `marketplace/backend/__tests__/zapService.test.js` (extend existing file)

## Acceptance Criteria

- [ ] `GET /api/zap/receipt?payment_hash=<hash>` returns `{ status: "found", receipt: {...} }` when kind 9735 event exists on relay
- [ ] `GET /api/zap/receipt?payment_hash=<hash>` returns `{ status: "pending" }` when receipt not yet available
- [ ] Frontend polls automatically and unlocks content without manual copy-paste
- [ ] `window._adminStoreSlug` is verified as set in admin.html settings tab
- [ ] WebSocket connection is closed after receipt found or timeout
- [ ] Tests cover: receipt found, pending, and timeout scenarios

## Notes

_Generated from worker_001 post-implementation suggestion after NIP-57 commit 00aeccd. Improves UX from "manual copy-paste" to "automatic unlock". Builds directly on zapService.js already in place._
