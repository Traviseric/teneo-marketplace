# Dual-Mode + Federated Marketplace Architecture

## 🎯 Concept: Resilient by Default

The marketplace operates in **two modes simultaneously**, with automatic failover and a **federated network** of independent nodes.

---

## 🔄 Dual-Mode Operation

### PRIMARY MODE (Default User Experience)

**Optimized for:**
- Ease of use
- Speed
- Mainstream adoption
- Maximum reach

**Infrastructure:**
```
Domain:     asymmetrybooks.com
Hosting:    Vercel (frontend) + Render (backend)
Payments:   Stripe (credit cards, Apple Pay, Google Pay)
Database:   PostgreSQL (Render managed)
CDN:        Cloudflare
Status:     ✅ Active (unless taken down)
```

**User Experience:**
- Browse catalog
- Add to cart
- Checkout with card (Stripe)
- Instant download link
- Standard e-commerce flow

**Risk:**
- ❌ Stripe can freeze account
- ❌ Vercel/Render can terminate
- ❌ Domain can be seized
- ❌ Content complaints can take it offline

---

### FALLBACK MODE (Automatic Censorship Resistance)

**Optimized for:**
- Censorship resistance
- Resilience
- Independence
- Permanence

**Infrastructure:**
```
Domain:     [multiple backups].com + .eth + .onion
Hosting:    Offshore VPS (Iceland/Romania/Netherlands)
Payments:   Bitcoin/Lightning/Monero (BTCPay Server)
Database:   PostgreSQL (self-hosted, encrypted)
CDN:        IPFS + local caching
Status:     🔄 Standby (activates on primary failure)
```

**User Experience:**
- Same catalog, different payment method
- Browse catalog
- Add to cart
- Checkout with crypto (Bitcoin/Lightning/Monero)
- Download via IPFS or direct link
- Slightly more friction, but uncensorable

**Advantages:**
- ✅ No payment processor can freeze
- ✅ No host can terminate
- ✅ .onion survives domain seizure
- ✅ IPFS provides permanent content hosting

---

## 🤖 Automatic Failover System

### Health Monitoring

**Primary Mode Monitoring:**
```javascript
// marketplace/backend/services/healthMonitor.js

const healthMonitor = {
    checkInterval: 60000, // Check every 60 seconds

    async checkPrimaryHealth() {
        const checks = {
            stripeAPI: await this.checkStripe(),
            hosting: await this.checkHosting(),
            domain: await this.checkDomain(),
            database: await this.checkDatabase()
        };

        const isHealthy = Object.values(checks).every(c => c === true);

        if (!isHealthy) {
            await this.activateFailover(checks);
        }

        return { healthy: isHealthy, checks };
    },

    async checkStripe() {
        try {
            await stripe.customers.list({ limit: 1 });
            return true;
        } catch (error) {
            console.error('Stripe check failed:', error);
            return false;
        }
    },

    async checkHosting() {
        // Verify can write to filesystem, database, etc.
        try {
            // Simple health check
            const canWrite = await testFileWrite();
            return canWrite;
        } catch {
            return false;
        }
    },

    async checkDomain() {
        // Check DNS resolution
        try {
            const dns = require('dns').promises;
            await dns.resolve(process.env.PRIMARY_DOMAIN);
            return true;
        } catch {
            return false;
        }
    },

    async activateFailover(failureReasons) {
        console.error('🚨 PRIMARY MODE FAILURE DETECTED', failureReasons);

        // 1. Update DNS to point to fallback
        await this.updateDNSToFallback();

        // 2. Notify network nodes
        await this.notifyNetworkNodes({
            type: 'primary_failure',
            node: process.env.NODE_ID,
            fallbackUrl: process.env.FALLBACK_URL,
            timestamp: Date.now()
        });

        // 3. Activate crypto checkout
        await this.enableCryptoMode();

        // 4. Send alert to admin
        await this.alertAdmin({
            subject: '🚨 Marketplace Primary Mode Failed',
            reason: failureReasons,
            action: 'Automatic failover to crypto/offshore mode activated'
        });

        // 5. Update user-facing status page
        await this.updateStatusPage({
            mode: 'fallback',
            message: 'Using backup payment system. All books still available.',
            payment: 'crypto'
        });
    },

    async enableCryptoMode() {
        // Switch routing to use crypto checkout
        process.env.PAYMENT_MODE = 'crypto';
        process.env.CHECKOUT_ROUTE = 'cryptoCheckout';

        // Update frontend to show crypto payment options
        await this.updateFrontendConfig({
            paymentMode: 'crypto',
            stripeEnabled: false,
            cryptoEnabled: true
        });
    }
};

// Run monitoring
setInterval(() => healthMonitor.checkPrimaryHealth(), 60000);
```

### DNS Failover

**Cloudflare Worker for Automatic Redirect:**
```javascript
// Cloudflare Worker: Auto-redirect if primary is down

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request))
});

async function handleRequest(request) {
    const primaryUrl = 'https://asymmetrybooks.com';
    const fallbackUrl = 'https://fallback.asymmetrybooks.com';
    const onionUrl = 'http://[onion-address].onion';

    // Check if primary is healthy
    try {
        const response = await fetch(primaryUrl + '/api/health', {
            timeout: 5000
        });

        if (response.ok) {
            // Primary is healthy, pass through
            return fetch(request);
        }
    } catch (error) {
        // Primary is down, redirect to fallback
        console.log('Primary down, redirecting to fallback');
    }

    // Redirect to fallback
    const url = new URL(request.url);
    url.hostname = new URL(fallbackUrl).hostname;

    return Response.redirect(url.toString(), 307);
}
```

### User Experience During Failover

**Banner Message:**
```html
<!-- Shown automatically when in fallback mode -->
<div class="fallback-notice">
    <strong>⚠️ Using Backup Payment System</strong>
    <p>We're currently accepting crypto payments only (Bitcoin/Lightning/Monero). All books remain available. <a href="/about-fallback">Learn more</a></p>
</div>
```

**Checkout Flow:**
```javascript
// marketplace/frontend/js/adaptive-checkout.js

async function initiateCheckout(bookId) {
    // Check which mode we're in
    const config = await fetch('/api/config').then(r => r.json());

    if (config.paymentMode === 'primary') {
        // Standard Stripe checkout
        window.location.href = `/checkout?book=${bookId}`;
    } else if (config.paymentMode === 'crypto') {
        // Crypto checkout with instructions
        window.location.href = `/crypto-checkout?book=${bookId}`;
    } else if (config.paymentMode === 'federated') {
        // Redirect to healthy network node
        window.location.href = `${config.healthyNode}/checkout?book=${bookId}`;
    }
}
```

---

## 🌐 Federation Network (Open Source + Distributed Nodes)

### Concept: Anyone Can Run a Node

**Why Federation?**
1. **True censorship resistance** - Can't shut down a network
2. **Network effects** - More nodes = more traffic for everyone
3. **Revenue sharing** - Nodes can earn from referrals
4. **Community ownership** - Open source, forkable, ownable
5. **Resilience** - If one node fails, others continue

### Node Types

**Type 1: Full Node (Complete Marketplace)**
```
- Full catalog of books
- Own payment processing
- Own hosting
- Participates in network discovery
- Earns 100% of sales
```

**Type 2: Affiliate Node (Referral Only)**
```
- Lists catalog from network
- Redirects to other nodes for checkout
- Earns referral percentage (10-20%)
- Minimal hosting requirements
```

**Type 3: Mirror Node (Backup Only)**
```
- Mirrors content from primary nodes
- Activates if primary nodes fail
- IPFS-backed for permanence
- No active sales, just preservation
```

---

## 🔧 Network Protocol

### Node Registration

**network-registry.json (Decentralized)**
```json
{
  "version": "2.0",
  "protocol": "AAN/1.0", // Asymmetry Archive Network
  "network": {
    "name": "Asymmetry Archive Network",
    "description": "Decentralized network for uncensored information",
    "features": [
      "federated-discovery",
      "cross-node-checkout",
      "revenue-sharing",
      "automatic-failover",
      "ipfs-backed"
    ]
  },
  "nodes": [
    {
      "id": "node-primary",
      "name": "Asymmetry Books Main",
      "url": "https://asymmetrybooks.com",
      "fallbackUrl": "https://backup.asymmetrybooks.com",
      "onionUrl": "http://[onion].onion",
      "api": "https://asymmetrybooks.com/api",
      "type": "full",
      "status": "active",
      "paymentMethods": ["stripe", "bitcoin", "lightning", "monero"],
      "catalog": "full",
      "revenueShare": {
        "accepts": true,
        "percentage": 15
      },
      "verified": true,
      "operator": "Original Team",
      "joined": "2025-01-01"
    },
    {
      "id": "node-community-01",
      "name": "Free Knowledge Archive",
      "url": "https://freeknowledge.io",
      "type": "full",
      "status": "active",
      "paymentMethods": ["bitcoin", "monero"],
      "catalog": "full",
      "revenueShare": {
        "accepts": true,
        "percentage": 20
      },
      "verified": true,
      "operator": "Community Run",
      "location": "Iceland",
      "joined": "2025-02-15"
    },
    {
      "id": "node-affiliate-02",
      "name": "Truth Seekers Portal",
      "url": "https://truthseekers.net",
      "type": "affiliate",
      "status": "active",
      "paymentMethods": ["referral"],
      "catalog": "curated",
      "revenueShare": {
        "accepts": true,
        "percentage": 15
      },
      "verified": false,
      "operator": "Independent",
      "joined": "2025-03-01"
    }
  ]
}
```

### Cross-Node Discovery API

**Endpoint: GET /api/network/search**
```javascript
// marketplace/backend/routes/networkRoutes.js

router.get('/network/search', async (req, res) => {
    const { query, category } = req.query;

    // Search local catalog
    const localResults = await searchLocalCatalog(query, category);

    // Search federated nodes
    const networkResults = await searchFederatedNodes(query, category);

    // Combine and rank
    const allResults = {
        local: localResults,
        network: networkResults,
        totalResults: localResults.length + networkResults.length
    };

    res.json(allResults);
});

async function searchFederatedNodes(query, category) {
    const registry = await loadNetworkRegistry();
    const activeNodes = registry.nodes.filter(n => n.status === 'active');

    const searches = activeNodes.map(async node => {
        try {
            const response = await fetch(`${node.api}/catalog/search?q=${query}&category=${category}`, {
                timeout: 5000
            });

            const results = await response.json();

            return results.books.map(book => ({
                ...book,
                source: node.name,
                sourceUrl: node.url,
                sourceId: node.id,
                revenueShare: node.revenueShare
            }));
        } catch (error) {
            console.error(`Node ${node.id} search failed:`, error);
            return [];
        }
    });

    const allResults = await Promise.all(searches);
    return allResults.flat();
}
```

### Revenue Sharing

**When User Buys From Network Node:**
```javascript
// marketplace/backend/routes/networkCheckout.js

router.post('/network/checkout', async (req, res) => {
    const { bookId, sourceNodeId, email } = req.body;

    // Get source node info
    const sourceNode = await getNodeInfo(sourceNodeId);

    if (!sourceNode) {
        return res.status(404).json({ error: 'Source node not found' });
    }

    // Create order on source node
    const order = await createOrderOnNode(sourceNode, {
        bookId,
        email,
        referrer: process.env.NODE_ID,
        revenueShare: sourceNode.revenueShare.percentage
    });

    // Source node processes payment
    // Source node gets (100 - revenueShare)%
    // Referring node gets revenueShare%

    res.json({
        success: true,
        checkoutUrl: order.checkoutUrl,
        revenueShare: sourceNode.revenueShare.percentage
    });
});
```

**Settlement:**
```javascript
// Can be:
// 1. Automatic via Lightning Network (instant micropayments)
// 2. Monthly via Bitcoin on-chain
// 3. Smart contract on Ethereum/Base

async function settleRevenueShare(orderId) {
    const order = await db.get('SELECT * FROM orders WHERE id = ?', orderId);
    const referrer = await getNodeInfo(order.referrer_node_id);

    const shareAmount = order.total * (referrer.revenueShare / 100);

    // Send via Lightning Network
    if (referrer.lightningAddress) {
        await sendLightningPayment(referrer.lightningAddress, shareAmount);
    }

    // Or log for monthly settlement
    await db.run(`
        INSERT INTO revenue_shares (
            order_id, node_id, amount, status, created_at
        ) VALUES (?, ?, ?, 'pending', CURRENT_TIMESTAMP)
    `, [orderId, referrer.id, shareAmount]);
}
```

---

## 📦 Open Source Strategy

### Repository Structure

```
teneo-marketplace/ (open source)
├── marketplace/
│   ├── frontend/        # Static files
│   ├── backend/         # Node.js API
│   ├── docker/          # Deployment configs
│   └── docs/            # Documentation
├── network/
│   ├── registry/        # Network registry tools
│   ├── discovery/       # Node discovery protocol
│   └── federation/      # Revenue sharing logic
├── deployment/
│   ├── one-click/       # Heroku, Railway, Render
│   ├── docker/          # Docker Compose
│   ├── kubernetes/      # K8s configs
│   └── vps/             # VPS setup scripts
└── LICENSE              # MIT or AGPL
```

### One-Click Node Deployment

**Deploy Your Own Node (5 minutes):**

```bash
# Clone repository
git clone https://github.com/Traviseric/teneo-marketplace.git
cd teneo-marketplace

# Configure your node
cp .env.example .env
nano .env
```

**.env Configuration:**
```env
# Node Identity
NODE_ID=my-unique-node-id
NODE_NAME=My Asymmetry Node
NODE_OPERATOR=Your Name
NODE_URL=https://mynodedomain.com

# Payment Methods
ENABLE_STRIPE=true
STRIPE_SECRET_KEY=sk_...
ENABLE_CRYPTO=true
BTC_ADDRESS=bc1q...
LIGHTNING_ADDRESS=lnbc...

# Network Participation
JOIN_NETWORK=true
NETWORK_REGISTRY_URL=https://registry.asymmetrybooks.com
REVENUE_SHARE_PERCENTAGE=15

# Content
CATALOG_MODE=full  # or 'curated' or 'affiliate'
SYNC_CATALOG_FROM=https://asymmetrybooks.com/api/catalog
```

**Deploy:**
```bash
# Option 1: Docker (recommended)
docker-compose up -d

# Option 2: Railway
railway up

# Option 3: Render
render deploy

# Option 4: VPS
./scripts/deploy-vps.sh
```

**Register Node:**
```bash
# Automatically registers with network
npm run register-node

# Or manual
curl -X POST https://registry.asymmetrybooks.com/api/nodes/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Asymmetry Node",
    "url": "https://mynodedomain.com",
    "type": "full",
    "operator": "Your Name",
    "paymentMethods": ["stripe", "bitcoin"],
    "revenueShare": 15
  }'
```

---

## 🎯 User Experience with Federation

### Discovery Flow

**User visits any node:**
```
1. User: "I want books about Federal Reserve"
2. Node: Searches local catalog + network nodes
3. Results show:
   - 3 books on this node
   - 5 books on other network nodes
   - Source node name + revenue share disclosed
4. User: Clicks book from different node
5. Checkout: Redirected to source node OR processed locally with revenue share
6. Download: Received from source node or IPFS
```

### Example UX:

```html
<div class="book-card">
    <img src="/covers/federal-reserve-exposure.jpg">
    <h3>The Federal Reserve: Private Bank Controlling Currency</h3>
    <p class="price">$197</p>

    <div class="source-node">
        <span class="badge">📡 Available on network</span>
        <p>Source: Free Knowledge Archive (Iceland)</p>
        <p class="revenue-note">15% of sale supports this node</p>
    </div>

    <button onclick="buyFromNetwork('book-146', 'node-community-01')">
        Purchase (Bitcoin/Lightning)
    </button>
</div>
```

---

## 🚀 Launch Strategy

### Phase 1: Dual-Mode Single Node (Month 1)
1. Deploy primary mode (Stripe + Vercel)
2. Deploy fallback mode (Crypto + offshore VPS)
3. Implement health monitoring
4. Test automatic failover
5. Load 40 backend books

### Phase 2: Open Source + Documentation (Month 2)
1. Open source the repository
2. Write deployment docs
3. Create one-click deployment options
4. Publish federation protocol
5. Invite community to fork

### Phase 3: Federation Launch (Month 3)
1. Deploy network registry
2. Enable cross-node discovery
3. Implement revenue sharing
4. Onboard first 10 community nodes
5. Test distributed network

### Phase 4: Hydra Mode (Month 4+)
1. 50+ active nodes globally
2. IPFS integration for permanent storage
3. ENS .eth domains
4. Smart contract revenue sharing
5. DAO governance (optional)

---

## 📊 Metrics of Success

### Technical Resilience
- Uptime: 99.9%+ (across network)
- Failover time: < 60 seconds
- Node discovery: < 5 seconds
- IPFS content availability: 100%

### Network Growth
- Active nodes: 50+ (Year 1)
- Geographic distribution: 10+ countries
- Payment methods: 5+ (Stripe, BTC, LN, XMR, ETH)
- Total catalog items: 1000+ books (original + community)

### Censorship Resistance Validation
- ✅ Survived payment processor ban
- ✅ Survived hosting termination
- ✅ Survived domain seizure
- ✅ Continued operation through all attacks

---

## 🎪 Final Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   USER EXPERIENCE                       │
│  Browse → Add to Cart → Checkout → Download            │
└──────────────────┬──────────────────────────────────────┘
                   │
    ┌──────────────┼──────────────┐
    │              │              │
    ▼              ▼              ▼
┌─────────┐  ┌─────────┐  ┌─────────┐
│ Primary │  │Fallback │  │Network  │
│  Mode   │  │  Mode   │  │  Nodes  │
├─────────┤  ├─────────┤  ├─────────┤
│ Stripe  │  │ Crypto  │  │ P2P     │
│ Vercel  │  │ VPS     │  │ Fed     │
│ .com    │  │ .onion  │  │ IPFS    │
└────┬────┘  └────┬────┘  └────┬────┘
     │            │            │
     └────────────┼────────────┘
                  │
         ┌────────▼─────────┐
         │   IPFS Storage   │
         │ Permanent Books  │
         └──────────────────┘
```

**This is how you build something truly uncensorable.**

Want to start implementing this? We can begin with:
1. Setting up dual-mode checkout routing
2. Creating the network registry protocol
3. Building the one-click node deployment
4. Or all of the above

What's the move?
