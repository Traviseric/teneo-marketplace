---
id: 5
title: "Store persistence to Supabase — stores table, products, subscribers"
priority: P1
severity: high
status: completed
source: AGENT_TASKS.md
file: marketplace/backend/services/storeBuilderService.js
line: null
created: "2026-03-09T00:00:00"
execution_hint: sequential
context_group: store_builder
group_reason: "AI Store Builder group — tasks 004-005 build the core Phase 1 pipeline: renderer + Supabase persistence"
---

# Store Persistence to Supabase — Stores, Products, Subscribers

**Priority:** P1 (high)
**Source:** AGENT_TASKS.md Phase 1 AI Store Builder Core
**Location:** marketplace/backend/services/, marketplace/backend/database/schema.sql

## Problem

The AI Store Builder can generate configs and (after task 004) render HTML, but the generated stores are not persisted to Supabase. The roadmap requires:
- `stores` table for store identity and config
- Products saved to `products` table
- Email capture entries saved to `subscribers` table
- Stores published to `openbazaar.ai/store/{slug}`

Without persistence, each generated store is ephemeral and can't be revisited, edited, or published.

## How to Fix

1. **Verify schema**: Check `marketplace/backend/database/schema.sql` for `stores`, `products`, `subscribers` tables. If missing, add them (and to `supabase-migration.sql` if it exists).

2. **Create/update** `marketplace/backend/services/storeBuilderService.js` (may already exist as `store-builds` CRUD):
   - `saveStore(storeConfig, renderedHtml, userId)` — INSERT into `stores` with config JSON + slug
   - `saveProducts(storeId, products[])` — bulk INSERT into `products`
   - `getStoreBySlug(slug)` — for serving at `/store/{slug}`

3. **Add store-serving route** in `marketplace/backend/routes/storeBuilder.js` or a new `stores.js` route:
   - `GET /store/:slug` — serve the rendered HTML from Supabase (or disk cache)
   - This makes stores publicly accessible at `openbazaar.ai/store/{slug}`

4. **Wire into store builder flow**:
   - After render (task 004), auto-save to `stores` table
   - Return the store URL (`/store/{slug}`) in the API response

5. **Slug generation**: Derive from brand name (lowercase, hyphens), ensure uniqueness (append random suffix if collision)

6. **Add tests** for CRUD operations

## Acceptance Criteria

- [ ] `stores` table exists in schema with: `id`, `slug`, `user_id`, `config_json`, `rendered_html`, `status`, `created_at`
- [ ] `storeBuilderService.saveStore()` inserts record and returns store URL
- [ ] `GET /store/:slug` serves the rendered HTML
- [ ] Products from `storeConfig.products[]` saved to `products` table with `store_id` FK
- [ ] Slug is URL-safe and unique
- [ ] Tests added and passing

## Notes

_Generated from AGENT_TASKS.md Phase 1 AI Store Builder Core. Supabase tables `stores`, `products`, `subscribers` are listed in HT-009 migration checklist — this task creates the schema and service layer for them._
