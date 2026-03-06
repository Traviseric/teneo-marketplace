# OpenBazaar.ai — Site Spec

**Domain:** OpenBazaar.ai
**Repo:** https://github.com/Traviseric/openbazaar-ai
**Tagline:** The open marketplace for creators, freelancers, and agents.

---

## What It Is

An open-source platform where anyone can sell goods, services, and digital products — with zero platform fees. Combines a product marketplace (like Gumroad/Shopify) with a freelance/gig layer (like Upwork/Fiverr) and AI agent services.

**Payments powered by ArxMint** — Lightning, ecash, Stripe. Sellers keep 100%.

---

## Three Pillars

> **Implementation status (March 2026):** Pillar 1 (Marketplace) is 95% production-ready. Pillar 2 (Gig Platform) is 0% built -- spec only. Pillar 3 (Agent Services) has a scaffold (app store registry) but no functional L402 payments.
> See [MARKETPLACE_STATUS_AND_TODO.md](./reference/MARKETPLACE_STATUS_AND_TODO.md) for detailed status.

### 1. Marketplace (production-ready)
Sell digital and physical goods. Books, courses, templates, software.

- Multi-brand storefronts (white-label)
- Course platform with quizzes and certificates
- Funnel builder (landing pages, email sequences)
- Print-on-demand via Lulu
- AI-powered discovery and search
- NFT receipts and ownership proofs (scaffold -- requires Hardhat setup)

### 2. Gig Platform (not yet built -- spec below)
Post jobs, bid on work, deliver and get paid.

- **Task posting** — Clients post jobs with budgets and requirements
- **Bidding/proposals** — Freelancers submit proposals with timeline and price
- **Escrow** — ArxMint holds payment in ecash escrow (Cashu P2PK multisig) until delivery confirmed
- **Milestone payments** — Split large jobs into milestones, release funds per milestone
- **Reputation** — On-chain/Nostr-verified reviews, completion rate, response time
- **Skill matching** — AI matches jobs to freelancers based on portfolio and history
- **Dispute resolution** — 2-of-3 multisig escrow with community arbitrators
- **Zero fees** — No 20% Upwork cut. ArxMint processing only (0.5-1%)

### 3. Agent Services (future — AI economy)
AI agents as service providers on the platform.

- Agents list capabilities and pricing
- Humans (or other agents) hire agents for tasks
- L402 micropayments for per-use agent calls
- Agent reputation based on task completion quality
- Composable agent workflows (chain agents together)

---

## Site Architecture

### Public Pages (OpenBazaar.ai)

```
/                           Landing page — hero, value prop, featured listings
/marketplace                Browse products (books, courses, templates, software)
/gigs                       Browse freelance services and job postings
/agents                     Browse AI agent services (future)
/search                     Unified search across all three pillars
/store/:brand               Individual brand storefront
/product/:id                Product detail page
/gig/:id                    Gig listing detail
/freelancer/:id             Freelancer profile
/network                    Federation explorer — connected nodes, stats
/about                      Mission, open source, how it works
/docs                       Developer docs, API reference, self-hosting guide
```

### Authenticated Pages

```
/dashboard                  Seller/freelancer dashboard — sales, active gigs, analytics
/dashboard/products         Manage product listings
/dashboard/gigs             Manage gig listings (as seller) or posted jobs (as client)
/dashboard/orders           Order history and fulfillment
/dashboard/courses          Course builder and student management
/dashboard/funnels          Funnel builder
/dashboard/analytics        Revenue, traffic, conversion analytics
/dashboard/payouts          ArxMint payout settings and history
/dashboard/reputation       Reviews, ratings, completion stats
```

### API Endpoints (existing + new)

#### Existing (from openbazaar-ai)
```
POST /api/checkout           Stripe checkout
POST /api/crypto-checkout    Bitcoin/Lightning/Monero checkout
GET  /api/catalog            Product catalog
GET  /api/brands/:brand      Brand config and catalog
POST /api/auth/magic-link    Passwordless auth
GET  /api/network/peers      Federation peer list
GET  /api/discovery/search   AI-powered search
POST /api/courses/*          Course CRUD
POST /api/funnels/*          Funnel CRUD
POST /api/coupons/*          Coupon management
```

#### New — Gig Platform
```
POST /api/gigs               Create gig listing
GET  /api/gigs               Browse/search gigs
GET  /api/gigs/:id           Gig detail
PUT  /api/gigs/:id           Update gig
DELETE /api/gigs/:id         Remove gig

POST /api/jobs               Post a job (client side)
GET  /api/jobs               Browse open jobs
GET  /api/jobs/:id           Job detail
POST /api/jobs/:id/proposals Submit proposal
GET  /api/jobs/:id/proposals List proposals (client only)

POST /api/contracts          Create contract (accept proposal)
PUT  /api/contracts/:id      Update contract status
POST /api/contracts/:id/milestones     Add milestone
PUT  /api/contracts/:id/milestones/:m  Complete/approve milestone

POST /api/escrow/fund        Fund escrow (ArxMint)
POST /api/escrow/release     Release escrow to seller
POST /api/escrow/dispute     Open dispute

POST /api/reviews            Leave review
GET  /api/reviews/:userId    Get user reviews
GET  /api/reputation/:userId Reputation score and stats
```

---

## Database Schema Additions (gig platform)

```sql
-- Gig listings (services offered by freelancers)
CREATE TABLE gigs (
    id TEXT PRIMARY KEY,
    seller_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    skills TEXT,              -- JSON array
    pricing_type TEXT,        -- 'fixed', 'hourly', 'milestone'
    base_price INTEGER,       -- cents
    currency TEXT DEFAULT 'USD',
    delivery_days INTEGER,
    max_revisions INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Jobs posted by clients
CREATE TABLE jobs (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    required_skills TEXT,     -- JSON array
    budget_min INTEGER,       -- cents
    budget_max INTEGER,
    budget_type TEXT,         -- 'fixed', 'hourly'
    deadline DATETIME,
    status TEXT DEFAULT 'open', -- open, in_progress, completed, cancelled
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Proposals from freelancers
CREATE TABLE proposals (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    freelancer_id TEXT NOT NULL,
    cover_letter TEXT,
    proposed_price INTEGER,   -- cents
    proposed_timeline INTEGER, -- days
    status TEXT DEFAULT 'pending', -- pending, accepted, rejected, withdrawn
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id)
);

-- Contracts (accepted proposals become contracts)
CREATE TABLE contracts (
    id TEXT PRIMARY KEY,
    job_id TEXT,
    gig_id TEXT,
    client_id TEXT NOT NULL,
    freelancer_id TEXT NOT NULL,
    agreed_price INTEGER NOT NULL,
    escrow_id TEXT,            -- ArxMint escrow reference
    status TEXT DEFAULT 'active', -- active, completed, disputed, cancelled
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);

-- Milestones within contracts
CREATE TABLE milestones (
    id TEXT PRIMARY KEY,
    contract_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    amount INTEGER NOT NULL,   -- cents
    status TEXT DEFAULT 'pending', -- pending, in_progress, submitted, approved, disputed
    due_date DATETIME,
    completed_at DATETIME,
    FOREIGN KEY (contract_id) REFERENCES contracts(id)
);

-- Reviews
CREATE TABLE reviews (
    id TEXT PRIMARY KEY,
    contract_id TEXT NOT NULL,
    reviewer_id TEXT NOT NULL,
    reviewee_id TEXT NOT NULL,
    rating INTEGER NOT NULL,   -- 1-5
    comment TEXT,
    nostr_event_id TEXT,       -- signed review on Nostr for verification
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contract_id) REFERENCES contracts(id)
);

-- Escrow records
CREATE TABLE escrow (
    id TEXT PRIMARY KEY,
    contract_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'USD',
    payment_method TEXT,       -- 'stripe', 'lightning', 'cashu', 'onchain'
    arxmint_ref TEXT,          -- ArxMint transaction reference
    status TEXT DEFAULT 'funded', -- funded, partially_released, released, refunded, disputed
    funded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    released_at DATETIME,
    FOREIGN KEY (contract_id) REFERENCES contracts(id)
);
```

---

## Tech Stack (unchanged core)

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** SQLite (scales to Postgres for hosted tier)
- **Payments:** ArxMint (Lightning, Cashu ecash, Stripe fallback)
- **Auth:** Nostr (NIP-07/NIP-98) + magic link email + Teneo SSO
- **Frontend:** Vanilla HTML/CSS/JS (no framework — fast, forkable)
- **Search:** AI embeddings (OpenAI) + keyword fallback
- **Federation:** RSA-signed peer discovery, cross-node search
- **Deploy:** Docker, Vercel (frontend), Render/Railway (backend)

---

## Landing Page Structure

### Hero
> **The Open Marketplace**
> Sell products. Offer services. Hire talent. Zero platform fees.
> Powered by ArxMint — Lightning-fast payments, you keep 100%.
>
> [Start Selling] [Browse Marketplace] [Post a Job]

### How It Works (3 columns)
1. **Sell Anything** — List products, courses, or freelance services in minutes
2. **Get Paid Instantly** — Lightning/ecash settles in seconds, Stripe for cards
3. **Own Your Business** — Open source, self-hostable, no lock-in

### Featured Sections
- **Trending Products** — Top marketplace listings
- **Featured Freelancers** — Highest-rated service providers
- **Open Jobs** — Active job postings seeking proposals
- **Network Stats** — X nodes, Y products, Z transactions

### Trust Signals
- Open source (GitHub link)
- $0 platform fees (ArxMint processing only)
- Federation network (not a single company)
- Self-hostable (run your own node)
- Nostr identity (you own your keys)

### Footer
- Docs / API / Self-Host Guide
- GitHub / Nostr / Discord
- ArxMint (payment infrastructure)

---

## Competitive Positioning

| Feature | Upwork | Fiverr | Gumroad | OpenBazaar.ai |
|---------|--------|--------|---------|---------------|
| Platform fee | 10-20% | 20% | 10% | **0%** |
| Payment options | Card only | Card only | Card + PayPal | **Card + Lightning + ecash** |
| Self-hostable | No | No | No | **Yes** |
| Open source | No | No | No | **Yes** |
| Products + Services | No | Services only | Products only | **Both** |
| AI agents | No | No | No | **Yes** |
| Federated | No | No | No | **Yes** |
| Censorship resistant | No | No | No | **Yes** |

---

## Implementation Phases

### Phase 1 — Landing + Launch (1-2 sessions)
- [ ] Refine OpenBazaar.ai landing page
- [ ] Audit docs/examples for canonical repo/domain references
- [ ] Deploy landing page to Vercel
- [ ] Verify DNS + production routing for OpenBazaar.ai

### Phase 2 — Gig Platform Core (3-5 sessions)
- [ ] Add gig/job/proposal/contract DB schema
- [ ] Build gig CRUD routes
- [ ] Build job posting and proposal routes
- [ ] Build contract and milestone management
- [ ] Build freelancer profile pages
- [ ] Add basic search/browse for gigs and jobs

### Phase 3 — Escrow + Payments (2-3 sessions)
- [ ] ArxMint escrow integration (Cashu P2PK)
- [ ] Milestone-based payment release
- [ ] Stripe escrow fallback
- [ ] Payout dashboard

### Phase 4 — Reputation + Discovery (2-3 sessions)
- [ ] Review system with Nostr-signed proofs
- [ ] Reputation scoring algorithm
- [ ] AI skill matching for jobs
- [ ] Unified search across products + gigs

### Phase 5 — Agent Economy (future)
- [ ] Agent listing and capability registry
- [ ] L402 micropayment integration
- [ ] Agent-to-agent task delegation
- [ ] Quality scoring and auto-reputation

---

## Legal Considerations

### Trademark: "OpenBazaar"
- USPTO serial `97733259` — office action **refused as generic** (Section 2(e)(1))
- USPTO serial `86396371` — appears dead/refused
- openbazaar.org is a bare placeholder ("3.0 coming soon"), no TM notices
- OB1 (original company) appears dormant
- **Assessment:** Likely safe to use. "OpenBazaar" was ruled too generic to trademark.
- **Action:** Verify via TESS search at tmsearch.uspto.gov. Consider $300 trademark attorney consult.

### Platform Liability
- Escrow handling → may trigger money transmitter rules (state-level)
- ArxMint as payment processor absorbs most regulatory burden
- Self-hosted model reduces platform liability
- See `docs/ROADMAP.md` research findings on regulatory compliance
