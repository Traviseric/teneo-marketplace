---
id: 11
title: "File versioning — update products, buyers get latest version"
priority: P2
severity: medium
status: completed
source: project_declared
file: marketplace/backend/routes/
created: "2026-03-09T21:00:00Z"
execution_hint: parallel
context_group: content_protection
group_reason: "Digital product delivery features"
---

# File versioning — update products, buyers get latest version

**Priority:** P2 (medium)
**Source:** project_declared (AGENT_TASKS.md — "File versioning (update products, buyers get latest)")
**Location:** marketplace/backend/routes/ + marketplace/backend/services/

## Problem

When a creator updates a digital product (e.g., releases v2 of their ebook), existing buyers have no way to get the updated file. There is no version tracking for products and no mechanism for buyers to re-download the latest version of something they already purchased.

## How to Fix

1. Add a `version` field to the products schema:
   ```sql
   ALTER TABLE products ADD COLUMN version TEXT DEFAULT '1.0';
   ALTER TABLE products ADD COLUMN file_history TEXT DEFAULT '[]'; -- JSON array of past versions
   ```
   (In SQLite, use a migration. Update `supabase-migration.sql` too.)

2. Update the admin product creation/update API to:
   - Accept a `version` field (e.g., "1.1", "2.0")
   - When a file is updated, push the old file reference to `file_history`
   - Store the new file path and version

3. Update the download endpoint (`routes/downloadRoutes.js`):
   - When a buyer requests a download, serve the CURRENT version of the product (not the version at time of purchase)
   - Add a `?version=X` query param for buyers to request specific past versions if needed

4. Add an admin UI section for product version management:
   - Show current version and version history
   - Allow uploading a new version with a version bump
   - Optionally: send "update available" email to all buyers

5. Update the download token/link generation to always resolve to latest version.

## Acceptance Criteria

- [ ] Products table has `version` and `file_history` fields
- [ ] Admin can upload a new product version
- [ ] Buyers always download the latest version when using their download link
- [ ] Version history is stored and accessible in admin
- [ ] Supabase migration SQL updated

## Notes

_Generated from AGENT_TASKS.md P2 item (Content Protection section). Pairs with existing PDF stamping (5c81056) and license key (df8b35c) features._
