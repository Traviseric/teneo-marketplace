---
id: 86
title: "Document OPENAI_API_KEY and PINATA_JWT in .env.example"
priority: P2
severity: medium
status: completed
source: feature_audit
file: marketplace/backend/.env.example
created: "2026-02-28T12:00:00"
execution_hint: parallel
context_group: env_config
group_reason: "Both are .env.example documentation fixes, can run alone"
---

# Document OPENAI_API_KEY and PINATA_JWT in .env.example

**Priority:** P2 (medium)
**Source:** feature_audit
**Location:** marketplace/backend/.env.example

## Problem

Two AI/Web3 features silently degrade when their env vars are missing:

1. **AI Discovery semantic search** silently falls back to keyword search when `OPENAI_API_KEY` is absent. The README presents this as production-ready "revolutionary semantic search". Users don't know they're getting keyword matching.

2. **IPFS/Pinata integration** requires `PINATA_JWT` env var which is not documented as required anywhere. The `ipfs_pins` table exists and Pinata API calls are implemented in NFTService, but no operator would know to set this.

Neither variable appears in `.env.example`, so operators deploying the app have no guidance.

## How to Fix

1. Read `.env.example` and add a new AI/Web3 section:
   ```bash
   # ─── AI Features (optional but recommended) ────────────────────────────────
   # Required for semantic search in AI Discovery. Without this, falls back to keyword search.
   # Get yours at: https://platform.openai.com/api-keys
   # OPENAI_API_KEY=sk-...

   # ─── IPFS / NFT Features ────────────────────────────────────────────────────
   # Required for IPFS book pinning (Proof of Read NFTs, content delivery)
   # Get yours at: https://app.pinata.cloud/keys
   # PINATA_JWT=eyJ...

   # Required if deploying NFT smart contracts
   # POLYGON_RPC_URL=https://polygon-mumbai.g.alchemy.com/v2/your-key
   # NFT_CONTRACT_ADDRESS=0x...
   # PRIVATE_KEY=0x... (deployer wallet private key — keep secret!)
   ```

2. In `aiDiscoveryService.js`, add a startup log when semantic search is in degraded mode:
   ```js
   if (!process.env.OPENAI_API_KEY) {
     console.warn('[AI Discovery] OPENAI_API_KEY not set — using keyword search fallback. Set the key to enable semantic search.');
   }
   ```

3. In `nftService.js`, add a startup log when IPFS is unconfigured:
   ```js
   if (!process.env.PINATA_JWT) {
     console.warn('[NFT Service] PINATA_JWT not set — IPFS pinning disabled.');
   }
   ```

## Acceptance Criteria

- [ ] OPENAI_API_KEY documented in .env.example with explanation
- [ ] PINATA_JWT documented in .env.example with explanation
- [ ] NFT-related env vars (POLYGON_RPC_URL, etc.) documented
- [ ] aiDiscoveryService.js logs warning when OPENAI_API_KEY missing
- [ ] nftService.js logs warning when PINATA_JWT missing

## Notes

_Generated from feature_audit medium findings. Trivial changes with high operator impact._
