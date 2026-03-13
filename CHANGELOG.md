# Changelog

All notable changes to this project should be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- **Creator Dashboard** (`/creator-dashboard.html`) — unified UI for creating and managing stores, courses, and funnels
- **Store product checkout** (`POST /api/checkout/store-product`) — server-side price lookup from `store_products`, Stripe Checkout session, order creation, and webhook fulfillment for AI-generated store products
- **Store checkout webhook guard** — routes `store_product` orders to simplified fulfillment (complete + confirm, no book download flow)
- **My Courses endpoint** (`GET /api/courses/my-courses`) — lists courses created by the authenticated user
- **Funnel email sequence wiring** — `generate-and-save` now creates `email_templates` and `sequence_emails` records for each email in AI-generated sequences
- **courses.user_id migration** — `ALTER TABLE courses ADD COLUMN user_id TEXT` for creator ownership
- Creator Dashboard nav link in `account-dashboard.html`

### Changed
- Course `generate-and-save` changed from `authenticateAdmin` to `requireAuth` — regular users can create courses
- Funnel `generate` and `generate-and-save` changed from `authenticateAdmin` to `requireAuth` — regular users can create funnels
- Funnel `generate-and-save` uses session `userId` instead of hardcoded `'admin'`
- Store renderer: replaced dead `<a href="#checkout">` links with live `<button onclick="buyProduct()">` buttons
- Store renderer: injected checkout `<script>` into assembled HTML (prompts email, POSTs to store-product endpoint, redirects to Stripe)
- Store renderer: CTA section link changed from `#checkout` to `#products`
- Store builder `/save` route: queries products back with DB-assigned IDs, injects into config, re-renders HTML

- Canonical status tracking in `docs/reference/MARKETPLACE_STATUS_AND_TODO.md`
- Canonical roadmap gate model in `docs/ROADMAP.md`
- Root `CHANGELOG.md` to align with repo best-practice guidance
- Repo-wide best-practices audit in `docs/reference/BEST_PRACTICES_AUDIT.md`
- `specs/README.md` and `specs/repo-best-practices-audit.md`

### Changed
- Restored richer root and docs-index formatting while updating project status to match the current codebase
- Updated roadmap to separate working, partial, and planned work and to prioritize stabilization first
- Updated README and docs index to point readers to the status doc and changelog as truth sources
- Expanded `.claudeignore` to better match binary-file handling guidance
- Updated canonical docs after the full Jest baseline turned green (`40/40` suites, `517` passing tests, `2` skipped)

### Fixed
- Documentation drift where implemented features were still described as missing or purely roadmap items
- Greened the previously failing Jest baseline by fixing callback/promise DB helper compatibility, normalizing Jest `axios` resolution, and updating stale route/test harness coverage for checkout, webhook, download, email tracking, and Lulu POD tests
