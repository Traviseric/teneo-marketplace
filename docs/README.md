# OpenBazaar AI Documentation

**Complete documentation for deploying, configuring, and extending OpenBazaar AI.**

---

## Current Reality

**Updated:** March 9, 2026

This docs index keeps the richer original structure, but the current truth is:

- the repo has a broad implemented feature surface
- the automated suite is not fully green yet
- several high-value flows are implemented but still need production validation

Canonical truth sources:

- [reference/MARKETPLACE_STATUS_AND_TODO.md](reference/MARKETPLACE_STATUS_AND_TODO.md)
- [ROADMAP.md](ROADMAP.md)
- [../CHANGELOG.md](../CHANGELOG.md)

Use those first when a feature doc and the code appear to disagree.

---

## Quick Navigation

### New to OpenBazaar AI?
1. **[Quick Start Guide](quick-start/MVP_48_HOUR_LAUNCH.md)** - Deploy your first node in 48 hours
2. **[Core Architecture](core/DUAL_MODE_ARCHITECTURE.md)** - Understand the dual-mode system
3. **[Quick Deploy](quick-start/QUICK_DEPLOY.md)** - Fastest deployment path
4. **[Current Status](reference/MARKETPLACE_STATUS_AND_TODO.md)** - What is working, partial, blocked, and next

### Setting Up Your Node
- **[Deployment Overview](deployment/DEPLOYMENT.md)** - Production deployment guide
- **[Production Setup](deployment/PRODUCTION_DEPLOYMENT_GUIDE.md)** - Detailed production checklist
- **[Docker Deployment](deployment/DOCKER_DEPLOYMENT.md)** - Containerized deployment
- **[Censorship-Resistant Setup](deployment/CENSORSHIP_RESISTANT_MVP.md)** - Offshore and failover configuration

### Configuring Features
- **[Authentication Setup](integration/AUTH_SETUP.md)** - Local auth or TENEO Auth SSO
- **[Stripe Integration](deployment/STRIPE_SETUP.md)** - Payment processing setup
- **[Security Hardening](reference/SECURITY_SETUP_GUIDE.md)** - Complete security checklist
- **[Operator Guide](OPERATOR_GUIDE.md)** - Managed AI store-build workflow

---

## Documentation Structure

### [quick-start/](quick-start/)
Fast-track guides for getting started quickly
- MVP 48-hour launch guide
- Quick deploy scripts
- Minimal configuration paths

### [core/](core/)
Core architecture and design principles
- **[Dual-Mode Architecture](core/DUAL_MODE_ARCHITECTURE.md)** - Primary + fallback modes
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
- Information Asymmetry brand notes
- Amazon integration and published books tracking
- Multi-channel sales strategies
- Brand automation roadmap

### [deployment/](deployment/)
Production deployment and infrastructure
- **[Production Setup](deployment/PRODUCTION_DEPLOYMENT_GUIDE.md)**
- **[Production Deployment](deployment/PRODUCTION_DEPLOYMENT.md)** - Production guide
- **[Censorship-Resistant MVP](deployment/CENSORSHIP_RESISTANT_MVP.md)**
- **[Render Deployment](deployment/RENDER_DEPLOYMENT.md)** - Deploy to Render
- Docker deployment
- Stripe production configuration
- Deployment status and checklists

### [integration/](integration/)
Third-party integrations and OAuth setup
- **[Authentication Setup](integration/AUTH_SETUP.md)** - Local vs TENEO Auth
- **[TENEO Auth Integration](integration/TENEO_AUTH_INTEGRATION_STRATEGY.md)** - SSO strategy
- Orchestrator integration
- Webhook configuration
- ClickFunnels integration

### [development/](development/)
Contributing and extending the platform
- **[Contributing Guide](development/CONTRIBUTING.md)**
- **[AI Builder Strategy](development/AI_BUILDER_STRATEGY.md)** - Build with Claude Code
- **[AI Store Builder Checklist](development/AI_STORE_BUILDER_IMPLEMENTATION_CHECKLIST.md)** - Execution companion

### [legal/](legal/)
Brand protection and legal operations
- **[Trademark Filing Automation](legal/TRADEMARK_AUTOMATION.md)** - Filing packets and docket workflow

### [reference/](reference/)
Technical reference and specifications
- **[Marketplace Status](reference/MARKETPLACE_STATUS_AND_TODO.md)** - Canonical current state
- **[Best Practices Audit](reference/BEST_PRACTICES_AUDIT.md)** - Repo-wide compliance audit against TE Code guidance
- **[Security Setup Guide](reference/SECURITY_SETUP_GUIDE.md)** - Deployment hardening
- **[Security Audit Report](reference/SECURITY_AUDIT_REPORT.md)** - Security review
- **[Open Source Assessment](reference/OPEN_SOURCE_ASSESSMENT.md)** - Project evaluation
- **[Documentation Map](reference/DOCUMENTATION_MAP.md)** - Complete doc navigation
- **[Auth Integration Complete](reference/AUTH_INTEGRATION_COMPLETE.md)** - Auth system docs
- **[Course Module Cleanup](reference/COURSE_MODULE_CLEANUP_SUMMARY.md)** - Cleanup summary
- **[Course Migration Guide](reference/COURSE_MODULE_MIGRATION_GUIDE.md)** - Migration docs
- **[Funnel Infrastructure Audit](reference/FUNNEL_INFRASTRUCTURE_AUDIT.md)** - Funnel audit
- **[Implementation Plan](reference/IMPLEMENTATION_PLAN.md)** - Historical planning context
- **[Marketplace vs Production Strategy](reference/MARKETPLACE_VS_PRODUCTION_STRATEGY.md)** - Repo strategy
- Cost tracking architecture
- Public vs private strategy
- [Archives](reference/archives/) - Historical documentation

---

## Role-Based Reading Paths

### For Node Operators
**Goal: Deploy and run a marketplace node**

1. [Current Status](reference/MARKETPLACE_STATUS_AND_TODO.md)
2. [Quick Start Guide](quick-start/MVP_48_HOUR_LAUNCH.md)
3. [Authentication Setup](integration/AUTH_SETUP.md)
4. [Security Hardening](reference/SECURITY_SETUP_GUIDE.md)
5. [Production Deployment](deployment/PRODUCTION_DEPLOYMENT_GUIDE.md)

### For Developers
**Goal: Contribute code or build custom features**

1. [Current Status](reference/MARKETPLACE_STATUS_AND_TODO.md)
2. [Roadmap](ROADMAP.md)
3. [Core Architecture](core/DUAL_MODE_ARCHITECTURE.md)
4. [Implementation Map](core/IMPLEMENTATION_MAP.md)
5. [Contributing Guide](development/CONTRIBUTING.md)
6. [AI Builder Strategy](development/AI_BUILDER_STRATEGY.md)

### For Operators of the AI Store Builder
**Goal: Run paid or internal store builds cleanly**

1. [Operator Guide](OPERATOR_GUIDE.md)
2. [AI Store Builder Checklist](development/AI_STORE_BUILDER_IMPLEMENTATION_CHECKLIST.md)
3. [Roadmap](ROADMAP.md)

### For Security Auditors
**Goal: Assess platform security**

1. [Current Status](reference/MARKETPLACE_STATUS_AND_TODO.md)
2. [Security Setup Guide](reference/SECURITY_SETUP_GUIDE.md)
3. [Authentication Architecture](integration/TENEO_AUTH_INTEGRATION_STRATEGY.md)
4. [Deployment Security](deployment/DEPLOYMENT.md)

---

## Priority Documentation

### Essential
- **[Marketplace Status](reference/MARKETPLACE_STATUS_AND_TODO.md)** - Current truth source
- **[Roadmap](ROADMAP.md)** - Canonical phased plan
- **[Dual-Mode Architecture](core/DUAL_MODE_ARCHITECTURE.md)** - Core system design
- **[Authentication Setup](integration/AUTH_SETUP.md)** - User authentication

### Important
- **[Production Deployment](deployment/PRODUCTION_DEPLOYMENT_GUIDE.md)** - Production setup
- **[Security Setup Guide](reference/SECURITY_SETUP_GUIDE.md)** - Deployment hardening
- **[Operator Guide](OPERATOR_GUIDE.md)** - Managed store-build execution

### Helpful
- **[Quick Deploy](quick-start/QUICK_DEPLOY.md)** - Fastest deployment
- **[Implementation Map](core/IMPLEMENTATION_MAP.md)** - Code navigation
- **[TENEO Auth Integration](integration/TENEO_AUTH_INTEGRATION_STRATEGY.md)** - SSO details

---

## Quick Reference Cards

### Common Commands
```bash
# Start marketplace
npm start

# Dev server
npm run dev

# Full test run
npm test -- --runInBand

# Initialize database
node marketplace/backend/database/init.js

# Generate admin password
node marketplace/backend/scripts/generate-password-hash.js "YourPassword"

# Deploy with Docker
docker-compose up -d
```

### Configuration Files
- `.env` - Environment configuration (never commit to git)
- `.env.example` - Template for environment variables
- `marketplace/backend/database/schema.sql` - Database structure
- `marketplace/frontend/brands/*/config.json` - Brand configurations

---

## Documentation Governance

This repo now follows the documentation-related parts of `C:\code\.claude\BEST_PRACTICES.md` more explicitly:

- canonical roadmap: [ROADMAP.md](ROADMAP.md)
- canonical current-state doc: [reference/MARKETPLACE_STATUS_AND_TODO.md](reference/MARKETPLACE_STATUS_AND_TODO.md)
- best-practices audit: [reference/BEST_PRACTICES_AUDIT.md](reference/BEST_PRACTICES_AUDIT.md)
- changelog at repo root: [../CHANGELOG.md](../CHANGELOG.md)
- docs index acts as a stable discovery layer instead of competing with the truth docs

When project state changes, keep these files aligned:

- `README.md`
- `docs/README.md`
- `docs/ROADMAP.md`
- `docs/reference/MARKETPLACE_STATUS_AND_TODO.md`
- `CHANGELOG.md`

---

## Additional Resources

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

## Documentation Standards

All documentation in this repository should follow these standards:

- Markdown with clear headings
- Accurate status labeling: implemented, partial, beta, planned, blocked
- Evidence-backed roadmap updates
- No content loss when trimming or reorganizing docs
- Cross-links to the canonical truth docs

---

## Contributing to Documentation

Found an error or want to improve the docs? See [Contributing Guide](development/CONTRIBUTING.md).

**Documentation contributions welcome:**
- Fix typos and errors
- Add missing examples
- Improve clarity
- Add diagrams and visuals
- Keep docs aligned with the actual code and verification state

---

**Last Updated:** March 9, 2026

*Need help? Start with the current status doc and roadmap, then branch into the feature or deployment guide you need.*
