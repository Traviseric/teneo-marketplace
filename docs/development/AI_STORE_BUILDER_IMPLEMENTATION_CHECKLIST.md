# AI Store Builder Implementation Checklist

**Status:** ACTIVE
**Created:** 2026-03-06
**Companion to:** [../ROADMAP.md](../ROADMAP.md)
**Related commercialization strategy:** [C:/code/orchestrator/docs/reference/revenue/COMMERCIALIZATION_STRATEGY.md](C:/code/orchestrator/docs/reference/revenue/COMMERCIALIZATION_STRATEGY.md)

---

## Purpose

This document is the execution companion to `docs/ROADMAP.md`.

It exists to keep three planning layers separate so nothing gets lost:

1. **OpenBazaar AI roadmap** (`docs/ROADMAP.md`) = product strategy and phased build plan
2. **Orchestrator commercialization strategy** (`C:/code/orchestrator/docs/reference/revenue/COMMERCIALIZATION_STRATEGY.md`) = managed service first, self-serve platform later
3. **Broader orchestrator revenue plan** = consulting, PRAS, Flux, FitLabs, and other revenue lanes outside this repo

This checklist does **not** replace any of those. It turns the OpenBazaar AI builder lane into a concrete sequence of implementation work.

---

## Current Reality

**Already exists and should be reused:**

- Component library in `marketplace/frontend/components-library/`
- Funnel module in `funnel-module/`
- Course module in `course-module/`
- Stripe checkout paths in `marketplace/backend/routes/checkout.js` and `marketplace/backend/routes/storefront.js`
- Email capture and email marketing routes
- Orchestrator `STORE_PLANNER` and `build_store*` workflows in `C:/code/orchestrator`

**Still blocking paid delivery:**

- Production app still has SQLite-era assumptions in the backend and services
- Supabase migration and production env verification are not fully closed
- No end-to-end builder publish path is proven
- No concrete managed-service delivery loop is documented
- No self-serve customer platform should be built yet

---

## Definition of Done

This lane is successful when all of the following are true:

- `openbazaar.ai` works end-to-end on the real production stack
- A human operator can take a plain-English store brief and deliver a working store using the orchestrator
- Build status, QA evidence, and delivery artifacts are captured for every build
- At least 3 successful dogfood or paid builds exist as case studies
- Self-serve platform work is still deferred until the managed-service motion is proven

---

## Phase 0 - Make the Production Base Real

**This must be complete before external builder sales.**

### Data layer

- [ ] Replace SQLite-backed runtime access in `marketplace/backend/database/database.js` with a Supabase adapter that preserves the `.run()`, `.get()`, `.all()` calling pattern
- [ ] Audit direct `sqlite3` usage across `marketplace/backend/` and either migrate or isolate every production path
- [ ] Map code that expects `users` onto Supabase `profiles` where needed
- [ ] Run `marketplace/backend/database/supabase-migration.sql` against the live Supabase project
- [ ] Verify critical tables exist and are queryable: `profiles`, `orders`, `products`, `stores`, `subscribers`, `funnels`, `courses`, `payment_events`, `webhooks`
- [ ] Add a small parity test or script that proves the adapter can read and write the critical checkout and auth paths

### Environment and deployment

- [ ] Verify `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in the real deployment environment
- [ ] Verify `SESSION_SECRET`, Stripe keys, email provider env vars, and any ArxMint env needed for checkout
- [ ] Decide and document the local fallback story: when local dev uses SQLite and when it must use Supabase
- [ ] Confirm the deployed backend no longer writes to a read-only filesystem path

### End-to-end user journey

- [ ] Verify `openbazaar.ai/` loads the intended landing page
- [ ] Verify `openbazaar.ai/api/storefront/catalog` returns real data without SQLite failures
- [ ] Verify login flow from `login.html` to session creation to `account-dashboard.html`
- [ ] Verify one Stripe digital purchase end-to-end: checkout, order creation, fulfillment, delivery
- [ ] Verify one POD purchase end-to-end: checkout, fulfillment trigger, status updates
- [ ] Unify primary navigation so landing page CTAs point only at working destinations

### Exit criteria

- [ ] `openbazaar.ai/api/health` returns 200 in production
- [ ] A real test user can sign up, browse products, and complete a purchase
- [ ] Order data lands in Supabase and fulfillment state updates correctly

---

## Phase 1 - AI Store Builder Core

**This is the product differentiator from the roadmap.**

### Build contract

- [ ] Define the `store_config` schema the builder produces
- [ ] Include store identity fields: name, tagline, description, voice, palette, fonts
- [ ] Include commerce fields: products, prices, fulfillment type, payment provider, email capture
- [ ] Include expansion flags for funnels, courses, and physical/POD products
- [ ] Validate the schema before any render or publish step

### Prompt pipeline

- [ ] Formalize the natural-language builder input contract
- [ ] Connect orchestrator `STORE_PLANNER` output to the OpenBazaar renderer input format
- [ ] Handle at least these spec types cleanly: simple store, course business, services + funnel, POD store
- [ ] Define error states for ambiguous or incomplete prompts instead of silently guessing

### Store renderer

- [ ] Build renderer logic that turns `store_config` into a working storefront
- [ ] Reuse component library templates instead of generating raw pages ad hoc
- [ ] Generate product listings, hero, CTA, checkout hooks, and email capture wiring
- [ ] Decide where generated stores live: `openbazaar.ai/store/{slug}`, brand route, or custom domain path

### Persistence and publish

- [ ] Save generated store records to Supabase `stores`
- [ ] Save generated products to the right product tables
- [ ] Wire subscriber capture to the subscribers/email tables
- [ ] Implement preview mode before publish
- [ ] Implement publish mode with a stable URL and rollback path

### Editing loop

- [ ] Support natural-language update requests for store copy and product changes
- [ ] Support enabling course mode or funnel mode after initial generation
- [ ] Store both the latest config and the edit history

### Validation

- [ ] Run the builder against at least 3 canonical briefs:
- [ ] "Soy candle store"
- [ ] "Course business"
- [ ] "Service business with landing funnel"
- [ ] Verify each build has working checkout, capture, and page structure

### Exit criteria

- [ ] A plain-English brief produces a working store
- [ ] The store includes landing page, product listings, checkout wiring, and email capture
- [ ] The store can be previewed, published, and edited

---

## Phase 1A - Managed-Service Commercialization

**Ship this before self-serve platform work.**

This is the bridge between the public OpenBazaar product roadmap and the orchestrator commercialization strategy.

### Intake and request tracking

- [ ] Define the minimum intake payload for a paid build request
- [ ] Create a `store_builds` record shape with status stages: `intake`, `planning`, `building`, `qa`, `delivered`, `failed`
- [ ] Capture the original brief, normalized config, chosen tier, payment status, final URL, and evidence artifacts
- [ ] Decide whether first builds are triggered manually, by internal CLI, or by a thin API wrapper

### Operator build flow

- [ ] Standardize the internal operator command for store builds using `C:/code/orchestrator/scripts/run_boxes.py --project openbazaar-ai --workflow build_store --store-spec "..."`
- [ ] Define the handoff contract between orchestrator output and OpenBazaar publish logic
- [ ] Record screenshots, QA notes, generated config JSON, and final delivery URL for every run
- [ ] Define retry rules when planning succeeds but publish or QA fails

### Delivery readiness

- [ ] Create a delivery checklist for every completed store
- [ ] Confirm working URL, checkout test, email capture test, and basic mobile responsiveness
- [ ] Confirm the generated store has no placeholder copy left in critical areas
- [ ] Confirm the customer handoff includes what was built, what is editable, and known limitations

### Payment and offer packaging

- [ ] Decide the payment trigger for the first sales: invoice/manual, Stripe prepay, ArxMint prepay, or deposit model
- [ ] Define the first external offer tiers: Builder, Pro, White-label
- [ ] Define scope boundaries so custom development does not get mistaken for builder output
- [ ] Define refund and rebuild policy for failed or low-quality builds

### Proof loop

- [ ] Dogfood at least 3 internal builds using realistic business briefs
- [ ] Measure build time, failure modes, manual fix time, and delivery readiness
- [ ] Turn the best 1-2 builds into case studies with screenshots and before/after narrative
- [ ] Publish one sales page or marketplace listing only after delivery quality is proven

### Exit criteria

- [ ] A paid request can move from brief to delivery without ad hoc heroics
- [ ] Every build leaves behind structured artifacts and evidence
- [ ] At least one public case study exists

---

## Phase 1B - Demand Generation and Marketplace Proof

**Do this after managed delivery works.**

- [ ] Publish the "AI Store Builder" service page or gig listing
- [ ] Publish 1 short demo video and 1 written case study
- [ ] Add a clear example brief and example output on the sales page
- [ ] Create a simple intake form for non-technical buyers
- [ ] List the orchestrator-powered builder as an AI agent service on the OpenBazaar gig platform once delivery is reliable

---

## Phase 2 - Self-Serve Platform Backlog

**Explicitly deferred until managed service traction exists.**

- [ ] Multi-tenant token isolation if users are allowed to bring their own AI credentials
- [ ] Customer onboarding flow for new projects or stores
- [ ] User-facing progress dashboard
- [ ] Approve/reject/edit loop for generated output
- [ ] Billing portal and subscriptions
- [ ] Abuse controls, quota controls, and support flows

**Not required for first revenue from the builder.**

---

## What Not to Do Yet

- [ ] Do not treat this checklist as a replacement for the broader orchestrator revenue plan
- [ ] Do not build the full self-serve platform before the managed-service loop works
- [ ] Do not push federation, Nostr, or advanced crypto differentiators ahead of the baseline switching features
- [ ] Do not market the AI builder aggressively before production checkout and delivery are proven

---

## Roadmap Mapping

| Roadmap / Strategy Source | Meaning Here |
|---------------------------|--------------|
| `docs/ROADMAP.md` Phase 0 | This checklist `Phase 0 - Make the Production Base Real` |
| `docs/ROADMAP.md` Phase 1 | This checklist `Phase 1 - AI Store Builder Core` |
| Orchestrator commercialization Phase 1 | This checklist `Phase 1A - Managed-Service Commercialization` |
| Orchestrator commercialization Phase 2 | This checklist `Phase 2 - Self-Serve Platform Backlog` |

---

## Next Build Sequence

1. Finish Phase 0 production stability.
2. Define and validate `store_config`.
3. Prove one internal store build from prompt to publish.
4. Add status tracking and delivery artifacts.
5. Dogfood 3 builds.
6. Publish case studies and the first external offer.
7. Only then decide whether self-serve platform work is justified.
