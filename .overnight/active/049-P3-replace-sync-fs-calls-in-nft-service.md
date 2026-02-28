---
id: 49
title: "Replace synchronous fs.existsSync/readFileSync with async equivalents in nftService.js"
priority: P3
severity: medium
status: completed
source: code_quality_audit
file: marketplace/backend/services/nftService.js
line: 228
created: "2026-02-28T08:00:00"
execution_hint: sequential
context_group: nft_module
group_reason: "Same nftService.js file as task 039 (fake IPFS hashes fix)"
---

# Replace synchronous fs.existsSync/readFileSync with async equivalents in nftService.js

**Priority:** P3 (medium)
**Source:** code_quality_audit
**Location:** marketplace/backend/services/nftService.js:228

## Problem

`mintBookNFT()` is an async function that uses synchronous `fs.existsSync()` and `fs.readFileSync()` for file operations. Blocking I/O inside async handlers blocks Node.js's event loop — all other concurrent requests (including unrelated API calls) are stalled while a potentially large PDF is being read synchronously.

**Code with issue:**
```javascript
// nftService.js line 228 (approximate)
async mintBookNFT(bookId, ownerAddress) {
    // ...
    if (fs.existsSync(pdfPath)) {  // BLOCKING!
        const pdfBuffer = fs.readFileSync(pdfPath);  // BLOCKING! Could be MB of data
        // ...
    }
}
```

For a large book PDF (1-10MB), this blocks the event loop for tens of milliseconds, degrading performance for all concurrent users.

## How to Fix

Replace with async fs promises:

```javascript
// nftService.js — replace sync fs calls:
const fsPromises = require('fs').promises;

async mintBookNFT(bookId, ownerAddress) {
    // ...

    // Check if file exists (async):
    let pdfBuffer = null;
    try {
        await fsPromises.access(pdfPath);  // throws if not accessible
        pdfBuffer = await fsPromises.readFile(pdfPath);  // async read
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.warn('PDF not found:', pdfPath);
            // Handle missing file (skip IPFS upload, etc.)
        } else {
            throw err;
        }
    }

    // ... rest of function uses pdfBuffer
}
```

Note: This task should be done alongside or after task 039 (fixing fake IPFS hashes), since both modify the same function. Coordinate: if 039 adds throw-on-error behavior, ensure the async fs changes don't re-introduce silent failures.

## Acceptance Criteria

- [ ] `fs.existsSync()` replaced with `await fsPromises.access()` (or try/catch on readFile)
- [ ] `fs.readFileSync()` replaced with `await fsPromises.readFile()`
- [ ] No synchronous fs calls remain in nftService.js async methods
- [ ] NFT minting flow still works for existing test cases
- [ ] npm test passes after changes

## Notes

_Generated from code_quality_audit findings. P3 — performance improvement, not a correctness bug. Should be bundled with task 039 since both modify the same nftService.js file. Recommend doing task 039 first, then this one._
