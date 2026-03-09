---
id: 36
title: "Add test coverage for adminRoutes.js"
priority: P2
severity: medium
status: completed
source: code_quality_audit
file: marketplace/backend/routes/adminRoutes.js
line: 1
created: "2026-03-06T14:00:00Z"
execution_hint: sequential
context_group: admin_backend
group_reason: "adminRoutes.js area — same file as task 031 (Stripe key mutation fix)"
---

# Add test coverage for adminRoutes.js

**Priority:** P2 (medium)
**Source:** code_quality_audit
**Location:** marketplace/backend/__tests__/admin.test.js (new file)

## Problem

No test file exists for `adminRoutes.js`. The admin panel handles high-value, high-risk operations:
- Refund processing (real money)
- Book management (CRUD that affects the storefront catalog)
- Settings load/save (including Stripe key configuration)
- Auth status endpoint (used by frontend to gate admin UI)

These operations have no automated test coverage. A regression in the refund flow or settings save is invisible until a real user reports it.

## How to Fix

Create `marketplace/backend/__tests__/admin.test.js` covering at minimum:

### 1. Auth-status endpoint

```javascript
describe('GET /api/admin/auth-status', () => {
  it('returns { authenticated: false } when not logged in', async () => {
    const res = await request(app).get('/api/admin/auth-status');
    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(false);
  });

  it('returns { authenticated: true } when admin session exists', async () => {
    // Set up session with isAdmin: true
    const agent = request.agent(app);
    // ... login as admin
    const res = await agent.get('/api/admin/auth-status');
    expect(res.body.authenticated).toBe(true);
  });
});
```

### 2. Book CRUD (protected routes)

```javascript
describe('POST /api/admin/books', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).post('/api/admin/books').send({ title: 'Test' });
    expect(res.status).toBe(401);
  });

  it('creates a book record when authenticated', async () => {
    // ...
  });
});
```

### 3. Refund flow

```javascript
describe('POST /api/admin/refund', () => {
  it('returns 400 if orderId is missing', async () => { ... });
  it('returns 401 if not authenticated', async () => { ... });
  // Mock Stripe refund API for the success case
});
```

### 4. Settings load/save

```javascript
describe('GET /api/admin/settings', () => {
  it('returns current settings object', async () => { ... });
});

describe('POST /api/admin/save-all', () => {
  it('saves settings to database', async () => { ... });
  it('does NOT mutate process.env', async () => {
    const before = process.env.STRIPE_SECRET_KEY;
    await request(app).post('/api/admin/save-all').send({ stripeSecretKey: 'new-key' });
    expect(process.env.STRIPE_SECRET_KEY).toBe(before); // should not change
  });
});
```

### Pattern to follow

Look at `__tests__/auth.test.js` and `__tests__/checkout.test.js` for patterns on how to:
- Set up `supertest` with the express app
- Mock the database layer
- Simulate authenticated sessions

## Acceptance Criteria

- [ ] `__tests__/admin.test.js` file created
- [ ] auth-status endpoint tested (authenticated + unauthenticated cases)
- [ ] Book CRUD routes tested (at least unauthenticated rejection + one happy path)
- [ ] Refund route tested (missing orderId, unauthenticated)
- [ ] Settings save tested (persistence to DB, NOT process.env mutation)
- [ ] All new tests pass (`npm test` exits 0)
- [ ] No regressions in existing test suite (158+ tests still pass)

## Notes

_Generated from code_quality_audit medium finding: "No test file for adminRoutes.js. Admin panel handles refunds, book management, settings — high-value, high-risk operations with no automated coverage."_
