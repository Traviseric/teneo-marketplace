# OpenBazaar AI — Roadmap

**Updated:** 2026-03-06
**Informed by:** Gemini Deep Research outputs 1-9, current implementation audit
**Supersedes:** `IMPLEMENTATION_PLAN.md`, `REVOLUTIONARY_FEATURES_ROADMAP.md`, `IMPLEMENTATION_MAP.md`
**Execution companion:** [development/AI_STORE_BUILDER_IMPLEMENTATION_CHECKLIST.md](development/AI_STORE_BUILDER_IMPLEMENTATION_CHECKLIST.md) - Concrete execution sequence for Phase 0, AI builder delivery, and managed-service commercialization

---

## Mission

**The free, open source alternative to ClickFunnels, Gumroad, Teachable, and Kajabi.** Landing pages, email marketing, courses, funnels, and digital product sales — all free, self-hostable, with an AI store builder that eliminates the grunt work.

Dual-mode payments: Stripe (fiat) + ArxMint (Lightning/ecash). Zero platform fees. Your data, your customers, your keys.

---

## What Makes This Different

Every incumbent makes you drag-and-drop elements, configure settings, and wire up email sequences manually. They charge $97-399/month for the privilege.

OpenBazaar AI's differentiator: **describe your business, get a working store.** The AI store builder generates your landing page, product listings, email capture, and checkout flow from a natural language description. No drag-and-drop. No design skills. No monthly fee.

This is what makes the project worth using over everything else — not the crypto payments, not the federation network, not the Nostr identity. Those are unique value-adds, but the AI builder is the reason someone switches.

---

## Infrastructure (Current — March 2026)

| Component | Technology | Status |
|-----------|-----------|--------|
| Runtime | Node.js 18+ / Express.js | Working |
| Database | SQLite runtime + Supabase (Postgres) target | Supabase project exists (`ncddvxglmnnfagyyupeu`), adapter still pending |
| Payments | Stripe + ArxMint Lightning | Stripe working, ArxMint provider built |
| Auth | Magic links + OAuth SSO + Nostr (backend) | Backend done, frontend partial |
| Email | Nodemailer (SMTP + Resend) | Working |
| Print/POD | Lulu API + Printful API | Lulu working; Printful order + webhook backend integrated |
| Frontend | Vanilla HTML/CSS/JS | Working |
| Deploy | Vercel (frontend + serverless API) | Live at openbazaar.ai |
| File storage | Supabase Storage (planned) | Not wired |

### Supabase Details

- **Project:** `ncddvxglmnnfagyyupeu`
- **Dashboard:** https://supabase.com/dashboard/project/ncddvxglmnnfagyyupeu
- **API URL:** `https://ncddvxglmnnfagyyupeu.supabase.co`
- **Schema:** 40+ tables — profiles, orders, courses, email marketing, funnels, analytics, print jobs, webhooks
- **Migration file:** `marketplace/backend/database/supabase-migration.sql`
- **Runtime note (March 6, 2026):** backend services still instantiate SQLite directly; Supabase adapter work remains in Phase 0
- **Note:** App users table is `profiles` (not `users` — Supabase reserves that for `auth.users`)

### Deployment

| URL | What |
|-----|------|
| `openbazaar.ai/` | Landing page (`openbazaar-site/`) |
| `openbazaar.ai/store/` | Marketplace app (`marketplace/frontend/`) |
| `openbazaar.ai/api/*` | Express backend (serverless on Vercel) |
| `openbazaar.ai/api/storefront/catalog` | Standardized product catalog for external consumers |

Vercel project: `openbazaar-site` (connected to `github.com/Traviseric/openbazaar-ai`, root directory)

---

## What's Built (Inventory)

### Working (27+ routes, 30+ services, 17 test suites passing)

- [x] Express.js backend with SQLite runtime and Supabase migration assets prepared
- [x] Stripe payment integration (checkout, production checkout, mixed checkout, webhooks, refunds)
- [x] Crypto checkout endpoints (Bitcoin/Lightning/Monero — manual verification)
- [x] Auth abstraction layer (local magic links + Teneo Auth OAuth 2.0 + PKCE + Nostr backend)
- [x] Email service (SMTP + Resend, order confirmations, magic links)
- [x] Email marketing (sequences, segmentation, engagement tracking, cart recovery emails)
- [x] Admin dashboard (orders, analytics, refunds, audit logging)
- [x] Multi-brand catalog and theming (9 brands configured)
- [x] Course platform (CRUD, enrollment, quizzes, certificates, progress tracking)
- [x] Funnel builder module (4 templates, save/load/deploy)
- [x] AI discovery engine (semantic search via OpenAI + keyword fallback)
- [x] Print-on-demand (Lulu + Printful provider integration wired into storefront fulfillment)
- [x] Publisher features (Amazon book tracking, leaderboards, badges, digests)
- [x] Component library (12/50 — heroes, CTAs, base system)
- [x] Network/federation registry and cross-node search (RSA-signed)
- [x] Secure download system with token validation and rate limiting
- [x] Rate limiting, CSRF protection, Helmet headers, session management
- [x] Storefront API (`/api/storefront/catalog`, `/api/storefront/checkout`, `/api/storefront/fulfill`)
- [x] Printful webhook endpoint (`/api/webhooks/printful`) with signature verification and idempotent event logging
- [x] Payment provider interface + ArxMint provider (redirect to arxmint.com/pay)
- [x] Landing page with Persian bazaar design system (Cinzel, gold/teal/lapis palette)
- [x] Vercel deployment config (landing page + store + API routing)

### Needs Wiring

- [ ] **Database adapter** — backend still imports SQLite; needs Supabase client wrapper
- [ ] Frontend auth UI (backend done, login/register pages exist but not unified)
- [ ] Course checkout flow (components exist, not integrated into marketplace checkout)
- [ ] Email service production config (code done, needs SMTP credentials on Vercel)
- [ ] Printful production wiring (set `PRINTFUL_*` env vars, register webhook, validate first live POD order)
- [ ] Lulu production wiring (set `LULU_*` env vars, verify webhook signature config, validate first live print order)
- [ ] Unified design system across 33 HTML pages (each has different styling)
- [ ] Federation revenue sharing (schema exists, not wired to checkout flow)

### Not Built

- [ ] **AI Store Builder** (the differentiator — Phase 1)
- [ ] Checkout conversion stack (coupons, bumps, upsells, cart recovery)
- [ ] Content protection (PDF stamping, watermarks, license keys)
- [ ] Affiliate program
- [ ] Gig platform (0% built — jobs, proposals, contracts, escrow)
- [ ] Agent marketplace (scaffold only — no L402 payments)
- [ ] ArxMint L402/Cashu deep integration (provider redirect works, L402 paywalls stubbed)
- [ ] Nostr auth frontend (backend provider exists)
- [ ] Federated discovery via Nostr (NIP-99)
- [ ] Migration tooling (import from Gumroad/Teachable)
- [ ] Tax calculation/workflow
- [ ] Managed hosting infrastructure

---

## Phase 0: Make It Work (Current)

**Goal:** The deployed site at openbazaar.ai actually functions end-to-end. A visitor can browse, sign up, and buy something.

**Why first:** Nothing else matters if the production site is broken. Right now the backend still uses SQLite imports, which fail on Vercel's read-only filesystem.

### Tasks

- [ ] **Build Supabase database adapter** — replace SQLite `db.run`/`db.get`/`db.all` calls with Supabase client (`@supabase/supabase-js`). The adapter should:
  - Export the same interface (`run`, `get`, `all`) so existing services don't need rewriting
  - Use `SUPABASE_SERVICE_ROLE_KEY` for server-side operations
  - Fall back to SQLite if `SUPABASE_URL` not set (local dev)
  - Map `profiles` table to where code references `users`
- [ ] **Add Supabase env vars to Vercel** — `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] **Verify landing page loads** at openbazaar.ai/
- [ ] **Verify API responds** at openbazaar.ai/api/storefront/catalog
- [ ] **Wire login flow** — login.html and account-dashboard.html work with auth backend
- [ ] **Test purchase flow** — Stripe test checkout → order created in Supabase → download delivered
- [ ] **Test POD purchase flow** — storefront checkout → `/api/storefront/fulfill` → Printful order created → webhook updates order status/tracking
- [ ] **Unify nav links** — landing page CTAs ("Start Selling", "Browse Marketplace") go to working pages

### Success Criteria

- openbazaar.ai/ loads the designed landing page
- openbazaar.ai/api/health returns 200
- A test user can sign up, browse products, and complete a Stripe test purchase
- Order appears in Supabase `orders` table
- A POD test order reaches `pod_submitted` and receives shipping/tracking updates via webhook

---

## Phase 1: AI Store Builder (The Differentiator)

**Goal:** "Describe your business" → get a working store with landing page, product listings, email capture, and checkout.

**Why this is Phase 1:** This is the feature that gets GitHub stars, press, and users. Every other feature (courses, email, funnels) already exists in some form — the AI builder is what makes OpenBazaar AI worth choosing over cloning a WordPress theme.

**The research said "AI features are NOT a differentiator."** That's true for bolt-on AI (Teachable's AI quiz generator, Kajabi's AI copywriter). Those are features. The AI store builder is the **product** — it replaces the entire setup process. That's different.

### How It Works

```
Creator: "I sell handmade soy candles. $18-35 range.
          I have 6 scents. I want email capture and a
          buy button that goes to Stripe."

AI Builder:
  1. Generates landing page using component library templates
  2. Creates product catalog (6 products with placeholder images)
  3. Sets up email capture form → subscriber added to Supabase
  4. Wires Stripe checkout for each product
  5. Deploys to openbazaar.ai/store/{slug} or custom domain

Creator gets: a working store in 60 seconds
```

### Tasks

- [ ] **Store configuration schema** — what the AI generates:
  - Store name, tagline, description
  - Color palette and font selections (from design system presets)
  - Product list (title, description, price, image placeholder, fulfillment type)
  - POD metadata (provider, variant/product IDs, shipping requirements) for physical goods
  - Email capture enabled/disabled
  - Payment provider (Stripe / ArxMint / both)
- [ ] **AI prompt pipeline** — takes natural language input, outputs store config JSON:
  - Claude API call with structured output (JSON mode)
  - Validates against schema
  - Handles edge cases ("I want to sell courses" → enables course module)
- [ ] **Store renderer** — takes config JSON, generates static store pages:
  - Uses existing component library (heroes, CTAs, product cards)
  - Injects brand colors, fonts, content
  - Generates index.html, products.html, checkout integration
- [ ] **Store persistence** — save generated store to Supabase:
  - `stores` table (owner, config, slug, status)
  - Products saved to `products` table
  - Email capture wired to `subscribers` table
- [ ] **Store editing** — natural language updates:
  - "Change the hero text to 'Luxury Candles for Your Home'"
  - "Add a new product: Lavender Fields, $24"
  - "Enable the course module"
- [ ] **Store preview and publish** — preview before going live, one-click publish

### What Already Exists (Reuse)

| Component | Location | Reuse |
|-----------|----------|-------|
| Component library | `marketplace/frontend/components-library/` | 12 components ready |
| Funnel templates | `funnel-module/` | 4 landing page templates |
| Brand theming | `marketplace/frontend/brands/` | Config + catalog JSON pattern |
| Checkout | `marketplace/backend/routes/checkout.js` | Stripe integration |
| Email capture | `marketplace/backend/routes/emailMarketing.js` | Subscriber management |
| Course platform | `marketplace/backend/routes/courses.js` | Full CRUD |

### Success Criteria

- A user describes their business in plain English → gets a working store page
- Store has: landing page, product listings, email capture, checkout
- Store is live at a URL and can process a test payment
- User can update the store with natural language commands

---

## Phase 2: Creator Toolkit (The Kajabi Killer Features)

**Goal:** Funnels, email marketing, courses, and checkout conversion features that work end-to-end — the stuff people currently pay $99-399/month for.

**Why after AI builder:** The builder gets people in the door. This phase keeps them. These are the features that make creators say "I can cancel my Kajabi subscription."

### 2.1 Funnels That Work

The funnel builder module exists (4 templates) but isn't integrated into the live site.

- [ ] Wire funnel builder to Supabase (save/load funnels)
- [ ] Landing page → email capture → email sequence → sale pipeline
- [ ] Funnel analytics (views, conversions, revenue per funnel)
- [ ] AI funnel builder integration ("build me a webinar funnel for my course")

### 2.2 Email Marketing That Works

Email marketing backend is built (sequences, segmentation, broadcasts, engagement tracking). Needs production wiring.

- [ ] Wire email marketing routes to Supabase
- [ ] Configure SMTP for production (Resend or SendGrid on Vercel)
- [ ] Email sequence builder UI (create/edit sequences, preview emails)
- [ ] Broadcast sending UI (select segment, compose, schedule, send)
- [ ] Analytics dashboard (open rates, click rates, engagement scores)

### 2.3 Course Platform That Works

Course backend is built (CRUD, enrollment, quizzes, certificates, progress tracking). Needs checkout integration.

- [ ] Wire course routes to Supabase
- [ ] Course → Stripe checkout → enrollment flow
- [ ] Course player UI improvements (the player exists but needs polish)
- [ ] AI course builder ("create a 5-module course on candle making")

### 2.4 Checkout Conversion Stack

These features don't exist yet. Research #3 says they BLOCK switching — creators doing $10k/mo won't move without them.

- [ ] **Coupons** — percentage/fixed discounts, expiry dates, usage limits, analytics
- [ ] **Order bumps** — "add this for $X" on checkout page, per-product config
- [ ] **Post-purchase upsells** — one-click purchase after payment, upsell sequences
- [ ] **Cart abandonment recovery** — track abandoned carts, automated email sequences (1h, 24h, 72h)

### 2.5 Content Protection

- [ ] PDF stamping (buyer email/name watermarked on download)
- [ ] License key generation and validation
- [ ] File versioning (update products, buyers get latest)

### 2.6 Physical & POD Operations

- [ ] Printful catalog/variant sync so merchants can choose valid `variant_id`s in UI
- [ ] Shipping rate estimation wiring in checkout for physical/POD products
- [ ] Merchant UI for mapping products to fulfillment providers and variants
- [ ] Fulfillment status dashboard (submitted, in production, shipped, failed/canceled)

### Success Criteria

- A creator can build a funnel: landing page → email capture → sequence → sale
- Email sequences send automatically on triggers (signup, purchase, cart abandonment)
- Courses can be purchased and consumed end-to-end
- Coupons and order bumps work on checkout

---

## Phase 3: Payments & Identity

**Goal:** Ship the features no incumbent offers — dual Stripe + Lightning checkout, Nostr identity, and ArxMint integration.

**Why after Phase 2:** Research #3 — "The platform's crypto/Nostr differentiators should come AFTER the switching baseline is met." Creators won't switch for crypto alone.

### 3.1 ArxMint Payment Integration

Provider built (`services/arxmintProvider.js`), storefront API built (`routes/storefront.js`). Needs:

- [ ] **Dual checkout UI** — Stripe (fiat) + ArxMint (crypto) as parallel options on one checkout page
- [ ] **BIP21 unified QR** — on-chain URI with `lightning=` BOLT11 for frictionless crypto checkout
- [ ] **Payment-agnostic order state machine** — `pending → confirmed → fulfilled → delivered`; order doesn't care how it was paid
- [ ] **ArxMint Bazaar integration** — arxmint.com/bazaar fetches from openbazaar.ai/api/storefront/catalog
- [ ] **ArxMint fulfillment webhook** — ArxMint POSTs to `/api/storefront/fulfill` after payment (Printful webhook pattern is already implemented at `/api/webhooks/printful`)
- [ ] **Zap-to-unlock** — NIP-57 zap → content unlocked for items < $5 (no cart needed)

### 3.2 Nostr Authentication

Backend provider exists. Needs frontend.

- [ ] NIP-07 `window.nostr` integration (sign in with Alby, nos2x)
- [ ] NIP-98 HTTP auth for API requests
- [ ] NIP-05 DNS verification for merchant credibility
- [ ] Portable identity — creator's audience follows their keypair, not the platform

### 3.3 L402 Paywalls

- [ ] HTTP 402 response with macaroon + Lightning invoice
- [ ] Pay-per-article, pay-per-lesson, pay-per-API-call
- [ ] Machine-payable endpoints (AI agents can pay autonomously)

### 3.4 Dispute Resolution

- [ ] Three-mode checkout: instant-final (Lightning), escrowed (Cashu P2PK), card (Stripe)
- [ ] Split settlement: 80-90% instant, 10-20% escrowed with locktime auto-release
- [ ] Signed purchase receipts as Nostr events
- [ ] Receipt-referenced reviews (only verified buyers can review)

---

## Phase 4: Network & Scale

**Goal:** Federated marketplace — independent stores that discover each other, share audiences, and transact in a circular economy.

### 4.1 Federation

- [ ] NIP-99 product listings (kind 30402) replace JSON registry
- [ ] Centralized discovery index first → multiple competing indexes later
- [ ] Cross-store referral system (15-20% for new customers, 0-5% repeat)
- [ ] Revenue sharing wired to checkout flow

### 4.2 Migration Tooling

- [ ] Gumroad product import (CSV + API)
- [ ] Teachable course import
- [ ] Email list import (CSV)
- [ ] "Switch from [Competitor]" comparison pages for SEO

### 4.3 Managed Hosting (Revenue)

Research #2: managed hosting is the proven revenue stream for open source (Ghost model: $9.89M ARR).

| Tier | Price | Competes with |
|------|-------|---------------|
| Starter | $29/mo | Below Podia ($89), above Ghost ($18) |
| Creator | $79/mo | Matches Podia ($89), below Teachable Pro |
| Pro | $149/mo | Below Kajabi Basic ($179) |

### 4.4 Cold-Start: Teneo Production Funnel

```
Ads → teneo.io ($49-599/mo book generation)
  → Generate books + brands for customers
  → Customer publishes on Amazon
  → One-click import from Amazon → deploy own storefront
  → Store auto-joins discovery network
  → Network grows
```

### 4.5 Memberships & Subscriptions

- [ ] Recurring payments (monthly/annual)
- [ ] Membership tiers with content gating
- [ ] Subscriber management dashboard

---

## Phase 5: Polish & Ecosystem

- Premium themes marketplace ($79-149 each, 30% platform share)
- PWA with push notifications
- Public REST API (documented, versioned)
- Zapier triggers/actions
- Community features (Nostr-aligned)
- Network intelligence (transformation-based ranking, community validation)

---

## Revenue Roadmap

| Stream | Revenue | Phase | Priority |
|--------|---------|-------|----------|
| Managed hosting ($29-149/mo) | 100 customers at $79/mo = $7,900 MRR | Phase 4 | FIRST |
| Paid onboarding ($299/setup) | 10 setups/mo = $2,990/mo | Phase 2 | BRIDGE |
| Crypto processing fee (0.75%) | $200k/mo GMV = $1,500/mo | Phase 3 | SECOND |
| Premium themes ($79-149) | 50 sales/mo at 20% share = $990/mo | Phase 5 | THIRD |
| Network referrals (10-20%) | Grows with network | Phase 4+ | GROWS |

---

## What's NOT on the Roadmap

| Removed | Why |
|---------|-----|
| Proof-of-Read NFTs | No proven demand |
| IPFS hosting / ENS domains | Not aligned with Lightning/Nostr direction |
| Monero payments | Focus on Bitcoin/Lightning/ecash via ArxMint |
| PayPal integration | ArxMint covers crypto; Stripe covers fiat |
| DAO governance | Nostr identity handles "no platform owns your account" |
| Being a Merchant of Record | Hardest moat to replicate — don't try. Tax as workflow, not MoR |

---

## Architecture Decisions (Locked)

| Decision | Answer | Source |
|----------|--------|--------|
| Database | Supabase Postgres (project `ncddvxglmnnfagyyupeu`) | Infrastructure decision |
| Deploy | Vercel (serverless API + static frontend) | Infrastructure decision |
| App users table | `profiles` (not `users` — Supabase reserves that) | Supabase convention |
| Listing format | NIP-99 (kind 30402) for federation | Research #6 |
| Identity | NIP-07 (browser), NIP-98 (HTTP), NIP-05 (DNS) | Research #6 |
| Discovery | Centralized index first → multiple indexes later | Research #6 |
| Settlement | Lightning for network; ecash for local micro-splits | Research #6 |
| Messaging | "Own your audience + $0 fees" above fold; crypto below fold | Research #5 |
| Competitor wedge | "Gumroad alternative" (fastest demo path) | Research #5 |
| Checkout UX | BIP21 unified QR; crypto as parallel tender, not separate flow | Research #4 |
| Order model | Payment-method-agnostic state machine | Research #4 |
| Micro-content | Zap-to-unlock for items <$5; structured checkout otherwise | Research #4 |
| Refunds | BTCPay Pull Payments + LNURL-withdraw; Cashu for store credit | Research #4, #7 |
| Checkout modes | Three-mode: instant-final, escrowed (Cashu P2PK), card (Stripe) | Research #7 |
| Escrow | Cashu 2-of-3 P2PK multisig; 80-90% instant, 10-20% held | Research #7 |
| Mint compliance | Path B (licensed partner); no privacy/anonymity marketing | Research #8 |
| Revenue first | Managed hosting subscriptions ($29-149/mo) | Research #2 |
| Tax strategy | Tax workflow (calculation + export), NOT Merchant of Record | Research #3 |

---

## Target Segments

### Tier 1 (Strongest evidence)
1. **Adult/NSFW creators** — most documented deplatforming
2. **International creators** — blocked by Stripe's country limits

### Tier 2 (Crypto-native fit)
3. **Digital goods creators** — leading crypto adoption category
4. **Nostr communities** — high-conviction early adopters

### Tier 3 (Careful framing)
5. **Regulated/restricted commerce** — cannabis education, alt health, firearms content

---

## Go-To-Market

1. **Primary message:** "Own your audience. Own your platform."
2. **Secondary:** "$0 platform fees"
3. **Segment wedge:** "Sell without deplatforming risk"
4. **Competitor wedge:** "Gumroad alternative" (fastest demo path)

### 90-Day Targets
- 50 activated creators (store live + email capture + test purchase)
- 10 creators processing real transactions weekly
- AI store builder generating functional stores from descriptions

---

## Cautionary Tales

- **OpenBazaar (original)** — fully decentralized, discontinued. "No fees + meaningful infra costs" is not sustainable.
- **Shopstr / Plebeian Market** — Nostr-native marketplaces with minimal traction. Protocol-native doesn't sell; UX sells.
- **Bitcoin creator economy is tiny** — ~$65K/mo total. Stripe fiat must remain first-class alongside crypto.
- **Tornado Cash / Samourai** — enforcement triggered by privacy marketing. Don't lead with "anonymity."

---

## Research Status

All 9 Gemini Deep Research prompts complete. Findings integrated into this roadmap.

| # | Topic | Key Impact |
|---|-------|-----------|
| 1 | Product-Market Fit | TAM $11.57B; 5 early-adopter segments |
| 2 | Monetization | Managed hosting first; Ghost model |
| 3 | Feature Gaps | Checkout conversion stack blocks switching |
| 4 | Crypto Payments UX | BIP21 unified QR; payment-agnostic orders |
| 5 | Positioning & GTM | "Own your audience + $0 fees" messaging |
| 6 | Federated Network | NIP-99; centralized index first; two-rate referral |
| 7 | Dispute Resolution | Three-mode checkout; Cashu P2PK escrow |
| 8 | Regulatory | Ecash mint = money transmitter; Path B for pilot |
| 9 | Bitcoin Creator Ecosystem | ~$65K/mo market; manufacture liquidity |
