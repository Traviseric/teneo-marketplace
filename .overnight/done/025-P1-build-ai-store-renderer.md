---
id: 25
title: "Build AI Store Builder store renderer (config JSON → HTML pages)"
priority: P1
severity: high
status: completed
source: AGENT_TASKS.md
file: marketplace/backend/services/
line: null
created: "2026-03-06T12:00:00Z"
execution_hint: long_running
context_group: ai_builder
group_reason: "Phase 1 AI Store Builder — depends on task 013 (schema + pipeline already done); task 026 (Supabase persistence) depends on this"
---

# Build AI Store Builder store renderer (config JSON → HTML pages)

**Priority:** P1 (high)
**Source:** AGENT_TASKS.md (Phase 1 — AI Store Builder Core)
**Location:** `marketplace/backend/services/storeRendererService.js` (new), `marketplace/frontend/components-library/`

## Problem

Task 013 (AI Store Builder schema + Claude API pipeline) is complete — `POST /api/store-builder/generate` accepts a business brief and returns a `store_config` JSON object. However, there is no renderer that converts this config into actual HTML store pages.

The second half of the AI Store Builder value proposition is missing: we can parse intent, but we cannot generate a working store. The component library (`marketplace/frontend/components-library/`) has 12 components with `{{VARIABLE}}` template syntax ready to be consumed — but nothing renders them.

## How to Fix

### Step 1: Audit the component library

Read `marketplace/frontend/components-library/` and `COMPONENT_MANIFEST.json` to understand:
- What components exist (hero, CTA, product-card, etc.)
- What `{{VARIABLE}}` placeholders each uses
- How components compose into a page

### Step 2: Create `storeRendererService.js`

Create `marketplace/backend/services/storeRendererService.js`:
```javascript
const fs = require('fs');
const path = require('path');

const COMPONENTS_DIR = path.join(__dirname, '../../frontend/components-library');

function loadComponent(name) {
  const p = path.join(COMPONENTS_DIR, `${name}.html`);
  return fs.readFileSync(p, 'utf8');
}

function fillTemplate(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || '');
}

function renderStorePage(storeConfig) {
  // Map store_config fields to component variables
  const vars = {
    STORE_NAME: storeConfig.name,
    TAGLINE: storeConfig.tagline,
    PRIMARY_COLOR: storeConfig.palette?.primary || '#2563eb',
    ACCENT_COLOR: storeConfig.palette?.accent || '#7c3aed',
    BG_COLOR: storeConfig.palette?.bg || '#ffffff',
    HEADING_FONT: storeConfig.fonts?.heading || 'Inter',
    BODY_FONT: storeConfig.fonts?.body || 'Inter',
    // ... map all fields
  };

  // Build page from components
  const hero = fillTemplate(loadComponent('hero'), vars);
  const productSection = renderProducts(storeConfig.commerce?.products || [], vars);
  const ctaSection = fillTemplate(loadComponent('cta'), vars);

  // Assemble full page
  return assembleHTML({ hero, productSection, ctaSection, vars });
}

function renderProducts(products, vars) { /* ... */ }
function assembleHTML(parts) { /* ... */ }

module.exports = { renderStorePage };
```

### Step 3: Add render endpoint

Add to `marketplace/backend/routes/storeBuilder.js`:
```javascript
const { renderStorePage } = require('../services/storeRendererService');

// POST /api/store-builder/render
router.post('/render', async (req, res) => {
  const { config } = req.body;
  if (!config) return res.status(400).json({ error: 'config required' });
  try {
    const html = renderStorePage(config);
    res.json({ success: true, html });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/store-builder/generate-and-render
// Single call: brief → config → HTML
router.post('/generate-and-render', async (req, res) => {
  const { brief } = req.body;
  if (!brief || brief.length < 20) {
    return res.status(400).json({ error: 'Brief too short' });
  }
  try {
    const config = await buildStoreFromBrief(brief);
    const html = renderStorePage(config);
    res.json({ success: true, config, html });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

### Step 4: Test with 3 canonical briefs

Test the renderer with:
1. "I sell handmade soy candles, earthy aesthetic, ship nationwide"
2. "Online course on personal finance for millennials, $197 price"
3. "Freelance logo design service, portfolio-driven, $500/project"

Each should produce a styled, navigable HTML page.

## Acceptance Criteria

- [ ] `marketplace/backend/services/storeRendererService.js` exists with `renderStorePage(config)` function
- [ ] `POST /api/store-builder/render` accepts a `store_config` object and returns HTML
- [ ] `POST /api/store-builder/generate-and-render` accepts a brief and returns both config and HTML
- [ ] Rendered HTML uses the correct brand colors, fonts, store name, and tagline from the config
- [ ] At least 3 components from the component library are used (hero, product cards, CTA)
- [ ] Rendered pages are valid HTML that can be saved and opened in a browser
- [ ] Server still starts when `ANTHROPIC_API_KEY` is not set (render-only path works without AI)

## Dependencies

- Task 013 (AI Store Builder schema + pipeline) — DONE (commit 97d14e2)
- Task 026 (Supabase persistence) depends on this task

## Notes

_Generated from AGENT_TASKS.md Phase 1 item: "Build store renderer — config JSON → static store pages using component library". Read COMPONENT_MANIFEST.json first to understand what components are available before implementing the renderer._
