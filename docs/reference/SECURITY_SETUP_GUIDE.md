# TENEO Marketplace Security Setup Guide

**For:** Self-hosted marketplace deployers
**Updated:** November 17, 2025
**Priority:** 🔴 **CRITICAL** - Read before deploying

---

## 🎯 Purpose

This guide ensures your marketplace deployment is **secure from day one**. If you're downloading and deploying this marketplace, follow these steps to protect your business, your customers, and your data.

---

## ⚠️ CRITICAL: Before You Deploy

### **The 3 Security Rules:**

1. **NEVER commit secrets to git**
2. **ALWAYS use HTTPS in production**
3. **ALWAYS rotate default passwords immediately**

**Violate these → Get hacked. Follow these → Stay secure.**

---

## 🔐 Security Checklist (Complete Before Launch)

### **Priority 0: Immediate** (Do TODAY before deployment)

- [ ] **Generate strong SESSION_SECRET** (see below)
- [ ] **Generate strong JWT_SECRET** (see below)
- [ ] **Set admin password hash** (see below)
- [ ] **Review `.gitignore`** - ensure `.env` is excluded
- [ ] **Enable HTTPS** - no exceptions
- [ ] **Verify sensitive files are NOT committed** (see below)

### **Priority 1: First Week**

- [ ] **Configure email security** (SPF, DKIM, DMARC)
- [ ] **Set up Stripe webhook secret** properly
- [ ] **Configure rate limiting** (protect auth endpoints)
- [ ] **Enable firewall** (UFW on Linux, Windows Firewall)
- [ ] **Set up backups** (database + PDFs)
- [ ] **Review CORS origins** (restrict to your domains)

### **Priority 2: First Month**

- [ ] **Implement secret rotation** (30-90 day schedule)
- [ ] **Set up monitoring** (uptime, errors, suspicious activity)
- [ ] **Review access logs** regularly
- [ ] **Test disaster recovery** (restore from backup)
- [ ] **Audit dependencies** (`npm audit`)

---

## 🛡️ Step-by-Step Security Setup

### **Step 1: Generate Secure Secrets**

**Why:** Default/weak secrets = easy to crack = instant breach

**How to generate cryptographically secure secrets:**

```bash
# On Linux/Mac
# Generate SESSION_SECRET (64 characters)
openssl rand -hex 32

# Generate JWT_SECRET (64 characters)
openssl rand -hex 32

# On Windows (PowerShell)
# Generate SESSION_SECRET
[Convert]::ToBase64String((1..48 | %{Get-Random -Max 256}))

# Generate JWT_SECRET
[Convert]::ToBase64String((1..48 | %{Get-Random -Max 256}))

# Alternative: Use Node.js (works everywhere)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Add to `.env`:**
```env
SESSION_SECRET=<paste-generated-secret-here>
JWT_SECRET=<paste-generated-secret-here>
```

**Security requirements:**
- ✅ Minimum 64 characters
- ✅ Random (not dictionary words)
- ✅ Unique per deployment (don't reuse!)
- ✅ Never commit to git

---

### **Step 2: Secure Admin Access**

**Why:** Default admin password = first thing attackers try

**Generate secure admin password:**

```bash
# Install bcrypt-cli
npm install -g bcrypt-cli

# Generate strong password (use password manager!)
# Example: "Mk9$xP2!vL8@nQ4&rT6#yU1^wE3*zI5"

# Hash it (10 rounds = secure)
bcrypt-cli "YourVeryStrongPasswordHere!" 10

# Copy the hash output to .env
```

**Add to `.env`:**
```env
ADMIN_PASSWORD_HASH=$2b$10$... (your hash here)
```

**Password requirements:**
- ✅ Minimum 20 characters
- ✅ Mix of upper/lower/numbers/symbols
- ✅ NOT a dictionary word
- ✅ Unique (don't reuse from other sites)
- ✅ Stored in password manager
- ✅ **Rotate every 90 days**

**Alternative:** Use a password generator:
```bash
# Generate random 32-character password
openssl rand -base64 32
```

---

### **Step 3: Verify `.gitignore` Protection**

**Why:** Accidentally committing secrets = instant breach

**Check what's protected:**

```bash
# From marketplace root
cat .gitignore
```

**Must include:**
```gitignore
# Environment variables (NEVER COMMIT)
.env
.env.local
.env.production
.env.*.local

# Database (contains customer data)
*.db
*.sqlite
*.sqlite3
database/*.db
database/*.sqlite

# PDF books (copyrighted content)
marketplace/frontend/books/*.pdf
!marketplace/frontend/books/sample-*.pdf

# Private business docs
claude-files/

# Node modules
node_modules/

# Logs (may contain sensitive data)
*.log
logs/
```

**Verify it's working:**
```bash
# Check if .env is ignored
git status

# If .env appears, FIX IMMEDIATELY:
echo ".env" >> .gitignore
git rm --cached .env  # Remove from tracking
git add .gitignore
git commit -m "Protect .env from being committed"
```

---

### **Step 4: Configure HTTPS (Production ONLY)**

**Why:** HTTP = passwords/credit cards sent in plain text = theft

**Options:**

#### **Option A: Cloudflare (Easiest)**
1. Point domain to Cloudflare nameservers
2. Enable "Full (Strict)" SSL mode
3. Cloudflare handles HTTPS automatically
4. ✅ Free
5. ✅ DDoS protection included

#### **Option B: Let's Encrypt (Self-Managed)**
```bash
# Install Certbot
sudo apt install certbot

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (runs daily)
sudo certbot renew --dry-run

# Update .env
SITE_URL=https://yourdomain.com
```

#### **Option C: Vercel/Netlify (Hosted)**
- HTTPS automatic on deployment
- No configuration needed
- Certificate renewal handled for you

**Verify HTTPS is working:**
```bash
curl -I https://yourdomain.com

# Should see:
# HTTP/2 200
# strict-transport-security: max-age=31536000
```

**Force HTTPS in `.env`:**
```env
NODE_ENV=production
FORCE_HTTPS=true
```

---

### **Step 5: Secure Stripe Integration**

**Why:** Weak webhook = fake orders accepted = financial fraud

**Stripe security checklist:**

1. **Use correct API keys (test vs live)**
   ```env
   # Development
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...

   # Production
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_PUBLISHABLE_KEY=pk_live_...
   ```

2. **Set webhook secret properly:**
   ```bash
   # Get from Stripe Dashboard → Webhooks → [Your endpoint]
   # Copy "Signing secret" (starts with whsec_)
   ```

   ```env
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

3. **Verify webhook signatures** (already implemented in code):
   ```javascript
   // This is automatic in routes/webhooks.js
   const event = stripe.webhooks.constructEvent(
     request.body,
     signature,
     process.env.STRIPE_WEBHOOK_SECRET
   );
   ```

4. **Whitelist Stripe IPs** (firewall):
   ```bash
   # Stripe webhook IPs (update periodically)
   # https://stripe.com/docs/ips
   sudo ufw allow from 3.18.12.0/25
   sudo ufw allow from 3.130.192.0/25
   # ... (check Stripe docs for full list)
   ```

---

### **Step 6: Email Security Configuration**

**Why:** Compromised email = attacker controls password resets

**Email security checklist:**

1. **Use app-specific passwords (Gmail)**
   - Go to: https://myaccount.google.com/apppasswords
   - Generate password for "Mail"
   - Use this in `EMAIL_PASS`, NOT your account password

2. **Configure SPF record (DNS)**
   ```dns
   yourdomain.com. IN TXT "v=spf1 include:_spf.google.com ~all"
   ```

3. **Configure DKIM signing**
   - Gmail: Automatic if using Google Workspace
   - SendGrid/Mailgun: Follow their guides
   - Resend: Automatic

4. **Configure DMARC policy**
   ```dns
   _dmarc.yourdomain.com. IN TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com"
   ```

5. **Test email delivery:**
   ```bash
   # Send test email
   curl -X POST http://localhost:3001/api/test-email \
     -H "Content-Type: application/json" \
     -d '{"email":"you@example.com"}'
   ```

6. **Check spam score:**
   - Send to: https://www.mail-tester.com
   - Fix issues until 10/10 score

**Recommended: Use dedicated email service**
- **Resend** (recommended) - $20/month, excellent deliverability
- **SendGrid** - $15/month, 100k emails
- **Mailgun** - Pay-as-you-go

---

### **Step 7: Database Security**

**Why:** Database breach = all customer data leaked

**SQLite security (for self-hosted):**

1. **Set proper file permissions:**
   ```bash
   # Database should be readable ONLY by app user
   chmod 600 database/marketplace.db
   chown www-data:www-data database/marketplace.db

   # Directory should be writable by app
   chmod 700 database/
   ```

2. **Enable encryption (optional but recommended):**
   ```bash
   # Install SQLite with encryption
   npm install better-sqlite3 @journeyapps/sqlcipher

   # Set encryption key in .env
   DATABASE_ENCRYPTION_KEY=<64-char-random-key>
   ```

3. **Regular backups (automated):**
   ```bash
   # Add to crontab
   0 2 * * * /usr/bin/sqlite3 /path/to/database/marketplace.db ".backup /backups/marketplace-$(date +\%Y\%m\%d).db"

   # Encrypt backups
   0 3 * * * gpg --encrypt --recipient you@email.com /backups/marketplace-*.db
   ```

4. **Off-site backup storage:**
   - AWS S3 (encrypted at rest)
   - Backblaze B2 (cheaper alternative)
   - Google Cloud Storage

**PostgreSQL security (for production):**

1. **Use connection string with SSL:**
   ```env
   DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
   ```

2. **Restrict user permissions:**
   ```sql
   -- Create read-only user for analytics
   CREATE USER analytics_ro WITH PASSWORD 'random-password';
   GRANT CONNECT ON DATABASE marketplace TO analytics_ro;
   GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_ro;
   ```

3. **Enable row-level security (RLS):**
   ```sql
   ALTER TABLE users ENABLE ROW LEVEL SECURITY;

   CREATE POLICY users_isolation ON users
     USING (id = current_user_id());
   ```

---

### **Step 8: Rate Limiting**

**Why:** No rate limits = brute force attacks succeed

**Already configured in code**, but verify `.env` settings:

```env
# Requests per 15-minute window
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Stricter for auth endpoints (configured in code)
# LOGIN: 5 attempts per 15 min
# REGISTER: 10 attempts per hour
```

**Monitor for abuse:**
```bash
# Check access logs for repeated failures
tail -f /var/log/nginx/access.log | grep "401\|429"

# Block IP if abuse detected
sudo ufw deny from 123.45.67.89
```

**Advanced: Use Cloudflare rate limiting** (recommended)
- 10,000 requests/hour free
- Automatic bot detection
- Challenge page for suspicious IPs

---

### **Step 9: Firewall Configuration**

**Why:** Open ports = attackers can probe for vulnerabilities

**UFW (Ubuntu/Debian):**

```bash
# Install UFW
sudo apt install ufw

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (REQUIRED or you'll lock yourself out!)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Verify rules
sudo ufw status numbered
```

**Fail2Ban (brute force protection):**

```bash
# Install
sudo apt install fail2ban

# Configure
sudo nano /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true

[nginx-http-auth]
enabled = true
```

```bash
# Start
sudo systemctl start fail2ban
sudo systemctl enable fail2ban

# Check bans
sudo fail2ban-client status
```

---

### **Step 10: CORS Security**

**Why:** Open CORS = any website can make requests to your API

**Configure allowed origins in `.env`:**

```env
# Production - ONLY your domains
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Development - localhost only
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

**Verify in `server.js`:**
```javascript
app.use(cors({
  origin: process.env.CORS_ORIGINS.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));
```

**Test CORS configuration:**
```bash
curl -H "Origin: https://evil.com" \
  -H "Access-Control-Request-Method: POST" \
  -X OPTIONS https://yourdomain.com/api/checkout

# Should return 403 or no CORS headers
```

---

### **Step 11: Dependency Security**

**Why:** Vulnerable dependencies = backdoors in your code

**Automated auditing:**

```bash
# Check for known vulnerabilities
npm audit

# Auto-fix (if possible)
npm audit fix

# Force fix (may break things)
npm audit fix --force

# Review high-severity issues
npm audit --audit-level=high
```

**Keep dependencies updated:**

```bash
# Check outdated packages
npm outdated

# Update (test thoroughly after!)
npm update

# Major version updates (breaking changes)
npm install package@latest
```

**Dependabot (GitHub - recommended):**
- Automatic PR for security updates
- Enable in Settings → Security → Dependabot

---

### **Step 12: Logging & Monitoring**

**Why:** Can't detect breaches if you're not logging

**Enable comprehensive logging:**

```env
# .env
LOG_LEVEL=info  # info, warn, error
ENABLE_AUDIT_LOG=true
```

**Log rotation (prevent disk fill):**

```bash
# Install logrotate
sudo apt install logrotate

# Configure
sudo nano /etc/logrotate.d/marketplace
```

```conf
/var/log/marketplace/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
}
```

**Monitor critical events:**

```bash
# Watch for auth failures
tail -f logs/auth.log | grep "FAILED"

# Watch for errors
tail -f logs/error.log

# Watch for high-value transactions
tail -f logs/orders.log | grep "amount.*[1-9][0-9][0-9]"
```

**Set up alerts (optional):**
- **Sentry** - Error tracking ($29/month)
- **UptimeRobot** - Uptime monitoring (free)
- **Logz.io** - Log aggregation ($79/month)

---

## 🚨 Emergency Procedures

### **If You Suspect a Breach:**

1. **Immediately revoke all secrets:**
   ```bash
   # Generate new secrets
   NEW_SESSION_SECRET=$(openssl rand -hex 32)
   NEW_JWT_SECRET=$(openssl rand -hex 32)

   # Update .env
   sed -i "s/SESSION_SECRET=.*/SESSION_SECRET=$NEW_SESSION_SECRET/" .env
   sed -i "s/JWT_SECRET=.*/JWT_SECRET=$NEW_JWT_SECRET/" .env

   # Restart server
   pm2 restart marketplace
   ```

2. **Rotate Stripe keys:**
   - Stripe Dashboard → Developers → API Keys → Roll key
   - Update `.env` immediately
   - Test checkout still works

3. **Force logout all users:**
   ```sql
   -- Clear all sessions
   DELETE FROM user_sessions;
   ```

4. **Check for unauthorized changes:**
   ```bash
   # Git changes
   git status
   git diff

   # File integrity
   find . -type f -mtime -1  # Files modified in last 24hrs
   ```

5. **Review access logs:**
   ```bash
   # Suspicious IPs
   grep "401\|403\|500" /var/log/nginx/access.log | \
     awk '{print $1}' | sort | uniq -c | sort -rn

   # Database changes
   SELECT * FROM auth_audit_log WHERE created_at > datetime('now', '-1 day');
   ```

6. **Notify affected users** (if customer data exposed):
   - Email all users within 72 hours (GDPR requirement)
   - Explain what happened, what was exposed
   - Steps you're taking to prevent recurrence

---

## 📊 Security Audit Schedule

### **Daily:**
- [ ] Check error logs for anomalies
- [ ] Review failed login attempts
- [ ] Monitor disk space (logs + database)

### **Weekly:**
- [ ] Run `npm audit`
- [ ] Check backup integrity (restore test)
- [ ] Review high-value transactions

### **Monthly:**
- [ ] Update dependencies (`npm update`)
- [ ] Review and rotate API keys
- [ ] Test disaster recovery procedure
- [ ] Review firewall rules

### **Quarterly:**
- [ ] Rotate admin password
- [ ] Rotate SESSION_SECRET and JWT_SECRET
- [ ] Full security audit (use checklist)
- [ ] Penetration test (optional)

---

## 🎓 Security Training for Your Team

**If you have a team deploying this:**

1. **Read this entire document** - No exceptions
2. **Never commit secrets** - Use `.env` only
3. **Always use HTTPS** - No testing in production over HTTP
4. **Report security issues immediately** - No blame, just fix
5. **Use strong passwords** - Password managers required
6. **Enable 2FA everywhere** - GitHub, Stripe, email, hosting

---

## ✅ Final Pre-Launch Security Checklist

Before going live, verify ALL of these:

### **Environment:**
- [ ] `.env` is in `.gitignore`
- [ ] `.env` has strong SESSION_SECRET (64+ chars)
- [ ] `.env` has strong JWT_SECRET (64+ chars)
- [ ] `.env` has secure ADMIN_PASSWORD_HASH
- [ ] `.env` is NOT committed to git

### **HTTPS:**
- [ ] HTTPS is enabled (Cloudflare or Let's Encrypt)
- [ ] HTTP redirects to HTTPS
- [ ] HSTS header is set
- [ ] SSL Labs test = A+ rating (https://www.ssllabs.com/ssltest/)

### **Authentication:**
- [ ] Admin password changed from default
- [ ] Password minimum 20 characters
- [ ] Magic link expiry set (60 minutes)
- [ ] Rate limiting enabled on auth endpoints

### **Payments:**
- [ ] Using LIVE Stripe keys (not test)
- [ ] Webhook secret configured correctly
- [ ] Webhook signature verification enabled
- [ ] Test transaction completed successfully

### **Email:**
- [ ] Using app-specific password (not account password)
- [ ] SPF record configured
- [ ] DKIM enabled
- [ ] DMARC policy set
- [ ] Test email delivered (not spam)

### **Database:**
- [ ] File permissions set (600)
- [ ] Backups automated (daily)
- [ ] Backup encryption enabled
- [ ] Off-site backup storage configured

### **Server:**
- [ ] Firewall enabled (UFW/Firewalld)
- [ ] Only necessary ports open (80, 443, 22)
- [ ] Fail2Ban configured
- [ ] SSH key-only auth (password disabled)

### **Dependencies:**
- [ ] `npm audit` shows no critical vulnerabilities
- [ ] Packages up to date
- [ ] Dependabot enabled (GitHub)

### **Monitoring:**
- [ ] Error logging enabled
- [ ] Audit logging enabled
- [ ] Log rotation configured
- [ ] Uptime monitoring setup

### **CORS:**
- [ ] Only production domains allowed
- [ ] Tested with unauthorized origin (blocked)

### **Documentation:**
- [ ] Emergency procedures documented
- [ ] Team trained on security practices
- [ ] Incident response plan created

**If ANY checkbox is unchecked → DO NOT LAUNCH**

---

## 📚 Additional Resources

### **Official Security Frameworks:**
- **Universal Security Framework**: `D:\Travis Eric\TE Code\teneo-production\SECURITY-BLUEPRINT.md`
- **Auth Platform Security**: `D:\Travis Eric\TE Code\teneo-auth\SECURITY-BLUEPRINT-AUTH-ADDENDUM.md`

### **Tools:**
- **Secret Scanner**: https://github.com/gitleaks/gitleaks
- **SSL Test**: https://www.ssllabs.com/ssltest/
- **Security Headers**: https://securityheaders.com/
- **OWASP Top 10**: https://owasp.org/www-project-top-ten/

### **Support:**
- GitHub Issues: https://github.com/Traviseric/teneo-marketplace/issues
- Security Email: security@teneo.ai

---

## 🏆 Summary

**Security is not optional.** If you skip these steps:

- ❌ Attackers will find your secrets
- ❌ Customer data will be stolen
- ❌ Payment fraud will occur
- ❌ Your business will fail

**If you follow this guide:**

- ✅ Secure from day one
- ✅ Customers trust you
- ✅ GDPR/PCI compliant
- ✅ Business survives long-term

**Time investment:** 4-6 hours
**Risk reduction:** 95%+
**Worth it:** Absolutely

---

**Before you launch, run this final check:**

```bash
# From marketplace root
node scripts/security-check.js
```

**If all checks pass → You're ready to launch securely!** 🚀

**If any fail → Fix them before going live.**

---

**Remember: Security is ongoing, not one-time. Schedule quarterly reviews using this guide.**
