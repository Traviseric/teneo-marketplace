# 🔒 Stripe Production Setup Guide

This guide will help you switch from Stripe test mode to production mode with full security and reliability features.

## 📋 Prerequisites

- [ ] Verified Stripe account
- [ ] Business information submitted to Stripe
- [ ] SSL certificate for your domain
- [ ] Production server with Node.js 16+

## 🚀 Step 1: Get Production Keys

1. **Log in to Stripe Dashboard**
   - Go to [dashboard.stripe.com](https://dashboard.stripe.com)
   - Switch to **Live mode** (toggle in top right)

2. **Copy Production Keys**
   - Navigate to **Developers > API Keys**
   - Copy your **Publishable key** (starts with `pk_live_`)
   - Copy your **Secret key** (starts with `sk_live_`)
   - **NEVER** commit these keys to source control

## 🔧 Step 2: Configure Webhooks

1. **Create Webhook Endpoint**
   - Go to **Developers > Webhooks**
   - Click **Add endpoint**
   - Enter URL: `https://yourdomain.com/api/checkout/webhook`
   - Select events:
     - `checkout.session.completed`
     - `checkout.session.expired`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `charge.refunded`

2. **Copy Webhook Secret**
   - Click on your webhook endpoint
   - Copy the **Signing secret** (starts with `whsec_`)

## 🌐 Step 3: Environment Configuration

Update your production `.env` file:

```env
# Production Environment
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://yourdomain.com

# Stripe Production Keys
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET

# Database
DATABASE_PATH=./marketplace/backend/database/orders.db

# Security
ADMIN_PASSWORD=your_secure_admin_password_here

# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password
```

## 🔐 Step 4: Security Hardening

### 4.1 SSL Certificate
```bash
# Using Let's Encrypt with Certbot
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 4.2 Environment Variables
```bash
# Never commit .env files
echo ".env" >> .gitignore
echo ".env.production" >> .gitignore

# Use environment-specific files
cp .env.example .env.production
```

### 4.3 Rate Limiting
```javascript
// Add to server.js
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

## 📊 Step 5: Database Setup

1. **Initialize Production Database**
```bash
NODE_ENV=production node marketplace/backend/database/init.js
```

2. **Set Permissions**
```bash
chmod 600 marketplace/backend/database/orders.db
```

3. **Enable Backups**
```bash
# Add to crontab
0 2 * * * sqlite3 /path/to/orders.db ".backup /path/to/backup/orders-$(date +\%Y\%m\%d).db"
```

## ✉️ Step 6: Email Configuration

### Gmail Setup
1. Enable 2-factor authentication
2. Create app-specific password
3. Update `EMAIL_PASS` in `.env`

### SendGrid Alternative
```env
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your_sendgrid_api_key
```

## 🚀 Step 7: Deployment

### Using PM2
```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start marketplace/backend/server.js --name teneo-marketplace

# Save PM2 config
pm2 save
pm2 startup
```

### Using Docker
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["node", "marketplace/backend/server.js"]
```

## 🧪 Step 8: Testing Production

### 8.1 Health Check
```bash
curl https://yourdomain.com/api/checkout/health
```

### 8.2 Test Purchase Flow
1. Create a test customer account
2. Make a small purchase
3. Verify:
   - Payment processes correctly
   - Order record created in database
   - Confirmation email sent
   - Download link works
   - PDF downloads successfully

### 8.3 Test Webhook
```bash
# Use Stripe CLI
stripe listen --forward-to https://yourdomain.com/api/checkout/webhook
stripe trigger checkout.session.completed
```

## 📈 Step 9: Monitoring

### Application Monitoring
```javascript
// Add to server.js
app.use('/api/metrics', (req, res) => {
  res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV
  });
});
```

### Error Tracking
```bash
# Install Sentry
npm install @sentry/node

# Add to server.js
const Sentry = require('@sentry/node');
Sentry.init({ dsn: 'your-sentry-dsn' });
```

### Logging
```javascript
// Production logging
const winston = require('winston');
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

## ⚠️ Step 10: Go-Live Checklist

### Security
- [ ] SSL certificate installed and working
- [ ] All API keys in environment variables
- [ ] Strong admin password set
- [ ] Rate limiting enabled
- [ ] CORS properly configured

### Stripe
- [ ] Live mode activated
- [ ] Production keys configured
- [ ] Webhook endpoint verified
- [ ] Test transaction completed

### Database
- [ ] Production database initialized
- [ ] Backup system configured
- [ ] Proper file permissions set

### Email
- [ ] Email service configured
- [ ] Test emails sent successfully
- [ ] SPF/DKIM records configured

### Monitoring
- [ ] Health check endpoint working
- [ ] Error tracking enabled
- [ ] Logging configured
- [ ] Uptime monitoring active

## 🆘 Troubleshooting

### Webhook Signature Verification Failed
```javascript
// Ensure raw body for webhooks
app.use('/api/checkout/webhook', express.raw({type: 'application/json'}));
```

### Database Lock Errors
```bash
# Increase SQLite timeout
sqlite3.configure('busyTimeout', 30000);
```

### Email Delivery Issues
- Check spam folder
- Verify SPF/DKIM records
- Use dedicated email service (SendGrid, Mailgun)

### Payment Failures
- Check Stripe radar rules
- Verify card testing protection
- Monitor fraud alerts

## 📞 Support Resources

- **Stripe Support**: [support.stripe.com](https://support.stripe.com)
- **Stripe Status**: [status.stripe.com](https://status.stripe.com)
- **Documentation**: [stripe.com/docs](https://stripe.com/docs)

## 🎉 Congratulations!

Your Teneo Marketplace is now running in production mode with:
- ✅ Secure payment processing
- ✅ Automated order fulfillment
- ✅ Email delivery system
- ✅ Download management
- ✅ Refund handling
- ✅ Comprehensive logging

Remember to monitor your logs and metrics regularly, and keep your dependencies updated for security patches.