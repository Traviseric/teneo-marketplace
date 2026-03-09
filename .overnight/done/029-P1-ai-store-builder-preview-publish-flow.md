---
id: 29
title: "AI Store Builder — store preview and publish flow"
priority: P1
severity: high
status: completed
source: AGENT_TASKS.md
file: marketplace/backend/routes/storeBuilder.js
line: null
created: "2026-03-06T14:00:00Z"
execution_hint: sequential
context_group: ai_builder
group_reason: "Phase 1 AI Store Builder — depends on 025+026+028; publishes stores to /store/{slug}"
---

# AI Store Builder — store preview and publish flow

**Priority:** P1 (high)
**Source:** AGENT_TASKS.md (Phase 1 — AI Store Builder Core)
**Location:** `marketplace/backend/routes/storeBuilder.js`, `marketplace/backend/server.js`

## Problem

Generated stores are saved in the database (task 026) but are not publicly accessible. There is no way to:
1. Preview a draft store before publishing
2. Publish a store to a live public URL
3. Access a published store at `openbazaar.ai/store/{slug}`

Without this, the entire store builder flow is an admin-only loop that produces no user-facing result. Publishing to a URL is the core deliverable of the Phase 1 AI Store Builder.

## How to Fix

### Step 1: Add preview endpoint (authenticated)

```javascript
// GET /api/store-builder/stores/:id/preview
// Returns rendered HTML for the store, requires auth (draft-only access)
router.get('/stores/:id/preview', requireAuth, async (req, res) => {
  const store = await db.get('SELECT * FROM stores WHERE id = ? AND user_id = ?',
    [req.params.id, req.session.userId]);
  if (!store) return res.status(404).json({ error: 'Store not found' });

  // Return HTML directly for browser rendering
  res.set('Content-Type', 'text/html');
  res.send(store.html || renderStorePage(JSON.parse(store.config)));
});
```

### Step 2: Add publish endpoint

```javascript
// POST /api/store-builder/stores/:id/publish
// Sets status = 'published', makes store accessible at /store/:slug
router.post('/stores/:id/publish', requireAuth, async (req, res) => {
  const store = await db.get('SELECT * FROM stores WHERE id = ? AND user_id = ?',
    [req.params.id, req.session.userId]);
  if (!store) return res.status(404).json({ error: 'Store not found' });

  await db.run(
    'UPDATE stores SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    ['published', req.params.id]
  );

  res.json({
    success: true,
    url: `/store/${store.slug}`,
    slug: store.slug
  });
});
```

### Step 3: Add unpublish endpoint

```javascript
// POST /api/store-builder/stores/:id/unpublish
router.post('/stores/:id/unpublish', requireAuth, async (req, res) => {
  // Set status back to 'draft'
  await db.run('UPDATE stores SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    ['draft', req.params.id]);
  res.json({ success: true });
});
```

### Step 4: Add public store route in server.js (or storeBuilder.js)

Register a public route that serves published store HTML:

```javascript
// GET /store/:slug — public, no auth required
// Serve the published HTML for a store
router.get('/:slug', async (req, res) => {
  const store = await db.get(
    "SELECT html, config FROM stores WHERE slug = ? AND status = 'published'",
    [req.params.slug]
  );
  if (!store) return res.status(404).send('<h1>Store not found</h1>');
  res.set('Content-Type', 'text/html');
  res.send(store.html);
});
```

Mount this router in server.js at `/store`.

### Step 5: Validate slug safety

Ensure slug contains only `[a-z0-9-]` characters (already done by `generateSlug()` from task 026). Add a check in publish that rejects stores with no slug or invalid characters.

## Acceptance Criteria

- [ ] `GET /api/store-builder/stores/:id/preview` returns HTML for authenticated store owner
- [ ] `POST /api/store-builder/stores/:id/publish` sets status to published, returns public URL
- [ ] `POST /api/store-builder/stores/:id/unpublish` sets status back to draft
- [ ] `GET /store/:slug` serves published HTML publicly (no auth required)
- [ ] Unpublished/draft stores return 404 on the public route
- [ ] Public route mounted in server.js at `/store`
- [ ] Slug is validated (alphanumeric + hyphens only)
- [ ] No regressions in existing tests

## Dependencies

- Task 025 (store renderer) — DONE
- Task 026 (Supabase persistence) — DONE
- Task 028 (natural language editing) — recommended first (edit before publish)

## Notes

_Generated from AGENT_TASKS.md Phase 1 item: "Store preview and publish flow — preview before live, publish to openbazaar.ai/store/{slug}"._
