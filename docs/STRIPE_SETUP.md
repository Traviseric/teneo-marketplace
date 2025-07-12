# Stripe Integration Setup Guide

This guide will walk you through setting up Stripe for the Teneo Marketplace to handle real payments.

## Overview

We'll be setting up Stripe in **test mode** to safely develop and test payment functionality without processing real money.

## 1. Create a Stripe Account

### Sign Up for Stripe
1. Go to [https://stripe.com](https://stripe.com)
2. Click **"Start now"** or **"Sign up"**
3. Enter your email address and create a password
4. Complete the account setup form

### Account Verification
- You can start testing immediately without full verification
- For production use, you'll need to complete identity verification
- Stripe will guide you through this process when ready

## 2. Get Your Test API Keys

### Access Your Dashboard
1. Log into your Stripe Dashboard at [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. Make sure you're in **Test mode** (toggle in the left sidebar should show "Test")
3. Navigate to **Developers > API keys**

### Copy Your Keys
You'll need these two keys:

**Publishable Key (starts with `pk_test_`)**
- Safe to expose in frontend JavaScript
- Used to initialize Stripe in the browser
- Example: `pk_test_51234567890abcdef...`

**Secret Key (starts with `sk_test_`)**
- Must be kept secret on your server
- Used for creating checkout sessions
- Example: `sk_test_51234567890abcdef...`

⚠️ **Important**: Never commit secret keys to version control!

## 3. Configure Environment Variables

### Create .env file
In your `marketplace/backend/` directory, create a `.env` file:

```bash
# Copy .env.example to .env
cp .env.example .env
```

### Add Your Stripe Keys
Edit the `.env` file and add your keys:

```env
# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_actual_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

## 4. Test Cards for Development

Stripe provides test card numbers that simulate different scenarios:

### Successful Payments
```
Card Number: 4242 4242 4242 4242
Expiry: Any future date (e.g., 12/34)
CVC: Any 3 digits (e.g., 123)
ZIP: Any 5 digits (e.g., 12345)
```

### Declined Cards
```
# Generic decline
Card Number: 4000 0000 0000 0002

# Insufficient funds
Card Number: 4000 0000 0000 9995

# Card expired
Card Number: 4000 0000 0000 0069
```

### International Cards
```
# UK card
Card Number: 4000 0082 6000 0000

# EU card  
Card Number: 4000 0000 0000 0000
```

More test cards: [Stripe Testing Documentation](https://stripe.com/docs/testing)

## 5. Webhook Setup (Optional for Basic Testing)

### What are Webhooks?
Webhooks notify your server when payment events occur (successful payment, failed payment, etc.).

### Setting Up Webhooks
1. In Stripe Dashboard, go to **Developers > Webhooks**
2. Click **"Add endpoint"**
3. Enter your endpoint URL: `https://yourdomain.com/api/webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`

### Local Development
For local testing, use [Stripe CLI](https://stripe.com/docs/stripe-cli):

```bash
# Install Stripe CLI
npm install -g stripe-cli

# Login to your account
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3001/api/webhook
```

## 6. Testing Your Integration

### Start Your Application
```bash
# Make sure your .env is configured
cd marketplace/backend
npm start
```

### Test Checkout Flow
1. Open your marketplace in browser
2. Click "Buy Now" on any book
3. Use test card `4242 4242 4242 4242`
4. Complete the checkout process
5. Verify success/cancel pages work

### Check Stripe Dashboard
1. Go to **Payments** in your Stripe Dashboard
2. You should see test payments appear
3. Click on payments to see details

## 7. Production Considerations

### Before Going Live
- [ ] Complete Stripe account verification
- [ ] Switch to live API keys (start with `pk_live_` and `sk_live_`)
- [ ] Set up proper webhook endpoints with HTTPS
- [ ] Implement proper error handling and logging
- [ ] Test with small amounts first
- [ ] Review Stripe's security guidelines

### Security Best Practices
- Never expose secret keys in frontend code
- Use HTTPS in production
- Validate webhook signatures
- Implement proper error handling
- Log payment events for debugging

## 8. Troubleshooting

### Common Issues

**"No such customer" errors**
- Make sure you're using test keys with test data
- Check that customer IDs match your test environment

**Webhooks not receiving**
- Verify webhook URL is accessible
- Check webhook signature validation
- Review webhook logs in Stripe Dashboard

**CORS errors**
- Ensure your domain is configured in Stripe settings
- Check CORS middleware configuration

### Getting Help
- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Support](https://support.stripe.com)
- [Community Forum](https://github.com/stripe/stripe-node/discussions)

## 9. Next Steps

Once basic integration is working:

1. **Add Customer Management**
   - Save customer information
   - Enable saved payment methods
   - Implement subscription billing

2. **Enhanced Features**
   - Multi-item cart checkout
   - Discount codes and promotions
   - Recurring payments for subscriptions

3. **Analytics**
   - Track conversion rates
   - Monitor failed payments
   - Generate sales reports

4. **Mobile Optimization**
   - Test on mobile devices
   - Implement Apple Pay / Google Pay
   - Optimize checkout flow for mobile

---

## Quick Reference

### Environment Variables
```env
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Test Card
```
4242 4242 4242 4242
12/34
123
12345
```

### Important URLs
- [Stripe Dashboard](https://dashboard.stripe.com)
- [API Documentation](https://stripe.com/docs/api)
- [Test Cards](https://stripe.com/docs/testing)