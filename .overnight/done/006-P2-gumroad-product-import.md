---
id: 6
title: "Gumroad product import (CSV + API)"
priority: P2
severity: medium
status: completed
source: project_declared
file: marketplace/backend/routes/adminRoutes.js
line: null
created: "2026-03-09T00:00:00Z"
execution_hint: parallel
context_group: creator_migration
group_reason: "Migration tool alongside task 007 (email list CSV import)"
---

# Gumroad Product Import

**Priority:** P2 (medium)
**Source:** project_declared (AGENT_TASKS.md Phase 4 Network & Scale)
**Location:** marketplace/backend/routes/adminRoutes.js + new importService.js

## Problem

Creators on Gumroad want to migrate to OpenBazaar.ai. Currently there is no migration path — they must manually recreate every product. Gumroad exports product data as CSV and also has a public API. This friction prevents creator acquisition.

## How to Fix

1. **Create `marketplace/backend/services/importService.js`:**
   - `importGumroadCsv(csvContent, brandId)` — parses Gumroad export CSV and converts to catalog.json format
   - Gumroad CSV columns: name, description, price, url, sales, published, etc.
   - Maps to OpenBazaar product: `{id, title, description, price, type: 'digital', ...}`
   - Returns array of product objects

2. **Add admin import endpoint in adminRoutes.js:**
   - `POST /admin/import/gumroad-csv` — accepts multipart/form-data with CSV file upload
   - Uses multer for file handling (already a dependency or add it)
   - Parses CSV with `importService.importGumroadCsv()`
   - Merges products into the brand's catalog.json (does not overwrite existing products)
   - Returns `{imported: N, skipped: N, products: [...]}`

3. **Add import UI in admin.html:**
   - "Import from Gumroad" section with:
     - CSV file upload input
     - Instructions: "Export products from Gumroad: Products → Export → Download CSV"
     - "Import Products" button
     - Results display (imported N products)

4. **Handle CSV parsing:**
   - Use the built-in `csv-parse` library or simple split/trim approach
   - Handle quoted fields, special characters in descriptions
   - Skip rows with missing required fields (name, price)

5. **Price conversion:**
   - Gumroad prices are in dollars (e.g., "9.99") — store as-is
   - Handle "Pay what you want" (pwyw) products — set minimum price or mark as flexible

## Acceptance Criteria

- [ ] importService.js created with Gumroad CSV parser
- [ ] POST /admin/import/gumroad-csv endpoint works
- [ ] Admin UI has Gumroad import section
- [ ] Imported products appear in catalog.json
- [ ] Handles malformed/incomplete rows gracefully
- [ ] No regressions in existing product management

## Notes

_Generated from project_declared AGENT_TASKS.md Phase 4. Focus on CSV first (API requires OAuth which is complex — defer to follow-up)._
