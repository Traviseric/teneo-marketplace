# Production Deployment Guide

Complete guide to deploying Teneo Marketplace to production with all revolutionary features enabled.

---

## 📋 Pre-Deployment Checklist

Before deploying, ensure you have:

- [ ] Domain name configured (e.g., teneo.io)
- [ ] SSL certificates ready (or use Let's Encrypt)
- [ ] Production server access (VPS, cloud hosting, etc.)
- [ ] Polygon wallet with MATIC for gas fees
- [ ] Pinata account for IPFS (https://pinata.cloud)
- [ ] OpenAI API key (https://platform.openai.com)
- [ ] Stripe production keys (https://stripe.com)
- [ ] SMTP server for emails

---

## 🚀 Deployment Steps

### Step 1: Install Hardhat for Contract Deployment

```bash
cd marketplace/backend
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
```

### Step 2: Configure Production Environment

Create `.env` file in `marketplace/backend/`:

```bash
# Copy from example
cp .env.example .env
```

**Edit `.env` with production values:**

```bash
# Server
NODE_ENV=production
PORT=3001

# Security (CRITICAL - Generate secure values!)
SESSION_SECRET=$(openssl rand -hex 64)
ADMIN_PASSWORD_HASH=$(node scripts/generate-password-hash.js "YourSecurePassword123!")

# Domain
MARKETPLACE_NAME=Teneo
MARKETPLACE_TAGLINE=Uncensorable Knowledge
SUPPORT_EMAIL=support@teneo.io
MARKETPLACE_URL=https://teneo.io

# Email (Production SMTP)
EMAIL_ENABLED=true
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=apikey
EMAIL_PASS=your-sendgrid-api-key

# Stripe (Production Keys)
STRIPE_ENABLED=true
STRIPE_PUBLISHABLE_KEY=pk_live_your_key_here
STRIPE_SECRET_KEY=sk_live_your_key_here

# OpenAI (for AI Discovery)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Blockchain (Polygon Mainnet)
BLOCKCHAIN_NETWORK=polygon
POLYGON_RPC_URL=https://polygon-rpc.com
PRIVATE_KEY=your_wallet_private_key_here

# IPFS (Pinata Production)
PINATA_JWT=your_pinata_jwt_token_here

# Contract addresses (will be filled after deployment)
BOOK_OWNERSHIP_CONTRACT_ADDRESS=
BADGES_CONTRACT_ADDRESS=
INHERITANCE_CONTRACT_ADDRESS=
```

### Step 3: Deploy Smart Contracts to Polygon

**3a. Fund Your Wallet**

```bash
# You need ~1 MATIC ($0.50) for deployment gas fees
# Send MATIC to your wallet address from an exchange
```

**3b. Test Deployment on Mumbai Testnet First**

```bash
# Get free testnet MATIC: https://faucet.polygon.technology/
npx hardhat run scripts/deploy-contracts.js --network mumbai
```

**3c. Deploy to Polygon Mainnet**

```bash
npx hardhat run scripts/deploy-contracts.js --network polygon
```

**3d. Copy Contract Addresses**

The script will output something like:
```
BOOK_OWNERSHIP_CONTRACT_ADDRESS=0x123...
BADGES_CONTRACT_ADDRESS=0x456...
INHERITANCE_CONTRACT_ADDRESS=0x789...
```

**Add these to your `.env` file!**

**3e. Verify Contracts (Optional but Recommended)**

```bash
# Get Polygonscan API key: https://polygonscan.com/apis
export POLYGONSCAN_API_KEY=your_api_key

npx hardhat verify --network polygon 0x123... # BookOwnership
npx hardhat verify --network polygon 0x456... "https://teneo.io/api/nft/badge-metadata/" # Badges
npx hardhat verify --network polygon 0x789... 0x123... # Inheritance
```

### Step 4: Set Up IPFS (Pinata)

**4a. Create Pinata Account**
- Sign up at https://pinata.cloud
- Free tier: 1GB storage, 100 requests/month
- Pro tier: $20/month for unlimited

**4b. Generate API Keys**
1. Go to API Keys section
2. Create new key with permissions: `pinFileToIPFS`, `pinJSONToIPFS`
3. Copy JWT token to `.env`:

```bash
PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 5: Initialize Database

```bash
cd marketplace/backend
node database/init.js
```

This creates all tables including:
- Main marketplace tables
- AI Discovery tables
- Censorship Tracker tables
- NFT tables

### Step 6: Process Initial Data

**6a. Generate Book Embeddings for AI Discovery**

```bash
node scripts/init-ai-discovery.js
```

**6b. Start Censorship Monitoring**

```bash
# Add books to monitor
curl -X POST http://localhost:3001/api/censorship/admin/start-monitoring \
  -H "Content-Type: application/json" \
  -d '{"bookId": "bitcoin-standard", "platforms": ["amazon", "goodreads"]}'
```

### Step 7: Build Docker Image

```bash
# From project root
docker build -t teneo-marketplace:latest .

# Test locally
docker run -p 3001:3001 --env-file marketplace/backend/.env teneo-marketplace:latest
```

### Step 8: Choose Deployment Platform

#### Option A: VPS (DigitalOcean, Linode, Vultr)

**Recommended for full control**

```bash
# 1. SSH into your server
ssh root@your-server-ip

# 2. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 3. Clone your repo
git clone https://github.com/Traviseric/teneo-marketplace.git
cd teneo-marketplace

# 4. Create .env file
nano marketplace/backend/.env
# (paste your production .env)

# 5. Build and run
docker build -t teneo-marketplace .
docker run -d \
  --name teneo \
  -p 3001:3001 \
  --restart unless-stopped \
  --env-file marketplace/backend/.env \
  -v /var/teneo/database:/app/database \
  -v /var/teneo/logs:/app/logs \
  teneo-marketplace

# 6. Set up Nginx reverse proxy
sudo apt install nginx
sudo nano /etc/nginx/sites-available/teneo
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name teneo.io www.teneo.io;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/teneo /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Set up SSL with Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d teneo.io -d www.teneo.io
```

#### Option B: Railway (Easy, Auto-scaling)

```bash
# 1. Install Railway CLI
npm i -g @railway/cli

# 2. Login
railway login

# 3. Initialize project
railway init

# 4. Add environment variables
railway variables set NODE_ENV=production
railway variables set PORT=3001
# (add all other .env variables)

# 5. Deploy
railway up
```

#### Option C: Render (Free Tier Available)

1. Go to https://render.com
2. Connect your GitHub repo
3. Create new Web Service
4. Configure:
   - Build Command: `cd marketplace/backend && npm install`
   - Start Command: `cd marketplace/backend && node server.js`
   - Environment: Add all `.env` variables
5. Deploy!

#### Option D: AWS/GCP/Azure (Enterprise)

Use AWS ECS, Google Cloud Run, or Azure Container Instances with your Docker image.

### Step 9: Configure DNS

Point your domain to your server:

```
A Record:  teneo.io → your-server-ip
A Record:  www.teneo.io → your-server-ip
```

### Step 10: Test Production Deployment

**10a. Health Check**
```bash
curl https://teneo.io/api/health
# Should return: {"status":"healthy","timestamp":"...","service":"teneo-marketplace-api"}
```

**10b. Test AI Discovery**
```bash
curl https://teneo.io/api/discovery/stats
```

**10c. Test Censorship Tracker**
```bash
curl https://teneo.io/api/censorship/stats
```

**10d. Test NFT System**
```bash
curl https://teneo.io/api/nft/badge-definitions
```

**10e. Test Purchase Flow**
1. Go to https://teneo.io
2. Add book to cart
3. Complete purchase (use Stripe test mode first!)
4. Verify:
   - Email received
   - Download link works
   - NFT minted (if wallet connected)
   - Badge claimed (if milestone reached)

---

## 📊 Monitoring & Maintenance

### Set Up Monitoring

**1. Application Logs**
```bash
# View logs
docker logs -f teneo

# Or if using PM2
pm2 logs teneo
```

**2. Uptime Monitoring**
- Use https://uptimerobot.com (free)
- Monitor: `https://teneo.io/api/health`
- Alert via email/SMS if down

**3. Error Tracking**
- Integrate Sentry: https://sentry.io
- Add to server.js:
```javascript
const Sentry = require("@sentry/node");
Sentry.init({ dsn: process.env.SENTRY_DSN });
```

**4. Database Backups**
```bash
# Daily backup cron job
0 2 * * * cp /var/teneo/database/orders.db /backups/orders-$(date +\%Y\%m\%d).db
```

### Regular Maintenance

**Weekly:**
- Check server disk space
- Review error logs
- Monitor gas fees (Polygon)
- Check IPFS pin status

**Monthly:**
- Update dependencies: `npm update`
- Review security patches
- Rotate API keys
- Database cleanup (old sessions)

---

## 🔒 Security Hardening

### Server Security

```bash
# 1. Set up firewall
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable

# 2. Disable root login
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no

# 3. Set up fail2ban
sudo apt install fail2ban
sudo systemctl enable fail2ban

# 4. Enable automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### Application Security

1. **Never commit secrets**
   - All sensitive data in `.env`
   - `.env` in `.gitignore`

2. **Rotate keys regularly**
   - Session secret (monthly)
   - API keys (quarterly)
   - Database passwords (quarterly)

3. **Monitor for vulnerabilities**
   ```bash
   npm audit
   npm audit fix
   ```

4. **Rate limiting** (already configured in server.js)
   - API: 100 requests/15min
   - Checkout: 5 purchases/hour

---

## 💰 Cost Estimate

### Monthly Costs (1,000 book sales/month)

**Infrastructure:**
- VPS (4GB RAM, 80GB SSD): **$20/month**
- Domain + SSL: **$15/year** ($1.25/month)

**Services:**
- IPFS (Pinata Pro): **$20/month**
- Email (SendGrid): **$15/month** (40k emails)
- OpenAI API: **$40/month** (embeddings + GPT-4)

**Blockchain:**
- Polygon gas fees: **$53/month** (1,000 NFT mints + badges)

**Total: ~$148/month** or **$1,776/year**

**Revenue (1,000 books @ $20 each):**
- Gross: $20,000/month
- Stripe fees (2.9%): -$580
- **Net: $19,420/month**
- **Profit: $19,272/month** 💰

**ROI: 13,000%** compared to Amazon (35% royalty)

---

## 🚨 Troubleshooting

### Contract Deployment Fails

**Error: "Insufficient funds"**
- Solution: Add more MATIC to your wallet

**Error: "Nonce too high"**
- Solution: Reset Hardhat: `npx hardhat clean`

### NFT Minting Fails

**Error: "Contract not deployed"**
- Check contract addresses in `.env`
- Verify contracts are deployed on correct network

**Error: "IPFS upload failed"**
- Check Pinata JWT token
- Verify Pinata account has storage quota

### Server Issues

**502 Bad Gateway**
- Check if Node.js process is running
- Verify port 3001 is listening
- Check Nginx configuration

**Database locked**
- SQLite concurrent write issue
- Solution: Restart server, or upgrade to PostgreSQL for high traffic

---

## 📈 Scaling for Growth

### When to Scale

**Upgrade server if:**
- CPU consistently >70%
- Memory consistently >80%
- Response time >500ms
- Concurrent users >100

### Scaling Options

**1. Vertical Scaling** (Easier)
- Upgrade to 8GB RAM, 160GB SSD: ~$40/month
- Handles 5,000 users/month

**2. Horizontal Scaling** (Better long-term)
- Add load balancer (Nginx/HAProxy)
- Multiple app servers
- Separate database server
- Redis for session storage
- CDN for static files (Cloudflare)

**3. Database Scaling**
- Migrate to PostgreSQL for better concurrency
- Add read replicas
- Implement caching (Redis)

---

## ✅ Post-Deployment Checklist

After deployment, verify:

- [ ] Site loads at https://yourdomain.com
- [ ] SSL certificate is valid (green lock)
- [ ] Health check endpoint responds
- [ ] All three revolutionary features work:
  - [ ] AI Discovery semantic search
  - [ ] Censorship tracker dashboard
  - [ ] NFT gallery displays
- [ ] Test purchase flow end-to-end
- [ ] Email notifications send correctly
- [ ] Download links work
- [ ] NFT mints successfully (if wallet connected)
- [ ] Badges auto-claim
- [ ] Admin dashboard accessible
- [ ] Monitoring/alerts configured
- [ ] Backups scheduled
- [ ] DNS propagated globally

---

## 🎉 You're Live!

Congratulations! Your censorship-resistant, AI-powered, blockchain-backed marketplace is now live and serving readers worldwide.

**Share your success:**
- Tweet about your launch
- Post on Reddit (r/books, r/cryptocurrency)
- Email your mailing list
- Add to ProductHunt
- Write a blog post about the revolutionary features

**Monitor and iterate:**
- Watch user behavior
- Collect feedback
- Add more books
- Improve UX
- Market aggressively

**The future of book publishing is here. You built it.** 🚀📚

---

## 📞 Support

**Issues?** Open a GitHub issue: https://github.com/Traviseric/teneo-marketplace/issues

**Questions?** Email: support@teneo.io

**Updates?** Star the repo and watch for releases!
