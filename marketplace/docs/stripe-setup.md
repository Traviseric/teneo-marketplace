# Stripe Setup Guide

This guide walks you through setting up Stripe for payment processing in your marketplace.

## Prerequisites

- A Stripe account (free to create)
- Your marketplace running locally
- Admin access to your Stripe dashboard

## Step 1: Create a Stripe Account

1. Visit [stripe.com](https://stripe.com)
2. Click "Start now" or "Sign up"
3. Fill in your business details
4. Verify your email address

## Step 2: Get Your API Keys

### Test Keys (Development)

1. Log into your [Stripe Dashboard](https://dashboard.stripe.com)
2. Make sure you're in **Test mode** (toggle in top right)
3. Navigate to **Developers → API keys**
4. Copy your keys:
   - **Publishable key**: `pk_test_...`
   - **Secret key**: `sk_test_...`

### Live Keys (Production)

1. Complete your Stripe account activation
2. Switch to **Live mode** in the dashboard
3. Navigate to **Developers → API keys**
4. Copy your production keys:
   - **Publishable key**: `pk_live_...`
   - **Secret key**: `sk_live_...`

⚠️ **Important**: Never expose your secret key publicly!

## Step 3: Configure Your Marketplace

### Backend Configuration

Add to your `.env` file:

```env
# Stripe API Keys
STRIPE_PUBLISHABLE_KEY=pk_test_51...
STRIPE_SECRET_KEY=sk_test_51...

# Optional: Webhook secret (see Step 5)
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Frontend Configuration

Update `frontend/config.js` or your HTML:

```javascript
const STRIPE_PUBLIC_KEY = 'pk_test_51...';
```

Or in your HTML:
```html
<script>
  const stripe = Stripe('pk_test_51...');
</script>
```

## Step 4: Test Your Integration

### Test Card Numbers

Use these card numbers in test mode:

| Card Number | Scenario |
|------------|----------|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 0002 | Generic decline |
| 4000 0025 0000 3155 | Requires authentication |
| 4000 0000 0000 9995 | Insufficient funds |

**Note**: Use any future expiry date and any 3-digit CVC.

### Test a Purchase

1. Add a book to your marketplace
2. Click "Buy Now" on the book
3. Enter test card: `4242 4242 4242 4242`
4. Use any email, future expiry, and CVC
5. Complete the purchase
6. Check your Stripe dashboard for the payment

## Step 5: Set Up Webhooks (Production)

Webhooks notify your marketplace about payment events.

### Create a Webhook Endpoint

1. In Stripe Dashboard, go to **Developers → Webhooks**
2. Click **Add endpoint**
3. Enter your endpoint URL:
   ```
   https://yourdomain.com/api/webhooks/stripe
   ```
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded` (optional)

### Get Your Webhook Secret

1. Click on your webhook endpoint
2. Reveal and copy the **Signing secret**
3. Add to your `.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

## Step 6: Configure Products (Optional)

For better reporting, create products in Stripe:

1. Go to **Products** in Stripe Dashboard
2. Click **Add product**
3. For each book, create a product with:
   - Name: Book title
   - Description: Book description
   - Price: Book price
   - Type: One-time

## Step 7: Enable Payment Methods

1. Go to **Settings → Payment methods**
2. Enable desired payment methods:
   - ✅ Card payments (default)
   - ✅ Google Pay
   - ✅ Apple Pay
   - ✅ Link (Stripe's fast checkout)

## Step 8: Customize Payment Experience

### Checkout Settings

1. Go to **Settings → Checkout and payment links**
2. Customize:
   - Business name
   - Logo
   - Brand color
   - Custom domain (optional)

### Receipt Emails

1. Go to **Settings → Customer emails**
2. Enable **Successful payments**
3. Customize email template

## Security Best Practices

### API Key Security

```javascript
// ❌ Never do this
const stripeKey = 'sk_test_abc123';

// ✅ Use environment variables
const stripeKey = process.env.STRIPE_SECRET_KEY;
```

### PCI Compliance

- Never store card details
- Use Stripe's secure payment forms
- Keep your integration up to date

### Rate Limiting

Implement rate limiting for payment endpoints:

```javascript
const rateLimit = require('express-rate-limit');

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5 // limit each IP to 5 requests
});

app.post('/api/purchase', paymentLimiter, handlePurchase);
```

## Testing Checklist

Before going live:

- [ ] Test successful payments
- [ ] Test failed payments
- [ ] Test webhook handling
- [ ] Verify email receipts
- [ ] Check refund process
- [ ] Test with different amounts
- [ ] Verify download delivery

## Going Live

1. **Activate your Stripe account**
   - Provide business details
   - Verify bank account
   - Complete identity verification

2. **Switch to production keys**
   - Update `.env` with live keys
   - Update frontend with live publishable key

3. **Update webhook endpoint**
   - Add production webhook URL
   - Update webhook secret in `.env`

4. **Monitor initial transactions**
   - Watch for any failures
   - Check webhook delivery
   - Verify payouts

## Troubleshooting

### Payment Fails Immediately
- Check API keys are correct
- Verify you're using matching keys (both test or both live)
- Check browser console for errors

### Webhooks Not Received
- Verify endpoint URL is correct
- Check webhook secret matches
- Look at webhook logs in Stripe Dashboard

### "Invalid API Key" Error
- Ensure no extra spaces in keys
- Verify test/live mode matches
- Check `.env` file is loaded

## Support Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Support](https://support.stripe.com)
- [API Reference](https://stripe.com/docs/api)
- [Testing Guide](https://stripe.com/docs/testing)

## Next Steps

- Set up [recurring subscriptions](https://stripe.com/docs/billing) (if needed)
- Implement [customer portal](https://stripe.com/docs/billing/subscriptions/customer-portal)
- Add [tax collection](https://stripe.com/docs/tax)
- Enable [international payments](https://stripe.com/docs/payments/payment-methods)