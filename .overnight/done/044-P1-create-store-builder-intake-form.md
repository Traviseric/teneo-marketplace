---
id: 44
title: "Create store builder intake form for non-technical buyers"
priority: P1
severity: medium
status: completed
source: AGENT_TASKS.md
file: marketplace/frontend/store-builder-intake.html
line: null
created: "2026-03-06T00:00:00Z"
execution_hint: sequential
context_group: ai_store_commercialization
group_reason: "Same feature area as tasks 042 and 043 — Phase 1A/1B managed-service flow"
---

# Create store builder intake form for non-technical buyers

**Priority:** P1 (medium)
**Source:** AGENT_TASKS.md Phase 1B
**Location:** marketplace/frontend/ (new file: store-builder-intake.html)

## Problem

Phase 1B requires a simple intake form that non-technical buyers can fill out to request an AI store build. Currently the only way to trigger a build is via the dev API (`POST /api/store-builder/generate`), which is inaccessible to buyers.

Without a form, the managed-service commercialization flow has no customer-facing entry point.

## How to Fix

Create `marketplace/frontend/store-builder-intake.html` with:

1. **Form fields:**
   - Business name (text, required)
   - Your email (email input, required)
   - Tell us about your business (textarea, min 50 chars, required) — with char counter
   - What do you sell? (select: digital products / physical / courses / services)
   - Tier selection (radio: Builder $X / Pro $Y / White-label $Z) with brief feature bullets
   - Website or inspiration links (optional URL input)
   - Anything else we should know? (optional textarea)

2. **UX requirements:**
   - Inline validation with clear error messages (no alert())
   - Character counter on business description field
   - Submit button disabled until required fields valid
   - Loading state on submission
   - Success state: "We received your request! Check your email for confirmation. Build ID: {id}"
   - Error state: display server error inline

3. **Submission:**
   - `POST /api/store-builder/intake` (task 043)
   - Show build_id in success state for reference

4. **Accessibility:**
   - All inputs have `<label>` elements
   - `role='alert'` on error container
   - `autocomplete` attributes on email field

5. Add link to this form from the landing page (`openbazaar-site/index.html`) in the AI Store Builder section.

## Acceptance Criteria

- [ ] Form file created at `marketplace/frontend/store-builder-intake.html`
- [ ] All required fields validated inline before submit
- [ ] Submits to `POST /api/store-builder/intake`
- [ ] Shows success state with build_id
- [ ] Shows inline error state (no alert())
- [ ] All inputs have proper labels (WCAG 1.3.1)
- [ ] Landing page links to the form

## Notes

_Generated from AGENT_TASKS.md Phase 1B: "Create simple intake form for non-technical buyers"_
