# Teneo Marketplace

Decentralized book marketplace with dual-mode payments (Stripe + crypto fallback), federation network, and censorship resistance. Public open-source repo — content generation lives in teneo-production (private).

## Lookup Table

| Concept | Files | Search Terms |
|---------|-------|--------------|
| Server Entry | marketplace/backend/server.js | express, app, listen, PORT |
| Routes | marketplace/backend/routes/ | checkout, admin, brands, network, auth |
| Services | marketplace/backend/services/ | email, lulu, audit, order, health |
| Database | marketplace/backend/database/schema.sql, init.js | sqlite, CREATE TABLE, orders |
| Auth System | marketplace/backend/auth/, routes/auth.js | AuthProvider, magic link, OAuth, session |
| Teneo Auth SSO | See C:\code\.claude\TENEO-AUTH-SETUP.md Part 2B | OAuth 2.0, PKCE, JWT, teneo-auth, SSO |
| Nostr/Alby Auth | Port from C:\code\arxmint\lib\nostr-auth.ts | NIP-07, NIP-98, Alby, nos2x, window.nostr |
| Frontend | marketplace/frontend/ | brand-manager, cart, checkout, template |
| Brand System | marketplace/frontend/brands/ | config.json, catalog.json, variables |
| Course Module | course-module/ | progress, module, lesson |
| Funnel Module | funnel-module/ | funnel, landing, template |
| Setup Wizard | setup-wizard/index.html | wizard, configure, setup |
| Payments | routes/checkout.js, routes/cryptoCheckout.js | stripe, bitcoin, lightning, monero |
| Federation | routes/network.js, network-registry.json | node, peer, discovery, revenue share |
| Docker | docker-compose.yml, Dockerfile | container, nginx, redis |
| Config | .env.example, marketplace/backend/.env.example | STRIPE, SESSION_SECRET, EMAIL |
| Component Library | marketplace/frontend/components-library/, COMPONENT_MANIFEST.json | component, template, {{VARIABLE}}, hero, CTA |
| AI Builder Strategy | docs/development/AI_BUILDER_STRATEGY.md | natural language, page builder, Claude Code, ClickFunnels killer |
| AI Discovery | marketplace/backend/routes/discovery.js, docs/features/AI_DISCOVERY_ENGINE.md | semantic search, embeddings, knowledge graph, suppression |
| ArxMint Payments | See C:\code\arxmint — L402, Cashu, Fedimint, spend router | L402, ecash, NUT-24, Lightning, micropayments, payment SDK |
| Docs | docs/ (75+ files by category) | architecture, deployment, features |

## Stack

- Runtime: Node.js 18+
- Framework: Express.js
- Database: SQLite
- Payments: Stripe + Bitcoin/Lightning/Monero
- Frontend: Vanilla HTML/CSS/JS (no framework)
- Email: Nodemailer
- Print: Lulu API
- Deploy: Docker, Vercel (frontend), Render (backend)

## Commands

```bash
npm start                                          # Production server (port 3001)
npm run dev                                        # Dev with nodemon auto-restart
node marketplace/backend/database/init.js          # Init/reset database
node marketplace/backend/scripts/create-real-data.js  # Load authentic book data
node marketplace/backend/scripts/generate-password-hash.js --generate  # Admin password
node test-api.js                                   # Test API endpoints
node test-purchase-flow.js                         # Test purchase flow
```

## Conventions

- Public repo: never commit .env, .db, .sqlite, PDFs, claude-files/, teneo-express/
- Brand configs: each brand gets config.json + catalog.json in frontend/brands/
- Routes: one file per domain (checkout, admin, brands, network, auth)
- Services: business logic separate from routes
- Auth: pluggable providers (local magic link OR teneo-auth SSO)
- Dual-mode: primary (Stripe) auto-fails-over to fallback (crypto)

## Current Focus

See OVERNIGHT_TASKS.md for active roadmap.
