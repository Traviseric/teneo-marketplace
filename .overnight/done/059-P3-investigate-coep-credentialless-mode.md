---
id: 59
title: "Investigate COEP credentialless mode to replace disabled crossOriginEmbedderPolicy"
priority: P3
severity: low
status: completed
source: security_audit
file: marketplace/backend/server.js
line: 125
created: "2026-03-06T00:00:00Z"
execution_hint: sequential
context_group: server_security_config
group_reason: "server.js Helmet config — same security context as CSP/nonce work"
---

# Investigate COEP credentialless mode

**Priority:** P3 (low)
**Source:** security_audit (CWE-693, low severity)
**Location:** marketplace/backend/server.js:125

## Problem

`crossOriginEmbedderPolicy: false` is set in Helmet config. Disabling COEP removes browser-level isolation that prevents Spectre-class cross-origin resource leakage (CWE-693). The setting was likely disabled because Stripe.js requires cross-origin resource access and `COEP: require-corp` breaks it.

**Code with issue:**
```js
app.use(helmet({
  crossOriginEmbedderPolicy: false  // line 125 — disables browser isolation
}));
```

The newer `COEP: credentialless` policy (Chrome 96+, Firefox 119+) relaxes the restriction for requests made without credentials, making it compatible with most third-party scripts including Stripe.js.

## How to Fix

1. **Check Helmet version** supports credentialless:
   ```bash
   node -e "console.log(require('./marketplace/backend/node_modules/helmet/package.json').version)"
   ```
   Helmet 7.x supports `crossOriginEmbedderPolicy: { policy: 'credentialless' }`.

2. **Test credentialless mode** by changing server.js line 125:
   ```js
   crossOriginEmbedderPolicy: { policy: 'credentialless' }
   ```

3. **Verify Stripe.js still loads** — start the dev server and open the checkout page. Check browser DevTools for COEP errors. If Stripe.js loads cleanly, the fix is complete.

4. **If credentialless works:** commit the change.
   **If Stripe.js breaks with credentialless:** revert to `false` and add a comment:
   ```js
   crossOriginEmbedderPolicy: false  // Stripe.js incompatible with COEP:credentialless — revisit when Stripe updates headers
   ```

5. Run `npm test` to confirm no test regressions.

## Acceptance Criteria

- [ ] Either `COEP: credentialless` is enabled and Stripe checkout loads cleanly, OR `false` is kept with an explanatory comment
- [ ] `npm test` passes
- [ ] No new browser console errors on checkout or store pages

## Notes

_security_audit CWE-693 low severity. Previously deferred in round 15 as "Required for Stripe.js — investigate credentialless." Now creating as an explicit P3 task. Helmet >= 7.x required for credentialless support._
