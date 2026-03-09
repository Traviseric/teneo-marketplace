---
id: 4
title: "File versioning — update products, buyers get latest"
priority: P2
severity: medium
status: completed
source: project_declared
file: marketplace/backend/routes/
line: null
created: "2026-03-09T00:00:00Z"
execution_hint: parallel
context_group: independent
group_reason: "Standalone feature — no file overlap with other active tasks"
---

# File Versioning for Digital Products

**Priority:** P2 (medium)
**Source:** project_declared (AGENT_TASKS.md Phase 2 Creator Toolkit — Content Protection)
**Location:** marketplace/backend/routes/ + frontend/brands/*/catalog.json

## Problem

When a creator updates a digital product (new edition of a PDF, updated course files, fixed ebook), there is no version tracking. Buyers who purchased earlier cannot automatically receive the updated file. The creator must manually notify all buyers.

This is a common pain point — tools like Gumroad auto-notify buyers when product files are updated.

## How to Fix

1. **Add version field to product catalog:**
   - In `catalog.json` for each brand, add optional `"version": "1.0"` field per product
   - Add `"version_notes": "Fixed chapter 3 formatting"` for changelog

2. **Add `product_versions` table to schema.sql:**
   ```sql
   CREATE TABLE IF NOT EXISTS product_versions (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     product_id TEXT NOT NULL,
     brand_id TEXT NOT NULL,
     version TEXT NOT NULL,
     file_path TEXT,
     notes TEXT,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   );
   ```

3. **Add version update route to adminRoutes.js:**
   - `POST /admin/products/:productId/version` — takes `{version, notes, brand_id}`, inserts into product_versions
   - Triggers notification emails to all buyers of that product (via emailService)

4. **Update downloadRoutes.js to serve latest version:**
   - When generating a download token, check product_versions for the latest file_path for that product
   - If a newer version exists, serve the latest file instead of the original

5. **Send "New Version Available" email to buyers:**
   - Query orders for all completed orders containing the updated product
   - Send email with a new download link (generate fresh token per buyer)
   - Use emailService.sendEmail() with a "product_update" template

6. **Add version management UI in admin.html:**
   - Product management section: "Upload New Version" form with version number + notes
   - Shows version history per product
   - "Notify Buyers" button

## Acceptance Criteria

- [ ] product_versions table exists in schema.sql
- [ ] Admin can POST new version for a product
- [ ] Buyers automatically receive "new version" email with download link
- [ ] Download endpoint serves latest version file
- [ ] Version history visible in admin UI
- [ ] No regressions in existing download/checkout flow

## Notes

_Generated from project_declared AGENT_TASKS.md Phase 2 Creator Toolkit._
