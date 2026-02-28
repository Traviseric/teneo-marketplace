---
id: "066"
priority: P0
status: completed
title: "Setup local dev server so LAST_MILE_TEST can test the real app"
created_at: "2026-02-28T05:10:00Z"
---

# Task 066: Setup Local Dev Server for LAST_MILE_TEST

## Problem

LAST_MILE_TEST has been returning NO_GO because the test automation navigated to
`https://opensource.org/licenses/MIT` (the Open Source Initiative's MIT License page)
instead of the actual teneo-marketplace app. This happens because no local server is
running — no `.env` file exists, so `npm start` was never run.

All 65 code tasks are complete and verified. The NO_GO is a pure environment issue,
not a code quality issue.

## Goal

Create a minimal `.env` file (sufficient to start the server, not full production config)
and start the local development server on port 3001. This will allow LAST_MILE_TEST to
run against the real app and produce a meaningful GO or PARTIAL verdict.

## Steps

### 1. Check if `.env` already exists
```bash
ls -la C:/code/teneo-marketplace/.env 2>/dev/null && echo "EXISTS" || echo "MISSING"
```

### 2. If `.env` is missing, create it from the example
```bash
cp C:/code/teneo-marketplace/marketplace/backend/.env.example C:/code/teneo-marketplace/.env
```

### 3. Set a random SESSION_SECRET (required for the server to start)
Generate a 64-character random hex string and set it in `.env`:
```javascript
// Node.js
const crypto = require('crypto');
const secret = crypto.randomBytes(32).toString('hex');
console.log(secret);
```
Replace `SESSION_SECRET=your-session-secret-here` with the generated value in `.env`.

### 4. Set DATABASE_PATH
Make sure DATABASE_PATH points to a writable location. Set to:
```
DATABASE_PATH=./marketplace.db
```

### 5. Initialize the database (if marketplace.db doesn't exist)
```bash
cd C:/code/teneo-marketplace && node marketplace/backend/database/init.js
```

### 6. Verify the server starts
Try starting the server and check it responds on port 3001:
```bash
cd C:/code/teneo-marketplace && timeout 10 node marketplace/backend/server.js &
sleep 3
curl -s http://localhost:3001/api/health || echo "Server not responding"
```

If the server starts and responds, this task is complete. The CONDUCTOR will then
route LAST_MILE_TEST against `http://localhost:3001`.

### 7. If server starts but crashes on missing Stripe keys
Add placeholder values to `.env` for:
```
STRIPE_SECRET_KEY=sk_test_placeholder_not_real
STRIPE_PUBLISHABLE_KEY=pk_test_placeholder_not_real
STRIPE_WEBHOOK_SECRET=whsec_placeholder_not_real
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=test@example.com
EMAIL_PASS=placeholder
```
These won't enable Stripe/email functionality but will prevent startup crashes.

## Success Criteria

- `.env` file exists at project root
- `node marketplace/backend/server.js` starts without crashing
- `curl http://localhost:3001/api/health` returns a JSON response (any response)
- Server is running on port 3001

## Notes

- Do NOT use real Stripe keys — placeholders are fine for local testing
- The goal is basic server startup, not full feature testing
- After this task, CONDUCTOR will route to LAST_MILE_TEST with `base_url: http://localhost:3001`
- Auth/Stripe features will still fail (no real creds) but page_loads/navigation/responsive_layout should PASS
- A PARTIAL verdict will unblock SWITCH_PROJECT (the gate only blocks on full NO_GO with no running server)
