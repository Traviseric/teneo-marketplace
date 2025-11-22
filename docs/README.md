# 📚 Teneo Marketplace Documentation

**Complete documentation for deploying, configuring, and extending the Teneo Marketplace.**

---

## 🚀 Quick Navigation

### New to Teneo Marketplace?
1. **[Quick Start Guide](quick-start/MVP_48_HOUR_LAUNCH.md)** - Deploy your first node in 48 hours
2. **[Core Architecture](core/DUAL_MODE_ARCHITECTURE.md)** - Understand the dual-mode system
3. **[Quick Deploy](quick-start/QUICK_DEPLOY.md)** - Fastest deployment path

### Setting Up Your Node
- **[Deployment Overview](deployment/DEPLOYMENT.md)** - Production deployment guide
- **[Production Setup](deployment/PRODUCTION_DEPLOYMENT_GUIDE.md)** - Detailed production checklist
- **[Docker Deployment](deployment/DOCKER_DEPLOYMENT.md)** - Containerized deployment
- **[Censorship-Resistant Setup](deployment/CENSORSHIP_RESISTANT_MVP.md)** - Offshore & failover configuration

### Configuring Features
- **[Authentication Setup](integration/AUTH_SETUP.md)** - Local auth or TENEO Auth SSO
- **[Stripe Integration](deployment/STRIPE_SETUP.md)** - Payment processing setup
- **[Security Hardening](reference/SECURITY_SETUP_GUIDE.md)** - Complete security checklist
- **[TENEO Auth OAuth](integration/TENEO_AUTH_OAUTH_CLIENT_SETUP.md)** - SSO integration

---

## 📂 Documentation Structure

### [quick-start/](quick-start/)
Fast-track guides for getting started quickly
- MVP 48-hour launch guide
- Quick deploy scripts
- Minimal configuration paths

### [core/](core/)
Core architecture and design principles
- **[Dual-Mode Architecture](core/DUAL_MODE_ARCHITECTURE.md)** ⭐ - Primary + fallback modes
- **[Implementation Map](core/IMPLEMENTATION_MAP.md)** - System component overview
- **[Interface Specification](core/INTERFACE_SPECIFICATION.md)** - API contracts

### [features/](features/)
Feature guides and implementation details
- **[Course Platform Design](features/COURSE_PLATFORM_DESIGN.md)** - Course architecture
- **[Course Implementation](features/COURSES_PLATFORM_IMPLEMENTATION.md)** - Course platform details
- **[Course Player](features/COURSE_PLAYER_IMPLEMENTATION_SUMMARY.md)** - Player UI
- **[Book Funnel Blueprint](features/BOOK_FUNNEL_BLUEPRINT_COURSE_IMPLEMENTATION.md)** - Funnel system
- **[Funnel Builder Concept](features/BOOK_FUNNEL_BUILDER_CONCEPT.md)** - Builder architecture
- **[Funnel Integration Plan](features/FUNNEL_BUILDER_INTEGRATION_PLAN.md)** - Integration strategy
- **[Email Marketing](features/EMAIL_MARKETING_IMPLEMENTATION.md)** - Marketing automation
- **[Podia Feature Parity](features/PODIA_FEATURE_PARITY.md)** - Competitive analysis
- Information Asymmetry brand (backend books)
- Amazon integration & published books tracking
- Multi-channel sales strategies
- Brand automation roadmap

### [deployment/](deployment/)
Production deployment and infrastructure
- **[Production Setup](deployment/PRODUCTION_DEPLOYMENT_GUIDE.md)** ⭐
- **[Production Deployment](deployment/PRODUCTION_DEPLOYMENT.md)** - Production guide
- **[Censorship-Resistant MVP](deployment/CENSORSHIP_RESISTANT_MVP.md)** ⭐
- **[Render Deployment](deployment/RENDER_DEPLOYMENT.md)** - Deploy to Render
- Docker deployment
- Stripe production configuration
- Deployment status & checklists

### [integration/](integration/)
Third-party integrations and OAuth setup
- **[Authentication Setup](integration/AUTH_SETUP.md)** ⭐ - Local vs TENEO Auth
- **[TENEO Auth Integration](integration/TENEO_AUTH_INTEGRATION_STRATEGY.md)** - SSO strategy
- Orchestrator integration
- Webhook configuration
- ClickFunnels integration

### [development/](development/)
Contributing and extending the platform
- **[Contributing Guide](development/CONTRIBUTING.md)**
- **[AI Builder Strategy](development/AI_BUILDER_STRATEGY.md)** - Build with Claude Code

### [operations/](operations/)
Day-to-day operations and maintenance
- Health monitoring
- Failover procedures
- Backup strategies

### [reference/](reference/)
Technical reference and specifications
- **[Security Setup Guide](reference/SECURITY_SETUP_GUIDE.md)** ⭐ - 4-6 hour hardening
- **[Security Audit Report](reference/SECURITY_AUDIT_REPORT.md)** - Recent security audit
- **[Open Source Assessment](reference/OPEN_SOURCE_ASSESSMENT.md)** - Project evaluation
- **[Documentation Map](reference/DOCUMENTATION_MAP.md)** - Complete doc navigation
- **[Marketplace Status](reference/MARKETPLACE_STATUS_AND_TODO.md)** - Current status
- **[Auth Integration Complete](reference/AUTH_INTEGRATION_COMPLETE.md)** - Auth system docs
- **[Course Module Cleanup](reference/COURSE_MODULE_CLEANUP_SUMMARY.md)** - Cleanup summary
- **[Course Migration Guide](reference/COURSE_MODULE_MIGRATION_GUIDE.md)** - Migration docs
- **[Funnel Infrastructure Audit](reference/FUNNEL_INFRASTRUCTURE_AUDIT.md)** - Funnel audit
- **[Implementation Plan](reference/IMPLEMENTATION_PLAN.md)** - Overall plan
- **[Marketplace vs Production Strategy](reference/MARKETPLACE_VS_PRODUCTION_STRATEGY.md)** - Repo strategy
- Cost tracking architecture
- Public vs private strategy
- [Archives](reference/archives/) - Historical documentation

---

## 🎯 Role-Based Reading Paths

### For Node Operators
**Goal: Deploy and run a marketplace node**

1. [Quick Start Guide](quick-start/MVP_48_HOUR_LAUNCH.md) - Fastest path to deployment
2. [Authentication Setup](integration/AUTH_SETUP.md) - Choose local or SSO
3. [Security Hardening](reference/SECURITY_SETUP_GUIDE.md) - Secure your deployment
4. [Production Deployment](deployment/PRODUCTION_DEPLOYMENT_GUIDE.md) - Production best practices

### For Developers
**Goal: Contribute code or build custom features**

1. [Core Architecture](core/DUAL_MODE_ARCHITECTURE.md) - Understand the system
2. [Implementation Map](core/IMPLEMENTATION_MAP.md) - Navigate the codebase
3. [Contributing Guide](development/CONTRIBUTING.md) - Contribution workflow
4. [AI Builder Strategy](development/AI_BUILDER_STRATEGY.md) - Build with Claude

### For Publishers
**Goal: Use the platform to sell books**

1. [Information Asymmetry Guide](features/INFORMATION_ASYMMETRY_IMPLEMENTATION.md) - Backend book strategy
2. [Published Books Tracking](features/PUBLISHED_PAGE_GUIDE.md) - Amazon integration
3. [Multi-Channel Sales](features/MULTI_CHANNEL_SALES_STRATEGY.md) - Diversify revenue

### For Security Auditors
**Goal: Assess platform security**

1. [Security Setup Guide](reference/SECURITY_SETUP_GUIDE.md) - Complete security checklist
2. [Authentication Architecture](integration/TENEO_AUTH_INTEGRATION_STRATEGY.md) - Auth design
3. [Deployment Security](deployment/DEPLOYMENT.md) - Infrastructure security

---

## 🔥 Priority Documentation (Start Here)

### ⭐⭐⭐ Essential (Read First)
- **[Dual-Mode Architecture](core/DUAL_MODE_ARCHITECTURE.md)** - Core system design
- **[Security Setup Guide](reference/SECURITY_SETUP_GUIDE.md)** - Critical for deployment
- **[Authentication Setup](integration/AUTH_SETUP.md)** - User authentication

### ⭐⭐ Important (Read for Production)
- **[Production Deployment](deployment/PRODUCTION_DEPLOYMENT_GUIDE.md)** - Production setup
- **[Censorship-Resistant MVP](deployment/CENSORSHIP_RESISTANT_MVP.md)** - Failover setup
- **[Marketplace Status](reference/MARKETPLACE_STATUS_AND_TODO.md)** - What's built, what's pending

### ⭐ Helpful (Read as Needed)
- **[Quick Deploy](quick-start/QUICK_DEPLOY.md)** - Fastest deployment
- **[Implementation Map](core/IMPLEMENTATION_MAP.md)** - Code navigation
- **[TENEO Auth Integration](integration/TENEO_AUTH_INTEGRATION_STRATEGY.md)** - SSO details

---

## 📞 Quick Reference Cards

### Emergency Procedures
```bash
# If primary mode goes down (Stripe blocked, hosting seized):
# 1. Automatic failover activates crypto mode
# 2. DNS switches to offshore VPS
# 3. Tor .onion address continues service
# 4. Network nodes notified of failover

# See: deployment/CENSORSHIP_RESISTANT_MVP.md for details
```

### Common Commands
```bash
# Start marketplace
npm start

# Initialize database
node marketplace/backend/database/init.js

# Generate admin password
node marketplace/backend/scripts/generate-password-hash.js "YourPassword"

# Test Stripe integration
node test-stripe-key.js

# Deploy with Docker
docker-compose up -d
```

### Configuration Files
- `.env` - Environment configuration (NEVER commit to git)
- `.env.example` - Template for environment variables
- `marketplace/backend/database/schema.sql` - Database structure
- `marketplace/frontend/brands/*/config.json` - Brand configurations

---

## 🔐 Security Reminders

### Before Deploying to Production

✅ **Generate strong secrets** (see [Security Setup Guide](reference/SECURITY_SETUP_GUIDE.md))
```bash
openssl rand -hex 32  # SESSION_SECRET
openssl rand -hex 32  # JWT_SECRET
```

✅ **Configure HTTPS** (Cloudflare or Let's Encrypt)

✅ **Set up email security** (SPF, DKIM, DMARC)

✅ **Enable rate limiting** (included by default)

✅ **Audit logs enabled** (check database/audit_logs table)

✅ **Review .gitignore** (no secrets in git history)

---

## 🌐 Federation Network

The marketplace is designed for federation - anyone can deploy a node and join the network.

**Benefits of running a node:**
- 10-20% referral fees on network sales
- Build your own brand and community
- Censorship insurance (distributed network)
- Cross-node discovery of books

**Learn more:**
- [Dual-Mode Architecture](core/DUAL_MODE_ARCHITECTURE.md#federation-network)
- [Quick Deploy](quick-start/QUICK_DEPLOY.md)

---

## 📖 Additional Resources

### Official Documentation
- **[Main README](../README.md)** - Project overview
- **[CLAUDE.md](../CLAUDE.md)** - Claude Code integration guide

### External Resources
- **Stripe Docs**: https://stripe.com/docs
- **SQLite Docs**: https://sqlite.org/docs.html
- **Docker Docs**: https://docs.docker.com/

### Community
- **GitHub Issues**: Report bugs and request features
- **GitHub Discussions**: Ask questions and share ideas

---

## 🎯 Documentation Standards

All documentation in this repository follows these standards:

- **Markdown format** with GitHub-flavored syntax
- **Clear headings** for easy navigation
- **Code examples** with syntax highlighting
- **Step-by-step instructions** where applicable
- **Cross-references** to related documentation
- **Priority indicators** (⭐⭐⭐ Essential, ⭐⭐ Important, ⭐ Helpful)

---

## 📝 Contributing to Documentation

Found an error or want to improve the docs? See [Contributing Guide](development/CONTRIBUTING.md).

**Documentation contributions welcome:**
- Fix typos and errors
- Add missing examples
- Improve clarity
- Translate to other languages
- Add diagrams and visuals

---

**Last Updated:** November 22, 2025

**Documentation Version:** 2.1 (Reorganized - Clean Root)

---

*Need help? Check the appropriate guide above or open a GitHub issue.*
