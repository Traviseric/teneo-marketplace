# Smart Contracts — Teneo NFT System

Three Solidity contracts implement Proof of Read NFTs, knowledge badges, and library inheritance.

## Contracts

| Contract | Standard | Purpose |
|---|---|---|
| `BookOwnership.sol` | ERC-721 | Permanent, transferable proof of book ownership |
| `KnowledgeBadges.sol` | ERC-1155 | Soulbound achievement badges (milestone, topic, controversial) |
| `LibraryInheritance.sol` | — | Dead man's switch + beneficiary transfer of entire library |

## Prerequisites

- Node.js 18+
- Dependencies already installed via `npm install` in `marketplace/backend/`
- `@nomicfoundation/hardhat-toolbox` is in devDependencies

## Compile Contracts

```bash
cd marketplace/backend
npx hardhat compile
```

This generates artifacts in `marketplace/backend/artifacts/` and enables ABI loading in `nftService.js`.

## Deploy to Testnet (Mumbai)

### 1. Get testnet MATIC

Mumbai faucet: <https://faucet.polygon.technology/>

Also available via:
- Alchemy Mumbai faucet: <https://mumbaifaucet.com/>
- Chainlink faucet: <https://faucets.chain.link/mumbai>

### 2. Set environment variables

```bash
# In marketplace/backend/.env:
PRIVATE_KEY=0x...your-deployer-private-key...  # NEVER commit this!
MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com   # or Alchemy/Infura endpoint
MARKETPLACE_URL=https://yourdomain.com
```

### 3. Deploy

```bash
cd marketplace/backend
npx hardhat run scripts/deploy-contracts.js --network mumbai
```

Output includes the deployed contract addresses. Copy them to your `.env`:

```bash
BLOCKCHAIN_NETWORK=mumbai
BOOK_OWNERSHIP_CONTRACT_ADDRESS=0x...
BADGES_CONTRACT_ADDRESS=0x...
INHERITANCE_CONTRACT_ADDRESS=0x...
```

### 4. Verify on PolygonScan (optional)

```bash
POLYGONSCAN_API_KEY=your-key npx hardhat verify --network mumbai <BOOK_OWNERSHIP_ADDRESS>
POLYGONSCAN_API_KEY=your-key npx hardhat verify --network mumbai <BADGES_ADDRESS> "https://yourdomain.com/api/nft/badge-metadata/"
POLYGONSCAN_API_KEY=your-key npx hardhat verify --network mumbai <INHERITANCE_ADDRESS> <BOOK_OWNERSHIP_ADDRESS>
```

## Deploy to Mainnet (Polygon)

Same as above, replace `--network mumbai` with `--network polygon` and fund deployer with real MATIC.

Estimated gas costs (Polygon mainnet at 50 gwei):
- BookOwnership: ~150,000 gas (~$0.01 at typical gas prices)
- KnowledgeBadges: ~200,000 gas (~$0.015)
- LibraryInheritance: ~180,000 gas (~$0.013)

## Local Development (no wallet needed)

```bash
cd marketplace/backend
npx hardhat node          # Start local EVM node
# In another terminal:
npx hardhat run scripts/deploy-contracts.js --network localhost
```

Then set `BLOCKCHAIN_NETWORK=localhost` in `.env`.

## ABI Loading

`nftService.js` automatically loads ABIs from:
1. `artifacts/contracts/<Name>.sol/<Name>.json` (hardhat compile output — preferred)
2. `contracts/abi/<Name>.json` (fallback — copied here by `deploy-contracts.js`)

Run `npx hardhat compile` once to make ABIs available before deploying.

## Deployment Records

After deployment, records are saved to `marketplace/backend/deployments/<network>-deployment.json`.
These files are git-ignored (contain addresses only — no secrets).
