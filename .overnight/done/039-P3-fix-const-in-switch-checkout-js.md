---
id: 39
title: "Fix const declarations in switch/case without block scope (checkout.js)"
priority: P3
severity: medium
status: completed
source: code_quality_audit
file: marketplace/backend/routes/checkout.js
line: 211
created: "2026-03-06T00:00:00Z"
execution_hint: parallel
context_group: checkout_module
group_reason: "Isolated fix in checkout.js — no dependency on other pending tasks"
---

# Fix const declarations in switch/case without block scope (checkout.js)

**Priority:** P3 (medium)
**Source:** code_quality_audit
**Location:** marketplace/backend/routes/checkout.js:211

## Problem

In the Stripe webhook handler, `const` declarations inside `case 'checkout.session.completed':` are not wrapped in a block-scoped body. The case body starts at line 210 and uses `const session` at line 211 and `const { bookId, ... }` at ~224 without enclosing `{}`. This is flagged as `no-case-declarations` by ESLint and is invalid per strict specification — while V8 currently hoists these to the switch block scope, it can cause confusing transpiler/linter errors and unexpected shadowing bugs in the future.

**Code with issue:**
```javascript
case 'checkout.session.completed':
  const session = event.data.object;  // line 211 — no-case-declarations
  // ... ~70 lines of logic ...
  const { bookId, ... } = session.metadata;  // also unscoped
  break;
```

## How to Fix

Wrap the entire `case 'checkout.session.completed':` body in curly braces to create a proper block scope:

```javascript
case 'checkout.session.completed': {
  const session = event.data.object;
  // ... existing logic unchanged ...
  break;
}
```

Do the same for any other case blocks in the same switch statement that use `const` or `let` declarations.

## Acceptance Criteria

- [ ] `case 'checkout.session.completed':` body is wrapped in `{ }` block
- [ ] All `const`/`let` declarations inside the case are within the block scope
- [ ] No other cases in the same switch have unscoped `const`/`let` declarations
- [ ] Webhook handler behavior is unchanged (no logic changes — formatting only)
- [ ] Existing checkout and webhook tests still pass

## Notes

_Generated from code_quality_audit finding — no-case-declarations pattern. This is a safe refactor: wrap in braces, no logic changes. Run `npm test` in marketplace/backend to verify no regressions._
