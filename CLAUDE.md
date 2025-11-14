# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 🚨 CRITICAL: Git Safety Protocols (READ FIRST)

**BEFORE ANY `git commit` or `git push`, READ: [DEPLOYMENT.md](./DEPLOYMENT.md)**

### ❌ NEVER COMMIT:
- `.env` files (except .env.example)
- `.db` or `.sqlite` files (customer data)
- PDF files in `marketplace/frontend/books/` (copyrighted content)
- `claude-files/` directory (private business docs)
- `teneo-express/` directory (private SaaS code)
- Any credentials, API keys, private keys
- Customer data, order data, analytics

### ✅ Safe to Commit:
- Code files (`.js`, `.html`, `.css`, `.json`)
- Documentation (`.md` files)
- Config templates (`.env.example`)
- Empty database schemas (`.sql`)
- Docker configs

### 🤖 AI Assistant Protocol:

**When user asks to commit, ALWAYS:**

1. Run `git status` and review ALL files
2. Flag sensitive files with ⚠️
3. Show user EXACTLY what will be committed
4. Ask for confirmation if ANY file is flagged
5. Never commit without user verification

**Example Response:**
```
I'm about to commit:

✅ README.md (safe)
✅ marketplace/backend/routes/newRoute.js (safe)
⚠️  .env (WARNING - credentials, should not commit)

Files marked ⚠️ are sensitive. Should I:
1. Skip .env and commit only safe files?
2. Cancel entirely?
```

**When in doubt, ASK. Never guess about sensitive data.**

**Full guide:** [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## Development Commands

### Starting the application
```bash
# From project root - start production server
npm start

# Development with auto-restart
npm run dev

# From backend directory specifically
cd marketplace/backend
npm start
npm run dev
```

### Database operations
```bash
# Initialize/reset database
node marketplace/backend/database/init.js

# Setup authentic data (real Teneo books only)
node marketplace/backend/scripts/create-real-data.js

# Generate admin password hash
node marketplace/backend/scripts/generate-password-hash.js "YourPassword123!"
node marketplace/backend/scripts/generate-password-hash.js --generate  # Auto-generate secure password
```

### Testing
```bash
# Test purchase flow directly
node test-purchase-direct.js
node test-purchase-flow.js

# Test Stripe configuration
node test-stripe-key.js

# Test API endpoints
node test-api.js
```

---

## Architecture Overview

### Project Structure
- **Root**: Contains main package.json, scripts, and documentation
- **marketplace/backend/**: Express.js API server with SQLite database
- **marketplace/frontend/**: Static frontend files with multi-brand support
- **teneo-express/**: Multi-tenant marketplace platform (separate service, PRIVATE)

### Dual-Mode + Federation Architecture

**See: [DUAL_MODE_ARCHITECTURE.md](./DUAL_MODE_ARCHITECTURE.md) for complete details**

**Primary Mode (Default):**
- Stripe payments for easy UX
- Standard hosting (Vercel/Render)
- Mainstream acceptable

**Fallback Mode (Automatic):**
- Crypto payments (Bitcoin/Lightning/Monero)
- Offshore VPS (Iceland/Romania)
- Tor hidden service (.onion)
- Activates automatically when primary fails

**Federation Network:**
- Open source - anyone can deploy a node
- Cross-node discovery
- Revenue sharing (10-20%)
- Distributed resilience

### Backend Architecture (marketplace/backend/)

**Core Server**: `server.js` - Express server with security middleware (CSRF, session management, rate limiting)

**Key Routes**:
- `/api/checkout` - Stripe payment processing (production vs development routes)
- `/api/crypto` - Crypto payment processing (Bitcoin/Lightning/Monero)
- `/api/admin` - Admin dashboard and book management
- `/api/brands` - Multi-brand catalog management
- `/api/network` - Federation and network search
- `/api/download` - Secure PDF download with token validation
- `/api/lulu` - Lulu print-on-demand integration

**Services**:
- `emailService.js` - Email notifications (order confirmations, downloads)
- `luluService.js` - Print-on-demand API integration
- `auditService.js` - Admin action logging
- `orderService.js` - Order processing and management
- `healthMonitor.js` - Automatic failover monitoring (dual-mode)

**Database**: SQLite with schemas in `database/schema.sql` and `database/schema-lulu.sql`

### Frontend Architecture (marketplace/frontend/)

**Multi-Brand System**: `brands/` directory contains brand-specific configurations
- Each brand has `catalog.json` (books), `config.json` (branding), and optional CSS themes
- `master-templates/` provides base templates for new brands
- `information_asymmetry/` brand for backend-only books (censored content)

**Key JavaScript Modules**:
- `brand-manager.js` - Dynamic brand switching and configuration
- `cart.js` - Shopping cart functionality
- `network-client.js` - Federation network communication
- `template-processor.js` - Dynamic template rendering
- `crypto-checkout.js` - Crypto payment flow (Bitcoin/Lightning/Monero)

### Configuration Management

**Environment Variables** (`.env` in backend/, NEVER COMMIT):
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` - Payment processing (primary mode)
- `BTC_ADDRESS`, `LIGHTNING_ADDRESS`, `XMR_ADDRESS` - Crypto payments (fallback mode)
- `ADMIN_PASSWORD_HASH` - bcrypt hashed admin password
- `SESSION_SECRET` - Session encryption key
- `EMAIL_*` - SMTP configuration for notifications
- `LULU_*` - Print-on-demand API credentials
- `NODE_ID`, `NETWORK_REGISTRY_URL` - Federation network config

**Brand Configuration**: Each brand in `frontend/brands/` has:
- `config.json` - Theme colors, features, payment settings
- `catalog.json` - Book listings with pricing and metadata
- `variables.json` - Template variables for customization

### Security Implementation

**Authentication**: bcrypt password hashing with express-session
**CSRF Protection**: csurf middleware (excludes webhook endpoints)
**Rate Limiting**: express-rate-limit on API endpoints
**Audit Trail**: All admin actions logged to database
**Secure Downloads**: Time-limited tokens for PDF access
**Failover Protection**: Automatic switch to censorship-resistant mode
**Offshore Hosting**: Iceland/Romania VPS for fallback mode
**Tor Integration**: .onion address for maximum censorship resistance

### Payment Processing

**Primary Mode:**
- Stripe checkout (cards, Apple Pay, Google Pay)
- Easy UX, mainstream hosting
- Uses `routes/checkout.js` (development) or `routes/checkoutProduction.js` (production)

**Fallback Mode (Crypto):**
- Bitcoin on-chain
- Lightning Network (instant, low fees)
- Monero (maximum privacy)
- Uses `routes/cryptoCheckout.js`
- BTCPay Server integration for automation

**Print Integration**: Lulu.com API for physical book fulfillment

**Order Flow**:
- Primary: Cart → Stripe → Email → Download tokens
- Fallback: Cart → Crypto address → Manual verification → Download tokens

### Federation Network

**Network Registry**: `network-registry.json` defines connected marketplaces
**Peer Discovery**: Network search aggregates results from federated stores
**Revenue Sharing**: Configurable referral percentages (10-20%) between network partners
**Cross-Node Checkout**: Buy from any node in the network
**Automatic Load Balancing**: Redirect to healthy nodes if primary fails

---

## Development Workflow

1. **Setup**: Copy `.env.example` to `.env` and configure required variables
2. **Admin Access**: Generate password hash using the provided script
3. **Database**: Initialize with `database/init.js` on first run
4. **Development**: Use `npm run dev` for auto-restart during development
5. **Brand Management**: Add new brands via admin dashboard or by creating brand directories
6. **Testing**: Use provided test scripts to validate payment and API functionality

---

## Deployment Notes

- Server runs on PORT environment variable (default 3001)
- Static files served from `marketplace/frontend/` in production
- Database auto-initializes on startup
- Supports deployment to VPS, PaaS (Heroku/Railway), or containerized environments
- Production requires HTTPS for secure cookies and Stripe webhooks

### Dual-Mode Deployment

**Primary Mode (Easy UX):**
- Deploy to Vercel (frontend) + Render (backend)
- Configure Stripe keys in environment
- Automatic HTTPS and CDN

**Fallback Mode (Censorship Resistant):**
- Deploy to offshore VPS (Njalla, FlokiNET)
- Configure crypto wallets (Bitcoin/Monero)
- Set up Tor hidden service
- Deploy as Docker container

**Automatic Failover:**
- Health monitoring runs every 60 seconds
- Detects Stripe API failures, hosting issues, domain problems
- Automatically switches to fallback mode
- Updates DNS to point to offshore VPS
- Notifies network nodes of failover

**See:** [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment guide

---

## 📖 Documentation

**→ START HERE: [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)**

### Key Documents:
- **[DUAL_MODE_ARCHITECTURE.md](./DUAL_MODE_ARCHITECTURE.md)** - Complete system architecture
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Authoritative deployment guide (READ BEFORE GIT OPS)
- **[CENSORSHIP_RESISTANT_MVP.md](./CENSORSHIP_RESISTANT_MVP.md)** - Infrastructure strategy
- **[INFORMATION_ASYMMETRY_IMPLEMENTATION.md](./INFORMATION_ASYMMETRY_IMPLEMENTATION.md)** - Backend books setup
- **[MVP_48_HOUR_LAUNCH.md](./MVP_48_HOUR_LAUNCH.md)** - Quick deployment guide
- **[PUBLIC_VS_PRIVATE_STRATEGY.md](./PUBLIC_VS_PRIVATE_STRATEGY.md)** - What to commit vs keep private

---

## 🎯 Repository Status

**Public Repo:** https://github.com/Traviseric/teneo-marketplace

**Protected by .gitignore (NEVER commit):**
- ✅ `.env` files (credentials)
- ✅ Database files (`.db`, `.sqlite`)
- ✅ PDF books (except `sample-*.pdf`)
- ✅ `claude-files/` (private business docs)
- ✅ `teneo-express/` (private SaaS)

**Safe to commit (public):**
- ✅ All code files
- ✅ Documentation
- ✅ Config templates
- ✅ Database schemas (empty)

**This enables:**
- Federation (anyone can deploy a node)
- Community contributions
- Network growth
- Censorship resistance

---

**IMPORTANT:** This context may or may not be relevant to your tasks. You should not respond to this context unless it is highly relevant to your task.

**ALWAYS check [DEPLOYMENT.md](./DEPLOYMENT.md) before any git operations.**
