# OpenBazaar AI Best Practices Audit

**Date:** March 9, 2026  
**Reference:** `C:\code\.claude\BEST_PRACTICES.md`

---

## Executive Summary

OpenBazaar AI is now materially closer to the TE Code repo baseline, but it is not fully compliant yet.

### Current Assessment

- **Passing:** core agent entrypoint contract, canonical roadmap presence, docs index presence, changelog presence, CLAUDE length target, binary-file ignore baseline
- **Partial:** documentation governance, specs discipline, roadmap evidence model, root cleanliness, verification posture
- **Failing / open:** root-file hygiene, full drift-control discipline, production proof for core flows

### Bottom Line

This repo now has the **documentation and planning scaffolding** expected by the guide, but it still needs **engineering stabilization** to satisfy the spirit of the standard.

---

## Audit Matrix

| Area | Expectation from Best Practices | Status | Notes |
|------|---------------------------------|--------|-------|
| `AGENTS.md` | Stable entrypoint contract | Pass | Present and correctly minimal |
| `CLAUDE.md` | Under 100 lines, lookup-table style | Pass | `94` lines |
| Canonical roadmap | Present, phased, current-state-aware | Pass | `docs/ROADMAP.md` updated |
| Docs index | Present and usable | Pass | `docs/README.md` updated |
| Changelog | Present at repo root | Pass | Added `CHANGELOG.md` |
| `specs/` dir | Present | Pass | Added `specs/` with README and audit spec |
| `.claudeignore` | Excludes binaries and large files | Pass | Expanded to cover `docx`, `xlsx`, `pptx` |
| Root cleanliness | Prefer 5-15 root files | Fail | Repo currently has `37` root files |
| Test posture | TDD / strong verification | Pass | Full local Jest baseline is green |
| Drift control | Docs/specs/runtime aligned | Partial | Improved, but older deep docs may still drift |
| Evidence-based roadmap | Gates backed by proof | Partial | Roadmap updated, but production proof still missing |
| Production engineering posture | Core flows proven | Partial | Not enough live proof yet |

---

## What Was Fixed In This Pass

- Added a root `CHANGELOG.md`
- Restored and improved richer docs instead of oversimplifying them
- Re-established canonical truth sources:
  - `README.md`
  - `docs/README.md`
  - `docs/ROADMAP.md`
  - `docs/reference/MARKETPLACE_STATUS_AND_TODO.md`
- Added `specs/`
- Expanded `.claudeignore` to better match binary-file handling guidance
- Added this audit document for traceable repo compliance review

---

## Current Gaps

### 1. Root Directory Hygiene

The guide prefers a cleaner root. This repo currently has `37` root files, well above the preferred range.

Why it matters:

- increases discovery noise
- makes agent entry less efficient
- makes repo state harder to scan quickly

Likely future action:

- move operational one-off files and legacy helper scripts into grouped subdirectories
- keep only the most important root entrypoints visible

### 2. Verification Baseline Is Green, But Still Noisy

Latest local run:

- `npm test -- --runInBand`
- `40` passing suites
- `0` failing suites
- `517` passing tests
- `2` skipped tests

This closes the biggest prior compliance gap, but the test output still includes avoidable schema and initialization noise in a few suites.

Why it matters:

- the guide emphasizes tests and back pressure
- a green suite strengthens roadmap and doc claims
- noisy setup paths still make failures harder to spot quickly

### 3. Drift Risk Still Exists

Although the canonical docs were corrected, there are still many historical and deep feature docs in the repo.

Risk:

- older docs may still describe planned work as complete
- future sessions may read stale documents first if not careful

### 4. Production Proof Gaps

The roadmap now correctly calls these out, but the repo still lacks documented proof for:

- one real Stripe digital purchase on the current deployed stack
- one real POD order on the current deployed stack
- fully validated Postgres/Supabase production path

---

## Verification and Test Findings

Observed strengths:

- non-trivial automated suite exists
- broad backend route and service surface is real
- health, auth, subscriptions, referrals, and builder systems are not just roadmap text

Observed weaknesses:

- test output still includes database bootstrapping and schema drift noise
- root-level and backend-level dependency resolution needed cleanup to keep mocks consistent
- production proof remains weaker than the automated baseline

---

## Recommended Remediation Order

### Phase A - Verification

1. Keep the Jest suite green.
2. Reduce noisy DB initialization and schema drift logging in test mode.
3. Record the green baseline in `CHANGELOG.md` and the status doc.

### Phase B - Production Proof

1. Validate one real Stripe digital order.
2. Validate one real POD order.
3. Validate Supabase/Postgres production path.
4. Record proof in docs.

### Phase C - Structure and Drift

1. Reduce root clutter.
2. Add more specs for major ongoing efforts.
3. Audit older feature docs for drift against the canonical truth docs.

---

## Repo-Local Compliance Verdict

**Documentation and planning compliance:** materially improved  
**Engineering compliance:** improved but still partial  
**Full best-practice compliance:** not yet achieved

The repo now has the right shape for governance and a green automated baseline. It still needs production-proof work and some test-hygiene cleanup to earn the stronger claims.
