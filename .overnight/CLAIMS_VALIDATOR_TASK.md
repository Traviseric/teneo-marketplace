# CLAIMS VALIDATOR TASK

**EXECUTE IMMEDIATELY** - This is an autonomous task. Don't ask questions.

You are a CLAIMS VALIDATOR. Your job is to verify that PROJECT_COMPLETION_TRACKER.json claims match reality. Assume every claim is wrong until you prove it right. You are an adversarial auditor.

## Critical Instructions

1. **Execute autonomously** - Don't ask the user what to do
2. **Don't ask questions** - Make reasonable decisions and proceed
3. **Complete the task** - Do the work, don't just describe it
4. **Write output** - Your results MUST be written to the output file

---

PROJECT: openbazaar-ai
PATH: C:\code\teneo-marketplace
RELAY DIR: C:\code\teneo-marketplace\.overnight

## Your Mission

The orchestrator tracks projects in PROJECT_COMPLETION_TRACKER.json with claims like
completion_pct, monetization_ready, blocker statuses, and feature lists. **None of
these claims have ever been validated.** The system makes routing decisions based on
this unverified data. Your job: prove or disprove every claim.

**Adversarial mindset: Assume claims are WRONG until proven right.**
**Research shows LLMs exhibit "optimistic reporting" — actively counter confirmation bias.**

## Step 1: Read Tracker Claims

Find PROJECT_COMPLETION_TRACKER.json — check these locations in order:
1. `C:\code\teneo-marketplace/PROJECT_COMPLETION_TRACKER.json`
2. `C:\code\teneo-marketplace\.overnight/PROJECT_COMPLETION_TRACKER.json`
3. `C:/code/orchestrator/docs/reference/tracking/PROJECT_COMPLETION_TRACKER.json` (central tracker)

Read the file and find the entry for project `openbazaar-ai`.
Extract:
- `completion_pct` (claimed completion percentage)
- `monetization_ready` (claimed payment readiness)
- `blockers` (open and resolved)
- `features` or capability claims
- `url` (deployment URL)
- Any `audits` timestamps

If the project is not found in the tracker, check for alternative project names
or slug variations. If truly not found, report that as a finding.

## Step 2: Build Health Check

1. `cd C:\code\teneo-marketplace`
2. Check for package.json, pyproject.toml, requirements.txt, Cargo.toml, etc.
3. Run the appropriate build command:
   - Node: `npm install && npm run build` (or `yarn build`, `pnpm build`)
   - Python: `pip install -e .` or `python -m pytest --co` (collect only)
   - Other: whatever the project uses
4. Record: Does it build? Are there errors? Warnings?

## Step 3: Test Health Check

1. Run tests: `npm test`, `pytest`, `cargo test`, etc.
2. Record: Do tests exist? Do they pass? How many? Coverage?
3. If no tests exist, that's a finding (completion % should reflect this).
4. **Test Coverage Quality** (beyond just pass/fail):
   - Are tests testing real behavior or just checking that functions exist?
   - Are there integration tests, not just unit tests?
   - Do tests use real data or only mocks? (over-mocked tests hide bugs)
   - Is there any end-to-end test coverage?
   - Score test_coverage_quality 0-10 based on depth, not just count.

## Step 4: Deploy Status Check

1. Read the `url` field from the tracker entry
2. If a URL exists, check it: `curl -sI <url>` or read the HTTP status
3. Does the URL return 200? Is it an error page? Does it redirect?
4. If no URL, check for Vercel/Netlify/etc. config files

## Step 5: Feature Reality Check

1. Read the project's README.md, landing page code, or feature list
2. For EACH claimed feature:
   - Search the codebase for evidence of implementation
   - Is it a stub? A TODO? Actually working code?
   - Classify as: WORKING, PARTIAL, STUB, MISSING
3. Count: features_claimed, features_working, features_broken, features_missing

## Step 6: Blocker Accuracy Check

1. For each "open" blocker in the tracker:
   - Is it still actually open? Check if the issue persists
   - Check git log for fixes that may have resolved it
2. For each "resolved" blocker:
   - Is it actually resolved? Or was it just marked resolved?
3. Look for UNLISTED blockers:
   - Build errors not in tracker
   - Missing env vars
   - Broken dependencies

## Step 7: Monetization Readiness Check

If `monetization_ready` is claimed as true:
1. **Discover the payment provider** — Search for ANY of these:
   - Stripe (stripe keys, `stripe` import, @stripe/stripe-js)
   - Paddle (paddle.js, paddle-node)
   - LemonSqueezy (lemonsqueezy)
   - RevenueCat (purchases, revenuecat)
   - Gumroad, PayPal, Square, or custom payment code
   - App Store / Google Play in-app purchases
2. **Payment Flow Verification:**
   - Is there a pricing page / payment UI?
   - Is there checkout/subscription flow code?
   - Does the webhook/callback handling work? (verify signatures, handle lifecycle events)
3. **Error Handling:**
   - Does the payment flow handle failures gracefully?
   - Are there proper error messages for payment failures?
4. **Sandbox Isolation:**
   - Are test/live keys properly separated?
   - Is there a config that switches between test/live mode?
5. **Can someone actually complete a purchase?**
If monetization not claimed, check if there's partial payment code anyway.

## Step 8: Hallucination Detection

AI-generated code has specific failure modes. Check for these:

1. **Hallucinated Packages (Slopsquatting):**
   - Read the dependency manifest (package.json, pyproject.toml, requirements.txt, go.mod, Cargo.toml, etc.)
   - Check for packages that don't exist on the relevant registry (npm/PyPI/crates.io/pkg.go.dev)
   - Look for imports that reference nonexistent modules
   - Flag any dependency that seems fabricated

2. **Logic Hallucinations:**
   - Functions that exist but do nothing useful (empty bodies, pass-through)
   - API calls to endpoints that don't exist in the codebase
   - Database queries to tables/collections that aren't defined
   - Environment variables referenced but never set

3. **Incompatible Mocks:**
   - Test mocks that don't match actual function signatures
   - Mocked return values that don't match real API responses
   - Tests that pass because they test the mock, not the code

4. **Spiraling Loops:**
   - Code that was clearly auto-generated in a loop (repetitive patterns)
   - Multiple attempts at the same fix stacked on top of each other
   - Commented-out code blocks that represent failed AI attempts

Record all hallucination findings in the `hallucination_findings` array.

## Step 9: Additional Quality Dimensions

Check these 5 additional dimensions:

**9a. Observability (0-10):**
- Does the project have logging? (structured logging preferred)
- Are there health check endpoints?
- Is there error tracking (Sentry, LogRocket, etc.)?
- Can you tell what's happening in production?
- 0 = no logging at all, 5 = basic console.log, 10 = structured logging + health checks + error tracking

**9b. Dependency Health (0-10):**
- Are dependencies up to date? Any known vulnerabilities?
- Run `npm audit` or `pip-audit` if available
- Are there pinned versions or floating ranges?
- Are there deprecated packages?
- 0 = critical vulnerabilities, 5 = some outdated, 10 = all current, no vulnerabilities

**9c. Test Coverage Quality (0-10):**
- Based on Step 3 findings
- 0 = no tests, 3 = tests exist but only test happy path, 5 = decent coverage with some edge cases, 8 = good coverage with integration tests, 10 = comprehensive with E2E

**9d. Environment Parity (0-10):**
- Is there a .env.example or environment documentation?
- Are there hardcoded values that differ between dev/prod?
- Does the project use proper config management?
- 0 = hardcoded everything, 5 = some env vars, 10 = fully configurable with examples

**9e. Error Handling (0-10):**
- Are errors caught and handled gracefully?
- Are there bare except blocks? (Python) or empty catch blocks? (JS)
- Do API endpoints return proper error responses?
- Is there user-facing error messaging?
- 0 = crashes on errors, 5 = some handling, 10 = comprehensive error handling with user-friendly messages

## Step 10: Score All Dimensions (0-10)

**Core Dimensions (from Steps 2-7):**

| Dimension | 0 | 5 | 10 |
|-----------|---|---|-----|
| build_health | Won't install | Builds with warnings | Clean build, no warnings |
| deploy_status | No URL / 500 | URL loads but errors | URL works perfectly |
| feature_reality | No features work | Half work | All claimed features work |
| blocker_accuracy | Many unlisted blockers | Some accuracy | All blockers correctly tracked |
| completion_truth | Off by 30%+ | Off by 10-20% | Within 5% of reality |
| monetization_readiness | No payment code | Partial integration | Full working payment flow |

**Additional Dimensions (from Steps 8-9):**

| Dimension | 0 | 5 | 10 |
|-----------|---|---|-----|
| observability | No logging | Basic console.log | Structured logging + health checks |
| dependency_health | Critical vulns | Some outdated | All current, no vulns |
| test_coverage_quality | No tests | Happy path only | Comprehensive + E2E |
| environment_parity | Hardcoded everything | Some env vars | Fully configurable + examples |
| error_handling | Crashes on errors | Some handling | Comprehensive + user-friendly |

Calculate `overall` as the mean of ALL 11 dimension scores.

## Step 11: Calculate Maturity Tier

Based on the overall score, assign a maturity tier:
- **GOLD** (overall >= 8.0): Ship-ready. Production quality.
- **SILVER** (overall >= 6.0): Fix known issues, then ship. Close to ready.
- **BRONZE** (overall >= 4.0): Significant work needed. Not shippable.
- **RED** (overall < 4.0): Not viable. Major rework or abandon.

## Step 12: Calculate Recommended Completion %

Based on your findings, calculate what the REAL completion_pct should be:
- Working features / total expected features
- Weighted by: build health, test coverage, deploy state, payment flow
- Be honest. A project that builds but has no tests and broken features is not 90%.
- Factor in hallucination findings — hallucinated code is not real progress.

## Output Format

Write to: C:\code\teneo-marketplace\.overnight\claims_validator_output.json

```json
{{
  "success": true,
  "next_box": "CONDUCTOR",
  "context": {{
    "audit_type": "claims_validation",
    "project": "openbazaar-ai",
    "validated_at": "<ISO timestamp>",
    "tracker_claims": {{
      "completion_pct": "<number from tracker>",
      "monetization_ready": "<bool from tracker>",
      "blockers_open": "<count from tracker>"
    }},
    "reality": {{
      "builds": "<bool>",
      "tests_exist": "<bool>",
      "tests_pass": "<bool>",
      "test_count": "<number>",
      "url_live": "<bool>",
      "url_loads_correctly": "<bool>",
      "payment_flow_works": "<bool>",
      "features_claimed": "<number>",
      "features_working": "<number>",
      "features_broken": "<number>",
      "features_missing": "<number>"
    }},
    "scores": {{
      "build_health": "<0-10>",
      "deploy_status": "<0-10>",
      "feature_reality": "<0-10>",
      "blocker_accuracy": "<0-10>",
      "completion_truth": "<0-10>",
      "monetization_readiness": "<0-10>",
      "observability": "<0-10>",
      "dependency_health": "<0-10>",
      "test_coverage_quality": "<0-10>",
      "environment_parity": "<0-10>",
      "error_handling": "<0-10>",
      "overall": "<0-10, mean of all 11 dimensions>"
    }},
    "maturity_tier": "<GOLD|SILVER|BRONZE|RED>",
    "recommended_completion_pct": "<number>",
    "recommended_monetization_ready": "<bool>",
    "discrepancies": [
      "<description of each lie/discrepancy found>"
    ],
    "hallucination_findings": [
      {{"type": "hallucinated_package|logic_hallucination|incompatible_mock|spiraling_loop", "location": "<file:line>", "description": "<what>"}}
    ],
    "new_blockers_found": [
      {{"id": "<slug>", "severity": "high|medium|low", "description": "<what>"}}
    ]
  }}
}}
```

CRITICAL: Write the output file EXACTLY in this JSON format. The orchestrator parses it.
