# Teneo Marketplace

**The open source replacement for ClickFunnels, Gumroad, Teachable, and Kajabi.**

Store. Courses. Funnels. Email marketing. $0/month. Self-hosted or cloud. Crypto payments via [ArxMint](https://github.com/Traviseric/arxmint). Nostr identity. Can't be deplatformed.

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

**Federated Network** — Cross-store discovery, 10-20% referral revenue sharing. Can't shut down a network of independent nodes.

**Dual-Mode Operation** — Primary: Stripe + standard hosting. Fallback: crypto + offshore VPS. Automatic failover when primary is disrupted. [Architecture →](./docs/core/DUAL_MODE_ARCHITECTURE.md)

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

### Phase 1: Core Platform ✅
- ✅ Store, courses, email marketing, funnels
- ✅ Stripe payments (fiat)
- ✅ Auth system (local magic links + OAuth SSO + PKCE)
- ✅ Dual-mode operation (Stripe primary, crypto fallback)
- ✅ Production security hardening

### Phase 2: Crypto Payments + Nostr Identity (Current)
- ArxMint payment integration (Lightning checkout, ecash)
- Nostr auth in marketplace (NIP-07 via Alby — already built in ArxMint)
- Cross-project sessions (marketplace <-> ArxMint shared HMAC tokens)
- Federated cross-store discovery

### Phase 3: Circular Economy
- Community mints (Fedimint/Cashu via ArxMint) connected to marketplace stores
- L402 paywalls for premium content (pay-per-article, pay-per-lesson)
- Nostr-based product discovery (NIP-15/NIP-99 marketplace events)
- Referral revenue sharing via Lightning (instant affiliate payouts)

### Phase 4: Network Scale
- 100+ independent federated nodes
- Nostr relay-based product indexes
- Multi-language support
- Mobile PWA

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

**Why run a node?** 100% of your own sales. 10-20% referral fees from network discovery. Your brand, your audience. If one node goes down, the network continues.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Fork, branch, PR.

---

## License

MIT — see [LICENSE](./LICENSE).

---

**Part of the open creator economy.** [ArxMint](https://github.com/Traviseric/arxmint) (payments) + Teneo Marketplace (storefront) + [Nostr](https://nostr.com) (identity) = a circular crypto economy for creators.