---
id: 30
title: "Validate AI Store Builder against 3 canonical business briefs"
priority: P1
severity: medium
status: completed
source: AGENT_TASKS.md
file: marketplace/backend/scripts/
line: null
created: "2026-03-06T14:00:00Z"
execution_hint: sequential
context_group: ai_builder
group_reason: "Phase 1 AI Store Builder QA — validates tasks 013+025+026+028+029 end-to-end"
---

# Validate AI Store Builder against 3 canonical business briefs

**Priority:** P1 (medium)
**Source:** AGENT_TASKS.md (Phase 1 — AI Store Builder Core)
**Location:** `marketplace/backend/scripts/test-store-builder.js` (new)

## Problem

The AI Store Builder pipeline (generate → render → save) has been implemented across tasks 013, 025, and 026, but the full pipeline has not been tested against realistic business briefs. There is no validation that:
1. The Claude API returns valid `store_config` JSON for different business types
2. The renderer produces complete, valid HTML for each config
3. Edge cases in business descriptions don't break the pipeline
4. The output is actually usable (correct colors, fonts, content placed correctly)

Without this validation, we cannot confidently claim the AI Store Builder works.

## How to Fix

### Step 1: Create test script `marketplace/backend/scripts/test-store-builder.js`

The script should:
1. Call `POST /api/store-builder/generate` (or call the service directly) with each brief
2. Validate the returned `store_config` against the JSON schema
3. Call `renderStorePage(config)` and validate the HTML output
4. Check that brand colors, fonts, store name, and tagline appear in the HTML
5. Log pass/fail for each brief

### Step 2: Test with the 3 canonical briefs

```javascript
const CANONICAL_BRIEFS = [
  {
    name: "Soy candle store",
    brief: "I sell handmade soy candles with an earthy, botanical aesthetic. My bestseller is a cedar and lavender candle for $28. I ship nationwide and do custom scents.",
    expect: {
      hasProducts: true,
      productCount: 1,
      priceRange: [20, 40],
      themeKeyword: "earth" // palette should lean warm/earth tones
    }
  },
  {
    name: "Online finance course",
    brief: "I teach personal finance to millennials. My main course is 'Money Freedom' — 8 modules, $197. I also have a free email mini-course as a lead magnet.",
    expect: {
      hasProducts: true,
      hasCourse: true,
      hasEmailCapture: true,
      priceRange: [150, 250]
    }
  },
  {
    name: "Freelance logo design service",
    brief: "I'm a freelance logo designer. My main service is a full brand identity package for $500 — logo, colors, fonts, business card. Turnaround is 7 days.",
    expect: {
      isService: true,
      priceRange: [400, 600],
      hasPortfolio: false // no portfolio data provided
    }
  }
];
```

### Step 3: Validate rendered HTML

For each brief, check:
- HTML is valid (has `<!DOCTYPE html>`, `<head>`, `<body>`)
- Store name appears in HTML
- Tagline appears in HTML
- At least one CSS color variable is injected (brand palette)
- At least one product/service section is present
- No `{{VARIABLE}}` placeholder strings remain unfilled

### Step 4: Log results to console and exit with code 1 on failures

```javascript
let passed = 0, failed = 0;
for (const test of CANONICAL_BRIEFS) {
  try {
    const result = await runTest(test);
    if (result.pass) { passed++; console.log(`PASS: ${test.name}`); }
    else { failed++; console.error(`FAIL: ${test.name}`, result.errors); }
  } catch (err) {
    failed++;
    console.error(`ERROR: ${test.name}`, err.message);
  }
}
console.log(`\n${passed}/${passed+failed} passed`);
process.exit(failed > 0 ? 1 : 0);
```

### Step 5: Add npm script

Add to `marketplace/backend/package.json`:
```json
"test:store-builder": "node scripts/test-store-builder.js"
```

## Acceptance Criteria

- [ ] `scripts/test-store-builder.js` exists and runs without crashing
- [ ] All 3 canonical briefs produce valid `store_config` JSON
- [ ] All 3 rendered HTML pages are valid HTML5 with correct structure
- [ ] Store name and tagline from each brief appear in the rendered HTML
- [ ] No unfilled `{{VARIABLE}}` placeholders in any rendered output
- [ ] Script exits 0 when all tests pass, exits 1 on any failure
- [ ] npm script `test:store-builder` added to package.json
- [ ] Script gracefully skips API tests when `ANTHROPIC_API_KEY` is not set (uses fixture configs instead)

## Dependencies

- Task 013 (AI Store Builder schema + pipeline) — DONE
- Task 025 (store renderer) — DONE
- Task 026 (Supabase persistence) — DONE

## Notes

_Generated from AGENT_TASKS.md Phase 1 item: "TEST: Validate builder against 3 canonical briefs — soy candle store, course business, service business with landing funnel". This is a QA/validation task, not a feature task._
