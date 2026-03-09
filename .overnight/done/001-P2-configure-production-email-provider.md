---
id: 1
title: "Add Resend/SendGrid support to emailService.js for production deployment"
priority: P2
severity: medium
status: completed
source: project_declared
file: marketplace/backend/services/emailService.js
line: 1
created: "2026-03-09T23:00:00Z"
execution_hint: sequential
context_group: email_module
group_reason: "Touches emailService.js and related env config — same feature area as HT-019"
---

# Add Resend/SendGrid support to emailService.js for production deployment

**Priority:** P2 (medium)
**Source:** project_declared (AGENT_TASKS.md + HANDOFF.md + HT-019)
**Location:** marketplace/backend/services/emailService.js:1

## Problem

`emailService.js` currently only supports Gmail SMTP transport via `EMAIL_USER` + `EMAIL_PASS` env vars:

```js
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  this.transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });
}
```

Vercel serverless functions cannot maintain persistent SMTP connections. Gmail App Passwords are also a friction-heavy setup requiring a Google account. For production reliability, the project needs to support Resend or SendGrid via their HTTP APIs (no persistent connection required).

Without this, the following flows silently fail in production:
- Magic link auth emails
- Order confirmation emails (digital product delivery)
- License key delivery emails
- Cart abandonment recovery sequences
- Subscription welcome emails

## How to Fix

1. Install Resend SDK: `npm install resend` in `marketplace/backend/`
2. Update `emailService.js` `initializeTransporter()` to detect `RESEND_API_KEY` first:

```js
const { Resend } = require('resend');

initializeTransporter() {
  try {
    if (process.env.RESEND_API_KEY) {
      // Resend API — works on Vercel serverless, no SMTP connection needed
      this._resend = new Resend(process.env.RESEND_API_KEY);
      this._provider = 'resend';
      console.log('Email service: using Resend API');
    } else if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      this.transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      });
      this._provider = 'nodemailer';
      console.log('Email service: using Nodemailer SMTP');
    } else {
      console.warn('Email not configured. Set RESEND_API_KEY or EMAIL_USER/EMAIL_PASS.');
    }
  } catch (error) {
    console.error('Error initializing email transporter:', error);
    this.transporter = null;
  }
}
```

3. Add a private `_send(to, subject, html)` method that routes to the correct provider:

```js
async _send(to, subject, html) {
  if (this._provider === 'resend') {
    const from = process.env.EMAIL_FROM || 'OpenBazaar.ai <noreply@openbazaar.ai>';
    const { error } = await this._resend.emails.send({ from, to, subject, html });
    if (error) throw new Error(error.message);
    return { messageId: `resend-${Date.now()}` };
  } else if (this._provider === 'nodemailer') {
    return this.transporter.sendMail({ from: process.env.EMAIL_FROM || process.env.EMAIL_USER, to, subject, html });
  } else {
    throw new Error('Email service not configured');
  }
}
```

4. Update all `sendMail()` calls in `emailService.js` to use `this._send()` instead of `this.transporter.sendMail()`.

5. Update `.env.example` to document `RESEND_API_KEY` and `EMAIL_FROM`:
```
# Production email (preferred — works on Vercel serverless)
# RESEND_API_KEY=re_xxxxxxxxxxxx
# EMAIL_FROM=OpenBazaar.ai <noreply@yourdomain.com>

# Dev/fallback email (Gmail)
# EMAIL_USER=your@gmail.com
# EMAIL_PASS=your-app-password
```

6. Add Jest tests for both providers (mock `resend` and `nodemailer` transports).

## Acceptance Criteria

- [ ] `RESEND_API_KEY` env var triggers Resend API transport
- [ ] `EMAIL_USER` + `EMAIL_PASS` still work as fallback (backward-compatible)
- [ ] All existing `sendMail` calls work through the new `_send()` abstraction
- [ ] `.env.example` documents new env vars
- [ ] Jest tests cover both providers (mock both)
- [ ] No regressions in existing emailService test suite

## Notes

Human must still: (1) Create Resend account at resend.com (free tier: 3,000 emails/month), (2) Set `RESEND_API_KEY` in Vercel/Render project settings, (3) Verify domain DNS for `EMAIL_FROM` sender. This is tracked in HT-019. This task only handles the code side.

_Generated from project_declared finding (AGENT_TASKS.md + HANDOFF.md technical debt)._
