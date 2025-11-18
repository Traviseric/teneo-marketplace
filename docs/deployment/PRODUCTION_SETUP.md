# Production Setup Guide

This guide will help you set up the Teneo Marketplace for production to start selling books!

## Prerequisites

- Node.js 14+ installed
- Stripe account (with live keys)
- Email service credentials (Gmail, SendGrid, etc.)
- Domain name (optional but recommended)

## 1. Environment Configuration

1. Copy the example environment file:
```bash
cd marketplace/backend
cp .env.example .env
```

2. Edit `.env` with your production values:

### Stripe Configuration
```env
# Get these from https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_live_your_live_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Set to 'live' for production
STRIPE_MODE=live
```

### Email Configuration
```env
# For Gmail (requires app-specific password)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password
EMAIL_FROM=Your Store Name <noreply@yourdomain.com>

# For SendGrid (recommended for production)
# EMAIL_HOST=smtp.sendgrid.net
# EMAIL_PORT=587
# EMAIL_USER=apikey
# EMAIL_PASS=your-sendgrid-api-key
```

### Site Configuration
```env
# Your production URL
SITE_URL=https://yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com

# Security (generate random strings)
JWT_SECRET=generate-a-random-64-char-string
SESSION_SECRET=generate-another-random-string
```

## 2. Stripe Webhook Setup

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter your webhook URL: `https://yourdomain.com/api/checkout/webhook`
4. Select these events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.created`
5. Copy the webhook secret and add to `.env` as `STRIPE_WEBHOOK_SECRET`

## 3. Database Setup

The SQLite database will be created automatically. To initialize:

```bash
cd marketplace/backend
node database/setup.js
```

For production, consider:
- Regular backups of `marketplace.db`
- Moving to PostgreSQL for better performance
- Setting up database replication

## 4. Email Setup

### Gmail Setup
1. Enable 2-factor authentication on your Google account
2. Generate an app-specific password:
   - Go to [Google Account Settings](https://myaccount.google.com/security)
   - Select "2-Step Verification" > "App passwords"
   - Generate a password for "Mail"
3. Use this password in `.env` as `EMAIL_PASS`

### SendGrid Setup (Recommended)
1. Create a [SendGrid account](https://sendgrid.com)
2. Verify your sender identity
3. Create an API key with "Mail Send" permissions
4. Update `.env` with SendGrid settings

## 5. PDF Book Files

Place your actual PDF files in the appropriate directories:
```
marketplace/frontend/books/
├── teneo/       # Teneo brand books
├── true-earth/  # True Earth brand books
├── wealth-wise/ # WealthWise brand books
└── default/     # Default brand books
```

Name files to match book IDs (e.g., `teneo-1.pdf`)

## 6. Production Deployment

### Option A: Traditional VPS (DigitalOcean, AWS EC2, etc.)

1. Install dependencies:
```bash
cd marketplace/backend
npm install --production
```

2. Use PM2 for process management:
```bash
npm install -g pm2
pm2 start server.js --name teneo-marketplace
pm2 save
pm2 startup
```

3. Set up Nginx as reverse proxy:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

4. Set up SSL with Let's Encrypt:
```bash
sudo certbot --nginx -d yourdomain.com
```

### Option B: Docker Deployment

Use the included Docker configuration:
```bash
docker-compose up -d
```

### Option C: Platform Deployment

Deploy to platforms like:
- **Heroku**: Add Procfile with `web: node marketplace/backend/server.js`
- **Railway**: Connect GitHub repo and deploy
- **Render**: Automatic deploys from GitHub

## 7. Testing Production Setup

1. Check Stripe mode:
```bash
curl https://yourdomain.com/api/checkout/mode
```

2. Test checkout with Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 9995`

3. Verify email delivery:
   - Make a test purchase
   - Check email logs in database

4. Monitor webhooks:
   - Check Stripe Dashboard > Webhooks for successful deliveries
   - Review `stripe_webhooks` table in database

## 8. Security Checklist

- [ ] All sensitive data in `.env` (not in code)
- [ ] HTTPS enabled on production domain
- [ ] Stripe webhook signature verification enabled
- [ ] Database backups configured
- [ ] Error logs not exposing sensitive data
- [ ] Rate limiting on API endpoints
- [ ] CORS properly configured

## 9. Monitoring

Set up monitoring for:
- Server uptime (UptimeRobot, Pingdom)
- Error tracking (Sentry, LogRocket)
- Analytics (Google Analytics, Plausible)
- Database size and performance
- Email delivery rates

## 10. Going Live Checklist

- [ ] Stripe account activated and verified
- [ ] Live API keys in production environment
- [ ] Webhook endpoint verified and working
- [ ] Email sending tested and working
- [ ] PDF files uploaded for all books
- [ ] SSL certificate installed
- [ ] Backup strategy in place
- [ ] Terms of Service and Privacy Policy pages
- [ ] Customer support email configured

## Troubleshooting

### Stripe Issues
- Verify API keys are correct (live vs test)
- Check webhook signature matches
- Ensure webhook endpoint is publicly accessible

### Email Issues
- Test SMTP credentials with a tool like `swaks`
- Check spam folders
- Verify sender domain authentication (SPF, DKIM)

### Download Issues
- Verify PDF files exist in correct directories
- Check file permissions
- Monitor download token expiration

## Support

For production support:
- Stripe: https://support.stripe.com
- Email issues: Check provider documentation
- Application issues: Review logs in `pm2 logs`

Remember to test everything in Stripe test mode before switching to live mode!