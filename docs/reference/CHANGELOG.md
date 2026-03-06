# Changelog

All notable changes to OpenBazaar AI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-02-28

### Summary

Major evolution from book-only marketplace to full creator platform. Three pillars defined (marketplace, gig platform, agent services). Research-informed roadmap from 9 Gemini Deep Research outputs. Auth system rebuilt with pluggable providers. AI discovery engine added. Landing site redesigned.

### Added - Platform Architecture

**Authentication System**
- Pluggable auth provider abstraction (`auth/AuthProvider.js`)
- Local magic link auth (SQLite + email, zero external deps)
- Teneo Auth SSO provider (OAuth 2.0 + PKCE)
- Nostr auth provider (NIP-07 + NIP-98) -- backend ready, frontend not wired
- Auth routes with session management, token refresh, audit logging
- Auth database schema (`schema-auth.sql`)

**AI Discovery Engine**
- Semantic search service using OpenAI embeddings (`aiDiscoveryService.js`)
- Keyword fallback when no API key configured
- Knowledge graph with citation networks
- AI-generated reading paths across stores
- Database schema for embeddings and citations (`schema-ai-discovery.sql`)
- Discovery API routes (`aiDiscovery.js`)

**Course Platform**
- Course CRUD with module/lesson structure (`courseRoutes.js`)
- Quiz engine with scoring and results tracking (`quiz.js`)
- Certificate generation on course completion
- Enrollment and progress tracking
- Course database schema (`schema-courses.sql`)
- 5 course frontend components (progress-bar, module-card, etc.)

**Email Marketing**
- Email marketing service with sequences and drip campaigns
- Segmentation service (8 auto-segments + dynamic rules + engagement scoring)
- Email tracking (open/click rates, engagement metrics)
- Cart abandonment recovery email sequences
- Email marketing database schema (`schema-email-marketing.sql`)

**Funnel Builder**
- Funnel save/load/deploy with template integration
- 4 funnel templates (book-sales, course-launch, reader-magnet, story-driven)
- Frontend funnel builder UI (`funnel-builder.html`, `funnel-builder.js`)
- Funnel database schema (`schema-funnels.sql`)

**AI Page Builder**
- Natural language page generation service (`aiPageBuilderService.js`)
- OpenAI-powered intent parsing for page creation

**Print-on-Demand**
- Full Lulu API integration (token auth, job creation, shipping)
- Lulu admin routes for order management
- Lulu database schema (`schema-lulu.sql`)

**Publisher Features**
- Amazon book verification and BSR/rating tracking
- Publisher profiles with milestones and rewards
- Leaderboards with caching
- Performance alerts and daily digests
- Book analytics (ranking history, performance trends)

**Censorship Tracking**
- Ban detection across platforms
- Alert generation and email notifications
- Censorship tracker database schema

**Agent App Store** (scaffold)
- App registry routes and seeding script
- Database schema (`schema-appstore.sql`)

**Landing Site**
- New `openbazaar-site/` with Mediterranean architecture design
- Mobile-responsive hero, feature cards, CTA sections
- Brand guidelines with favicon and logo

### Changed

**Payment System**
- Added production checkout route (`checkoutProduction.js`) with enhanced validation
- Added mixed checkout route (`checkoutMixed.js`) for Stripe + crypto fallback
- Added checkout offer service with coupon application
- Coupons routes (`couponsRoutes.js`) for CRUD operations

**Federation Network**
- RSA-signed peer communications
- Network explorer UI with stats, search, store connections
- Frontend network client with caching (`network-client.js`)
- Revenue sharing logic (schema defined, not yet wired to checkout)

**Admin Dashboard**
- Added refund processing
- Added Stripe integration status
- Added analytics and sales reports

**Security**
- Rate limiting on login, checkout, and crypto verification
- CSRF protection on all forms
- Helmet security headers
- Input validation middleware

**Testing**
- 17 test suites, 158 tests (100% pass rate)
- Coverage: health, auth, checkout, Stripe webhooks, crypto, courses, quizzes, downloads, coupons, Lulu, orders, email sequences, brands, app store, webhooks, validation

### Not Yet Implemented (Documented in Roadmap)
- Gig platform (jobs, proposals, contracts, escrow) -- 0% built
- Agent services (L402 micropayments) -- scaffold only
- ArxMint payment integration (Lightning/ecash) -- service stubbed
- Health monitoring / automatic failover -- documented, not coded
- Checkout conversion stack (order bumps, upsells, cart recovery)
- Content protection (PDF stamping, watermarks, license keys)
- Affiliate program
- Tax workflow
- Nostr auth frontend integration
- NIP-99 federated product listings

---

## [1.0.0] - 2024-01-15

### Initial Release

**Core Marketplace**
- Express.js backend with SQLite database
- Stripe Checkout integration (test + live modes)
- Webhook handling for order completion
- Secure PDF download system (token-based, 24-hour expiry, 5 downloads)
- Multi-brand system (Teneo, True Earth, WealthWise, default)
- Email automation (order confirmations, download links)
- Order and customer management

**Federation Network**
- Network registry for store discovery
- Cross-store search
- Network statistics dashboard
- 3 demo stores

**Developer Experience**
- 3-command quick start
- Automatic database initialization
- Docker support
- Environment-based configuration
- Comprehensive documentation

---

**Contributors**: Built by Travis Eric with Claude Code

**License**: MIT
