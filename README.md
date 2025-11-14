# 📚 Teneo Marketplace - Censorship-Resistant Book Network

**The first dual-mode, federated marketplace designed to be uncensorable. Operates with standard payments (Stripe) for ease of use, automatically falls back to crypto + offshore infrastructure when attacked, and enables anyone to deploy network nodes for true distributed resilience.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![SQLite](https://img.shields.io/badge/Database-SQLite-blue.svg)](https://sqlite.org/)
[![Network](https://img.shields.io/badge/Network-Federated-blueviolet.svg)](./DUAL_MODE_ARCHITECTURE.md)
[![Payments](https://img.shields.io/badge/Payments-Stripe%20%7C%20Crypto-success.svg)](./INFORMATION_ASYMMETRY_IMPLEMENTATION.md)

---

## ⚡ **What Makes This Different**

### 🔄 Dual-Mode Operation
- **PRIMARY MODE**: Stripe checkout, mainstream hosting, easy UX
- **FALLBACK MODE**: Crypto payments, offshore VPS, Tor backup
- **AUTOMATIC FAILOVER**: Switches modes when primary is taken down

### 🌐 Federated Network
- **OPEN SOURCE**: Anyone can deploy their own marketplace node
- **CROSS-NODE DISCOVERY**: Find books across the entire network
- **REVENUE SHARING**: Nodes earn 10-20% referral fees
- **DISTRIBUTED**: Can't shut down a network

### 🛡️ Censorship Resistant
- **Offshore Hosting**: Iceland, Romania, Netherlands (DMCA-resistant)
- **Crypto Payments**: Bitcoin, Lightning, Monero (no payment processor)
- **Tor Hidden Service**: .onion backup (survives domain seizure)
- **IPFS Storage**: Permanent, distributed content hosting

**→ Read the complete architecture: [DUAL_MODE_ARCHITECTURE.md](./DUAL_MODE_ARCHITECTURE.md)**

---

## 📖 **Documentation**

**→ START HERE: [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)** - Complete documentation catalog

### Quick Links
- **[Dual-Mode Architecture](./DUAL_MODE_ARCHITECTURE.md)** - How the system stays online under attack
- **[48-Hour Launch Guide](./MVP_48_HOUR_LAUNCH.md)** - Deploy your own node this weekend
- **[Censorship-Resistant MVP](./CENSORSHIP_RESISTANT_MVP.md)** - Infrastructure that can't be taken down
- **[Information Asymmetry Brand](./INFORMATION_ASYMMETRY_IMPLEMENTATION.md)** - Publishing books Amazon won't allow

---

## 🎯 **Use Cases**

### For Publishers
- **Amazon-Safe Books**: Track performance, analytics, community
- **Censored Content**: Publish what Amazon won't (institutional crime exposure, systemic critiques)
- **Crypto Payments**: Accept Bitcoin/Monero when Stripe bans you
- **Multiple Channels**: Amazon + backend marketplace simultaneously

### For Network Operators
- **Deploy Your Own Node**: One-click deployment, earn referral fees
- **Join Federation**: Cross-promote books, share revenue (10-20%)
- **Build Community**: Your brand, your audience, network benefits
- **Censorship Insurance**: If your node goes down, network continues

### For Readers
- **Uncensored Access**: Find books mainstream platforms ban
- **Network Discovery**: Browse books across all federated nodes
- **Multiple Payment Options**: Card, Bitcoin, Lightning, Monero
- **Permanent Access**: IPFS ensures books never disappear

---

## 🎯 **Purpose**

The Teneo Marketplace is an open-source platform designed to:

- **Democratize Publishing**: Bypass traditional gatekeepers
- **Enable Censorship Resistance**: Automatic failover to offshore + crypto
- **Build Decentralized Networks**: Federated nodes with revenue sharing
- **Publish Dangerous Knowledge**: Books that expose institutional crime
- **Track Publisher Success**: Analytics, leaderboards, community growth

Perfect for controversial content, independent publishers, and anyone who needs infrastructure that can't be shut down.

---

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+
- NPM or Yarn
- SQLite (included)

### **Installation**
```bash
# Clone the repository
git clone https://github.com/your-org/teneo-marketplace.git
cd teneo-marketplace

# Install backend dependencies
cd marketplace/backend
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start the development server
npm run dev
```

The API will be available at `http://localhost:3001/api`

### **Sample Data**
```bash
# Load 30 sample books for testing
node scripts/create-sample-data.js

# Clear sample data
node scripts/create-sample-data.js clear
```

---

## 📊 **API Endpoints**

### **Published Books**
```http
GET /api/published/books
```
**Query Parameters:**
- `sort` - `recent` | `best_bsr` | `most_reviews` | `biggest_improvement` | `trending_up`
- `time` - `all` | `today` | `week` | `month`
- `genre` - `all` | specific genre name
- `publisher` - `all` | specific publisher name
- `page` - pagination page (default: 1)
- `limit` - items per page (default: 20)

### **Community Statistics**
```http
GET /api/published/stats
```
Returns overall community metrics, recent activity, and milestone progress.

### **Publisher Leaderboards**
```http
GET /api/published/leaderboards
```
Returns top publishers, rising stars, and best-selling authors.

### **Complete API Documentation**
See [API-DOCUMENTATION.md](./marketplace/backend/API-DOCUMENTATION.md) for detailed specifications.

---

## 🏗️ **Architecture**

### **Backend Stack**
- **Runtime**: Node.js with Express.js
- **Database**: SQLite with comprehensive schema
- **Authentication**: Pluggable authentication system
- **APIs**: RESTful JSON APIs with consistent response format

### **Key Features**
- **📈 Trend Tracking**: Historical BSR and rating analysis
- **🏆 Achievement System**: 7-tier badge system for milestones
- **📊 Analytics**: Publisher performance metrics and growth tracking
- **🔍 Advanced Filtering**: Sort and filter by multiple criteria
- **📱 Mobile-Ready**: Responsive design and mobile-optimized APIs

### **Database Schema**
```
published_books          - Main book records
book_ranking_history     - Historical performance data
book_amazon_data         - Enhanced Amazon metadata
publisher_stats          - Publisher metrics and achievements
publisher_milestones     - Badge and reward tracking
publication_milestones   - Community goal tracking
```

---

## 🎨 **Frontend Integration**

The marketplace includes a complete frontend interface:

```bash
# Serve the frontend
cd marketplace/frontend
# Open brands/teneo/marketplace-standalone.html in your browser
```

### **Multi-Brand Support**
The platform supports multiple brands/organizations:
- Each brand has its own configuration and styling
- Shared marketplace infrastructure
- Customizable themes and branding

---

## 🔧 **Configuration**

### **Environment Variables**
```bash
# Database
DATABASE_PATH=./data/marketplace.db

# Server
PORT=3001
NODE_ENV=development

# Optional integrations
STRIPE_SECRET_KEY=sk_test_...  # For payments
EMAIL_USER=your-email@domain.com  # For notifications
ADMIN_PASSWORD_HASH=...  # For admin access
```

### **CORS Configuration**
Update `marketplace/backend/server.js` to allow your domains:
```javascript
app.use(cors({
  origin: [
    'https://your-domain.com',
    'http://localhost:3000'
  ],
  credentials: true
}));
```

---

## 🎯 **Badge System**

The platform includes a comprehensive achievement system:

| Books Published | Badge | Reward |
|----------------|-------|---------|
| 5 books | 📘 Bronze Book | 1 free generation |
| 10 books | 📚 Silver Stack | 2 free generations |
| 25 books | 🏆 Gold Trophy | 5 free generations |
| 50 books | 💎 Diamond | 10 free generations |
| 100 books | 👑 Crown | 20 free generations |
| 250 books | 🚀 Rocket | 50 free generations |
| 500 books | 🌟 Star | 100 free generations |

---

## 🧪 **Testing**

### **API Testing**
```bash
# Health check
curl "http://localhost:3001/api/health"

# Get community stats
curl "http://localhost:3001/api/published/stats"

# Get books with filtering
curl "http://localhost:3001/api/published/books?sort=best_bsr&limit=5"

# Get publisher leaderboards
curl "http://localhost:3001/api/published/leaderboards"
```

### **Authentic Data Approach**
**🎯 Quality Over Fake Quantity**: This marketplace prioritizes authentic data over fabricated success stories.

**Real Data Only**:
- Only genuine Teneo-generated books are featured
- Real Amazon ASINs with actual performance metrics
- Authentic publisher profiles and achievements
- No fake sample data or misleading representations

**Setup**:
```bash
# Initialize with authentic data
cd marketplace/backend/scripts
node create-real-data.js
```

**Empty State Design**: When no books are submitted, the marketplace shows inspiring empty states encouraging real user participation rather than fake data.

---

## 🤝 **Contributing**

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### **Development Setup**
```bash
# Install dependencies
npm install

# Start development server with auto-restart
npm run dev

# Run with sample data
node scripts/create-sample-data.js
npm run dev
```

### **Pull Request Process**
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

## 📜 **License**

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## 🌟 **Use Cases**

### **For Publishers**
- Track your book performance across Amazon
- See ranking trends and improvements
- Earn badges and achievements for milestones
- Connect with other publishers in your niche

### **For Communities**
- Build publisher networks and track collective progress
- Provide value to members through analytics and insights
- Create competition and engagement through leaderboards
- Support member growth with data-driven feedback

### **For Platforms**
- Add publisher tracking to your existing platform
- White-label the marketplace for your brand
- Integrate with your authentication and payment systems
- Scale to support thousands of publishers and books

---

## 🚀 **Roadmap**

### **Phase 1: Dual-Mode Foundation** ✅
- ✅ Primary mode (Stripe + standard hosting)
- ✅ Fallback mode (crypto + offshore VPS)
- ✅ Automatic health monitoring
- ✅ Failover system architecture

### **Phase 2: Federation Network** 🚧 (Current)
- 🚧 Open source marketplace code
- 🚧 Network registry protocol
- 🚧 Cross-node discovery
- 🚧 Revenue sharing implementation
- 🚧 One-click node deployment

### **Phase 3: Distributed Infrastructure** 🔮
- IPFS content integration
- ENS .eth domains
- Smart contract revenue sharing
- DAO governance (optional)
- 100+ active network nodes

### **Phase 4: Content Expansion** 🔮
- Information Asymmetry brand (40 books)
- Community content submissions
- Multi-language support
- Video/audio content
- Decentralized comments/reviews

## 🌐 **Deploy Your Own Node**

### Why Run a Node?

**Earn Revenue:**
- 15-20% referral fees on network sales
- 100% of your own book sales
- Passive income from network discovery

**Build Community:**
- Your brand, your curation
- Your audience, your rules
- Network benefits without network overhead

**Censorship Insurance:**
- If your node goes down, network continues
- If primary node is attacked, yours stays up
- True distributed resilience

### Quick Deploy (5 minutes)

```bash
# Clone repository
git clone https://github.com/Traviseric/teneo-marketplace.git
cd teneo-marketplace

# Configure your node
cp .env.example .env
nano .env  # Set NODE_ID, payment keys, etc.

# Deploy with Docker
docker-compose up -d

# Register with network
npm run register-node
```

**Full guide:** [DUAL_MODE_ARCHITECTURE.md - Deploy Your Own Node](./DUAL_MODE_ARCHITECTURE.md#one-click-node-deployment)

### Deployment Options

- **Docker**: One command, works everywhere
- **Railway**: One-click deploy from GitHub
- **Render**: Free tier available
- **VPS**: Full control, offshore options
- **Kubernetes**: Enterprise scale

**See:** [MVP_48_HOUR_LAUNCH.md](./MVP_48_HOUR_LAUNCH.md) for step-by-step deployment

---

## 📞 **Support**

- **Documentation**: [API-DOCUMENTATION.md](./marketplace/backend/API-DOCUMENTATION.md)
- **Issues**: [GitHub Issues](https://github.com/your-org/teneo-marketplace/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/teneo-marketplace/discussions)

---

## 🙏 **Acknowledgments**

- Built with ❤️ for the AI publishing community
- Inspired by the need for transparent, community-driven publishing platforms
- Designed to empower publishers and challenge monopolistic practices

**"Building the infrastructure for the next generation of publishers"** 🚀

---

*Ready to track your publishing success? Get started with the Teneo Marketplace today!*