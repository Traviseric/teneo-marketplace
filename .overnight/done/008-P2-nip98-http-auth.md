---
id: 8
title: "NIP-98 HTTP auth for API requests"
priority: P2
severity: medium
status: completed
source: project_declared
file: marketplace/backend/auth/
line: null
created: "2026-03-09T00:00:00Z"
execution_hint: sequential
context_group: nostr_auth
group_reason: "Extends NIP-07 auth (done/015) — same auth module"
---

# NIP-98 HTTP Auth for API Requests

**Priority:** P2 (medium)
**Source:** project_declared (AGENT_TASKS.md Phase 3 Payments & Identity)
**Location:** marketplace/backend/auth/ + routes/auth.js

## Problem

NIP-07 browser auth (done in task 015) allows Nostr users to sign in via their browser extension. But NIP-98 is the standard for authenticating HTTP API requests using Nostr — it enables headless clients, AI agents, and mobile apps to authenticate without a browser session.

Without NIP-98, API consumers (other Nostr apps, agents) must use session cookies which don't work for stateless/headless clients.

NIP-98 works by having the client sign a Nostr event (kind 27235) containing the HTTP method, URL, and payload hash, then including it as an Authorization header.

## How to Fix

1. **Create `marketplace/backend/auth/nip98.js`:**
   - `verifyNip98Auth(req)` — middleware function
   - Reads `Authorization: Nostr <base64-encoded-event>` header
   - Decodes the base64 JSON event
   - Validates:
     - `event.kind === 27235`
     - `event.created_at` is within 60 seconds of current time (replay prevention)
     - `event.tags` has `['u', requestUrl]` matching the actual request URL
     - `event.tags` has `['method', requestMethod]` matching actual HTTP method
     - Schnorr signature verifies against `event.pubkey`
   - Uses `nostr-tools` library for signature verification (or `noble-secp256k1`)
   - Returns `{valid: true, pubkey}` or `{valid: false, error}`

2. **Add middleware to protect API endpoints:**
   - `requireNip98Auth` middleware that calls `verifyNip98Auth()` and either passes or returns 401
   - Apply to selected routes that should accept Nostr auth (e.g., `/api/store-builder/generate`, `/api/storefront/catalog`)

3. **Add NIP-98 session creation endpoint:**
   - `POST /api/auth/nostr/nip98-login` — accepts a NIP-98 signed event, verifies it, and creates a session (same as NIP-07 login but for headless clients)
   - Returns a session token or JWT for subsequent requests

4. **Add `nostr-tools` to package.json** if not already present

5. **Document in `/api/auth/capabilities`** or README that NIP-98 is supported

## Acceptance Criteria

- [ ] verifyNip98Auth() correctly validates NIP-98 events
- [ ] requireNip98Auth middleware rejects invalid/expired events
- [ ] POST /api/auth/nostr/nip98-login creates session for valid events
- [ ] Replay attack prevented (60-second window)
- [ ] nostr-tools or equivalent added to dependencies
- [ ] Existing NIP-07 auth flows unaffected
- [ ] Unit tests for verifyNip98Auth() covering valid/invalid/expired cases

## Notes

_NIP-98 spec: https://github.com/nostr-protocol/nips/blob/master/98.md — reference implementation exists in nostr-tools._
