---
id: 41
title: "Update README to disclaim gig platform and note AI feature API key requirement"
priority: P3
severity: low
status: completed
source: feature_audit
file: README.md
line: 31
created: "2026-03-06T00:00:00Z"
execution_hint: parallel
context_group: independent
group_reason: "Documentation-only change in README.md — no code dependencies"
---

# Update README to disclaim gig platform and note AI feature API key requirement

**Priority:** P3 (low)
**Source:** feature_audit
**Location:** README.md:31, 83

## Problem

The public README makes two claims that misrepresent the current implementation state:

**1. Gig Platform marketed as live (lines 31, 60, 83):**
```
"a freelance gig platform (Upwork/Fiverr)"
"The Upwork killer."
"Post jobs, bid on work, deliver and get paid."
```
Zero gig platform code exists — no routes, no schema, no API. This is misleading to evaluators, contributors, and potential users.

**2. AI Discovery and AI Page Builder listed as 'Live' without noting OPENAI_API_KEY dependency:**
Both `aiDiscoveryService.js` and `aiPageBuilderService.js` silently fall back to keyword search and default templates when `OPENAI_API_KEY` is absent. The README does not mention this requirement.

## How to Fix

### Fix 1: Gig Platform

Add a "Coming Soon" qualifier or move to a "Planned Features" section:

```markdown
<!-- Change from: -->
a **freelance gig platform** (Upwork/Fiverr)

<!-- Change to: -->
a **freelance gig platform** (Upwork/Fiverr — *coming soon*)
```

And on the gig platform description section, add:
```markdown
> **Status: Planned — not yet implemented.** The gig platform (jobs, proposals, milestones, escrow) is on the roadmap for a future phase. See docs/ROADMAP.md for the implementation timeline.
```

### Fix 2: AI Features API Key Note

In the features table or AI features section, add a note:
```markdown
> **Note:** AI-powered features (AI Discovery, AI Page Builder) require `OPENAI_API_KEY` to be set. Without it, these features fall back to keyword search and default templates automatically.
```

## Acceptance Criteria

- [ ] README no longer presents the gig platform as a current/live feature
- [ ] README includes a "Planned" or "Coming Soon" note for the gig platform
- [ ] README notes `OPENAI_API_KEY` requirement for AI Discovery and AI Page Builder
- [ ] No other feature sections make claims contradicted by the current codebase
- [ ] README still accurately describes all genuinely implemented features

## Notes

_Generated from feature_audit finding. Documentation-only fix — no code changes required. Honest feature status in the README improves trust with contributors and users._
