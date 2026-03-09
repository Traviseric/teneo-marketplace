---
id: 24
title: "Replace hardcoded 'teneo' brand with DEFAULT_BRAND env var in adminRoutes.js"
priority: P2
severity: medium
status: completed
source: code_quality_audit
file: marketplace/backend/routes/adminRoutes.js
line: 31
created: "2026-03-06T12:00:00Z"
execution_hint: parallel
context_group: admin_config
group_reason: "Single-file change in adminRoutes.js, no file overlap with other tasks"
---

# Replace hardcoded 'teneo' brand with DEFAULT_BRAND env var in adminRoutes.js

**Priority:** P2 (medium)
**Source:** code_quality_audit
**Location:** `marketplace/backend/routes/adminRoutes.js:31` (and lines 36, 327, 383, 433, 463, 499, 554)

## Problem

The brand identifier `'teneo'` is hardcoded as a string literal in at least 8 places in `adminRoutes.js`. This makes the admin panel non-functional for any brand other than `teneo` without code changes. Since OpenBazaar.ai is designed as a multi-brand platform, this is a clear configuration issue.

**Example instances:**
```javascript
// Line 31
const brandPath = path.join(brandsDir, 'teneo');

// Line 36
const configPath = path.join(brandsDir, 'teneo', 'config.json');

// Lines 327, 383, 433, 463, 499, 554 — all hardcoded 'teneo'
```

## How to Fix

1. Add a single constant at the top of `adminRoutes.js` (line ~1):
```javascript
const BRAND = process.env.DEFAULT_BRAND || 'teneo';
```

2. Replace all 8 occurrences of the string `'teneo'` in brand path constructions with `BRAND`.

3. Add `DEFAULT_BRAND` to `marketplace/backend/.env.example`:
```env
# Default brand for admin panel (multi-brand support)
DEFAULT_BRAND=teneo
```

**Search and replace pattern:**
- Find all: `path.join(brandsDir, 'teneo'` → `path.join(brandsDir, BRAND`
- Find all: `path.join(__dirname, '../../frontend/brands', 'teneo'` → use `BRAND` const

Be careful to only replace hardcoded brand path uses, not any other string 'teneo' used as business logic (e.g., email subjects, display names).

## Acceptance Criteria

- [ ] `const BRAND = process.env.DEFAULT_BRAND || 'teneo'` defined at top of `adminRoutes.js`
- [ ] All hardcoded `'teneo'` string literals in brand path joins replaced with `BRAND`
- [ ] `DEFAULT_BRAND` added to `.env.example` with explanation
- [ ] Admin panel still works when `DEFAULT_BRAND=teneo` (no behavior change for teneo)
- [ ] No regressions in existing tests

## Notes

_Generated from code_quality_audit finding. Quick mechanical replacement — 8 string literals replaced with a single env-var-backed constant. Read adminRoutes.js before making changes to identify all locations._
