# Teneo Marketplace — Roadmap

**Updated:** 2026-02-28
**Informed by:** Gemini Deep Research outputs 1-9 (product-market fit, monetization, feature gaps, crypto payments UX, positioning/GTM, federated network design, dispute resolution, regulatory compliance, Bitcoin creator ecosystem)
**Supersedes:** `IMPLEMENTATION_PLAN.md` (scope), `REVOLUTIONARY_FEATURES_ROADMAP.md` (priorities), `IMPLEMENTATION_MAP.md` (phases)

---

## Mission

**The open source creator platform with crypto payments.** Replace ClickFunnels, Gumroad, Teachable, Kajabi, and Podia with $0 platform fees, Bitcoin/Lightning/ecash payments via [ArxMint](https://github.com/Traviseric/arxmint), Nostr identity, and self-hosted sovereignty.

Part of a circular creator economy: ArxMint (payment rails) + Teneo Marketplace (storefront) + Nostr (identity) = creators sell, buyers pay with ecash, money circulates.

---

## Strategic Priorities (Research-Informed)

Research found that the biggest barrier to creator adoption is **missing checkout conversion features**, not missing crypto features. Creators won't switch to a platform that lacks coupons, order bumps, and cart recovery — regardless of how good the Lightning integration is.

### Priority ordering:

1. **Switching baseline** — Features creators must have before they'll switch from incumbents
2. **Revenue enablers** — Features that directly drive creator revenue and our monetization
3. **Crypto differentiators** — The unique value prop, built on a solid switching foundation
4. **Network effects** — Federation, discovery, circular economy at scale

### Key research findings driving this roadmap:

| Finding | Source | Impact |
|---------|--------|--------|
| P0 gap: no coupons, order bumps, upsells, cart recovery | Research #3 (Feature Gaps) | Phase 1 priority |
| Content protection (PDF stamping, watermarks) cited as "mandatory" by Gumroad sellers | Research #3 | Phase 1 priority |
| Affiliate programs non-negotiable for creators with 50k+ students | Research #3 | Phase 2 priority |
| Lead with "own your audience + $0 fees", not crypto ideology | Research #5 (GTM) | Messaging strategy |
| Managed hosting ($29-79/mo) is proven first revenue stream (Ghost model) | Research #2 (Monetization) | Revenue Phase 1 |
| Crypto processing fee of 0.5-1% is viable vs Stripe's 2.9% | Research #2 | Revenue Phase 2 |
| NIP-99 as required listing format, centralized index first | Research #6 (Federation) | Architecture decision |
| Lightning for settlement, ecash for micro-splits/UX | Research #6 | Architecture decision |
| AI features are NOT a differentiator anymore (Teachable, Kajabi already have them) | Research #3 | Deprioritized from previous roadmap |
| Tax/MoR is the hardest moat to replicate — don't try to out-MoR Gumroad | Research #3 | Tax as workflow, not MoR |
| "Gumroad alternative" or "Teachable alternative" competitor wedge works for SEO | Research #5 | GTM strategy |
| Two-rate referral model: higher for new customers, lower/zero for repeat | Research #6 | Referral system design |
| 50 activated creators + 5 communities with ecash mints = scale sprint target | Research #5 | Success metrics |
| BIP21 unified QR: on-chain URI with `lightning=` BOLT11 for frictionless checkout | Research #4 | Checkout UX pattern |
| Order state machine must be payment-method-agnostic | Research #4 | Architecture decision |
| Zap-to-unlock for items <$5; structured checkout for everything else | Research #4 | Micro-content pricing model |
| BTCPay Pull Payments + LNURL-withdraw for crypto refunds | Research #4 | Refund mechanism |
| Creator payout as routing policy: destination × conversion × settlement timing | Research #4 | Payout architecture |
| Tax schema: persist (timestamp, asset_type, amount, USD_fmv_source, USD_fmv_value) per payment | Research #4 | Tax data model |
| Three-mode checkout: instant-final (LN/ecash), escrowed (Cashu P2PK), card (Stripe) | Research #7 | Checkout architecture |
| Split settlement: 80-90% instant to seller, 10-20% escrowed with locktime refund | Research #7 | Dispute resolution |
| Signed purchase receipts (Nostr events) as trust foundation | Research #7 | Reputation system |
| Cashu 2-of-3 P2PK multisig escrow (NUT-10/NUT-11) for disputes | Research #7 | Escrow mechanism |
| Ecash mint = money transmitter, NO small-values exemption | Research #8 | Regulatory compliance |
| Path B (licensed partner) for Longmont pilot — avoids $250K bond | Research #8 | Compliance strategy |
| Don't market with "privacy" or "anonymity" language | Research #8 | Regulatory messaging |
| Total Bitcoin creator economy ~$65K/month — manufacture liquidity or import it | Research #9 | Market sizing |
| Make payments social and visible (Fountain/Alby pattern) | Research #9 | Adoption strategy |
| Wallets as replaceable middleware reduces regulatory burden | Research #9 | Architecture decision |
| "No fees + meaningful infra costs" kills projects (OpenBazaar) | Research #9 | Sustainability warning |

### Discovery Network — The Parallel Track

Discovery isn't a separate phase — it's a **parallel track** that levels up alongside marketplace features. Each phase gets a discovery upgrade.

**Why discovery is the product:**
- The network IS the product — like Amazon, the value is traffic and distribution, not just a storefront
- Every store that joins strengthens the network (more products in search, richer recommendations)
- People-powered ranking vs algorithm-controlled (transformation metrics, community validation — not an opaque algorithm deciding what surfaces)
- Incremental approach: ship what exists, upgrade each phase

**What's already built (70-80% of federation infrastructure):**
- Cross-store search and catalog aggregation (`network-service.js`)
- Store registry with health checks and RSA-signed communications (`network.js`, `networkRoutes.js`)
- Network explorer UI with search, stats, and store connections (`network.html`)
- AI discovery service with semantic search, reading paths, and knowledge graph (`aiDiscoveryService.js`)
- Database schema for embeddings, citation networks, and reading paths (`schema-ai-discovery.sql`)
- Frontend network client with caching (`network-client.js`)

**Discovery levels by phase:**

| Phase | Marketplace | Discovery Upgrade |
|-------|------------|-------------------|
| **0 (MVP)** | Deploy, list, sell | **v0:** Ship existing federation — cross-store search, product feed, network page |
| **1 (Checkout)** | Coupons, bumps, upsells, content protection | **v1:** Categories/tags, trending products, "stores like this", basic recommendations |
| **2 (Revenue)** | Affiliates, tax, managed hosting, migration | **v2:** Semantic search (Claude/OpenAI), AI reading paths, knowledge graph (citation network) |
| **3 (Crypto)** | ArxMint, Nostr auth, L402, disputes | **v3:** NIP-99 product listings replace JSON registry, Nostr relay-based search (NIP-50) |
| **4 (Network)** | Circular economy, liquidity, metrics | **v4:** Transformation-based ranking, community validation signals, progressive disclosure |
| **5 (Scale)** | Themes, memberships, PWA, integrations | Polish and optimize discovery UX |

**Node onboarding (Store-in-a-Box):**

Originally "Brand-in-a-Box" for book publishing. Now evolves to onboard any digital product creator:

| Tier | Price | What You Get |
|------|-------|-------------|
| Self-hosted | Free | `git clone`, deploy anywhere, join the network |
| Managed | $29-149/mo | One-click deploy on Teneo Cloud, auto-updates, SSL, email deliverability |
| Done-for-you | Custom | Full store setup, branding, product migration, training |

Each new store automatically joins the discovery network. The onboarding funnel: discover network → deploy store → list products → get discovered by every other store's customers.

---

## What's Built (Current State — Feb 2026)

### Working
- [x] Express.js backend with SQLite
- [x] Stripe payment integration (checkout, webhooks, orders)
- [x] Crypto checkout endpoints (Bitcoin/Lightning)
- [x] Auth abstraction layer (local magic links + Teneo Auth OAuth 2.0 + PKCE)
- [x] Email service (SMTP + Resend, order confirmations, magic links)
- [x] Admin dashboard (book management, orders, audit logging)
- [x] Multi-brand catalog and theming
- [x] Course platform (progress tracking, player)
- [x] Email marketing with automation sequences
- [x] Funnel builder module (4 templates)
- [x] Component library (heroes, CTAs, base system)
- [x] Network/federation registry and cross-node search
- [x] Secure download system with token validation
- [x] Setup wizard
- [x] Rate limiting, CSRF protection, session management

### Partially Complete
- [ ] Frontend auth UI (backend done, no login/register pages)
- [ ] Course checkout flow (components exist, not integrated into marketplace)
- [ ] Email service production config (code done, needs SMTP credentials)

### Not Built (But on Roadmap)
- [ ] Checkout conversion stack (coupons, bumps, upsells, cart recovery)
- [ ] Content protection (PDF stamping, watermarks, license keys)
- [ ] Affiliate program
- [ ] Tax calculation/workflow
- [ ] ArxMint payment integration (Lightning/ecash checkout)
- [ ] Nostr auth (NIP-07)
- [ ] Federated discovery via Nostr (NIP-99)
- [ ] Managed hosting infrastructure
- [ ] Migration tooling (import from Gumroad/Teachable)

---

## Phase 0: Launch Foundation (Current → MVP)

**Goal:** A real person can deploy a store, list a product, and process a payment.

**Why first:** Research #5 says the single most critical build item is the "golden path": deploy → publish product → collect email → test purchase. Every other phase depends on this working end-to-end in under 60 minutes.

### Tasks
- [ ] Create login/register UI pages (frontend auth integration)
- [ ] Update frontend auth.js to detect provider and handle both flows
- [ ] Configure email service for production (magic link delivery)
- [ ] Test full purchase flow end-to-end (Stripe checkout → download)
- [ ] Create "start here" golden path documentation
- [ ] Starter store templates (pre-built themes for quick setup)

### Discovery v0 (Ship What Exists)
- [ ] Verify network registry loads and cross-store search works end-to-end
- [ ] Add "Browse the Network" link to store homepage
- [ ] Test network.html with live store data
- [ ] Ensure store auto-registers with network on first boot

### Success criteria
- A creator can deploy, publish 1 product, enable email capture, and complete a test purchase
- Both auth flows work (magic link + OAuth SSO)
- Time to first sale < 60 minutes from git clone
- Network page shows at least the deploying store and any configured peers

---

## Phase 1: Checkout Conversion Stack (P0 — Switching Baseline)

**Goal:** Match the revenue features creators expect from any platform before they'll switch.

**Why:** Research #3 identified these as the features that BLOCK switching. Creators doing $10k/mo won't move to a platform missing coupons and cart recovery, regardless of platform fees.

### 1.1 Coupons & Discount Codes
- Percentage and fixed-amount discounts
- Time-limited codes (expiry dates)
- Usage limits (single-use, max redemptions)
- Coupon analytics (redemption rates, revenue impact)

### 1.2 Order Bumps (Pre-Checkout)
- Configurable "add this for $X" offers on checkout page
- Per-product bump configuration
- Conversion tracking

### 1.3 Post-Purchase Upsells
- One-time offers after payment confirmation
- One-click purchase (no re-entering payment info)
- Upsell sequences (offer A → if declined → offer B)

### 1.4 Cart Abandonment Recovery
- Track abandoned carts (email captured but not purchased)
- Automated email sequences (1 hour, 24 hours, 72 hours)
- Recovery analytics (emails sent, recovered revenue)

### 1.5 Content Protection
- PDF stamping (buyer email/name watermarked on download)
- Per-buyer watermarking for images/video
- License key generation and validation for software products
- File versioning (update products, buyers get latest version)

### Competitors this matches
| Feature | Gumroad | Teachable | Kajabi | Podia |
|---------|---------|-----------|--------|-------|
| Coupons | Yes | Yes | Yes | Yes |
| Order bumps | Partial | Yes | Yes | Partial |
| Upsells | Yes | Yes | Partial | Yes |
| Cart recovery | Yes | Yes | Unknown | Unknown |
| PDF stamping | Yes | No | No | No |
| License keys | Yes | No | No | No |

### 1.6 Discovery v1 — Search & Browse Improvements
- Category and tag system for products (beyond books: courses, templates, software, downloads)
- Trending products feed (cross-network, based on recent sales velocity)
- "Stores like this" recommendations on store pages
- Basic product recommendations ("customers also bought" using purchase correlation)
- Improved network search: filters by category, price range, product type

---

## Phase 2: Revenue & Distribution (P1)

**Goal:** Enable creator growth (affiliate program) and our own revenue (managed hosting, crypto processing fee).

### 2.1 Affiliate Program
**Why P1:** Research #3 — creators with 50k+ students list affiliate marketing as non-negotiable. Teachable automates payouts; Thinkific is tracking-only — competitive opening.

- Self-serve affiliate signup
- Unique tracking links per affiliate
- Commission configuration per product (% or fixed)
- Real-time dashboard for affiliates (clicks, conversions, earnings)
- Automated payouts (Stripe + optional Lightning/ecash for crypto affiliates)
- Anti-fraud: one-time-use codes, payout delays past refund window, caps per buyer

### 2.2 Tax Workflow
**Why P1:** Research #3 — tax handling is a decisive factor but we should NOT try to become Merchant of Record (the hardest moat to replicate). Instead: opinionated tax workflow.

- Tax calculation integration (TaxJar, Avalara, or manual rates)
- Tax-inclusive pricing option
- Invoice generation with tax line items
- Tax export for creator's accountant (CSV/PDF)
- Clear documentation: "You are the seller, here's what to file"
- EU VAT validation (VIES check for B2B exemption)

### 2.3 Managed Hosting (Teneo Cloud) — Our Revenue
**Why now:** Research #2 — managed hosting is the proven first revenue stream for open source (Ghost model: ~$9.89M ARR, ~28.7k customers, ~$29/mo average). Zero transaction fees.

- One-click deployment
- Automated backups and upgrades
- Custom domain support
- SSL provisioning (automatic via Caddy/Let's Encrypt)
- Email deliverability infrastructure
- Support workflow

**Pricing (research-informed):**
| Tier | Price | Competes with |
|------|-------|---------------|
| Starter | $29/mo | Below Podia ($89), above Ghost Starter ($18) |
| Creator | $79/mo | Matches Podia Shaker ($89), below Teachable Pro |
| Pro | $149/mo | Below Kajabi Basic ($179) |

### 2.4 Crypto Processing Fee — Our Revenue
**Why now:** Research #2 — 0.5-1% platform fee on Lightning/ecash is viable because Lightning routing fees are <0.1%, making total cost still far below Stripe's 2.9% + $0.30.

- 0.75% default platform fee on crypto payments
- Waived/reduced for higher managed hosting tiers
- Positioned as "reliability and operations fee" (uptime SLA, invoice delivery, support), not a take-rate

### 2.5 Migration Tooling
**Why now:** Research #5 — "Migrate from Gumroad" guide is the highest-leverage SEO asset and should ship alongside the affiliate program to capture migrating creators.

- Gumroad product import (CSV + API)
- Teachable course import
- Email list import (CSV, matches common export formats)
- "Switch from [Competitor]" comparison pages for SEO

### 2.6 Discovery v2 — Semantic Search & Knowledge Graph
- Activate semantic search using Claude or OpenAI embeddings (service exists in `aiDiscoveryService.js`, needs API key and product embedding pipeline)
- AI-generated reading paths and learning journeys across stores
- Knowledge graph: citation network showing how products relate (supports, extends, contradicts)
- "You might also like" recommendations powered by embeddings (cross-store)
- Search analytics dashboard for store owners (what people search for, conversion rates)

---

## Phase 3: Crypto Differentiators (The Unique Value Prop)

**Goal:** Ship the features no incumbent offers — Bitcoin/Lightning/ecash payments and Nostr identity. Built on top of a solid switching baseline from Phases 1-2.

**Why after Phases 1-2:** Research #3 — "The platform's crypto/Nostr differentiators should come AFTER the switching baseline is met."

### 3.1 ArxMint Payment Integration
**Architecture from Research #4:**

- **Dual checkout:** Stripe (fiat) + ArxMint (crypto) as parallel payment tenders on a single checkout page — not separate flows
- **BIP21 unified QR:** On-chain URI with `lightning=` BOLT11 parameter — wallets auto-select the best path
- **Payment-method-agnostic order state machine:** `pending → confirmed → fulfilled → delivered`. The order object doesn't care how it was paid — only the payment adapter does
- **Ecash token acceptance:** Cashu/Fedimint tokens via paste or QR
- Payment confirmation via webhook/polling, then identical fulfillment pipeline
- Auto-rebalance: ecash → Lightning above risk thresholds (Research #6)

**Micro-content pricing (Research #4):**
- Items < $5: **zap-to-unlock** (NIP-57 zap → content unlocked, no cart needed)
- Items ≥ $5: structured checkout with cart, order bumps, upsells
- Threshold is configurable per store

**Creator payout routing policy (Research #4):**
Payouts defined as a policy on three axes:
1. **Destination type:** Lightning address, on-chain address, ecash mint, Stripe Connect, bank (via partner)
2. **Conversion policy:** hold BTC, auto-convert to USD (via Strike/River API), mixed ratio
3. **Settlement timing:** instant (Lightning), daily batch, weekly batch

Instant conversion to USD minimizes creator tax complexity (Research #4).

### 3.2 Nostr Authentication (NIP-07)
- Sign in with Nostr browser extension (Alby, nos2x)
- NIP-07 `window.nostr` integration for keypair signing
- NIP-98 HTTP auth for store API requests
- NIP-05 DNS verification for merchant credibility
- Portable identity: creator's audience follows their keypair, not the platform

### 3.3 L402 Paywalls for Micro-Content
**Architecture from Research #4:**

- HTTP 402 response with `WWW-Authenticate: L402` header containing macaroon + Lightning invoice
- **Aperture reverse proxy pattern** — sits in front of content endpoints, handles payment verification
- Pay-per-article, pay-per-lesson, pay-per-API-call
- Machine-payable API endpoints (AI agent commerce — agents can pay invoices autonomously)
- Macaroons enable caveats: time-limited access, usage caps, content-specific restrictions

### 3.4 Refund & Dispute Resolution
**Architecture from Research #7:**

**Three-mode checkout (buyer chooses based on trust level):**
1. **Instant-final** (Lightning/ecash) — lowest cost, no recourse, for trusted/repeat purchases
2. **Escrowed** (Cashu 2-of-3 P2PK multisig) — buyer/seller/arbiter keys, 10-20% held in escrow
3. **Card fallback** (Stripe) — full chargeback protection, highest cost, for first-time buyers

**Split settlement (Research #7):**
- 80-90% of crypto payment released instantly to seller
- 10-20% held in Cashu escrow with locktime auto-release (e.g., 14 days)
- If no dispute filed within window → escrowed portion auto-releases to seller
- If dispute filed → arbiter evaluates evidence, releases to winner

**Refund mechanisms (Research #4 + #7):**
- **Stripe refunds:** Standard Stripe API (already works)
- **Lightning refunds:** BTCPay Pull Payments (seller creates pull payment, buyer claims via LNURL-withdraw)
- **Ecash refunds:** Store-credit bearer tokens (Cashu tokens minted by store's mint — simplest UX)
- **On-chain refunds:** BTCPay Pull Payments with on-chain claim

**Trust & reputation (Research #7):**
- Signed purchase receipts as Nostr events (cryptographic proof of transaction)
- Receipt-referenced reviews (only buyers who purchased can review)
- NIP-13 Proof-of-Work on reviews (spam resistance without moderation)
- Dispute rate and resolution stats published per-store (opt-in)

**Implementation phasing (Research #7):**
- Phase 3a: Receipts + manual refund UX (seller-initiated refunds via Pull Payments)
- Phase 3b: Cashu P2PK escrow (NUT-10/NUT-11) for escrowed checkout mode
- Phase 3c: Arbiter marketplace (community arbiters stake reputation, earn dispute fees)

**Legal compliance (Research #7 + #8):**
- EU: Capture "performance begins" consent before delivering digital content (14-day withdrawal right)
- Planning heuristic: ~1% dispute rate for digital products
- Clear ToS: instant-final means no refund; escrowed means arbiter-mediated

### 3.5 Crypto Tax Data Model
**Architecture from Research #4 + #8:**

Build the tax persistence layer from day one — retrofitting is painful.

**Per-payment record schema:**
```
timestamp_received, asset_type, amount, USD_fmv_source, USD_fmv_value
```

- Capture fair market value at moment of receipt (CoinGecko/Coinbase API)
- Works for Lightning sats, ecash tokens, and on-chain BTC
- Creators who auto-convert to USD (via payout routing policy) minimize tax complexity
- Export as CSV/PDF for creator's accountant
- Clear documentation: "You received X BTC worth $Y at time of sale — report as income"

---

## Phase 3.5: Regulatory Compliance (Parallel Track)

**Goal:** Operate legally from day one. Research #8 found ecash mints are classified as money transmitters with NO exemptions.

**This runs parallel to Phase 3 — do not ship ecash features without compliance in place.**

### Compliance Paths (Research #8)

| Path | Description | Cost | Timeline |
|------|-------------|------|----------|
| **A: Non-custodial** | Don't operate mints; users run their own | $0 | Immediate |
| **B: Licensed partner** | Partner with licensed MSB for mint operations | Partnership fee | 1-3 months |
| **C: Own MSB license** | Register as MSB, get CO money transmitter license | $250K bond + $100K net worth | 6-12 months |

**Recommended for Longmont pilot: Path B** — partner with a licensed entity to operate the community mint. Avoids the $250K bond requirement while maintaining ecash UX.

### Compliance Requirements
- **FinCEN MSB registration** within 180 days if operating a mint directly
- **Colorado state license** — $250K surety bond, $100K net worth minimums
- **AML/KYC program** — even for ecash; applies at mint deposit/withdrawal points
- **Suspicious Activity Reports (SARs)** — required for transactions >$2,000 or suspicious patterns
- **Currency Transaction Reports (CTRs)** — required for >$10,000

### Compliance-Safe Design Patterns (Research #8)
- **Don't market with "privacy" or "anonymity" language** — regulators flag this
- **Cap balances and velocity in pilot** — demonstrates good faith controls
- **Structure federation as incorporated entity** — legal clarity for multi-mint operations
- **Wallets as replaceable middleware** (Research #9) — reduces our regulatory surface
- **Blinded signatures are a feature, not a marketing point** — don't lead with "untraceable payments"

### What This Means for Architecture
- Mint operations separated from marketplace operations (different regulatory requirements)
- ArxMint handles mint compliance; marketplace handles commerce compliance
- Creators are sellers (not money transmitters) — clear in ToS and documentation
- Tax workflow (Phase 2.2) provides creator-side compliance tools

---

## Phase 4: Network Scale & Circular Economy

**Goal:** Independent creator stores that discover each other, share audiences, and transact in a circular economy.

**Market context (Research #9):** The total Bitcoin creator economy is ~$65K/month (Stacker News ~$6K + Geyser ~$59K). This is tiny but growing. To succeed, we must either **manufacture liquidity** (subsidize early transactions, seed creator balances) or **import it** (integrate with existing Lightning wallets like Alby, connect to Fountain/Stacker News user bases). Make payments social and visible — the Fountain "boostagram" and Stacker News zap patterns prove that public payment activity drives more payments.

### 4.1 Product Listings via Nostr (NIP-99)
**Architecture decisions from Research #6:**

- **NIP-99 (kind 30402) is required** for federation — simpler, more flexible than NIP-15
- NIP-15 optional for stores wanting richer cart/shipping UX
- Each store publishes product events to its outbox relays (NIP-65)
- Signed events = tamper-proof listings

### 4.2 Discovery Layer
**Architecture decisions from Research #6:**

- **Centralized index first** — ship a single discovery index to bootstrap network effects
- Design for multiple competing indexes later (AT Protocol's multi-index pattern)
- NIP-50 for relay-based search
- "Market-relay class" relays: write-accepting for publishing, search-optimized for browsing
- Avoid full marketplace ranking until supply exists (Research #5 — defer to post-adoption)

### 4.3 Discovery v3 — Decentralized Discovery
- NIP-99 product listings (kind 30402) replace JSON registry — stores publish products as signed Nostr events
- NIP-50 relay-based search — discovery index reads from Nostr relays instead of polling store APIs
- "Market-relay class" relays: write-accepting for publishing, search-optimized for browsing
- Transition path: JSON registry → NIP-99 events (dual-mode during migration, then sunset JSON)

### 4.4 Cross-Store Referral System
**Architecture decisions from Research #6:**

- **Two-rate model:**
  - Higher rate (15-20%) for new-customer acquisition (referral substitutes for paid acquisition)
  - Lower rate (5%) or zero for repeat purchases (avoids "forever tax")
- Fees computed on net item subtotal (exclude tax, shipping)
- Anti-abuse: one-time-use codes, payout delays past refund windows, per-buyer caps
- Payouts via Lightning (instant affiliate settlement — a genuine differentiator)

### 4.5 Payment Architecture
**Architecture decisions from Research #6:**

- **Lightning = network settlement rail** (buyer-to-seller payments, cross-mint settlement)
- **Ecash = local convenience layer** (instant UX, micro-distributions, referral splits)
- Cashu for lightweight mints, Fedimint for trust-distributed federations
- NIP-47 (Nostr Wallet Connect) for programmatic wallet control (automated referral payouts)
- Auto-rebalance ecash → Lightning above risk thresholds
- Keep ecash balances small by default; "withdraw to self-custody" as first-class UX

### 4.6 Liquidity Bootstrap Strategy
**From Research #9:**

The cold-start problem is real — the Bitcoin creator economy is small. Strategies:

1. **Manufacture liquidity:** Seed creator wallets with sats for first purchases; subsidize early cross-store transactions
2. **Import liquidity:** Alby wallet integration (largest Lightning browser wallet), Fountain podcast app cross-promotion
3. **Make payments social:** Public boost/zap feeds on store pages (Fountain pattern); "top supporters" leaderboards
4. **Crowdfunding + rewards:** Largest proven volume in Bitcoin commerce (Geyser Fund model) — consider pre-sale/crowdfunding as a product type
5. **Ship own metric layer:** Transaction volume, creator earnings, network growth — visible on a public dashboard. Competitive advantage: incumbents don't publish this
6. **Revenue splits:** 90/5/5 (creator/platform/referrer) proven viable at Wavlake — use as starting point

**Key insight:** BTCPay Server is substrate, not competitor. Differentiate on layers BTCPay omits: storefront, courses, email, affiliates, discovery.

### 4.7 Circular Economy Metrics
**From Research #6:**

| Metric | Definition |
|--------|-----------|
| Internal velocity of money | Total internal spend / average internal balances per period |
| Recirculation ratio | % of earned value re-spent inside network vs withdrawn |
| Cross-store purchase rate | % of buyers purchasing from 2+ distinct stores |
| Cycle density | A→B→C→A transaction patterns (structural health) |
| Referral ROI | Incremental GMV / referral payouts |

### 4.8 Privacy Design
**From Research #6:**

- Opt-in, aggregated telemetry published as signed events
- Per-mint local metrics, not a global surveillance layer
- NIP-47 unique keys per connection (don't link payment activity to identity)

---

## Phase 5: Scale & Polish

### 5.1 Premium Themes/Templates (Revenue)
- First-party premium storefront themes ($79-149 each)
- Theme marketplace for third-party developers (30% platform share, matching WooCommerce)
- Research #2: Add-on economy follows power-law distribution — a few winners generate most revenue

### 5.2 Memberships & Subscriptions
- Recurring payments (monthly/annual)
- Membership tiers with content gating
- Subscriber management dashboard

### 5.3 Community Features
- Nostr-aligned federated community (not a bolt-on forum)
- Course discussions integrated with learning products
- Moderation tools

### 5.4 Mobile Engagement
- PWA first (Progressive Web App with push notifications + offline)
- Research #3: Teachable reports 85%+ course resume rate after push notification reminders
- Native app later (Kajabi charges $199/mo add-on for branded apps — opportunity)

### 5.5 Integrations Surface Area
- Webhooks (outbound events on order, enrollment, etc.)
- Public REST API (documented, versioned)
- Zapier triggers/actions
- Research #3: Kajabi charges $25/mo add-on for API access — for open source, this is trivially includable

### 5.6 Discovery v4 — Network Intelligence
- Transformation-based ranking: products ranked by measurable reader/user outcomes, not just sales volume
- Community validation signals: verified reviews weighted by reviewer's network reputation
- Controversy boosting (opt-in per store): surface suppressed or contested content for stores that want it
- Progressive disclosure: simple search for casual browsers, deep knowledge graph for power users
- Cross-store learning paths: multi-store curricula that span the entire network
- Public network dashboard: transaction volume, creator earnings, network growth (competitive advantage: incumbents don't publish this)

---

## What's NOT on the Roadmap (And Why)

| Previously planned | Why removed | Source |
|-------------------|-------------|--------|
| AI-Powered Book Discovery Engine | AI features are NOT a differentiator — Teachable and Kajabi already have them | Research #3 |
| Proof-of-Read NFTs | Not in any priority tier from research; adds complexity with no proven demand | Research #3 |
| IPFS hosting / ENS domains | Removed in README rewrite; not aligned with Bitcoin/Lightning/Nostr direction | Strategy decision |
| Monero payments | Removed; focus on Bitcoin/Lightning/ecash via ArxMint | Strategy decision |
| "Censorship monetization" framing | Research #5: lead with ownership + fees, not ideology. Resilience is a segment wedge, not the primary message | Research #5 |
| Information asymmetry scoring | Novel but not in P0-P2 features; defer until platform has users | Research #3, #5 |
| PayPal integration | Replaced by ArxMint crypto rails; Stripe covers fiat | Strategy decision |
| DAO governance | Not aligned with current architecture; Nostr identity handles the "no platform owns your account" story | Research #6 |

---

## Revenue Roadmap (Research #2)

| Stream | Expected Revenue | Timing | Priority |
|--------|-----------------|--------|----------|
| Managed hosting ($29-149/mo) | 100 customers at $79/mo = $7,900 MRR | Phase 2 | FIRST |
| Crypto processing fee (0.75%) | $200k/mo GMV = $1,500/mo | Phase 3 | SECOND |
| Premium themes ($79-149 each) | 50 sales/mo at 20% share = $990/mo | Phase 5 | THIRD |
| Paid onboarding ($299/setup) | 10 setups/mo = $2,990/mo | Phase 2 | BRIDGE |
| Discovery network referrals (10-20%) | $50k/mo attributed GMV at 15% = $7,500/mo | Phase 2+ (grows with network) | GROWS |
| Grants (OpenSats, HRF, Spiral) | Variable; supplemental only | Parallel | SUPPLEMENTAL |

---

## Go-To-Market (Research #5)

### Messaging hierarchy
1. **Primary:** "Own your audience. Own your platform." (2.7x earning correlation with audience ownership)
2. **Secondary:** "$0 platform fees" (incumbents charge 7.5-30%)
3. **Segment wedge:** "Sell without deplatforming risk" (adult/marginalized creators)

### Competitor wedge
Lead with **"Gumroad alternative"** (fastest demo path: sell a digital product in 10 minutes).

### 90-day targets
- 50 activated creators (store live + email capture + test purchase)
- 10 creators processing real transactions weekly
- 5 communities running ecash mints with ≥1 marketplace purchase/month

---

## Target Segments (Research #1)

### Tier 1 (Strongest evidence)
1. **Adult/NSFW creators** — most documented deplatforming; OnlyFans, Itch.io, Gumroad all tightened
2. **International creators** — blocked by Stripe's finite country support

### Tier 2 (Strong crypto-native fit)
3. **Digital goods/gaming creators** — leading crypto adoption category per NCA/Harris Poll
4. **Crypto-native/Nostr communities** — high-conviction early adopters (1.5M Nostr users, 712 relays)

### Tier 3 (Real demand, careful framing)
5. **Regulated/restricted commerce** — cannabis education, firearms content, alternative health

---

## Architecture Decisions (Locked by Research)

| Decision | Answer | Source |
|----------|--------|--------|
| Listing format for federation | NIP-99 (kind 30402) required; NIP-15 optional | Research #6 |
| Protocol substrate | Nostr primary; borrow AT Protocol's multi-index discovery pattern | Research #6 |
| Identity NIPs | NIP-07 (browser signing), NIP-98 (HTTP auth), NIP-05 (DNS identity) | Research #6 |
| Discovery approach | Centralized index first → multiple competing indexes later | Research #6 |
| Payment settlement | Lightning for network settlement; ecash for local micro-splits | Research #6 |
| Referral model | Two-rate: 15-20% new customer, 0-5% repeat; computed on net subtotal | Research #6 |
| Primary messaging | "Own your audience + $0 fees" above fold; crypto below fold | Research #5 |
| Competitor wedge | "Gumroad alternative" (fastest demo path) | Research #5 |
| Revenue first | Managed hosting subscriptions ($29-149/mo) | Research #2 |
| Tax strategy | Tax workflow (calculation + invoicing + export), NOT Merchant of Record | Research #3 |
| Ecash balances | Small by default; auto-rebalance to Lightning above risk thresholds | Research #6 |
| Telemetry | Opt-in, aggregated, per-mint local metrics; no global surveillance | Research #6 |
| Checkout UX | BIP21 unified QR (on-chain + Lightning in one); crypto as parallel tender, not separate flow | Research #4 |
| Order model | Payment-method-agnostic state machine; order doesn't know how it was paid | Research #4 |
| Micro-content | Zap-to-unlock (NIP-57) for items <$5; structured checkout for everything else | Research #4 |
| Refund mechanism | BTCPay Pull Payments + LNURL-withdraw for Lightning; Cashu tokens for store credit | Research #4, #7 |
| Creator payouts | Routing policy: destination × conversion × settlement timing; instant USD conversion minimizes tax | Research #4 |
| Tax data model | Persist (timestamp, asset_type, amount, USD_fmv_source, USD_fmv_value) per payment from day one | Research #4, #8 |
| L402 implementation | Aperture reverse proxy pattern; macaroons with caveats for access control | Research #4 |
| Checkout modes | Three-mode: instant-final (LN/ecash), escrowed (Cashu P2PK), card fallback (Stripe) | Research #7 |
| Escrow mechanism | Cashu 2-of-3 P2PK multisig (NUT-10/NUT-11); 80-90% instant, 10-20% escrowed | Research #7 |
| Trust/reputation | Signed purchase receipts (Nostr events); receipt-referenced reviews with NIP-13 PoW | Research #7 |
| Mint compliance | Path B (licensed partner) for Longmont pilot; no privacy/anonymity marketing | Research #8 |
| Regulatory messaging | Frame ecash as UX improvement, not privacy tool; blinded signatures are a feature, not marketing | Research #8 |
| Federation legal | Structure as incorporated entity; cap balances and velocity in pilot | Research #8 |
| Liquidity strategy | Manufacture or import liquidity; make payments social and visible | Research #9 |
| BTCPay relationship | Substrate, not competitor; differentiate on storefront/courses/email/affiliates/discovery | Research #9 |

---

## Cautionary Tales (Research #6, #8, #9)

- **OpenBazaar** — fully decentralized marketplace, discontinued. Lesson: you still need reliable discovery, trust/dispute primitives, and durable infrastructure funding. "No fees + meaningful infra costs" is not a sustainable model (Research #9).
- **Fedimint "two mints" problem** — mints won't accept each other's notes, creating centralization pressure. Mitigation: Lightning as the bridge.
- **Cashu custodial risk** — explicitly custodial at mint layer. Mitigation: small balances, first-class withdraw-to-self-custody UX.
- **LETS systems** — mutual credit networks historically struggle to reach critical mass. Plan for cold start.
- **Tornado Cash / Samourai Wallet** — enforcement actions triggered by privacy marketing and facilitating illicit flows. Lesson: don't lead with "anonymity" or "untraceable"; frame ecash as UX improvement, not privacy tool (Research #8).
- **Shopstr / Plebeian Market** — Nostr-native marketplaces with minimal traction. Lesson: protocol-native doesn't sell; product-market fit and UX sell. Ship the storefront features first (Research #9).
- **Bitcoin creator economy is tiny** — ~$65K/mo total across all platforms. Don't plan for Bitcoin-only revenue. Stripe fiat must remain a first-class payment path alongside crypto (Research #9).

---

## Research Status

All 9 Gemini Deep Research prompts are complete. Key findings have been integrated into this roadmap.

| # | Topic | Status | Key Impact on Roadmap |
|---|-------|--------|----------------------|
| 1 | Product-Market Fit | Done | TAM $11.57B; 5 early-adopter segments; target segments |
| 2 | Monetization | Done | Revenue roadmap; managed hosting first |
| 3 | Feature Gaps | Done | Phase 1 priorities (checkout conversion, content protection) |
| 4 | Crypto Payments UX | Done | BIP21 unified QR; payment-agnostic order model; payout routing policy; tax schema |
| 5 | Positioning & GTM | Done | Messaging hierarchy; competitor wedge strategy; 90-day targets |
| 6 | Federated Network | Done | NIP-99; centralized index first; two-rate referral; payment architecture |
| 7 | Dispute Resolution | Done | Three-mode checkout; Cashu P2PK escrow; split settlement; receipt-based reviews |
| 8 | Regulatory & Compliance | Done | Money transmitter classification; Path B for pilot; compliance-safe design |
| 9 | Bitcoin Creator Ecosystem | Done | ~$65K/mo market; manufacture liquidity; payments social; BTCPay as substrate |

Prompts and detailed tracking in: `C:\code\te-btc\internal\docs\teneo-marketplace\research\GEMINI RESEARCH.md`
