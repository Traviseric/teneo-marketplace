# Quick Deployment Guide

**Get your Teneo Marketplace running in production in under 30 minutes.**

---

## Prerequisites

- Ubuntu 20.04+ VPS (or similar Linux distribution)
- Domain name pointed to your VPS
- Root/sudo access

---

## 🚀 One-Command Deployment

For a fresh VPS, run this single command:

```bash
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/Traviseric/teneo-marketplace/main/scripts/deploy-vps.sh)"
```

This automated script will:
- ✅ Install all dependencies (Node.js, Nginx, PM2, SSL)
- ✅ Configure firewall and security
- ✅ Setup the database
- ✅ Configure environment variables
- ✅ Start the application with PM2
- ✅ Setup SSL with Let's Encrypt
- ✅ Configure automatic SSL renewal

---

## 📋 Manual Deployment (Step-by-Step)

### Step 1: Prepare Your VPS

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install other dependencies
sudo apt install -y nginx certbot python3-certbot-nginx git ufw fail2ban
```

### Step 2: Clone Repository

```bash
cd /var/www
sudo git clone https://github.com/Traviseric/teneo-marketplace.git
cd teneo-marketplace
```

### Step 3: Install Dependencies

```bash
npm install --production
```

### Step 4: Configure Environment

```bash
cd marketplace/backend

# Copy example environment file
cp .env.example .env

# Generate session secret
echo "SESSION_SECRET=$(openssl rand -hex 64)" >> .env

# Generate admin password hash
node scripts/generate-password-hash.js "YourSecurePassword123!"
# Copy the hash output to .env as ADMIN_PASSWORD_HASH
```

### Step 5: Run Pre-flight Check

```bash
# Validate your configuration
node scripts/preflight-check.js production
```

Fix any errors or warnings before continuing.

### Step 6: Initialize Database

```bash
cd marketplace/backend
node database/init.js
```

### Step 7: Setup PM2

```bash
# Install PM2 globally
sudo npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'teneo-marketplace',
    script: './marketplace/backend/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};
EOF

# Start application
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Step 8: Configure Nginx

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/teneo-marketplace

# Paste this configuration (replace YOUR_DOMAIN):
server {
    listen 80;
    server_name YOUR_DOMAIN;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

    # API proxy
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files
    location / {
        root /var/www/teneo-marketplace/marketplace/frontend;
        try_files $uri $uri/ /index.html;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/teneo-marketplace /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### Step 9: Setup SSL

```bash
sudo certbot --nginx -d YOUR_DOMAIN --non-interactive --agree-tos -m your@email.com
```

### Step 10: Configure Firewall

```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw --force enable
```

---

## 🔒 Post-Deployment Security

### Configure Stripe (Production)

```bash
# Edit .env file
nano marketplace/backend/.env

# Update these values:
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_KEY
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_KEY
FRONTEND_URL=https://YOUR_DOMAIN

# Restart application
pm2 restart teneo-marketplace
```

### Setup Automated Backups

```bash
# Make backup script executable
chmod +x scripts/backup.sh

# Test backup
sudo ./scripts/backup.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /var/www/teneo-marketplace/scripts/backup.sh") | crontab -
```

### Configure Email (Optional)

For order confirmation emails:

```bash
# Edit .env
EMAIL_USER=your-smtp-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587

# Restart
pm2 restart teneo-marketplace
```

---

## 🛠️ Useful Commands

### Application Management

```bash
# View logs
pm2 logs teneo-marketplace

# Restart application
pm2 restart teneo-marketplace

# Monitor performance
pm2 monit

# View status
pm2 status
```

### Nginx

```bash
# Test configuration
sudo nginx -t

# Reload
sudo systemctl reload nginx

# View logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Database

```bash
# Connect to database
sqlite3 marketplace/backend/database/marketplace.db

# Backup manually
./scripts/backup.sh

# Check size
du -sh marketplace/backend/database/*.db
```

### Updates

```bash
# Pull latest code
git pull origin main

# Install new dependencies
npm install --production

# Restart
pm2 restart teneo-marketplace
```

---

## 🌐 Deploy to Alternative Platforms

### Heroku (Quick Deploy)

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

```bash
# Or manually:
heroku create your-marketplace-name
git push heroku main
heroku config:set NODE_ENV=production
heroku config:set SESSION_SECRET=$(openssl rand -hex 64)
```

### Railway (One-Click)

1. Connect GitHub repository
2. Deploy from `main` branch
3. Set environment variables in dashboard
4. Railway auto-detects Node.js and deploys

### Docker

```bash
# Build image
docker build -t teneo-marketplace .

# Run container
docker run -d \
  -p 3001:3001 \
  -v $(pwd)/marketplace/backend/.env:/app/marketplace/backend/.env \
  -v $(pwd)/marketplace/backend/database:/app/marketplace/backend/database \
  --name teneo-marketplace \
  teneo-marketplace
```

---

## 🔧 Troubleshooting

### Application won't start

```bash
# Check PM2 logs
pm2 logs teneo-marketplace --lines 50

# Check if port is in use
netstat -tuln | grep 3001

# Verify environment file
cat marketplace/backend/.env
```

### Database errors

```bash
# Reinitialize database
cd marketplace/backend
node database/init.js

# Check permissions
ls -la database/
```

### SSL certificate issues

```bash
# Renew certificate manually
sudo certbot renew

# Check certificate status
sudo certbot certificates
```

### 502 Bad Gateway

```bash
# Check if app is running
pm2 status

# Check Nginx configuration
sudo nginx -t

# Restart both
pm2 restart teneo-marketplace
sudo systemctl restart nginx
```

---

## 📊 Monitoring & Maintenance

### Setup Monitoring

```bash
# Install PM2 monitoring (optional)
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

### Regular Maintenance Checklist

- [ ] Check backup success (daily)
- [ ] Review error logs (weekly)
- [ ] Update dependencies (monthly)
- [ ] Test SSL renewal (quarterly)
- [ ] Review security patches (monthly)

---

## 🆘 Support

- **Documentation**: [Full Docs](./docs/)
- **Issues**: [GitHub Issues](https://github.com/Traviseric/teneo-marketplace/issues)
- **Email**: network@teneo.ai

---

## 📝 Next Steps After Deployment

1. **Configure Stripe** - Add your live API keys
2. **Setup Email** - Configure SMTP for order confirmations
3. **Add Books** - Upload your first catalog via admin panel
4. **Test Checkout** - Make a test purchase end-to-end
5. **Join Network** - Connect to the federated book network
6. **Setup Backups** - Automate daily database backups
7. **Monitor Logs** - Watch for errors in the first 24 hours

---

**🎉 Congratulations! Your censorship-resistant book marketplace is now live!**
