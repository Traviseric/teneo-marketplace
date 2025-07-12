# 🚀 Complete Deployment Guide

From zero to selling books in 15 minutes! This guide will walk you through deploying your Teneo bookstore and getting your first customer.

## 🎯 Quick Deploy (5 minutes)

### Option 1: Vercel (Recommended)

1. **One-Click Deploy**  
   [![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/TravisEric/teneo-marketplace)

2. **Configure Environment**  
   After deployment, add these environment variables in your Vercel dashboard:
   ```
   STRIPE_SECRET_KEY=sk_test_your_key_here
   STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   ```

3. **Redeploy**  
   Click "Redeploy" in Vercel to apply the new environment variables.

### Option 2: Railway

1. **One-Click Deploy**  
   [![Deploy to Railway](https://railway.app/button.svg)](https://railway.app/template/tLkC2K)

2. **Configure Variables**  
   Railway will prompt for environment variables during deployment.

### Option 3: Render

1. **One-Click Deploy**  
   [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/TravisEric/teneo-marketplace)

2. **Configure Environment**  
   Add environment variables in the Render dashboard.

## 🧙‍♂️ Setup Wizard (3 minutes)

Once deployed, run the interactive setup wizard:

```bash
# SSH into your server or use the web terminal
npm run setup:wizard
```

The wizard will:
- ✅ Configure your store name and branding
- ✅ Set up Stripe payment processing
- ✅ Configure email delivery
- ✅ Test all connections
- ✅ Generate secure environment file

## 📋 Pre-Launch Checklist (2 minutes)

Verify everything is ready:

```bash
npm run pre-launch
```

This will check:
- ✅ Stripe keys are configured
- ✅ Email service is working  
- ✅ At least one PDF exists
- ✅ Database is initialized
- ✅ All environment variables are set
- ✅ SSL certificate is valid

## 🎨 Customize Your Store (5 minutes)

### Choose Your Brand

The marketplace comes with 4 pre-built brands:

1. **Teneo Books** - AI consciousness and paradigm shifts
2. **True Earth Publications** - Hidden knowledge and alternative history  
3. **WealthWise** - Elite financial strategies
4. **Default** - Clean, professional template

### Create Custom Brand

```bash
# Copy a template
cp -r marketplace/frontend/brands/teneo marketplace/frontend/brands/mybrand

# Edit the configuration
nano marketplace/frontend/brands/mybrand/config.json
nano marketplace/frontend/brands/mybrand/catalog.json
```

### Add Your Books

1. **Upload PDFs**
   ```bash
   # Place your PDF files here
   marketplace/frontend/books/mybrand/
   ```

2. **Update Catalog**
   ```json
   {
     "name": "My Bookstore",
     "books": [
       {
         "id": "my-book-1",
         "title": "My Amazing Book",
         "author": "Your Name",
         "price": 29.99,
         "description": "A life-changing read"
       }
     ]
   }
   ```

## 💳 Configure Payments

### Get Stripe Keys

1. Create account at [stripe.com](https://stripe.com)
2. Get your keys from [Dashboard > API Keys](https://dashboard.stripe.com/apikeys)
3. Start with test keys, switch to live when ready

### Set Up Webhooks

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://yourdomain.com/api/checkout/webhook`
3. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. Copy webhook secret to environment variables

## 📧 Configure Email

### Gmail (Easiest)

1. Enable 2-factor authentication on Gmail
2. Create app-specific password:
   - [Google Account Settings](https://myaccount.google.com/security)
   - Security > 2-Step Verification > App passwords
   - Generate password for "Mail"
3. Use in environment variables

### SendGrid (Production)

1. Create [SendGrid account](https://sendgrid.com)
2. Verify sender identity
3. Create API key with "Mail Send" permissions
4. Use in environment variables

## 🌐 Connect to Network

Join the Teneo Network for shared discovery:

```bash
npm run add-to-network https://yourdomain.com --name "Your Store" --specialties "fiction,mystery"
```

This will:
- ✅ Validate your store's API compatibility
- ✅ Add you to the network registry
- ✅ Suggest connections with related stores
- ✅ Generate a pull request for network inclusion

## 🎉 Launch Your Store

### Create Launch Page

```bash
# Visit your launch kit
https://yourdomain.com/launch.html
```

Features:
- 🎊 Grand opening banner
- 📊 Real-time visitor analytics
- 🎁 Discount code generator
- 📢 Social media sharing buttons
- ✅ Launch readiness checklist

### Generate Showcase

```bash
npm run generate:showcase
```

Creates a beautiful showcase page at `/showcase.html` featuring:
- 🌟 All your brands
- 📊 Network statistics
- 🔗 Cross-store connections
- 🚀 Call-to-action buttons

## 📈 Track Your Success

### First Customer Milestones

The platform automatically tracks:
- 👀 First visitor
- 🛒 First add to cart
- 💳 First checkout attempt
- 💰 First successful sale (with celebration!)

### Analytics

Monitor your progress:
- Sales data in Stripe dashboard
- Download analytics in database
- Network discovery metrics
- Email delivery reports

## 🚀 Growth Strategies

### 1. Network Effect

- Join the Teneo Network for shared discovery
- Cross-promote with related stores
- Benefit from network-wide searches

### 2. Email Marketing

- Capture emails on launch page
- Send updates for new releases
- Build your subscriber list

### 3. Social Proof

- Add customer testimonials
- Show download counts
- Display "bestseller" badges

### 4. SEO Optimization

- Use descriptive book titles
- Add relevant keywords
- Create content pages

## 🔧 Troubleshooting

### Common Issues

**Payments not working?**
```bash
# Check Stripe configuration
curl https://yourdomain.com/api/checkout/mode
```

**Emails not sending?**
```bash
# Test email configuration
npm run pre-launch
```

**Books not showing?**
```bash
# Regenerate sample PDFs
npm run generate:pdfs
```

**Database issues?**
```bash
# Reinitialize database
npm run setup:db
```

### Getting Help

- 💬 [Join our Discord](https://discord.gg/teneebooks)
- 📧 Email: support@teneo.ai
- 🐛 [Report issues](https://github.com/TravisEric/teneo-marketplace/issues)
- 📚 [Full documentation](https://github.com/TravisEric/teneo-marketplace)

## ✅ Go-Live Checklist

Before switching to live mode:

- [ ] All tests pass (`npm run pre-launch`)
- [ ] Real PDFs uploaded for all books
- [ ] Stripe live keys configured
- [ ] Email delivery tested
- [ ] Custom domain configured (optional)
- [ ] Terms of Service page added
- [ ] Privacy Policy page added
- [ ] Support email configured

## 🎯 Success Metrics

Track these KPIs:
- **Conversion Rate**: Visitors who purchase (aim for 2-5%)
- **Average Order Value**: Revenue per transaction
- **Download Completion**: Customers who actually download
- **Network Discovery**: Sales from network searches

---

**Ready to launch?** You now have everything needed to start selling books and building your audience! 🚀

*Questions? Join our community and we'll help you succeed.*