---
id: 56
title: "Fix arxmintService.js stub methods that throw at runtime — replace with safe no-ops"
priority: P3
severity: medium
status: completed
source: code_quality_audit
file: marketplace/backend/services/arxmintService.js
line: 43
created: "2026-03-06T00:00:00Z"
execution_hint: parallel
context_group: security_quality
group_reason: "Code quality dead-code fix — independent of UX and feature groups"
---

# Fix arxmintService.js stub methods that throw at runtime

**Priority:** P3 (medium)
**Source:** code_quality_audit
**Location:** marketplace/backend/services/arxmintService.js:43, 51, 76, 101

## Problem

Three methods in `arxmintService.js` throw `'not yet implemented'` errors with TODO comments:
- `createL402Invoice()` (line 51)
- `verifyL402Payment()` (line 76)
- `acceptCashuToken()` (line 101)

The service is imported by `arxmintProvider.js` which is part of the active payment provider chain. These stub methods that throw are **worse than missing methods** — they fail silently at deploy time (no startup warning) but crash at runtime when called, potentially causing payment failures with no clear error message.

**Code with issue:**
```js
createL402Invoice(amount, description) {
  throw new Error('not yet implemented');  // line 51
}
verifyL402Payment(token) {
  throw new Error('not yet implemented');  // line 76
}
acceptCashuToken(token) {
  throw new Error('not yet implemented');  // line 101
}
```

## How to Fix

Replace throwing stubs with graceful no-op stubs that:
1. Log a clear warning that the method is not implemented
2. Return a structured error response instead of throwing
3. Do NOT crash the calling code

```js
async createL402Invoice(amount, description) {
  console.warn('[ArxMint] createL402Invoice not yet implemented — L402 payment unavailable');
  return { success: false, error: 'L402 payments not yet implemented', code: 'NOT_IMPLEMENTED' };
}

async verifyL402Payment(token) {
  console.warn('[ArxMint] verifyL402Payment not yet implemented');
  return { valid: false, error: 'L402 payment verification not yet implemented', code: 'NOT_IMPLEMENTED' };
}

async acceptCashuToken(token) {
  console.warn('[ArxMint] acceptCashuToken not yet implemented — Cashu payments unavailable');
  return { success: false, error: 'Cashu payments not yet implemented', code: 'NOT_IMPLEMENTED' };
}
```

Also:
- Add a startup log at module load time indicating which ArxMint features are live vs stub
- Ensure callers in `arxmintProvider.js` handle `{ success: false }` return values gracefully

## Acceptance Criteria

- [ ] No `throw new Error('not yet implemented')` in arxmintService.js
- [ ] Stub methods return structured `{ success: false, error, code }` responses
- [ ] Console warning logged (not error) when stubs are called
- [ ] `arxmintProvider.js` handles stub return values without crashing
- [ ] Test suite passes after change

## Notes

_Generated from code_quality_audit finding: "arxmintService.js stubs (createL402Invoice, verifyL402Payment, acceptCashuToken) all throw 'not yet implemented'. Stub methods that throw runtime errors are worse than missing methods."_

_HUMAN_TASKS.md HT-007 tracks the full ArxMint L402/Cashu implementation which requires the arxmint source repo._
