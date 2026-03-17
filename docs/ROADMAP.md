# OpenBazaar AI - Roadmap

**Updated:** 2026-03-13
**Informed by:** Gemini Deep Research outputs 1-9, current implementation audit, current test and route inventory
**Supersedes:** `IMPLEMENTATION_PLAN.md`, `REVOLUTIONARY_FEATURES_ROADMAP.md`, `IMPLEMENTATION_MAP.md`
**Execution companion:** [development/AI_STORE_BUILDER_IMPLEMENTATION_CHECKLIST.md](development/AI_STORE_BUILDER_IMPLEMENTATION_CHECKLIST.md)

---

## Mission

**The free, open source alternative to ClickFunnels, Gumroad, Teachable, and Kajabi.** Landing pages, email marketing, courses, funnels, subscriptions, and digital product sales, with an AI store builder meant to remove the grunt work.

Dual-mode payments: Stripe (fiat) + ArxMint-oriented crypto flows. Zero platform fees. Your data, your customers, your keys.

---

## What Makes This Different

Every incumbent makes users drag-and-drop elements, configure settings, and wire up email sequences manually.

OpenBazaar AI's differentiator is still: **describe your business, get a working store.** That remains the strongest product wedge. The crypto, federation, and Nostr layers matter, but they are not allowed to outrank platform stability or baseline creator usability.

---

## Roadmap Operating Model

This roadmap now follows the `BEST_PRACTICES.md` direction more explicitly.

### Status Model

- **Working** = implemented in code and usable now
- **Partial** = implemented in code but not yet production-proven
- **Planned** = not yet implemented
- **Blocked** = cannot reasonably ship until a dependency or proof gate closes

### Gate Model

No later phase should outrun Phase 0. If the verification baseline is red, new feature expansion is secondary.

### Evidence Model

A roadmap item should move forward only when supported by one or more of:

- automated tests
- route/service/schema existence
- live environment proof
- operator runbook proof

---

## Infrastructure (Current - March 2026)

| Component | Technology | Status |
|-----------|-----------|--------|
| Runtime | Node.js 18+ / Express.js | Working |
| Database | SQLite + Supabase/Postgres runtime adapter | Partial - adapter shipped, full production proof still needed |
| Payments | Stripe + ArxMint-oriented crypto paths | Partial - Stripe working, ArxMint deeper flow still partial |
| Auth | Magic links + OAuth SSO + Nostr backend surfaces | Partial - backend strong, frontend journey incomplete |
| Email | Nodemailer (SMTP + Resend) | Partial - code present, production delivery still needs proof |
| Print/POD | Lulu API + Printful API | Partial - provider surfaces present, live production validation still needed |
| Frontend | Vanilla HTML/CSS/JS | Working |
| Deploy | Vercel + container/self-host options | Partial - deployment exists, key flows still need live proof |
| File storage | Supabase Storage | Planned |

### Supabase Details

- **Project:** `ncddvxglmnnfagyyupeu`
- **Dashboard:** https://supabase.com/dashboard/project/ncddvxglmnnfagyyupeu
- **API URL:** `https://ncddvxglmnnfagyyupeu.supabase.co`
- **Migration file:** `marketplace/backend/database/supabase-migration.sql`
- **Runtime note:** backend adapter supports SQLite fallback plus `DATABASE_URL` / `SUPABASE_DB_URL`
- **Note:** app users table is `profiles`, not `users`

### Deployment

| URL | What |
|-----|------|
| `openbazaar.ai/` | Landing page (`openbazaar-site/`) |
| `openbazaar.ai/store/` | Marketplace app (`marketplace/frontend/`) |
| `openbazaar.ai/api/*` | Express backend |
| `openbazaar.ai/api/storefront/catalog` | Product catalog for external consumers |

---

## Current Verification Baseline

- Route files in `marketplace/backend/routes/`: `42`
- Service files in `marketplace/backend/services/`: `51`
- Test suites in repo: `40`
- Active brand catalogs: `6`

Latest local verification:

- Command: `npm test -- --runInBand`
- Result: `40` passing suites, `0` failing suites
- Totals: `517` passing, `0` failing, `2` skipped

Implication:

- the codebase is broad and real
- the verification baseline is green
- Phase 0 now centers on production proof and cleanup, not red-suite recovery

---

## What's Built (Inventory)

### Working

- [x] Express backend with security middleware, CSRF/session handling, health endpoints
- [x] Stripe payment integration (checkout, mixed checkout, webhooks, refunds)
- [x] Crypto checkout endpoints (Bitcoin/Lightning/Monero manual flow)
- [x] Auth abstraction layer (magic links, Teneo Auth OAuth 2.0 + PKCE, Nostr backend surfaces)
- [x] Email service code (SMTP + Resend support)
- [x] Admin dashboard and audit logging surfaces
- [x] Multi-brand catalog and theming pattern
- [x] Course backend routes and quiz routes
- [x] Funnel module
- [x] AI discovery engine
- [x] Publisher analytics features
- [x] Secure download system with token validation and rate limiting
- [x] Storefront API (`/api/storefront/catalog`, `/api/storefront/checkout`, `/api/storefront/fulfill`)
- [x] Printful webhook endpoint with signature verification and idempotent event logging
- [x] AI store-builder route surface (`generate`, `render`, `save`, `preview`, `publish`, `intake`, build tracking)
- [x] Store product checkout endpoint (`POST /api/checkout/store-product`) with server-side price lookup
- [x] Creator dashboard (`/creator-dashboard.html`) — create/manage stores, courses, funnels from one UI
- [x] Course/funnel generation open to authenticated users (not admin-only)
- [x] Funnel email sequence wiring (email_templates + sequence_emails persisted on generate-and-save)
- [x] Referral routes plus checkout commission tracking
- [x] Subscription routes and membership schema
- [x] Hosting tier billing routes
- [x] Machine-payable endpoints
- [x] Agent-facing catalog, quote, purchase, and order-status endpoints

### Partial / Needs Validation

- [ ] Supabase production validation across checkout, auth, subscriptions, and fulfillment
- [ ] Frontend auth/account flow unification
- [ ] Course checkout flow fully proven
- [ ] Email delivery in production
- [ ] Printful live production order validation
- [ ] Lulu live production order validation
- [ ] Unified design system across the broader HTML surface
- [ ] AI store-builder managed delivery proof loop
- [ ] ArxMint deeper Lightning/Cashu/L402 validation
- [ ] Referral payout economics proven in live checkout, not just wired in code
- [ ] Hosting provisioning and operations beyond billing checkout
- [ ] Creator dashboard end-to-end proof on production (store/course/funnel create → publish → purchase)
- [ ] Store product checkout proven with real Stripe payment on a published AI-generated store
- [ ] Email sequence delivery proven after funnel generate-and-save

### Planned / Not Built Yet

- [ ] Checkout conversion stack (coupons, bumps, upsells, cart recovery) finished end-to-end
- [ ] Content protection (PDF stamping, watermarks, file versioning) finished end-to-end
- [ ] Affiliate program
- [ ] Gig platform (jobs, proposals, contracts, escrow)
- [ ] Full agent marketplace product
- [ ] Nostr frontend auth UX
- [ ] Federated discovery via NIP-99
- [ ] Migration tooling (Gumroad/Teachable/import bridge)
- [ ] Tax calculation and workflow
- [ ] Full managed hosting operating system

---

## Phase 0: Stabilize What Already Exists (Current Gate)

**Goal:** The deployed site works end-to-end, the verification baseline is green, and the docs can make strong claims without hand-waving.

### Why first

Nothing else matters if the production site is broken or the verification baseline is unreliable.

### Tasks

- [x] Fix the failing Jest suites and re-run `npm test -- --runInBand` until green
- [x] Resolve Jest `axios` compatibility and stale test-reference issues
- [ ] Reduce noisy database initialization and schema-migration logging during tests
- [ ] Review whether database bootstrapping should be quieter or more isolated in test mode
- [ ] Validate landing page and API on production
- [ ] Validate the Postgres/Supabase runtime path end-to-end
- [ ] Prove one real Stripe digital purchase on the deployed stack
- [ ] Prove one real POD purchase on the deployed stack
- [ ] Finish the public auth/account flow
- [ ] Verify production email delivery
- [ ] Unify main nav links so they point only to supported flows

### Success Criteria

- full test suite green
- test output reasonably clean and not dominated by avoidable schema warnings
- `openbazaar.ai/api/health` returns 200
- a test user can sign up and complete a Stripe purchase
- one POD order is proven on the live stack
- docs can honestly say the core purchase flow is proven

---

## Phase 1: Creator Baseline

**Goal:** Make OpenBazaar AI feel coherent to a creator using the platform, not just to a developer reading the codebase.

### 1.1 Auth and Account Flow

- [ ] Finish login, account, and subscription-management UX
- [ ] Confirm session state and account pages work reliably
- [ ] Remove dead or misleading auth entry points

### 1.2 Email and Lifecycle Flows

- [ ] Validate production email marketing and transactional mail
- [ ] Harden sequence and tracking behavior
- [ ] Prove cart, signup, and purchase-triggered messaging where already implemented

### 1.3 Courses, Funnels, and Store Management

- [x] Creator dashboard for store/course/funnel creation and management (`/creator-dashboard.html`)
- [x] Store product checkout endpoint with webhook fulfillment
- [x] Course and funnel generation open to regular authenticated users
- [x] Funnel email sequences persisted to email_templates + sequence_emails on generate
- [x] Store renderer produces live checkout buttons (not dead links)
- [x] Nav wiring: account dashboard links to creator dashboard
- [ ] Prove course purchase-to-enrollment flow on production
- [ ] Prove funnel save/load/deploy flow on production
- [ ] Prove store product checkout with real Stripe payment on a published store
- [ ] Product editing UI (price, description, type changes without regenerating)
- [ ] Store subscriber list visible in creator dashboard

### 1.4 Fulfillment Operations

- [ ] Finish fulfillment-provider admin UX
- [ ] Validate real provider mappings and status tracking

### Success Criteria

- a creator can sign in, buy, subscribe, and manage key flows without undocumented manual intervention

---

## Phase 2: AI Store Builder From Beta To Reliable Product

**Goal:** Turn the existing builder beta and managed intake flow into a repeatable, evidence-backed delivery engine.

### Already exists

- `store_builds` schema
- intake endpoint
- generate/render/save/preview/publish surface
- operator guide
- managed build status model

### Remaining work

- [ ] prove repeated successful managed builds
- [ ] tighten schema validation for generated configs
- [ ] improve natural-language edit reliability
- [ ] capture delivery artifacts and QA evidence for every run
- [ ] create case studies from successful builds
- [ ] keep managed delivery ahead of self-serve ambition

### Success Criteria

- multiple successful internal or paid builds
- documented operator workflow with evidence
- clear boundary between beta self-serve and managed delivery

---

## Phase 3: Payments, Identity, and Agent Differentiators

**Goal:** Finish the unique surfaces that no incumbent ships well, but only after baseline stability is real.

### 3.1 ArxMint Payment Integration

- [ ] Dual checkout UX
- [ ] BIP21 unified QR
- [ ] Payment-agnostic order state machine fully proven across methods
- [ ] ArxMint Bazaar integration proof
- [ ] ArxMint fulfillment webhook proof
- [ ] Zap-to-unlock proof for low-priced content

### 3.2 Nostr Authentication

- [ ] NIP-07 browser integration
- [ ] NIP-98 API flow hardening
- [ ] NIP-05 merchant credibility flow

### 3.3 L402 and Machine-Payable Commerce

- [ ] Harden L402 paywall behavior
- [ ] Document machine-payable order flows
- [ ] Prove at least one real machine or agent purchase path

### 3.4 Dispute and Refund Direction

- [ ] Define the first shippable dispute mode
- [ ] Keep receipts and refunds realistic before multi-party escrow ambition

---

## Phase 4: Network, Migration, and Distribution

**Goal:** Grow the platform through discovery and migration only after the core commerce loop is trustworthy.

### 4.1 Federation

- [ ] NIP-99 product listing migration path
- [ ] Discovery index evolution
- [x] Referral capture and commission tracking wired in code
- [ ] Validate live referral economics and payout behavior

### 4.2 Migration Tooling

- [ ] Gumroad product import
- [ ] Teachable course import
- [ ] Email list import
- [ ] Amazon/KDP-to-storefront bridge

### 4.3 Managed Hosting

- [x] Hosting tier billing routes and tier config
- [ ] Provisioning, activation, suspension, and operator workflows beyond billing
- [ ] Revenue and operations model proof

### 4.4 Memberships and Subscriptions

- [x] Membership tiers, subscription schema, webhook support, admin endpoints
- [ ] Better UI, gating proof, and customer self-service polish

---

## Phase 5: Scale and Polish

- Premium themes marketplace
- PWA and push behavior
- Public API polish and versioning
- Integrations and automation
- Ranking and discovery refinement
- Community-facing features after baseline stability

---

## Revenue Roadmap

| Stream | Revenue | Phase | Priority |
|--------|---------|-------|----------|
| Managed hosting ($29-149/mo) | Recurring revenue | Phase 4 | First durable platform revenue |
| Paid onboarding / managed builds | Service revenue | Phase 2 | Bridge revenue |
| Crypto processing fee | Transaction revenue | Phase 3 | Secondary |
| Premium themes | Marketplace revenue | Phase 5 | Later |
| Network referrals | Grows with network | Phase 4+ | Long-term |

---

## What's NOT on the Roadmap

| Removed | Why |
|---------|-----|
| Proof-of-Read NFTs as a primary strategy | No proven demand |
| IPFS hosting / ENS domains as a priority | Not aligned with the current execution order |
| DAO governance | Not helpful at this stage |
| Merchant of Record ambitions | Tax workflow is more realistic |

---

## Architecture Decisions (Locked)

| Decision | Answer |
|----------|--------|
| Database direction | Supabase Postgres with SQLite fallback for local/dev compatibility |
| Deploy direction | Vercel plus self-host/container support |
| App users table | `profiles` |
| Messaging | "Own your audience" and creator economics first |
| Checkout strategy | payment-method-agnostic order handling |
| Revenue-first posture | managed hosting + managed delivery before speculative decentralization |

---

## Best-Practice Alignment Notes

This roadmap now acts as the canonical phased plan for the repo and is meant to satisfy the roadmap portion of `C:\code\.claude\BEST_PRACTICES.md`.

Aligned now:

- canonical roadmap exists
- phases are gated
- current state and next steps are explicit
- evidence model is stated
- roadmap is tied to a changelog and canonical status doc

Still requiring repo work, not just doc work:

- test baseline must stay green and cleaner than it is now
- production proof must exist for the major commerce flows
- docs and runtime behavior must stay aligned continuously

---

## Immediate Next 7 Tasks

1. **Prove store product checkout end-to-end**: deploy, create a store via creator dashboard, publish it, complete a real Stripe purchase at `/store/{slug}`.
2. **Prove funnel email sequence delivery**: generate-and-save a funnel, subscribe to it, verify email_templates and sequence_emails records exist, trigger at least one email send.
3. **Product editing UI**: add inline edit for product name/price/description in the creator dashboard (currently requires regeneration).
4. **Store subscriber visibility**: show captured subscribers in creator dashboard for each store.
5. **Validate Postgres/Supabase runtime path** with the new store/course/funnel flows (not just legacy checkout).
6. **Prove course purchase-to-enrollment** on a published course created via creator dashboard.
7. **Clean up noisy DB initialization** and schema-drift logging in test mode.

---

## Supporting Docs

- [Current project status](./reference/MARKETPLACE_STATUS_AND_TODO.md)
- [Docs index](./README.md)
- [Operator guide](./OPERATOR_GUIDE.md)
- [AI builder checklist](./development/AI_STORE_BUILDER_IMPLEMENTATION_CHECKLIST.md)
- [Self-serve store + funnel beta checklist](./development/SELF_SERVE_STORE_FUNNEL_BETA_CHECKLIST.md)
- [Changelog](../CHANGELOG.md)

---

## Sovereign Stack Integration (SPINE Items)

> **Source:** [SOVEREIGN_STACK_ROADMAP.md](../../.claude/guides/reference/SOVEREIGN_STACK_ROADMAP.md) — maps TE Code to a 7-layer sovereign institutional stack. OpenBazaar-AI is **Layer 4: Market Interfaces** — how buyers and sellers find each other without platform captivity.

### SPINE-OBZ-01: General Marketplace Listings [P1]

**Status:** planned
**Depends on:** SPINE-AUTH-01 (seller orgs from teneo-auth)
**Unlocks:** Local business marketplace, creator economy, service exchange

Expand listing schema beyond books to support all commerce types:
- [ ] Polymorphic listing model with types: `product`, `service`, `digital`, `course`, `subscription`
- [ ] Shared fields: title, description, price, media[], category, seller_org_id, availability, fulfillment_method
- [ ] Product-specific: inventory, shipping, variants
- [ ] Service-specific: duration, booking_url (→ WorkforceOS), availability
- [ ] Digital-specific: file delivery (existing download token system)
- [ ] Course-specific: already built — generalize from current course module
- [ ] Creator dashboard supports all listing types

**Why:** The marketplace layer cannot serve the sovereign stack if it only sells books. Local businesses need to list services. Creators need to sell courses and digital products. The spine positions OpenBazaar-AI as the discovery/trade layer for the entire ecosystem.

### SPINE-OBZ-02: Order Lifecycle [P1]

**Status:** planned
**Depends on:** SPINE-OBZ-01, SPINE-ARX-02 (escrow from arxmint)
**Unlocks:** Full marketplace transactions, service marketplace, local commerce

Full transaction flow for non-book listings:
- [ ] Order states: `quote` → `order` → `payment` → `fulfillment` → `delivery` → `review`
- [ ] Payment routing: arxmint (BTC/Lightning/Cashu) or Stripe (fiat) — buyer chooses
- [ ] Fulfillment routing by type:
  - Digital: instant download (existing system)
  - Physical: shipping tracking
  - Service: creates WorkforceOS booking
- [ ] Delivery confirmation trigger
- [ ] Post-completion review/rating (→ aibridge reputation)
- [ ] Order event webhooks (→ FinForensics for bookkeeping)

**Why:** Books are download-and-done. Services and physical goods need a multi-step transaction lifecycle. This is the "order" primitive from the spine's Layer 4.

### SPINE-OBZ-03: Wire Reputation [P2]

**Status:** planned
**Depends on:** SPINE-OBZ-02 (need transactions to score)
**Unlocks:** Portable trust, decentralized marketplace credibility

Display and feed aibridge reputation scores:
- [ ] Fetch seller reputation from aibridge `/api/reputation/:agentId` on listing render
- [ ] Fetch buyer reputation for sellers to see
- [ ] Post-transaction webhook to aibridge reputation ledger for score update
- [ ] Display trust score badge on storefronts and listings
- [ ] Dispute outcomes feed negative reputation signals

**Why:** "Reputation without platform captivity." Reputation lives in aibridge (portable across the ecosystem), displayed in OpenBazaar (contextual), not locked to one platform. This is what makes decentralized trade trustworthy.

### Sovereign Stack Cross-References

| Layer | System | How OpenBazaar-AI Connects |
|-------|--------|----------------------------|
| L1 Identity | teneo-auth | Org = storefront owner, SSO login |
| L2 Value | arxmint | Payment rails (Lightning/Cashu/escrow), invoices |
| L3 Coordination | WorkforceOS | Service fulfillment via booking API |
| L4 Market | **OpenBazaar-AI** | Owns listings, orders, storefronts, discovery, federation |
| L5 Intelligence | conversos | Marketplace messaging mission |
| L5 Intelligence | aibridge | Reputation scores, transaction facts → context broker |
