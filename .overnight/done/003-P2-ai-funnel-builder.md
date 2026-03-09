---
id: 3
title: "AI funnel builder — natural language to funnel config"
priority: P2
severity: medium
status: completed
source: project_declared
file: marketplace/backend/services/
line: null
created: "2026-03-09T00:00:00Z"
execution_hint: sequential
context_group: email_funnel
group_reason: "Extends funnel pipeline; shares context with task 002"
---

# AI Funnel Builder

**Priority:** P2 (medium)
**Source:** project_declared (AGENT_TASKS.md Phase 2 Funnels — AI funnel builder integration)
**Location:** marketplace/backend/services/aiFunnelBuilderService.js (new)

## Problem

The AI Store Builder (aiStoreBuilderService.js) can generate a full store config from a natural language brief. But there is no equivalent for funnels — creators must manually configure landing pages, email capture forms, and sequences. This creates friction and slows onboarding.

The pattern is proven: brief → Claude API → structured JSON → persist → render. The same pattern should apply to funnels.

## How to Fix

1. **Create `marketplace/backend/services/aiFunnelBuilderService.js`:**
   - Follow the same lazy-require pattern as `aiStoreBuilderService.js`
   - Input: natural language brief (e.g., "Create a lead magnet funnel for my copywriting course — offer a free 5-day email course in exchange for email opt-in, then pitch the paid course on day 5")
   - Output: funnel config JSON with:
     - `headline`, `subheadline`, `cta_text` for the landing page
     - `lead_magnet_title`, `lead_magnet_description`
     - `email_sequence` array: [{day, subject, preview_text, body_outline}]
     - `upsell_product` suggestion (optional)
   - Use claude-sonnet-4-6 (or claude-opus-4-6 for complex outputs)
   - Return structured JSON using Claude's tool_use or prefilled JSON pattern

2. **Add route to `funnels.js`:**
   - `POST /api/funnels/generate` — admin-only, takes `{brief}`, returns generated funnel config
   - `POST /api/funnels/generate-and-save` — generates and persists funnel + creates email sequence

3. **Add admin UI section in `admin.html`:**
   - "AI Funnel Builder" section with textarea for brief
   - "Generate Preview" and "Save Funnel" buttons (same pattern as AI Course Builder)

4. **Wire to existing funnel save route** (`POST /api/funnels`) for persistence

## Acceptance Criteria

- [ ] `aiFunnelBuilderService.js` created with brief-to-config generation
- [ ] POST `/api/funnels/generate` returns structured funnel config
- [ ] POST `/api/funnels/generate-and-save` persists funnel to DB
- [ ] Admin UI has AI Funnel Builder section
- [ ] Works without API key (returns graceful error, not crash)
- [ ] No regressions in existing funnel routes

## Notes

_Follow aiCourseBuilderService.js and aiStoreBuilderService.js as the reference patterns._
