# Network Store Example

This example shows how to configure a Book Marketplace that fully participates in the federation network.

## Features

### Core Network Features
- ✅ Full catalog sharing
- ✅ Network book discovery
- ✅ Cross-store promotions
- ✅ Commission tracking
- ✅ Referral analytics
- ✅ Partner showcases

### Enhanced Network Features
- ✅ Unified search across network
- ✅ Network recommendations
- ✅ Commission dashboard
- ✅ Referral bonuses
- ✅ Network leaderboard
- ✅ Bulk import from partners

## Setup

1. Copy configuration:
   ```bash
   cp -r examples/network-store/* .
   ```

2. Register with network:
   ```bash
   npm run federation:register
   ```

3. Configure `.env`:
   ```env
   FEDERATION_ENABLED=true
   FEDERATION_API_KEY=your-key-from-registration
   FEDERATION_STORE_ID=your-store-id
   ```

4. Start with network sync:
   ```bash
   npm run start:networked
   ```

## Use Case

Perfect for:
- Stores wanting to expand catalog
- New stores needing content
- Niche stores seeking variety
- Affiliate marketers
- Book discovery platforms

## Network Benefits

### For Your Store
- **Expanded Catalog**: Access 100,000+ books
- **No Inventory**: Sell without stocking
- **Commission Income**: 10% on all sales
- **Free Marketing**: Cross-promotion
- **Network Effects**: More stores = more sales

### For Your Customers
- **More Choice**: Discover new books
- **Unified Experience**: Seamless checkout
- **Better Prices**: Network discounts
- **Quality Curation**: Vetted content

## Revenue Model

```
Your Book Sales:
$20 book → You keep $19.40 (97%)

Network Book Sales:
$20 book → You earn $2.00 (10% commission)
         → Source store gets $17.40
         → Network fee $0.60

Monthly Example (100 sales):
- 50 your books × $19.40 = $970
- 50 network books × $2.00 = $100
- Total revenue = $1,070
```

## Network Dashboard

Access your network dashboard to see:
- Commission earnings
- Top performing books
- Referral sources
- Partner stores
- Network trends

## Best Practices

1. **Curate Network Content**
   - Review partner catalogs
   - Hide inappropriate content
   - Feature quality books

2. **Optimize Display**
   - Mix local and network books
   - Clear network badges
   - Transparent pricing

3. **Build Relationships**
   - Connect with partners
   - Cross-promote actively
   - Share success stories

4. **Monitor Performance**
   - Track conversion rates
   - Analyze customer preferences
   - Optimize book selection

## Advanced Configuration

### Selective Sharing
```json
{
  "federation": {
    "share_categories": ["fiction", "non-fiction"],
    "exclude_categories": ["adult"],
    "price_range": {
      "min": 0.99,
      "max": 99.99
    }
  }
}
```

### Partner Preferences
```json
{
  "preferred_partners": [
    "scifi-books-store",
    "romance-central",
    "tech-books-hub"
  ],
  "blocked_partners": [],
  "auto_approve_partners": true
}
```

### Commission Optimization
```json
{
  "commission_tiers": {
    "bronze": 0.08,
    "silver": 0.10,
    "gold": 0.12
  },
  "volume_bonuses": true,
  "exclusive_deals": true
}
```

## Troubleshooting

### Books Not Syncing
1. Check API key is valid
2. Verify federation enabled
3. Check network status
4. Review error logs

### Low Commission
1. Improve book placement
2. Add recommendations
3. Feature network books
4. Optimize categories

## Next Steps

1. Join partner showcase
2. Apply for gold tier
3. Host network event
4. Become category curator
5. Launch affiliate program