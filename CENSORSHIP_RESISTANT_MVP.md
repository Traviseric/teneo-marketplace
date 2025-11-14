# 🔓 Censorship-Resistant Marketplace MVP

## 🎯 Mission
Deploy an uncensorable book marketplace for content Amazon won't publish (information asymmetry, controversial truths, alternative perspectives) - with plausible deniability for teneo.io.

---

## 🚨 Current Vulnerabilities

### Single Points of Failure
- ❌ **Stripe dependency** - Can freeze accounts for "policy violations"
- ❌ **Vercel/Render hosting** - US-based, DMCA compliant, ToS enforcement
- ❌ **Single domain** - DNS takedown, domain seizure risk
- ❌ **GitHub hosting** - Repository can be removed
- ❌ **Email dependency** - SMTP providers can ban accounts

---

## 🛡️ Censorship-Resistant Architecture

### Layer 1: Hosting (CRITICAL)

**Option A: Bulletproof VPS (Recommended for MVP)**
```
Provider: Njalla, FlokiNET, or OrangeWebsite
Location: Iceland, Romania, Netherlands
Features:
  - Crypto payments accepted
  - Ignore DMCA from US companies
  - Anonymous registration
  - Strong privacy laws
  - ~$10-30/month

Setup: Docker on VPS
```

**Option B: Multi-Host Redundancy**
```
Primary: Bulletproof VPS (Iceland)
Mirror 1: Different provider (Romania)
Mirror 2: IPFS gateway
Tor Hidden Service: .onion backup

DNS: Multiple registrars + Cloudflare (free DDoS protection)
```

**Option C: Decentralized (Future)**
```
- IPFS for static content + PDFs
- Ethereum/Arweave for permanent storage
- Gun.js for distributed database
- ENS domains (.eth)
```

### Layer 2: Payments (CRITICAL)

**Stripe Alternatives for Controversial Content:**

1. **Crypto Direct (Best for censorship resistance)**
   - Bitcoin (BTCPay Server - self-hosted)
   - Monero (private transactions)
   - Lightning Network (instant, low fees)
   - No intermediary, fully self-sovereign

2. **Crypto Payment Processors**
   - NOWPayments (crypto only)
   - CoinGate (crypto gateway)
   - BTCPay Server (self-hosted, open source)

3. **Traditional Alternatives**
   - PayPal (risky, can freeze)
   - Gumroad (has banned controversial content)
   - Paddle (EU-based, more tolerant)

**MVP Recommendation:** BTCPay Server + Bitcoin/Lightning
- Self-hosted = no one can freeze funds
- No KYC required for buyers
- Instant settlement
- ~$50 setup, free ongoing

### Layer 3: Domain Strategy

**Separation from teneo.io:**

```
Main Marketplace: asymmetrybooks.com
                 (or .io, .press, .network)

Mirrors:         asymmetrybooks.xyz
                 asymmetrybooks.org
                 [random].onion (Tor)

DNS:             Multiple registrars
                 - Njalla (privacy-focused, crypto)
                 - Namecheap + WhoisGuard
                 - ENS (.eth) as backup

Link from teneo.io/revolution:
                 → Indirect redirect through neutral landing page
                 → "For uncensored content, visit [external link]"
```

### Layer 4: Content Delivery

**PDFs & Digital Products:**
```
Storage Options:
1. VPS local storage (encrypted)
2. IPFS (permanent, distributed)
3. Arweave (pay once, store forever)
4. Storj/Sia (decentralized cloud)

Delivery:
- Tokenized download links
- Torrent magnets as backup
- IPFS gateway URLs
- Direct VPS download
```

### Layer 5: Database

**Current:** SQLite (centralized)
**MVP:** PostgreSQL on VPS (encrypted)
**Future:** Gun.js or OrbitDB (decentralized)

---

## 📋 MVP Implementation Plan

### Phase 1: Foundation (Week 1)
1. ✅ Get bulletproof VPS (Njalla/FlokiNET)
2. ✅ Register domain with privacy protection
3. ✅ Deploy marketplace via Docker
4. ✅ Configure Cloudflare (DDoS protection + caching)
5. ✅ SSL certificates (Let's Encrypt)

### Phase 2: Payments (Week 1-2)
1. ✅ Set up BTCPay Server on same VPS
2. ✅ Replace Stripe checkout with crypto
3. ✅ Bitcoin + Lightning Network
4. ✅ Test full purchase flow
5. ⏳ Optional: Add Monero for privacy

### Phase 3: Separation (Week 2)
1. ✅ Create neutral landing page
2. ✅ Set up indirect linking strategy
3. ✅ Remove all teneo branding from marketplace
4. ✅ Separate admin access
5. ✅ Different email domain for notifications

### Phase 4: Hardening (Week 3)
1. ✅ Set up Tor hidden service
2. ✅ Configure IPFS for PDF storage
3. ✅ Create mirror on second VPS
4. ✅ Implement automated backups
5. ✅ Document recovery procedures

---

## 🔧 Technical Stack Changes

### Replace:
- ❌ Stripe → ✅ BTCPay Server (Bitcoin/Lightning)
- ❌ Vercel → ✅ Self-hosted VPS (Docker)
- ❌ Render → ✅ Same VPS
- ❌ SQLite → ✅ PostgreSQL (encrypted)
- ❌ Email → ✅ Self-hosted mail OR ProtonMail API

### Add:
- ✅ BTCPay Server (payment processing)
- ✅ Tor (hidden service)
- ✅ IPFS (content distribution)
- ✅ Cloudflare (DDoS protection)
- ✅ Automated offsite backups

---

## 💰 MVP Costs

### One-Time:
- Domain registration: $10-15/year
- BTCPay setup: $0 (self-hosted)
- SSL: $0 (Let's Encrypt)
**Total: ~$15**

### Monthly:
- Bulletproof VPS: $15-30/month
- Cloudflare: $0 (free tier)
- Backup storage: $5/month
**Total: ~$20-35/month**

### Optional:
- Second mirror VPS: +$15/month
- Tor bridge: $0
- IPFS pinning: $5-10/month

---

## 🚀 Quick Start Commands

### 1. VPS Setup (Ubuntu 22.04)
```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose -y

# Clone marketplace
git clone https://github.com/Traviseric/teneo-marketplace.git
cd teneo-marketplace

# Configure for production
cp marketplace/backend/.env.example marketplace/backend/.env
nano marketplace/backend/.env
```

### 2. Deploy Marketplace
```bash
# Build and start
docker-compose up -d

# Check logs
docker-compose logs -f
```

### 3. Install BTCPay Server
```bash
# Clone BTCPay
cd /opt
git clone https://github.com/btcpayserver/btcpayserver-docker
cd btcpayserver-docker

# Configure
export BTCPAY_HOST="pay.yourdomain.com"
export NBITCOIN_NETWORK="mainnet"
export BTCPAYGEN_CRYPTO1="btc"
export BTCPAYGEN_LIGHTNING="lnd"

# Deploy
./btcpay-setup.sh -i
```

### 4. Configure Tor (Optional)
```bash
# Install Tor
apt install tor -y

# Configure hidden service
cat >> /etc/tor/torrc <<EOF
HiddenServiceDir /var/lib/tor/marketplace/
HiddenServicePort 80 127.0.0.1:3001
EOF

# Restart Tor
systemctl restart tor

# Get .onion address
cat /var/lib/tor/marketplace/hostname
```

---

## 🎯 Success Criteria

### MVP Launch Checklist:
- [ ] Marketplace accessible via independent domain
- [ ] No direct links/branding to teneo.io
- [ ] Crypto payments working (Bitcoin minimum)
- [ ] Books downloadable via secure tokens
- [ ] Hosted on censorship-resistant VPS
- [ ] Tor hidden service active
- [ ] Automated backups configured
- [ ] Admin access separated from teneo.io
- [ ] Tested with controversial test content
- [ ] Recovery plan documented

### Censorship Resistance Validation:
- [ ] Can survive DMCA takedown (offshore hosting)
- [ ] Can survive payment processor ban (crypto)
- [ ] Can survive DNS takedown (Tor backup)
- [ ] Can survive GitHub removal (private git repo)
- [ ] Can survive single VPS failure (mirrors)

---

## 🔒 Security Considerations

### Operational Security:
1. **Separate everything from teneo.io**
   - Different registrar
   - Different hosting
   - Different payment system
   - Different email domain
   - Different admin credentials

2. **Use VPN/Tor for admin access**
   - Don't access from same IP as teneo.io
   - Consider separate machine for management

3. **Encrypt everything**
   - Database encryption
   - SSL/TLS for all connections
   - Encrypted backups
   - Consider full disk encryption on VPS

4. **Legal protection**
   - Terms of Service (First Amendment protection)
   - DMCA agent registration (if US)
   - Privacy Policy
   - Disclaimer for controversial content

---

## 📚 Information Asymmetry Brand Strategy

### Content Categories:
- Books Amazon won't publish
- Controversial historical perspectives
- Suppressed health information
- Financial system critiques
- Government/corporate transparency
- Alternative science/research

### Positioning:
- "The Library They Don't Want You to Read"
- "Information Without Gatekeepers"
- "Books Too Dangerous for Amazon"
- "Uncensored Knowledge for Free Minds"

### Brand Separation:
```
Teneo.io: Legitimate AI platform, mainstream acceptable
          ↓
teneo.io/revolution: Neutral gateway, "learn more"
          ↓
AsymmetryBooks.com: Fully separated, controversial content
```

This creates plausible deniability while maintaining discoverability.

---

## 🎪 Next Steps

1. **Decision Point:** Choose hosting provider (Njalla recommended)
2. **Register domain:** Pick uncensorable name
3. **Deploy MVP:** Docker + BTCPay on VPS
4. **Test thoroughly:** Full purchase flow with crypto
5. **Create buffer:** Neutral landing page from teneo.io
6. **Load content:** Start with test books
7. **Harden:** Add Tor, IPFS, mirrors
8. **Launch:** Soft launch to test audience

---

**Remember:** Perfect is the enemy of done. Start with bulletproof VPS + BTCPay + Docker. Add decentralization layers iteratively.

The goal is to be **harder to take down than it's worth trying**.
