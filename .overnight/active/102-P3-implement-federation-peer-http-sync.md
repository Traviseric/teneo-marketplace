---
id: 102
title: "Implement federation peer HTTP sync for cross-node catalog discovery"
priority: P3
severity: medium
status: completed
source: feature_audit
file: marketplace/backend/routes/networkRoutes.js
line: 1
created: "2026-02-28T10:00:00Z"
execution_hint: long_running
context_group: federation
group_reason: "Spans networkRoutes.js, config/network.js, and network-registry.json — complex feature area"
---

# Implement federation peer HTTP sync for cross-node catalog discovery

**Priority:** P3 (medium)
**Source:** feature_audit (feature-missing: Cross-Node Discovery & Revenue Sharing Federation)
**Location:** `marketplace/backend/routes/networkRoutes.js`, `marketplace/backend/config/network.js`

## Problem

The federation network has full configuration infrastructure (peer lists, cryptographic keys, NetworkConfig) but zero actual peer-to-peer HTTP communication. The `/api/network/search` endpoint explicitly comments out federation and only returns local results:

```javascript
// networkRoutes.js — search endpoint comment
// For now, return results from local search.
// In future, this will aggregate from network stores.
```

Features claimed in README as "cross-node discovery" and "revenue sharing":
- `NetworkConfig.peers` stores peer node URLs — but no HTTP requests are ever made to them
- Revenue sharing percentage (10-20%) is configured — but no payment routing exists
- `network-registry.json` has peer entries — but they are never queried

The `npm run register-node` script referenced in README does not exist in `package.json`.

## How to Fix

### Step 1: Add peer catalog sync HTTP call

In `networkRoutes.js`, implement the federated search by fanning out HTTP requests to known peers:

```javascript
const axios = require('axios');
const networkConfig = require('../config/network');

// In GET /api/network/search
async function searchPeers(query, localResults) {
  const peers = networkConfig.getPeers() || [];
  if (!peers.length) return localResults;

  const peerRequests = peers.map(peer =>
    axios.get(`${peer.url}/api/search`, {
      params: { q: query },
      timeout: 3000,  // 3s timeout per peer
      headers: { 'X-Node-Id': networkConfig.getNodeId() }
    }).catch(err => {
      console.warn(`[Federation] Peer ${peer.url} unreachable:`, err.message);
      return { data: { results: [] } };
    })
  );

  const peerResponses = await Promise.all(peerRequests);
  const peerResults = peerResponses.flatMap(r => (r.data.results || []).map(book => ({
    ...book,
    source_node: r.config?.baseURL || 'unknown',
    revenue_share_pct: peer.revenueShare || 10
  })));

  return [...localResults, ...peerResults];
}
```

### Step 2: Add referral tracking in checkout

When a book is discovered via a peer node, record the `source_node` in the order metadata so revenue share can be calculated at checkout time.

### Step 3: Add register-node script to package.json

```json
"scripts": {
  "register-node": "node marketplace/backend/scripts/register-node.js"
}
```

Create `marketplace/backend/scripts/register-node.js` that posts the node's public key and URL to a registry endpoint.

### Step 4: Revenue share calculation

In `orderService.createOrder()`, check if order has `sourceNode` in metadata and log the revenue share owed:

```javascript
if (metadata.sourceNode) {
  await db.run(
    'INSERT INTO network_revenue_shares (order_id, source_node, share_pct, amount) VALUES (?, ?, ?, ?)',
    [orderId, metadata.sourceNode, metadata.revenueSharePct || 10, price * 0.10]
  );
}
```

## Acceptance Criteria

- [ ] `/api/network/search?q=` fans out to configured peer nodes with 3-second timeout
- [ ] Peer errors are caught gracefully (unreachable peer doesn't break local search)
- [ ] Search returns combined local + peer results with `source_node` field on peer results
- [ ] `npm run register-node` script exists (even if stub)
- [ ] Revenue share is recorded in DB when a purchase comes via a peer referral
- [ ] `networkEnabled` flag in config respected (if false, skip peer queries)

## Notes

_Generated from feature_audit critical finding: Cross-Node Discovery & Revenue Sharing Federation. Config infrastructure exists (peers, keys, revenue share config) but no HTTP calls are made. This is a partial implementation — complete peer sync with cryptographic signing and Fedimint settlement is Tier 3 (ArxMint integration). This task implements the basic HTTP federation layer._
