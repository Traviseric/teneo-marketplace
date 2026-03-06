# OpenBazaar AI — Overnight Tasks

**Aligned with:** `docs/ROADMAP.md` (2026-03-06)
**Last regenerated:** 2026-03-06

This file drives the overnight box runner. Tasks are ordered by roadmap phase.
Phase 0 must be complete before Phase 1 work begins.

---

## Phase 0 — Make It Work (CURRENT PRIORITY)

The production site at openbazaar.ai is broken because the backend uses SQLite which fails on Vercel's read-only filesystem. Nothing else matters until this is fixed.

### P0 — Database Migration (THE BLOCKER)

- [ ] **Build Supabase database adapter** — `marketplace/backend/database/database.js` currently exports a SQLite `db` object with `.run()`, `.get()`, `.all()` methods. Replace with a Supabase adapter that:
  - Uses `@supabase/supabase-js` client
  - Exports the same `.run(sql, params)`, `.get(sql, params)`, `.all(sql, params)` interface via wrapper functions
  - Falls back to SQLite when `SUPABASE_URL` is not set (local dev)
  - Maps `profiles` table where code references `users` (Supabase reserves `users` for `auth.users`)
  - Supabase project: `ncddvxglmnnfagyyupeu`, migration SQL at `marketplace/backend/database/supabase-migration.sql`

- [ ] **Run Supabase migration** — Execute `supabase-migration.sql` against the Supabase project to create all 40+ tables. Verify tables exist via Supabase dashboard.

- [ ] **Add Supabase env vars to Vercel** — `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. These may already be set — verify first.

### P0 — End-to-End Verification

- [ ] **Verify landing page loads** — `openbazaar.ai/` should render the Persian bazaar landing page from `openbazaar-site/index.html`

- [ ] **Verify API health** — `openbazaar.ai/api/storefront/catalog` returns product data (not a SQLite error)

- [ ] **Wire login flow end-to-end** — `login.html` → magic link or OAuth → session created → `account-dashboard.html` loads with user data

- [ ] **Test Stripe purchase flow** — Browse products → Stripe test checkout → order created in Supabase `orders` table → download link delivered

- [ ] **Test POD purchase flow** — Storefront checkout → `/api/storefront/fulfill` → Printful order created → webhook updates order status

- [ ] **Unify nav links** — Landing page CTAs ("Start Selling", "Browse Marketplace") point to working pages, not broken routes

### P0 — Test Suite

- [ ] **Fix broken tests from server-side price enforcement** — Commit `1f43f84` broke test mocks in `cryptoCheckout.test.js` (and possibly `appStore.test.js`) that relied on client-supplied `amountUsd`. Add `jest.mock()` for `lookupBookPrice` from `checkoutOfferService`. Target: all 18 test suites green.

---

## Phase 1 — AI Store Builder (NEXT AFTER PHASE 0)

This is the differentiator — "describe your business, get a working store." Only start after Phase 0 success criteria are met.

### P1 — Core Builder Pipeline

- [ ] **Define store configuration schema** — JSON schema for what the AI generates: store name, tagline, color palette, font, product list (title/description/price/fulfillment type), email capture toggle, payment provider selection

- [ ] **Build AI prompt pipeline** — Claude API call that takes natural language business description → outputs store config JSON. Use structured output / JSON mode. Validate against schema.

- [ ] **Build store renderer** — Takes config JSON, generates static store pages using existing component library (`marketplace/frontend/components-library/`, 12 components). Injects brand colors, fonts, content. Outputs index.html + products page + checkout integration.

- [ ] **Store persistence to Supabase** — `stores` table (owner, config JSON, slug, status, created_at). Products saved to `products` table. Email capture wired to `subscribers` table.

- [ ] **Natural language store editing** — "Change the hero text", "Add a new product: X, $Y", "Enable the course module". Partial config update via AI.

- [ ] **Preview and publish flow** — Preview rendered store before going live. One-click publish to `openbazaar.ai/store/{slug}`.

---

## Phase 2 — Creator Toolkit (AFTER PHASE 1)

Features that make creators cancel their Kajabi/Teachable subscriptions.

### P2 — Checkout Conversion (Research #3 says these BLOCK switching)

- [ ] **Coupons** — percentage/fixed discounts, expiry, usage limits, analytics
- [ ] **Order bumps** — "add this for $X" on checkout, per-product config
- [ ] **Post-purchase upsells** — one-click add after payment
- [ ] **Cart abandonment recovery** — detect abandoned carts, automated email sequences (1h, 24h, 72h)

### P2 — Production Wiring

- [ ] **Wire funnel builder to Supabase** — save/load funnels, funnel analytics (views, conversions, revenue)
- [ ] **Wire email marketing to Supabase** — sequences, segments, broadcasts. Configure SMTP for production (Resend or SendGrid).
- [ ] **Wire course platform to Supabase** — course → Stripe checkout → enrollment flow end-to-end
- [ ] **Content protection** — PDF stamping with buyer email, license key generation, file versioning

### P2 — POD Operations

- [ ] **Printful catalog/variant sync** — merchants can browse and select valid `variant_id`s in UI
- [ ] **Shipping rate estimation** — wire into checkout for physical/POD products
- [ ] **Fulfillment status dashboard** — submitted, in production, shipped, failed/canceled

---

## Phase 3 — Payments & Identity (AFTER PHASE 2)

Crypto/Nostr features. Research #3: "crypto differentiators should come AFTER the switching baseline is met."

### P3 — ArxMint Integration

- [ ] **Dual checkout UI** — Stripe + ArxMint as parallel options on one checkout page
- [ ] **BIP21 unified QR** — on-chain URI with `lightning=` BOLT11
- [ ] **Payment-agnostic order state machine** — `pending → confirmed → fulfilled → delivered`
- [ ] **ArxMint fulfillment webhook** — ArxMint POSTs to `/api/storefront/fulfill` after crypto payment
- [ ] **Zap-to-unlock** — NIP-57 zap → content unlocked for items < $5

### P3 — Nostr Auth

- [ ] **NIP-07 browser integration** — sign in with Alby, nos2x
- [ ] **NIP-98 HTTP auth** for API requests
- [ ] **NIP-05 DNS verification** for merchant credibility

### P3 — L402 Paywalls

- [ ] **HTTP 402 + macaroon + Lightning invoice** — pay-per-article, pay-per-lesson
- [ ] **Machine-payable endpoints** — AI agents can pay autonomously

---

## Completed (Security Hardening — 2026-03-05 overnight run)

These are done. Do not re-work.

- [x] Server-side pricing enforcement in crypto checkout (`1f43f84`)
- [x] Sanitize bookId filename and Content-Disposition (`8a41ece`)
- [x] Remove session ID from auth-status response (`3224e89`)
- [x] Remove error.message from OAuth callback redirect (`9ce08d3`)
- [x] Upgrade npm deps for high-severity vulns (`ad5ee75`)
- [x] Replace unsafe-inline CSP with nonces (`9e0dec2`)
- [x] SSRF protection on federation peer requests (`ae63af1`)
- [x] Mask error messages in staging via EXPOSE_ERRORS (`62d36da`)
- [x] Remove error.message from magic link redirect (`8d257ed`)
- [x] Narrow CSRF exemption for storefront routes (`0082c43`)
- [x] Printful fulfillment provider + webhooks (`353254a`, `ac00bee`)
- [x] Lulu POD fulfillment in storefront provider flow (`ac00bee`)

---

## Not On This List (Intentionally)

| Item | Why excluded |
|------|-------------|
| Federation revenue sharing | Phase 4 — network doesn't exist yet |
| NFT/IPFS pinning | Removed from roadmap entirely |
| Monero payments | Removed — focus on BTC/Lightning/ecash via ArxMint |
| BTCPay Server | ArxMint replaces this |
| DAO governance | Removed from roadmap |
| Amazon book tracking / digests | Publisher features, not marketplace core |
| `digestService.js` PERCENTILE_CONT fix | Dead code in SQLite path — irrelevant after Supabase migration |
| `amazonService.js` Math.random / SQL fixes | Publisher feature cleanup, not blocking |
