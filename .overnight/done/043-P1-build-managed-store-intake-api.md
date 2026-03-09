---
id: 43
title: "Build managed store intake API — minimum payload schema + POST /api/builds"
priority: P1
severity: high
status: completed
source: AGENT_TASKS.md
file: marketplace/backend/routes/storeBuilder.js
line: null
created: "2026-03-06T00:00:00Z"
execution_hint: sequential
context_group: ai_store_commercialization
group_reason: "Same feature area as tasks 042 and 044 — Phase 1A managed-service flow"
---

# Build managed store intake API — minimum payload schema + POST /api/builds

**Priority:** P1 (high)
**Source:** AGENT_TASKS.md Phase 1A
**Location:** marketplace/backend/routes/storeBuilder.js

## Problem

Phase 1A requires a standardized intake payload format so operators can accept paid build requests reliably. Currently `POST /api/store-builder/generate` accepts free-form natural language but has no defined minimum intake schema or validation for paid requests.

A paid build intake needs: contact info, business brief, tier selection, and a payment reference. Without schema validation, requests come in malformed and operators have to manually follow up for missing info.

## How to Fix

1. Define the minimum intake payload schema (add to `marketplace/backend/utils/validate.js` or inline):
   ```js
   const INTAKE_SCHEMA = {
     required: ['business_brief', 'contact_email', 'tier'],
     optional: ['contact_name', 'website_url', 'brand_examples', 'payment_ref', 'notes'],
     tiers: ['builder', 'pro', 'white_label'],
     brief_min_length: 50  // chars
   };
   ```

2. Add `POST /api/store-builder/intake` route that:
   - Validates required fields (return 400 with field errors on missing/invalid)
   - Validates `tier` is one of: `builder`, `pro`, `white_label`
   - Validates `contact_email` is a valid email format
   - Validates `business_brief` length >= 50 chars
   - Creates a `store_builds` record via `storeBuildService.createBuild()` (task 042)
   - Returns `{ success: true, build_id, status: 'intake', estimated_delivery: '48h' }`
   - Sends acknowledgment email to `contact_email` via `emailService`

3. Document the schema in a comment block at the top of the route.

4. The existing `/api/store-builder/generate` route should remain for direct/dev use. The new `/intake` route is the production-facing paid entry point.

## Acceptance Criteria

- [ ] `POST /api/store-builder/intake` validates all required fields
- [ ] Returns structured 400 errors for missing/invalid fields
- [ ] Creates `store_builds` record on success
- [ ] Sends acknowledgment email to submitter
- [ ] Tier validation enforces allowed values
- [ ] Brief length validated (50 char minimum)
- [ ] Tests in `__tests__/storeBuilder.test.js` covering validation paths

## Notes

_Generated from AGENT_TASKS.md Phase 1A: "Define minimum intake payload for paid build requests"_
