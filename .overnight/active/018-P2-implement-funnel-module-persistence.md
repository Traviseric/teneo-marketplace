---
id: 18
title: "Implement funnel draft persistence in funnel module backend"
priority: P2
severity: medium
status: completed
source: gap_analyzer
file: funnel-module/funnels.js
line: 1
created: "2026-02-28T00:00:00"
execution_hint: sequential
context_group: features
group_reason: "Funnel module backend fixes; touches funnels.js"
---

# Implement funnel draft persistence in funnel module backend

**Priority:** P2 (medium)
**Source:** gap_analyzer
**Location:** funnel-module/funnels.js

## Problem

The funnel module has a working frontend builder (`funnel-builder.js`) but the backend route stubs don't actually save data:

- **`save-draft` endpoint** returns success without persisting to database (has a TODO comment)
- **`get-draft` endpoint** returns success without reading from database
- **`deploy` endpoint** creates a directory and writes HTML but has no versioning or validation
- No A/B testing, no analytics, no upsell/order bump logic implemented

Funnel builders create pages they believe are saved, then lose their work when the server restarts.

**Code with issue:**
```javascript
// funnels.js — stub implementations
router.post('/save-draft', async (req, res) => {
    // TODO: Save to database
    res.json({ success: true });  // lies — nothing was saved
});

router.get('/get-draft/:id', async (req, res) => {
    // TODO: Load from database
    res.json({ success: true, data: null });  // returns nothing
});
```

## How to Fix

**1. Add funnel tables to database schema** (add to schema.sql or create schema-funnels.sql):
```sql
CREATE TABLE IF NOT EXISTS funnels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand_id TEXT NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    status TEXT DEFAULT 'draft',  -- draft|published
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS funnel_pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    funnel_id INTEGER REFERENCES funnels(id) ON DELETE CASCADE,
    page_type TEXT DEFAULT 'landing',  -- landing|upsell|downsell|thank-you
    components TEXT NOT NULL,  -- JSON array of component configs
    settings TEXT,             -- JSON page settings (title, seo, etc.)
    order_index INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**2. Implement real save-draft and get-draft**:
```javascript
router.post('/save-draft', authenticateAdmin, async (req, res) => {
    const { funnelId, components, settings, brandId } = req.body;
    // INSERT or UPDATE funnel_pages
    await db.run(
        `INSERT OR REPLACE INTO funnel_pages (funnel_id, components, settings) VALUES (?, ?, ?)`,
        [funnelId, JSON.stringify(components), JSON.stringify(settings)]
    );
    res.json({ success: true, funnelId });
});

router.get('/get-draft/:id', async (req, res) => {
    const page = await db.get('SELECT * FROM funnel_pages WHERE funnel_id = ?', [req.params.id]);
    res.json({ success: true, data: page });
});
```

## Acceptance Criteria

- [ ] `save-draft` endpoint persists funnel data to database
- [ ] `get-draft` endpoint retrieves saved funnel data
- [ ] Funnel data survives server restarts
- [ ] Deploy endpoint validates the funnel data before writing HTML
- [ ] Authentication required for save/deploy endpoints

## Notes

_Generated from gap_analyzer findings. Focus on basic persistence — A/B testing and analytics are separate follow-up tasks._
