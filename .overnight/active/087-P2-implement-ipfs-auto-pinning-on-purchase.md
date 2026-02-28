---
id: 87
title: "Implement IPFS auto-pinning on purchase via Pinata"
priority: P2
severity: medium
status: completed
source: feature_audit
file: marketplace/backend/services/nftService.js
created: "2026-02-28T12:00:00"
execution_hint: parallel
context_group: env_config
group_reason: "Related to IPFS env docs task 086"
---

# Implement IPFS auto-pinning on purchase via Pinata

**Priority:** P2 (medium)
**Source:** feature_audit
**Location:** marketplace/backend/services/nftService.js, marketplace/backend/routes/checkout.js

## Problem

IPFS integration (Pinata) exists in NFTService but requires PINATA_JWT env var which is not documented. The `ipfs_pins` table exists in the schema but nothing auto-populates it on purchase. Book files are not automatically pinned to IPFS when orders complete.

The feature is claimed in README as part of "Proof of Read" NFTs and censorship-resistant distribution, but the actual pinning never happens.

**Code with issue:**
`ipfs_pins` table is never written to via real IPFS operations. The Pinata pinning logic exists in comments/TODOs in nftService.js but is never triggered.

## How to Fix

1. In the Stripe webhook handler (or wherever `checkout.complete` is processed), after order fulfillment:
   ```js
   // Pin purchased book to IPFS for censorship-resistant delivery
   if (process.env.PINATA_JWT) {
     const bookFilePath = getBookFilePath(bookId, format);
     nftService.pinBookToIPFS(bookId, bookFilePath)
       .then(ipfsHash => {
         // Store in ipfs_pins table
         db.run(`INSERT OR REPLACE INTO ipfs_pins (book_id, ipfs_hash, pinned_at) VALUES (?, ?, CURRENT_TIMESTAMP)`, [bookId, ipfsHash]);
       })
       .catch(err => console.error('[IPFS] Pin failed (non-fatal):', err));
   }
   ```

2. In `nftService.js`, implement `pinBookToIPFS(bookId, filePath)` using the Pinata SDK:
   ```js
   const { PinataSDK } = require('pinata');
   async pinBookToIPFS(bookId, filePath) {
     const pinata = new PinataSDK({ pinataJwt: process.env.PINATA_JWT });
     const file = new File([await fs.readFile(filePath)], `book-${bookId}.pdf`, { type: 'application/pdf' });
     const result = await pinata.upload.public.file(file);
     return result.IpfsHash;
   }
   ```

3. Install Pinata SDK: `npm install pinata`

4. Add `GET /api/books/:bookId/ipfs-hash` endpoint for retrieving the IPFS CID of a purchased book

5. Non-fatal: if pinning fails, order fulfillment should NOT fail — log error and continue

## Dependencies

- Requires human action: Set PINATA_JWT from https://app.pinata.cloud/keys
- Book PDF files must exist at the path returned by getBookFilePath()

## Acceptance Criteria

- [ ] pinBookToIPFS() implemented using Pinata SDK
- [ ] Auto-pin triggered in checkout webhook (non-fatal if PINATA_JWT missing)
- [ ] Successful pin stored in ipfs_pins table
- [ ] pinata npm package added to package.json
- [ ] Order fulfillment not blocked if IPFS pin fails

## Notes

_Generated from feature_audit medium finding. Non-fatal enhancement for censorship-resistant delivery._
