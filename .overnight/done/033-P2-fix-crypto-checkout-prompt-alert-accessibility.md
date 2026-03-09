---
id: 33
title: "Replace prompt() and alert() in crypto-checkout.html with accessible UI"
priority: P2
severity: critical
status: completed
source: ux_audit
file: marketplace/frontend/crypto-checkout.html
line: 351
created: "2026-03-06T14:00:00Z"
execution_hint: parallel
context_group: crypto_checkout_ux
group_reason: "Standalone frontend fix — crypto-checkout.html only"
---

# Replace prompt() and alert() in crypto-checkout.html with accessible UI

**Priority:** P2 (critical UX/accessibility)
**Source:** ux_audit
**Location:** marketplace/frontend/crypto-checkout.html:351, 391

## Problem

Two browser modal APIs are used in the crypto checkout flow:

1. **`prompt()` at line 351** — `createOrder()` uses `prompt()` to collect user email before creating a crypto order. `prompt()` is a blocking modal that:
   - Is inaccessible to many screen reader + assistive technology stacks
   - Provides zero input validation (user can submit empty string or cancel)
   - Bypasses all form styling and UX patterns in the rest of the page
   - Blocks JavaScript execution until dismissed

2. **`alert()` at line 391** — errors in `createOrder()` are shown via `alert()`. Same issues as `prompt()`, plus it provides no recovery path or next-step guidance.

**Code with issue:**
```javascript
// line 351 (approximate)
const email = prompt('Enter your email address for order confirmation:');
if (!email) return;

// line 391
alert('Error creating order: ' + err.message);
```

## How to Fix

### Replace prompt() with an inline email form

Add a hidden email input section to the checkout page HTML:
```html
<div id="emailSection" class="email-section" style="display:none">
  <label for="customerEmail">Email address for order confirmation</label>
  <input type="email" id="customerEmail" autocomplete="email"
         placeholder="you@example.com" required>
  <p class="field-hint">You'll receive payment instructions and download link here.</p>
  <button type="button" id="confirmEmailBtn">Continue to Payment</button>
  <p id="emailError" role="alert" aria-live="assertive" style="display:none; color:red;"></p>
</div>
```

Show this section when the user clicks the payment method, validate email before calling `createOrder()`.

### Replace alert() with inline error region

Add an error display area near the payment method selector:
```html
<div id="orderError" role="alert" aria-live="assertive" class="error-message" style="display:none">
  <strong>Payment Error:</strong> <span id="orderErrorText"></span>
  <p>Please try again or <a href="/contact">contact support</a>.</p>
</div>
```

Replace `alert(err.message)` with:
```javascript
const errorEl = document.getElementById('orderError');
document.getElementById('orderErrorText').textContent = err.message;
errorEl.style.display = 'block';
errorEl.scrollIntoView({ behavior: 'smooth' });
```

### Flow

1. User selects payment method (BTC/LTC/XMR)
2. Email form appears (was previously prompt())
3. User enters email, clicks "Continue"
4. Email validated client-side (HTML5 + JS)
5. `createOrder()` called with validated email
6. On error: inline error region shown (was previously alert())
7. On success: payment instructions shown (existing behavior)

## Acceptance Criteria

- [ ] `prompt()` removed from crypto-checkout.html
- [ ] Email collected via inline `<form>` with `<label>` and `<input type="email">`
- [ ] Email input has `autocomplete="email"` and client-side validation
- [ ] Empty/invalid email shows inline validation error (no modal)
- [ ] `alert()` removed from crypto-checkout.html
- [ ] Errors shown via an element with `role="alert"` near the payment form
- [ ] Keyboard-only users can complete the entire checkout flow
- [ ] Screen reader can read email label and error messages

## Notes

_Generated from ux_audit critical finding (prompt()), merged with medium finding (alert()). Both are in the same file and function — fix together._
