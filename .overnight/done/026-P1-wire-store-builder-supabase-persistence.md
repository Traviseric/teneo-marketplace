---
id: 26
title: "Wire AI Store Builder persistence to Supabase (stores + products tables)"
priority: P1
severity: high
status: completed
source: AGENT_TASKS.md
file: marketplace/backend/routes/storeBuilder.js
line: null
created: "2026-03-06T12:00:00Z"
execution_hint: long_running
context_group: ai_builder
group_reason: "Phase 1 AI Store Builder — depends on task 025 (renderer); delivers full save/load loop"
---

# Wire AI Store Builder persistence to Supabase (stores + products tables)

**Priority:** P1 (high)
**Source:** AGENT_TASKS.md (Phase 1 — AI Store Builder Core)
**Location:** `marketplace/backend/routes/storeBuilder.js`, `marketplace/backend/database/supabase-migration.sql`

## Problem

The AI Store Builder can generate a `store_config` JSON and (after task 025) render HTML — but generated stores are not saved anywhere. There is no `stores` table in the database, and no way for a user to return to their store, edit it, or publish it to a URL.

Without persistence, the builder is a demo with no user value. Users need to:
1. Generate a store
2. Save it with a unique slug (e.g., `/store/soy-candles-shop`)
3. Load it back for editing
4. Publish it live

## How to Fix

### Step 1: Add `stores` and `products` tables

Add to `marketplace/backend/database/supabase-migration.sql`:
```sql
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  slug TEXT UNIQUE NOT NULL,
  config JSONB NOT NULL,
  html TEXT,
  status TEXT DEFAULT 'draft',  -- draft | published
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  description TEXT,
  type TEXT,  -- ebook | course | service | physical
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Also add SQLite equivalents to `marketplace/backend/database/schema.sql` for local dev:
```sql
CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  slug TEXT UNIQUE NOT NULL,
  config TEXT NOT NULL,  -- JSON stored as TEXT in SQLite
  html TEXT,
  status TEXT DEFAULT 'draft',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  store_id TEXT REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  description TEXT,
  type TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### Step 2: Add save/load endpoints to storeBuilder.js

```javascript
// POST /api/store-builder/save
// Save a generated store config (and optionally rendered HTML)
router.post('/save', requireAuth, async (req, res) => {
  const { config, html, slug } = req.body;
  const storeId = uuidv4();
  await db.run(
    'INSERT INTO stores (id, user_id, slug, config, html) VALUES (?, ?, ?, ?, ?)',
    [storeId, req.session.userId, slug, JSON.stringify(config), html || null]
  );
  // Save products from config
  for (const product of config.commerce?.products || []) {
    await db.run(
      'INSERT INTO products (id, store_id, name, price, description, type) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), storeId, product.name, product.price, product.description || '', product.type || 'digital']
    );
  }
  res.json({ success: true, storeId, slug });
});

// GET /api/store-builder/stores
// List user's stores
router.get('/stores', requireAuth, async (req, res) => {
  const stores = await db.all(
    'SELECT id, slug, status, created_at, updated_at FROM stores WHERE user_id = ? ORDER BY created_at DESC',
    [req.session.userId]
  );
  res.json({ success: true, stores });
});

// GET /api/store-builder/stores/:id
// Load a specific store
router.get('/stores/:id', requireAuth, async (req, res) => {
  const store = await db.get('SELECT * FROM stores WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId]);
  if (!store) return res.status(404).json({ error: 'Store not found' });
  res.json({ success: true, store: { ...store, config: JSON.parse(store.config) } });
});
```

### Step 3: Add slug generation helper

Auto-generate a URL-safe slug from the store name:
```javascript
function generateSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
```

### Step 4: Update supabase-migration.sql

Ensure the migration file is updated with the new tables so Supabase production environment can be updated.

## Acceptance Criteria

- [ ] `stores` table exists in both `supabase-migration.sql` and `schema.sql`
- [ ] `products` table exists in both migration files
- [ ] `POST /api/store-builder/save` saves a store config and products to DB, returns storeId + slug
- [ ] `GET /api/store-builder/stores` returns list of user's stores
- [ ] `GET /api/store-builder/stores/:id` returns full store config
- [ ] All endpoints require authentication (requireAuth middleware)
- [ ] Slug is auto-generated from store name if not provided
- [ ] Works in SQLite mode (local dev) and Postgres mode (Supabase)
- [ ] No regressions in existing tests

## Dependencies

- Task 013 (AI Store Builder schema + pipeline) — DONE
- Task 025 (store renderer) — should be done first so `html` can be saved alongside `config`

## Notes

_Generated from AGENT_TASKS.md Phase 1 item: "Store persistence to Supabase — stores table, products to products, email capture to subscribers". This completes the generate → render → save loop. Store publishing (make it live at /store/{slug}) is a follow-up task._
