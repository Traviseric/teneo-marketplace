# Cost Tracking & Value Exchange Architecture

**Philosophy:** Radical transparency in economics, not just metrics

**Status:** Design specification (implementation recommended)

---

## Overview

Enable **orchestrator** and **marketplace** to exchange cost/usage data, allowing both systems to:
1. Track actual costs (AI generation, storage, bandwidth)
2. Share cost data for pricing optimization
3. Dynamically adjust pricing based on real costs
4. Pass savings to customers when costs decrease
5. Maintain target profit margins automatically

---

## Why This Matters

### Current State (Static Pricing)

```
Orchestrator generates book
├─ AI cost: $2.50 (actual)
├─ Price set: $14.99 (static)
└─ Margin: Unknown (no cost tracking)

Marketplace hosts book
├─ Storage cost: $0.10/month (actual)
├─ Bandwidth cost: $0.50/month (actual)
├─ Revenue share: Unknown
└─ Margin: Unknown (no cost tracking)

User buys book
├─ Pays: $14.99
├─ Value received: Book
└─ Cost breakdown: Hidden
```

**Problems:**
- ❌ No visibility into actual costs
- ❌ Can't optimize pricing
- ❌ Can't pass savings to users
- ❌ Can't detect when margins are too high/low
- ❌ No transparency for users

### Proposed State (Dynamic Pricing)

```
Orchestrator generates book
├─ AI cost: $2.50 (tracked)
├─ Sends cost data → Marketplace
└─ Target margin: 80% profit

Marketplace receives cost data
├─ Orchestrator cost: $2.50
├─ Own costs: $0.60/month (storage + bandwidth)
├─ Total cost: $3.10
├─ Target margin: 80%
└─ Optimal price: $15.50 (auto-calculated)

User buys book
├─ Pays: $15.50
├─ See cost breakdown:
│   ├─ Content creation: $2.50
│   ├─ Hosting/delivery: $0.60
│   ├─ Platform margin: $12.40 (80%)
│   └─ Total: $15.50
└─ Verifiable (open-source cost tracking)
```

**Benefits:**
- ✅ Full cost visibility
- ✅ Dynamic pricing optimization
- ✅ Automatic savings passed to users
- ✅ Margins maintained at target levels
- ✅ Complete transparency

---

## Architecture

### 1. Cost Tracking (Orchestrator Side)

**Track costs for:**
- Book generation (AI API calls)
- SEO blog post generation
- Cover image generation
- Book formatting/conversion

```python
# orchestrator/cost_tracker.py

class CostTracker:
    def __init__(self):
        self.costs = {}

    def track_book_generation(self, book_id, ai_costs):
        """Track all costs for generating a book"""
        self.costs[book_id] = {
            'ai_generation': {
                'model': 'gpt-4',
                'tokens': 150000,
                'cost_per_1k': 0.03,
                'total_cost': ai_costs['generation']  # $4.50
            },
            'cover_generation': {
                'model': 'dall-e-3',
                'images': 1,
                'cost': ai_costs['cover']  # $0.40
            },
            'formatting': {
                'model': 'gpt-4',
                'tokens': 5000,
                'cost': ai_costs['formatting']  # $0.15
            },
            'total_cost': sum(ai_costs.values()),  # $5.05
            'timestamp': datetime.now().isoformat()
        }

    def track_seo_generation(self, post_id, ai_costs):
        """Track costs for SEO blog post"""
        self.costs[post_id] = {
            'keyword_research': {
                'model': 'gpt-4',
                'cost': ai_costs['research']  # $0.05
            },
            'content_generation': {
                'model': 'gpt-4',
                'tokens': 3000,
                'cost': ai_costs['content']  # $0.09
            },
            'seo_optimization': {
                'model': 'gpt-4',
                'cost': ai_costs['seo']  # $0.03
            },
            'total_cost': sum(ai_costs.values()),  # $0.17
            'timestamp': datetime.now().isoformat()
        }

    def get_cost_breakdown(self, item_id):
        """Get detailed cost breakdown for any item"""
        return self.costs.get(item_id, {})
```

### 2. Cost Reporting (Enhanced Webhooks)

**Add cost data to webhook payloads:**

```python
# orchestrator/marketplace_client.py

class MarketplaceClient:
    def notify_book_generated(self, brand_id, book_data, cover_path, pdf_path, cost_data):
        """Send book data WITH cost information"""

        webhook_data = {
            'brandId': brand_id,
            'book': book_data,
            'coverFile': base64_cover,
            'pdfFile': base64_pdf,

            # NEW: Cost tracking data
            'costs': {
                'generation': {
                    'ai_model': 'gpt-4',
                    'total_tokens': 150000,
                    'cost': 4.50,
                    'breakdown': {
                        'content': 4.50,
                        'cover': 0.40,
                        'formatting': 0.15
                    }
                },
                'metadata': {
                    'generated_at': '2024-11-15T10:30:00Z',
                    'word_count': 45000,
                    'cost_per_word': 0.0001,
                    'quality_tier': 'premium'
                }
            },

            # Pricing suggestions
            'pricing': {
                'suggested_price': 14.99,
                'minimum_price': 9.99,  # Cover costs + 50% margin
                'target_margin': 0.80,  # 80% profit target
                'reasoning': 'Based on content quality, length, and market positioning'
            }
        }

        return self._send_webhook('book-generated', webhook_data)
```

### 3. Cost Storage (Marketplace Side)

**Store cost data alongside books:**

```javascript
// marketplace/backend/routes/webhooks.js

router.post('/orchestrator/book-generated', async (req, res) => {
  const { brandId, book, coverFile, pdfFile, costs, pricing } = req.body;

  // Read current catalog
  const catalog = JSON.parse(await fs.readFile(catalogPath, 'utf-8'));

  // Create book entry WITH cost data
  const bookEntry = {
    id: book.id,
    title: book.title,
    price: book.price || pricing.suggested_price,

    // NEW: Cost tracking
    costs: {
      orchestrator: {
        generation: costs.generation.cost,
        breakdown: costs.generation.breakdown,
        timestamp: costs.metadata.generated_at
      },
      marketplace: {
        storage: 0,  // Updated monthly
        bandwidth: 0,  // Updated monthly
        transaction_fees: 0  // Updated per sale
      },
      total: costs.generation.cost  // Will increase with marketplace costs
    },

    // Pricing optimization
    pricing: {
      current: book.price || pricing.suggested_price,
      minimum: pricing.minimum_price,
      target_margin: pricing.target_margin,
      last_updated: new Date().toISOString()
    },

    // Revenue tracking
    revenue: {
      total_sales: 0,
      total_revenue: 0,
      total_costs: costs.generation.cost,
      net_profit: 0,
      margin: 0
    }
  };

  catalog.books.push(bookEntry);
  await fs.writeFile(catalogPath, JSON.stringify(catalog, null, 2));

  res.json({ success: true, bookId: bookEntry.id });
});
```

### 4. Usage Tracking (Marketplace Side)

**Track actual costs:**

```javascript
// marketplace/backend/services/usageTracker.js

class UsageTracker {
  constructor() {
    this.db = require('../database/connection');
  }

  async trackBookDownload(bookId, fileSize) {
    /**
     * Track bandwidth usage when user downloads PDF
     */
    await this.db.run(`
      INSERT INTO usage_tracking (
        book_id,
        event_type,
        file_size,
        cost_estimate,
        timestamp
      ) VALUES (?, 'download', ?, ?, datetime('now'))
    `, [
      bookId,
      fileSize,
      this.calculateBandwidthCost(fileSize)  // $0.01 per GB
    ]);
  }

  async trackStorageCosts() {
    /**
     * Calculate monthly storage costs for all books
     */
    const books = await this.db.all(`
      SELECT book_id, SUM(file_size) as total_size
      FROM book_files
      GROUP BY book_id
    `);

    for (const book of books) {
      const storageCost = this.calculateStorageCost(book.total_size);  // $0.023 per GB/month

      await this.db.run(`
        UPDATE book_costs
        SET storage_cost = ?,
            last_updated = datetime('now')
        WHERE book_id = ?
      `, [storageCost, book.book_id]);
    }
  }

  async trackTransactionFees(bookId, saleAmount, paymentMethod) {
    /**
     * Track payment processing fees (Stripe, etc.)
     */
    const fees = {
      'stripe': saleAmount * 0.029 + 0.30,  // 2.9% + $0.30
      'crypto': saleAmount * 0.01,  // 1%
      'direct': 0  // Free
    };

    const fee = fees[paymentMethod] || 0;

    await this.db.run(`
      INSERT INTO transaction_costs (
        book_id,
        sale_amount,
        payment_method,
        fee_amount,
        timestamp
      ) VALUES (?, ?, ?, ?, datetime('now'))
    `, [bookId, saleAmount, paymentMethod, fee]);

    return fee;
  }

  async getBookCostSummary(bookId) {
    /**
     * Get complete cost breakdown for a book
     */
    const costs = await this.db.get(`
      SELECT
        b.generation_cost,
        b.storage_cost,
        COALESCE(SUM(u.cost_estimate), 0) as bandwidth_cost,
        COALESCE(SUM(t.fee_amount), 0) as transaction_fees,
        COALESCE(SUM(r.revenue), 0) as total_revenue,
        COUNT(DISTINCT t.id) as total_sales
      FROM books b
      LEFT JOIN usage_tracking u ON b.id = u.book_id
      LEFT JOIN transaction_costs t ON b.id = t.book_id
      LEFT JOIN revenue r ON b.id = r.book_id
      WHERE b.id = ?
      GROUP BY b.id
    `, [bookId]);

    const totalCosts =
      costs.generation_cost +
      costs.storage_cost +
      costs.bandwidth_cost +
      costs.transaction_fees;

    const netProfit = costs.total_revenue - totalCosts;
    const margin = costs.total_revenue > 0
      ? (netProfit / costs.total_revenue) * 100
      : 0;

    return {
      costs: {
        generation: costs.generation_cost,
        storage: costs.storage_cost,
        bandwidth: costs.bandwidth_cost,
        transactions: costs.transaction_fees,
        total: totalCosts
      },
      revenue: {
        total: costs.total_revenue,
        sales: costs.total_sales,
        average_sale: costs.total_sales > 0
          ? costs.total_revenue / costs.total_sales
          : 0
      },
      profit: {
        net: netProfit,
        margin: margin,
        per_sale: costs.total_sales > 0
          ? netProfit / costs.total_sales
          : 0
      }
    };
  }
}

module.exports = UsageTracker;
```

### 5. Dynamic Pricing Engine

**Automatically optimize pricing:**

```javascript
// marketplace/backend/services/pricingEngine.js

class PricingEngine {
  constructor(usageTracker) {
    this.usageTracker = usageTracker;
  }

  async optimizeBookPrice(bookId, targetMargin = 0.80) {
    /**
     * Calculate optimal price based on actual costs and target margin
     *
     * Formula: price = total_costs / (1 - target_margin)
     *
     * Example:
     *   Total costs: $3.10
     *   Target margin: 80% (0.80)
     *   Optimal price: $3.10 / (1 - 0.80) = $15.50
     */

    const costSummary = await this.usageTracker.getBookCostSummary(bookId);
    const totalCosts = costSummary.costs.total;

    // Calculate optimal price for target margin
    const optimalPrice = totalCosts / (1 - targetMargin);

    // Round to .99 pricing psychology
    const suggestedPrice = Math.ceil(optimalPrice) - 0.01;

    // Calculate minimum price (50% margin floor)
    const minimumPrice = totalCosts / (1 - 0.50);

    return {
      current_price: await this.getCurrentPrice(bookId),
      suggested_price: suggestedPrice,
      minimum_price: minimumPrice,
      cost_breakdown: costSummary.costs,
      target_margin: targetMargin,
      projected_margin: this.calculateMargin(suggestedPrice, totalCosts),
      recommendation: this.getPriceRecommendation(bookId, suggestedPrice)
    };
  }

  calculateMargin(price, costs) {
    return ((price - costs) / price) * 100;
  }

  async getPriceRecommendation(bookId, suggestedPrice) {
    const currentPrice = await this.getCurrentPrice(bookId);
    const diff = suggestedPrice - currentPrice;

    if (Math.abs(diff) < 0.50) {
      return {
        action: 'keep',
        reason: 'Current price is optimal (within $0.50 of target)'
      };
    } else if (diff > 0) {
      return {
        action: 'increase',
        reason: `Increase by $${diff.toFixed(2)} to maintain target margin`,
        new_price: suggestedPrice
      };
    } else {
      return {
        action: 'decrease',
        reason: `Decrease by $${Math.abs(diff).toFixed(2)} to pass savings to customers`,
        new_price: suggestedPrice
      };
    }
  }

  async optimizeAllBooks() {
    /**
     * Run pricing optimization across all books
     * Returns recommendations for price changes
     */
    const db = require('../database/connection');
    const books = await db.all('SELECT id FROM books');

    const recommendations = [];

    for (const book of books) {
      const optimization = await this.optimizeBookPrice(book.id);

      if (optimization.recommendation.action !== 'keep') {
        recommendations.push({
          book_id: book.id,
          current_price: optimization.current_price,
          suggested_price: optimization.suggested_price,
          action: optimization.recommendation.action,
          reason: optimization.recommendation.reason,
          cost_breakdown: optimization.cost_breakdown
        });
      }
    }

    return recommendations;
  }
}

module.exports = PricingEngine;
```

### 6. Cost Transparency API

**Expose cost data to users:**

```javascript
// marketplace/backend/routes/transparency.js

const express = require('express');
const router = express.Router();
const UsageTracker = require('../services/usageTracker');
const PricingEngine = require('../services/pricingEngine');

/**
 * Get transparent cost breakdown for a book
 *
 * Shows users exactly what they're paying for
 */
router.get('/books/:bookId/cost-breakdown', async (req, res) => {
  const { bookId } = req.params;

  const tracker = new UsageTracker();
  const costSummary = await tracker.getBookCostSummary(bookId);

  res.json({
    book_id: bookId,
    price: await getBookPrice(bookId),

    costs: {
      content_creation: {
        amount: costSummary.costs.generation,
        description: 'AI-powered book generation (150K tokens)',
        model: 'GPT-4',
        breakdown: {
          writing: costSummary.costs.generation * 0.90,
          cover: costSummary.costs.generation * 0.08,
          formatting: costSummary.costs.generation * 0.02
        }
      },

      hosting: {
        amount: costSummary.costs.storage,
        description: 'Storage and CDN delivery',
        per_month: costSummary.costs.storage,
        providers: 'AWS S3 + CloudFront'
      },

      delivery: {
        amount: costSummary.costs.bandwidth,
        description: 'Bandwidth costs (estimated per download)',
        average_file_size: '5 MB',
        cost_per_gb: '$0.01'
      },

      payment_processing: {
        amount: costSummary.costs.transactions,
        description: 'Stripe fees (2.9% + $0.30)',
        percentage: 2.9,
        fixed_fee: 0.30
      },

      total_costs: costSummary.costs.total
    },

    margin: {
      amount: costSummary.profit.net,
      percentage: costSummary.profit.margin,
      target: 80,
      description: 'Platform profit for ongoing development and support'
    },

    transparency_note: 'This is a transparent, open-source marketplace. All costs are real and verifiable in our public codebase.',
    verify_code: 'https://github.com/teneo/marketplace/blob/main/backend/services/usageTracker.js'
  });
});

/**
 * Get pricing optimization recommendations
 *
 * Admin endpoint to see suggested price changes
 */
router.get('/admin/pricing-recommendations', async (req, res) => {
  const tracker = new UsageTracker();
  const engine = new PricingEngine(tracker);

  const recommendations = await engine.optimizeAllBooks();

  res.json({
    recommendations,
    summary: {
      books_analyzed: recommendations.length,
      price_increases: recommendations.filter(r => r.action === 'increase').length,
      price_decreases: recommendations.filter(r => r.action === 'decrease').length,
      total_savings_to_pass: recommendations
        .filter(r => r.action === 'decrease')
        .reduce((sum, r) => sum + (r.current_price - r.suggested_price), 0)
    }
  });
});

module.exports = router;
```

---

## Use Cases

### Use Case 1: Book Pricing Optimization

**Scenario:** AI costs decrease (GPT-5 is cheaper)

```
1. Orchestrator generates book
   - Old AI cost: $4.50
   - New AI cost: $2.00 (GPT-5 is 55% cheaper!)

2. Sends cost data to marketplace
   POST /webhooks/orchestrator/book-generated
   {
     "costs": {
       "generation": { "cost": 2.00 }
     }
   }

3. Marketplace pricing engine recalculates
   - Old price: $14.99
   - Old costs: $4.50 + $0.60 = $5.10
   - Old margin: ($14.99 - $5.10) / $14.99 = 66%

   - New costs: $2.00 + $0.60 = $2.60
   - Target margin: 80%
   - New optimal price: $2.60 / 0.20 = $13.00

4. System suggests price decrease
   - Recommendation: Lower price to $12.99
   - Reason: "AI costs decreased 55%, passing savings to customers"
   - Savings: $2.00 per book

5. Admin approves (or auto-approve if <10% change)

6. Customer sees:
   - New price: $12.99 (was $14.99)
   - Badge: "Price reduced! AI efficiency savings"
   - Cost breakdown shows lower generation costs
```

### Use Case 2: Volume Discounts

**Scenario:** User generates 10 books in one brand

```
1. Orchestrator batch-generates 10 books
   - Individual book cost: $4.50 each
   - Batch processing discount: 20% off AI costs
   - Batch cost per book: $3.60

2. Sends cost data with batch discount
   {
     "costs": {
       "generation": {
         "cost": 3.60,
         "original_cost": 4.50,
         "discount": 0.90,
         "discount_reason": "Batch processing (10 books)"
       }
     }
   }

3. Marketplace calculates volume pricing
   - Normal price: $14.99
   - Volume price: $12.99
   - Savings passed to customer: $2.00 per book
   - Total savings: $20.00

4. Customer sees:
   - "Volume discount: 10 books → Save $20!"
   - Cost transparency: Shows batch processing savings
```

### Use Case 3: SEO Service Pricing

**Scenario:** Optimize monthly SEO service pricing

```
1. Orchestrator generates 20 blog posts/month
   - Cost per post: $0.17 (GPT-4)
   - Monthly AI cost: $3.40

2. Marketplace tracks hosting costs
   - Storage: 20 posts × 50 KB = 1 MB → $0.00002/month
   - Bandwidth: 1,000 views × 1 MB = 1 GB → $0.01
   - Total hosting: $0.01

3. Total monthly cost: $3.41

4. Pricing engine calculates optimal price
   - Costs: $3.41
   - Target margin: 95%
   - Optimal price: $3.41 / 0.05 = $68.20

5. Current price: $49/month
   - Margin: ($49 - $3.41) / $49 = 93%
   - Recommendation: "Keep current pricing (margin acceptable)"

6. Customer sees value
   - Paying: $49/month
   - Cost: $3.41
   - Value: 20 blog posts (would cost $400+ with human writers)
   - ROI: 714% savings vs traditional
```

### Use Case 4: Real-Time Cost Alerts

**Scenario:** OpenAI raises API prices

```
1. OpenAI increases GPT-4 pricing by 30%
   - Old cost per book: $4.50
   - New cost per book: $5.85

2. Orchestrator detects cost increase
   - Sends alert to marketplace
   POST /webhooks/orchestrator/cost-alert
   {
     "alert_type": "cost_increase",
     "service": "openai_gpt4",
     "increase_percentage": 30,
     "impact": {
       "books": "Book generation costs up $1.35",
       "seo": "Blog post costs up $0.05"
     }
   }

3. Marketplace pricing engine recalculates
   - Current price: $14.99
   - Current costs: $5.10
   - Current margin: 66%

   - New costs: $6.45
   - To maintain 66% margin: $19.00
   - To maintain 80% margin: $32.25 (too high!)

4. System presents options to admin
   a) Increase price to $16.99 (maintain 58% margin)
   b) Absorb cost (reduce margin to 57%)
   c) Switch to GPT-3.5 (cheaper, lower quality)
   d) Reduce book length to cut costs

5. Admin chooses: Option (a) - Increase price

6. Customer notification
   - Email: "Price adjustment notice"
   - Explanation: "OpenAI increased API costs by 30%"
   - Cost transparency: Shows updated breakdown
   - New price: $16.99 (still cheaper than human-written)
   - Link to verify: GitHub commit showing OpenAI price change
```

---

## Implementation Roadmap

### Phase 1: Basic Cost Tracking (Week 1)

**Orchestrator:**
- [ ] Add cost tracking to book generation
- [ ] Add cost tracking to SEO generation
- [ ] Include cost data in webhook payloads
- [ ] Test cost calculation accuracy

**Marketplace:**
- [ ] Update webhook routes to accept cost data
- [ ] Store cost data in book catalog
- [ ] Create cost transparency API endpoint
- [ ] Test data storage

**Estimated time:** 4-6 hours

### Phase 2: Usage Tracking (Week 2)

**Marketplace:**
- [ ] Implement UsageTracker service
- [ ] Track download events (bandwidth)
- [ ] Track storage costs (monthly cron)
- [ ] Track transaction fees (per sale)
- [ ] Create database schema for cost tracking

**Estimated time:** 6-8 hours

### Phase 3: Pricing Engine (Week 3)

**Marketplace:**
- [ ] Implement PricingEngine service
- [ ] Auto-calculate optimal prices
- [ ] Generate pricing recommendations
- [ ] Create admin dashboard for recommendations
- [ ] Test pricing calculations

**Estimated time:** 8-10 hours

### Phase 4: Cost Transparency UI (Week 4)

**Marketplace:**
- [ ] Create cost breakdown component (React)
- [ ] Show cost transparency on book pages
- [ ] Display pricing history (if prices changed)
- [ ] Add "Why this price?" modal with full breakdown
- [ ] Link to GitHub for verification

**Estimated time:** 6-8 hours

### Phase 5: Dynamic Pricing (Month 2)

**Both systems:**
- [ ] Implement auto-pricing (with admin approval)
- [ ] Add cost alerts for price changes
- [ ] Volume discount automation
- [ ] Real-time cost monitoring
- [ ] Price optimization based on sales data

**Estimated time:** 10-12 hours

---

## Database Schema

```sql
-- Cost tracking for books
CREATE TABLE book_costs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id TEXT NOT NULL,
  brand_id TEXT NOT NULL,

  -- Orchestrator costs
  generation_cost REAL DEFAULT 0,
  generation_breakdown JSON,
  generation_timestamp DATETIME,

  -- Marketplace costs
  storage_cost REAL DEFAULT 0,
  bandwidth_cost REAL DEFAULT 0,
  transaction_fees REAL DEFAULT 0,

  -- Total
  total_cost REAL GENERATED ALWAYS AS (
    generation_cost + storage_cost + bandwidth_cost + transaction_fees
  ) STORED,

  -- Pricing
  current_price REAL,
  target_margin REAL DEFAULT 0.80,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Usage tracking events
CREATE TABLE usage_tracking (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id TEXT NOT NULL,
  event_type TEXT NOT NULL,  -- 'download', 'view', 'preview'
  file_size INTEGER,          -- bytes
  cost_estimate REAL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Transaction costs
CREATE TABLE transaction_costs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id TEXT NOT NULL,
  sale_amount REAL NOT NULL,
  payment_method TEXT,  -- 'stripe', 'crypto', 'direct'
  fee_amount REAL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Revenue tracking
CREATE TABLE revenue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id TEXT NOT NULL,
  sale_id TEXT NOT NULL,
  revenue REAL NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Pricing history
CREATE TABLE pricing_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id TEXT NOT NULL,
  old_price REAL,
  new_price REAL,
  reason TEXT,
  approved_by TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Cost alerts
CREATE TABLE cost_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alert_type TEXT NOT NULL,  -- 'cost_increase', 'cost_decrease'
  service TEXT,               -- 'openai_gpt4', 'aws_s3', etc.
  change_percentage REAL,
  impact_description TEXT,
  resolved BOOLEAN DEFAULT 0,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## Benefits

### For Platform Operators

1. **Cost visibility** - Know exact costs for every book/service
2. **Margin optimization** - Maintain target profit margins automatically
3. **Data-driven pricing** - Price based on real costs, not guesses
4. **Cost alerts** - Get notified when external costs change
5. **Profitability tracking** - See which books/brands are most profitable

### For Brand Owners

1. **Transparent pricing** - Understand exactly what you're paying for
2. **Automatic savings** - Get lower prices when costs decrease
3. **Volume discounts** - Batch operations = lower per-unit costs
4. **Fair pricing** - Prices reflect actual costs + reasonable margin
5. **Verifiable economics** - Can audit costs in open-source code

### For End Users (Book Buyers)

1. **Cost transparency** - See full breakdown of what you're paying for
2. **Fair pricing** - Know you're not being overcharged
3. **Price stability** - Understand why prices change
4. **Value verification** - Compare AI-generated cost vs human-written equivalent
5. **Trust** - Open-source economics builds confidence

---

## Transparency UI Example

**Book page cost breakdown:**

```html
<div class="cost-transparency">
  <h3>💰 Transparent Pricing</h3>
  <p>We believe in honest economics. Here's exactly what you're paying for:</p>

  <div class="cost-item">
    <span class="label">Content Creation (AI)</span>
    <span class="value">$2.50</span>
    <span class="detail">GPT-4: 150K tokens for 45,000-word book</span>
  </div>

  <div class="cost-item">
    <span class="label">Hosting & Delivery</span>
    <span class="value">$0.60</span>
    <span class="detail">Storage + CDN bandwidth for lifetime access</span>
  </div>

  <div class="cost-item">
    <span class="label">Payment Processing</span>
    <span class="value">$0.47</span>
    <span class="detail">Stripe fees (2.9% + $0.30)</span>
  </div>

  <div class="cost-item subtotal">
    <span class="label">Total Costs</span>
    <span class="value">$3.57</span>
  </div>

  <div class="cost-item margin">
    <span class="label">Platform Margin (80%)</span>
    <span class="value">$11.42</span>
    <span class="detail">Ongoing development, support, and improvements</span>
  </div>

  <div class="cost-item total">
    <span class="label">Your Price</span>
    <span class="value">$14.99</span>
  </div>

  <div class="transparency-note">
    <p><strong>Compare to traditional publishing:</strong></p>
    <ul>
      <li>Human writer: $5,000 - $15,000</li>
      <li>Editor: $1,000 - $3,000</li>
      <li>Cover design: $500 - $2,000</li>
      <li>Traditional total: <strong>$6,500+</strong></li>
      <li>Our cost: <strong>$2.50</strong> (99.96% savings!)</li>
    </ul>

    <p>
      <a href="/transparency/verify">🔍 Verify these costs</a> in our open-source code
    </p>
  </div>
</div>
```

---

## Security & Privacy

### What to share publicly

✅ **Safe to show:**
- Aggregate cost per book (after anonymization)
- General pricing formulas
- Cost tracking methodology
- Margin targets (platform-wide)

❌ **Keep private:**
- Exact API keys and credentials
- Individual user purchase data
- Specific vendor pricing details
- Real-time profit margins (could reveal strategy)

### Data protection

- Cost data in webhook payloads → encrypted in transit (HTTPS)
- Cost database → encrypted at rest
- Admin-only access to detailed cost breakdowns
- Public API only shows anonymized, aggregated data

---

## Next Steps

1. **Design approval** - Review this architecture
2. **Phase 1 implementation** - Basic cost tracking (4-6 hours)
3. **Test with real data** - Track costs for 10 books
4. **Iterate** - Adjust based on real cost patterns
5. **Phase 2+** - Roll out advanced features

---

## The Bottom Line

**Current state:** Static pricing with no cost visibility

**Proposed state:**
- Full cost transparency
- Dynamic pricing optimization
- Automatic savings passed to customers
- Verifiable economics (open-source)

**Why this matters:**
- **Platform:** Optimize margins, detect cost changes early
- **Brand owners:** Fair pricing, volume discounts
- **Users:** Trust through transparency, fair prices

**Alignment with philosophy:**
- Radical transparency (not just metrics, but economics too!)
- Open-source verification
- Fair value exchange
- Customer-first pricing

---

**This is economics as code.**
**Transparent. Verifiable. Optimized.**
**Just like the rest of the platform.**

🚀
