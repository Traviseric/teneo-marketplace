# Implementation Map

**Last Updated:** 2026-03-05
**Status:** See [ROADMAP.md](../ROADMAP.md) for strategic priorities and [MARKETPLACE_STATUS_AND_TODO.md](../reference/MARKETPLACE_STATUS_AND_TODO.md) for detailed build status.

> This file was the primary implementation tracker through Nov 2024. It is now a reference document.
> The authoritative sources are **ROADMAP.md** (strategy) and **MARKETPLACE_STATUS_AND_TODO.md** (status).

---

## Current State (March 2026)

### Production-Ready Systems

| System | Location | Status |
|--------|----------|--------|
| Express.js backend | `marketplace/backend/server.js` | 26 route files, 27+ services |
| SQLite database | `marketplace/backend/database/` | 10 schema files |
| Stripe payments | `routes/checkout.js`, `checkoutProduction.js`, `checkoutMixed.js` | Full checkout + refunds |
| Crypto checkout | `routes/cryptoCheckout.js` | BTC/Lightning/Monero (manual verification) |
| Auth system | `marketplace/backend/auth/` | 3 providers: magic link, OAuth SSO, Nostr (backend) |
| Admin dashboard | `routes/adminRoutes.js` | Orders, analytics, refunds, audit logging |
| Multi-brand catalog | `routes/brandRoutes.js`, `frontend/brands/` | 9 brands configured |
| Course platform | `routes/courseRoutes.js`, `routes/quiz.js` | CRUD, enrollment, quizzes, certificates |
| Email marketing | `services/emailMarketingService.js` | Sequences, segmentation, tracking |
| Funnel builder | `funnel-module/` | 4 templates, save/load/deploy |
| Print-on-demand | `routes/luluAdmin.js`, `services/luluService.js` | Full Lulu API integration |
| AI discovery | `routes/aiDiscovery.js`, `services/aiDiscoveryService.js` | Semantic search + keyword fallback |
| Federation network | `routes/networkRoutes.js`, `services/network-service.js` | Peer discovery, cross-store search |
| Publisher features | `routes/publishedBooks.js`, `routes/publisherProfiles.js` | Amazon tracking, leaderboards, badges |
| Download system | `routes/downloadRoutes.js` | Token validation, rate limiting |
| Component library | `marketplace/frontend/components-library/` | Heroes (5/5), CTAs (1/6), base system |

### Not Built

| Feature | Roadmap Phase | Notes |
|---------|---------------|-------|
| Gig platform | Phase 2 | 0% -- no routes, no schema |
| Agent services | Phase 4 | App store scaffold only |
| ArxMint payments | Phase 3 | Service stubbed, needs ArxMint SDK |
| Health monitoring / failover | Deferred | Documented in DUAL_MODE_ARCHITECTURE.md |
| Checkout conversion stack | Phase 1 | Coupons, bumps, upsells, cart recovery |
| Content protection | Phase 1 | PDF stamping, watermarks, license keys |
| Affiliate program | Phase 2 | Non-negotiable for creator switching |
| Tax workflow | Phase 2 | Calculation + invoicing, not MoR |
| Nostr auth frontend | Phase 3 | Backend provider exists, no UI |
| NIP-99 federation | Phase 4 | Currently JSON registry |

### Component Library Status

12 of ~50 planned components built (24%):
- Heroes: 5/5
- CTAs: 1/6
- Product: 1/5
- Base system: 3/3 (variables, reset, docs)
- Brand themes: 2/4
- Infrastructure: 3/3 (manifest, index, generator)

Remaining categories (forms, pricing, social proof, interactive, conversion, content, navigation) not started.

---

## Architecture

```
openbazaar-ai/
  marketplace/
    backend/
      server.js              # Express entry point (port 3001)
      routes/                # 26 route files
      services/              # 27+ service files
      database/              # SQLite + 10 schema files
      auth/                  # 3 pluggable auth providers
      middleware/             # Auth, rate limiting, Teneo auth
    frontend/
      index.html             # Main marketplace view
      brands/                # 9 brand configs
      components-library/    # Reusable HTML/CSS components
      js/                    # Client-side modules
  course-module/             # Course player + content
  funnel-module/             # Funnel builder + templates
  openbazaar-site/           # Landing page (Vercel deploy)
  __tests__/                 # 17 test suites
  docs/                      # 75+ documentation files
```

---

## Testing

17 test suites, 158 tests, 100% pass rate. Coverage includes: health checks, auth flows, checkout price validation, crypto checkout, Stripe webhook idempotency, course enrollment, quizzes, downloads, coupons, Lulu POD, order service, email sequences, brands, app store, webhooks, input validation.

```bash
npm test          # Run all tests
npm run test:watch  # Watch mode
```
