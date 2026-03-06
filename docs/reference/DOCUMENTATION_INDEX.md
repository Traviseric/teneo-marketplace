# OpenBazaar AI - Documentation Index

**Last Updated:** 2026-03-05

---

## Source of Truth

These three documents are authoritative. All other docs reference them:

| Document | Purpose |
|----------|---------|
| [ROADMAP.md](../ROADMAP.md) | Strategic priorities, research findings, phased build plan |
| [MARKETPLACE_STATUS_AND_TODO.md](./MARKETPLACE_STATUS_AND_TODO.md) | What's built, what's not, time estimates, MVP path |
| [README.md](../../README.md) | Public-facing summary, quick start, feature status |

---

## Current Implementation Status

**Backend:** Production-ready (26 routes, 27+ services, 10 DB schemas, 17 test suites passing)

**What's working:**
- Stripe payments (checkout + refunds + webhooks)
- Crypto checkout (BTC/Lightning/Monero, manual verification)
- Auth (magic links + OAuth SSO + Nostr backend)
- Course platform (CRUD, enrollment, quizzes, certificates)
- Email marketing (sequences, segmentation, tracking)
- Funnel builder (4 templates)
- Print-on-demand (Lulu API)
- AI discovery (semantic search + keyword fallback)
- Federation (peer discovery, cross-store search)
- Admin dashboard (orders, analytics, audit logging)

**What's not built:**
- Gig platform (0%)
- Agent services (scaffold only)
- ArxMint payments (stubbed)
- Checkout conversion stack (coupons, bumps, upsells)
- Content protection, affiliates, tax workflow
- Health monitoring / failover

**MVP blocker:** Frontend auth UI (~6 hours) + email config (~1 hour)

---

## Documentation by Category

### Getting Started
| Document | What it covers |
|----------|---------------|
| [Quick Start](../quick-start/QUICKSTART.md) | 10-min local demo |
| [Quick Deploy](../quick-start/QUICK_DEPLOY.md) | 30-min VPS deployment |
| [48-Hour Launch](../quick-start/MVP_48_HOUR_LAUNCH.md) | Full weekend deployment guide |

### Architecture
| Document | What it covers |
|----------|---------------|
| [ROADMAP.md](../ROADMAP.md) | Research-informed strategy, 5-phase plan, architecture decisions |
| [Dual-Mode Architecture](../core/DUAL_MODE_ARCHITECTURE.md) | Primary (Stripe) + fallback (crypto) design. Note: health monitoring/failover documented but not yet implemented |
| [Implementation Map](../core/IMPLEMENTATION_MAP.md) | What's built, architecture overview, test status |
| [OpenBazaar AI Spec](./OPENBAZAAR_AI_SPEC.md) | Full site spec including gig platform and agent services (aspirational -- gig/agent features not yet built) |

### Integration
| Document | What it covers |
|----------|---------------|
| [Auth Setup](../integration/AUTH_SETUP.md) | Configuring magic links, OAuth, Nostr |
| [Integration Guide](../integration/INTEGRATION_GUIDE.md) | Connecting to other systems |
| [Teneo Auth OAuth](../integration/TENEO_AUTH_OAUTH_CLIENT_SETUP.md) | SSO setup with Teneo Auth |
| [Webhook Testing](../integration/WEBHOOK_TESTING_GUIDE.md) | Testing webhooks locally |

### Features
| Document | What it covers | Status |
|----------|---------------|--------|
| [Course Platform](../features/COURSE_PLATFORM_INTEGRATION.md) | Course integration plan | Components built, not integrated into marketplace checkout |
| [Funnel Builder](../features/FUNNEL_BUILDER_INTEGRATION_PLAN.md) | Funnel system design | Working (4 templates) |
| [AI Discovery](../features/AI_DISCOVERY_ENGINE.md) | Semantic search engine | Working (requires OPENAI_API_KEY) |
| [Honest Conversion](../features/HONEST_CONVERSION_ARCHITECTURE.md) | Ethical conversion patterns | Design doc |

### Deployment
| Document | What it covers |
|----------|---------------|
| [Quick Deploy](../quick-start/QUICK_DEPLOY.md) | Single-VPS deployment |
| [Security Setup](./SECURITY_SETUP_GUIDE.md) | Production hardening |

### Reference
| Document | What it covers |
|----------|---------------|
| [API Specification](./API_SPECIFICATION.md) | REST API endpoints |
| [Changelog](./CHANGELOG.md) | Version history (v1.0.0 and v2.0.0) |
| [Status & TODO](./MARKETPLACE_STATUS_AND_TODO.md) | Detailed build status and next steps |

### Legal
| Document | What it covers |
|----------|---------------|
| [Trademark Automation](../legal/TRADEMARK_AUTOMATION.md) | Filing packet and docket workflow |

---

## Stack

| Layer | Tech |
|-------|------|
| Runtime | Node.js 18+ / Express.js |
| Database | SQLite (Postgres-ready) |
| Payments | Stripe + ArxMint (Lightning/ecash -- planned) |
| Auth | Magic links, OAuth SSO, Nostr NIP-07 |
| Frontend | Vanilla HTML/CSS/JS |
| Search | OpenAI embeddings + keyword fallback |
| Federation | RSA-signed peer discovery |
| Deploy | Docker, Render, Vercel, any VPS |
| Tests | Jest (17 suites, 158 tests) |

---

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md). Public repo -- never commit `.env`, `.db`, PDFs, or private business files.
