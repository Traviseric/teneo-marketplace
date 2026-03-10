<p align="center">
  <img src="openbazaar-site/assets/logo-placeholder.svg" alt="OpenBazaar.ai" width="80">
</p>

<h1 align="center">OpenBazaar.ai</h1>

<p align="center">
  <strong>The open marketplace for creators, freelancers, and agents.</strong><br>
  Sell products. Offer services. Hire talent. Zero platform fees.
</p>

<p align="center">
  <a href="https://openbazaar.ai">Website</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="./docs/README.md">Docs</a> ·
  <a href="./docs/ROADMAP.md">Roadmap</a> ·
  <a href="#deploy-your-own-node">Self-Host</a>
</p>

<p align="center">
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-6366f1.svg" alt="MIT License"></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-18%2B-10b981.svg" alt="Node.js 18+"></a>
  <a href="./docs/core/DUAL_MODE_ARCHITECTURE.md"><img src="https://img.shields.io/badge/Payments-Stripe%20%7C%20Lightning%20%7C%20Ecash-6366f1.svg" alt="Payments"></a>
  <a href="./docs/core/DUAL_MODE_ARCHITECTURE.md"><img src="https://img.shields.io/badge/Network-Federated-8b5cf6.svg" alt="Federated"></a>
</p>

---

## What is this?

An open-source platform that combines a **product marketplace** (Gumroad/Shopify), a **freelance gig platform** (Upwork/Fiverr, planned), and **AI agent services** with zero platform fees. Payments are designed around Stripe plus ArxMint-powered crypto paths.

### Current Reality

**Updated:** March 9, 2026

This repo is not a blank concept anymore. It already contains a broad implemented surface area, and the automated baseline is now green, but production proof work is still real.

- Core marketplace backend and frontend are implemented.
- Subscriptions, referrals, AI store-builder beta, managed build intake, machine-payable APIs, and agent-facing APIs are present in code.
- Several areas are still partial or need production proof: frontend auth/account UX, Supabase/Postgres validation, live POD verification, and deeper ArxMint/L402 flows.
- Latest local verification run: `npm test -- --runInBand` -> `40` passing suites, `0` failing suites, `517` passing tests, `0` failing tests, `2` skipped.

Canonical project truth:
- [Current Status](./docs/reference/MARKETPLACE_STATUS_AND_TODO.md)
- [Roadmap](./docs/ROADMAP.md)

```text
+-------------------------------------------------+
|                 OpenBazaar.ai                   |
|                                                 |
|  +----------+  +----------+  +----------+       |
|  |Marketplace|  |   Gigs   |  |  Agents  |      |
|  | Products  |  | Services |  | AI Tasks |      |
|  | Courses   |  | Escrow   |  | L402 Pay |      |
|  | Funnels   |  | Reviews  |  | Auto-rep |      |
|  +-----+----+  +-----+----+  +-----+----+      |
|        |              |              |          |
|  +-----------------------------------------+    |
|  |          ArxMint Payment Layer          |    |
|  |   Lightning · Ecash · Stripe · L402    |    |
|  +-----------------------------------------+    |
|                                                 |
|  +-----------------------------------------+    |
|  |        Federation Network               |    |
|  |   Discovery · Cross-store search · P2P |    |
|  +-----------------------------------------+    |
+-------------------------------------------------+
```

### Why?

| Platform | Monthly | Fees | Annual cost @ $10k/mo |
|----------|---------|------|----------------------|
| Upwork | $0 | **10-20%** | **$12,000–$24,000** |
| Fiverr | $0 | **20%** | **$24,000** |
| Gumroad | $0 | **10% + $0.50** | **$16,200** |
| ClickFunnels | $97–$297 | **5% + Stripe** | **$10,600–$11,800** |
| **OpenBazaar.ai** | **$0** | **0% (crypto) / 2.9% (Stripe)** | **$0–$3,480** |

You keep your money.

---

## Three Pillars

### Marketplace
Sell digital and physical products. Books, courses, templates, software, and print-on-demand.

- Multi-brand storefronts
- Course platform
- Funnel builder
- Print-on-demand
- AI-powered discovery
- Component library

### Gig Platform *(coming soon)*

> **Status:** Planned, not yet implemented as a full product surface. See [docs/ROADMAP.md](./docs/ROADMAP.md) for sequencing.

Post jobs, bid on work, deliver, and get paid.

- Escrow
- Milestones
- Reputation
- AI matching
- Dispute resolution
- 0% platform fee

### Agent Services *(partially implemented, not complete)*

The repo already includes machine-payable and agent-facing APIs, but not yet a full end-user agent marketplace experience.

- Machine-readable catalog and quoting
- Agent purchase initiation
- L402-oriented direction
- Composable agent workflows on the roadmap

---

## Feature Status

| Feature | Status | Notes |
|---------|--------|-------|
| Stripe payments | ✅ Live | Full checkout flow exists |
| Magic link auth | ✅ Live | Backend implemented |
| OAuth SSO | ✅ Live | OAuth 2.0 + PKCE backend implemented |
| Course platform | ⚠️ Partial | Backend and components exist; end-to-end checkout flow still needs proof |
| Email marketing | ⚠️ Partial | Backend exists; production delivery and UI validation still needed |
| Funnel builder | ⚠️ Partial | Module exists; full live integration still needs proof |
| AI page builder | ✅ Live | Intent parsing with fallback behavior |
| AI discovery | ✅ Live | Semantic search with keyword fallback |
| AI store builder | ⚠️ Beta | Generate, render, save, preview, publish, and intake routes exist |
| Federation network | ⚠️ Partial | Route surface exists; live-network validation still needed |
| Multi-brand system | ✅ Live | Brand catalogs and storefront patterns exist |
| Crypto checkout | ⚠️ Manual | BTC/Lightning/Monero proof-based flow |
| Memberships/subscriptions | ⚠️ Partial | Backend routes and schema exist; UI and live billing proof remain |
| Referrals/revenue sharing | ⚠️ Partial | Capture and commission tracking are wired; live payout validation remains |
| Nostr auth (NIP-07) | ⚠️ Backend only | Backend support exists, frontend UX incomplete |
| ArxMint payments | ⚠️ Partial | Provider and webhook surfaces exist; full Lightning/Cashu path is not proven |
| Machine-payable endpoints | ⚠️ Beta | `/api/machine/*` exists for AI-agent commerce |
| Agent services | ⚠️ Beta | `/api/agent/*` exists, not a full marketplace product |
| Gig platform | 🗺️ Roadmap | Jobs, proposals, contracts, escrow |
| NFT proof of ownership | 🗺️ Roadmap | On-chain purchase receipts |

### Verification Snapshot

- The implemented surface area is broad.
- The automated baseline is green.
- The immediate priority is production proof and test-hygiene cleanup before expansion.

---

## Quick Start

```bash
git clone https://github.com/Traviseric/openbazaar-ai.git
cd openbazaar-ai
npm install
cp marketplace/backend/.env.example marketplace/backend/.env
npm run dev
```

Open `http://localhost:3001`. Edit `.env` for Stripe keys, email config, auth settings.

If you are working on the full stack, also review the root `.env.example`.

### With Docker

```bash
git clone https://github.com/Traviseric/openbazaar-ai.git
cd openbazaar-ai
cp .env.example .env
docker-compose up -d
```

### Stack

| Layer | Tech |
|-------|------|
| Runtime | Node.js 18+ / Express.js |
| Database | SQLite with Postgres/Supabase runtime path |
| Payments | Stripe + ArxMint-oriented crypto flows |
| Auth | Magic links, OAuth SSO, Nostr/NIP support |
| Frontend | Vanilla HTML/CSS/JS |
| Search | OpenAI embeddings + keyword fallback |
| Federation | RSA-signed peer discovery |
| Deploy | Docker, Railway, Render, Vercel, VPS |

---

## The Network

This is intended to become a **federated network of stores**. The codebase already includes discovery, peer, and referral surfaces, but the live-network economics still need proof.

```text
   +-----+         +-----+
   |Store|<------->|Store|
   |  A  |         |  B  |
   +--+--+         +--+--+
      |    +-----+    |
      +--->|Store|<---+
           |  C  |
           +--+--+
              |
         +----+----+
         |   You   |
         | new node|
         +---------+
```

- Join on boot
- Shared traffic
- Referral economics
- Independence
- Resilience

---

## Deploy Your Own Node

```bash
git clone https://github.com/Traviseric/openbazaar-ai.git
cd openbazaar-ai
cp .env.example .env
docker-compose up -d
```

**Deploy anywhere:** Docker, Railway, Render, DigitalOcean, offshore hosting.

**Full guide:** [48-Hour Launch](./docs/quick-start/MVP_48_HOUR_LAUNCH.md)

| Tier | Price | What You Get |
|------|-------|-------------|
| **Self-hosted** | Free | Clone, deploy, own the stack |
| **Managed** | $29–149/mo | Billing routes exist; managed operations still being hardened |
| **Done-for-you** | Custom | Full setup, branding, migration |

---

## Documentation

| Guide | What it covers |
|-------|---------------|
| [Current Status](./docs/reference/MARKETPLACE_STATUS_AND_TODO.md) | Accurate implementation state, verification, and next steps |
| [Quick Deploy](./docs/quick-start/QUICK_DEPLOY.md) | Fastest path to running |
| [48-Hour Launch](./docs/quick-start/MVP_48_HOUR_LAUNCH.md) | Full weekend deployment |
| [Dual-Mode Architecture](./docs/core/DUAL_MODE_ARCHITECTURE.md) | Primary + fallback payments |
| [Auth Setup](./docs/integration/AUTH_SETUP.md) | Magic links, OAuth, Nostr |
| [Operator Guide](./docs/OPERATOR_GUIDE.md) | Managed AI store-build workflow |
| [Security Guide](./docs/reference/SECURITY_SETUP_GUIDE.md) | Hardening for production |
| [Trademark Automation](./docs/legal/TRADEMARK_AUTOMATION.md) | Filing packet + docket workflow |
| [API Reference](./marketplace/backend/API-DOCUMENTATION.md) | REST API docs |
| [Roadmap](./docs/ROADMAP.md) | Strategic priorities and execution gates |
| [Changelog](./CHANGELOG.md) | Meaningful changes over time |

---

## Roadmap

### Phase 0: Stabilize What Already Exists *(current)*
Get the test suite green, validate the production Postgres/Supabase path, prove one real digital order and one real POD order, and finish the public auth/account journey.

### Phase 1: Creator Baseline
Complete the creator-critical flows that already have major code surface: subscriptions UX, email delivery, course checkout, fulfillment admin, and account management.

### Phase 2: AI Store Builder Reliability
Turn the existing builder beta and managed intake flow into a repeatable, evidence-backed delivery engine.

### Phase 3: Crypto Differentiators
Deepen ArxMint, Lightning, Nostr, L402, and machine-payable flows after the baseline is stable.

### Phase 4: Network Scale
NIP-99 federation, migration tooling, stronger discovery, and validated referral economics.

### Phase 5: Scale & Polish
Premium themes, memberships polish, PWA work, integrations, and ranking/discovery refinement.

[Full roadmap →](./docs/ROADMAP.md)

---

## Contributing

Fork → branch → PR. See [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## License

MIT — do whatever you want with it. See [LICENSE](./LICENSE).

---

<p align="center">
  <strong>OpenBazaar.ai</strong> — The open marketplace.<br>
  <a href="https://openbazaar.ai">openbazaar.ai</a> · Payments by <a href="https://github.com/Traviseric/arxmint">ArxMint</a> · Identity by <a href="https://nostr.com">Nostr</a>
</p>
