---
id: 103
title: "Persist federation revenue share to DB at checkout"
priority: P0
severity: critical
status: completed
source: OVERNIGHT_TASKS.md
file: marketplace/backend/services/orderService.js
line: 34
created: "2026-02-28T18:00:00Z"
execution_hint: sequential
context_group: federation_module
group_reason: "Touches orderService.js and database/schema.sql — same feature area as task 102"
---

# Persist federation revenue share to DB at checkout

**Priority:** P0 (critical)
**Source:** OVERNIGHT_TASKS.md (confirmed by digest rounds 36–45, cross-verified against actual files)
**Location:** `marketplace/backend/services/orderService.js:34` + `marketplace/backend/database/schema.sql`

## Problem

`searchPeers()` (task 102) correctly tags federation search results with `source_node`, `source_node_id`, and `revenue_share_pct` fields so the originating peer node can be credited. However, `orderService.createOrder()` NEVER reads `order.metadata.sourceNode` and NEVER inserts a record into any revenue-share table.

Additionally, the `network_revenue_shares` table does NOT EXIST in `database/schema.sql` — it was referenced in task descriptions but was never actually created. This means even if `createOrder()` tried to INSERT, it would fail with a "no such table" error.

**Verified facts:**
- `grep -r "network_revenue_shares" marketplace/backend/` returns NO MATCHES
- `database/schema.sql` has no `network_revenue_shares` table
- `orderService.js:34` `createOrder()` destructures `metadata` from `orderData` but never reads `metadata.sourceNode`

**Code with issue:**
```javascript
// orderService.js:34 — createOrder()
const {
    orderId, stripeSessionId, customerEmail, customerName,
    bookId, bookTitle, bookAuthor, format, price, currency = 'USD',
    metadata = {}   // <-- sourceNode/revenue_share_pct sit here but are never used
} = orderData;

// After the orders INSERT, nothing checks metadata.sourceNode
// No INSERT into network_revenue_shares ever happens
```

## How to Fix

**Step 1: Add `network_revenue_shares` table to `database/schema.sql`**

```sql
CREATE TABLE IF NOT EXISTS network_revenue_shares (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL REFERENCES orders(order_id),
    peer_node_id TEXT NOT NULL,
    peer_node_url TEXT,
    revenue_share_pct REAL NOT NULL DEFAULT 0.0,
    revenue_share_amount REAL,
    currency TEXT DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'pending',  -- pending | paid | failed
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    paid_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_network_revenue_shares_order_id
    ON network_revenue_shares(order_id);
CREATE INDEX IF NOT EXISTS idx_network_revenue_shares_peer_node_id
    ON network_revenue_shares(peer_node_id);
CREATE INDEX IF NOT EXISTS idx_network_revenue_shares_status
    ON network_revenue_shares(status);
```

**Step 2: Also run this via `database/init.js`** — ensure `init.js` executes the schema.sql changes (or add the CREATE TABLE there directly if that's how other tables are added).

**Step 3: Add revenue share INSERT to `orderService.createOrder()`**

After the successful `INSERT INTO orders` (after `resolve({ id: this.lastID, orderId })`), add:

```javascript
// After orders INSERT succeeds, persist federation revenue share if applicable
if (metadata.sourceNode && metadata.revenueSharePct) {
    const revShareSql = `
        INSERT INTO network_revenue_shares
            (order_id, peer_node_id, peer_node_url, revenue_share_pct,
             revenue_share_amount, currency, status)
        VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `;
    const revenueAmount = price * (metadata.revenueSharePct / 100);
    this.db.run(revShareSql, [
        orderId,
        metadata.sourceNode,
        metadata.sourceNodeUrl || null,
        metadata.revenueSharePct,
        revenueAmount,
        currency
    ], (revErr) => {
        if (revErr) {
            console.error('[OrderService] Failed to persist revenue share:', revErr.message);
            // Non-fatal — order still succeeds, revenue share logged as failed
        }
    });
}
```

**Step 4: Update `database/init.js`** to create the table if it's not already auto-run from schema.sql.

**Step 5: Add a test** in `marketplace/backend/tests/` verifying that:
- `createOrder()` with `metadata.sourceNode` set produces a `network_revenue_shares` row
- `createOrder()` without `metadata.sourceNode` does NOT produce a row

## Acceptance Criteria

- [ ] `network_revenue_shares` table exists in `database/schema.sql`
- [ ] `database/init.js` creates the table on `node init.js` run
- [ ] `orderService.createOrder()` INSERTs into `network_revenue_shares` when `metadata.sourceNode` is set
- [ ] INSERT failure is non-fatal (logs error but order still resolves)
- [ ] Test added/updated to cover the revenue share persistence path
- [ ] All existing tests still pass

## Notes

_Generated from OVERNIGHT_TASKS.md P0 item — confirmed real by direct file inspection (grep returned zero matches for `network_revenue_shares` in entire backend directory)._
