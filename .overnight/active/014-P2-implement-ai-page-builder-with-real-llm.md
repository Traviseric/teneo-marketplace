---
id: 14
title: "Replace regex intent parsing in AI page builder with actual LLM call"
priority: P2
severity: medium
status: completed
source: feature_audit
file: marketplace/backend/services/aiPageBuilderService.js
line: 1
created: "2026-02-28T00:00:00"
execution_hint: parallel
context_group: features
group_reason: "Feature implementation; independent of auth/security tasks"
---

# Replace regex intent parsing in AI page builder with actual LLM call

**Priority:** P2 (medium)
**Source:** feature_audit
**Location:** marketplace/backend/services/aiPageBuilderService.js

## Problem

The AI Website Designer service claims "Natural language customization" but `parseIntent()` uses hardcoded if/else string matching with no actual AI API calls. The README description is misleading — this is keyword matching, not AI.

**Code with issue:**
```javascript
// aiPageBuilderService.js
function parseIntent(prompt) {
    // Uses regex keyword matching — NOT an LLM
    if (prompt.includes('hero') || prompt.includes('banner')) {
        components.push('hero');
    }
    if (prompt.includes('pricing') || prompt.includes('price')) {
        components.push('pricing');
    }
    // ... more if/else string matching
}
```

Meanwhile, `aiDiscoveryService.js` already has a working OpenAI client configured. The infrastructure exists — it's not being used here.

## How to Fix

1. **Import the OpenAI client** already configured in aiDiscoveryService.js (or create a shared `services/openaiClient.js`):
```javascript
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
```

2. **Replace parseIntent() with an LLM call**:
```javascript
async function parseIntent(prompt, availableComponents) {
    const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{
            role: 'system',
            content: `You are a page builder assistant. Given a user's description of what they want,
            select the appropriate components from this list: ${availableComponents.join(', ')}.
            Return a JSON object: { components: string[], layout: string, colorScheme: string }`
        }, {
            role: 'user',
            content: prompt
        }],
        response_format: { type: 'json_object' }
    });
    return JSON.parse(completion.choices[0].message.content);
}
```

3. **Add fallback** for when `OPENAI_API_KEY` is not configured — fall back to the current keyword matching behavior rather than erroring.

4. **Cache responses** for identical prompts to avoid redundant API calls.

## Acceptance Criteria

- [ ] `parseIntent()` makes real OpenAI API calls when OPENAI_API_KEY is configured
- [ ] LLM interprets natural language like "I want a hero section and pricing table with dark theme"
- [ ] Graceful fallback to keyword matching if API key is missing
- [ ] Response format remains compatible with the rest of the page builder pipeline

## Notes

_Generated from feature_audit findings. The OpenAI integration already exists in aiDiscoveryService.js — this is reusing that pattern in the page builder._
