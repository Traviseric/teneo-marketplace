# openbazaar-ai: Implementation Plan

**Last Updated:** 2026-03-05

> **Strategic roadmap:** See **[docs/ROADMAP.md](../ROADMAP.md)** for research-informed priorities, architecture decisions, and phased build plan.
> **Current status:** See **[MARKETPLACE_STATUS_AND_TODO.md](./MARKETPLACE_STATUS_AND_TODO.md)** for what's built vs what's not.

## Mission Statement

**The open source creator platform with crypto payments.** Replace ClickFunnels, Gumroad, Teachable, Kajabi, and Podia with:
- $0 platform fees (open source, self-hosted)
- Bitcoin/Lightning/ecash payments via ArxMint
- Nostr identity (NIP-07/NIP-98)
- Dual-mode: Stripe for fiat, ArxMint for crypto

**Part of a circular creator economy:** ArxMint (payment rails) + OpenBazaar AI (storefront) + Nostr (identity).

**Philosophy**: Build the switching baseline first (checkout conversion, content protection, affiliates), then layer crypto differentiators on a solid foundation.

---

## Project Scope

### What We Build

1. **Creator Storefront** -- Digital products, cart, checkout, coupons, bumps, upsells, content protection
2. **Course Platform** -- Video/content player, quizzes, certificates, progress tracking
3. **Email Marketing** -- List management, segmentation, automation sequences, tracking
4. **Funnel Builder** -- Landing pages, conversion tracking, templates
5. **Affiliate System** -- Tracking links, commission calculation, automated payouts
6. **Payment Processing** -- Stripe (fiat) + ArxMint (Lightning/ecash), BIP21 QR, three-mode checkout
7. **Dispute Resolution** -- Signed receipts, Cashu P2PK escrow, BTCPay refunds
8. **Authentication** -- Magic links, Teneo Auth SSO, Nostr NIP-07
9. **Federation Network** -- NIP-99 listings, cross-store discovery, referral revenue sharing
10. **Gig Platform** -- Jobs, proposals, escrow, milestones, reputation (planned)
11. **Agent Services** -- L402 micropayments, capability registry (planned)

### What We Don't Build

- **Merchant of Record** -- Creators are sellers; we provide tax workflow tools
- **Video Hosting CDN** -- Use Vimeo/YouTube/S3/Cloudflare R2
- **Native Mobile App** -- PWA first; native later

---

## What's Built (March 2026)

| System | Status | Routes/Services |
|--------|--------|-----------------|
| Express backend | Production-ready | 26 routes, 27+ services |
| Stripe payments | Working | checkout, checkoutProduction, checkoutMixed |
| Crypto checkout | Working (manual) | cryptoCheckout |
| Auth system | Backend complete | 3 providers, no frontend UI |
| Course platform | Working | courseRoutes, quiz, certificates |
| Email marketing | Working | sequences, segmentation, tracking |
| Funnel builder | Working | 4 templates |
| Print-on-demand | Working | Lulu API integration |
| AI discovery | Working | Semantic search + keyword fallback |
| Federation | Working | Peer discovery, cross-store search |
| Admin dashboard | Working | Orders, analytics, refunds |
| Publisher features | Working | Amazon tracking, leaderboards, badges |
| Component library | 24% | 12/50 components |
| Tests | 100% passing | 17 suites, 158 tests |

## What's Not Built

| Feature | Phase | Priority | Time Estimate |
|---------|-------|----------|---------------|
| Frontend auth UI | 0 (MVP) | CRITICAL | 6 hours |
| Checkout conversion (coupons, bumps, upsells) | 1 | CRITICAL | 16-20 hours |
| Content protection (PDF stamping, watermarks) | 1 | CRITICAL | 10-14 hours |
| Affiliate program | 2 | HIGH | 12-16 hours |
| Tax workflow | 2 | HIGH | 12-16 hours |
| Migration tooling (Gumroad/Teachable import) | 2 | HIGH | 12 hours |
| Managed hosting infrastructure | 2 | HIGH | 12 hours |
| ArxMint payment integration | 3 | HIGH | 24-30 hours |
| Nostr auth frontend | 3 | MEDIUM | 8-12 hours |
| L402 paywalls | 3 | MEDIUM | 8-12 hours |
| Dispute resolution (receipts, escrow) | 3 | HIGH | 16-20 hours |
| Health monitoring / failover | Deferred | MEDIUM | 12-16 hours |
| Gig platform | 2 | HIGH | 40+ hours |
| Agent services | 4 | MEDIUM | 20+ hours |
| NIP-99 federation | 4 | MEDIUM | 8 hours |

---

## Build Phases

### Phase 0: MVP Launch (6-8 hours)
- Create login/register UI
- Wire frontend to auth endpoints
- Configure email service
- Test full purchase flow
- Ship existing federation

### Phase 1: Checkout Conversion (26-34 hours)
- Coupons & discount codes
- Order bumps
- Post-purchase upsells
- Cart abandonment recovery
- Content protection (PDF stamping, watermarks, license keys)
- Discovery v1 (categories, trending, recommendations)

### Phase 2: Revenue & Distribution (40-48 hours)
- Affiliate program
- Tax workflow
- Gig platform (jobs, proposals, escrow)
- Migration tooling
- Managed hosting (first revenue stream, $29-149/mo)
- Discovery v2 (semantic search, knowledge graph)

### Phase 3: Crypto Differentiators (52-70 hours)
- ArxMint payments (BIP21, three-mode checkout, payout routing)
- Nostr auth (NIP-07 + NIP-98)
- L402 paywalls
- Dispute resolution (receipts, Cashu P2PK escrow)
- Regulatory compliance (Path B partnership)

### Phase 4: Network Scale (40-52 hours)
- NIP-99 product listings
- Agent services (L402 micropayments)
- Cross-store referral system
- Circular economy metrics
- Discovery v3 (Nostr-native)

### Phase 5: Scale & Polish (ongoing)
- Premium themes marketplace
- Memberships & subscriptions
- PWA for mobile
- Integrations (webhooks, API, Zapier)

---

Full strategic analysis: [ROADMAP.md](../ROADMAP.md)
