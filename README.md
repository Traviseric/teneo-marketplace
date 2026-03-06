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

An open-source platform that combines a **product marketplace** (Gumroad/Shopify), a **freelance gig platform** (Upwork/Fiverr — *coming soon*), and **AI agent services** — with zero platform fees. Payments powered by [ArxMint](https://github.com/Traviseric/arxmint).

```
┌─────────────────────────────────────────────────┐
│                 OpenBazaar.ai                    │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │Marketplace│  │   Gigs   │  │  Agents  │      │
│  │ Products  │  │ Services │  │ AI Tasks │      │
│  │ Courses   │  │ Escrow   │  │ L402 Pay │      │
│  │ Funnels   │  │ Reviews  │  │ Auto-rep │      │
│  └─────┬─────┘  └─────┬────┘  └─────┬────┘      │
│        │              │              │           │
│  ┌─────┴──────────────┴──────────────┴─────┐    │
│  │          ArxMint Payment Layer           │    │
│  │   Lightning · Ecash · Stripe · L402     │    │
│  └─────────────────────────────────────────┘    │
│                                                  │
│  ┌─────────────────────────────────────────┐    │
│  │        Federation Network               │    │
│  │   Discovery · Cross-store search · P2P  │    │
│  └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
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

### 🏪 Marketplace
Sell digital and physical products. Books, courses, templates, software, print-on-demand.

- Multi-brand storefronts (white-label)
- Course platform with quizzes and certificates
- Funnel builder with landing pages and email sequences
- Print-on-demand via Lulu
- AI-powered discovery and semantic search
- Component library with 55+ templates

### 💼 Gig Platform *(coming soon)*

> **Status: Planned — not yet implemented.** The gig platform (jobs, proposals, milestones, escrow) is on the roadmap for a future phase. See [docs/ROADMAP.md](./docs/ROADMAP.md) for the implementation timeline.

Post jobs, bid on work, deliver and get paid.

- **Escrow** — ArxMint holds payment in Cashu multisig until delivery confirmed
- **Milestones** — Break big jobs into funded chunks
- **Reputation** — Nostr-signed reviews, portable and verifiable
- **AI Matching** — Smart job-to-freelancer recommendations
- **Dispute Resolution** — 2-of-3 multisig arbitration
- **0% platform fee** — ArxMint processing only

### 🤖 Agent Services *(coming soon)*
AI agents as hireable service providers on the platform.

- Agents list capabilities and pricing
- L402 micropayments for per-use calls
- Agent reputation from task quality
- Composable agent workflows

---

## Feature Status

| Feature | Status | Notes |
|---------|--------|-------|
| Stripe payments | ✅ Live | Full checkout flow |
| Magic link auth | ✅ Live | Zero external deps |
| OAuth SSO | ✅ Live | OAuth 2.0 + PKCE |
| Course platform | ✅ Live | Video, audio, text, quizzes, certs |
| Email marketing | ✅ Live | Sequences, segmentation, tracking |
| Funnel builder | ✅ Live | Landing pages, conversion tracking |
| AI page builder | ✅ Live | OpenAI-powered intent parsing (requires `OPENAI_API_KEY`; falls back to default templates without it) |
| AI discovery | ✅ Live | Semantic search (requires OPENAI_API_KEY) |
| Federation network | ✅ Live | Cross-store search, peer discovery |
| Multi-brand system | ✅ Live | Separate storefronts per brand |
| Crypto checkout | ⚠️ Manual | BTC/Lightning/Monero address + proof |
| Gig platform | 🗺️ Roadmap | Jobs, proposals, contracts, escrow |
| Nostr auth (NIP-07) | ⚠️ Backend only | Backend provider ready, no frontend UI |
| ArxMint payments | 🗺️ Roadmap | L402, Lightning, Cashu ecash |
| Agent services | 🗺️ Roadmap | L402 micropayments for AI agents |
| NFT proof of ownership | 🗺️ Roadmap | On-chain purchase receipts |

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
| Database | SQLite (Postgres-ready) |
| Payments | Stripe + ArxMint (Lightning/ecash) |
| Auth | Magic links, OAuth SSO, Nostr NIP-07 |
| Frontend | Vanilla HTML/CSS/JS — no framework, fast, forkable |
| Search | OpenAI embeddings + keyword fallback |
| Federation | RSA-signed peer discovery |
| Deploy | Docker, Railway, Render, Vercel, any VPS |

---

## The Network

This isn't just a store — it's a **federated network of stores**. Every node that joins makes discovery stronger for everyone.

```
   ┌─────┐         ┌─────┐
   │Store│◄────────►│Store│
   │  A  │         │  B  │
   └──┬──┘         └──┬──┘
      │    ┌─────┐    │
      └───►│Store│◄───┘
           │  C  │
           └──┬──┘
              │
         ┌────┴────┐
         │  You    │
         │(new node)│
         └─────────┘
```

- **Join on boot** — your store auto-registers in the discovery network
- **Shared traffic** — your products appear in cross-store search
- **Revenue share** — referring stores earn 10-20% for sending buyers
- **Independence** — your data, your rules, your uptime
- **Resilience** — if one node goes down, the network continues

---

## Deploy Your Own Node

```bash
git clone https://github.com/Traviseric/openbazaar-ai.git
cd openbazaar-ai
cp .env.example .env    # Configure payments, auth, email
docker-compose up -d    # Deploy
```

**Deploy anywhere:** Docker, Railway, Render, DigitalOcean, offshore hosting.

**Full guide:** [48-Hour Launch](./docs/quick-start/MVP_48_HOUR_LAUNCH.md)

| Tier | Price | What You Get |
|------|-------|-------------|
| **Self-hosted** | Free | Clone, deploy, auto-join network |
| **Managed** | $29–149/mo | One-click deploy, auto-updates, SSL |
| **Done-for-you** | Custom | Full setup, branding, migration |

---

## Documentation

| Guide | What it covers |
|-------|---------------|
| [Quick Deploy](./docs/quick-start/QUICK_DEPLOY.md) | Fastest path to running |
| [48-Hour Launch](./docs/quick-start/MVP_48_HOUR_LAUNCH.md) | Full weekend deployment |
| [Dual-Mode Architecture](./docs/core/DUAL_MODE_ARCHITECTURE.md) | Primary + fallback payments |
| [Auth Setup](./docs/integration/AUTH_SETUP.md) | Magic links, OAuth, Nostr |
| [Security Guide](./docs/reference/SECURITY_SETUP_GUIDE.md) | Hardening for production |
| [Trademark Automation](./docs/legal/TRADEMARK_AUTOMATION.md) | Filing packet + docket workflow for brand protection |
| [API Reference](./marketplace/backend/API-DOCUMENTATION.md) | Full REST API docs |
| [Roadmap](./docs/ROADMAP.md) | Where this is going |

---

## Roadmap

### Phase 0: MVP Launch *(current)*
Frontend auth UI, email config, end-to-end purchase flow, ship existing federation.

### Phase 1: Checkout Conversion
Coupons, order bumps, upsells, cart recovery, content protection, trending products.

### Phase 2: Revenue & Distribution
Affiliate program, tax workflow, gig platform, migration tooling, managed hosting ($29-149/mo).

### Phase 3: Crypto Differentiators
ArxMint integration (Lightning, Cashu ecash), Nostr auth, L402 paywalls, dispute resolution.

### Phase 4: Network Scale
NIP-99 federation, agent services, cross-store referrals, circular economy metrics.

### Phase 5: Scale & Polish
Premium themes, memberships, PWA, integrations, community-validated ranking.

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
