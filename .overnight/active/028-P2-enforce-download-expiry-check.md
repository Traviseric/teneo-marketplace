---
id: 28
title: "Enforce download_expiry timestamp check in downloadRoutes.js"
priority: P2
severity: medium
status: completed
source: security_audit
file: marketplace/backend/routes/downloadRoutes.js
line: 79
created: "2026-02-28T06:00:00"
execution_hint: sequential
context_group: auth_module
group_reason: "downloadRoutes.js — same file as task 024. Sequential so 024 fixes auth first, then 028 adds expiry logic."
cwe: CWE-613
---

# Enforce download_expiry timestamp check in downloadRoutes.js

**Priority:** P2 (medium)
**Source:** security_audit
**Location:** marketplace/backend/routes/downloadRoutes.js:79

## Problem

The download endpoint checks the download count limit (max 5 downloads) but does NOT check the `download_expiry` timestamp. The `/token/:token/info` endpoint correctly shows whether a link is expired, but the actual file-serving route ignores this timestamp entirely — expired download tokens remain functional indefinitely.

**Code with issue:**
```javascript
// downloadRoutes.js line 79
const order = await orderService.getOrderByDownloadToken(token);
...
if (order.download_count >= 5) { ... return 429 }
// No check for download_expiry here — expired links still work!
```

This means customers who purchased a book years ago can still use their old download links, regardless of the configured expiry period. It also means if a download token is ever compromised, it never expires.

## How to Fix

Add an expiry check immediately after fetching the order, before serving the file:

```javascript
const order = await orderService.getOrderByDownloadToken(token);

if (!order) {
    return res.status(404).json({ success: false, error: 'Download link not found' });
}

// Check expiry BEFORE serving the file
if (order.download_expiry && new Date() > new Date(order.download_expiry)) {
    return res.status(410).json({
        success: false,
        error: 'Download link has expired. Please contact support if you need assistance.'
    });
}

// Check download count limit
if (order.download_count >= 5) {
    return res.status(429).json({ success: false, error: 'Download limit reached' });
}

// ... proceed to serve file
```

Use HTTP 410 (Gone) rather than 403/404 for expired links — it's the semantically correct status code for "this resource existed but is permanently unavailable."

## Acceptance Criteria

- [ ] Expiry check added to the download file-serving route (GET `/api/download/:token`)
- [ ] Expired tokens return HTTP 410 with a helpful error message
- [ ] Non-expired tokens within download count still work normally
- [ ] The check uses `order.download_expiry` field from the database
- [ ] Null/undefined `download_expiry` is handled gracefully (no expiry = never expires)
- [ ] The `/token/:token/info` endpoint's "expired" status is consistent with the download endpoint behavior

## Notes

_Generated from security_audit findings. CWE-613: Insufficient Session Expiration — the same concept applied to download tokens. Should be implemented after task 024 (replace Basic Auth in downloadRoutes.js) since both touch the same file._
