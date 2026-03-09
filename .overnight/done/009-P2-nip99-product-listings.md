---
id: 9
title: "NIP-99 product listings (kind 30402)"
priority: P2
severity: medium
status: completed
source: project_declared
file: marketplace/backend/routes/network.js
line: null
created: "2026-03-09T00:00:00Z"
execution_hint: sequential
context_group: nostr_auth
group_reason: "Nostr ecosystem — shares nostr-tools dependency with task 008"
---

# NIP-99 Product Listings (kind 30402)

**Priority:** P2 (medium)
**Source:** project_declared (AGENT_TASKS.md Phase 4 Network & Scale)
**Location:** marketplace/backend/routes/network.js + new nostrService.js

## Problem

NIP-99 defines Nostr events for classified listings (kind 30402), enabling products to be discoverable across the Nostr network. Currently OpenBazaar.ai products are only discoverable via the internal catalog API — they have no presence on the Nostr network.

Publishing products as NIP-99 events would make them discoverable by:
- Nostr clients with marketplace support
- Relay-based product search tools
- Other OpenBazaar.ai nodes (federation)

## How to Fix

1. **Create `marketplace/backend/services/nostrService.js`:**
   - `publishProductListing(product, brandConfig)` — creates and signs a kind 30402 event
   - Event structure per NIP-99:
     ```json
     {
       "kind": 30402,
       "tags": [
         ["d", product.id],
         ["title", product.title],
         ["summary", product.description],
         ["published_at", unixTimestamp],
         ["t", product.category],
         ["price", product.price.toString(), "USD"],
         ["location", "https://openbazaar.ai/store/{brand_id}"],
         ["image", product.image_url]
       ],
       "content": product.description
     }
     ```
   - Signs with the brand's Nostr key (from env: `NOSTR_PRIVATE_KEY` or generate ephemeral key)
   - Publishes to configured relays via WebSocket (use `nostr-tools` relayPool)

2. **Add relay configuration:**
   - `.env.example`: `NOSTR_PRIVATE_KEY=`, `NOSTR_RELAYS=wss://relay.damus.io,wss://nos.lol`
   - Default to a set of well-known public relays if not configured

3. **Add publish endpoint in network.js:**
   - `POST /api/network/publish-products` — admin-only, publishes all brand products to Nostr
   - `POST /api/network/publish-product/:productId` — publish a single product

4. **Auto-publish on product update:**
   - When admin updates catalog.json (via PATCH /admin/products/:id), optionally trigger nostrService.publishProductListing() for that product

5. **Add admin UI button:**
   - In admin.html, "Network" section: "Publish to Nostr Network" button

## Acceptance Criteria

- [ ] nostrService.js created with publishProductListing()
- [ ] POST /api/network/publish-products works for admin users
- [ ] Events are valid kind 30402 format per NIP-99
- [ ] NOSTR_PRIVATE_KEY + NOSTR_RELAYS env vars documented in .env.example
- [ ] Graceful degradation when NOSTR_PRIVATE_KEY not set (logs warning, skips)
- [ ] Admin UI has publish button
- [ ] No regressions in existing network/federation routes

## Notes

_NIP-99 spec: https://github.com/nostr-protocol/nips/blob/master/99.md — kind 30402 for classified listings._
