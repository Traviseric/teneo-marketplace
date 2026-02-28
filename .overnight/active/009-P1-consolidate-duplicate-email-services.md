---
id: 9
title: "Consolidate duplicate email service files into single implementation"
priority: P1
severity: high
status: completed
source: gap_analyzer
file: marketplace/backend/services/email-service.js
line: 1
created: "2026-02-28T00:00:00"
execution_hint: sequential
context_group: email_module
group_reason: "Email service consolidation; touches same service files"
---

# Consolidate duplicate email service files into single implementation

**Priority:** P1 (high)
**Source:** gap_analyzer
**Location:** marketplace/backend/services/email-service.js, marketplace/backend/services/emailService.js

## Problem

Two separate email service implementations exist with overlapping functionality:

- **`email-service.js`** (379 lines) — lightweight Nodemailer wrapper, functional but minimal
- **`emailService.js`** (978 lines) — comprehensive `EmailService` class with 12+ templates for order confirmation, magic links, download links, payment failure, refunds, shipping, etc.

The `emailMarketingService.js` imports `./emailService` (one naming convention) while other files may use `./email-service` (the other). This creates:
- Maintenance burden (changes need to happen in both places)
- Import path confusion leading to potential bugs
- Inconsistent email template quality (some callers get full templates, others get minimal)
- The feature_audit noted a potential import path error in emailMarketingService.js

**Code with issue:**
```javascript
// emailMarketingService.js
const emailService = require('./emailService');  // loads 978-line version

// Some other route or service may use:
const emailService = require('./email-service'); // loads 379-line version
```

## How to Fix

1. **Audit which files import each version:**
   ```bash
   grep -r "require.*email" marketplace/backend/ --include="*.js" | grep -v node_modules
   ```

2. **Keep `emailService.js`** (the comprehensive 978-line version with full templates) as the canonical service

3. **Migrate callers of `email-service.js`** to use `emailService.js` — update their require paths

4. **Delete `email-service.js`** after confirming all callers migrated

5. **Fix any import path errors** in emailMarketingService.js — verify the import resolves to the correct file

6. **Verify all email templates still work** after consolidation

## Acceptance Criteria

- [ ] Only one email service file exists (`emailService.js`)
- [ ] All routes and services import from `emailService.js`
- [ ] No broken require paths in emailMarketingService.js
- [ ] Transactional emails (order confirmation, magic link, download link) still send correctly

## Notes

_Generated from gap_analyzer findings. The 978-line emailService.js is clearly the more complete implementation — keep that one._
