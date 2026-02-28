---
id: 27
title: "Remove verificationToken from censorshipTracker API response"
priority: P2
severity: medium
status: completed
source: security_audit
file: marketplace/backend/routes/censorshipTracker.js
line: 427
created: "2026-02-28T06:00:00"
execution_hint: parallel
context_group: independent
group_reason: "Single-file fix in censorshipTracker.js, no dependency on other tasks"
cwe: CWE-640
---

# Remove verificationToken from censorshipTracker API response

**Priority:** P2 (medium)
**Source:** security_audit
**Location:** marketplace/backend/routes/censorshipTracker.js:427

## Problem

The email verification token for censorship alert subscriptions is returned directly in the API response body. This completely defeats the purpose of email verification — any subscriber can immediately verify themselves by extracting the token from the API response, without actually owning the email address.

The TODO comment in the code acknowledges this issue but it has not been addressed.

**Code with issue:**
```javascript
// censorshipTracker.js line 427
res.json({
    success: true,
    message: 'Subscription created. Please check your email to verify.',
    verificationToken // Remove in production, send via email only
});
```

Attackers can subscribe to alerts with any email address (including victims' addresses) and immediately verify the subscription by reading the `verificationToken` from the response — no email access needed.

## How to Fix

Remove `verificationToken` from the JSON response. Send it only via email:

```javascript
// Step 1: Remove verificationToken from response
res.json({
    success: true,
    message: 'Subscription created. Please check your email to verify your subscription.'
    // No verificationToken here
});
```

The code already has a `// TODO: Send verification email` comment at line 422. Implement the email send before or after saving the subscription:

```javascript
// Step 2: Send verification email using emailService
const emailService = require('../services/emailService');

// After saving subscription to DB, before responding:
const verifyUrl = `${process.env.APP_URL}/api/censorship/verify?token=${verificationToken}&email=${encodeURIComponent(email)}`;
await emailService.sendEmail({
    to: email,
    subject: 'Verify your censorship alert subscription',
    html: `<p>Click to verify your subscription: <a href="${verifyUrl}">${verifyUrl}</a></p>`
});
```

If email is not yet configured, at minimum just remove the token from the response body. The subscription won't be verifiable without email, but that's acceptable — it prevents the security bypass.

## Acceptance Criteria

- [ ] `verificationToken` removed from the API response body
- [ ] Response still returns `success: true` and a user-friendly message
- [ ] TODO comment addressed — either email sending implemented OR a comment noting email is required
- [ ] If email service is available, verification email sent with a link containing the token
- [ ] Existing censorship alert verification endpoint (`/verify`) still works when token comes via email

## Notes

_Generated from security_audit findings. CWE-640: Weak Password Recovery Mechanism (token in response body defeats email ownership verification). The pre-existing TODO at line 422 ("Send verification email") is the implementation path — complete it and remove the token from the response._
