# Teneo Marketplace

**The open source creator platform with a discovery network.** Every store that joins makes the network stronger.

Store. Courses. Funnels. Email marketing. Cross-store discovery. $0/month. Self-hosted or cloud. Crypto payments via [ArxMint](https://github.com/Traviseric/arxmint). Nostr identity. Can't be deplatformed.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![Payments](https://img.shields.io/badge/Payments-Stripe%20%7C%20Lightning%20%7C%20Ecash-success.svg)](./docs/features/INFORMATION_ASYMMETRY_IMPLEMENTATION.md)
[![Auth](https://img.shields.io/badge/Auth-Nostr%20%7C%20OAuth%20%7C%20Magic%20Links-orange.svg)](./docs/integration/AUTH_SETUP.md)
[![Network](https://img.shields.io/badge/Network-Federated-blueviolet.svg)](./docs/core/DUAL_MODE_ARCHITECTURE.md)

---

## Why This Exists

Creators are paying $5,000–$16,000/year in platform fees and payment processing to sell digital products:

| Platform | Monthly | Transaction Fees | Annual cost on $10k/mo |
|----------|---------|-----------------|----------------------|
| ClickFunnels | $97–$297 | 5% + Stripe 2.9% | **$10,600–$11,800** |
| Gumroad | $0 | 10% + $0.50 + Stripe 2.9% | **$16,200** |
| Teachable | $39–$119 | 5% (basic) + Stripe 2.9% | **$9,948** |
| Kajabi | $179–$499 | Stripe 2.9% | **$5,628** |
| Podia | $89 | Stripe 2.9% | **$4,548** |
| **Teneo Marketplace** | **$0** | **$0 (crypto) or 2.9% (Stripe)** | **$0–$3,480** |

Open source means no subscription. Crypto payments via ArxMint mean no transaction fees. **A creator doing $10k/month on Gumroad keeps an extra $16,200/year.**

But this isn't just about saving money.

---

## The Bigger Picture: A Circular Creator Economy

> **Part of the open creator economy.** Teneo Marketplace is the storefront. [ArxMint](https://github.com/Traviseric/arxmint) is the payment network — private Fedimint/Cashu mints, Lightning rails, L402 paywalls. Together: a complete creator platform where money circulates and nobody can shut you down.

Bitcoin's biggest problem: it's held, not spent. There's nothing to buy. ArxMint builds the payment rails (community ecash mints, Lightning). **Teneo Marketplace gives people a reason to spend** — courses, books, digital products, all purchasable with ecash.

A community spins up a Fedimint mint via ArxMint. Members hold ecash. A creator sells a course on Teneo Marketplace. Members pay with ecash. The creator spends those sats at another creator's store. **That's a circular economy** — not a whitepaper, an actual working loop.

**Three layers of sovereignty:**
- **Own your store** — open source, self-hosted, no platform can ban you or change their ToS
- **Own your payments** — decentralized ecash via ArxMint, no Stripe/PayPal freezing your funds
- **Own your identity** — Nostr keypair (sign in with [Alby](https://getalby.com)), no platform owns your account

---

## What's Included

Everything you need to replace paid creator platforms:

**Store** — Digital products, cart, checkout, order management. Stripe for fiat, ArxMint for crypto.

**Courses** — Video, audio, text, quizzes. Drip content, cohort delivery, progress tracking, certificates, discussion forums. [Docs →](./docs/features/COURSES_PLATFORM_IMPLEMENTATION.md)

**Funnels** — Landing pages, sales funnels, conversion tracking.

**Email Marketing** — List management, segmentation, automation sequences (welcome series, cart abandonment), open/click tracking. [Docs →](./docs/features/EMAIL_MARKETING_IMPLEMENTATION.md)

**Website Builder** — Templates with AI customization, multi-brand support, mobile-responsive.

**Analytics** — Sales, email performance, student engagement, funnel conversions.

**Authentication** — Three options: local magic links (zero deps), Teneo Auth SSO (OAuth 2.0 + PKCE), Nostr (NIP-07 via Alby). [Auth setup →](./docs/integration/AUTH_SETUP.md)

**Dual-Mode Operation** — Primary: Stripe + standard hosting. Fallback: crypto + offshore VPS. Automatic failover when primary is disrupted. [Architecture →](./docs/core/DUAL_MODE_ARCHITECTURE.md)

---

## The Discovery Network

This isn't just a storefront — it's a **network of storefronts** where every store joining makes every other store more valuable.

**How it works:** Deploy your store → it automatically joins the discovery network → your products appear in cross-store search → customers browsing other stores find you → you earn from your products, other stores earn referral fees for sending you traffic.

**Think Amazon, but decentralized.** Amazon's real product isn't the store — it's the traffic and distribution. Teneo's discovery network does the same thing without a central platform taking 30%. Stores keep 80-90% of revenue; referring stores earn 10-20% for sending customers.

**What's built today:**
- Cross-store search and catalog aggregation across the network
- Store registry with health checks and RSA-signed communications
- Network explorer UI with search, stats, and store connections
- AI discovery service — semantic search, reading paths, knowledge graph
- Frontend network client with caching

**What's coming (discovery upgrades ship alongside every marketplace phase):**

| Version | Ships With | What It Adds |
|---------|-----------|-------------|
| **v0** | MVP | Cross-store search, product feed, network page |
| **v1** | Checkout features | Categories, trending products, "stores like this" |
| **v2** | Revenue tools | Semantic search, AI reading paths, knowledge graph |
| **v3** | Crypto payments | NIP-99 Nostr listings, relay-based decentralized search |
| **v4** | Network scale | Transformation-based ranking, community validation |

[Full discovery roadmap →](./docs/ROADMAP.md)

### Store-in-a-Box: Join the Network

| Tier | Price | What You Get |
|------|-------|-------------|
| **Self-hosted** | Free | `git clone`, deploy anywhere, auto-join the network |
| **Managed** | $29-149/mo | One-click deploy on Teneo Cloud, auto-updates, SSL, email |
| **Done-for-you** | Custom | Full store setup, branding, product migration, training |

---

## Documentation

**Start here: [docs/README.md](./docs/README.md)**

| Guide | What it covers |
|-------|---------------|
| [Dual-Mode Architecture](./docs/core/DUAL_MODE_ARCHITECTURE.md) | How the system stays online under attack |
| [48-Hour Launch Guide](./docs/quick-start/MVP_48_HOUR_LAUNCH.md) | Deploy your own node this weekend |
| [Auth Setup](./docs/integration/AUTH_SETUP.md) | Local, OAuth SSO, and Nostr authentication |
| [Security Guide](./docs/reference/SECURITY_SETUP_GUIDE.md) | Production hardening, audit logging, breach response |
| [API Documentation](./marketplace/backend/API-DOCUMENTATION.md) | Full REST API reference |

---

## Quick Start

### Prerequisites
- Node.js 18+
- SQLite (included)

### Installation
```bash
git clone https://github.com/Traviseric/teneo-marketplace.git
cd teneo-marketplace/marketplace/backend
npm install
cp .env.example .env
npm run dev
```

API at `http://localhost:3001/api`. Edit `.env` for Stripe keys, auth provider, email config.

---

## Architecture

- **Runtime**: Node.js + Express.js
- **Database**: SQLite (PostgreSQL ready)
- **Auth**: Pluggable providers (local, OAuth SSO, Nostr)
- **Payments**: Stripe (fiat) + ArxMint (Lightning/ecash)
- **Frontend**: Multi-brand template system, mobile-responsive

Full API docs: [API-DOCUMENTATION.md](./marketplace/backend/API-DOCUMENTATION.md)

---

## Roadmap

Each phase ships marketplace features **and** a discovery network upgrade in parallel.

### Phase 0: MVP + Discovery v0 ✅
- ✅ Store, courses, email marketing, funnels
- ✅ Stripe payments (fiat), auth system, dual-mode operation
- ✅ Cross-store search, network page, store registry

### Phase 1: Checkout Conversion + Discovery v1 (Current)
- Coupons, order bumps, upsells, cart recovery, content protection
- Categories, trending products, "stores like this" recommendations

### Phase 2: Revenue & Distribution + Discovery v2
- Affiliate program, tax workflow, managed hosting, migration tooling
- Semantic search (AI embeddings), reading paths, knowledge graph

### Phase 3: Crypto Differentiators + Discovery v3
- ArxMint payment integration (Lightning/ecash), Nostr auth, L402 paywalls
- NIP-99 product listings, Nostr relay-based decentralized search

### Phase 4: Network Scale + Discovery v4
- Circular economy, liquidity bootstrap, 100+ federated nodes
- Transformation-based ranking, community validation, progressive disclosure

[Full roadmap →](./docs/ROADMAP.md)

---

## Deploy Your Own Node

```bash
git clone https://github.com/Traviseric/teneo-marketplace.git
cd teneo-marketplace
cp .env.example .env    # Configure payments, auth, email
docker-compose up -d    # Deploy
```

**Deployment options:** Docker, Railway, Render, any VPS, offshore hosting.

**Full guide:** [MVP_48_HOUR_LAUNCH.md](./docs/quick-start/MVP_48_HOUR_LAUNCH.md)

**Why run a node?** Your store joins the discovery network on first boot. 100% of your own sales. 10-20% referral fees when network search sends customers to you. Your brand, your audience, your data. If one node goes down, the network continues.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Fork, branch, PR.

---

## License

MIT — see [LICENSE](./LICENSE).

---

**Part of the open creator economy.** [ArxMint](https://github.com/Traviseric/arxmint) (payments) + Teneo Marketplace (storefront + discovery network) + [Nostr](https://nostr.com) (identity) = a circular crypto economy where every store makes the network stronger.