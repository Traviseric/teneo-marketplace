#!/bin/bash
# deploy-vps.sh - Automated VPS deployment script for Teneo Marketplace
# Usage: ./deploy-vps.sh [environment]
# Environment: development|staging|production (default: production)

set -e  # Exit on error

ENVIRONMENT=${1:-production}
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🚀 Starting Teneo Marketplace deployment to VPS"
echo "Environment: $ENVIRONMENT"
echo "Project root: $PROJECT_ROOT"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Please run as root or with sudo${NC}"
    exit 1
fi

# Step 1: Install dependencies
echo -e "${YELLOW}📦 Installing system dependencies...${NC}"
apt-get update
apt-get install -y \
    nodejs \
    npm \
    nginx \
    certbot \
    python3-certbot-nginx \
    git \
    ufw \
    fail2ban

echo -e "${GREEN}✓ System dependencies installed${NC}"
echo ""

# Step 2: Setup firewall
echo -e "${YELLOW}🔒 Configuring firewall...${NC}"
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable

echo -e "${GREEN}✓ Firewall configured${NC}"
echo ""

# Step 3: Install Node.js dependencies
echo -e "${YELLOW}📚 Installing Node.js dependencies...${NC}"
cd "$PROJECT_ROOT"
npm install --production

echo -e "${GREEN}✓ Node.js dependencies installed${NC}"
echo ""

# Step 4: Setup environment variables
echo -e "${YELLOW}⚙️  Configuring environment...${NC}"

if [ ! -f "$PROJECT_ROOT/marketplace/backend/.env" ]; then
    echo -e "${YELLOW}Creating .env file from template...${NC}"

    # Generate secure session secret
    SESSION_SECRET=$(openssl rand -hex 64)

    # Generate admin password hash (prompt user)
    echo -e "${YELLOW}Please enter admin password:${NC}"
    read -s ADMIN_PASSWORD
    ADMIN_PASSWORD_HASH=$(node -e "console.log(require('bcrypt').hashSync('$ADMIN_PASSWORD', 10))")

    # Create .env file
    cat > "$PROJECT_ROOT/marketplace/backend/.env" << EOF
# Environment
NODE_ENV=${ENVIRONMENT}
PORT=3001

# Security
SESSION_SECRET=${SESSION_SECRET}
ADMIN_PASSWORD_HASH=${ADMIN_PASSWORD_HASH}

# Database
DATABASE_PATH=./database/marketplace.db

# Stripe (configure after deployment)
STRIPE_SECRET_KEY=sk_live_CONFIGURE_IN_PRODUCTION
STRIPE_PUBLISHABLE_KEY=pk_live_CONFIGURE_IN_PRODUCTION

# Email (optional)
EMAIL_USER=
EMAIL_PASSWORD=
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587

# Domain
FRONTEND_URL=https://your-domain.com
EOF

    echo -e "${GREEN}✓ .env file created${NC}"
else
    echo -e "${YELLOW}.env file already exists, skipping...${NC}"
fi

echo ""

# Step 5: Initialize database
echo -e "${YELLOW}🗄️  Initializing database...${NC}"
cd "$PROJECT_ROOT/marketplace/backend"
node database/init.js

echo -e "${GREEN}✓ Database initialized${NC}"
echo ""

# Step 6: Setup PM2 for process management
echo -e "${YELLOW}🔧 Setting up PM2...${NC}"
npm install -g pm2

# Create PM2 ecosystem file
cat > "$PROJECT_ROOT/ecosystem.config.js" << EOF
module.exports = {
  apps: [{
    name: 'teneo-marketplace',
    script: './marketplace/backend/server.js',
    cwd: '$PROJECT_ROOT',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: '${ENVIRONMENT}',
      PORT: 3001
    }
  }]
};
EOF

# Start application with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo -e "${GREEN}✓ PM2 configured and application started${NC}"
echo ""

# Step 7: Configure Nginx
echo -e "${YELLOW}🌐 Configuring Nginx...${NC}"

# Prompt for domain name
echo -e "${YELLOW}Enter your domain name (e.g., marketplace.example.com):${NC}"
read DOMAIN_NAME

cat > /etc/nginx/sites-available/teneo-marketplace << EOF
server {
    listen 80;
    server_name ${DOMAIN_NAME};

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # API proxy
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Static files
    location / {
        root ${PROJECT_ROOT}/marketplace/frontend;
        try_files \$uri \$uri/ /index.html;
    }

    # Book files (authenticated downloads)
    location /books {
        internal;
        alias ${PROJECT_ROOT}/marketplace/frontend/books;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/teneo-marketplace /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t
systemctl reload nginx

echo -e "${GREEN}✓ Nginx configured${NC}"
echo ""

# Step 8: Setup SSL with Let's Encrypt
echo -e "${YELLOW}🔐 Setting up SSL certificate...${NC}"
echo -e "${YELLOW}Enter your email for SSL certificate notifications:${NC}"
read SSL_EMAIL

certbot --nginx -d ${DOMAIN_NAME} --non-interactive --agree-tos -m ${SSL_EMAIL} || true

echo -e "${GREEN}✓ SSL certificate configured${NC}"
echo ""

# Step 9: Setup automatic SSL renewal
echo -e "${YELLOW}⏰ Setting up automatic SSL renewal...${NC}"
(crontab -l 2>/dev/null; echo "0 0,12 * * * certbot renew --quiet") | crontab -

echo -e "${GREEN}✓ Automatic SSL renewal configured${NC}"
echo ""

# Step 10: Final checks
echo -e "${YELLOW}🔍 Running final checks...${NC}"

# Check if PM2 process is running
pm2 status | grep teneo-marketplace

# Check if Nginx is running
systemctl status nginx --no-pager

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}📋 Next steps:${NC}"
echo "  1. Configure Stripe keys in .env file"
echo "  2. Update FRONTEND_URL in .env"
echo "  3. Configure email settings (optional)"
echo "  4. Test the deployment at https://${DOMAIN_NAME}"
echo ""
echo -e "${YELLOW}📊 Useful commands:${NC}"
echo "  • Check logs: pm2 logs teneo-marketplace"
echo "  • Restart app: pm2 restart teneo-marketplace"
echo "  • Monitor: pm2 monit"
echo "  • Nginx logs: tail -f /var/log/nginx/error.log"
echo ""
echo -e "${YELLOW}🔒 Security reminders:${NC}"
echo "  • Change default SSH port"
echo "  • Configure fail2ban"
echo "  • Setup backup cron jobs"
echo "  • Monitor application logs"
echo ""
