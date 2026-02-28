---
id: 10
title: "Add rate limiting to unprotected public API endpoints"
priority: P1
severity: high
status: completed
source: gap_analyzer
file: marketplace/backend/routes/aiDiscovery.js
line: 1
created: "2026-02-28T00:00:00"
execution_hint: parallel
context_group: api_hardening
group_reason: "Independent API hardening — can run in parallel with other non-conflicting fixes"
---

# Add rate limiting to unprotected public API endpoints

**Priority:** P1 (high)
**Source:** gap_analyzer
**Location:** aiDiscovery.js, censorshipTracker.js, brandRoutes.js, nft.js

## Problem

Rate limiting only exists on admin login (5 attempts/15 min) and download routes (10 attempts/min). Most public endpoints have no rate limiting, making them vulnerable to:

- **AI Discovery search** (`/api/discovery/search`) — Each request may trigger OpenAI API calls. Unlimited requests = unlimited API bill
- **Censorship tracker public endpoints** — Can be scraped or abused
- **Brand listing and catalog** — Can be hit with massive traffic without throttling
- **NFT endpoints** — Can be hit repeatedly

The `express-rate-limit` package is already used in `middleware/auth.js` for the login limiter — it just needs to be applied more broadly.

**Code with issue:**
```javascript
// aiDiscovery.js — no rate limiting on AI-powered search
router.get('/search', async (req, res) => {
    // calls OpenAI embeddings API — no rate limit
});
```

## How to Fix

1. Create shared rate limiters in `middleware/auth.js` or a new `middleware/rateLimits.js`:

```javascript
const rateLimit = require('express-rate-limit');

// For AI/expensive endpoints
const aiRateLimit = rateLimit({
    windowMs: 60 * 1000,  // 1 minute
    max: 20,  // 20 requests per minute per IP
    message: { error: 'Too many requests, please try again later.' }
});

// For general public API endpoints
const publicApiLimit = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 200,
    message: { error: 'Too many requests.' }
});
```

2. Apply to the most vulnerable endpoints:
```javascript
// aiDiscovery.js
router.get('/search', aiRateLimit, async (req, res) => { ... });

// nft.js — public endpoints
router.get('/library/:address', publicApiLimit, async (req, res) => { ... });
```

3. Apply `publicApiLimit` broadly to brand and catalog listing endpoints.

## Acceptance Criteria

- [ ] AI discovery search endpoint has rate limiting (max ~20 req/min per IP)
- [ ] Public NFT endpoints have rate limiting
- [ ] Brand/catalog browsing endpoints have rate limiting
- [ ] Rate limit responses return proper 429 status with clear error message
- [ ] Admin endpoints (already protected by auth) don't need additional rate limiting

## Notes

_Generated from gap_analyzer findings. express-rate-limit is already a dependency (once task 001 is done) — just needs to be applied to more routes._
