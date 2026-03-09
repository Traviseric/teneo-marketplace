---
id: 3
title: "Add example brief and store output to AI Store Builder sales page"
priority: P1
severity: high
status: completed
source: project_declared
file: openbazaar-site/index.html
line: null
created: "2026-03-09T21:00:00"
execution_hint: parallel
context_group: demand_generation
group_reason: "Frontend landing page — independent of backend tasks"
---

# Add example brief and store output to AI Store Builder sales page

**Priority:** P1 (high)
**Source:** project_declared (AGENT_TASKS.md Phase 1B Demand Generation)
**Location:** openbazaar-site/index.html (landing site)

## Problem

The AI Store Builder intake section exists on the landing page (added by commit 944d72d), but there is no example showing prospective customers what input (brief) they should give, or what output (generated store) they can expect.

Without a concrete example, the value proposition is abstract and conversion rates will be low. Prospective customers need to see: "Here's what you type → here's what you get."

AGENT_TASKS.md: `[P1] IMPLEMENT: Add example brief and example output on sales page` (unchecked)

## How to Fix

1. Find the AI Store Builder section in `openbazaar-site/index.html` (search for "store builder" or "intake")
2. Add a two-column "Example" subsection:
   - **Left column:** Example brief (input) — use the soy candle store brief or course business brief. Format as a styled blockquote or input box mockup.
   - **Right column:** Example output preview — a mini card showing the generated store name, tagline, hero text, and 2-3 product cards (static HTML/CSS, no dynamic data needed)
3. Keep it visually consistent with the existing landing page design (check `openbazaar-site/style.css` for existing classes/tokens)
4. The example should feel realistic and aspirational — demonstrate that a 2-3 sentence brief produces a complete, professional store

**Example brief to use:**
> "I sell handmade soy candles in seasonal scents. My customers are women 25-45 who care about clean ingredients and cozy home vibes. I want to sell individual candles ($18) and gift sets ($45), plus a monthly subscription box."

**Example output to show:**
> Store name: "Ember & Wick" — tagline: "Handcrafted soy candles for your coziest moments" — products: Single Candle $18, Gift Set $45, Monthly Box $38/mo

5. Add a CTA below the example: "Get your store built → [Start Here]"

## Acceptance Criteria

- [ ] Example brief + example output visible on landing page
- [ ] Visually consistent with existing landing page design
- [ ] Mobile-responsive layout for the example section
- [ ] CTA links to the intake form anchor
- [ ] No new JavaScript needed (static HTML + CSS only)

## Notes

_Generated from AGENT_TASKS.md. This task appeared in done/ from a previous worker run (008-P1-add-example-brief-output-intake-page.md) but AGENT_TASKS.md still shows it unchecked with no matching git commit. Verify the landing page before implementing._
