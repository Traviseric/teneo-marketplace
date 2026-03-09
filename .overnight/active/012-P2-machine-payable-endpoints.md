---
id: 12
title: "Machine-payable endpoints for AI agents"
priority: P2
severity: medium
status: pending
source: project_declared
file: marketplace/backend/routes/storefront.js
line: null
created: "2026-03-09T00:00:00Z"
execution_hint: parallel
context_group: independent
group_reason: "Standalone API feature — no file overlap with other active tasks"
---

# Machine-Payable Endpoints for AI Agents

**Priority:** P2 (medium)
**Source:** project_declared (AGENT_TASKS.md Phase 3 Payments & Identity)
**Location:** marketplace/backend/routes/storefront.js + new agentRoutes.js

## Problem

AI agents cannot autonomously discover, evaluate, and purchase products from OpenBazaar.ai. The platform has no machine-readable product discovery or agent-friendly payment flow. As AI agent ecosystems grow (OpenAI plugins, LangChain agents, Claude tools), this is an emerging monetization channel.

Machine-payable endpoints would allow:
- AI agents to browse the catalog programmatically
- Agents to initiate and complete purchases with minimal human interaction
- Integration with agent frameworks via well-defined JSON schemas

## How to Fix

1. **Create `marketplace/backend/routes/agentRoutes.js`:**
   - `GET /api/agent/catalog` — returns catalog with machine-readable schema
     - Includes: product id, title, description, price, type, capabilities[], requirements[]
     - Returns OpenAPI-compatible schema in response headers (`X-Schema: ...`)
   - `POST /api/agent/quote` — get a purchase quote for one or more products
     - Input: `{items: [{product_id, quantity}], agent_id}`
     - Output: `{quote_id, total, expires_at, payment_options: [{method, url, instructions}]}`
   - `POST /api/agent/purchase` — initiate purchase (returns payment URL or Lightning invoice)
   - `GET /api/agent/order/:orderId` — check order status

2. **Agent authentication:**
   - Accept `X-Agent-ID` header for agent identification (rate limiting, audit)
   - Accept NIP-98 auth (task 008) OR API key auth (`X-API-Key: AGENT_API_KEY`)
   - Log all agent requests to a separate audit table

3. **Structured product schema:**
   - Add `capabilities` array to catalog.json products: e.g., `["digital_download", "instant_delivery", "course_access"]`
   - Add `agent_description` field: machine-optimized description of what the product does/provides

4. **Well-Known Agent Discovery:**
   - `GET /.well-known/agent-capabilities.json` — returns list of available agent endpoints and payment methods
   - Format compatible with OpenAI plugin manifest style

5. **Mount routes in server.js:**
   - `app.use('/api/agent', agentRoutes)`

6. **Rate limiting:**
   - Apply strict rate limits to agent endpoints (prevent scraping)

## Acceptance Criteria

- [ ] GET /api/agent/catalog returns structured catalog JSON
- [ ] POST /api/agent/quote returns purchase quote with payment options
- [ ] POST /api/agent/purchase initiates Stripe or Lightning payment
- [ ] GET /api/agent/order/:orderId returns order status
- [ ] /.well-known/agent-capabilities.json exists
- [ ] Agent endpoints are rate-limited
- [ ] No regressions in existing storefront routes

## Notes

_This is a differentiator feature — OpenBazaar.ai as the first AI-native marketplace. Keep scope to discovery + quote + initiate; full autonomous completion via Lightning depends on task 008 (NIP-98) being complete._
