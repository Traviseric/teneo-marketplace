---
id: 19
title: "Set up Jest test framework and write core unit/integration tests"
priority: P2
severity: medium
status: completed
source: overnight_tasks
file: package.json
line: 9
created: "2026-02-28T00:00:00"
execution_hint: long_running
context_group: testing
group_reason: "Test infrastructure — standalone, can run after P0/P1 fixes are in"
---

# Set up Jest test framework and write core unit/integration tests

**Priority:** P2 (medium)
**Source:** overnight_tasks (Tier 1)
**Location:** package.json (test script is a stub)

## Problem

The project has zero automated tests:
- `package.json` test script is `echo "Error: no test specified" && exit 1`
- No test framework installed (no Jest, Mocha, Vitest, etc.)
- No `.test.js` or `.spec.js` files anywhere in the codebase
- ~95 API endpoints with zero systematic test coverage
- Core business logic (order processing, email delivery, payment routing) is completely untested
- Only 5 manual integration smoke scripts exist at root level (not a test suite)

This makes refactoring dangerous and bugs go undetected until production.

**Code with issue:**
```json
// package.json
{
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  }
}
```

## How to Fix

**Step 1: Install Jest and supertest**:
```bash
npm install --save-dev jest supertest
```

**Step 2: Update package.json**:
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "jest": {
    "testEnvironment": "node",
    "testMatch": ["**/__tests__/**/*.js", "**/*.test.js"]
  }
}
```

**Step 3: Create `__tests__/` directory and write initial tests**:

Priority tests to write first:
1. **Health check** — `GET /api/health` returns 200
2. **Auth routes** — `POST /api/auth/login` validates email, returns 400 on invalid
3. **Brand API** — `GET /api/brands` returns array; `POST /api/brands` requires auth (returns 401)
4. **Checkout validation** — `POST /api/checkout/session` validates required fields
5. **Database init** — schema creates expected tables
6. **Email validation utility** — test the `isValidEmail()` function from task 017
7. **Coupon validation** — once moved server-side (task 005), test valid/invalid codes

Example test:
```javascript
// __tests__/health.test.js
const request = require('supertest');
const app = require('../marketplace/backend/server');

describe('Health endpoint', () => {
    it('returns 200 with status ok', async () => {
        const res = await request(app).get('/api/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
    });
});
```

**Step 4: Add CI configuration** (optional but recommended) — a simple GitHub Actions workflow to run `npm test` on push.

## Acceptance Criteria

- [ ] `npm test` runs Jest and passes (doesn't error out)
- [ ] At least 10 tests written covering health, auth, and brand API
- [ ] Tests use supertest for HTTP endpoint testing
- [ ] Tests run in isolation (mock database or test database, not production)
- [ ] `npm run test:coverage` generates coverage report

## Notes

_Generated from OVERNIGHT_TASKS.md Tier 1 and feature_audit findings. Run this after P0/P1 fixes are in — tests should verify the fixed behavior._
