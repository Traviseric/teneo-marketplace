#!/bin/bash

# Book Marketplace Demo Setup Script
# Gets you running in under 10 minutes!

echo "📚 Book Marketplace Quick Setup"
echo "=============================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "backend/server.js" ]; then
    echo -e "${RED}Error: Please run this script from the marketplace root directory${NC}"
    exit 1
fi

# Step 1: Create .env file
echo "1️⃣  Setting up environment configuration..."
if [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env 2>/dev/null || {
        # Create .env.example if it doesn't exist
        cat > backend/.env.example << 'EOF'
# Book Marketplace Configuration
PORT=3001
NODE_ENV=development

# Session secret (auto-generated)
SESSION_SECRET=WILL_BE_GENERATED

# Branding
MARKETPLACE_NAME=Demo Bookstore
MARKETPLACE_TAGLINE=Your Quick Start Bookstore
SUPPORT_EMAIL=demo@localhost

# Email (optional - disabled for demo)
EMAIL_ENABLED=false

# Stripe Test Keys (optional - payment disabled for demo)
STRIPE_ENABLED=false
STRIPE_PUBLISHABLE_KEY=pk_test_demo
STRIPE_SECRET_KEY=sk_test_demo

# Admin password (CHANGE THIS!)
ADMIN_PASSWORD_HASH=WILL_BE_GENERATED
EOF
        cp backend/.env.example backend/.env
    }
    
    # Generate session secret
    SESSION_SECRET=$(openssl rand -base64 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
    if [ "$(uname)" = "Darwin" ]; then
        sed -i '' "s/SESSION_SECRET=WILL_BE_GENERATED/SESSION_SECRET=$SESSION_SECRET/" backend/.env
    else
        sed -i "s/SESSION_SECRET=WILL_BE_GENERATED/SESSION_SECRET=$SESSION_SECRET/" backend/.env
    fi
    
    echo -e "${GREEN}✓ Created .env file${NC}"
else
    echo -e "${YELLOW}✓ .env file already exists${NC}"
fi

# Step 2: Install dependencies
echo ""
echo "2️⃣  Installing dependencies..."
cd backend
npm install --silent 2>/dev/null || npm install
cd ..
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Step 3: Set up admin password
echo ""
echo "3️⃣  Setting up admin access..."
if ! grep -q "ADMIN_PASSWORD_HASH=\$2b\$10" backend/.env; then
    # Generate hash for 'demo123' password
    node -e "
    const bcrypt = require('bcrypt');
    const hash = bcrypt.hashSync('demo123', 10);
    console.log(hash);
    " > /tmp/admin_hash.txt 2>/dev/null || {
        # Fallback: use pre-generated hash for 'demo123'
        echo '$2b$10$QJYB8HaKPMH2FOZ6Sy05r.5n/1bGL5yK1vLQ21CfIGWDKRfJMLhRy' > /tmp/admin_hash.txt
    }
    
    ADMIN_HASH=$(cat /tmp/admin_hash.txt)
    rm /tmp/admin_hash.txt
    
    if [ "$(uname)" = "Darwin" ]; then
        sed -i '' "s|ADMIN_PASSWORD_HASH=WILL_BE_GENERATED|ADMIN_PASSWORD_HASH=$ADMIN_HASH|" backend/.env
    else
        sed -i "s|ADMIN_PASSWORD_HASH=WILL_BE_GENERATED|ADMIN_PASSWORD_HASH=$ADMIN_HASH|" backend/.env
    fi
    
    echo -e "${GREEN}✓ Admin password set to: demo123${NC}"
    echo -e "${YELLOW}  ⚠️  Remember to change this before going live!${NC}"
else
    echo -e "${GREEN}✓ Admin password already configured${NC}"
fi

# Step 4: Create sample books directory
echo ""
echo "4️⃣  Setting up sample content..."
mkdir -p backend/uploads/books
mkdir -p backend/uploads/previews
mkdir -p frontend/images

# Create a sample PDF if no books exist
if [ -z "$(ls -A backend/uploads/books 2>/dev/null)" ]; then
    # Check if we can create PDFs
    if command -v pdfkit &> /dev/null || node -e "require('pdfkit')" 2>/dev/null; then
        node -e "
        const PDFDocument = require('pdfkit');
        const fs = require('fs');
        
        // Create sample book
        const doc = new PDFDocument();
        doc.pipe(fs.createWriteStream('backend/uploads/books/sample-book.pdf'));
        doc.fontSize(20).text('Welcome to Your Bookstore!', 100, 100);
        doc.fontSize(14).text('This is a sample book to get you started.', 100, 150);
        doc.fontSize(12).text('Upload your own PDFs through the admin panel.', 100, 200);
        doc.end();
        
        // Create preview
        const preview = new PDFDocument();
        preview.pipe(fs.createWriteStream('backend/uploads/previews/sample-preview.pdf'));
        preview.fontSize(16).text('Book Preview', 100, 100);
        preview.fontSize(12).text('This is a preview of the book content.', 100, 150);
        preview.end();
        
        console.log('Sample PDFs created');
        " 2>/dev/null && echo -e "${GREEN}✓ Created sample book and preview${NC}" || echo -e "${YELLOW}✓ Skipped sample PDFs (install pdfkit to enable)${NC}"
    else
        echo -e "${YELLOW}✓ Skipped sample PDFs (pdfkit not available)${NC}"
    fi
else
    echo -e "${GREEN}✓ Books directory already has content${NC}"
fi

# Step 5: Initialize database
echo ""
echo "5️⃣  Initializing database..."
mkdir -p backend/database
touch backend/database/marketplace.db
echo -e "${GREEN}✓ Database ready${NC}"

# Step 6: Create Stripe test product (optional)
echo ""
echo "6️⃣  Stripe configuration..."
if grep -q "STRIPE_ENABLED=true" backend/.env 2>/dev/null && grep -q "sk_test_" backend/.env 2>/dev/null; then
    echo "Creating test products in Stripe..."
    node backend/scripts/setup-stripe.js 2>/dev/null || echo -e "${YELLOW}✓ Skipped Stripe setup (configure keys first)${NC}"
else
    echo -e "${YELLOW}✓ Stripe disabled for demo (enable in .env to test payments)${NC}"
fi

# Step 7: Final checks
echo ""
echo "7️⃣  Running final checks..."

# Check if port 3001 is available
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port 3001 is already in use${NC}"
    echo "   Edit PORT in backend/.env to use a different port"
else
    echo -e "${GREEN}✓ Port 3001 is available${NC}"
fi

# Success!
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 Your bookstore is ready!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "To start your bookstore:"
echo "  cd backend"
echo "  npm start"
echo ""
echo "Then visit:"
echo "  📚 Bookstore: http://localhost:3001"
echo "  🔐 Admin Panel: http://localhost:3001/admin"
echo "     Password: demo123"
echo ""
echo "Next steps:"
echo "  1. Upload your books via admin panel"
echo "  2. Configure Stripe for payments"
echo "  3. Customize the design"
echo "  4. Join the federation network"
echo ""
echo "Need help? Check out:"
echo "  📖 Documentation: marketplace/docs/"
echo "  💬 Community: github.com/Traviseric/teneo-marketplace/discussions"
echo ""