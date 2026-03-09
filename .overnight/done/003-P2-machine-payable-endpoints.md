---
id: 3
title: "Implement machine-payable endpoints for AI agents"
priority: P2
severity: medium
status: completed
source: project_declared
file: marketplace/backend/routes/storefront.js
created: "2026-03-09T22:00:00Z"
execution_hint: sequential
context_group: machine_payments_module
group_reason: "Extends storefront API — shares context with payment-agnostic state machine work"
---

# Implement machine-payable endpoints for AI agents

**Priority:** P2 (medium)
**Source:** project_declared (docs/ROADMAP.md Phase 3)
**Location:** marketplace/backend/routes/storefront.js, marketplace/backend/services/arxmintService.js

## Problem

OpenBazaar.ai has no endpoints that AI agents can autonomously purchase from. Agent-to-agent commerce requires machine-payable APIs: an endpoint that returns a price, accepts payment (Lightning invoice or L402 token), and delivers the product — all without human interaction.

The storefront catalog API exists but has no payment-gating for programmatic access. AI agents using the MCP ecosystem need a way to browse, pay, and receive digital products headlessly.

## How to Fix

1. **GET /api/machine/catalog** — Return product catalog with Lightning pricing in sats:
   ```json
   {"products": [{"id": "...", "title": "...", "price_sats": 5000, "type": "digital"}]}
   ```

2. **POST /api/machine/order** — Accept `{product_id, buyer_pubkey, payment_method: "lightning"}`:
   - Create a pending order
   - Call ArxMint `createCheckout` to get a Lightning invoice
   - Return `{order_id, invoice, expires_at}`

3. **GET /api/machine/order/:id/status** — Poll order status. Returns `{status: "pending"|"paid"|"fulfilled", download_url?: "..."}`.

4. **POST /api/machine/webhook** — Receive payment confirmation from ArxMint, mark order paid, trigger digital delivery (generate download token, return in status endpoint).

5. Add `X-Agent-Auth` header support (NIP-98 HTTP auth already implemented — reuse `requireNip98Auth` middleware).

6. Rate limit machine endpoints separately (more permissive for authenticated agents, stricter for anonymous).

## Acceptance Criteria

- [x] `/api/machine/catalog` returns products with sat pricing
- [x] `/api/machine/order` creates Lightning invoice via ArxMint
- [x] `/api/machine/order/:id/status` returns fulfillment status + download URL when paid
- [x] NIP-98 auth middleware applied to order creation
- [x] End-to-end integration test with ArxMint mock (18 tests, all passing)
- [x] Rate limiting applied (30 req/min anonymous, 60 req/min authenticated)

## Notes

_Generated from docs/ROADMAP.md Phase 3: "Machine-payable endpoints for AI agents"._
_Depends on ArxMint being functional. Use ArxMint mock/stub if not available._
