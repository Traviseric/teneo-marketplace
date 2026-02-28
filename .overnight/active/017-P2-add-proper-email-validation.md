---
id: 17
title: "Add proper email validation across auth and subscription endpoints"
priority: P2
severity: medium
status: completed
source: gap_analyzer
file: marketplace/backend/routes/auth.js
line: 1
created: "2026-02-28T00:00:00"
execution_hint: parallel
context_group: api_hardening
group_reason: "Input validation fix; independent of other tasks"
---

# Add proper email validation across auth and subscription endpoints

**Priority:** P2 (medium)
**Source:** gap_analyzer
**Location:** marketplace/backend/routes/auth.js, marketplace/backend/routes/censorshipTracker.js

## Problem

Email validation throughout the codebase is minimal — most endpoints only check if the email field is non-empty or contains an `@` symbol. This allows:

- Malformed emails (`user@@`, `@example.com`, `test@`) to be accepted
- Invalid magic links sent to garbage addresses
- Subscription lists polluted with invalid emails
- Potential email injection attacks through malformed addresses

## How to Fix

**1. Create a shared email validator utility** (`marketplace/backend/utils/validate.js`):
```javascript
function isValidEmail(email) {
    // RFC 5322 simplified regex — catches most malformed emails
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    return typeof email === 'string' && emailRegex.test(email.trim()) && email.length <= 254;
}

module.exports = { isValidEmail };
```

**2. Apply in auth routes** (`routes/auth.js`):
```javascript
const { isValidEmail } = require('../utils/validate');

router.post('/register', async (req, res) => {
    const { email } = req.body;
    if (!email || !isValidEmail(email)) {
        return res.status(400).json({ error: 'Valid email address required' });
    }
    // ...
});
```

**3. Apply in censorship tracker subscription** (`routes/censorshipTracker.js`):
```javascript
router.post('/subscribe', async (req, res) => {
    const { email } = req.body;
    if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Valid email address required' });
    }
    // ...
});
```

**4. Apply in any other endpoint that accepts email addresses** — run:
```bash
grep -r "req.body.email\|req.query.email" marketplace/backend/routes/ --include="*.js" -l
```

## Acceptance Criteria

- [ ] Shared `isValidEmail()` utility created
- [ ] Auth registration endpoint validates email format
- [ ] Censorship tracker subscription validates email
- [ ] Malformed emails (`@@`, `test@`, `@`) are rejected with 400 status
- [ ] Valid emails continue to work correctly

## Notes

_Generated from gap_analyzer findings. Low effort, prevents data quality issues and potential injection vectors._
