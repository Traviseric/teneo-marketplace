---
id: 37
title: "Add test coverage for storefront.js (ArxMint integration surface)"
priority: P2
severity: medium
status: completed
source: code_quality_audit
file: marketplace/backend/routes/storefront.js
line: 1
created: "2026-03-06T14:00:00Z"
execution_hint: parallel
context_group: test_coverage
group_reason: "New test files — parallel with task 038 (emailService tests)"
---

# Add test coverage for storefront.js (ArxMint integration surface)

**Priority:** P2 (medium)
**Source:** code_quality_audit
**Location:** marketplace/backend/__tests__/storefront.test.js (new file)

## Problem

No test file exists for `storefront.js`. The storefront API is the primary integration surface for ArxMint (and any external storefront consumer):
- `GET /api/storefront/catalog` — public product catalog
- `GET /api/storefront/products/:id` — single product lookup
- `POST /api/storefront/checkout` — create checkout session
- `POST /api/storefront/fulfill` — ArxMint fulfillment webhook (now with HMAC verification after task 016)

All of these are untested. The HMAC webhook verification (recently added in task 016) is especially important to test — it should reject invalid signatures and accept valid ones.

## How to Fix

Create `marketplace/backend/__tests__/storefront.test.js`:

### 1. Catalog endpoint

```javascript
describe('GET /api/storefront/catalog', () => {
  it('returns 200 with products array', async () => {
    const res = await request(app).get('/api/storefront/catalog');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('products');
    expect(Array.isArray(res.body.products)).toBe(true);
  });

  it('filters by brand if brand param provided', async () => {
    const res = await request(app).get('/api/storefront/catalog?brand=teneo');
    expect(res.status).toBe(200);
  });
});
```

### 2. Product lookup

```javascript
describe('GET /api/storefront/products/:id', () => {
  it('returns 404 for unknown product', async () => {
    const res = await request(app).get('/api/storefront/products/nonexistent');
    expect(res.status).toBe(404);
  });
});
```

### 3. Checkout (with API key)

```javascript
describe('POST /api/storefront/checkout', () => {
  it('returns 401 in production when STOREFRONT_API_KEY is not set', async () => {
    // Set NODE_ENV=production, no API key
    const res = await request(app).post('/api/storefront/checkout').send({...});
    expect(res.status).toBe(401);
  });

  it('returns 400 if required fields missing', async () => {
    const res = await request(app)
      .post('/api/storefront/checkout')
      .set('x-api-key', 'test-key')
      .send({});
    expect(res.status).toBe(400);
  });
});
```

### 4. Fulfill webhook — signature verification

```javascript
describe('POST /api/storefront/fulfill', () => {
  it('rejects request with invalid HMAC signature', async () => {
    process.env.ARXMINT_WEBHOOK_SECRET = 'test-secret';
    const res = await request(app)
      .post('/api/storefront/fulfill')
      .set('x-arxmint-signature', 'invalid-sig')
      .send({ orderId: 'test-order' });
    expect(res.status).toBe(401);
  });

  it('accepts request with valid HMAC signature', async () => {
    const secret = 'test-secret';
    const body = JSON.stringify({ orderId: 'test-order', status: 'paid' });
    const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');
    const res = await request(app)
      .post('/api/storefront/fulfill')
      .set('x-arxmint-signature', sig)
      .send(body);
    // Should not be 401
    expect(res.status).not.toBe(401);
  });
});
```

## Acceptance Criteria

- [ ] `__tests__/storefront.test.js` file created
- [ ] Catalog endpoint tested (returns products array)
- [ ] Product lookup tested (404 case)
- [ ] Checkout tested (unauthenticated rejection in production mode)
- [ ] Fulfill webhook tested for invalid signature rejection and valid signature acceptance
- [ ] All new tests pass (`npm test` exits 0)
- [ ] No regressions in existing test suite

## Notes

_Generated from code_quality_audit medium finding: "No test file for storefront.js. The storefront API (/api/storefront/catalog, /api/storefront/fulfill) is described as the primary ArxMint integration surface — untested."_
