---
id: 40
title: "Remove customer email PII from download logs (downloadRoutes.js)"
priority: P3
severity: low
status: completed
source: security_audit
file: marketplace/backend/routes/downloadRoutes.js
line: 145
created: "2026-03-06T00:00:00Z"
execution_hint: parallel
context_group: independent
group_reason: "Single-line fix in downloadRoutes.js — no overlap with other pending tasks"
---

# Remove customer email PII from download logs (downloadRoutes.js)

**Priority:** P3 (low)
**Source:** security_audit
**CWE:** CWE-359 (Exposure of Private Personal Information to an Unauthorized Actor)
**Location:** marketplace/backend/routes/downloadRoutes.js:145

## Problem

Customer email (PII) is written to application logs on every successful download:

**Code with issue:**
```javascript
console.log(`Download: ${order.book_id} by ${order.customer_email} (${order.download_count + 1}/5)`);
```

Log aggregation systems (Papertrail, Datadog, CloudWatch, etc.) may expose or retain this data, violating GDPR and CCPA privacy regulations. Logs are often stored long-term and may be accessible to infrastructure personnel who should not have access to customer PII.

## How to Fix

Replace `order.customer_email` in the log line with a pseudonymized identifier — either the order ID (already non-PII) or a truncated hash:

**Option A — use order_id (simplest):**
```javascript
console.log(`Download: ${order.book_id} order=${order.order_id} (${order.download_count + 1}/5)`);
```

**Option B — truncated email hash (if email presence needs to be traceable for debugging):**
```javascript
const crypto = require('crypto');
const emailHash = crypto.createHash('sha256').update(order.customer_email).digest('hex').slice(0, 8);
console.log(`Download: ${order.book_id} user=${emailHash} (${order.download_count + 1}/5)`);
```

Option A is preferred for simplicity. The order_id is sufficient for operator lookup.

Also scan the rest of `downloadRoutes.js` for any other places where `customer_email` is logged and apply the same fix.

## Acceptance Criteria

- [ ] `order.customer_email` is not included in any `console.log` in downloadRoutes.js
- [ ] Log line still provides useful debugging info (book_id, order_id, download count)
- [ ] No other PII fields (name, address) appear in logs in this file
- [ ] Behavior of the download route is unchanged
- [ ] Existing tests pass

## Notes

_Generated from security_audit low-severity finding (CWE-359). Simple one-line fix. grep for `customer_email` in downloadRoutes.js to find all occurrences before patching._
