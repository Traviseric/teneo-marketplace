---
id: 22
title: "Sanitize brandId path traversal in brandRoutes.js and server.js"
priority: P0
severity: high
status: completed
source: security_audit
file: marketplace/backend/routes/brandRoutes.js
line: 13
created: "2026-02-28T06:00:00"
execution_hint: sequential
context_group: brand_filesystem
group_reason: "Both brandRoutes.js and server.js touch the brands filesystem with unsanitized brandId"
cwe: CWE-22
---

# Sanitize brandId path traversal in brandRoutes.js and server.js

**Priority:** P0 (high)
**Source:** security_audit
**Location:** marketplace/backend/routes/brandRoutes.js:13, marketplace/backend/server.js:329

## Problem

The `brandId` parameter is not sanitized before being used in file system path construction in two places:

**1. brandRoutes.js (line 13) — file write vulnerability:**
```javascript
const brandId = req.params.brandId || req.body.brandId;
const uploadPath = path.join(__dirname, '../../frontend/brands', brandId, 'assets');
```
An attacker with admin access can supply `brandId = '../../etc'` to write uploaded files to arbitrary locations on the filesystem.

**2. server.js (line 329) — file read vulnerability:**
```javascript
const { brandId } = req.params;
const catalogPath = path.join(__dirname, '..', 'frontend', 'brands', brandId, 'catalog.json');
```
A request to `/api/brands/../../../etc/passwd/catalog.json` could traverse the directory structure, enabling information disclosure of any JSON files accessible on the server.

The same pattern likely exists in `loadBrandConfig()` and `loadBrandCatalog()` helpers.

## How to Fix

Apply path traversal sanitization in both files using `path.basename()` + `path.resolve()` validation:

```javascript
const path = require('path');

// Add this helper function (can be placed in a utils file or inline):
function safeBrandId(brandId, brandsBase) {
    // Strip any directory traversal sequences
    const safe = path.basename(brandId);
    if (!safe || safe === '.' || safe === '..') {
        return null;
    }
    // Validate the resolved path stays within brands directory
    const resolved = path.resolve(brandsBase, safe);
    if (!resolved.startsWith(brandsBase + path.sep) && resolved !== brandsBase) {
        return null;
    }
    return safe;
}

// In brandRoutes.js — apply to every endpoint that uses brandId in a path:
const brandsBase = path.resolve(__dirname, '../../frontend/brands');
const safeBrand = safeBrandId(brandId, brandsBase);
if (!safeBrand) {
    return res.status(400).json({ success: false, error: 'Invalid brand ID' });
}
const uploadPath = path.join(brandsBase, safeBrand, 'assets');

// In server.js catalog endpoint:
const brandsBase = path.resolve(__dirname, '..', 'frontend', 'brands');
const safeBrand = safeBrandId(brandId, brandsBase);
if (!safeBrand) {
    return res.status(400).json({ success: false, error: 'Invalid brand ID' });
}
const catalogPath = path.join(brandsBase, safeBrand, 'catalog.json');
```

Apply to ALL locations in both files where `brandId` is used in a path: upload paths, config paths, catalog paths, asset paths, and any `readFileSync`/`writeFileSync` calls.

## Acceptance Criteria

- [ ] `path.basename()` applied to brandId before use in any file system path
- [ ] Resolved path validated to stay within the brands directory using `path.resolve()` + `startsWith()`
- [ ] Invalid/traversal brandIds return 400 Bad Request, not an error stack trace
- [ ] Fix applied in brandRoutes.js for ALL path constructions (upload, config, catalog, assets)
- [ ] Fix applied in server.js catalog endpoint
- [ ] Fix applied in loadBrandConfig() and loadBrandCatalog() helpers if they exist
- [ ] A request like `/api/brands/../../../etc/passwd` is blocked and returns 400
- [ ] Legitimate brand IDs (e.g., 'default', 'teneo-press') still work correctly

## Notes

_Generated from security_audit findings. CWE-22: Path Traversal. Two separate findings merged (brandRoutes.js upload + server.js catalog) — same root cause and same fix. The write-path variant (brandRoutes.js) is more dangerous as it allows file creation anywhere on the filesystem._
