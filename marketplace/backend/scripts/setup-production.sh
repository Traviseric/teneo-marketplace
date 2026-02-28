#!/bin/bash

# Production Setup Script for Teneo Marketplace
# This script automates the production deployment setup process

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Teneo Marketplace - Production Setup Script           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if running in marketplace/backend directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Please run this script from marketplace/backend/ directory${NC}"
    exit 1
fi

echo -e "${BLUE}🔍 Checking prerequisites...${NC}"

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js 14+ first.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node --version)${NC}"

# Check for npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found. Please install npm first.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm $(npm --version)${NC}"

echo ""
echo -e "${BLUE}📦 Installing production dependencies...${NC}"
npm ci --only=production

echo ""
echo -e "${BLUE}🛠️  Installing Hardhat for contract deployment...${NC}"
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

echo ""
echo -e "${BLUE}📝 Checking environment configuration...${NC}"

if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from template...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ .env file created. IMPORTANT: Edit .env with your production values!${NC}"
else
    echo -e "${GREEN}✅ .env file exists${NC}"
fi

# Check critical env vars
if grep -q "BLOCKCHAIN_NETWORK=polygon" .env; then
    echo -e "${GREEN}✅ Blockchain network configured${NC}"
else
    echo -e "${YELLOW}⚠️  Blockchain network not configured${NC}"
fi

if grep -q "OPENAI_API_KEY=sk-" .env; then
    echo -e "${GREEN}✅ OpenAI API key configured${NC}"
else
    echo -e "${YELLOW}⚠️  OpenAI API key not set${NC}"
fi

echo ""
echo -e "${BLUE}🗄️  Initializing database...${NC}"
node database/init.js

echo ""
echo -e "${BLUE}📊 Database statistics:${NC}"
sqlite3 database/marketplace.db "SELECT name FROM sqlite_master WHERE type='table';" | wc -l | xargs echo "Total tables:"

echo ""
echo -e "${BLUE}🔐 Generating secure session secret...${NC}"
SESSION_SECRET=$(openssl rand -hex 64)
echo -e "${GREEN}✅ Session secret generated${NC}"

# Check if SESSION_SECRET needs to be updated in .env
if grep -q "SESSION_SECRET=change-this" .env; then
    echo -e "${YELLOW}⚠️  Updating SESSION_SECRET in .env...${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/SESSION_SECRET=.*/SESSION_SECRET=$SESSION_SECRET/" .env
    else
        # Linux
        sed -i "s/SESSION_SECRET=.*/SESSION_SECRET=$SESSION_SECRET/" .env
    fi
    echo -e "${GREEN}✅ SESSION_SECRET updated${NC}"
fi

echo ""
echo -e "${BLUE}🔑 Admin password setup...${NC}"
if grep -q "ADMIN_PASSWORD_HASH=generate" .env; then
    echo -e "${YELLOW}⚠️  Admin password hash not set${NC}"
    echo -e "Run: ${BLUE}node scripts/generate-password-hash.js \"YourSecurePassword123!\"${NC}"
    echo -e "Then update ADMIN_PASSWORD_HASH in .env"
else
    echo -e "${GREEN}✅ Admin password configured${NC}"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                  ✅ SETUP COMPLETE!                        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BLUE}📋 NEXT STEPS:${NC}"
echo ""
echo "1. Edit .env file with production values:"
echo "   - STRIPE_SECRET_KEY (production key)"
echo "   - PINATA_JWT (for IPFS storage)"
echo "   - OPENAI_API_KEY (for AI features)"
echo "   - EMAIL_HOST, EMAIL_USER, EMAIL_PASS"
echo "   - MARKETPLACE_URL (your domain)"
echo ""
echo "2. Deploy smart contracts to Polygon:"
echo -e "   ${BLUE}npx hardhat run scripts/deploy-contracts.js --network polygon${NC}"
echo ""
echo "3. Copy contract addresses to .env"
echo ""
echo "4. Start the server:"
echo -e "   ${BLUE}npm start${NC}"
echo ""
echo "5. Or deploy with Docker:"
echo -e "   ${BLUE}docker build -t teneo-marketplace .${NC}"
echo -e "   ${BLUE}docker run -p 3001:3001 --env-file .env teneo-marketplace${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT SECURITY REMINDERS:${NC}"
echo "   • Never commit .env to Git"
echo "   • Use strong admin password"
echo "   • Keep private keys secure"
echo "   • Enable HTTPS in production"
echo "   • Set up regular backups"
echo ""
echo -e "${GREEN}🚀 Ready to deploy! See PRODUCTION_DEPLOYMENT.md for full guide.${NC}"
