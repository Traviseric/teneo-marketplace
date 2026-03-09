---
id: 35
title: "Fix email capture form accessibility — label, focus indicator, aria-live error"
priority: P2
severity: high
status: completed
source: ux_audit
file: marketplace/frontend/components-library/forms/form-email-capture.html
line: 142
created: "2026-03-06T14:00:00Z"
execution_hint: sequential
context_group: frontend_store
group_reason: "Frontend component fixes — shared component used across all funnels"
---

# Fix email capture form accessibility — label, focus indicator, aria-live error

**Priority:** P2 (high × 3 — three WCAG failures in one component)
**Source:** ux_audit
**Location:** marketplace/frontend/components-library/forms/form-email-capture.html:64, 142, 150

## Problem

The reusable email capture form component (`form-email-capture.html`) has three WCAG failures that affect all funnels using it:

1. **No `<label>` element (line 142):** Only a placeholder is used for the email input. Placeholders disappear on focus and are not reliably announced by all screen readers as field labels. This is a WCAG 1.3.1 (Info and Relationships) failure.

2. **`outline: none` without replacement (line 64):** The input focus style removes the browser's default focus outline without providing an equivalent. Only a `border-color` change remains, which may not meet the 3:1 contrast ratio required for non-text contrast (WCAG 1.4.11). Keyboard users cannot track focus.

3. **Error message has no `aria-live` (line 150):** The validation error div is hidden/shown via CSS but has no `role="alert"` or `aria-live` attribute. Screen readers will not announce validation errors when they appear. This is a WCAG 4.1.3 (Status Messages) failure.

**Code with issues:**
```html
<!-- line 64: focus removes outline -->
.email-capture__input:focus {
  outline: none;
  border-color: var(--accent-color);
}

<!-- line 142: no label, only placeholder -->
<input type="email" class="email-capture__input" placeholder="Enter your email">

<!-- line 150: no aria-live on error div -->
<div class="email-capture__error-message">Please enter a valid email address</div>
```

## How to Fix

### Fix 1: Add accessible label

```html
<!-- Option A: visible label (preferred) -->
<label for="email-capture-input" class="email-capture__label">Email address</label>
<input type="email" id="email-capture-input" class="email-capture__input"
       placeholder="Enter your email" autocomplete="email">

<!-- Option B: visually hidden label (if design requires no visible label) -->
<label for="email-capture-input" class="sr-only">Email address</label>
<input type="email" id="email-capture-input" ...>
```

Add `.sr-only` CSS class if not already present:
```css
.sr-only {
  position: absolute; width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0,0,0,0); white-space: nowrap; border: 0;
}
```

### Fix 2: Replace `outline: none` with visible focus indicator

```css
.email-capture__input:focus {
  /* Remove this: outline: none; */
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
  border-color: var(--accent-color);
}
```

Or use a box-shadow alternative that provides sufficient contrast:
```css
.email-capture__input:focus {
  outline: none; /* only if using box-shadow replacement */
  box-shadow: 0 0 0 3px var(--accent-color-alpha, rgba(37,99,235,0.4));
  border-color: var(--accent-color);
}
```

### Fix 3: Add aria-live to error message

```html
<div class="email-capture__error-message"
     role="alert"
     aria-live="assertive"
     style="display:none">
  Please enter a valid email address.
</div>
```

### Fix 4: Add autocomplete (bonus, from low-severity finding)

Already implied by Fix 1 (`autocomplete="email"` on the input).

## Acceptance Criteria

- [ ] Email input has either a visible `<label>` or a visually-hidden `<label>` with correct `for`/`id` pairing
- [ ] Input focus state uses `outline` or `box-shadow` with sufficient contrast (not just border-color)
- [ ] Error message element has `role="alert"` or `aria-live="polite"` (or `assertive`)
- [ ] Input has `autocomplete="email"` attribute
- [ ] Form still renders correctly in all funnels that use this component
- [ ] No regressions in existing page layouts

## Notes

_Generated from ux_audit — 3 high-severity WCAG failures in the shared email capture component. Merged into one task because all 3 affect the same file and component. Fix together to minimize component churn._
