# teneo-marketplace: Implementation Plan

> **Note:** Strategic roadmap, phased priorities, and architecture decisions are now in **[docs/ROADMAP.md](../ROADMAP.md)**, informed by Gemini Deep Research outputs 1-6. This file retains the technical implementation scope.

## Mission Statement

**The open source creator platform with crypto payments.** Replace ClickFunnels, Gumroad, Teachable, Kajabi, and Podia with:
- $0 platform fees (open source, self-hosted)
- $0 transaction fees via Bitcoin/Lightning/ecash payments (ArxMint)
- Nostr identity (NIP-07/NIP-98) — no platform owns your account
- Can't be deplatformed — self-hosted with decentralized payments
- Dual-mode: Stripe for fiat, ArxMint for crypto

**Part of a circular creator economy:** ArxMint (payment rails) + Teneo Marketplace (storefront) + Nostr (identity). Creators sell, buyers pay with ecash from community mints, money circulates.

**Philosophy**: Build the switching baseline first (checkout conversion, content protection, affiliates), then layer crypto differentiators on a solid foundation. Build what's unique, integrate what exists.

---

## Project Scope

### ✅ What We Build

**1. Creator Storefront**
- Digital products (books, downloads, templates, software)
- Cart, checkout, order management
- Coupons, order bumps, post-purchase upsells, cart abandonment recovery
- Content protection (PDF stamping, watermarks, license keys, versioning)
- Reviews and ratings

**2. Course Platform**
- Video/content player with progress tracking
- Quiz engine and certificate generation
- Drip content and cohort delivery
- Discussion forums (Nostr-aligned federated community)
- Markdown lesson support

**3. Email Marketing**
- Built-in list management and segmentation
- Automation sequences (welcome, cart abandonment, post-purchase)
- Open/click tracking
- SMTP + Resend adapters

**4. Funnel Builder**
- Landing pages and sales funnels
- Conversion tracking
- Templates (Gated, Bundle, Magnet, Direct, VSL)

**5. Affiliate System**
- Self-serve affiliate signup
- Tracking links, commission calculation
- Automated payouts (Stripe + Lightning)
- Anti-fraud controls

**6. Payment Processing**
- Stripe (fiat — cards, BNPL)
- ArxMint (crypto — Lightning invoices, ecash tokens via Cashu/Fedimint)
- Tax calculation workflow (not MoR — creators are sellers)

**7. Authentication**
- Local magic links (zero dependencies)
- Teneo Auth SSO (OAuth 2.0 + PKCE)
- Nostr (NIP-07 browser extension signing)

**8. Plugin System**
- Plugin manifest spec and hook points
- Plugin manager (load/execute/sandbox)
- Premium theme marketplace

**9. Federation Network**
- NIP-99 product listings (kind 30402)
- Centralized discovery index (→ multiple competing indexes later)
- Two-rate cross-store referral system (15-20% new customer / 0-5% repeat)
- Lightning-based instant affiliate settlement
- Circular economy metrics tracking

### ❌ What We Don't Build

**Merchant of Record** → Creators are sellers; we provide tax workflow tools
**Video Hosting CDN** → Use Vimeo/YouTube/S3/Cloudflare R2
**CRM System** → Use HubSpot/Salesforce APIs (or build later)
**Native Mobile App** → PWA first; native app is Phase 5
**Full Marketplace Ranking** → Directory-level discovery first; ranking after supply exists

---

## Architecture Overview

```
teneo-marketplace/
├── course-module/              # Course platform (self-contained)
│   ├── frontend/
│   │   ├── course-player.html
│   │   ├── css/
│   │   └── js/
│   └── courses/
│       └── book-funnel-blueprint/
│
├── funnel-module/             # Funnel builder (self-contained)
│   ├── frontend/
│   │   ├── funnel-builder.html
│   │   ├── css/
│   │   └── js/
│   └── backend/routes/
│       └── funnels.js
│
├── marketplace/               # Core marketplace
│   ├── frontend/
│   │   ├── index.html
│   │   ├── brands/            # Multi-brand support
│   │   └── published.html      # Publisher dashboard
│   └── backend/
│       ├── server.js
│       ├── routes/
│       ├── services/
│       ├── database/
│       └── plugins/           # Plugin system (NEW)
│           ├── plugin-manager.js
│           └── registry.json
│
├── integrations/              # External service adapters (NEW)
│   ├── email/
│   │   ├── convertkit.js
│   │   ├── mailchimp.js
│   │   └── adapter.interface.js
│   ├── payment/
│   │   ├── stripe.js
│   │   ├── paypal.js
│   │   └── adapter.interface.js
│   └── storage/
│       ├── s3.js
│       ├── cloudflare-r2.js
│       └── adapter.interface.js
│
└── network-module/            # Federation (NEW)
    ├── frontend/
    │   └── network-explorer.html
    └── backend/
        ├── routes/network.js
        ├── federation.js
        └── discovery.js
```

---

## Implementation Roadmap

### Phase 1: Foundation Complete ✅ (Current State)

**Status**: 75% Complete

**Completed**:
- ✅ Course platform structure
- ✅ Funnel builder (4 templates)
- ✅ Backend API (funnels, courses)
- ✅ Export functionality (HTML, ZIP, Deploy)
- ✅ AI prompt library (30+ prompts)
- ✅ Server running (port 3001)

**Remaining**:
- 🔲 Course player UI polish
- 🔲 Integration adapters
- 🔲 Plugin system
- 🔲 Documentation

**Timeline**: 1 week to complete

---

### Phase 2: Integration Layer (Week 2-3)

**Goal**: Connect to external services via adapters

#### Task 2.1: Email Service Adapters
**Files to create**:
```
integrations/email/
├── adapter.interface.js       # Base interface
├── convertkit.js             # ConvertKit adapter
├── mailchimp.js              # Mailchimp adapter
└── README.md                 # Integration guide
```

**Interface specification**:
```javascript
// adapter.interface.js
class EmailAdapter {
  async addSubscriber(listId, email, fields) {}
  async removeSubscriber(listId, email) {}
  async sendEmail(to, subject, body) {}
  async createAutomation(config) {}
  async getStats(listId) {}
}
```

**Timeline**: 3 days

#### Task 2.2: Payment Processor Adapters
**Files to create**:
```
integrations/payment/
├── adapter.interface.js
├── stripe.js
├── paypal.js
└── README.md
```

**Interface specification**:
```javascript
// adapter.interface.js
class PaymentAdapter {
  async createCheckoutSession(items, options) {}
  async processRefund(transactionId) {}
  async getTransaction(transactionId) {}
  async listTransactions(filters) {}
}
```

**Timeline**: 3 days

#### Task 2.3: Storage Adapters
**Files to create**:
```
integrations/storage/
├── adapter.interface.js
├── local.js                  # Local filesystem
├── s3.js                     # AWS S3
├── cloudflare-r2.js          # Cloudflare R2
└── README.md
```

**Timeline**: 2 days

#### Task 2.4: Analytics Integration
**Files to create**:
```
integrations/analytics/
├── ga4.js                    # Google Analytics 4
├── plausible.js              # Plausible Analytics
└── README.md
```

**Timeline**: 1 day

**Phase 2 Total**: 9 days (2 weeks with buffer)

---

### Phase 3: Plugin System (Week 4-5)

**Goal**: Enable extensibility for Teneo and community plugins

#### Task 3.1: Plugin Manager
**Files to create**:
```
marketplace/backend/plugins/
├── plugin-manager.js         # Core plugin system
├── registry.json             # Installed plugins
├── hooks.js                  # Hook system
└── validator.js              # Plugin validation
```

**Features**:
- Load plugins from manifest
- Register hook points
- Execute plugin actions
- Permission system
- Sandboxing

**Timeline**: 4 days

#### Task 3.2: Plugin API Routes
**Files to create**:
```
marketplace/backend/routes/plugins.js
```

**Endpoints**:
- `GET /api/plugins/list` - List installed plugins
- `GET /api/plugins/hooks/:component` - Get hooks for component
- `POST /api/plugins/execute` - Execute plugin action
- `POST /api/plugins/install` - Install new plugin
- `DELETE /api/plugins/:id` - Uninstall plugin

**Timeline**: 2 days

#### Task 3.3: Frontend Hook Points
**Files to modify**:
```
funnel-module/frontend/funnel-builder.html
course-module/frontend/course-player.html
```

**Add hook points**:
```html
<div data-hook="above-preview" class="plugin-hooks"></div>
<div data-hook="field-actions" class="plugin-hooks"></div>
<div data-hook="lesson-actions" class="plugin-hooks"></div>
```

**Timeline**: 2 days

#### Task 3.4: Plugin Documentation
**Files to create**:
```
PLUGIN_DEVELOPMENT.md
PLUGIN_SPEC.md
examples/hello-world-plugin/
```

**Timeline**: 2 days

**Phase 3 Total**: 10 days (2 weeks)

---

### Phase 4: Federation Network (Week 6-8)

**Goal**: Enable distributed marketplace network

#### Task 4.1: Node Registry
**Files to create**:
```
network-module/backend/
├── registry.js               # Node registration
├── heartbeat.js              # Node health monitoring
└── discovery.js              # Node discovery protocol
```

**Features**:
- Register marketplace node
- Publish node metadata
- Health check system
- Node directory

**Timeline**: 4 days

#### Task 4.2: Cross-Node Search
**Files to create**:
```
network-module/backend/
├── search.js                 # Federated search
└── aggregator.js             # Result aggregation
```

**Features**:
- Query multiple nodes
- Aggregate results
- Ranking/filtering
- Cache layer

**Timeline**: 4 days

#### Task 4.3: Revenue Sharing
**Files to create**:
```
network-module/backend/
├── affiliate.js              # Affiliate tracking
├── revenue-share.js          # Revenue distribution
└── reporting.js              # Network analytics
```

**Features**:
- Track cross-node sales
- Calculate revenue splits
- Automated payouts
- Reporting dashboard

**Timeline**: 5 days

#### Task 4.4: Network Frontend
**Files to create**:
```
network-module/frontend/
├── network-explorer.html     # Browse network nodes
├── node-dashboard.html       # Node operator dashboard
└── js/network.js
```

**Timeline**: 3 days

**Phase 4 Total**: 16 days (3 weeks with buffer)

---

### Phase 5: Polish & Documentation (Week 9-10)

**Goal**: Production-ready release

#### Task 5.1: UI/UX Polish
- Consistent styling across modules
- Mobile responsiveness
- Loading states
- Error handling
- Accessibility

**Timeline**: 4 days

#### Task 5.2: Documentation
**Files to create**:
```
docs/
├── GETTING_STARTED.md
├── USER_GUIDE.md
├── ADMIN_GUIDE.md
├── API_REFERENCE.md
├── INTEGRATION_GUIDE.md
├── PLUGIN_DEVELOPMENT.md
├── FEDERATION_GUIDE.md
└── TROUBLESHOOTING.md
```

**Timeline**: 4 days

#### Task 5.3: Testing
- Integration tests
- E2E tests (Playwright/Cypress)
- Performance testing
- Security audit

**Timeline**: 3 days

#### Task 5.4: Deployment Guide
- Docker setup
- VPS deployment guide
- Vercel/Netlify instructions
- Environment configuration

**Timeline**: 2 days

**Phase 5 Total**: 13 days (2 weeks)

---

## Complete Timeline

| Phase | Duration | Cumulative | Status |
|-------|----------|------------|--------|
| Phase 1: Foundation | 1 week | Week 1 | ✅ 75% Complete |
| Phase 2: Integrations | 2 weeks | Week 3 | 📋 Planned |
| Phase 3: Plugins | 2 weeks | Week 5 | 📋 Planned |
| Phase 4: Federation | 3 weeks | Week 8 | 📋 Planned |
| Phase 5: Polish | 2 weeks | Week 10 | 📋 Planned |

**Total**: 10 weeks to production-ready MVP

---

## Success Metrics

### Technical Metrics
- ✅ Server starts without errors
- ✅ All modules load independently
- ✅ API responds < 200ms
- 🎯 100% test coverage (critical paths)
- 🎯 Lighthouse score > 90

### User Metrics
- 🎯 Course completion rate > 70%
- 🎯 Funnel deployment rate > 50%
- 🎯 Time to first funnel < 4 hours
- 🎯 Plugin adoption rate > 20%

### Network Metrics
- 🎯 100+ nodes deployed (6 months)
- 🎯 10+ community plugins
- 🎯 1,000+ cross-node transactions/month

---

## Risk Management

### Technical Risks

**Risk**: Plugin system security vulnerabilities
**Mitigation**:
- Sandboxed execution
- Permission system
- Code review process
- Security audit

**Risk**: Federation network complexity
**Mitigation**:
- Start with centralized registry
- Gradual decentralization
- Simple protocol first
- Iterate based on usage

**Risk**: Integration adapter maintenance
**Mitigation**:
- Abstract interface pattern
- Community contributions
- Version pinning
- Deprecation policy

### Business Risks

**Risk**: Low adoption (marketplace)
**Mitigation**:
- Focus on specific niche (book marketing)
- Provide immediate value (course + templates)
- Strong documentation
- Community building

**Risk**: Competition from established platforms
**Mitigation**:
- Open-source advantage (free, extensible)
- Federation network (unique feature)
- Teneo plugin (10x productivity)
- Own your data messaging

---

## Resource Requirements

### Development
- **1 Lead Developer** (full-time, 10 weeks)
- **1 Frontend Developer** (part-time, 4 weeks)
- **1 DevOps** (part-time, 2 weeks)

### Infrastructure
- **Development**: Local/free tier services
- **Staging**: $50-100/month (VPS + CDN)
- **Production**: $100-500/month (scales with usage)

### Tools & Services
- GitHub (free)
- Vercel/Netlify (free tier)
- Database (SQLite - free, or Postgres - $25/month)
- CDN (Cloudflare - free)
- Analytics (Plausible - free self-hosted)

**Total Monthly Cost**: $50-600/month depending on scale

---

## Launch Strategy

### Soft Launch (Week 11)
- Deploy to teneo-marketplace.com
- Invite 20-30 beta testers
- Gather feedback
- Fix critical bugs
- Iterate quickly

### Public Launch (Week 13)
- Open-source release on GitHub
- Product Hunt launch
- Blog post / documentation site
- Community Discord/forum
- First 100 users

### Growth Phase (Months 4-6)
- Launch Teneo Plugin (teneo-production)
- Community plugin program
- Federation network goes live
- 500+ nodes deployed

---

## Next Steps (This Week)

### Day 1-2: Complete Phase 1
- [ ] Polish course player UI
- [ ] Test all existing features
- [ ] Fix any bugs
- [ ] Update documentation

### Day 3-4: Start Phase 2 (Integrations)
- [ ] Create integration adapter interfaces
- [ ] Implement ConvertKit adapter
- [ ] Implement Stripe adapter
- [ ] Write integration tests

### Day 5: Planning
- [ ] Review progress
- [ ] Adjust timeline if needed
- [ ] Plan Phase 3 details
- [ ] Prepare development environment

---

## Long-Term Vision (6-12 Months)

### Month 6
- 500+ marketplace nodes deployed
- 50+ Teneo plugin users ($4,850 MRR)
- 20+ community plugins
- Active developer community

### Month 12
- 2,000+ marketplace nodes
- 200+ Teneo plugin users ($19,400 MRR)
- 100+ community plugins
- Federation network thriving
- $30K+ MRR total ecosystem

---

## Conclusion

**What we're building**: Focused infrastructure for book marketing
**How we're building it**: Lean, modular, integration-first
**Why it matters**: Own your data, own your revenue, join the network

**Timeline**: 10 weeks to MVP
**Cost**: Minimal (mostly time)
**Upside**: Massive (if we execute well)

**Let's build it.** 🚀
