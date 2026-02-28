# Teneo Marketplace — Roadmap

**Updated:** 2026-02-28
**Informed by:** Gemini Deep Research outputs 1-6 (product-market fit, monetization, feature gaps, positioning/GTM, federated network design)
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

### Success criteria
- A creator can deploy, publish 1 product, enable email capture, and complete a test purchase
- Both auth flows work (magic link + OAuth SSO)
- Time to first sale < 60 minutes from git clone

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

---

## Phase 3: Crypto Differentiators (The Unique Value Prop)

**Goal:** Ship the features no incumbent offers — Bitcoin/Lightning/ecash payments and Nostr identity. Built on top of a solid switching baseline from Phases 1-2.

**Why after Phases 1-2:** Research #3 — "The platform's crypto/Nostr differentiators should come AFTER the switching baseline is met."

### 3.1 ArxMint Payment Integration
- Dual checkout: Stripe (fiat) + ArxMint (crypto) as parallel options
- Lightning invoice generation at checkout
- Ecash token acceptance (Cashu/Fedimint)
- Payment confirmation and order fulfillment
- Creator payout dashboard (sats earned, settlement history)
- Auto-rebalance: ecash → Lightning above risk thresholds (Research #6)

**Checkout UX:** Research #4 (pending) will inform the specific dual-checkout UX pattern. BTCPay Server, OpenNode, and Strike are reference implementations.

### 3.2 Nostr Authentication (NIP-07)
- Sign in with Nostr browser extension (Alby, nos2x)
- NIP-07 `window.nostr` integration for keypair signing
- NIP-98 HTTP auth for store API requests
- NIP-05 DNS verification for merchant credibility
- Portable identity: creator's audience follows their keypair, not the platform

### 3.3 L402 Paywalls for Micro-Content
- Pay-per-article, pay-per-lesson via Lightning
- Machine-payable API endpoints (AI agent commerce)
- Research #4 (pending) will provide implementation guidance

### 3.4 Refund/Dispute Mechanism
- Time-limited refund windows (e.g., 14 days)
- Ecash refund tokens (Research #7 — pending)
- Hybrid model: ecash for trusted/repeat buyers, Stripe for first-time (Research #7)
- Nostr-based reviews/reputation (signed, verifiable)

---

## Phase 4: Federation & Circular Economy

**Goal:** Independent creator stores that discover each other, share audiences, and transact in a circular economy.

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

### 4.3 Cross-Store Referral System
**Architecture decisions from Research #6:**

- **Two-rate model:**
  - Higher rate (15-20%) for new-customer acquisition (referral substitutes for paid acquisition)
  - Lower rate (5%) or zero for repeat purchases (avoids "forever tax")
- Fees computed on net item subtotal (exclude tax, shipping)
- Anti-abuse: one-time-use codes, payout delays past refund windows, per-buyer caps
- Payouts via Lightning (instant affiliate settlement — a genuine differentiator)

### 4.4 Payment Architecture
**Architecture decisions from Research #6:**

- **Lightning = network settlement rail** (buyer-to-seller payments, cross-mint settlement)
- **Ecash = local convenience layer** (instant UX, micro-distributions, referral splits)
- Cashu for lightweight mints, Fedimint for trust-distributed federations
- NIP-47 (Nostr Wallet Connect) for programmatic wallet control (automated referral payouts)
- Auto-rebalance ecash → Lightning above risk thresholds
- Keep ecash balances small by default; "withdraw to self-custody" as first-class UX

### 4.5 Circular Economy Metrics
**From Research #6:**

| Metric | Definition |
|--------|-----------|
| Internal velocity of money | Total internal spend / average internal balances per period |
| Recirculation ratio | % of earned value re-spent inside network vs withdrawn |
| Cross-store purchase rate | % of buyers purchasing from 2+ distinct stores |
| Cycle density | A→B→C→A transaction patterns (structural health) |
| Referral ROI | Incremental GMV / referral payouts |

### 4.6 Privacy Design
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

### 5.6 Discovery Marketplace (Revenue — Optional)
- Cross-store search and recommendations
- Seller opt-in to be listed
- 10-20% referral fee on marketplace-attributed sales (vs Gumroad's 30%)
- Only build after sufficient supply exists (Research #5)

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
| Discovery marketplace (10-20%) | $50k/mo attributed GMV at 15% = $7,500/mo | Phase 5 | LATER |
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

---

## Cautionary Tales (Research #6)

- **OpenBazaar** — fully decentralized marketplace, discontinued. Lesson: you still need reliable discovery, trust/dispute primitives, and durable infrastructure funding.
- **Fedimint "two mints" problem** — mints won't accept each other's notes, creating centralization pressure. Mitigation: Lightning as the bridge.
- **Cashu custodial risk** — explicitly custodial at mint layer. Mitigation: small balances, first-class withdraw-to-self-custody UX.
- **LETS systems** — mutual credit networks historically struggle to reach critical mass. Plan for cold start.

---

## Research Still Pending

| # | Topic | Status | Expected Impact |
|---|-------|--------|----------------|
| 4 | Crypto Payments UX | Pending | Dual checkout UX pattern, refund mechanics, L402 implementation |
| 7 | Dispute Resolution & Trust | Not started | Refund/escrow design for ecash, legal liability |
| 8 | Regulatory & Compliance | Not started | Money transmission rules for ecash mints (CO pilot) |
| 9 | Bitcoin Creator Ecosystem | Not started | Competitive landscape (Fountain, Stacker News, Wavlake) |

Prompts and tracking in: `C:\code\te-btc\internal\docs\teneo-marketplace\research\GEMINI RESEARCH.md`
