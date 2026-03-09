---
id: 5
title: "Add Jest test suites for checkout.js and cryptoCheckout.js payment routes"
priority: P2
severity: medium
status: completed
source: code_quality_audit
file: marketplace/backend/routes/checkout.js
line: 1
created: "2026-03-09T16:00:00Z"
execution_hint: parallel
context_group: test_coverage
group_reason: "Test files for related payment routes; can run independently"
---

# Add Jest test suites for checkout.js and cryptoCheckout.js

**Priority:** P2 (medium)
**Source:** code_quality_audit
**Location:** marketplace/backend/routes/checkout.js, marketplace/backend/routes/cryptoCheckout.js

## Problem

The payment routes `checkout.js` (1077 lines, Stripe) and `cryptoCheckout.js` (Lightning/BTC/Monero) are the most revenue-critical files in the project, yet neither has a dedicated test suite in `marketplace/backend/__tests__/`. The review audit confirms 10 test suites fail due to sqlite3 binding issues on Windows, and `checkout-price-validation.test.js` and `cryptoCheckout.test.js` are among the failing suites.

The existing test files are likely outdated. New tests should mock sqlite3 to avoid the Windows binding issue and cover the key checkout paths.

**Risk:** Undetected regressions in payment flows directly cause lost revenue and customer trust issues.

## How to Fix

1. **Create `marketplace/backend/__tests__/checkout.test.js`:**
   - Mock `stripe`, `sqlite3`/`databaseHelper`, `emailService`
   - Test cases:
     - `POST /api/checkout` happy path (Stripe session created, order saved)
     - `POST /api/checkout` with invalid format parameter (should reject with 400)
     - `POST /api/checkout` with coupon code (discount applied)
     - `POST /api/checkout` with order bump (bump item added)
     - Rate limiting (>10 requests in window returns 429)
     - `POST /api/webhook` Stripe webhook handler (payment_intent.succeeded → order marked complete, download email sent)
     - `POST /api/webhook` with invalid signature (should return 400)
     - Stripe unavailable → fallback to crypto checkout URL returned

2. **Create `marketplace/backend/__tests__/cryptoCheckout.test.js`:**
   - Mock `sqlite3`/`databaseHelper`, BTC price API
   - Test cases:
     - `POST /api/crypto-checkout` with valid product (returns BTC/LN address + amount)
     - `POST /api/crypto-checkout` with unconfigured BTC address (throws, returns 500)
     - `POST /api/crypto-checkout` price calculation (USD → BTC conversion)
     - `POST /api/crypto-checkout/verify` payment verification happy path
     - `POST /api/crypto-checkout/verify` with invalid payment (no-op)

3. **Follow existing test patterns** from `storefront.test.js`, `admin.test.js`:
   - Use `jest.mock()` for external deps
   - Use `supertest` for HTTP-level testing
   - Mock `databaseHelper` to return expected data

4. **Fix the sqlite3 binding issue** in existing failing tests if possible:
   - Check if tests can use `better-sqlite3` instead of `sqlite3` for the test environment
   - Or mock sqlite3 at the top of each test file: `jest.mock('sqlite3')`

## Acceptance Criteria

- [ ] `marketplace/backend/__tests__/checkout.test.js` exists with ≥8 test cases
- [ ] `marketplace/backend/__tests__/cryptoCheckout.test.js` exists with ≥5 test cases
- [ ] Both test files pass without sqlite3 native binding errors (use mocks)
- [ ] Stripe webhook signature verification tested
- [ ] Rate limiting behavior tested
- [ ] No regressions in existing passing tests (28/38 suites)

## Notes

_The review audit notes 10 test suites fail due to sqlite3 Windows native binding issue (TypeError: exists is not a function). New tests should mock sqlite3 to avoid this. Do not try to fix the native binding itself — that requires system-level changes and is a human task (HT-013)._
