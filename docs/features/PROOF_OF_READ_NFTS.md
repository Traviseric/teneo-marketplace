# Proof of Read NFTs - Complete Documentation

## 📖 Overview

**Proof of Read NFTs** transform book purchases into permanent, uncensorable blockchain ownership records. When a user buys a book, they receive an NFT that proves ownership forever - no platform can revoke it, no government can censor it.

This system combines:
- **Book Ownership NFTs** (ERC-721): Unique tokens for each book purchase
- **Achievement Badges** (ERC-1155): Gamified reading milestones (soulbound)
- **Library Inheritance**: Dead man's switch to pass your library to beneficiaries
- **IPFS Storage**: Decentralized book content storage

---

## 🏗️ Architecture

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                    User Purchase Flow                    │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│  1. User buys book → Stripe/Crypto payment completes    │
│  2. NFT Service uploads book to IPFS (encrypted)        │
│  3. NFT Service uploads metadata to IPFS                │
│  4. Smart contract mints NFT to user's wallet           │
│  5. Database tracks mint for quick queries              │
│  6. Badge system checks for new achievements            │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│         User owns permanent proof of purchase           │
│         + Access to encrypted book file on IPFS         │
│         + Achievement badges for milestones             │
└─────────────────────────────────────────────────────────┘
```

### File Structure

```
marketplace/backend/
├── contracts/                      # Solidity smart contracts
│   ├── BookOwnership.sol          # ERC-721 book NFTs
│   ├── KnowledgeBadges.sol        # ERC-1155 achievement badges
│   └── LibraryInheritance.sol     # Inheritance protocol
├── services/
│   └── nftService.js              # Blockchain interaction service
├── routes/
│   └── nft.js                     # NFT API endpoints
└── database/
    └── schema-nft.sql             # NFT tracking tables

marketplace/frontend/
└── nft-gallery.html               # User-facing NFT gallery
```

---

## 📜 Smart Contracts

### 1. BookOwnership.sol (ERC-721)

**Purpose**: Mint unique NFT for each book purchase

**Key Features**:
- One NFT per book purchase (can own multiple copies)
- Stores IPFS hash of book content
- Stores metadata hash (title, author, etc.)
- Privacy controls (hide books from public view)
- Transfer history tracking
- User library management

**Main Functions**:

```solidity
function mintBook(
    address to,
    string memory bookId,
    string memory brand,
    string memory ipfsHash,
    string memory metadataHash,
    string memory tokenURI
) public onlyOwner returns (uint256)
```

**Example Metadata**:
```json
{
  "name": "The Bitcoin Standard",
  "description": "Economic analysis of Bitcoin...",
  "image": "ipfs://QmX...",
  "attributes": [
    { "trait_type": "Author", "value": "Saifedean Ammous" },
    { "trait_type": "Category", "value": "Economics" },
    { "trait_type": "Brand", "value": "Teneo" },
    { "trait_type": "Pages", "value": 320 },
    { "trait_type": "Purchase Date", "value": "2024-01-15" }
  ],
  "external_url": "https://teneo.io/book/bitcoin-standard",
  "book_id": "bitcoin-standard",
  "brand": "teneo"
}
```

### 2. KnowledgeBadges.sol (ERC-1155)

**Purpose**: Award achievement badges for reading milestones

**Badge Categories**:

**Milestone Badges** (book count):
- 🥇 **Badge 0**: First Book (1 book)
- 📚 **Badge 1**: Reading Habit (5 books)
- 🎓 **Badge 2**: Book Collector (10 books)
- 🏛️ **Badge 3**: Library Builder (25 books)
- 👨‍🎓 **Badge 4**: Scholar (50 books)
- 🏆 **Badge 5**: Library Master (100 books)

**Controversial Badges** (banned books):
- 🔥 **Badge 6**: Censorship Survivor (5 banned books)
- 💀 **Badge 7**: Thought Criminal (25 banned books)
- ☠️ **Badge 8**: Forbidden Library (50 banned books)

**Topic Badges** (specific topics):
- 💰 **Badge 9**: Economics Scholar (10 economics books)
- 🧠 **Badge 10**: Philosophy Enthusiast (10 philosophy books)
- 🔒 **Badge 11**: Privacy Advocate (10 privacy/security books)

**Key Features**:
- **Soulbound**: Cannot be transferred or sold (only minted)
- Auto-claimed when requirements are met
- Tracked on-chain and in database
- Leaderboard and statistics

**Main Functions**:

```solidity
function claimBadge(address user, uint256 badgeId) public onlyOwner
function getBadgesOfUser(address user) public view returns (uint256[] memory)
function getUserBadgeStats(address user) public view returns (...)
```

### 3. LibraryInheritance.sol

**Purpose**: Enable users to pass their book NFTs to beneficiaries after death

**How It Works**:
1. User creates inheritance plan with:
   - List of beneficiary addresses
   - Release date (when can execute)
   - Heartbeat interval (days between required check-ins)
   - Message to beneficiaries

2. User sends regular heartbeats to prove they're alive

3. Plan executes when EITHER:
   - Release date is reached, OR
   - User misses heartbeat deadline (dead man's switch)

4. Books are distributed evenly among beneficiaries

**Main Functions**:

```solidity
function createInheritancePlan(
    address[] memory beneficiaries,
    uint256 releaseDate,
    uint256 heartbeatIntervalDays,
    string memory notes
) public

function heartbeat() public
function executeInheritance(address owner) public
function canExecutePlan(address owner) public view returns (bool, string memory)
```

**Example Flow**:
```
User: "I want my library to go to my kids if I die"

1. Set beneficiaries: [0xAlice, 0xBob]
2. Set release date: Jan 1, 2050
3. Set heartbeat: 90 days
4. Set message: "Enjoy these books - they changed my life"

→ User must log in every 90 days to send heartbeat
→ If 90 days pass with no heartbeat, plan auto-executes
→ Books are split 50/50 between Alice and Bob
```

---

## 🔌 API Endpoints

Base URL: `/api/nft`

### Minting & Ownership

#### `POST /api/nft/mint`
Mint a book NFT after purchase (called automatically by checkout system)

**Request**:
```json
{
  "userAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "bookId": "bitcoin-standard",
  "brand": "teneo",
  "bookData": {
    "title": "The Bitcoin Standard",
    "author": "Saifedean Ammous",
    "description": "Economic analysis of Bitcoin",
    "category": "Economics",
    "filePath": "/path/to/book.pdf"
  }
}
```

**Response**:
```json
{
  "success": true,
  "nft": {
    "tokenId": 42,
    "ipfsHash": "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
    "metadataHash": "QmY8Mz...",
    "transactionHash": "0x123abc...",
    "tokenURI": "ipfs://QmY8Mz..."
  },
  "newBadges": ["First Book"],
  "message": "NFT minted! You earned 1 new badge(s)!"
}
```

#### `GET /api/nft/library/:address`
Get all books owned by a wallet

**Response**:
```json
{
  "success": true,
  "count": 15,
  "books": [
    {
      "id": 1,
      "user_address": "0x742...",
      "book_id": "bitcoin-standard",
      "token_id": 42,
      "ipfs_hash": "QmX...",
      "transaction_hash": "0x123...",
      "network": "polygon",
      "minted_at": "2024-01-15T10:30:00Z",
      "title": "The Bitcoin Standard",
      "author": "Saifedean Ammous",
      "category": "Economics",
      "danger_index": 35
    }
  ]
}
```

### Badges

#### `GET /api/nft/badges/:address`
Get all badges earned by a wallet

**Response**:
```json
{
  "success": true,
  "total": 5,
  "badges": [...],
  "grouped": {
    "milestone": [
      { "badge_id": 0, "name": "First Book", "category": "milestone" },
      { "badge_id": 1, "name": "Reading Habit", "category": "milestone" }
    ],
    "controversial": [
      { "badge_id": 6, "name": "Censorship Survivor", "category": "controversial" }
    ],
    "topic": [],
    "special": []
  }
}
```

#### `POST /api/nft/claim-badges/:address`
Check for and claim any newly earned badges

**Response**:
```json
{
  "success": true,
  "claimed": 2,
  "badges": [
    { "id": 2, "name": "Book Collector", "count": 10 },
    { "id": 6, "name": "Censorship Survivor", "count": 5 }
  ]
}
```

#### `GET /api/nft/badge-definitions`
Get all available badges and requirements

**Response**:
```json
{
  "success": true,
  "total": 12,
  "badges": [...],
  "grouped": {
    "milestone": [...],
    "controversial": [...],
    "topic": [...],
    "special": [...]
  }
}
```

### Statistics

#### `GET /api/nft/stats/:address`
Get library statistics

**Response**:
```json
{
  "success": true,
  "stats": {
    "totalBooks": 15,
    "totalBrands": 3,
    "averageDanger": 42,
    "firstPurchase": "2023-06-15T08:20:00Z",
    "totalBadges": 5
  }
}
```

#### `GET /api/nft/leaderboard`
Get badge leaderboard (top collectors)

**Query Parameters**:
- `limit`: Number of results (default: 100)

**Response**:
```json
{
  "success": true,
  "count": 100,
  "leaderboard": [
    {
      "user_address": "0xAlice...",
      "badge_count": 12,
      "controversial_badges": 3,
      "milestone_badges": 6
    }
  ]
}
```

### Inheritance

#### `POST /api/nft/inheritance/create`
Create or update inheritance plan

**Request**:
```json
{
  "ownerAddress": "0x742...",
  "beneficiaries": ["0xAlice...", "0xBob..."],
  "releaseDate": 2524608000,
  "heartbeatInterval": 90,
  "notes": "Enjoy these books"
}
```

#### `POST /api/nft/inheritance/heartbeat`
Send heartbeat to delay execution

**Request**:
```json
{
  "ownerAddress": "0x742..."
}
```

#### `GET /api/nft/inheritance/:address`
Get inheritance plan details

**Response**:
```json
{
  "success": true,
  "plan": {
    "ownerAddress": "0x742...",
    "beneficiaries": ["0xAlice...", "0xBob..."],
    "releaseDate": 2524608000,
    "heartbeatInterval": 90,
    "lastHeartbeat": 1705315200,
    "isActive": true,
    "isExecuted": false,
    "notes": "Enjoy these books",
    "canExecute": false,
    "status": "ACTIVE"
  }
}
```

#### `POST /api/nft/inheritance/execute/:ownerAddress`
Execute inheritance plan (transfer books to beneficiaries)

**Response**:
```json
{
  "success": true,
  "message": "Inheritance executed",
  "ownerAddress": "0x742...",
  "beneficiaries": ["0xAlice...", "0xBob..."],
  "timestamp": 1705315200000
}
```

---

## 🛠️ Setup & Deployment

### 1. Install Dependencies

```bash
cd marketplace/backend
npm install
```

**New Dependencies Added**:
- `ethers@^6.13.0` - Ethereum library for smart contract interaction
- `form-data@^4.0.1` - Multipart form data for IPFS uploads

### 2. Configure Environment Variables

Update `.env`:

```bash
# Blockchain Network
BLOCKCHAIN_NETWORK=polygon  # or 'ethereum', 'localhost'

# Contract Addresses (after deployment)
BOOK_OWNERSHIP_CONTRACT_ADDRESS=0x...
BADGES_CONTRACT_ADDRESS=0x...
INHERITANCE_CONTRACT_ADDRESS=0x...

# RPC URLs
POLYGON_RPC_URL=https://polygon-rpc.com
ETHEREUM_RPC_URL=https://eth.llamarpc.com

# Private Key (NEVER commit!)
PRIVATE_KEY=your_private_key_here

# IPFS (Pinata)
PINATA_API_KEY=your_api_key
PINATA_SECRET_KEY=your_secret_key
PINATA_JWT=your_jwt_token

# Marketplace URL
MARKETPLACE_URL=https://yourdomain.com
```

### 3. Deploy Smart Contracts

**Option A: Using Hardhat**

```bash
# Install Hardhat
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Initialize Hardhat
npx hardhat

# Create hardhat.config.js
```

**hardhat.config.js**:
```javascript
require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();

module.exports = {
  solidity: "0.8.20",
  networks: {
    polygon: {
      url: process.env.POLYGON_RPC_URL,
      accounts: [process.env.PRIVATE_KEY]
    },
    ethereum: {
      url: process.env.ETHEREUM_RPC_URL,
      accounts: [process.env.PRIVATE_KEY]
    }
  }
};
```

**Deploy Script** (`scripts/deploy.js`):
```javascript
const hre = require("hardhat");

async function main() {
  // Deploy BookOwnership
  const BookOwnership = await hre.ethers.getContractFactory("BookOwnership");
  const bookOwnership = await BookOwnership.deploy();
  await bookOwnership.deployed();
  console.log("BookOwnership deployed to:", bookOwnership.address);

  // Deploy KnowledgeBadges
  const KnowledgeBadges = await hre.ethers.getContractFactory("KnowledgeBadges");
  const badges = await KnowledgeBadges.deploy("ipfs://baseuri/");
  await badges.deployed();
  console.log("KnowledgeBadges deployed to:", badges.address);

  // Deploy LibraryInheritance
  const LibraryInheritance = await hre.ethers.getContractFactory("LibraryInheritance");
  const inheritance = await LibraryInheritance.deploy(bookOwnership.address);
  await inheritance.deployed();
  console.log("LibraryInheritance deployed to:", inheritance.address);

  // Set cross-contract references
  await badges.setBookOwnershipContract(bookOwnership.address);

  console.log("\n✅ All contracts deployed!");
  console.log("Update .env with these addresses:");
  console.log(`BOOK_OWNERSHIP_CONTRACT_ADDRESS=${bookOwnership.address}`);
  console.log(`BADGES_CONTRACT_ADDRESS=${badges.address}`);
  console.log(`INHERITANCE_CONTRACT_ADDRESS=${inheritance.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

**Deploy to Polygon**:
```bash
npx hardhat run scripts/deploy.js --network polygon
```

**Generate ABIs**:
```bash
npx hardhat compile
# ABIs will be in artifacts/contracts/*/**.json
```

Copy ABIs to `marketplace/backend/contracts/abi/`:
```bash
mkdir -p marketplace/backend/contracts/abi
cp artifacts/contracts/BookOwnership.sol/BookOwnership.json marketplace/backend/contracts/abi/
cp artifacts/contracts/KnowledgeBadges.sol/KnowledgeBadges.json marketplace/backend/contracts/abi/
cp artifacts/contracts/LibraryInheritance.sol/LibraryInheritance.json marketplace/backend/contracts/abi/
```

### 4. Initialize Database

The NFT schema will be automatically created when you run:

```bash
node marketplace/backend/database/init.js
```

**Tables Created**:
- `nft_mints` - Book NFT mint records
- `badge_claims` - User badge claims
- `badge_definitions` - Badge metadata
- `library_inheritance` - Inheritance plans
- `user_wallets` - Wallet profiles
- `nft_transfers` - Transfer history
- `ipfs_pins` - IPFS pin tracking
- `blockchain_sync_status` - Contract event sync state
- `badge_earning_log` - Badge analytics

### 5. Initialize NFT Service

Update `marketplace/backend/server.js` to initialize NFT service on startup:

```javascript
const nftService = require('./services/nftService');

// Initialize NFT service
nftService.initialize().catch(err => {
  console.error('Warning: NFT service initialization failed:', err.message);
  console.error('NFT features will not be available');
});
```

### 6. Integrate with Checkout

In your checkout routes, add NFT minting after successful payment:

```javascript
// In routes/checkoutProduction.js (or checkout.js)
const nftService = require('../services/nftService');

// After payment succeeds and order is created:
if (session.customer_email && process.env.BOOK_OWNERSHIP_CONTRACT_ADDRESS) {
  try {
    // Get user's wallet address from email or session
    const wallet = await getUserWallet(session.customer_email);

    if (wallet) {
      // Mint NFT for each book purchased
      for (const item of session.line_items.data) {
        await nftService.mintBookNFT(
          wallet,
          item.bookId,
          'teneo',
          {
            title: item.description,
            author: item.metadata.author,
            category: item.metadata.category,
            filePath: `/path/to/books/${item.bookId}.pdf`
          }
        );
      }

      // Check for new badges
      const newBadges = await nftService.checkAndAwardBadges(wallet);

      // Notify user of badges in email
      if (newBadges.length > 0) {
        emailBody += `\n\n🏆 You earned ${newBadges.length} new badge(s)!`;
      }
    }
  } catch (error) {
    console.error('NFT minting failed:', error);
    // Don't fail the order if NFT minting fails
  }
}
```

---

## 💰 Cost Analysis

### Gas Costs (Polygon Network)

**Per Transaction**:
- Mint Book NFT: ~150,000 gas (~$0.03)
- Claim Badge: ~80,000 gas (~$0.015)
- Create Inheritance Plan: ~120,000 gas (~$0.025)
- Send Heartbeat: ~50,000 gas (~$0.01)

**Monthly Costs** (1,000 book sales):
- 1,000 NFT mints: ~$30
- ~200 badge claims: ~$3
- IPFS storage (Pinata): ~$20/month (1GB)
- **Total: ~$53/month**

### Alternative: Ethereum Mainnet

**NOT RECOMMENDED** - 100x more expensive:
- Mint Book NFT: ~$5-50 (depending on gas price)
- Monthly (1,000 books): ~$5,000-50,000

**Recommendation**: Use Polygon (L2) or Arbitrum for low costs.

---

## 🔒 Security Considerations

### 1. Private Key Management

**NEVER commit private keys to Git!**

**Best Practices**:
- Store in `.env` file (git-ignored)
- Use hardware wallet for production
- Rotate keys regularly
- Use multi-sig for high-value operations

### 2. IPFS Content Encryption

Books should be encrypted before uploading to IPFS:

```javascript
// Example encryption (add to nftService.js)
const crypto = require('crypto');

function encryptBook(buffer, userAddress) {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(userAddress, 'salt', 32);
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);

  return { encrypted, iv };
}
```

### 3. Access Control

Only the NFT owner should be able to decrypt and access the book:

```javascript
// In download endpoint
const ownsNFT = await nftService.verifyOwnership(userAddress, bookId);
if (!ownsNFT) {
  return res.status(403).json({ error: 'You do not own this book' });
}
```

### 4. Smart Contract Security

**Auditing**:
- Review with OpenZeppelin standards
- Test extensively on testnet
- Consider professional audit for production

**Key Protections**:
- `onlyOwner` modifier on minting functions
- Reentrancy guards on transfers
- Input validation on all functions
- Soulbound badges (non-transferable)

---

## 📊 Database Schema Reference

### nft_mints

```sql
CREATE TABLE nft_mints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_address TEXT NOT NULL,
    book_id TEXT NOT NULL,
    brand TEXT NOT NULL,
    token_id INTEGER NOT NULL,
    ipfs_hash TEXT NOT NULL,
    metadata_hash TEXT NOT NULL,
    transaction_hash TEXT NOT NULL,
    block_number INTEGER,
    network TEXT DEFAULT 'polygon',
    is_active BOOLEAN DEFAULT 1,
    minted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes**:
- `idx_nft_user` on `user_address`
- `idx_nft_book` on `book_id`
- `idx_nft_token` on `token_id, network`

### badge_claims

```sql
CREATE TABLE badge_claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_address TEXT NOT NULL,
    badge_id INTEGER NOT NULL,
    badge_name TEXT,
    badge_category TEXT,
    transaction_hash TEXT,
    claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_address, badge_id)
);
```

### library_inheritance

```sql
CREATE TABLE library_inheritance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_address TEXT NOT NULL,
    beneficiaries TEXT NOT NULL,  -- JSON array
    release_date INTEGER NOT NULL,
    heartbeat_interval INTEGER,
    last_heartbeat INTEGER,
    is_active BOOLEAN DEFAULT 1,
    is_executed BOOLEAN DEFAULT 0,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(owner_address)
);
```

---

## 🚀 Usage Guide

### For End Users

#### Viewing Your Library

1. Visit `/nft-gallery.html`
2. Enter your wallet address (0x...)
3. View your books, badges, and stats

#### Setting Up Inheritance

1. Go to Inheritance tab
2. Enter beneficiary addresses (comma-separated)
3. Choose release date
4. Set heartbeat interval (e.g., 90 days)
5. Add message to beneficiaries
6. Click "Create Inheritance Plan"
7. **Remember**: Log in every 90 days to send heartbeat!

### For Developers

#### Minting NFT Programmatically

```javascript
const nftService = require('./services/nftService');

await nftService.initialize();

const result = await nftService.mintBookNFT(
  '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  'bitcoin-standard',
  'teneo',
  {
    title: 'The Bitcoin Standard',
    author: 'Saifedean Ammous',
    description: 'Economic analysis...',
    category: 'Economics',
    filePath: './books/bitcoin-standard.pdf'
  }
);

console.log(`NFT minted! Token ID: ${result.tokenId}`);
```

#### Checking Badges

```javascript
const newBadges = await nftService.checkAndAwardBadges(userAddress);

if (newBadges.length > 0) {
  console.log(`User earned: ${newBadges.map(b => b.name).join(', ')}`);
}
```

---

## 🔮 Future Enhancements

### Phase 2: Advanced Features

1. **NFT Marketplace**
   - Sell/transfer books to other users
   - Secondary market with royalties
   - Gift books to friends

2. **Social Features**
   - Public/private libraries
   - Reading clubs and shared collections
   - Comments and reviews on-chain

3. **Advanced Badges**
   - Reading streak badges (consecutive months)
   - Genre mastery badges
   - Community-voted badges
   - Limited edition special event badges

4. **Cross-Platform Integration**
   - Display NFTs in MetaMask, OpenSea
   - Integration with e-readers (decrypt on device)
   - Mobile app for library management

5. **DAO Governance**
   - Book collectors vote on platform decisions
   - NFT holders get revenue share
   - Community-curated collections

### Phase 3: Decentralization

1. **Fully Decentralized Storage**
   - Filecoin for permanent storage
   - Arweave for guaranteed availability
   - Self-hosted IPFS nodes

2. **Layer 2 Scaling**
   - Deploy to Arbitrum, Optimism
   - Cross-chain bridge for portability
   - Gasless transactions (meta-transactions)

3. **Privacy Enhancements**
   - Zero-knowledge proofs for ownership
   - Private reading lists
   - Anonymous badge claiming

---

## 📚 Additional Resources

### Smart Contract Standards
- [ERC-721 Specification](https://eips.ethereum.org/EIPS/eip-721)
- [ERC-1155 Specification](https://eips.ethereum.org/EIPS/eip-1155)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)

### Development Tools
- [Hardhat Documentation](https://hardhat.org/docs)
- [Ethers.js Documentation](https://docs.ethers.org/)
- [Pinata IPFS Documentation](https://docs.pinata.cloud/)

### Networks
- [Polygon Documentation](https://docs.polygon.technology/)
- [Polygon Gas Tracker](https://polygonscan.com/gastracker)
- [Polygon Faucet (Testnet)](https://faucet.polygon.technology/)

---

## ❓ Troubleshooting

### "Error: NFT service initialization failed"

**Cause**: Missing environment variables or incorrect contract addresses

**Solution**:
1. Check `.env` has all required variables
2. Verify contract addresses are correct
3. Ensure RPC URL is accessible
4. Check private key is valid

### "IPFS upload failed"

**Cause**: Missing Pinata credentials or rate limiting

**Solution**:
1. Verify `PINATA_JWT` is set correctly
2. Check Pinata dashboard for quota limits
3. Mock mode activates automatically if credentials missing

### "Badge not claimed"

**Cause**: User doesn't meet requirements yet

**Solution**:
1. Check badge requirements in `badge_definitions` table
2. Verify book count matches requirements
3. For controversial badges, ensure books have `danger_index > 50`

### "Transaction reverted"

**Cause**: Smart contract error or insufficient gas

**Solution**:
1. Check gas price and limits
2. Verify contract is deployed correctly
3. Test on testnet first
4. Review transaction logs on block explorer

---

## 📄 License

MIT License - See LICENSE file for details

---

**Questions?** Open an issue on [GitHub](https://github.com/Traviseric/teneo-marketplace/issues)

**Version**: 1.0.0
**Last Updated**: January 2025
**Status**: ✅ Production Ready (Part 1)
