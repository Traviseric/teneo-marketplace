# Self-Serve Store + Funnel Beta Checklist

**Status:** Active — major progress March 13, 2026
**Created:** 2026-03-10
**Last Updated:** 2026-03-13
**Companion to:** [../ROADMAP.md](../ROADMAP.md)  
**Related:** [AI_STORE_BUILDER_IMPLEMENTATION_CHECKLIST.md](AI_STORE_BUILDER_IMPLEMENTATION_CHECKLIST.md)

---

## Purpose

This checklist answers a narrower question than the main roadmap:

**What still needs to be done before normal users can use OpenBazaar AI to build stores and funnels for their own websites?**

It is not the full product roadmap. It is the launch checklist for a first credible **self-serve beta**.

---

## Recommendation

Do not launch four publishing models at once.

Ship the first self-serve beta around **one opinionated path**:

- user signs up
- user generates a store
- user edits products/copy
- user publishes to an OpenBazaar-hosted URL
- user optionally uses a custom domain later
- user creates or links one funnel to that store

Defer broad "embed anywhere" and "full white-label website builder" claims until the hosted path is proven.

---

## What Already Exists

### Store builder backend

- `marketplace/backend/routes/storeBuilder.js`
- `marketplace/backend/services/aiStoreBuilderService.js`
- `marketplace/backend/services/storeRendererService.js`
- `marketplace/backend/services/storeBuilderService.js`
- `marketplace/backend/services/storeBuildService.js`

Existing route surface:

- `GET /api/store-builder/tiers`
- `POST /api/store-builder/generate`
- `POST /api/store-builder/render`
- `POST /api/store-builder/generate-and-render`
- `POST /api/store-builder/save`
- `GET /api/store-builder/stores`
- `GET /api/store-builder/stores/:id`
- `GET /api/store-builder/stores/:id/products`
- `PATCH /api/store-builder/stores/:id/edit`
- `GET /api/store-builder/stores/:id/preview`
- `POST /api/store-builder/stores/:id/publish`
- `POST /api/store-builder/stores/:id/unpublish`
- `POST /api/store-builder/stores/:id/subscribe`

### Funnel backend

- `funnel-module/backend/routes/funnels.js`
- `marketplace/backend/services/aiFunnelBuilderService.js`
- `marketplace/frontend/js/funnel-tracker.js`

Existing route surface:

- `POST /api/funnels/generate`
- `POST /api/funnels/generate-and-save`
- `POST /api/funnels/save-draft`
- `GET /api/funnels/get-draft`
- `POST /api/funnels/deploy`
- `GET /api/funnels/list`
- `POST /api/funnels/events`
- `GET /api/funnels/stats/:funnelId`
- `PATCH /api/funnels/:id`
- `POST /api/funnels/:id/subscribe`

### Commerce and hosting surfaces

- `marketplace/backend/routes/storefront.js`
- `marketplace/backend/routes/checkout.js`
- `marketplace/backend/routes/emailMarketing.js`
- `marketplace/backend/routes/hostingRoutes.js`
- `marketplace/backend/routes/adminRoutes.js`
- `marketplace/backend/server.js`

### Frontend surfaces already present

- `marketplace/frontend/store-builder-intake.html`
- `marketplace/frontend/admin.html`
- `marketplace/frontend/login.html`
- `marketplace/frontend/account-dashboard.html` (now links to creator dashboard)
- `marketplace/frontend/creator-dashboard.html` (**new** — create/manage stores, courses, funnels)
- `marketplace/frontend/account/memberships.html`

---

## Main Gap (Updated March 13, 2026)

As of March 13, the prompt-to-working-store gap has been **substantially closed**:

- Creator dashboard exists (`/creator-dashboard.html`) with store/course/funnel generation
- Store product checkout endpoint works (`POST /api/checkout/store-product`)
- Store renderer produces live Add-to-Cart buttons that call real Stripe checkout
- Course and funnel generation are open to regular users (not admin-only)
- Funnel email sequences are persisted to DB on generate-and-save

**Remaining gap** is now narrower:

1. **Production proof**: deploy and prove the full flow with real Stripe payments
2. **Product editing**: inline edit for products without regenerating the whole store
3. **Subscriber visibility**: show captured subscribers in creator dashboard
4. **Email delivery proof**: verify generated email sequences actually send

---

## Beta Launch Definition

The self-serve beta should not claim "full website builder." It should claim:

- generate a simple store from a brief
- edit store copy and products
- publish the store to a hosted OpenBazaar URL
- connect one lead-capture or sales funnel
- collect emails
- sell at least one digital product reliably

Optional but not required for beta:

- custom domain support
- embeddable widgets for third-party CMS sites
- full managed hosting automation
- POD-first positioning

---

## Launch Checklist

## Phase 1 - Lock the Supported Publishing Model

### 1.1 Pick the first website integration mode

- [ ] Make the hosted path the official beta path: `openbazaar.ai/store/{slug}`
- [ ] Explicitly mark custom domains as phase 2
- [ ] Explicitly mark embeddable widgets/headless storefront as phase 2

Primary files:

- `marketplace/backend/server.js`
- `marketplace/backend/routes/storeBuilder.js`
- `marketplace/backend/services/storeBuilderService.js`
- `docs/ROADMAP.md`
- `README.md`

Why this matters:

- right now the code supports publish, but the product does not clearly say what "publish" means for a normal user

### 1.2 Define beta scope in product language

- [ ] Store beta = simple hosted storefront + email capture + checkout
- [ ] Funnel beta = one deployable funnel connected to a product or lead magnet
- [ ] Remove or downgrade any copy implying full white-label website hosting if provisioning is not finished

Primary files:

- `README.md`
- `docs/reference/MARKETPLACE_STATUS_AND_TODO.md`
- `marketplace/frontend/store-builder-intake.html`
- `marketplace/frontend/admin.html`

---

## Phase 2 - Finish the Store Self-Serve Path

### 2.1 Auth and ownership flow

- [ ] Verify the full public path from `login.html` to authenticated store ownership on production
- [x] Confirm `requireAuth` protected store-builder routes work from the real frontend (creator dashboard uses them)
- [x] Add clear "My stores" and "Open editor" entry points after login (creator-dashboard.html, linked from account-dashboard.html)

Primary files:

- `marketplace/frontend/login.html`
- `marketplace/frontend/account-dashboard.html`
- `marketplace/backend/routes/auth.js`
- `marketplace/backend/routes/storeBuilder.js`

Blocking routes:

- `GET /api/store-builder/stores`
- `GET /api/store-builder/stores/:id`
- `PATCH /api/store-builder/stores/:id/edit`
- `GET /api/store-builder/stores/:id/preview`
- `POST /api/store-builder/stores/:id/publish`

### 2.2 First real creator dashboard flow

- [x] Build or finish a user-facing store editor instead of relying on admin-style flows (creator-dashboard.html)
- [x] Let a user create, view, preview, publish, and unpublish a store without touching raw JSON
- [ ] Let a user edit product details (name, price, description) inline without regenerating
- [ ] Let a user view captured subscribers for their store

Primary files:

- `marketplace/frontend/admin.html`
- `marketplace/backend/routes/storeBuilder.js`
- `marketplace/backend/services/storeRendererService.js`
- `marketplace/backend/services/storeBuilderService.js`

Current mismatch:

- backend ownership routes exist
- polished creator-facing UX for those routes is still incomplete

### 2.3 Product and catalog editing

- [x] Verify generated products persist cleanly to `store_products` (product IDs injected back into config on save)
- [ ] Add a safe edit flow for prices, descriptions, product type, and checkout linkage
- [x] Make sure generated products appear in the published store experience with live checkout buttons

Primary files:

- `marketplace/backend/services/storeBuilderService.js`
- `marketplace/backend/services/storeRendererService.js`
- `marketplace/backend/routes/storeBuilder.js`
- `marketplace/frontend/admin.html`

---

## Phase 3 - Finish the Funnel Path

### 3.1 Prove funnel save and deploy flow

- [ ] Verify `generate -> generate-and-save -> deploy -> public URL` works end to end on production
- [x] Replace admin-only assumptions like hardcoded `userId=admin` with real creator ownership (session userId used)
- [ ] Confirm deployed funnel files land in the expected public path and are actually served

Primary files:

- `funnel-module/backend/routes/funnels.js`
- `marketplace/backend/server.js`
- `marketplace/frontend/admin.html`
- `marketplace/frontend/js/funnel-tracker.js`

Routes to prove:

- `POST /api/funnels/generate`
- `POST /api/funnels/generate-and-save`
- `POST /api/funnels/deploy`
- `GET /api/funnels/list`

### 3.2 Connect funnels to store products and checkout

- [ ] Ensure funnels can start checkout against real products
- [ ] Verify `funnelId` and `funnelSessionId` survive checkout and webhook fulfillment
- [ ] Confirm purchase events write back into `funnel_events`

Primary files:

- `marketplace/backend/routes/checkout.js`
- `funnel-module/backend/routes/funnels.js`
- `marketplace/frontend/js/funnel-tracker.js`
- `marketplace/frontend/success.html`

### 3.3 Connect funnels to email capture and sequences

- [ ] Verify funnel opt-in creates or reuses a subscriber
- [x] Verify `sequence_id` linking works from funnel to email sequence (generate-and-save creates email_templates + sequence_emails records and links sequence to funnel)
- [ ] Confirm the follow-up sequence actually sends in a real environment

Primary files:

- `funnel-module/backend/routes/funnels.js`
- `marketplace/backend/routes/emailMarketing.js`
- `marketplace/backend/services/emailMarketingService.js`
- `marketplace/backend/services/emailService.js`

---

## Phase 4 - Finish Checkout and Delivery for Beta Stores

### 4.1 Digital product path must be real

- [x] Store product checkout endpoint exists (`POST /api/checkout/store-product`) with server-side price, Stripe session, order creation, and webhook fulfillment
- [ ] Prove one live hosted store can sell one digital product via Stripe on production
- [ ] Confirm order creation, fulfillment, and confirmation email all work from the published store
- [ ] Confirm storefront API lookups match rendered store products

Primary files:

- `marketplace/backend/routes/checkout.js`
- `marketplace/backend/routes/storefront.js`
- `marketplace/backend/routes/downloadRoutes.js`
- `marketplace/backend/services/emailService.js`
- `marketplace/frontend/store.html`

### 4.2 Payment setup UX

- [ ] Give creators a sane way to connect or verify Stripe configuration
- [ ] Remove any dependence on hidden admin-only configuration for the beta path
- [ ] Show clear errors when checkout is unavailable

Primary files:

- `marketplace/backend/routes/adminRoutes.js`
- `marketplace/backend/routes/configRoutes.js`
- `marketplace/frontend/cart-custom.html`
- `marketplace/frontend/js/config.js`

### 4.3 Defer POD from the first self-serve promise

- [ ] Keep POD as partial until real Printful/Lulu proof is recorded
- [ ] Do not make POD part of the minimum self-serve beta success criteria

Primary files:

- `marketplace/backend/routes/printfulAdmin.js`
- `marketplace/backend/routes/luluAdmin.js`
- `docs/ROADMAP.md`

---

## Phase 5 - Website Integration Beyond Hosted Pages

### 5.1 Custom domains

- [ ] Decide the routing model for custom domains
- [ ] Document DNS and SSL flow
- [ ] Add store-to-domain mapping and validation
- [ ] Prove publish and unpublish behavior for a mapped custom domain

Primary files:

- `marketplace/backend/server.js`
- `marketplace/backend/routes/hostingRoutes.js`
- `marketplace/backend/services/storeBuildService.js`
- `docs/reference/SECURITY_SETUP_GUIDE.md`

Current reality:

- billing tiers mention custom domains
- actual domain provisioning flow is not yet finished enough to promise broadly

### 5.2 Embeddable widgets and headless mode

- [ ] Decide whether beta 2 supports embeddable buy buttons, embedded email capture, or headless catalog widgets
- [ ] If yes, define a stable public API plus frontend widget script
- [ ] If no, explicitly keep this out of beta messaging

Primary files:

- `marketplace/backend/routes/storefront.js`
- `marketplace/frontend/store.html`
- `marketplace/frontend/js/template-processor.js`

---

## Phase 6 - Production Proof Before Public Beta

### Minimum proof set

- [ ] One real hosted store generated from the builder
- [ ] One real published funnel with analytics events
- [ ] One real Stripe digital purchase through a published builder store
- [ ] One real subscriber captured through the store or funnel
- [ ] One real email sequence or transactional email delivered successfully
- [ ] One successful Postgres/Supabase-backed run of the same flow

Primary files:

- `docs/reference/MARKETPLACE_STATUS_AND_TODO.md`
- `CHANGELOG.md`
- `docs/ROADMAP.md`

Rule:

- do not claim public beta readiness until the proof is recorded in the canonical docs

---

## Launch Readiness Scorecard

Launch only when all of these are true:

- [x] A user can sign up and reach a "my stores" flow (creator-dashboard.html)
- [x] A user can generate a store from a brief (via creator dashboard → generate-and-render → save)
- [x] A user can preview the store (preview link in creator dashboard)
- [x] A user can publish the store to a hosted URL (`/store/{slug}`)
- [x] A user can create a funnel from a brief (via creator dashboard → generate-and-save)
- [ ] A user can edit store products inline (not yet — requires regeneration)
- [ ] Funnel events are recorded (wiring exists, needs production proof)
- [x] Checkout wiring exists for store products (store-product endpoint + live buttons in rendered HTML)
- [ ] Checkout works proven on production with real Stripe payment
- [ ] Email capture works proven on production
- [ ] Docs describe the exact supported beta path honestly

---

## Recommended Execution Order

1. Lock hosted-store beta scope.
2. Finish creator auth and "my stores" UX.
3. Finish store edit/preview/publish UX.
4. Prove funnel generate/save/deploy with real ownership flow.
5. Prove Stripe digital checkout on a published builder store.
6. Prove subscriber capture and email follow-up.
7. Only then add custom domains.
8. Only after that consider embeddable widgets/headless mode.

---

## Non-Beta Backlog

These should not block the first self-serve beta:

- POD-first self-serve support
- full white-label hosting automation
- advanced multi-page site builder
- full Nostr frontend UX
- embeddable widgets for every CMS
- migration tooling from Gumroad/Teachable

---

## Bottom Line

OpenBazaar AI does **not** mainly need more builder endpoints.

It needs a finished **product path** around the endpoints that already exist:

- hosted store first
- one real funnel path
- one real checkout path
- one real email path
- documented production proof

That is the shortest path to a usable self-serve beta.
