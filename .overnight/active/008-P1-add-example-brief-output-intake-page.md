---
id: 8
title: "Add example brief and example output on AI Store Builder sales page"
priority: P1
severity: medium
status: completed
source: AGENT_TASKS.md
file: marketplace/frontend/
line: null
created: "2026-03-09T00:00:00"
execution_hint: parallel
context_group: managed_service
group_reason: "Phase 1A managed-service tasks: 006-007-008 are delivery/tooling improvements"
---

# Add Example Brief and Example Output on AI Store Builder Sales Page

**Priority:** P1 (medium)
**Source:** AGENT_TASKS.md Phase 1B Demand Generation
**Location:** marketplace/frontend/ (AI Store Builder intake form/landing section)

## Problem

The AI Store Builder intake form and landing section exist (task 044, commit 944d72d). But the sales page doesn't show prospective clients what to expect — there's no example input brief and no example output store to inspire confidence and drive conversions.

Without concrete examples, visitors don't understand what they'll get and are less likely to submit an intake request.

## How to Fix

1. **Read** the current intake form/landing HTML (added in commit 944d72d) to understand the current layout
2. **Create an example brief section** on the intake page showing:
   - A sample business description: "Soy candle maker, sustainable packaging, eco-conscious customers..."
   - The intake questions that would be asked
   - A "View example output →" link
3. **Create an example output page** (static HTML) showing what a generated store looks like:
   - Use one of the canonical brief outputs (soy candle, course business, or service business)
   - Can be a screenshot/mockup or a real rendered store page
   - Place at `marketplace/frontend/store-example.html` or similar
4. **Add social proof copy**: "Built in minutes by AI, delivered in hours by our team"
5. **Ensure** the example brief section appears ABOVE the intake form as inspiration
6. **Mobile responsive**: example section must look good on mobile

## Acceptance Criteria

- [ ] Example brief text added to AI Store Builder section on the landing/intake page
- [ ] "See example output" link added that goes to a real or mockup output page
- [ ] Example output page exists and renders correctly
- [ ] Copy is compelling and clearly explains the service
- [ ] Mobile responsive

## Notes

_Generated from AGENT_TASKS.md Phase 1B Demand Generation. Conversion booster for the intake form._
