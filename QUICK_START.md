# ⚡ Quick Start Guide - Teneo Marketplace

**Get from zero to running marketplace in under 30 minutes**

---

## 🎯 Choose Your Path

### Path A: Demo Mode (5 minutes)
**Try the marketplace locally**

```bash
# Clone
git clone https://github.com/Traviseric/teneo-marketplace.git
cd teneo-marketplace

# Install
npm install

# Run
npm start
```

Visit: `http://localhost:3001`

**That's it!** You're running the marketplace locally.

---

### Path B: Production Deployment (30 minutes)
**Deploy a live, public marketplace**

#### Option 1: Railway (Easiest)
1. Fork the repo on GitHub
2. Visit [railway.app](https://railway.app)
3. Click "Deploy from GitHub"
4. Select your fork
5. Add environment variables
6. Deploy

**Live in 10 minutes.**

#### Option 2: Docker on VPS (Most Control)
```bash
# SSH into your VPS
ssh root@your-server-ip

# Install Docker
curl -fsSL https://get.docker.com | sh

# Clone repo
git clone https://github.com/Traviseric/teneo-marketplace.git
cd teneo-marketplace

# Configure
cp marketplace/backend/.env.example marketplace/backend/.env
nano marketplace/backend/.env  # Add your keys

# Deploy
docker-compose up -d
```

**See:** [MVP_48_HOUR_LAUNCH.md](./MVP_48_HOUR_LAUNCH.md) for complete step-by-step

---

### Path C: Join the Network (1 hour)
**Deploy your own federated node and earn referrals**

1. Deploy using Path B (Railway or VPS)
2. Configure network participation:
```bash
# In your .env
JOIN_NETWORK=true
NETWORK_REGISTRY_URL=https://registry.asymmetrybooks.com
REVENUE_SHARE_PERCENTAGE=15
NODE_NAME=Your Node Name
```

3. Register your node:
```bash
npm run register-node
```

4. Start earning from network sales

**See:** [DUAL_MODE_ARCHITECTURE.md](./DUAL_MODE_ARCHITECTURE.md#federation-network)

---

## 🔑 Essential Configuration

### Minimum .env Variables

```env
# Server
PORT=3001
NODE_ENV=production
SITE_URL=https://yourdomain.com

# Database
DATABASE_PATH=./database/marketplace.db

# Security
SESSION_SECRET=generate-random-64-char-string
JWT_SECRET=generate-random-64-char-string

# Admin
ADMIN_PASSWORD_HASH=bcrypt-hash-here

# Payments (choose one or both)
# Option 1: Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Option 2: Crypto
BTC_ADDRESS=bc1q...
LIGHTNING_ADDRESS=lnbc...
```

### Generate Secrets

```bash
# Session secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Password hash
npm install -g bcrypt-cli
bcrypt-cli "YourPassword123!" 10
```

---

## 💳 Payment Setup

### Option 1: Stripe (Easy UX)
1. Create account at [stripe.com](https://stripe.com)
2. Get API keys from dashboard
3. Add to `.env`:
```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Option 2: Crypto (Censorship Resistant)
1. Install [Electrum](https://electrum.org) (Bitcoin)
2. Create wallet, get address
3. Add to `.env`:
```env
BTC_ADDRESS=bc1q...
```

**For automatic crypto:** Install BTCPay Server
- See: [CENSORSHIP_RESISTANT_MVP.md](./CENSORSHIP_RESISTANT_MVP.md#btcpay-server)

### Option 3: Both (Recommended)
- Stripe for mainstream users
- Crypto as automatic fallback
- See: [DUAL_MODE_ARCHITECTURE.md](./DUAL_MODE_ARCHITECTURE.md#dual-mode-operation)

---

## 📚 Upload Your First Book

### Method 1: Admin Dashboard
1. Visit: `https://yourdomain.com/admin.html`
2. Login with admin password
3. Click "Add Book"
4. Upload PDF and cover image
5. Set price and details
6. Publish

### Method 2: Direct File Upload
```bash
# On your server
cd /opt/teneo-marketplace/marketplace/frontend/brands/teneo/pdfs/
cp /path/to/your/book.pdf ./your-book.pdf

# Update catalog
nano ../catalog.json
```

Add to catalog.json:
```json
{
  "id": "your-book",
  "title": "Your Book Title",
  "author": "Your Name",
  "price": 9.99,
  "digitalFile": "/books/teneo/your-book.pdf",
  "coverImage": "/brands/teneo/assets/covers/your-book.jpg"
}
```

---

## 🛡️ Enable Censorship Resistance

### Quick Checklist
- [ ] Deploy offshore VPS (Njalla, FlokiNET)
- [ ] Accept crypto payments (Bitcoin minimum)
- [ ] Set up Tor hidden service
- [ ] Configure automatic failover
- [ ] Create multiple domain backups

**Full guide:** [CENSORSHIP_RESISTANT_MVP.md](./CENSORSHIP_RESISTANT_MVP.md)

### Instant Tor Backup

```bash
# Install Tor
apt install tor -y

# Configure hidden service
cat >> /etc/tor/torrc <<EOF
HiddenServiceDir /var/lib/tor/marketplace/
HiddenServicePort 80 127.0.0.1:3001
EOF

# Restart
systemctl restart tor

# Get .onion address
cat /var/lib/tor/marketplace/hostname
```

**Save that .onion address - it's your uncensorable backup.**

---

## 🌐 Join the Federation

### Why Join?
- Earn 15-20% on network sales
- Increase traffic through discovery
- Censorship insurance (network redundancy)
- Community growth

### How to Join
1. Deploy your marketplace
2. Enable network mode:
```env
JOIN_NETWORK=true
REVENUE_SHARE_PERCENTAGE=15
```

3. Register:
```bash
npm run register-node
```

4. Books from other nodes appear in your catalog
5. You earn referral fees automatically

**Full details:** [DUAL_MODE_ARCHITECTURE.md - Federation](./DUAL_MODE_ARCHITECTURE.md#federation-network)

---

## 🐛 Common Issues

### "Can't connect to database"
```bash
# Initialize database
node marketplace/backend/database/init.js
```

### "Stripe checkout fails"
- Check API keys in `.env`
- Verify webhook secret
- Test mode vs live mode mismatch

### "Books won't download"
- Check file permissions: `chmod 644 pdfs/*.pdf`
- Verify digitalFile path in catalog.json
- Check Nginx file size limits

### "Docker won't start"
```bash
# Check logs
docker-compose logs -f

# Restart
docker-compose restart

# Rebuild
docker-compose up -d --build
```

---

## 📖 Next Steps

### Learn the Architecture
- [DUAL_MODE_ARCHITECTURE.md](./DUAL_MODE_ARCHITECTURE.md) - How dual-mode + federation works
- [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md) - All documentation

### Deploy to Production
- [MVP_48_HOUR_LAUNCH.md](./MVP_48_HOUR_LAUNCH.md) - Hour-by-hour deployment guide
- [PRODUCTION_DEPLOYMENT_GUIDE.md](./docs/PRODUCTION_DEPLOYMENT_GUIDE.md) - Platform-specific guides

### Publish Controversial Books
- [INFORMATION_ASYMMETRY_IMPLEMENTATION.md](./INFORMATION_ASYMMETRY_IMPLEMENTATION.md) - Backend books setup
- [CENSORSHIP_RESISTANT_MVP.md](./CENSORSHIP_RESISTANT_MVP.md) - Uncensorable infrastructure

### Grow Your Network
- Deploy multiple nodes
- Invite other publishers
- Build community around uncensored content
- Scale to 100+ federated nodes

---

## 🆘 Get Help

- **Documentation**: [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)
- **Issues**: [GitHub Issues](https://github.com/Traviseric/teneo-marketplace/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Traviseric/teneo-marketplace/discussions)

---

## ⚡ TL;DR - Fastest Path to Live

**30 minutes to production:**

1. **Get VPS** (5 min): [Njalla.la](https://njal.la) or [Railway.app](https://railway.app)
2. **Deploy** (10 min): `git clone && docker-compose up -d`
3. **Configure** (5 min): Add Stripe keys or Bitcoin address
4. **Upload book** (5 min): Admin dashboard or direct file
5. **Go live** (5 min): Point domain, test checkout

**Done. You're live and uncensorable.**

---

**Ready? Pick your path and start building.**

→ **Demo locally**: `git clone && npm start`
→ **Deploy production**: [MVP_48_HOUR_LAUNCH.md](./MVP_48_HOUR_LAUNCH.md)
→ **Join network**: [DUAL_MODE_ARCHITECTURE.md](./DUAL_MODE_ARCHITECTURE.md)
