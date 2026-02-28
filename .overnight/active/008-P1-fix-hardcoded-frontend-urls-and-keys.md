---
id: 8
title: "Fix hardcoded localhost URLs and Stripe publishable key in frontend"
priority: P1
severity: high
status: completed
source: gap_analyzer
file: marketplace/frontend/cart-custom.html
line: 446
created: "2026-02-28T00:00:00"
execution_hint: sequential
context_group: frontend_module
group_reason: "Same frontend files as task 7 and 11; all frontend configuration fixes"
---

# Fix hardcoded localhost URLs and Stripe publishable key in frontend

**Priority:** P1 (high)
**Source:** gap_analyzer
**Location:** marketplace/frontend/cart-custom.html:446, marketplace/frontend/js/config.js

## Problem

Multiple frontend files have hardcoded configuration that breaks in production:

1. **Stripe publishable key hardcoded as placeholder**: `cart-custom.html` line ~446 contains `'YOUR_STRIPE_PUBLISHABLE_KEY'` — Stripe.js initialization fails silently, checkout is broken
2. **Localhost URLs in 8+ frontend files**: References to `http://localhost:3004/api/...` will 404 in production. Files affected include:
   - `mobile-optimized-showcase.html`
   - `nft-gallery.html`
   - `manage-books.html`
   - Possibly others
3. **API base URL**: No consistent frontend config — some files hardcode localhost, others use relative paths, some use empty string

**Code with issue:**
```javascript
// cart-custom.html ~line 446
const stripe = Stripe('YOUR_STRIPE_PUBLISHABLE_KEY');

// mobile-optimized-showcase.html
fetch('http://localhost:3004/api/published/dashboard')
```

## How to Fix

**Step 1: Create/fix `marketplace/frontend/js/config.js`** as the central frontend config:
```javascript
// config.js — auto-detects environment
const CONFIG = {
    API_BASE: window.location.hostname === 'localhost'
        ? 'http://localhost:3001'
        : '',  // same-origin in production
    STRIPE_PUBLISHABLE_KEY: window.STRIPE_PUBLISHABLE_KEY || ''
};
```

**Step 2: Serve Stripe key from backend template substitution** or a config endpoint:
```javascript
// Backend: GET /api/config/frontend returns { stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY }
// Frontend fetches this on cart page load
```

Or use backend-rendered config injection in the HTML `<head>`:
```html
<!-- server.js renders cart-custom.html with env substitution -->
<script>window.STRIPE_PUBLISHABLE_KEY = '{{STRIPE_PK}}';</script>
```

**Step 3: Replace all hardcoded localhost URLs** in frontend files with `CONFIG.API_BASE + '/api/...'` or relative `/api/...` paths.

Run this to find all occurrences:
```bash
grep -r "localhost:300" marketplace/frontend/ --include="*.html" --include="*.js" -l
```

## Acceptance Criteria

- [ ] `YOUR_STRIPE_PUBLISHABLE_KEY` placeholder removed from cart-custom.html
- [ ] Stripe key loaded dynamically from backend config endpoint or env injection
- [ ] No hardcoded `localhost:300*` URLs remain in frontend files
- [ ] Cart checkout flow works in both localhost and production environments

## Notes

_Generated from gap_analyzer findings. This is a deployment blocker — the store is broken in production without these fixes._
