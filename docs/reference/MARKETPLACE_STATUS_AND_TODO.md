# OpenBazaar AI - Status & TODO

**Updated:** March 9, 2026
**Status:** Broadly implemented platform with a green automated baseline, but production proof is still incomplete

> **Strategic roadmap:** See **[docs/ROADMAP.md](../ROADMAP.md)** for the canonical phased plan.
> **Change tracking:** See **[CHANGELOG.md](../../CHANGELOG.md)** for meaningful repo updates.

---

## Reality Check

The older docs were too binary. The real state is:

- a lot more is implemented than "MVP not built"
- a lot less is proven than "fully live"

Current verification baseline:

- Route files: `42`
- Service files: `51`
- Test suites: `40`
- Latest local test run: `npm test -- --runInBand`
- Result: `40` passing suites, `0` failing suites
- Totals: `517` passing tests, `0` failing tests, `2` skipped

That means the immediate priority is production proof and cleanup, not pretending the remaining validation work is optional.

**Authentication:** ✅ **Complete (backend)**
- ✅ Auth abstraction layer (`auth/AuthProvider.js`)
- ✅ Local auth provider (SQLite + magic links)
- ✅ TENEO Auth provider (OAuth 2.0 SSO)
- ✅ Auth routes (`routes/auth.js`)
- ✅ User management, sessions, tokens
- ✅ Audit logging

**Email Services:**
- ✅ Order confirmations
- ✅ Download links
- ✅ Magic link authentication
- ✅ SMTP + Resend support

**Admin Features:**
- ✅ Book management
- ✅ Brand management
- ✅ Order management
- ✅ Lulu print-on-demand integration
- ✅ **Multi-tenant Printful fulfillment** — merchants connect own Printful store, auto-sync products, per-merchant webhooks, encrypted credentials, dashboard UI
- ✅ Manual fulfillment provider — self-shipped products with tracking from dashboard
- ✅ Shipping rate estimator endpoint for checkout integration
- ✅ Audit logging
- ✅ Rate limiting

**Amazon Integration:**
- ✅ Published books tracking
- ✅ Analytics and ranking history
- ✅ Publisher profiles
- ✅ Milestone rewards
- ✅ Leaderboards
- ✅ Performance alerts
- ✅ Daily digests

**Network/Federation:**
- ✅ Network registry system with RSA-signed communications
- ✅ Cross-node search and catalog aggregation
- ✅ Node discovery and health checks
- ✅ Revenue sharing logic
- ✅ Network explorer UI (`network.html`) with stats, search, store connections
- ✅ AI discovery service (semantic search, reading paths, knowledge graph)
- ✅ Database schema for embeddings, citations, and reading paths
- ✅ Frontend network client with caching (`network-client.js`)

**API Routes:**
- ✅ `/api/brands` - Multi-brand catalog
- ✅ `/api/checkout` - Stripe payments
- ✅ `/api/crypto` - Crypto payments
- ✅ `/api/catalog` - Book catalog
- ✅ `/api/download` - Secure downloads
- ✅ `/api/admin` - Admin dashboard
- ✅ `/api/network` - Federation
- ✅ `/api/published` - Amazon books
- ✅ `/api/publishers` - Publisher profiles
- ✅ `/api/auth` - Authentication

---

## What's COMPLETE

### 1. Backend Infrastructure

**Core Server**
- Express server (`server.js`) with production-aware config
- Session management with CSRF protection
- Environment validation
- CORS and core security middleware
- Health endpoints

**Database and Schema**
- SQLite runtime path
- Supabase/Postgres adapter path in code
- Orders, payments, downloads, refunds
- Store builds, referrals, memberships, subscriptions
- Amazon/publisher analytics structures

**Payment Processing**
- Stripe checkout routes
- Mixed checkout route surface
- Crypto checkout routes
- Webhook handling
- Order management
- Download token generation
- Order-state-machine foundations

**Authentication**
- Auth abstraction layer
- Local auth provider
- TENEO Auth provider
- Auth routes
- Session-backed account behavior
- Audit logging
- NIP-98 and NIP-05 backend surfaces

**Email Services**
- Order confirmations
- Download links
- Magic-link email support
- SMTP + Resend-aware service code

**Admin Features**
- Book management
- Brand management
- Order management
- Audit logging
- Rate limiting
- Fulfillment admin route surface

**Network / Federation / Commerce Extensions**
- Network registry and discovery route surface
- Cross-node search surface
- Referral capture and commission tracking routes
- AI discovery service
- Storefront API
- Agent API route surface
- Machine-payable route surface
- Subscription routes
- Hosting tier billing routes

### 2. Frontend Surface Area

**Pages Present**
- `index.html`
- `store.html`
- `brands.html`
- `cart-custom.html`
- `crypto-checkout.html`
- `success.html` / `cancel.html`
- `admin.html`
- `downloads.html`
- `network.html`
- `published.html`
- `publisher-profile.html`
- `rewards.html`
- `login.html`
- `account-dashboard.html`
- `account/memberships.html`
- `store-builder-intake.html`

**Component and Frontend Assets**
- Component library
- Brand-manager and cart scripts
- Network client
- Template processor
- Crypto checkout frontend script

### 3. Builder and Managed-Service Surface

- AI store-builder endpoints for generate, render, save, preview, publish, and edit
- Store-build tracking schema and routes
- Managed intake flow
- Operator workflow documented in [OPERATOR_GUIDE.md](../OPERATOR_GUIDE.md)

---

## What's PARTIALLY COMPLETE

### 1. Frontend Auth Integration

**Status:** Backend is strong; frontend flow exists but is not yet a fully coherent public user journey.

**What exists**
- `login.html`
- `account-dashboard.html`
- auth backend routes and session handling

**What still needs work**
- unify login, register, account, and logout experience
- verify account pages against the real auth backend
- remove dead-end or misleading auth flows

### 2. Supabase / Production Data Path

**Status:** Adapter exists; production proof is still incomplete.

**Needs**
- validate checkout, auth, subscriptions, and fulfillment against Postgres/Supabase
- document the verified production path

### 3. Email Service Configuration

**Status:** Code is implemented; deployed delivery still needs proof.

**Needs**
- configure real provider credentials
- verify magic link delivery
- verify purchase and fulfillment emails

### 4. Courses, Funnels, and Creator Flow

**Status:** Major route and component surface exists; end-to-end creator flow still needs proof.

**Needs**
- course checkout and enrollment proof
- funnel save/load/deploy proof
- better creator UX across these modules

### 5. Fulfillment Providers

**Status:** Printful and Lulu surfaces exist; live production proof still missing.

**Needs**
- first real Printful order validation
- first real Lulu order validation
- admin UX hardening for provider mapping and status handling

### 6. AI Store Builder

**Status:** Beta / managed-service capable, not yet a fully proven self-serve product.

**Needs**
- repeated successful internal or paid builds
- delivery artifacts and QA evidence per run
- stronger validation and editing reliability

### 7. ArxMint / L402 / Agent Commerce

**Status:** Significant partial implementation exists.

**What exists**
- ArxMint provider surface
- machine-payable endpoints
- agent-facing catalog/quote/purchase routes
- L402-oriented route surface

**Needs**
- end-to-end proof
- production validation
- clearer supported-path documentation

---

## What's NOT BUILT (Or Not Finished Enough To Count)

### 1. Checkout Conversion Stack

**Status:** Still not finished end-to-end.

**Needs**
- coupons polish and validation
- order bumps fully proven
- upsells
- cart abandonment recovery

### 2. Content Protection

**Status:** Not finished as a production-ready capability.

**Needs**
- PDF stamping
- watermarking
- license key lifecycle proof
- file versioning polish

### 3. Affiliate System

**Status:** Still planned.

**Needs**
- affiliate signup
- tracking links
- commission dashboards
- payout policy and anti-fraud controls

### 4. Gig Platform

**Status:** Still planned.

**Needs**
- jobs
- proposals
- contracts
- escrow
- milestone workflows

### 5. Full Nostr Frontend Experience

**Status:** Backend support exists; browser UX remains unfinished.

### 6. Full Migration Tooling

**Status:** Planned.

**Needs**
- Gumroad import
- Teachable import
- email import
- Amazon/KDP bridge

### 7. Tax Workflow

**Status:** Planned.

### 8. Full Managed Hosting Operations

**Status:** Billing routes exist, but end-to-end hosting operations do not yet count as complete.

---

## Best-Practice Alignment

Documentation and roadmap alignment against `C:\code\.claude\BEST_PRACTICES.md`:

**Aligned now**
- `AGENTS.md` is a stable entrypoint contract
- `CLAUDE.md` exists and is concise
- canonical roadmap exists at `docs/ROADMAP.md`
- docs index exists at `docs/README.md`
- canonical status doc exists here
- changelog now exists at repo root

**Still requiring engineering work**
- production proof for key flows is still incomplete
- test output is still noisy in a few suites because some DB initialization paths log schema drift during tests
- docs must continue to track runtime truth whenever features change

---

## Immediate Next Steps

This replaces the older "launch in 8 hours" framing. The repo is beyond that stage.

### 1. Proof and Cleanup First

1. Keep the Jest baseline green
2. Reduce noisy DB initialization and migration logging during tests
3. Validate the production Postgres/Supabase path
4. Prove one real Stripe digital order
5. Prove one real POD order
6. Verify production email delivery
7. Finish the public auth/account flow

### 2. Creator Baseline Second

- subscriptions UX
- fulfillment admin UX
- course and funnel proof
- creator account coherence

### 3. Differentiators Third

- AI store-builder delivery proof
- ArxMint deeper flow
- L402 hardening
- network and migration expansion

---

## Documentation Status

**Canonical truth docs**
- `README.md`
- `docs/README.md`
- `docs/ROADMAP.md`
- `docs/reference/MARKETPLACE_STATUS_AND_TODO.md`
- `CHANGELOG.md`

**Rule**
- when implementation state changes, update the truth docs in the same change
- do not trim docs by deleting content without relocating and linking it

---

## Summary

**What is true now**
- OpenBazaar AI already has a large implemented feature surface
- The missing work is mostly stabilization, validation, and proof
- The docs should say "implemented", "partial", "beta", or "planned" precisely, not optimistically

**What needs to happen next**
- keep the test baseline green and clean up the remaining noisy setup paths
- prove the core production flows
- finish the creator-facing baseline
- then push the differentiators harder

**Bottom line**
- This repo is not early-stage vapor
- It is also not yet a fully proven production platform
- The right direction is disciplined stabilization first, then expansion
