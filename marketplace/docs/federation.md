# Federation Network Guide

Join the Book Marketplace Federation to expand your reach and earn commission from network sales.

## What is Federation?

The Federation Network allows independent book marketplaces to:
- Share their catalogs with other stores
- Sell books from other stores to their customers
- Earn 10% commission on network sales
- Discover new books for their audience

## How It Works

```
Your Store                    Network                    Partner Store
    |                           |                             |
    ├── Share catalog --------> ├── Aggregate books          |
    |                           |                             |
    |                           ├── <------- Browse network   |
    |                           |                             |
    |                           ├── Purchase book ---------> |
    |                           |                             |
    └── Earn commission <------ └── Track referral           |
```

## Joining the Network

### Step 1: Enable Network Sharing

Add to your `.env`:

```env
# Federation Network
FEDERATION_ENABLED=true
FEDERATION_API_KEY=request-from-network
FEDERATION_STORE_ID=your-unique-store-id
FEDERATION_HUB_URL=https://federation.bookmarketplace.network
```

### Step 2: Register Your Store

```bash
curl -X POST https://federation.bookmarketplace.network/api/stores/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Your Bookstore",
    "url": "https://yourdomain.com",
    "description": "Specializing in tech books",
    "categories": ["technology", "programming"],
    "contact_email": "federation@yourdomain.com"
  }'
```

You'll receive:
- Store ID
- API key
- Webhook secret

### Step 3: Implement Federation Endpoints

#### Share Your Catalog

Create endpoint: `GET /api/federation/catalog`

```javascript
app.get('/api/federation/catalog', authenticateFederation, async (req, res) => {
  const books = await Book.findAll({
    where: { 
      available_for_federation: true,
      price: { [Op.gt]: 0 } // Only paid books
    },
    attributes: [
      'id', 'title', 'author', 'description', 
      'price', 'cover_url', 'preview_url'
    ],
    limit: 100
  });
  
  res.json({
    store_id: process.env.FEDERATION_STORE_ID,
    store_name: process.env.MARKETPLACE_NAME,
    books: books.map(book => ({
      ...book,
      federation_id: `${process.env.FEDERATION_STORE_ID}:${book.id}`,
      purchase_url: `${process.env.BASE_URL}/api/federation/purchase/${book.id}`
    }))
  });
});
```

#### Handle Referral Purchases

Create endpoint: `POST /api/federation/purchase/:bookId`

```javascript
app.post('/api/federation/purchase/:bookId', authenticateFederation, async (req, res) => {
  const { customer_email, referring_store_id } = req.body;
  
  // Process purchase
  const purchase = await processPurchase(bookId, customer_email);
  
  // Record referral
  await Referral.create({
    purchase_id: purchase.id,
    referring_store_id,
    commission_rate: 0.10,
    commission_amount: purchase.amount * 0.10
  });
  
  res.json({
    success: true,
    download_url: purchase.download_url,
    commission: purchase.amount * 0.10
  });
});
```

### Step 4: Display Network Books

#### Fetch Network Catalog

```javascript
async function fetchNetworkBooks() {
  const response = await fetch('https://federation.bookmarketplace.network/api/catalog', {
    headers: {
      'Authorization': `Bearer ${FEDERATION_API_KEY}`
    }
  });
  
  const { books } = await response.json();
  return books.filter(book => book.store_id !== OUR_STORE_ID);
}
```

#### Display in Your Store

```html
<section class="network-books">
  <h2>Books from Partner Stores</h2>
  <div class="network-notice">
    📚 These books are from partner stores in our network. 
    You'll be redirected to complete your purchase.
  </div>
  <div id="network-books-grid"></div>
</section>
```

## Commission Structure

### Earning Commissions

- **Standard Rate**: 10% of sale price
- **Payment Schedule**: Monthly
- **Minimum Payout**: $25
- **Payment Methods**: PayPal, Bank Transfer, Stripe

### Commission Tracking

View your earnings:

```bash
GET https://federation.bookmarketplace.network/api/commissions
Authorization: Bearer YOUR_API_KEY

Response:
{
  "current_month": {
    "sales": 47,
    "total": 234.50,
    "pending": 189.00,
    "paid": 45.50
  },
  "lifetime": {
    "sales": 523,
    "total": 2945.80
  }
}
```

## Best Practices

### 1. Curate Your Catalog

Only share books that:
- Have complete metadata
- Include quality covers
- Are actively maintained
- Align with network quality standards

### 2. Optimize Book Descriptions

- Clear, compelling descriptions
- Accurate categorization
- SEO-friendly titles
- Professional cover images

### 3. Handle Customer Support

When selling network books:
- Clearly indicate the source store
- Provide transparent pricing
- Handle refund requests promptly
- Coordinate with source store

### 4. Monitor Performance

Track metrics:
- Network sales conversion rate
- Popular categories from network
- Commission earnings
- Customer feedback

## Network API Reference

### Authentication

All requests require authentication:

```javascript
headers: {
  'Authorization': 'Bearer YOUR_API_KEY',
  'X-Store-ID': 'YOUR_STORE_ID'
}
```

### Endpoints

#### Get Network Catalog
```
GET /api/catalog
Query params:
  - category: Filter by category
  - limit: Number of results (max 100)
  - offset: Pagination offset
```

#### Report Sale
```
POST /api/sales
Body:
{
  "book_federation_id": "store123:book456",
  "amount": 19.99,
  "customer_country": "US",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### Get Commission Report
```
GET /api/commissions
Query params:
  - month: YYYY-MM format
  - status: pending|paid|all
```

#### Update Store Info
```
PUT /api/stores/{store_id}
Body:
{
  "description": "Updated description",
  "categories": ["fiction", "non-fiction"],
  "active": true
}
```

## Compliance Requirements

### Content Guidelines

Prohibited content:
- Pirated materials
- Hate speech
- Adult content (unless age-gated)
- Misleading information

### Technical Requirements

- HTTPS required
- API response time < 2 seconds
- 99% uptime SLA
- Valid SSL certificate

### Legal Compliance

- Respect copyright
- Honor DMCA requests
- Implement privacy policy
- Handle taxes appropriately

## Troubleshooting

### Books Not Appearing in Network

1. Verify federation is enabled
2. Check API key is valid
3. Ensure catalog endpoint is accessible
4. Verify books meet network criteria

### Commission Not Tracked

1. Ensure referral endpoint called
2. Verify store IDs match
3. Check webhook delivery
4. Review commission logs

### API Rate Limits

- Catalog fetch: 100 requests/hour
- Sale reporting: 1000 requests/hour
- Commission check: 10 requests/minute

## Advanced Features

### Smart Recommendations

Enable AI-powered recommendations:

```env
FEDERATION_AI_RECOMMENDATIONS=true
FEDERATION_LEARNING_MODE=collaborative
```

### Geographic Restrictions

Limit book availability by region:

```javascript
{
  "geo_restrictions": {
    "allowed_countries": ["US", "CA", "GB"],
    "blocked_regions": ["EU"]
  }
}
```

### Bundle Deals

Create cross-store bundles:

```javascript
{
  "bundle_id": "tech-starter-pack",
  "books": [
    "store1:book123",
    "store2:book456",
    "store3:book789"
  ],
  "discount": 20
}
```

## Support

- **Documentation**: federation.bookmarketplace.network/docs
- **Email**: support@bookmarketplace.network
- **Discord**: Join our community server
- **API Status**: status.bookmarketplace.network

## Next Steps

1. Enable federation in your marketplace
2. Register with the network
3. Start sharing your catalog
4. Monitor your first sales
5. Optimize based on data