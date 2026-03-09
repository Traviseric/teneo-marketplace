---
id: 4
title: "Build store renderer — config JSON → static store pages using component library"
priority: P1
severity: high
status: completed
source: AGENT_TASKS.md
file: marketplace/backend/services/aiStoreBuilderService.js
line: null
created: "2026-03-09T00:00:00"
execution_hint: long_running
context_group: store_builder
group_reason: "AI Store Builder group — tasks 004-005 build the core Phase 1 pipeline: renderer + Supabase persistence"
---

# Build Store Renderer — Config JSON → Static Store Pages

**Priority:** P1 (high)
**Source:** AGENT_TASKS.md Phase 1 AI Store Builder Core
**Location:** marketplace/backend/services/, marketplace/frontend/components-library/

## Problem

The AI Store Builder pipeline can generate a `store_config` JSON (schema defined, Claude API pipeline built). But there is no renderer that takes this JSON and produces actual HTML store pages. Without the renderer, the pipeline produces a config but no deliverable product.

The component library exists at `marketplace/frontend/components-library/` with 12 components and `COMPONENT_MANIFEST.json`. The renderer must use these components, inject brand colors/fonts/content from the config, and produce a working static store.

## How to Fix

1. **Read** `marketplace/frontend/components-library/COMPONENT_MANIFEST.json` to understand available components and their template variables (`{{VARIABLE}}` placeholders)
2. **Read** the `store_config` JSON schema at `marketplace/backend/services/store-config.schema.json` to understand the input shape
3. **Create** `marketplace/backend/services/storeRendererService.js`:
   - Input: `storeConfig` object (matches schema)
   - Output: Complete HTML string (or set of files) for a static store page
   - Template variable injection: map `storeConfig.brand.*` → `{{BRAND_NAME}}`, `{{PRIMARY_COLOR}}`, etc.
   - Component selection: select appropriate components based on `storeConfig.commerce.*` flags (has_courses → include course section, has_downloads → include digital product grid)
   - Product grid: render product cards for each item in `storeConfig.products[]`
4. **Wire** renderer into the store builder route (`marketplace/backend/routes/storeBuilder.js`):
   - After `aiStoreBuilderService.generateConfig()`, call `storeRendererService.render(config)`
   - Save rendered HTML to `store_builds` record (or to disk/Supabase Storage)
5. **Add tests** for the renderer in `marketplace/backend/__tests__/storeRenderer.test.js`

## Acceptance Criteria

- [ ] `storeRendererService.js` created with `render(storeConfig)` method
- [ ] Renderer uses component library templates with `{{VAR}}` injection
- [ ] Brand colors/fonts injected into CSS variables
- [ ] Product grid rendered from `storeConfig.products[]`
- [ ] Store page is valid HTML5 with inline CSS (no external build step needed)
- [ ] Renderer wired into storeBuilder route — POST /api/store-builder/generate returns rendered HTML (or URL)
- [ ] Tests added and passing

## Notes

_Generated from AGENT_TASKS.md Phase 1 AI Store Builder Core. This is the key missing piece — the pipeline can generate configs but can't produce working stores yet. Part of ~70% complete Phase 1._
