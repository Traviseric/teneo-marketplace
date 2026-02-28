# TENEO Marketplace - Status & TODO

**Updated:** February 28, 2026
**Status:** 🟡 **Core functional, Auth complete, Frontend integration needed**

> **Strategic roadmap:** See **[docs/ROADMAP.md](../ROADMAP.md)** for research-informed priorities.
> Priorities in this file updated to match Gemini Deep Research findings (Feb 2026).

---

## ✅ What's COMPLETE

### **1. Backend Infrastructure** ✅

**Core Server:**
- ✅ Express server (`server.js`) with production config
- ✅ Session management with CSRF protection
- ✅ Environment validation
- ✅ Auto-generated secure defaults
- ✅ CORS configured for TENEO domains

**Database:**
- ✅ SQLite with comprehensive schema (`database/schema.sql`)
- ✅ Orders, payments, downloads, refunds
- ✅ Amazon published books tracking
- ✅ Publisher profiles and milestones
- ✅ Analytics and leaderboards
- ✅ **NEW:** Auth schema (`database/schema-auth.sql`)

**Payment Processing:**
- ✅ Stripe checkout (development + production routes)
- ✅ Crypto checkout (Bitcoin/Lightning/Monero)
- ✅ Webhook handling
- ✅ Order management
- ✅ Download token generation

**Authentication:** ✅ **JUST COMPLETED**
- ✅ Auth abstraction layer (`auth/AuthProvider.js`)
- ✅ Local auth provider (SQLite + magic links)
- ✅ TENEO Auth provider (OAuth 2.0 SSO)
- ✅ Auth routes (`routes/auth.js`)
- ✅ User management, sessions, tokens
- ✅ Audit logging

**Email Services:**
- ✅ Order confirmations
- ✅ Download links
- ✅ Magic link authentication
- ✅ SMTP + Resend support

**Admin Features:**
- ✅ Book management
- ✅ Brand management
- ✅ Order management
- ✅ Lulu print-on-demand integration
- ✅ Audit logging
- ✅ Rate limiting

**Amazon Integration:**
- ✅ Published books tracking
- ✅ Analytics and ranking history
- ✅ Publisher profiles
- ✅ Milestone rewards
- ✅ Leaderboards
- ✅ Performance alerts
- ✅ Daily digests

**Network/Federation:**
- ✅ Network registry system with RSA-signed communications
- ✅ Cross-node search and catalog aggregation
- ✅ Node discovery and health checks
- ✅ Revenue sharing logic
- ✅ Network explorer UI (`network.html`) with stats, search, store connections
- ✅ AI discovery service (semantic search, reading paths, knowledge graph)
- ✅ Database schema for embeddings, citations, and reading paths
- ✅ Frontend network client with caching (`network-client.js`)

**API Routes:**
- ✅ `/api/brands` - Multi-brand catalog
- ✅ `/api/checkout` - Stripe payments
- ✅ `/api/crypto` - Crypto payments
- ✅ `/api/catalog` - Book catalog
- ✅ `/api/download` - Secure downloads
- ✅ `/api/admin` - Admin dashboard
- ✅ `/api/network` - Federation
- ✅ `/api/published` - Amazon books
- ✅ `/api/publishers` - Publisher profiles
- ✅ `/api/auth` - **NEW:** Authentication

---

### **2. Frontend Components** ✅

**Pages Built:**
- ✅ `index.html` - Homepage
- ✅ `store.html` - Book catalog
- ✅ `brands.html` - Multi-brand selector
- ✅ `cart-custom.html` - Shopping cart
- ✅ `crypto-checkout.html` - Crypto payment
- ✅ `success.html` / `cancel.html` - Payment results
- ✅ `admin.html` - Admin dashboard
- ✅ `downloads.html` - Download manager
- ✅ `network.html` - Federation network
- ✅ `published.html` - Amazon tracking
- ✅ `publisher-profile.html` - Publisher stats
- ✅ `rewards.html` - Milestone rewards
- ✅ `amazon-style-showcase.html` - Product showcase
- ✅ `components.html` - Component library demo

**Component Library:** (in `components-library/`)
- ✅ **Courses:** 5 course components (progress-bar, module-card, etc.)
- ✅ **Product:** Various product display components
- ✅ **Admin:** Dashboard widgets
- ✅ **Navigation:** Headers, footers, menus

**JavaScript Modules:**
- ✅ `brand-manager.js` - Multi-brand switching
- ✅ `cart.js` - Shopping cart logic
- ✅ `network-client.js` - Federation client
- ✅ `template-processor.js` - Dynamic templating
- ✅ `crypto-checkout.js` - Crypto payment flow

**Styling:**
- ✅ Modern CSS with CSS variables
- ✅ Dark mode support
- ✅ Mobile responsive
- ✅ Brand-specific theming

---

## 🟡 What's PARTIALLY COMPLETE

### **1. Frontend Auth Integration** 🟡

**Status:** Backend complete, frontend needs updating

**What exists:**
- ✅ Backend auth routes working
- ✅ Both providers (local + TENEO Auth) functional
- ❌ No login/register UI pages
- ❌ Frontend auth.js doesn't use new endpoints
- ❌ No session management in frontend

**Needs:**
1. **Create auth pages:**
   - `login.html` - Email form for magic link OR OAuth button
   - `register.html` - Registration form
   - `dashboard.html` - User dashboard (post-login)

2. **Update frontend auth.js:**
   ```javascript
   // Current: Hardcoded assumptions
   // Needed: Detect provider, handle both flows

   async function init() {
     const config = await fetch('/api/auth/config').then(r => r.json());

     if (config.type === 'teneo-auth') {
       setupOAuthFlow();
     } else {
       setupMagicLinkFlow();
     }
   }
   ```

3. **Add session checks:**
   - Verify user on page load
   - Show/hide content based on auth state
   - Handle logout

**Time Estimate:** 4-6 hours

---

### **2. Course Platform Integration** 🟡

**Status:** Components built, not integrated into marketplace

**What exists:**
- ✅ 5 course components (teneo-marketplace side)
- ✅ 6 Teachable-parity components (traviseric.com side)
- ❌ Not integrated into marketplace catalog
- ❌ No course checkout flow
- ❌ No course access control

**Needs:**
1. Add "course" as product type (alongside books)
2. Create course landing pages using components
3. Add course progress tracking to user accounts
4. Integrate with auth system (course access control)

**Time Estimate:** 8-10 hours

**Priority:** Medium (books are primary product)

---

### **3. Email Service Configuration** 🟡

**Status:** Code complete, needs configuration

**What exists:**
- ✅ Email service code (`services/emailService.js`)
- ✅ Templates for order confirmations, downloads, magic links
- ❌ No default SMTP configured
- ❌ Not tested in production

**Needs:**
1. Configure `.env` with email credentials
2. Test magic link delivery
3. Test order confirmation emails
4. Consider Resend API for production

**Time Estimate:** 1-2 hours

**Priority:** HIGH (required for magic link auth)

---

## ❌ What's NOT BUILT (But Planned)

### **1. Health Monitoring / Failover System** ❌

**Status:** Documented in `DUAL_MODE_ARCHITECTURE.md`, not implemented

**What's needed:**
- `services/healthMonitor.js` - Monitor Stripe, hosting, domain
- Automatic failover to crypto/offshore mode
- DNS update automation
- Network notification system

**Documented in:** `DUAL_MODE_ARCHITECTURE.md`
**Time Estimate:** 12-16 hours
**Priority:** MEDIUM (nice to have, not MVP)

---

### **2. Recommendation Engine** ❌

**Status:** Documented in `AMAZON_FEATURES_ROADMAP.md`, not implemented

**What's needed:**
- "Customers also bought" - Category-based recommendations
- "Frequently bought together" - Bundle suggestions
- Related products carousel
- Purchase correlation tracking

**Documented in:** `AMAZON_FEATURES_ROADMAP.md`
**Time Estimate:** 8-12 hours
**Priority:** MEDIUM (conversion optimization)

---

### **3. Advanced Search/Filters** ❌

**Status:** Basic catalog exists, no advanced filtering

**Current:** Simple book listing
**Needs:**
- Category filters
- Price range slider
- Author filter
- Format filter (PDF, ePub, print)
- Sort options (price, popularity, date)
- Search autocomplete

**Time Estimate:** 6-8 hours
**Priority:** MEDIUM

---

### **4. Review System** ❌

**Status:** Not implemented

**Needs:**
- User reviews/ratings
- Review moderation
- Review display on product pages
- Review aggregation (average rating)

**Time Estimate:** 8-10 hours
**Priority:** LOW (can launch without)

---

### **5. Wishlist / Favorites** ❌

**Status:** Not implemented

**Needs:**
- Save books for later
- Wishlist page
- Email notifications for price drops

**Time Estimate:** 4-6 hours
**Priority:** LOW

---

### **6. Affiliate System** ❌

**Status:** Documented, not implemented

**Needs:**
- Self-serve affiliate signup
- Unique tracking links per affiliate
- Commission configuration per product (% or fixed)
- Real-time affiliate dashboard (clicks, conversions, earnings)
- Automated payouts (Stripe + optional Lightning for crypto affiliates)
- Anti-fraud: one-time-use codes, payout delays past refund window, per-buyer caps

**Time Estimate:** 12-16 hours
**Priority:** ~~LOW~~ → **HIGH** (Research #3: non-negotiable for creators with 50k+ students)

---

### **7. Checkout Conversion Stack** ❌ **[NEW — P0]**

**Status:** Not implemented. Research #3 identified this as the #1 blocker for creator switching.

**Needs:**
- Coupons & discount codes (percentage, fixed, time-limited, usage limits)
- Order bumps (pre-checkout "add this for $X")
- Post-purchase upsells (one-click offers after payment)
- Cart abandonment recovery (automated email sequences at 1h/24h/72h)

**Time Estimate:** 16-20 hours
**Priority:** **CRITICAL** — standard on every incumbent; blocks switching

---

### **8. Content Protection** ❌ **[NEW — P0]**

**Status:** Not implemented. Research #3: cited as "mandatory" by Gumroad sellers.

**Needs:**
- PDF stamping (buyer email/name watermarked on download)
- Per-buyer watermarking for images
- License key generation and validation
- File versioning (update products, buyers get latest)

**Time Estimate:** 10-14 hours
**Priority:** **CRITICAL** — primary reason Gumroad sellers say they can't leave

---

### **9. ArxMint Payment Integration** ❌ **[NEW]**

**Status:** Not implemented. Crypto checkout endpoints exist but not connected to ArxMint.

**Architecture (Research #4):**
- **BIP21 unified QR** — on-chain URI with `lightning=` BOLT11 parameter; wallet auto-selects best path
- **Payment-method-agnostic order state machine** — `pending → confirmed → fulfilled → delivered`; order doesn't care how it was paid
- **Zap-to-unlock** for items <$5 (NIP-57 zap → content unlocked, no cart)
- **Three-mode checkout (Research #7):** instant-final (LN/ecash) / escrowed (Cashu P2PK) / card (Stripe)
- **Creator payout routing policy:** destination × conversion × settlement timing
- **Tax data model from day one:** `(timestamp, asset_type, amount, USD_fmv_source, USD_fmv_value)` per payment

**Needs:**
- Lightning invoice generation at checkout via ArxMint
- Ecash token acceptance (Cashu/Fedimint)
- BIP21 unified QR code generation
- Payment confirmation webhook handling
- Creator payout dashboard (sats earned, settlement history, conversion policy)
- Dual checkout UX (Stripe + crypto as parallel tenders on same page)
- Tax fair market value capture at moment of receipt (CoinGecko/Coinbase API)

**Time Estimate:** 24-30 hours
**Priority:** **HIGH** — the core differentiator, built after switching baseline (Phases 1-2)

---

### **10. Nostr Authentication** ❌ **[NEW]**

**Status:** Not implemented. Already built in ArxMint (NIP-07 + NIP-98).

**Needs:**
- NIP-07 `window.nostr` integration (Alby, nos2x browser extensions)
- NIP-98 HTTP auth for API requests
- NIP-05 DNS verification for merchant credibility
- Session bridging with existing auth system

**Time Estimate:** 8-12 hours
**Priority:** **MEDIUM** — ships with crypto differentiators (Phase 3)

---

### **11. Tax Workflow** ❌ **[NEW — P1]**

**Status:** Not implemented. Research #3: tax handling is decisive for switching but MoR is the hardest moat — don't try to replicate.

**Needs:**
- Tax calculation integration (TaxJar/Avalara or manual rates)
- Tax-inclusive pricing option
- Invoice generation with tax line items
- Tax export for creator's accountant (CSV/PDF)
- EU VAT validation (VIES check)

**Time Estimate:** 12-16 hours
**Priority:** **HIGH** — creator-facing workflow, not Merchant of Record

---

### **12. Dispute Resolution & Refunds** ❌ **[NEW]**

**Status:** Not implemented. Research #7 provides full architecture.

**Architecture (Research #7):**
- **Split settlement:** 80-90% instant to seller, 10-20% escrowed with locktime auto-release
- **Cashu 2-of-3 P2PK multisig escrow** (NUT-10/NUT-11) — buyer/seller/arbiter keys
- **Signed purchase receipts** as Nostr events (cryptographic proof of transaction)
- **Receipt-referenced reviews** with NIP-13 Proof-of-Work (spam resistance)

**Refund mechanisms (Research #4 + #7):**
- Stripe refunds: standard Stripe API (already works)
- Lightning refunds: BTCPay Pull Payments + LNURL-withdraw
- Ecash refunds: store-credit bearer tokens (Cashu)
- On-chain refunds: BTCPay Pull Payments with on-chain claim

**Implementation phases:**
1. Phase 3a: Receipts + manual refund UX (seller-initiated)
2. Phase 3b: Cashu P2PK escrow for escrowed checkout mode
3. Phase 3c: Arbiter marketplace (community arbiters)

**Legal:** EU 14-day withdrawal — capture "performance begins" consent; ~1% dispute rate for digital products

**Time Estimate:** 16-20 hours (Phase 3a: 6h, 3b: 8h, 3c: 6h)
**Priority:** **HIGH** — ships with crypto differentiators (Phase 3)

---

### **13. Regulatory Compliance** ❌ **[NEW — PARALLEL TRACK]**

**Status:** Not implemented. Research #8: ecash mints = money transmitters, NO exemptions.

**Path B recommended for Longmont pilot:** Partner with licensed MSB for mint operations (avoids $250K bond).

**Compliance requirements:**
- FinCEN MSB registration within 180 days (if operating mint directly)
- Colorado money transmitter license ($250K surety bond, $100K net worth)
- AML/KYC program at mint deposit/withdrawal points
- SARs for >$2,000 suspicious; CTRs for >$10,000

**Compliance-safe design patterns:**
- Don't market with "privacy" or "anonymity" language
- Cap balances and velocity in pilot
- Structure federation as incorporated entity
- Separate mint operations (ArxMint) from marketplace operations
- Creators are sellers, not money transmitters (clear in ToS)

**Time Estimate:** Ongoing (legal + partnership work, not pure engineering)
**Priority:** **CRITICAL** — blocks ecash features; must run parallel to Phase 3

---

### **14. L402 Paywalls** ❌ **[NEW]**

**Status:** Not implemented. Research #4 provides architecture.

**Architecture:**
- Aperture reverse proxy pattern (sits in front of content endpoints)
- HTTP 402 + `WWW-Authenticate: L402` header with macaroon + Lightning invoice
- Macaroon caveats: time-limited, usage-capped, content-specific
- Machine-payable (AI agents can pay invoices autonomously)

**Time Estimate:** 8-12 hours
**Priority:** **MEDIUM** — ships with crypto differentiators (Phase 3)

---

## 🚀 MINIMUM VIABLE PRODUCT (MVP)

### **What's REQUIRED to launch:**

1. **✅ Backend core** - DONE
2. **✅ Payment processing** - DONE (Stripe + Crypto)
3. **✅ Download delivery** - DONE
4. **🟡 Auth system** - Backend DONE, frontend needs 4-6 hours
5. **🟡 Email delivery** - Code DONE, needs config (1-2 hours)
6. **🟡 Frontend catalog** - Exists, needs auth integration (2-3 hours)

### **MVP Timeline:**

**Today (4-6 hours):**
1. Create login/register UI (2 hours)
2. Update frontend auth.js (2 hours)
3. Test magic link flow (1 hour)
4. Configure email service (1 hour)

**Total: 6 hours to MVP**

---

## 📋 Recommended Build Order (Research-Informed)

> Updated Feb 2026 based on Gemini Deep Research findings. Full roadmap: [docs/ROADMAP.md](../ROADMAP.md)

### **Phase 0: MVP Launch** (6-8 hours)

Priority: **CRITICAL**

1. **Auth integration** (6 hours)
   - Create login.html, register.html
   - Update frontend auth.js
   - Test both auth flows
   - Configure email service

2. **Integration testing** (2 hours)
   - Test full purchase flow (Stripe)
   - Test crypto checkout
   - Test download delivery
   - Test magic link login

3. **Discovery v0 — ship existing network** (2 hours)
   - Verify cross-store search works end-to-end
   - Add "Browse the Network" link to store homepage
   - Test network.html with live data
   - Ensure store auto-registers on first boot

**Deliverable:** Functional marketplace with network discovery, ready to sell

---

### **Phase 1: Checkout Conversion Stack** (26-34 hours)

Priority: **CRITICAL** — Research #3: blocks all creator switching

1. **Coupons & discount codes** (6 hours)
2. **Order bumps** (4 hours)
3. **Post-purchase upsells** (6 hours)
4. **Cart abandonment recovery** (6 hours)
5. **Content protection** (PDF stamping, watermarks, license keys, versioning) (10 hours)

6. **Discovery v1 — search & browse** (8 hours)
   - Category/tag system for products
   - Trending products feed (cross-network)
   - "Stores like this" recommendations
   - Improved network search filters

**Deliverable:** Feature parity on checkout conversion + network discovery — creators can now credibly switch

---

### **Phase 2: Revenue & Distribution** (40-48 hours)

Priority: **HIGH**

1. **Affiliate program** (16 hours) — Research #3: non-negotiable
2. **Tax workflow** (12 hours) — calculation, invoicing, export (NOT MoR)
3. **Migration tooling** (8 hours) — Gumroad import, "Switch from X" pages
4. **Managed hosting infrastructure** (12 hours) — first revenue stream

5. **Discovery v2 — semantic search & knowledge graph** (12 hours)
   - Activate semantic search (embed products via Claude/OpenAI API)
   - AI-generated reading paths across stores
   - Knowledge graph: citation network (products that relate/extend/contradict)
   - "You might also like" cross-store recommendations

**Deliverable:** Creator growth tools + our own revenue + intelligent cross-store discovery

---

### **Phase 3: Crypto Differentiators** (52-70 hours)

Priority: **HIGH** — the unique value prop, built on Phase 1-2 foundation

1. **ArxMint payment integration** (24 hours) — BIP21 unified QR, three-mode checkout, payout routing
2. **Dispute resolution Phase 3a** (6 hours) — receipts + manual refund UX (Pull Payments, ecash store credit)
3. **Nostr auth** (8 hours) — NIP-07 + NIP-98 + NIP-05
4. **L402 paywalls** (10 hours) — Aperture reverse proxy, macaroons, zap-to-unlock <$5
5. **Dispute resolution Phase 3b** (8 hours) — Cashu P2PK escrow for escrowed checkout
6. **Tax data model** (4 hours) — FMV capture at payment receipt, crypto tax export
7. **Regulatory compliance** (parallel) — Path B partnership, compliance-safe design patterns

**Deliverable:** No incumbent offers this — Bitcoin/Lightning/ecash + Nostr identity + crypto-native disputes

---

### **Phase 4: Network Scale & Decentralized Discovery** (40-52 hours)

Priority: **MEDIUM** — network effects after core is solid

1. **NIP-99 product listings** (8 hours)
2. **Discovery index** (12 hours) — centralized first, federate later
3. **Cross-store referral system** (12 hours) — two-rate model + Lightning payouts
4. **Circular economy metrics** (8 hours) — velocity, recirculation, cross-store rate

5. **Discovery v3 — Nostr-native discovery** (8 hours)
   - NIP-99 product listings replace JSON registry
   - NIP-50 relay-based search
   - Dual-mode migration (JSON + NIP-99)

**Deliverable:** Independent stores discover each other via decentralized Nostr protocol, money circulates

---

### **Phase 5: Scale & Polish** (ongoing)

Priority: **LOW** (post-launch)

1. **Premium themes marketplace** — revenue
2. **Memberships & subscriptions**
3. **Community features** (Nostr-aligned)
4. **PWA for mobile engagement**
5. **Integrations** (webhooks, API, Zapier)
6. **Discovery v4 — network intelligence**
   - Transformation-based ranking
   - Community validation signals
   - Progressive disclosure (simple → deep)
7. **Review system**

---

## 🎯 IMMEDIATE NEXT STEPS

### **Option A: Launch MVP (Fastest Path)**

**Goal:** Get marketplace live and selling in 6-8 hours

**Tasks:**
1. Create login/register UI (2 hours)
2. Update frontend auth.js to use new endpoints (2 hours)
3. Test auth flow end-to-end (1 hour)
4. Configure email service (1 hour)
5. Test full purchase flow (1 hour)
6. Deploy to production (1 hour)

**Result:** Functional marketplace ready to take orders

---

### **Option B: Polish First, Then Launch**

**Goal:** Launch with better UX in 16-20 hours

**Tasks:**
- Complete MVP tasks above (6 hours)
- Add recommendation engine (8 hours)
- Add advanced search/filters (6 hours)
- Polish product pages (4 hours)

**Result:** More polished marketplace, higher conversion

---

### **Option C: TENEO Cloud Integration**

**Goal:** Integrate with TENEO ecosystem first

**Tasks:**
1. Register OAuth client in teneo-auth (using prompt I created)
2. Get CLIENT_SECRET
3. Configure marketplace with TENEO Auth SSO
4. Test SSO login flow
5. Verify unified credits work
6. Launch as TENEO Cloud marketplace

**Result:** Marketplace integrated with TENEO ecosystem

---

## 💡 Recommendation

**For fastest launch: Option A (MVP)**

The marketplace is 90% ready. You just need:

1. **Frontend auth integration** (6 hours)
2. **Email configuration** (1 hour)
3. **Testing** (1 hour)

**Total: 8 hours to live marketplace** 🚀

Everything else (recommendations, reviews, courses, etc.) can be added post-launch based on user feedback.

---

## 📖 Documentation Status

**✅ Complete:**
- `README.md` - Main documentation
- `DEPLOYMENT.md` - Production deployment
- `DUAL_MODE_ARCHITECTURE.md` - Dual-mode design
- `AUTH_SETUP.md` - Auth configuration guide
- `TENEO_AUTH_INTEGRATION_STRATEGY.md` - Auth strategy
- `AMAZON_FEATURES_ROADMAP.md` - Feature roadmap
- `.env.example` - Environment template

**🟡 Needs updating:**
- `MVP_48_HOUR_LAUNCH.md` - Update with auth steps
- `README.md` - Add auth setup instructions

---

## 🎬 Summary

**What's done:**
- ✅ Complete backend (payments, downloads, orders, auth)
- ✅ Full database schema
- ✅ Multi-brand catalog system
- ✅ Crypto + Stripe payments
- ✅ Amazon integration
- ✅ Federation network
- ✅ Auth abstraction layer
- ✅ Component library

**What's needed for MVP:**
- 🟡 Frontend auth UI (6 hours)
- 🟡 Email config (1 hour)
- 🟡 Testing (1 hour)

**What's nice to have (post-launch):**
- Recommendations
- Advanced search
- Reviews
- Courses
- Health monitoring

**Verdict:** You're 8 hours away from a launchable marketplace! 🎉

---

**Want me to build the frontend auth integration now?** That's the critical blocker for MVP.
