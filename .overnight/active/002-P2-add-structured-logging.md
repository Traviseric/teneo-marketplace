---
id: 4
title: "Replace console.log with structured Winston logger in routes and services"
priority: P2
severity: high
status: pending
source: code_quality_audit
file: marketplace/backend/routes/
line: 1
created: "2026-03-09T16:00:00Z"
execution_hint: long_running
context_group: logging_system
group_reason: "Cross-cutting concern touching routes/ and services/ directories"
---

# Replace console.log with structured Winston logger in routes and services

**Priority:** P2 (high)
**Source:** code_quality_audit
**Location:** marketplace/backend/routes/, marketplace/backend/services/

## Problem

The backend has 1000+ `console.log` calls across 102+ files with no structured logging. All log output — debug prints, payment events, Stripe webhook processing, order creation, and errors — goes through the same unstructured channel with no timestamps, severity levels, or request correlation IDs.

This makes production debugging nearly impossible:
- Can't filter for only error logs
- Can't correlate a payment failure with the request that triggered it
- Critical payment events (Stripe webhooks, crypto order creation) look identical to debug prints
- No way to configure different log levels for dev vs production

**Impact:** When a checkout fails in production, support teams have no structured way to trace the failure through logs.

## How to Fix

1. **Install Winston:**
   ```bash
   cd marketplace/backend && npm install winston
   ```

2. **Create `marketplace/backend/utils/logger.js`:**
   ```javascript
   const winston = require('winston');

   const logger = winston.createLogger({
     level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
     format: winston.format.combine(
       winston.format.timestamp(),
       winston.format.errors({ stack: true }),
       process.env.NODE_ENV === 'production'
         ? winston.format.json()
         : winston.format.simple()
     ),
     transports: [new winston.transports.Console()]
   });

   module.exports = logger;
   ```

3. **Replace console.log in payment-critical routes first (high impact):**
   - `routes/checkout.js` — payment events, order creation, Stripe webhooks
   - `routes/cryptoCheckout.js` — Lightning/BTC payment events
   - `routes/storefront.js` — fulfillment, ArxMint events
   - `services/emailService.js` — email send/fail events

4. **Replacement pattern:**
   ```javascript
   // Before:
   console.log('Order created:', orderId);
   console.error('Stripe error:', err);

   // After:
   const logger = require('../utils/logger');
   logger.info('Order created', { orderId });
   logger.error('Stripe error', { error: err.message, stack: err.stack });
   ```

5. **Add request correlation ID middleware in `server.js`:**
   ```javascript
   const { v4: uuidv4 } = require('uuid');
   app.use((req, res, next) => {
     req.correlationId = uuidv4();
     res.setHeader('X-Correlation-ID', req.correlationId);
     next();
   });
   ```

6. **Priority order for replacement:**
   - P0: checkout.js, cryptoCheckout.js, storefront.js (payment-critical)
   - P1: emailService.js, orderService.js, adminRoutes.js
   - P2: remaining services (zapService, storeBuilderService, etc.)
   - Skip: test files, scripts

7. Run tests after each batch to verify no regressions.

## Acceptance Criteria

- [ ] `marketplace/backend/utils/logger.js` created with Winston
- [ ] `winston` added to `marketplace/backend/package.json`
- [ ] Payment-critical routes (checkout.js, cryptoCheckout.js, storefront.js) use logger
- [ ] Log format is JSON in production, human-readable in dev
- [ ] All existing tests still pass
- [ ] `console.error` calls in catch blocks replaced with `logger.error` in payment routes

## Notes

_This is a long-running task — 1000+ console.log calls exist across 102+ files. Focus on payment-critical routes first (checkout.js, cryptoCheckout.js, storefront.js). Do not attempt to replace every single console.log in one pass — prioritize high-value areas. The goal is structured logs for payment events, not 100% console.log elimination._
