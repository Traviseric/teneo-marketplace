---
id: 53
title: "Add ESLint configuration to marketplace/backend"
priority: P3
severity: low
status: completed
source: code_quality_audit
file: marketplace/backend
line: 0
created: "2026-03-06T00:00:00Z"
execution_hint: parallel
context_group: security_quality
group_reason: "Code quality tooling — independent of other groups"
---

# Add ESLint configuration to marketplace/backend

**Priority:** P3 (low)
**Source:** code_quality_audit
**Location:** marketplace/backend/

## Problem

No ESLint configuration exists in the backend (`marketplace/backend/`). Without a linter, common issues go undetected:
- `no-case-declarations` (e.g., the switch/case const issue from task 039)
- `no-unused-vars`
- `no-undef`
- Copy-paste errors and code style inconsistencies

## How to Fix

1. Create `marketplace/backend/.eslintrc.js`:
   ```js
   module.exports = {
     env: {
       node: true,
       es2021: true,
       jest: true,
     },
     extends: ['eslint:recommended'],
     parserOptions: {
       ecmaVersion: 2021,
     },
     rules: {
       'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
       'no-case-declarations': 'error',
       'no-undef': 'error',
       'no-console': 'off', // server code needs console
     },
     ignorePatterns: ['node_modules/', 'coverage/'],
   };
   ```

2. Add lint script to `marketplace/backend/package.json`:
   ```json
   "scripts": {
     "lint": "eslint . --ext .js",
     "lint:fix": "eslint . --ext .js --fix"
   }
   ```

3. Run `npm run lint` and fix any new errors (or add `/* eslint-disable */` with a TODO comment for known intentional patterns).

4. Do NOT add lint as a blocking CI step in this task — just add the config and scripts. A follow-up can add it to CI.

## Acceptance Criteria

- [ ] `.eslintrc.js` created in marketplace/backend/
- [ ] `lint` and `lint:fix` scripts added to package.json
- [ ] `npm run lint` runs without crashing
- [ ] Critical errors (no-case-declarations, no-undef) configured as errors
- [ ] No regressions in test suite

## Notes

_Generated from code_quality_audit finding: "No ESLint config in marketplace/backend. Issues like no-case-declarations, no-unused-vars, and no-undef go undetected in CI."_
