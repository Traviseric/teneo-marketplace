---
id: 54
title: "Add Jest tests for network.js federation routes"
priority: P3
severity: low
status: completed
source: code_quality_audit
file: marketplace/backend/routes/network.js
line: 1
created: "2026-03-06T00:00:00Z"
execution_hint: parallel
context_group: security_quality
group_reason: "Test coverage addition — independent of UX and feature groups"
---

# Add Jest tests for network.js federation routes

**Priority:** P3 (low)
**Source:** code_quality_audit
**Location:** marketplace/backend/routes/network.js

## Problem

No tests exist for `network.js` (federation routes). Network/peer discovery and cross-store catalog search are core features with zero automated coverage. This leaves regressions undetected.

Key untested behaviors:
- Node registration (`POST /api/network/register`)
- Peer discovery (`GET /api/network/peers`)
- Cross-network catalog search (`GET /api/network/search?brand=`)
- Revenue share calculation logic
- Path traversal guards on brand parameter (critical — task 014 fixed these, tests would prevent regressions)

## How to Fix

Create `marketplace/backend/__tests__/network.test.js` covering:

1. **Node registration:**
   ```js
   test('POST /api/network/register registers a node', async () => {
     const res = await request(app).post('/api/network/register').send({
       nodeId: 'test-node', url: 'https://example.com', name: 'Test Node'
     });
     expect(res.status).toBe(200);
   });
   ```

2. **Peer discovery:**
   ```js
   test('GET /api/network/peers returns peer list', async () => {
     const res = await request(app).get('/api/network/peers');
     expect(res.status).toBe(200);
     expect(Array.isArray(res.body)).toBe(true);
   });
   ```

3. **Path traversal guard regression test:**
   ```js
   test('GET /api/network/catalog?brand=../../etc/passwd is blocked', async () => {
     const res = await request(app).get('/api/network/catalog?brand=../../etc/passwd');
     expect(res.status).not.toBe(200);
     // Should return 400 or 404, not serve arbitrary file
   });
   ```

4. **Cross-network search:**
   ```js
   test('GET /api/network/search returns results', async () => {
     const res = await request(app).get('/api/network/search?q=test');
     expect(res.status).toBe(200);
   });
   ```

Follow the pattern in existing test files (`__tests__/auth.test.js`, `__tests__/storefront.test.js`) for app setup, mocking, and assertions.

## Acceptance Criteria

- [ ] `__tests__/network.test.js` created
- [ ] Covers node registration, peer discovery, catalog query, cross-network search
- [ ] Regression test for path traversal guard on brand parameter
- [ ] All tests pass with `npm test`
- [ ] No new test infrastructure dependencies needed

## Notes

_Generated from code_quality_audit finding: "No tests for network.js. Network/peer discovery is a core feature with no automated coverage."_
