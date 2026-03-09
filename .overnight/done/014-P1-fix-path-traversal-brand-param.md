---
id: 14
title: "Fix path traversal in brand query params (CWE-22)"
priority: P1
severity: high
status: completed
source: security_audit
file: marketplace/backend/server.js, marketplace/backend/routes/network.js
line: 305
created: "2026-03-06T08:00:00Z"
execution_hint: sequential
context_group: path_traversal_fix
group_reason: "All 4 vulnerable locations share the same root cause and same fix pattern (path.basename + resolve-and-verify)"
---

# Fix path traversal in brand query params (CWE-22)

**Priority:** P1 (high)
**Source:** security_audit
**CWE:** CWE-22 (Path Traversal)
**Locations:**
- `marketplace/backend/server.js:305` — GET /api/books?brand=
- `marketplace/backend/routes/network.js:50` — GET /api/network/catalog?brand=
- `marketplace/backend/routes/network.js:156` — GET /api/network/book/:networkId (brand extracted from networkId)
- `marketplace/backend/routes/network.js:231` — GET /api/network/search?brand=

## Problem

Four endpoints construct file paths using a user-supplied `brand` parameter without sanitization. An attacker can supply `brand=../../../../etc/passwd` (or similar) to read arbitrary files outside the `frontend/brands/` directory.

**Example vulnerable code (server.js:305):**
```javascript
const catalogPath = path.join(brandsPath, brand, 'catalog.json');
```

**Example vulnerable code (network.js:50):**
```javascript
brandsToLoad = [brand];  // brand from req.query with no sanitization
// ...
const catalogPath = path.join(brandsDir, brandName, 'catalog.json');
```

**Example vulnerable code (network.js:156):**
```javascript
const brand = parts[parts.length - 2];  // extracted from URL param, no sanitization
const catalogPath = path.join(__dirname, '../../frontend/brands', brand, 'catalog.json');
```

**Example vulnerable code (network.js:231):**
```javascript
const catalogPath = path.join(brandsDir, brandName, 'catalog.json');
// brandName comes directly from req.query.brand with no sanitization
```

## How to Fix

Apply the same pattern already used in `server.js:438-445` for `/api/brands/:brandId/catalog`. Copy that sanitization guard to all 4 locations:

```javascript
// Sanitize brand to prevent path traversal (CWE-22)
const brandsBase = path.resolve(__dirname, '..', 'frontend', 'brands');
const safe = path.basename(brand || '');
if (!safe || safe === '.' || safe === '..') {
  return res.status(400).json({ success: false, error: 'Invalid brand' });
}
const resolved = path.resolve(brandsBase, safe);
if (!resolved.startsWith(brandsBase + path.sep) && resolved !== brandsBase) {
  return res.status(400).json({ success: false, error: 'Invalid brand' });
}
const catalogPath = path.join(brandsBase, safe, 'catalog.json');
```

For `network.js:156` where brand is extracted from the URL path:
- Apply `path.basename()` to the extracted brand string before using it in `path.join`.

**Key principle:** `path.basename()` strips any directory components, so `../../../../etc/passwd` becomes `passwd` (harmless). The resolve+startsWith check is the belt-and-suspenders guard.

## Acceptance Criteria

- [ ] server.js GET /api/books?brand= sanitizes the brand param before path.join
- [ ] network.js GET /api/network/catalog?brand= sanitizes brand before path.join
- [ ] network.js GET /api/network/book/:networkId sanitizes extracted brand before path.join
- [ ] network.js GET /api/network/search?brand= sanitizes brand before path.join
- [ ] Supplying `brand=../../../../etc/passwd` returns 400, not file contents
- [ ] Supplying a valid brand name still returns the catalog normally
- [ ] No regressions in existing tests

## Notes

The fix pattern is already implemented at `server.js:437-447` for `/api/brands/:brandId/catalog`. This task applies the same guard to the 4 endpoints that were missed. Worker should read that section first as the reference implementation.
