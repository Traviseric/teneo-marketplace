---
id: 1
title: "Add missing npm dependencies to package.json"
priority: P0
severity: critical
status: completed
source: researcher
file: package.json
line: 14
created: "2026-02-28T00:00:00"
execution_hint: sequential
context_group: deploy_blockers
group_reason: "Must fix before server can start; task 6 (mount auth routes) depends on server running"
---

# Add missing npm dependencies to package.json

**Priority:** P0 (critical)
**Source:** researcher
**Location:** package.json

## Problem

The server requires 5 npm packages that are NOT listed in `package.json` dependencies. The server will crash immediately on startup with `Cannot find module` errors:

- `bcrypt` — used in `marketplace/backend/server.js` line 9 and `middleware/auth.js` for password hashing
- `express-session` — used in `marketplace/backend/server.js` line 46 for session management
- `csurf` — used in `marketplace/backend/server.js` line 47 for CSRF protection
- `express-rate-limit` — used in `marketplace/backend/middleware/auth.js` for login rate limiting
- `body-parser` — used in `marketplace/backend/server.js` line 45 (note: express 4.x has built-in parsing but the explicit import still needs the package)

Current package.json dependencies only include: archiver, axios, cors, csv-parse, dotenv, express, multer, nodemailer, sqlite3, stripe.

**Code with issue:**
```javascript
// marketplace/backend/server.js lines 9, 45-47
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const session = require('express-session');
const csurf = require('csurf');
```

## How to Fix

Add the missing packages to `package.json` dependencies section:

```json
{
  "dependencies": {
    "bcrypt": "^5.1.1",
    "body-parser": "^1.20.2",
    "express-rate-limit": "^7.1.5",
    "express-session": "^1.17.3",
    "csurf": "^1.11.0"
  }
}
```

Note: `csurf` is deprecated but it's already in use — add it to fix the crash. Consider migrating to `csrf-csrf` in a follow-up task.

After updating package.json, run: `npm install`

## Acceptance Criteria

- [ ] All 5 packages added to package.json dependencies with appropriate version ranges
- [ ] `npm install` completes without errors
- [ ] `npm start` does not crash with `Cannot find module` errors
- [ ] Server starts and listens on port 3001

## Notes

_Generated from researcher findings. This is the #1 blocker — no other tasks can be verified without server startup._
