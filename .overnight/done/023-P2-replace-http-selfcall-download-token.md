---
id: 23
title: "Replace HTTP self-calls for download token generation with direct module imports"
priority: P2
severity: high
status: completed
source: code_quality_audit
file: marketplace/backend/routes/checkout.js
line: 269
created: "2026-03-06T12:00:00Z"
execution_hint: sequential
context_group: download_token
group_reason: "Same root cause in checkout.js and cryptoCheckout.js — fix together"
---

# Replace HTTP self-calls for download token generation with direct module imports

**Priority:** P2 (high)
**Source:** code_quality_audit
**Location:** `marketplace/backend/routes/checkout.js:269`, `marketplace/backend/routes/cryptoCheckout.js:360`

## Problem

Two webhook handlers generate download tokens by making an HTTP POST request to themselves (`axios.post` to `localhost:3001/api/download/generate-token`). This is a brittle anti-pattern with several failure modes:

1. **Race condition on startup**: If the server hasn't finished starting, the HTTP call fails
2. **PORT changes**: Hardcoded 3001 port; fails if `PORT` env var differs
3. **Network latency**: Unnecessary HTTP round-trip within the same process
4. **Infinite loop risk**: Middleware could intercept the request and recurse
5. **Test environment failures**: HTTP call to localhost fails in CI/test environments

**Code with issue (checkout.js:269):**
```javascript
const tokenResponse = await axios.post(
  `${process.env.FRONTEND_URL || 'http://localhost:3001'}/api/download/generate-token`,
  { orderId, email, bookId }
);
```

**Same pattern in cryptoCheckout.js:360** (BTCPay webhook handler).

## How to Fix

Extract the download token generation logic from `downloadRoutes.js` into a shared service function, then call it directly:

1. Create (or extend) `marketplace/backend/services/downloadService.js`:
```javascript
async function generateDownloadToken({ orderId, email, bookId }) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  await db.run(
    'INSERT INTO download_tokens (token, order_id, email, book_id, expires_at) VALUES (?, ?, ?, ?, ?)',
    [token, orderId, email, bookId, expiresAt.toISOString()]
  );
  return { token, downloadUrl: `/api/download/${token}` };
}
module.exports = { generateDownloadToken };
```

2. In `checkout.js` and `cryptoCheckout.js`, replace the axios self-call:
```javascript
// Before:
const tokenResponse = await axios.post(`${...}/api/download/generate-token`, { orderId, email, bookId });
const { downloadUrl } = tokenResponse.data;

// After:
const { downloadUrl } = await downloadService.generateDownloadToken({ orderId, email, bookId });
```

3. Check if `downloadRoutes.js` already has token generation logic — extract it from there rather than duplicating.

## Acceptance Criteria

- [ ] `checkout.js` webhook handler calls `downloadService.generateDownloadToken()` directly — no axios HTTP call
- [ ] `cryptoCheckout.js` webhook handler calls `downloadService.generateDownloadToken()` directly — no axios HTTP call
- [ ] The `axios` import in these files can be removed if no longer used elsewhere
- [ ] `downloadService.js` (or equivalent shared function) is the single source of truth for token generation
- [ ] Existing download token tests still pass
- [ ] Webhook handler tests still pass

## Notes

_Generated from code_quality_audit. Two HIGH findings merged into one task — same root cause, same fix. Read `downloadRoutes.js` first to understand the existing token generation implementation before creating a new service._
