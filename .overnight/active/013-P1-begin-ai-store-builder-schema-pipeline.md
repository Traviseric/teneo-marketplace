---
id: 13
title: "Begin AI Store Builder — store_config schema + Claude API prompt pipeline"
priority: P1
severity: high
status: completed
source: feature_audit
file: marketplace/backend/
line: null
created: "2026-03-06T04:00:00Z"
execution_hint: long_running
context_group: ai_builder
group_reason: "Phase 1 top priority — AI Store Builder foundation"
---

# Begin AI Store Builder — store_config schema + Claude API prompt pipeline

**Priority:** P1 (high)
**Source:** feature_audit + AGENT_TASKS.md Phase 1
**Location:** `marketplace/backend/`, `marketplace/backend/services/`, `marketplace/backend/routes/`

## Problem

The AI Store Builder is described as the project's #1 differentiator ("describe your business, get a working store") and is the Phase 1 priority in ROADMAP.md and AI_STORE_BUILDER_IMPLEMENTATION_CHECKLIST.md. Currently, 0% is implemented. No store config schema, AI prompt pipeline, store renderer, or store persistence exists.

The feature is critical for the managed-service commercialization path (paid builds, case studies, demand generation). Without it, there is nothing to sell.

## How to Fix

This task covers Phase 1 Steps 1-2 from the checklist:

### Step 1: Define `store_config` JSON schema

Create `marketplace/backend/schemas/store-config.schema.json`:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "StoreConfig",
  "type": "object",
  "required": ["name", "tagline", "commerce"],
  "properties": {
    "name": { "type": "string", "description": "Store display name" },
    "tagline": { "type": "string" },
    "palette": {
      "type": "object",
      "properties": {
        "primary": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" },
        "accent": { "type": "string" },
        "bg": { "type": "string" }
      }
    },
    "fonts": {
      "type": "object",
      "properties": {
        "heading": { "type": "string" },
        "body": { "type": "string" }
      }
    },
    "commerce": {
      "type": "object",
      "required": ["fulfillment_type", "payment_provider"],
      "properties": {
        "products": { "type": "array", "items": { "$ref": "#/definitions/Product" } },
        "fulfillment_type": { "type": "string", "enum": ["digital", "pod", "service"] },
        "payment_provider": { "type": "string", "enum": ["stripe", "arxmint", "both"] },
        "email_capture": { "type": "boolean" }
      }
    },
    "modules": {
      "type": "object",
      "properties": {
        "funnels": { "type": "boolean" },
        "courses": { "type": "boolean" },
        "pod": { "type": "boolean" }
      }
    }
  },
  "definitions": {
    "Product": {
      "type": "object",
      "required": ["name", "price"],
      "properties": {
        "name": { "type": "string" },
        "price": { "type": "number" },
        "description": { "type": "string" },
        "type": { "type": "string", "enum": ["ebook", "course", "service", "physical"] }
      }
    }
  }
}
```

### Step 2: Build AI prompt pipeline

Create `marketplace/backend/services/aiStoreBuilderService.js`:

```js
const Anthropic = require('@anthropic-ai/sdk');
const schema = require('../schemas/store-config.schema.json');

const client = new Anthropic(); // uses ANTHROPIC_API_KEY env var

async function buildStoreFromBrief(brief) {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `You are an expert e-commerce store designer. Given this business brief, generate a complete store configuration as valid JSON matching the schema provided.

BUSINESS BRIEF:
${brief}

OUTPUT: Return ONLY valid JSON matching this schema:
${JSON.stringify(schema, null, 2)}

Be creative with palette and content. Make the store feel professional and on-brand.`
    }]
  });

  const text = message.content[0].text;
  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in AI response');

  const config = JSON.parse(jsonMatch[0]);
  // TODO: validate against schema (use ajv)
  return config;
}

module.exports = { buildStoreFromBrief };
```

### Step 3: Wire an API route

Create `marketplace/backend/routes/storeBuilder.js`:
```js
const router = require('express').Router();
const { buildStoreFromBrief } = require('../services/aiStoreBuilderService');

// POST /api/store-builder/generate
router.post('/generate', async (req, res) => {
  const { brief } = req.body;
  if (!brief || brief.length < 20) {
    return res.status(400).json({ error: 'Brief too short. Describe your business in at least 20 characters.' });
  }
  try {
    const config = await buildStoreFromBrief(brief);
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

Mount in `server.js`: `app.use('/api/store-builder', require('./routes/storeBuilder'));`

### Step 4: Add ANTHROPIC_API_KEY to .env.example

```env
# AI Store Builder
ANTHROPIC_API_KEY=your-anthropic-api-key-here
```

## Acceptance Criteria

- [ ] `marketplace/backend/schemas/store-config.schema.json` exists and is valid JSON Schema
- [ ] `marketplace/backend/services/aiStoreBuilderService.js` exists with `buildStoreFromBrief(brief)` function
- [ ] `marketplace/backend/routes/storeBuilder.js` exists with `POST /generate` endpoint
- [ ] Route is mounted in `server.js` at `/api/store-builder`
- [ ] `ANTHROPIC_API_KEY` added to `.env.example`
- [ ] Manual test: `curl -X POST /api/store-builder/generate -d '{"brief":"I sell soy candles online, earthy aesthetic"}'` returns a valid store config JSON
- [ ] Server still starts without error when `ANTHROPIC_API_KEY` is not set (graceful handling)

## Dependencies

- Requires `ANTHROPIC_API_KEY` — human must set this in env before testing
- Schema renderer (Phase 1 Step 3) is a separate follow-up task

## Notes

_feature_audit: "AI Store Builder is described as the project's #1 differentiator but 0% is implemented. Implement as the top Phase 1 priority." AGENT_TASKS.md Phase 1 first item. This task covers steps 1-2; store renderer and Supabase persistence are separate follow-up tasks._
