# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

## Architecture Overview

### Project Structure
- **Root**: Contains main package.json, scripts, and documentation
- **marketplace/backend/**: Express.js API server with SQLite database
- **marketplace/frontend/**: Static frontend files with multi-brand support
- **teneo-express/**: Multi-tenant marketplace platform (separate service)

### Backend Architecture (marketplace/backend/)

**Core Server**: `server.js` - Express server with security middleware (CSRF, session management, rate limiting)

**Key Routes**:
- `/api/checkout` - Stripe payment processing (production vs development routes)
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

**Database**: SQLite with schemas in `database/schema.sql` and `database/schema-lulu.sql`

### Frontend Architecture (marketplace/frontend/)

**Multi-Brand System**: `brands/` directory contains brand-specific configurations
- Each brand has `catalog.json` (books), `config.json` (branding), and optional CSS themes
- `master-templates/` provides base templates for new brands

**Key JavaScript Modules**:
- `brand-manager.js` - Dynamic brand switching and configuration
- `cart.js` - Shopping cart functionality
- `network-client.js` - Federation network communication
- `template-processor.js` - Dynamic template rendering

### Configuration Management

**Environment Variables** (`.env` in backend/):
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` - Payment processing
- `ADMIN_PASSWORD_HASH` - bcrypt hashed admin password
- `SESSION_SECRET` - Session encryption key
- `EMAIL_*` - SMTP configuration for notifications
- `LULU_*` - Print-on-demand API credentials

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

### Payment Processing

**Development**: Uses `routes/checkout.js` with test Stripe keys
**Production**: Uses `routes/checkoutProduction.js` with live keys
**Print Integration**: Lulu.com API for physical book fulfillment
**Order Flow**: Cart → Stripe checkout → Email confirmation → Download tokens

### Federation Network

**Network Registry**: `network-registry.json` defines connected marketplaces
**Peer Discovery**: Network search aggregates results from federated stores
**Revenue Sharing**: Configurable referral percentages between network partners

## Development Workflow

1. **Setup**: Copy `.env.example` to `.env` and configure required variables
2. **Admin Access**: Generate password hash using the provided script
3. **Database**: Initialize with `database/init.js` on first run
4. **Development**: Use `npm run dev` for auto-restart during development
5. **Brand Management**: Add new brands via admin dashboard or by creating brand directories
6. **Testing**: Use provided test scripts to validate payment and API functionality

## Deployment Notes

- Server runs on PORT environment variable (default 3001)
- Static files served from `marketplace/frontend/` in production
- Database auto-initializes on startup
- Supports deployment to VPS, PaaS (Heroku/Railway), or containerized environments
- Production requires HTTPS for secure cookies and Stripe webhooks