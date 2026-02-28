---
id: 39
title: "Fix nftService.js silently returning fake IPFS hashes on error or missing config"
priority: P1
severity: high
status: completed
source: code_quality_audit
file: marketplace/backend/services/nftService.js
line: 162
created: "2026-02-28T08:00:00"
execution_hint: sequential
context_group: nft_module
group_reason: "Same nftService.js file as task 049 (sync fs calls)"
---

# Fix nftService.js silently returning fake IPFS hashes on error or missing config

**Priority:** P1 (high)
**Source:** code_quality_audit
**Location:** marketplace/backend/services/nftService.js:162 (and lines 123, 174, 192, 273)

## Problem

`nftService.js` returns randomly-generated fake IPFS hashes (`'Qm' + Math.random().toString(36).substring(7)`) in four error/fallback scenarios:

**Code with issue:**
```javascript
// Line 120-124: Missing Pinata JWT
if (!this.pinataJWT) {
    console.warn('⚠️  IPFS not configured, returning mock hash');
    return 'Qm' + Math.random().toString(36).substring(7);  // FAKE HASH
}

// Line 159-163: Upload error
} catch (error) {
    console.error('Error uploading to IPFS:', error.message);
    return 'Qm' + Math.random().toString(36).substring(7);  // FAKE HASH
}

// Line 173-174: Metadata upload, missing config
if (!this.pinataJWT) {
    return 'Qm' + Math.random().toString(36).substring(7);  // FAKE HASH
}

// Line 190-192: Metadata upload error
} catch (error) {
    return 'Qm' + Math.random().toString(36).substring(7);  // FAKE HASH
}

// Line 272-274: Smart contract not configured — mock token ID
tokenId = Math.floor(Math.random() * 1000000);  // FAKE TOKEN ID
```

NFTs minted with fake IPFS hashes produce permanently corrupt records — the NFT metadata URI points to non-existent content. Users see broken NFTs that cannot be verified on-chain. The fake hashes also appear identical to real IPFS CIDs, making the data corruption invisible until a user tries to access the NFT metadata.

## How to Fix

**For IPFS upload methods** — fail fast instead of returning fake data:

```javascript
// uploadToIPFS() — replace fake hash returns with throws:
async uploadToIPFS(filePath) {
    if (!this.pinataJWT) {
        throw new Error('IPFS not configured: PINATA_JWT environment variable not set');
    }
    try {
        // ... upload logic
    } catch (error) {
        // Don't swallow — let caller handle it
        throw new Error(`IPFS upload failed: ${error.message}`);
    }
}

// Same pattern for uploadMetadataToIPFS()
```

**For mintBookNFT()** — return null/sentinel for mock token IDs instead of random numbers:
```javascript
if (!this.contractAddress || !this.web3) {
    console.warn('⚠️  Smart contracts not configured, skipping NFT mint');
    tokenId = null;  // Clearly null, not a random fake ID
}
```

**Update callers** — wherever `mintBookNFT()` is called, check for a null tokenId and handle gracefully (don't save a null tokenId to the DB as if it were a real mint).

If IPFS is not configured, the NFT minting operation should fail with a clear error (503 or 501) rather than silently producing corrupt data.

## Acceptance Criteria

- [ ] `uploadToIPFS()` throws instead of returning fake hash when Pinata not configured
- [ ] `uploadToIPFS()` throws on upload error instead of returning fake hash
- [ ] `uploadMetadataToIPFS()` throws in both error cases
- [ ] Mock token ID is `null` (not random number) when contracts not configured
- [ ] Callers handle `null` tokenId gracefully
- [ ] No real NFT records are written to DB with fake IPFS hashes
- [ ] npm test passes after changes

## Notes

_Generated from code_quality_audit findings. NFT feature may not be active in production yet, but corrupt data in the NFT table will cause permanent issues when the feature is launched. Fix the data integrity issue now before any NFTs are minted._
