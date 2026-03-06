---
id: 50
title: "Add accessibility improvements to openbazaar-site/index.html (table, stats, copy button)"
priority: P3
severity: medium
status: completed
source: ux_audit
file: openbazaar-site/index.html
line: 362
created: "2026-03-06T00:00:00Z"
execution_hint: parallel
context_group: accessibility_site
group_reason: "All three fixes in the same file, independent of other groups"
---

# Add accessibility improvements to openbazaar-site/index.html

**Priority:** P3 (medium)
**Source:** ux_audit
**Location:** openbazaar-site/index.html

## Problem

Three accessibility issues in the landing site that affect screen reader users and keyboard users:

**1. Comparison table no scope attributes (line 362):**
The table has an empty `<th>` in the header row and no `scope` attributes. Screen readers cannot associate data cells with their headers.

**2. Network stats no aria-live (line 440):**
`nodeCount`, `productCount`, `txCount` are initialized as "—" and updated via JS. No `aria-live` region means screen readers won't announce when values load. If the API fails, users see "—" indefinitely with no feedback.

**3. Copy button no success feedback (line 503):**
The self-host code block copy button has no `aria-label` and no accessible feedback after copying. Users (especially screen reader users) have no confirmation the copy worked.

## How to Fix

**1. Comparison table:**
```html
<!-- Add scope to all th elements -->
<th scope="col">Feature</th>
<th scope="col">OpenBazaar</th>
<th scope="col">Gumroad</th>
<!-- Row headers -->
<th scope="row">Zero platform fees</th>
```
Also add `aria-label="Feature"` to the empty corner `<th>`.

**2. Network stats:**
```html
<div aria-live="polite" aria-atomic="false">
  <span id="nodeCount">—</span> nodes
</div>
```
Add error state when API fails:
```js
} catch (e) {
  document.getElementById('nodeCount').textContent = 'N/A';
  // Add title/tooltip: 'Network data unavailable'
}
```

**3. Copy button:**
```html
<button
  id="copy-install-btn"
  aria-label="Copy install command"
  onclick="copyInstall()">
  Copy
</button>
```
```js
function copyInstall() {
  navigator.clipboard.writeText(installCmd).then(() => {
    const btn = document.getElementById('copy-install-btn');
    btn.textContent = 'Copied!';
    btn.setAttribute('aria-label', 'Copied!');
    setTimeout(() => {
      btn.textContent = 'Copy';
      btn.setAttribute('aria-label', 'Copy install command');
    }, 2000);
  });
}
```

## Acceptance Criteria

- [ ] All `<th>` elements have `scope='col'` or `scope='row'`
- [ ] Empty corner `<th>` has `aria-label='Feature'`
- [ ] Network stats container has `aria-live='polite'`
- [ ] API failure sets stat values to 'N/A' (not stuck at '—')
- [ ] Copy button has `aria-label` that updates to 'Copied!' for 2s on success
- [ ] No visual regressions

## Notes

_Generated from ux_audit findings: comparison table WCAG 1.3.1, network stats WCAG 4.1.3, copy button WCAG 4.1.3._
