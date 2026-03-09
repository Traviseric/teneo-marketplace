---
id: 8
title: "License key generation and validation for software products"
priority: P2
severity: medium
status: completed
source: project_declared
file: marketplace/backend/routes/checkout.js
line: ~
created: "2026-03-09T00:00:00Z"
execution_hint: parallel
context_group: content_protection
group_reason: "License keys + file versioning share the content protection area"
---

# License key generation and validation for software products

**Priority:** P2 (medium)
**Source:** AGENT_TASKS.md (Phase 2 — Content Protection)
**Location:** `marketplace/backend/routes/checkout.js`, new `marketplace/backend/services/licenseKeyService.js`

## Problem

Software products (apps, plugins, scripts, templates) need license key protection so buyers can't share downloads. Currently, all digital products use time-limited download tokens, but there's no persistent license key that:
1. Binds to the buyer's email
2. Can be validated by the seller's software
3. Can be revoked if needed
4. Limits activations (e.g., "use on up to 3 machines")

**Current state:**
- PDF stamping is implemented (5c81056) for document protection
- Download tokens are time-limited but not persistent
- No `license_keys` table in schema

## How to Fix

1. **Add `license_keys` table to schema:**
   ```sql
   CREATE TABLE IF NOT EXISTS license_keys (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     key TEXT UNIQUE NOT NULL, -- e.g., XXXX-XXXX-XXXX-XXXX
     order_id TEXT NOT NULL,
     product_id TEXT NOT NULL,
     customer_email TEXT NOT NULL,
     max_activations INTEGER DEFAULT 3,
     activations INTEGER DEFAULT 0,
     active INTEGER DEFAULT 1,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
     revoked_at DATETIME
   );
   ```

2. **Create `licenseKeyService.js`:**
   ```js
   generateKey() // Returns formatted key: XXXX-XXXX-XXXX-XXXX (UUID-based)
   createLicenseKey(orderId, productId, email, maxActivations)
   validateKey(key) // Returns { valid: true, activations, maxActivations, email }
   activateKey(key) // Increments activations counter
   revokeKey(key) // Sets revoked_at
   ```

3. **Generate license keys on purchase** in checkout.js Stripe webhook:
   - For products with `license_required: true` in catalog.json → call `licenseKeyService.createLicenseKey()`
   - Include license key in order confirmation email
   - Store in `license_keys` table linked to order

4. **Add validation endpoint** `GET /api/license/validate?key=XXXX-XXXX-XXXX-XXXX`:
   - Public endpoint (sellers embed in their software to verify)
   - Returns `{ valid: true/false, product_id, email_masked, activations_left }`
   - Also `POST /api/license/activate` to increment activation count

5. **Admin panel: License key management:**
   - List all license keys for admin
   - Revoke individual keys
   - See activation count per key

6. **Add `license_required: true` flag to digital products** in catalog.json and product admin

## Acceptance Criteria

- [ ] License key generated automatically when a `license_required` product is purchased
- [ ] Key included in purchase confirmation email
- [ ] `GET /api/license/validate?key=...` returns valid/invalid with activation count
- [ ] `POST /api/license/activate` increments and enforces `max_activations` limit
- [ ] Admin can revoke keys from admin panel
- [ ] Keys survive server restarts (DB-persisted, not in-memory)

## Notes

_Generated from AGENT_TASKS.md Phase 2 Content Protection. PDF stamping done (5c81056). License keys are the complementary protection for software products. Used by many digital sellers who need to protect executables, plugins, or API keys._
