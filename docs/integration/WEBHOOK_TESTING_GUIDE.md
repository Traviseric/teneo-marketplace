# 🔗 Webhook Testing Guide

This guide will help you test Stripe webhooks locally and in production.

## 🛠️ Local Development Testing

### Step 1: Install Stripe CLI

**Windows:**
```powershell
# Download from https://github.com/stripe/stripe-cli/releases
# Or use Scoop
scoop install stripe
```

**Mac:**
```bash
brew install stripe/stripe-cli/stripe
```

**Linux:**
```bash
# Download the latest release from GitHub
curl -L https://github.com/stripe/stripe-cli/releases/latest/download/stripe_linux_x86_64.tar.gz | tar xz
sudo mv stripe /usr/local/bin
```

### Step 2: Login to Stripe CLI

```bash
stripe login
```

This will open your browser to authenticate.

### Step 3: Start Webhook Forwarding

```bash
# Forward webhooks to your local server
stripe listen --forward-to localhost:3001/api/checkout/webhook
```

You'll see output like:
```
Ready! Your webhook signing secret is whsec_test_xxxxx (^C to quit)
```

### Step 4: Update Your .env File

Copy the webhook signing secret and add it to your `.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_test_xxxxx
```

### Step 5: Restart Your Server

```bash
npm start
```

### Step 6: Test the Flow

1. **Create a test purchase:**
```bash
node test-purchase-flow.js
```

2. **Complete the payment** using test card `4242 4242 4242 4242`

3. **Watch the webhook events** in the Stripe CLI terminal

4. **Check the logs** in your server terminal

## 🧪 Testing Specific Events

### Test Successful Payment
```bash
stripe trigger checkout.session.completed
```

### Test Failed Payment
```bash
stripe trigger payment_intent.payment_failed
```

### Test Refund
```bash
stripe trigger charge.refunded
```

## 📊 Monitoring Webhook Events

### View Recent Events
```bash
stripe events list --limit 10
```

### View Specific Event
```bash
stripe events retrieve evt_xxxxx
```

### Resend an Event
```bash
stripe events resend evt_xxxxx
```

## 🔍 Debugging Webhooks

### 1. Check Webhook Logs

In your server console, you should see:
```
Processing successful checkout: cs_test_xxxxx
Order order_xxxxx fulfilled successfully
```

### 2. Check Database

```bash
# Using SQLite CLI
sqlite3 marketplace/backend/database/orders.db

# View recent orders
SELECT * FROM orders ORDER BY created_at DESC LIMIT 5;

# View payment events
SELECT * FROM payment_events ORDER BY created_at DESC LIMIT 5;

# View email logs
SELECT * FROM email_logs ORDER BY created_at DESC LIMIT 5;
```

### 3. Common Issues

**Webhook signature verification failed:**
- Make sure you're using the correct webhook secret
- Ensure the webhook endpoint receives the raw body

**Order not found:**
- Check that the order was created before payment
- Verify the order ID in metadata

**Email not sending:**
- Check EMAIL_USER and EMAIL_PASS in .env
- Verify email service is configured

## 🚀 Production Setup

### 1. Create Production Webhook

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter your production URL: `https://yourdomain.com/api/checkout/webhook`
4. Select events:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`

### 2. Copy Production Secret

Copy the signing secret (starts with `whsec_`) and add to production environment:

```env
STRIPE_WEBHOOK_SECRET=whsec_live_xxxxx
```

### 3. Test Production Webhook

Use Stripe's webhook testing tool:
1. Go to your webhook endpoint in Stripe Dashboard
2. Click "Send test webhook"
3. Select an event type
4. Click "Send test webhook"

## 📋 Testing Checklist

### Local Development
- [ ] Stripe CLI installed and logged in
- [ ] Webhook forwarding active
- [ ] Test webhook secret in .env
- [ ] Server restarted with new config
- [ ] Test purchase completed
- [ ] Webhook events received
- [ ] Order status updated in database
- [ ] Emails sent (if configured)

### Production
- [ ] Production webhook endpoint created
- [ ] Production signing secret configured
- [ ] SSL certificate working
- [ ] Test webhook sent from Stripe Dashboard
- [ ] Real purchase tested (small amount)
- [ ] Webhook logs monitored
- [ ] Email delivery confirmed

## 🎯 Quick Test Commands

```bash
# Start webhook listener
stripe listen --forward-to localhost:3001/api/checkout/webhook

# Create test purchase
node test-purchase-flow.js

# Monitor order
node test-purchase-flow.js monitor ORDER_ID

# Check database
sqlite3 marketplace/backend/database/orders.db "SELECT * FROM orders;"

# View server logs
pm2 logs teneo-marketplace

# Test specific webhook
stripe trigger checkout.session.completed
```

## 📈 Monitoring Tools

### Stripe Dashboard
- View all webhook attempts
- Check response times
- See error rates
- Retry failed webhooks

### Application Logs
- Track successful payments
- Monitor email delivery
- Check download attempts
- View error messages

### Database Queries
```sql
-- Recent successful orders
SELECT * FROM orders 
WHERE status = 'completed' 
ORDER BY created_at DESC 
LIMIT 10;

-- Failed payment attempts
SELECT * FROM orders 
WHERE payment_status = 'failed' 
ORDER BY created_at DESC;

-- Download statistics
SELECT order_id, COUNT(*) as download_count 
FROM download_logs 
WHERE download_status = 'success' 
GROUP BY order_id;
```

## 🆘 Troubleshooting

**No webhook events received:**
- Check Stripe CLI is running
- Verify server is accessible
- Confirm webhook URL is correct

**Signature verification fails:**
- Use correct webhook secret for environment
- Don't modify the raw request body
- Check for middleware conflicts

**Orders not processing:**
- Verify database is initialized
- Check order creation in checkout
- Review server error logs

**Emails not sending:**
- Test email configuration separately
- Check spam folders
- Verify SMTP settings

---

Remember: Always test thoroughly in development before deploying to production!