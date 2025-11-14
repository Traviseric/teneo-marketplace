# ⚡ 48-Hour MVP Launch Plan

## 🎯 Goal
Get a censorship-resistant book marketplace live and linkable from teneo.io/revolution in 48 hours.

---

## 🕐 Hour 0-4: Infrastructure Setup

### Task 1: Get Bulletproof Hosting (1 hour)
**Option A: Njalla (Recommended)**
- Visit: https://njal.la
- Register VPS: €15/month
- Pay with crypto (Bitcoin/Monero)
- Select: Iceland or Sweden location
- Size: 2GB RAM, 50GB SSD minimum

**Option B: FlokiNET**
- Visit: https://flokinet.is
- Similar pricing and features
- Romania or Iceland

**Option C: Quick Alternative - Hostinger**
- Not "bulletproof" but fast to setup
- Accept crypto via CoinGate
- $12/month VPS
- Can migrate later

### Task 2: Register Domain (30 min)
**Privacy-focused registrars:**
- Njalla: https://njal.la (same as hosting, ideal)
- Namecheap + WhoisGuard
- Porkbun (accepts crypto)

**Domain suggestions:**
- asymmetrybooks.com
- truthmarket.io
- uncensoredbooks.press
- forbiddenlib.com
- suppressed.info

### Task 3: Configure Cloudflare (30 min)
1. Create free Cloudflare account
2. Add domain
3. Update nameservers at registrar
4. Enable:
   - DDoS protection (auto)
   - SSL/TLS Full (Strict)
   - Caching (aggressive)
   - Firewall rules (optional)

### Task 4: VPS Initial Setup (2 hours)
```bash
# SSH into your VPS
ssh root@your-vps-ip

# Update system
apt update && apt upgrade -y

# Install essentials
apt install -y git curl wget nano ufw fail2ban

# Configure firewall
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw enable

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose -y

# Create swap (if < 4GB RAM)
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

---

## 🕐 Hour 4-8: Marketplace Deployment

### Task 5: Clone and Configure (1 hour)
```bash
# Clone repository
cd /opt
git clone https://github.com/Traviseric/teneo-marketplace.git
cd teneo-marketplace

# Create environment config
cd marketplace/backend
cp .env.example .env
nano .env
```

**Minimal .env for MVP:**
```env
# Server
PORT=3001
NODE_ENV=production
SITE_URL=https://yourdomain.com

# Database
DATABASE_PATH=./database/marketplace.db

# Security (generate random strings)
SESSION_SECRET=<generate-64-char-random-string>
JWT_SECRET=<generate-64-char-random-string>

# Admin (generate hash later)
ADMIN_PASSWORD_HASH=<will-generate>

# Email (use temp-mail.org for testing, or skip for MVP)
EMAIL_FROM=noreply@yourdomain.com
ENABLE_EMAIL=false

# Payments - SKIP STRIPE FOR NOW
# We'll use manual/crypto approach
```

### Task 6: Generate Admin Password (5 min)
```bash
# Install bcrypt tool
npm install -g bcrypt-cli

# Generate password hash
bcrypt-cli "YourSecurePassword123!" 10

# Copy hash to .env
# ADMIN_PASSWORD_HASH=<paste-hash-here>
```

### Task 7: Deploy with Docker (30 min)
```bash
# Back to project root
cd /opt/teneo-marketplace

# Build and start
docker-compose up -d

# Check logs
docker-compose logs -f

# Verify it's running
curl http://localhost:3001
```

### Task 8: Configure Nginx Reverse Proxy (1 hour)
```bash
# Install Nginx
apt install nginx -y

# Create config
nano /etc/nginx/sites-available/marketplace
```

**Nginx config:**
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to marketplace
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

    # Max upload size for PDFs
    client_max_body_size 100M;
}
```

```bash
# Enable site
ln -s /etc/nginx/sites-available/marketplace /etc/nginx/sites-enabled/

# Install Certbot for SSL
apt install certbot python3-certbot-nginx -y

# Get SSL certificate
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test Nginx config
nginx -t

# Restart Nginx
systemctl restart nginx
```

### Task 9: Verify Everything Works (30 min)
```bash
# Test HTTPS
curl https://yourdomain.com

# Check marketplace loads
# Visit: https://yourdomain.com in browser

# Test admin login
# Visit: https://yourdomain.com/admin.html
```

---

## 🕐 Hour 8-12: Payment System (Manual MVP)

### Quick MVP Approach: Manual Orders

Since BTCPay takes time to sync blockchain, let's start with a hybrid manual approach:

### Task 10: Create "Request Book" System (2 hours)

**Option 1: Typeform/Google Forms**
1. Create form: "Request to Purchase"
2. Fields:
   - Email
   - Book Title
   - Payment Method (Bitcoin/Monero/Manual)
3. Manual fulfillment process
4. Send download link via email

**Option 2: Simple Contact Form in Marketplace**
```javascript
// Add to marketplace/frontend/js/simple-checkout.js
async function manualCheckout(bookId) {
    const email = prompt("Enter your email for purchase instructions:");

    // Send to your backend
    await fetch('/api/manual-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, email })
    });

    alert(`Instructions sent to ${email}. Check your email for Bitcoin payment address.`);
}
```

**Option 3: Direct Bitcoin Address (Simplest)**
- Generate Bitcoin wallet (use Electrum)
- Display static BTC address on checkout
- Manual verification and delivery
- Good for first 10-20 customers

### Task 11: Set Up Crypto Wallet (1 hour)
```bash
# On local machine (NOT VPS)
# Install Electrum
# Download: https://electrum.org

# Create new wallet
# Wallet type: Standard wallet
# Seed: Save 12-word backup phrase SECURELY

# Get receiving address
# Copy Bitcoin address for checkout page

# For Monero (optional)
# Download: https://www.getmonero.org/downloads/
# Create wallet, get XMR address
```

### Task 12: Add Payment Instructions Page (1 hour)
Create: `marketplace/frontend/crypto-checkout.html`

```html
<!DOCTYPE html>
<html>
<head>
    <title>Crypto Payment - Asymmetry Books</title>
</head>
<body>
    <h1>Complete Your Purchase</h1>

    <div class="book-details">
        <h2 id="book-title"></h2>
        <p>Price: <span id="book-price"></span></p>
    </div>

    <div class="payment-options">
        <h3>Pay with Bitcoin</h3>
        <div class="crypto-address">
            <p>Send Bitcoin to:</p>
            <code>bc1q... your-btc-address ...</code>
            <button onclick="copyAddress()">Copy Address</button>
        </div>

        <p class="instructions">
            1. Send exact amount to address above<br>
            2. Email proof of payment to: orders@yourdomain.com<br>
            3. Include your email in payment message<br>
            4. Download link sent within 1-24 hours
        </p>
    </div>

    <div class="payment-options">
        <h3>Pay with Monero (Most Private)</h3>
        <div class="crypto-address">
            <code>4... your-xmr-address ...</code>
        </div>
    </div>
</body>
</html>
```

---

## 🕐 Hour 12-16: Content Setup

### Task 13: Create Information Asymmetry Brand (2 hours)

```bash
# On VPS
cd /opt/teneo-marketplace/marketplace/frontend/brands

# Create new brand
mkdir information_asymmetry
cd information_asymmetry

# Create config
nano config.json
```

**Brand config:**
```json
{
  "brand": "information_asymmetry",
  "name": "Asymmetry Books",
  "tagline": "Information They Don't Want You to Have",
  "description": "Uncensored books on topics Amazon won't publish",
  "theme": {
    "primaryColor": "#000000",
    "accentColor": "#FF0000",
    "backgroundColor": "#FFFFFF",
    "font": "Inter"
  },
  "features": {
    "enableCrypto": true,
    "enableSharing": false,
    "showReviews": false
  },
  "contact": {
    "email": "info@yourdomain.com",
    "telegram": "@yourusername"
  }
}
```

```bash
# Create catalog
nano catalog.json
```

**Sample catalog:**
```json
{
  "brand": "information_asymmetry",
  "books": [
    {
      "id": "test-book-001",
      "title": "Test: Forbidden Knowledge",
      "author": "Anonymous",
      "description": "A test book for the uncensored marketplace",
      "price": 0.001,
      "currency": "BTC",
      "category": "Information Asymmetry",
      "coverImage": "/assets/placeholder-cover.jpg",
      "format": ["digital"],
      "pages": 100,
      "digitalFile": "/books/information_asymmetry/test-book.pdf"
    }
  ]
}
```

### Task 14: Upload Test Content (1 hour)
```bash
# Create directories
mkdir -p pdfs
mkdir -p assets/covers

# Generate test PDF
cd pdfs
nano test-book.pdf
# Or upload a real PDF

# Upload cover image
# Use placeholder or upload real cover
```

### Task 15: Test Full Flow (1 hour)
1. Visit: https://yourdomain.com?brand=information_asymmetry
2. Browse books
3. Test "checkout" (request form)
4. Verify email received
5. Test download link generation
6. Confirm PDF downloads

---

## 🕐 Hour 16-20: Separation & Security

### Task 16: Create Neutral Landing Page (1 hour)

Create: `landing.html` on separate domain or subdomain

```html
<!DOCTYPE html>
<html>
<head>
    <title>Uncensored Library Project</title>
    <meta name="robots" content="noindex">
</head>
<body style="font-family: system-ui; max-width: 600px; margin: 100px auto; padding: 20px;">
    <h1>📚 Access Uncensored Information</h1>

    <div style="background: #f0f0f0; padding: 20px; border-radius: 8px; margin: 30px 0;">
        <p><strong>Warning:</strong> The following site contains books and information
        that may be censored by mainstream platforms like Amazon.</p>

        <p>By proceeding, you acknowledge that:</p>
        <ul>
            <li>Content may challenge mainstream narratives</li>
            <li>Information is provided for educational purposes</li>
            <li>You are responsible for your own due diligence</li>
        </ul>
    </div>

    <div style="text-align: center; margin: 40px 0;">
        <a href="https://yourdomain.com"
           style="background: #000; color: #fff; padding: 15px 30px;
                  text-decoration: none; border-radius: 5px; display: inline-block;">
            I Understand - Proceed to Library
        </a>
    </div>

    <p style="font-size: 12px; color: #666; margin-top: 60px;">
        This project is not affiliated with or endorsed by any mainstream platform.
    </p>
</body>
</html>
```

### Task 17: Configure teneo.io/revolution Redirect (30 min)

On teneo.io, create redirect:
```html
<!-- On teneo.io/revolution page -->
<a href="https://gateway.asymmetrybooks.com" target="_blank" rel="noopener">
    Access Uncensored Library →
</a>
```

This creates a buffer:
```
teneo.io/revolution → gateway.asymmetrybooks.com → asymmetrybooks.com
```

### Task 18: Remove Teneo Branding (1 hour)
```bash
# Edit marketplace files to remove Teneo references
cd /opt/teneo-marketplace/marketplace/frontend

# Update index.html, remove Teneo branding
# Update footer, privacy policy
# Change all mentions to "Asymmetry Books"
```

### Task 19: Set Up Tor Hidden Service (1.5 hours)
```bash
# Install Tor
apt install tor -y

# Configure hidden service
cat >> /etc/tor/torrc <<EOF
HiddenServiceDir /var/lib/tor/asymmetry/
HiddenServicePort 80 127.0.0.1:3001
EOF

# Restart Tor
systemctl restart tor

# Get .onion address
cat /var/lib/tor/asymmetry/hostname
# Save this address - it's your uncensorable backup
```

---

## 🕐 Hour 20-24: Testing & Hardening

### Task 20: Security Hardening (2 hours)
```bash
# Change SSH port
nano /etc/ssh/sshd_config
# Port 2222 (or random high port)
systemctl restart sshd

# Update firewall
ufw delete allow 22
ufw allow 2222

# Install fail2ban
apt install fail2ban -y
systemctl enable fail2ban

# Create backup script
nano /root/backup.sh
```

**Backup script:**
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/root/backups"
mkdir -p $BACKUP_DIR

# Backup database
cp /opt/teneo-marketplace/marketplace/backend/database/marketplace.db \
   $BACKUP_DIR/db_$DATE.db

# Backup PDFs
tar -czf $BACKUP_DIR/pdfs_$DATE.tar.gz \
   /opt/teneo-marketplace/marketplace/frontend/brands/information_asymmetry/pdfs/

# Keep only last 7 days
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
chmod +x /root/backup.sh

# Add to cron (daily at 3 AM)
crontab -e
# Add: 0 3 * * * /root/backup.sh >> /root/backup.log 2>&1
```

### Task 21: Monitor Setup (1 hour)
```bash
# Install monitoring
apt install htop nethogs -y

# Check Docker logs
docker-compose logs -f --tail=100

# Set up simple uptime monitor
# Use: UptimeRobot.com (free, external monitoring)
# Monitor: yourdomain.com and your-onion.onion
```

### Task 22: Final Testing (1 hour)
**Test checklist:**
- [ ] HTTPS working (https://yourdomain.com)
- [ ] Marketplace loads
- [ ] Books display
- [ ] Admin login works
- [ ] Book upload works
- [ ] Download link generation works
- [ ] Tor site accessible (.onion address)
- [ ] Cloudflare DDoS protection active
- [ ] Backups running
- [ ] SSL auto-renewal configured

---

## 🕐 Hour 24-48: Polish & Launch

### Task 23: Content Migration (4 hours)
- Upload your real books
- Create proper cover images
- Write descriptions
- Set Bitcoin prices
- Test all downloads

### Task 24: Payment Flow (2 hours)
- Document crypto payment process
- Create email templates for order confirmation
- Set up order tracking spreadsheet
- Test with friend/colleague

### Task 25: Documentation (2 hours)
```markdown
# Internal Docs
- Admin password
- Bitcoin wallet backup phrase
- SSH access details
- Cloudflare credentials
- Domain registrar info
- VPS provider info
- .onion address
- Recovery procedures
```

### Task 26: Soft Launch (remaining time)
1. Test with small audience
2. Share .onion link on privacy-focused forums
3. Monitor for issues
4. Iterate based on feedback
5. Gradually increase visibility

---

## 🎯 Success Metrics

### MVP is Live When:
- [x] Accessible via HTTPS
- [x] Books can be browsed
- [x] Orders can be submitted
- [x] Crypto payment info displayed
- [x] Downloads work
- [x] Tor backup accessible
- [x] Separated from teneo.io
- [x] Backups configured

### Bonus Points:
- [ ] IPFS integration
- [ ] BTCPay Server automated
- [ ] Second mirror VPS
- [ ] Multiple .onion addresses
- [ ] Decentralized storage

---

## 🚨 Troubleshooting

### Common Issues:
1. **Docker won't start:** Check logs, increase swap
2. **SSL fails:** Verify DNS propagation, Cloudflare settings
3. **502 Bad Gateway:** Check if app running on port 3001
4. **Can't access Tor:** Verify Tor installed and running
5. **Uploads fail:** Check file size limits in Nginx

### Emergency Contacts:
- VPS support: [provider ticket system]
- Cloudflare support: community.cloudflare.com
- Docker help: docs.docker.com

---

## 📞 What to Tell People

**Official line:**
"Asymmetry Books is an independent publisher focused on information that challenges mainstream narratives. We accept cryptocurrency to ensure financial sovereignty and operate outside traditional gatekeeping systems."

**If asked about teneo.io connection:**
"We're aware of each other's work in democratizing information, but we operate independently to protect both projects."

---

## 🎪 You're Live!

After 48 hours, you should have:
- ✅ Censorship-resistant hosting
- ✅ Crypto payment option
- ✅ Tor backup (.onion)
- ✅ Separated from teneo.io
- ✅ Manual order fulfillment process
- ✅ Foundation for automation later

**Next steps after MVP:**
1. Automate with BTCPay Server
2. Add IPFS for permanent storage
3. Set up mirror servers
4. Expand book catalog
5. Build community

---

**Let's fucking build this. 🚀**
