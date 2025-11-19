/**
 * Deploy NFT Smart Contracts to Polygon
 *
 * Usage:
 * - Testnet: npx hardhat run scripts/deploy-contracts.js --network mumbai
 * - Mainnet: npx hardhat run scripts/deploy-contracts.js --network polygon
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n🚀 Starting NFT Smart Contract Deployment...\n");

  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;

  console.log(`📍 Network: ${network}`);
  console.log(`💼 Deploying with account: ${deployer.address}`);

  // Get deployer balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`💰 Account balance: ${hre.ethers.formatEther(balance)} MATIC\n`);

  if (balance === 0n) {
    console.error("❌ ERROR: Account has no MATIC for gas fees!");
    console.error("Please fund your wallet before deploying.");
    process.exit(1);
  }

  // Deploy BookOwnership Contract
  console.log("📚 Deploying BookOwnership (ERC-721)...");
  const BookOwnership = await hre.ethers.getContractFactory("BookOwnership");
  const bookOwnership = await BookOwnership.deploy();
  await bookOwnership.waitForDeployment();
  const bookOwnershipAddress = await bookOwnership.getAddress();
  console.log(`✅ BookOwnership deployed to: ${bookOwnershipAddress}\n`);

  // Deploy KnowledgeBadges Contract
  console.log("🏆 Deploying KnowledgeBadges (ERC-1155)...");
  const baseURI = process.env.MARKETPLACE_URL
    ? `${process.env.MARKETPLACE_URL}/api/nft/badge-metadata/`
    : "ipfs://badges/";

  const KnowledgeBadges = await hre.ethers.getContractFactory("KnowledgeBadges");
  const badges = await KnowledgeBadges.deploy(baseURI);
  await badges.waitForDeployment();
  const badgesAddress = await badges.getAddress();
  console.log(`✅ KnowledgeBadges deployed to: ${badgesAddress}\n`);

  // Deploy LibraryInheritance Contract
  console.log("🔐 Deploying LibraryInheritance...");
  const LibraryInheritance = await hre.ethers.getContractFactory("LibraryInheritance");
  const inheritance = await LibraryInheritance.deploy(bookOwnershipAddress);
  await inheritance.waitForDeployment();
  const inheritanceAddress = await inheritance.getAddress();
  console.log(`✅ LibraryInheritance deployed to: ${inheritanceAddress}\n`);

  // Set cross-contract references
  console.log("🔗 Setting up cross-contract references...");
  const tx = await badges.setBookOwnershipContract(bookOwnershipAddress);
  await tx.wait();
  console.log("✅ KnowledgeBadges linked to BookOwnership\n");

  // Save deployment addresses
  const deployment = {
    network: network,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      BookOwnership: bookOwnershipAddress,
      KnowledgeBadges: badgesAddress,
      LibraryInheritance: inheritanceAddress
    },
    gasUsed: {
      BookOwnership: "~150,000 gas",
      KnowledgeBadges: "~200,000 gas",
      LibraryInheritance: "~180,000 gas"
    }
  };

  const deploymentPath = path.join(__dirname, `../deployments/${network}-deployment.json`);
  const deploymentsDir = path.join(__dirname, "../deployments");

  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log(`📄 Deployment info saved to: ${deploymentPath}\n`);

  // Generate .env updates
  console.log("═══════════════════════════════════════════════════");
  console.log("🎉 DEPLOYMENT SUCCESSFUL!");
  console.log("═══════════════════════════════════════════════════\n");

  console.log("📋 Update your .env file with these addresses:\n");
  console.log(`BLOCKCHAIN_NETWORK=${network}`);
  console.log(`BOOK_OWNERSHIP_CONTRACT_ADDRESS=${bookOwnershipAddress}`);
  console.log(`BADGES_CONTRACT_ADDRESS=${badgesAddress}`);
  console.log(`INHERITANCE_CONTRACT_ADDRESS=${inheritanceAddress}\n`);

  // Generate ABI files
  console.log("📦 Generating ABI files...");
  const abiDir = path.join(__dirname, "../contracts/abi");
  if (!fs.existsSync(abiDir)) {
    fs.mkdirSync(abiDir, { recursive: true });
  }

  const artifacts = [
    { name: "BookOwnership", path: "contracts/BookOwnership.sol/BookOwnership.json" },
    { name: "KnowledgeBadges", path: "contracts/KnowledgeBadges.sol/KnowledgeBadges.json" },
    { name: "LibraryInheritance", path: "contracts/LibraryInheritance.sol/LibraryInheritance.json" }
  ];

  for (const artifact of artifacts) {
    const artifactPath = path.join(__dirname, `../artifacts/${artifact.path}`);
    const destPath = path.join(abiDir, `${artifact.name}.json`);

    if (fs.existsSync(artifactPath)) {
      const artifactData = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
      fs.writeFileSync(destPath, JSON.stringify(artifactData.abi, null, 2));
      console.log(`✅ ${artifact.name}.json saved to contracts/abi/`);
    }
  }

  console.log("\n═══════════════════════════════════════════════════");
  console.log("📊 NEXT STEPS:");
  console.log("═══════════════════════════════════════════════════\n");

  console.log("1. Update .env with contract addresses (shown above)");
  console.log("2. Verify contracts on block explorer (optional):");
  console.log(`   npx hardhat verify --network ${network} ${bookOwnershipAddress}`);
  console.log(`   npx hardhat verify --network ${network} ${badgesAddress} "${baseURI}"`);
  console.log(`   npx hardhat verify --network ${network} ${inheritanceAddress} ${bookOwnershipAddress}`);
  console.log("3. Restart your backend server");
  console.log("4. Test NFT minting with a test purchase\n");

  // If testnet, provide faucet link
  if (network === "mumbai") {
    console.log("💧 Need more test MATIC? Get it from:");
    console.log("   https://faucet.polygon.technology/\n");
  }

  console.log("🎉 Deployment complete! NFT system is ready to use.\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
