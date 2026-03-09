# Human Tasks — OpenBazaar AI

Items requiring human action (credentials, accounts, external services, business decisions).
These cannot be completed autonomously.

- [ ] [HT-001] CREATE .env FILE — Copy `marketplace/backend/.env.example` to `.env`. Set real values for: `SESSION_SECRET` (random 64-char string), `ADMIN_PASSWORD_HASH` (run `node marketplace/backend/scripts/generate-password-hash.js --generate`), `DATABASE_PATH`, and Stripe test keys (`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`). — Reason: Contains credentials, must be done by human in secure environment
**Prep status:** PREPPED
**Prepped details:** No browser tab needed — offline task. Step-by-step instructions ready in human_prep_output.json. Commands to run: `cp marketplace/backend/.env.example .env` then `node marketplace/backend/scripts/generate-password-hash.js --generate`. Human still needs to: (1) Copy the file, (2) Run password hash generator, (3) Paste Stripe test keys from dashboard.stripe.com/apikeys, (4) Set a random SESSION_SECRET.

- [ ] [HT-002] CONFIGURE SMTP FOR EMAILS — Set `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASSWORD` in `.env` with real SMTP credentials (SendGrid, Mailgun, or similar). Without this, magic link auth emails and order confirmations won't send. — Reason: Requires account setup and credential management
**Prep status:** PREPPED
**Prepped details:** No browser tab (Chrome unavailable). Recommended path: Use Gmail with App Password (easiest). Instructions: (1) Go to myaccount.google.com/apppasswords, (2) Create app password for "Mail", (3) Set EMAIL_HOST=smtp.gmail.com, EMAIL_PORT=587, EMAIL_USER=your@gmail.com, EMAIL_PASS=<app-password> in .env. Alternative: sendgrid.com/solutions/email-api (free 100 emails/day) — create account, get API key, use EMAIL_USER=apikey, EMAIL_PASS=<sendgrid-api-key>.

- [ ] [HT-003] CONFIGURE CRYPTO WALLET ADDRESSES — Set `BTC_ADDRESS`, `LTC_ADDRESS`, `XMR_ADDRESS` in `.env` with real wallet addresses for crypto payments. Current fallback is 'CONFIGURE' placeholder. — Reason: Requires wallet setup by operator
**Prep status:** SKIPPED
**Skip reason:** Purely offline — requires human's own wallet software. No web action to pre-fill. Human needs to: open their BTC/LTC/XMR wallets, copy receive addresses, paste into .env.

- [ ] [HT-004] STRIPE KEY VERIFICATION — Verify Stripe publishable key is set in environment and matches the secret key (same account, both test or both live). Once task 008 is complete, the frontend will load the key dynamically — human must ensure it's set correctly. — Reason: Financial account credentials
**Prep status:** PREPPED
**Prepped details:** No browser tab (Chrome unavailable). Human needs to: (1) Go to https://dashboard.stripe.com/apikeys, (2) Copy both "Publishable key" (starts pk_test_) and "Secret key" (starts sk_test_), (3) Verify they are from the same account, (4) Paste into .env as STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY. For webhooks: go to https://dashboard.stripe.com/webhooks, create endpoint for your server URL + /api/webhook, copy signing secret (whsec_...) into STRIPE_WEBHOOK_SECRET.

- [ ] [HT-005] DEPLOY TO PRODUCTION — NOT AUTOMATABLE (confirmed tasks 070+071): Docker Desktop is not installed on this machine (docker command not found in PATH, confirmed task 070); no Render API credentials found in .env (confirmed task 071). Human must manually deploy using one of these approaches: (a) Install Docker Desktop from the Docker website, then use it to rebuild the image and start the containers, OR (b) Log into the Render dashboard and click Manual Deploy on your service. — Reason: All agent-accessible deployment paths have been tried and confirmed impossible without human action.
**Prep status:** PREPPED
**Prepped details:** No browser tab needed. All 72 automated tasks are complete. Docker Desktop is NOT installed on this machine — task 070 confirmed this by checking the system PATH (docker command not found). Human must install Docker Desktop first (see docker.com/products/docker-desktop). After installing, use Docker Desktop or the Docker CLI to rebuild and restart the containers. Alternatively, log into render.com, find your openbazaar-ai service, and click Manual Deploy on the latest commit. Dockerfile is verified correct (commit 1f5e947 added build tools for bcrypt). To verify a successful deploy, check your domain's health endpoint by visiting it in a browser.
**Automation status:** NOT AUTOMATABLE — Docker Desktop not installed (confirmed task 070); No Render API credentials in .env (confirmed task 071); both deployment paths require human action.

- [x] [HT-006] ROTATE LEAKED TENEO_CLIENT_SECRET — The production OAuth client secret `[REDACTED]` was committed to the public `.env.example` file. **PARTIAL FIX APPLIED:** The secret value and misleading comment have been replaced with a placeholder in `.env.example` (current working tree). Remaining steps: (1) Immediately rotate/revoke this secret in the OAuth provider (Teneo Auth admin panel), (2) Rewrite git history to remove the secret from all past commits: `git filter-repo --path .env.example --invert-paths` or BFG Repo Cleaner, (3) Force-push to remote and notify all collaborators to re-clone. — Reason: Credential rotation requires account access to OAuth provider; git history rewriting requires repo admin access and coordination with all contributors
**Prep status:** PREPPED
**Prepped details:** Code fix applied — `.env.example` line 96 now reads `# TENEO_CLIENT_SECRET=your-client-secret-here` and the misleading NOTE comment (lines 100-102) has been removed. Human still needs to: (1) Log into Teneo Auth admin panel and IMMEDIATELY revoke/rotate the secret `0DOrM6B...`, (2) Run `pip install git-filter-repo && git filter-repo --path-glob '.env.example' --replace-text <(echo '[REDACTED]==>REDACTED')` to clean git history, (3) Force-push: `git push --force --all` after confirming all collaborators are aware.

- [ ] [HT-007] PORT ARXMINT L402/CASHU PAYMENTS — `arxmintService.js` scaffold (task 090) has 3 stub methods. Full port requires source at `C:\code\arxmint` which does not exist on this machine. Options: (a) Clone/copy arxmint repo to `C:\code\arxmint`, then re-run task synthesizer to create the worker task, OR (b) Implement L402 from scratch using bolt11 + lnurl libraries. Wire into `downloadRoutes.js`. — Reason: Cross-repo source not available at expected path.

- [ ] [HT-008] ADD SUPABASE ENV VARS TO VERCEL — Set `DATABASE_URL` (or `SUPABASE_DB_URL`), `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` in Vercel project settings. — Reason: requires Vercel dashboard access (deployment config)

- [ ] [HT-009] RUN SUPABASE MIGRATION — Execute `marketplace/backend/database/supabase-migration.sql` in Supabase SQL editor and verify critical tables exist: `profiles`, `orders`, `products`, `stores`, `subscribers`, `funnels`, `courses`, `payment_events`, `webhooks`. — Reason: requires Supabase project access

- [ ] [HT-010] VERIFY PRODUCTION ENV VARS — Confirm `SESSION_SECRET`, Stripe keys, email provider env vars, and ArxMint env are set in the production deployment (Render/Vercel). See `marketplace/backend/.env.example` for the full list. — Reason: requires access to deployment platform secrets

- [ ] [HT-011] SMOKE TEST PRODUCTION ENDPOINTS — After Supabase env vars and migration are done: (1) Verify landing page loads at https://openbazaar.ai/, (2) Verify https://openbazaar.ai/api/storefront/catalog returns product JSON, (3) Verify https://openbazaar.ai/api/health returns HTTP 200. — Reason: requires live deployment access

- [ ] [HT-012] ADD POD ENV VARS TO DEPLOYMENT — Add `PRINTFUL_API_KEY`, `LULU_CLIENT_KEY`, `LULU_CLIENT_SECRET` to Vercel/Render project settings, then run a test POD order in Printful's staging environment to validate end-to-end. — Reason: requires Vercel project settings access and external Printful/Lulu accounts

- [ ] [HT-013] INSTALL CHROME FOR LAST-MILE TESTS — Install Chrome or Chromium on the CI/test runner so the CDP-based last-mile test suite can collect real browser evidence. All 10 last-mile scenarios were skipped with "CDPEvidenceCollector setup failed — Chrome not available". Consider using a headless Chrome Docker image (e.g., browserless/chrome) if running in CI. — Reason: requires system-level Chrome installation on test host

- [ ] [HT-014] SET ANTHROPIC_API_KEY FOR AI STORE BUILDER — Once task 013 (AI Store Builder) is deployed, set `ANTHROPIC_API_KEY` in the production environment. Without it the `/api/store-builder/generate` endpoint will return 500. Get key from console.anthropic.com. — Reason: requires Anthropic account access and deployment platform secrets

- [ ] [HT-015] DOGFOOD AI STORE BUILDER — Run at least 3 internal builds using realistic business briefs (soy candle store, course business, service business with funnel). Evaluate quality, fix anything broken. — Reason: requires human judgement and real-world testing; cannot be fully automated.

- [ ] [HT-016] CREATE CASE STUDIES FROM INTERNAL BUILDS — Take the best 1-2 dogfood builds and create case studies with screenshots showing the before/after or the generated store output. — Reason: requires human review, screenshot capture, and editorial judgement.

- [ ] [HT-017] PUBLISH AI STORE BUILDER SERVICE PAGE — Publish a service page or gig listing for the AI Store Builder (openbazaar.ai or external platform like Gumroad/Fiverr). Define pricing tiers (Builder $X, Pro $Y, White-label $Z). — Reason: requires human decision on pricing, platform selection, and content writing.

- [ ] [HT-018] CONFIRM READ-ONLY FILESYSTEM IN PRODUCTION — Verify that the deployed backend no longer attempts to write to read-only filesystem paths (e.g., SQLite .db files in a Vercel/serverless environment). Check Render/Vercel logs for EROFS errors after deployment. — Reason: requires access to production deployment logs and filesystem configuration.

- [ ] [HT-019] CONFIGURE SMTP FOR PRODUCTION — Set `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_PORT` in Vercel/Render project settings for transactional emails (magic links, order confirmations, license keys). Recommended: Resend or SendGrid (100 free emails/day). — Reason: requires external email provider account and deployment platform access.
