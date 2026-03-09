---
id: 47
title: "Fix crypto-checkout createOrder() error displayed via alert() — replace with inline error region"
priority: P2
severity: high
status: completed
source: ux_audit
file: marketplace/frontend/crypto-checkout.html
line: 391
created: "2026-03-06T00:00:00Z"
execution_hint: sequential
context_group: store_ux
group_reason: "crypto-checkout.html UX fix — related to task 033 (prompt fix) in same file"
---

# Fix crypto-checkout createOrder() error displayed via alert()

**Priority:** P2 (high)
**Source:** ux_audit
**Location:** marketplace/frontend/crypto-checkout.html:391

## Problem

When `createOrder()` encounters an error in `crypto-checkout.html` (line 391), the error is displayed via `alert()`. Browser `alert()` is:
- A blocking modal inaccessible on many assistive technology stacks
- Provides no recovery path or contextual location within the page
- Gives no styling, branding, or next-step guidance
- Cannot be styled or enhanced

Note: task 033 already replaced `prompt()` for email collection (line 351) with an inline form. This is the separate `alert()` call used for error feedback.

**Code with issue:**
```js
} catch (err) {
  alert('Error creating order: ' + err.message);  // line 391
}
```

## How to Fix

1. Add an inline error container near the payment method selector (if not already present from task 033):
   ```html
   <div id="order-error" class="error-message" role="alert" aria-live="assertive" style="display:none"></div>
   ```

2. Replace `alert()` with inline error display:
   ```js
   } catch (err) {
     const errorEl = document.getElementById('order-error');
     errorEl.textContent = 'Unable to create order. Please try again or contact support.';
     errorEl.style.display = 'block';
     errorEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
   }
   ```

3. Clear the error on retry (when createOrder is called again).

4. Avoid exposing raw `err.message` in the user-facing message (it may contain internal details). Use a generic user message.

## Acceptance Criteria

- [ ] No `alert()` calls in crypto-checkout.html error handling
- [ ] Error displayed in inline element with `role='alert'`
- [ ] Error message is user-friendly (not raw err.message)
- [ ] Error container cleared on retry
- [ ] Screen readers will announce the error via aria-live

## Notes

_Generated from ux_audit finding: "crypto-checkout.html:391 — Error in createOrder() is shown via alert(). Provides no recovery path, inaccessible on some AT stacks."_

_Note: task 033 fixed prompt() at line 351 (email collection). This is the separate catch-block alert() at line 391._
