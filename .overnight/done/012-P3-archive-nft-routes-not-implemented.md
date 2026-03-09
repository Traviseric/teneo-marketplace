---
id: 12
title: "Archive NFT routes — add NOT IMPLEMENTED notice per ROADMAP decision"
priority: P3
severity: low
status: completed
source: feature_audit
file: marketplace/backend/routes/nft.js
line: 1
created: "2026-03-06T04:00:00Z"
execution_hint: parallel
context_group: independent
group_reason: "Quick comment-only change, no dependency"
---

# Archive NFT routes — add NOT IMPLEMENTED notice per ROADMAP decision

**Priority:** P3 (low)
**Source:** feature_audit
**Location:** `marketplace/backend/routes/nft.js`, `marketplace/backend/services/nftService.js`

## Problem

`nft.js` and `nftService.js` reference Hardhat contract artifacts (BookOwnership, KnowledgeBadges, LibraryInheritance) that don't exist in the repo. The service gracefully falls back to a "disabled" state when ABIs are missing — meaning the feature silently does nothing in production.

The ROADMAP.md explicitly removed NFT proof of ownership with the note "No proven demand." Despite this, the routes and service files remain active, giving the impression this feature works when it doesn't.

## How to Fix

1. Add a clear `NOT IMPLEMENTED` comment at the top of `nft.js`:
```js
/**
 * NFT Proof of Ownership — NOT IMPLEMENTED
 *
 * ROADMAP DECISION: Removed from roadmap ("No proven demand").
 * This module is a stub. Contract ABIs are not present in this repo.
 * nftService.js silently falls back to disabled mode when ABIs are missing.
 *
 * Do not mount this route in production or rely on it for feature gating.
 * Candidates for future removal: nft.js, nftService.js
 */
```

2. Add the same notice at the top of `nftService.js`.

3. Optionally: if `nft.js` is currently mounted in `server.js`, comment it out or remove the mount to prevent confusing API endpoints from appearing in the docs/discovery.

## Acceptance Criteria

- [ ] `nft.js` has a clear NOT IMPLEMENTED / ROADMAP REMOVED header comment
- [ ] `nftService.js` has the same notice
- [ ] If mounted in server.js, the mount is removed or commented out
- [ ] No other files broken by this change

## Notes

_feature_audit finding: "The ROADMAP explicitly removed NFT proof of ownership ('No proven demand'). Remove or archive nft.js and nftService.js to avoid confusion." Quick fix — no logic changes needed._
