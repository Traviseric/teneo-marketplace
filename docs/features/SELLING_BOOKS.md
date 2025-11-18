# 💰 Selling Books Guide

Ready to start making money with your bookstore? This guide will walk you through everything you need to know.

## Adding Your First Book

### Step 1: Create Your Book Entry

Edit your brand's catalog file:
```bash
# For the default brand
nano marketplace/frontend/brands/default/catalog.json

# For a custom brand
nano marketplace/frontend/brands/mybrand/catalog.json
```

Add your book to the `books` array:
```json
{
  "id": "my-first-book",
  "title": "How to Build an Empire",
  "author": "Your Name",
  "category": "Business",
  "price": 29.99,
  "currency": "USD", 
  "description": "The ultimate guide to building wealth and influence",
  "tags": ["business", "wealth", "empire"],
  "urgency": "Limited Time: $10 Off Launch Price!",
  "testimonials": [
    {
      "text": "This book changed my life completely!",
      "name": "Sarah M."
    }
  ]
}
```

### Step 2: Add Your PDF File

Place your PDF in the books directory:
```bash
marketplace/frontend/books/mybrand/my-first-book.pdf
```

**PDF Requirements:**
- Maximum size: 50MB (recommended: under 10MB)
- Format: PDF only
- Name must match book ID exactly

### Step 3: Test Your Book

1. Restart your server: `npm start`
2. Visit your store: `http://localhost:3001/?brand=mybrand`
3. Your book should appear in the grid
4. Test the purchase flow with Stripe test cards

## Setting Up Payments

### Get Stripe Account

1. Sign up at [stripe.com](https://stripe.com)
2. Complete business verification
3. Get your API keys from [Dashboard > API Keys](https://dashboard.stripe.com/apikeys)

### Configure Stripe

Add your keys to `.env`:
```env
# Test mode (for development)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_MODE=test

# Live mode (for production)
# STRIPE_SECRET_KEY=sk_live_...
# STRIPE_PUBLISHABLE_KEY=pk_live_...
# STRIPE_MODE=live
```

### Test Cards

Use these Stripe test cards:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 9995`
- **Requires SCA**: `4000 0025 0000 3155`

## Email Configuration

Customers expect immediate download links via email.

### Option 1: Gmail (Easy Setup)

1. Enable 2-factor authentication on Gmail
2. Create an app-specific password:
   - [Google Account Settings](https://myaccount.google.com/security)
   - Security > 2-Step Verification > App passwords
   - Select "Mail" and generate password

3. Add to `.env`:
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=youremail@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=Your Bookstore <youremail@gmail.com>
```

### Option 2: SendGrid (Recommended for Production)

1. Create [SendGrid account](https://sendgrid.com)
2. Verify your sender identity
3. Create API key with "Mail Send" permissions

4. Add to `.env`:
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=SG.your-api-key-here
EMAIL_FROM=Your Bookstore <verified@yourdomain.com>
```

## Book Marketing Features

### Urgency Messages
Add scarcity to boost sales:
```json
{
  "urgency": "⚡ Only 24 hours left at this price!"
}
```

### Social Proof
Include testimonials:
```json
{
  "testimonials": [
    {
      "text": "Incredible insights that I apply daily",
      "name": "John D., CEO"
    }
  ]
}
```

### Categories & Tags
Help customers discover your books:
```json
{
  "category": "Self-Help", 
  "tags": ["productivity", "habits", "success"]
}
```

## Pricing Strategies

### Launch Strategy
1. **Pre-launch**: Build email list with "Coming Soon"
2. **Launch Week**: 40% off with urgency messaging
3. **Normal Price**: Full price after launch period

### Bundle Pricing
Create book collections for higher average order value:
```json
{
  "collections": [
    {
      "name": "Wealth Building Mastery",
      "books": ["book-1", "book-2", "book-3"],
      "original_price": 89.97,
      "bundle_price": 49.99,
      "savings": 40.97
    }
  ]
}
```

### Tiered Pricing
- **Basic PDF**: $19.99
- **PDF + Bonus**: $29.99
- **Complete Package**: $49.99 (PDF + audiobook + templates)

## Analytics & Optimization

### Track Performance

Monitor your sales in the database:
```sql
-- Total sales by book
SELECT 
  oi.book_id,
  oi.title,
  COUNT(*) as orders,
  SUM(oi.subtotal) as revenue
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE o.status = 'completed'
GROUP BY oi.book_id
ORDER BY revenue DESC;
```

### A/B Testing

Test different approaches:
- Book titles and descriptions
- Pricing points
- Urgency messages
- Cover designs (emoji icons)

### Conversion Optimization

1. **Improve Descriptions**: Focus on benefits, not features
2. **Add Social Proof**: Include specific, detailed testimonials
3. **Create Urgency**: Limited-time offers, countdown timers
4. **Reduce Friction**: Simple checkout, clear pricing

## Customer Support

### Common Questions

**Q: How do I download my book?**
A: Check your email for download links. Links expire in 30 days.

**Q: Can I get a refund?**
A: We offer 30-day money-back guarantee. Email support@yourbookstore.com

**Q: The download link isn't working**
A: Each book can be downloaded 5 times. Try a different browser or contact support.

### Support Setup

Add to your brand config:
```json
{
  "support": {
    "email": "support@yourbookstore.com",
    "phone": "+1-555-123-4567",
    "hours": "Mon-Fri 9AM-5PM EST"
  }
}
```

## Legal Considerations

### Terms of Service
Create pages for:
- Terms of Service
- Privacy Policy  
- Refund Policy
- DMCA Notice

### Tax Compliance
- **US**: Collect sales tax in states where required
- **EU**: Handle VAT for digital products
- **Global**: Consider local tax requirements

### Content Rights
Ensure you have rights to sell all content:
- Own the copyright
- Have publishing license
- Comply with platform terms

## Scaling Your Business

### Multiple Brands
Run different niches from one installation:
- **Health**: nutrition and fitness books
- **Wealth**: investment and business books  
- **Spiritual**: consciousness and philosophy books

### Affiliate Program
Let others promote your books:
- 30% commission on referrals
- Custom affiliate links
- Track in analytics table

### Subscription Model
Monthly access to your entire library:
- $19.99/month for unlimited downloads
- Recurring Stripe subscriptions
- Enhanced customer lifetime value

## Troubleshooting Sales Issues

### Payments Not Working
1. Check Stripe keys in `.env`
2. Verify webhook endpoint
3. Look for JavaScript errors in browser console

### Emails Not Sending
1. Test SMTP credentials
2. Check spam folders
3. Verify sender reputation

### Downloads Failing
1. Confirm PDF files exist
2. Check file permissions
3. Monitor token expiration

### Low Conversion Rates
1. Review book descriptions
2. Add more social proof
3. Test different price points
4. Improve page load speed

## Success Metrics

Track these key indicators:
- **Conversion Rate**: Visitors who purchase (aim for 2-5%)
- **Average Order Value**: Revenue per transaction 
- **Customer Lifetime Value**: Total customer spend
- **Download Completion Rate**: Customers who actually download

---

**Ready to start selling?** Your bookstore is set up and ready to generate revenue! 🚀

For more help:
- 💬 [Join our Discord](https://discord.gg/teneebooks)
- 📧 Email: sales-help@teneo.ai
- 📚 [Full documentation](../README.md)