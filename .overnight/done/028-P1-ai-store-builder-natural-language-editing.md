---
id: 28
title: "AI Store Builder — natural language store editing (partial config updates)"
priority: P1
severity: high
status: completed
source: AGENT_TASKS.md
file: marketplace/backend/routes/storeBuilder.js
line: null
created: "2026-03-06T14:00:00Z"
execution_hint: sequential
context_group: ai_builder
group_reason: "Phase 1 AI Store Builder — depends on 025 (renderer) + 026 (persistence); 029 (preview/publish) depends on this"
---

# AI Store Builder — natural language store editing (partial config updates)

**Priority:** P1 (high)
**Source:** AGENT_TASKS.md (Phase 1 — AI Store Builder Core)
**Location:** `marketplace/backend/routes/storeBuilder.js`, `marketplace/backend/services/aiStoreBuilderService.js`

## Problem

Tasks 025 (renderer) and 026 (persistence) are complete — users can generate a store from a brief and save it. However, once saved, there is no way to update the store with natural language commands. Users cannot say "change the hero text to X", "add a product called Y for $Z", or "switch to a dark theme".

Without editing capability, the AI Store Builder is a one-shot demo rather than an interactive tool. This is the third pillar of the Phase 1 AI Store Builder value proposition.

## How to Fix

### Step 1: Add edit intent parser to `aiStoreBuilderService.js`

Add a `parseEditIntent(instruction, existingConfig)` function that uses Claude API to:
1. Receive the existing `store_config` JSON and a natural language instruction
2. Return a **partial** config patch (only the fields that should change)
3. Validate the patch against the store config schema

```javascript
async function parseEditIntent(instruction, existingConfig) {
  const prompt = `You are editing a store configuration.
Current config: ${JSON.stringify(existingConfig, null, 2)}
Edit instruction: "${instruction}"
Return ONLY the fields that need to change as a JSON object.
Do not return the full config — only the changed fields.`;

  // Call Claude API with structured output
  const patch = await callClaudeForEdit(prompt);
  return patch;
}
```

### Step 2: Add `PATCH /api/store-builder/stores/:id/edit` endpoint

```javascript
router.patch('/stores/:id/edit', requireAuth, async (req, res) => {
  const { instruction } = req.body;
  if (!instruction) return res.status(400).json({ error: 'instruction required' });

  // Load existing store
  const store = await db.get('SELECT * FROM stores WHERE id = ? AND user_id = ?',
    [req.params.id, req.session.userId]);
  if (!store) return res.status(404).json({ error: 'Store not found' });

  const existingConfig = JSON.parse(store.config);

  // Parse edit intent
  const patch = await parseEditIntent(instruction, existingConfig);

  // Deep merge patch into existing config
  const updatedConfig = deepMerge(existingConfig, patch);

  // Re-render HTML with updated config
  const html = renderStorePage(updatedConfig);

  // Save back
  await db.run(
    'UPDATE stores SET config = ?, html = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [JSON.stringify(updatedConfig), html, req.params.id]
  );

  res.json({ success: true, config: updatedConfig, html, patch });
});
```

### Step 3: Implement `deepMerge` helper

A simple deep merge that handles nested objects (palette, commerce.products, fonts):
- Primitive fields: patch overwrites existing
- Arrays (products): replace entire array if patch includes it
- Nested objects (palette, fonts): merge recursively

### Step 4: Handle offline fallback

If `ANTHROPIC_API_KEY` is not set, return 503 with a message that edit requires AI. Do not crash.

## Acceptance Criteria

- [ ] `PATCH /api/store-builder/stores/:id/edit` accepts `{ instruction }` and returns updated config + HTML
- [ ] Requires authentication (requireAuth middleware)
- [ ] Calls Claude API to parse the edit instruction into a config patch
- [ ] Deep-merges the patch into the existing config (does not overwrite unchanged fields)
- [ ] Re-renders HTML after config update
- [ ] Saves updated config and HTML to database
- [ ] Returns 503 gracefully if `ANTHROPIC_API_KEY` is not set
- [ ] Works in both SQLite (local) and Postgres (Supabase) modes
- [ ] No regressions in existing tests

## Dependencies

- Task 025 (store renderer) — DONE (commit 308a724)
- Task 026 (Supabase persistence) — DONE (commit 308a724)

## Notes

_Generated from AGENT_TASKS.md Phase 1 item: "Natural language store editing — partial config updates ('change hero text', 'add product', 'enable course module')"._
