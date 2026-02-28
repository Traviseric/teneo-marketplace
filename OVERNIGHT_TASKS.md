# Teneo Marketplace — Overnight Tasks

## Pre-Flight (Must Pass Before Any Feature Work)

- [ ] **P0: Verify npm install works** — Dependencies not installed. Run `npm install` in project root. Verify express, sqlite3, stripe, bcrypt, nodemailer all resolve. Fix any native module build issues (bcrypt needs C++ compiler on Windows).
- [ ] **P0: Verify server starts** — After install, run `npm start` and confirm server listens on port 3001. Fix any missing module errors.
- [ ] **P0: Verify database init** — Run `node marketplace/backend/database/init.js`. Confirm all tables created from schema.sql + schema-lulu.sql. Server should auto-init on startup too.
- [ ] **P0: Create .env from .env.example** — Copy marketplace/backend/.env.example to .env. Set SESSION_SECRET, ADMIN_PASSWORD_HASH (use generate-password-hash.js), DATABASE_PATH. Stripe keys can be test keys for now.

## Tier 1: Core Product (Make It Usable)

- [ ] **Dual auth system: Teneo Auth SSO + Nostr/Alby login** — The marketplace needs two auth providers matching its dual-mode architecture. **Primary mode:** Teneo Auth SSO (OAuth 2.0 + PKCE) for mainstream users — follow `C:\code\.claude\TENEO-AUTH-SETUP.md` Part 2B (Express.js backend). Register teneo-marketplace domains in teneo-auth CORS + JWT allowed domains, add service slug, create Express middleware to validate Teneo JWTs. **Fallback mode:** Nostr login via NIP-07 browser extension (Alby/nos2x) — port the pattern from `C:\code\arxmint\lib\nostr-auth.ts` and `C:\code\arxmint\components\nostr-login.tsx`. Implement NIP-98 HTTP auth for API route protection. The existing `marketplace/backend/auth/AuthProvider.js` pluggable system supports multiple providers — add TeneoAuthProvider and NostrAuthProvider alongside the existing local provider.
- [ ] **Frontend auth pages** — No login/register UI exists. Create login.html with three options: (1) Email magic link (existing local auth), (2) "Sign in with Teneo" SSO button, (3) "Connect with Nostr" button (NIP-07 extension detection → connect flow). Create account-dashboard.html showing user profile, orders, downloads, course access. Wire frontend auth.js to /api/auth/* endpoints. Add session detection to navbar on all pages.
- [ ] **Test suite setup** — package.json has `"test": "echo Error"`. Set up Jest or Mocha. Write tests for: server startup, health endpoint, auth routes (all 3 providers), checkout flow, brand API, database init. Update `npm test` to actually run them.
- [ ] **End-to-end purchase flow** — Verify: browse catalog → add to cart → Stripe checkout → order created → download token generated → email sent → PDF download works. Fix any broken links in the chain.
- [ ] **Admin dashboard verification** — Verify admin login, book management, order viewing, brand management all work through the UI. Fix any broken admin routes.

## Tier 2: Integration (Wire Everything Together)

- [ ] **Component library validation + template system** — This is the foundation for the AI builder (Claude Code as page builder instead of drag-and-drop). 17/50 components implemented in `marketplace/frontend/components-library/`. Verify every implemented component renders correctly standalone. Validate the `{{VARIABLE}}` template substitution system works end-to-end: load component → inject brand variables from `config.json` → render final HTML. Fix any broken components. Ensure `COMPONENT_MANIFEST.json` accurately lists what's implemented vs placeholder. Test multi-component page assembly: pick 3-4 components (hero + email capture + pricing + CTA), compose them into a single page with a brand theme applied via CSS variables. This is the contract that makes "describe what you want → get a working page" possible — every component must be self-contained, variable-driven, and brand-swappable. See `docs/development/AI_BUILDER_STRATEGY.md` for the full vision.
- [ ] **Course platform integration** — 5 course components built in isolation (course-module/). Not integrated into marketplace. Add "course" as product type, create course landing page, add access control after purchase, link progress tracking to user accounts.
- [ ] **Email service configuration** — Email service code exists but no SMTP configured. Add SendGrid or similar as default provider. Test order confirmation emails, magic link auth emails, download link emails. Add email logs to admin dashboard.
- [ ] **Funnel module integration** — funnel-module/ exists separately. Wire funnel builder into marketplace so brands can create landing pages and sales funnels from the admin dashboard.
- [ ] **Federation network testing** — Network registry and cross-node discovery routes exist. Test with a second local node. Verify: node registration, cross-node search, revenue sharing calculations, failover routing.

## Tier 3: ArxMint Payment Layer Integration

ArxMint (`C:\code\arxmint`) is the open-source Bitcoin payment network that replaces the marketplace's basic crypto checkout with real infrastructure. Together they form a complete economy: teneo-marketplace is where creators sell (courses, books, funnels, digital products), arxmint is how they get paid (ecash, Lightning, Fedimint). Same Nostr identity across both. Zero platform fees on crypto payments. Can't be deplatformed because the payment layer is decentralized too.

- [ ] **L402 paywall for digital content** — Replace the manual "send Bitcoin to address, wait for confirmation" flow with instant L402 paywalls. When a buyer hits a download/course endpoint, return HTTP 402 with a Lightning invoice. Buyer pays via Alby, preimage unlocks the content automatically. Port the L402 pattern from `C:\code\arxmint\app\api\l402\route.ts` (HMAC-signed macaroons, preimage verification, LND invoice generation). Wire into `marketplace/backend/routes/download.js` and any course access endpoints. This makes digital content purchases instant and zero-fee compared to Stripe's 2.9% + 30c.
- [ ] **Cashu ecash micropayments (NUT-24)** — For small purchases ($1-5 ebooks, individual course lessons, tips), Stripe fees are a rip-off. Port ArxMint's NUT-24 ecash paywall from `C:\code\arxmint\lib\cashu-paywall.ts`. Buyers with ecash tokens pay directly — no Lightning routing fees, instant settlement, full privacy. Add `Authorization: Cashu <token>` support alongside existing `Authorization: L402` in payment middleware. This enables per-lesson course access, pay-per-chapter books, and micropayment tipping that's impossible with Stripe.
- [ ] **Spend router integration** — Port ArxMint's spend router from `C:\code\arxmint\lib\spend-router.ts` as payment path middleware. Marketplace doesn't decide whether to use Cashu vs Lightning vs on-chain — the router picks automatically based on amount (small → ecash, medium → Lightning, large → on-chain) and buyer's privacy preference. Add a `PaymentRouter` service in `marketplace/backend/services/` that wraps this logic. All crypto checkout routes go through the router instead of hardcoded payment paths.
- [ ] **Shared Nostr identity** — Both projects already use NIP-07 login (Alby extension). Ensure the same pubkey/session works across both apps. A creator logs into teneo-marketplace to manage their store AND into arxmint to manage their payment infrastructure with one Nostr identity. Verify session tokens are compatible or share the same auth middleware pattern.
- [ ] **Federation revenue sharing via Fedimint** — The marketplace already has federation with 10-20% revenue sharing between nodes. Currently this is tracked in SQLite with no actual payment settlement. Wire ArxMint's Fedimint federation (`C:\code\arxmint\lib\fedimint-sdk.ts`) so revenue shares are settled automatically in ecash within the federation. Each marketplace node in the network holds ecash in the shared federation — referral fees get routed as Cashu tokens. This makes the federation economically real, not just a database entry.

## Tier 4: Production Hardening

- [ ] **Security audit** — Review CSRF protection, rate limiting, session config, input validation on all routes. Check for SQL injection in raw queries. Verify secure download token expiration. Run through SECURITY_SETUP_GUIDE.md checklist.
- [ ] **Error handling** — Add proper error middleware to Express. Ensure all routes return consistent error format. Add request logging. Handle SQLite connection errors gracefully.
- [ ] **API documentation** — 26 route files with no OpenAPI spec. Generate Swagger/OpenAPI docs from existing routes. Create API reference page accessible from docs/.
- [ ] **Docker deployment test** — Run `docker-compose up` and verify the full stack (app + nginx + redis) works. Test with both primary mode (Stripe) and fallback mode (crypto). Verify health monitoring and failover.

## Connected Project: ArxMint

ArxMint (`C:\code\arxmint`, github.com/Traviseric/arxmint) is the other half of this system. Teneo Marketplace is the storefront — where creators build courses, funnels, and sell books. ArxMint is the payment network — L402 paywalls, Cashu ecash, Fedimint federations, Lightning. Both are open source, both use Nostr auth, and together they create a complete creator economy that can't be deplatformed.

The vision: a creator deploys a teneo-marketplace node, connects arxmint as the payment layer, and has a full business — store, courses, email marketing, funnels, payments — with zero platform risk. Stripe works when it works. When it doesn't, arxmint takes over with ecash and Lightning. No downtime, no lost revenue.

## Constraints

- This is a PUBLIC repo — never commit credentials, customer data, PDFs, or teneo-express/
- Content generation (books, courses) happens in teneo-production (private) — this repo is the marketplace/storefront only
- Frontend is vanilla HTML/CSS/JS — no React/Vue/Angular. Keep it that way.
- SQLite is the database — no Postgres migration needed for MVP
- Dual-mode architecture (Stripe primary, crypto fallback) must be preserved in all changes

---

## Next Session Work (added 2026-02-28 — session run_20260228_003906)

Session summary: 73 tasks completed, 83 rounds, ~6 hours. Core marketplace verified at localhost:3003.
Test suite: 71 tests passing, 9 suites. Review audit: 100% (15/15 verified). Last-mile: PARTIAL (6/10).

### P0 — Immediate / Critical

- [ ] **HT-006 URGENT: Rotate leaked OAuth client secret** — `TENEO_CLIENT_SECRET=[REDACTED]` is committed in plaintext in `.env.example:96` in a public repo. Immediately rotate/revoke this value in teneo-auth. Replace with placeholder `your-client-secret-here`. Scan git history with trufflehog/git-secrets for any other committed secrets. Consider `git filter-branch` or BFG Repo Cleaner if the secret has significant exposure. (CWE-312)
- [ ] **Fix course enrollment auth bypass** — `marketplace/backend/routes/courseRoutes.js:121` uses email-only auth (`?email=victim@example.com`) with no session validation. Anyone who knows an enrolled user's email can access all paid course content. Replace with proper `req.session.isAuthenticated` check. (CWE-287, critical security)
- [ ] **Run browser last-mile tests** — 3 last-mile scenarios skipped due to HTTP-only testing: `console_errors` (check browser console for JS errors), `responsive_layout` (resize viewport to 375px and verify layout), `images_load` (verify all images render without broken icons). Run with browser automation against `http://localhost:3003`. Goal: upgrade PARTIAL verdict to GO.
- [ ] **Verify unreviewed accessibility tasks** — Tasks 053-058 were marked completed but not independently verified by review_audit. Spot-check the implementations: 053 (account-dashboard.html avatar role/icon aria-hidden/r.ok check), 054 (course-player.html captions track/focus indicators/SVG title), 055 (crypto-checkout.html keyboard-accessible payment method divs), 056 (admin-course-builder.html visible labels), 057 (downloads.html aria-disabled on button state changes), 058 (admin.html table scope attributes). Fix any that are incomplete.

### P1 — High Priority

- [ ] **HT-001: Configure .env with production credentials** — Copy `.env.example` to `.env`. Set: `SESSION_SECRET` (random 32+ char string), `ADMIN_PASSWORD_HASH` (use `node marketplace/backend/scripts/generate-password-hash.js --generate`), `DATABASE_PATH`, `STRIPE_SECRET_KEY` (real key), `TENEO_CLIENT_SECRET` (after rotation). Required for full production startup.
- [ ] **HT-002: Configure SMTP for magic link auth** — Set `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS` in `.env`. Test magic link email delivery. Without this, auth flow cannot complete end-to-end (form is present and accessible but submission is dead).
- [ ] **HT-003: Configure Stripe webhook** — Set `STRIPE_WEBHOOK_SECRET` from Stripe dashboard. Required for order fulfillment after payment. Without this, purchases cannot be automatically fulfilled.
- [ ] **HT-004: Set up production database** — Run `node marketplace/backend/database/init.js` in production environment. Verify all tables created from `schema.sql` + `schema-lulu.sql`. Load real book data: `node marketplace/backend/scripts/create-real-data.js`.
- [ ] **HT-005: Deploy and verify Docker stack** — Run `docker compose build` and `docker compose up` (requires Docker Desktop). Verify full stack (app + nginx + redis) starts cleanly. Check health endpoint responds. This requires Docker Desktop installed on the deployment machine.

### P2 — Medium Priority (Deferred Findings + Partial Features)

- [ ] **Implement Stripe→Crypto auto-failover** — Feature audit found this is MISSING (flagged as "AUTOMATIC FAILOVER" in README but not implemented). Add health monitor for Stripe availability. Add middleware in checkout flow that checks Stripe health and presents crypto options automatically when Stripe is unavailable. Wire to existing `cryptoCheckout` routes. (feature_audit: critical)
- [ ] **Implement real-time crypto pricing** — `cryptoCheckout.js` uses hardcoded static amounts. Integrate CoinGecko API (or similar) for real-time BTC/XMR→USD conversion. Store orders in database at creation time (currently not persisted). (feature_audit: high stub)
- [ ] **Replace AI page builder regex with real LLM** — `aiPageBuilderService.js:parseIntent()` uses if/else string matching, not AI. Integrate the existing OpenAI client (already used in `aiDiscoveryService.js`) to parse natural language page intent. (feature_audit: high stub)
- [ ] **Fix duplicate `payment_intent_data` key in checkoutProduction.js** — Lines 138-151 define `payment_intent_data` twice; second definition silently overwrites first, losing `description` and `orderId` metadata. Merge into single object with all fields. (review_audit quality finding)
- [ ] **Fix `search_duration_ms` hardcoded to 0 in aiDiscoveryService.js** — Line 600 hardcodes `search_duration_ms: 0` instead of measuring actual search time. Minor quality issue introduced by task 065. (review_audit low)
- [ ] **Fix SQL template literal injection in amazonService.js:708** — `${days}` used directly in SQL template literal. While currently called with internal values, add parameterized query for safety. (review_audit low, pre-existing)
- [ ] **Fix dead PERCENTILE_CONT SQL block in digestService.js** — Lines 421-436 are unreachable dead code. Remove or implement properly. Also replace `console.log` error calls with `console.error`. (review_audit low, pre-existing)

### P3 — Lower Priority (Roadmap / Future Work)

- [ ] **Implement course platform backend** — `course-module/` contains only `course-config.js` and blueprint PDF. No backend routes, no API, no database schema for courses. Implement: course routes, `schema-courses.sql`, enrollment service, progress tracking, drip content. Mount in `server.js`. (feature_audit: critical missing)
- [ ] **Implement cross-node federation** — `/api/network/search` explicitly comments "return results from local search. In future, this will aggregate from network stores." Implement peer-to-peer catalog sync with signed HTTP requests. Add revenue sharing calculation + payment routing in checkout when referral detected. (feature_audit: critical missing)
- [ ] **Deploy NFT smart contracts** — `.sol` files for BookOwnership, KnowledgeBadges, LibraryInheritance exist but not compiled/deployed. Run `npx hardhat compile`, deploy to Polygon Mumbai testnet, configure `CONTRACT_ADDRESS` env vars, wire up TODO contract call blocks in `nftService.js`. (feature_audit: high stub)
- [ ] **Implement IPFS content integration** — `nftService.js` references Pinata IPFS pinning in comments but no actual upload logic. `ipfs_pins` table never written to via real IPFS ops. Implement Pinata SDK integration for actual content pinning post-purchase. (feature_audit: critical missing)
- [ ] **ArxMint integration: L402 paywalls** — Replace manual crypto payment flow with instant L402 paywalls. Port pattern from `C:\code\arxmint\app\api\l402\route.ts`. Wire into `marketplace/backend/routes/download.js` and course access endpoints. (Tier 3 roadmap)
- [ ] **ArxMint integration: Cashu ecash micropayments** — Port NUT-24 ecash paywall from `C:\code\arxmint\lib\cashu-paywall.ts`. Add `Authorization: Cashu <token>` support alongside `Authorization: L402`. Enables per-lesson course access and $1-5 micropurchases without Stripe fees. (Tier 3 roadmap)
- [ ] **Replace newsletter.js localStorage stub** — `marketplace/frontend/js/newsletter.js` uses `setTimeout + localStorage` with no backend API call. Wire to a real email list endpoint. (review_audit pre-existing note)
- [ ] **Replace hardcoded cart data in cart-custom.html** — Comment says "in real app, load from session/API". Implement session-based cart that persists across pages. (review_audit pre-existing note)
