# Information Asymmetry Backend - Implementation Plan

## 🎯 Mission
Deploy censorship-resistant marketplace for the 40 "Backend Only" books from the Book Impact Matrix.

---

## 📊 Content Strategy

### What Goes on Backend Marketplace

**NOT the Amazon books (Tier 1-3)** - Those go to Amazon KDP

**ONLY the Backend Books:**
- Books 101-120: Institutional Crime Exposure
- Books 136-140: Individual Criminal Tactics
- Books 141-150: The Foundation Layer

**Total:** 40 books, $97-$297 pricing, crypto-only

---

## 🏗️ Brand Configuration

### Create New Brand: `information_asymmetry`

```bash
# Location
marketplace/frontend/brands/information_asymmetry/

# Files needed
├── config.json (brand settings)
├── catalog.json (40 backend books)
├── assets/
│   ├── covers/ (book cover images)
│   └── logo.png
└── pdfs/ (book files)
```

### config.json
```json
{
  "brand": "information_asymmetry",
  "name": "Asymmetry Books",
  "tagline": "Information They Don't Want You to Have",
  "description": "Uncensored books exposing institutional crime and systemic control. What Amazon refuses to publish.",

  "theme": {
    "primaryColor": "#0A0A0A",
    "secondaryColor": "#FF3B30",
    "accentColor": "#FFD60A",
    "backgroundColor": "#FFFFFF",
    "textColor": "#1C1C1E",
    "font": "system-ui, -apple-system, sans-serif"
  },

  "features": {
    "enableStripe": false,
    "enableCrypto": true,
    "cryptoOnly": true,
    "showReviews": false,
    "requireAgeVerification": true,
    "requireInformedConsent": true,
    "enableSharing": false
  },

  "payments": {
    "bitcoin": {
      "enabled": true,
      "address": "bc1q...",
      "network": "mainnet"
    },
    "lightning": {
      "enabled": true,
      "address": "lnbc..."
    },
    "monero": {
      "enabled": true,
      "address": "4..."
    }
  },

  "legal": {
    "disclaimer": "All content is provided for educational and informational purposes only. This material exposes criminal tactics and systemic fraud for victim protection and informed consent. It is not instructional and does not promote illegal activity.",
    "ageVerification": "You must be 18+ and acknowledge the educational nature of this content.",
    "jurisdictionWarning": "Content may be controversial. By purchasing, you acknowledge this is for personal education only."
  },

  "contact": {
    "email": "info@asymmetrybooks.com",
    "pgp": "public-key-here",
    "telegram": "@asymmetrybooks",
    "sessionID": "session-messenger-id"
  },

  "social": {
    "showSocial": false,
    "twitter": null,
    "facebook": null
  },

  "branding": {
    "logo": "/brands/information_asymmetry/assets/logo.png",
    "favicon": "/brands/information_asymmetry/assets/favicon.ico",
    "aboutText": "We publish the books that challenge power. Our content exposes institutional crime, documents systemic control, and provides complete truth for those ready to see it. No false hope. No gatekeepers. No censorship."
  }
}
```

### catalog.json Structure

```json
{
  "brand": "information_asymmetry",
  "name": "Asymmetry Books Catalog",
  "description": "Uncensored truth Amazon won't publish",

  "collections": [
    {
      "id": "institutional-crime",
      "name": "Institutional Crime Exposure",
      "description": "How hospitals, banks, pharma companies, and insurance firms systematically defraud you",
      "tier": 2,
      "books": ["book-101", "book-102", ...]
    },
    {
      "id": "criminal-tactics",
      "name": "Know Your Enemy Series",
      "description": "Individual criminal tactics exposed for victim protection",
      "tier": 2,
      "books": ["book-136", "book-137", ...]
    },
    {
      "id": "foundation-layer",
      "name": "The Foundation Layer",
      "description": "No false hope. The complete truth about systemic control.",
      "tier": 3,
      "prerequisite": "Complete 5+ books from previous tiers",
      "books": ["book-141", "book-142", ...]
    }
  ],

  "books": [
    {
      "id": "book-101",
      "title": "Hospital Billing Fraud: The Full Exposure",
      "author": "Information Asymmetry Series",
      "description": "How hospitals systematically defraud patients through chargemaster pricing, upcoding, and unbundling. Named institutions. Full exposure.",
      "longDescription": "The Amazon version told you how to protect yourself. This version names the institutions, documents the schemes, and exposes the full scope of medical billing fraud. From for-profit hospital corporations to specific billing tactics, nothing is held back.",

      "tier": 2,
      "category": "Institutional Crime",
      "collection": "institutional-crime",

      "price": 97,
      "priceBTC": "0.0015",
      "priceXMR": "0.65",
      "currency": "USD",

      "format": ["digital"],
      "pages": 187,
      "fileSize": "2.3 MB",

      "coverImage": "/brands/information_asymmetry/assets/covers/book-101.jpg",
      "digitalFile": "/brands/information_asymmetry/pdfs/book-101.pdf",

      "contentWarnings": [
        "Exposes institutional fraud",
        "Names specific corporations",
        "Documents criminal tactics"
      ],

      "prerequisites": null,
      "recommendedReading": ["book-102", "book-103"],

      "disclaimer": "This book exposes criminal fraud for educational and victim protection purposes. It is not instructional. All information is documented from public records, Senate reports, and court filings.",

      "metadata": {
        "publishDate": "2025-01",
        "lastUpdated": "2025-01",
        "version": "1.0",
        "citations": 247,
        "sources": ["Senate Finance Committee Reports", "Court Records", "Whistleblower Testimonies"]
      }
    },

    {
      "id": "book-141",
      "title": "The Corporate Plantation: What the United States Actually Is",
      "tier": 3,
      "category": "Foundation Layer",
      "collection": "foundation-layer",
      "price": 197,
      "priceBTC": "0.003",
      "prerequisites": ["Complete 5+ Tier 2 books", "Explicit informed consent"],
      "contentWarnings": [
        "No false hope provided",
        "Extremely dark systemic truths",
        "May fundamentally alter worldview",
        "Not for general audience"
      ],
      "ageGate": true,
      "consentRequired": true,
      "description": "The complete truth about what the United States actually is. No comfort. No hope. Just documented reality for those ready to see the cage.",
      "digitalFile": "/brands/information_asymmetry/pdfs/book-141.pdf"
    }
  ]
}
```

---

## 🔧 Technical Implementation

### 1. Crypto Checkout Flow

**Replace:** `marketplace/backend/routes/checkout.js`
**With:** `marketplace/backend/routes/cryptoCheckout.js`

```javascript
// marketplace/backend/routes/cryptoCheckout.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../database/database');

// Generate unique order ID
function generateOrderId() {
    return 'ORD-' + crypto.randomBytes(16).toString('hex');
}

// Create pending order
router.post('/create-order', async (req, res) => {
    try {
        const { bookId, email, paymentMethod } = req.body;

        // Get book details
        const book = await db.get(
            'SELECT * FROM books WHERE id = ?',
            [bookId]
        );

        if (!book) {
            return res.status(404).json({ error: 'Book not found' });
        }

        // Generate unique order
        const orderId = generateOrderId();
        const paymentAddress = getPaymentAddress(paymentMethod);
        const amount = getAmount(book.price, paymentMethod);

        // Store pending order
        await db.run(`
            INSERT INTO crypto_orders (
                order_id, book_id, email, payment_method,
                payment_address, amount_expected, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
        `, [orderId, bookId, email, paymentMethod, paymentAddress, amount]);

        res.json({
            success: true,
            orderId,
            paymentMethod,
            address: paymentAddress,
            amount,
            book: {
                title: book.title,
                price: book.price
            }
        });

    } catch (error) {
        console.error('Order creation error:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

// Verify payment (manual for MVP, automated with BTCPay later)
router.post('/verify-payment', async (req, res) => {
    try {
        const { orderId, transactionId } = req.body;

        // Admin verifies transaction manually
        // TODO: Integrate BTCPay Server webhooks for automation

        const order = await db.get(
            'SELECT * FROM crypto_orders WHERE order_id = ?',
            [orderId]
        );

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Mark as paid (manual verification for MVP)
        await db.run(`
            UPDATE crypto_orders
            SET status = 'paid',
                transaction_id = ?,
                paid_at = CURRENT_TIMESTAMP
            WHERE order_id = ?
        `, [transactionId, orderId]);

        // Generate download token
        const downloadToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        await db.run(`
            INSERT INTO download_tokens (
                token, order_id, book_id, email, expires_at, downloads_remaining
            ) VALUES (?, ?, ?, ?, ?, 10)
        `, [downloadToken, orderId, order.book_id, order.email, expiresAt]);

        res.json({
            success: true,
            downloadToken,
            downloadUrl: `/api/download/${downloadToken}`
        });

    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({ error: 'Failed to verify payment' });
    }
});

// Helper functions
function getPaymentAddress(method) {
    const addresses = {
        'bitcoin': process.env.BTC_ADDRESS,
        'lightning': process.env.LIGHTNING_ADDRESS,
        'monero': process.env.XMR_ADDRESS
    };
    return addresses[method];
}

function getAmount(usdPrice, method) {
    // For MVP, return static crypto amounts
    // TODO: Integrate real-time price conversion API
    const rates = {
        'bitcoin': 0.0015, // ~$97 at $64k BTC
        'lightning': 0.0015,
        'monero': 0.65 // ~$97 at $150 XMR
    };
    return rates[method];
}

module.exports = router;
```

### 2. Database Schema Updates

```sql
-- marketplace/backend/database/schema-crypto.sql

CREATE TABLE IF NOT EXISTS crypto_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT UNIQUE NOT NULL,
    book_id TEXT NOT NULL,
    email TEXT NOT NULL,
    payment_method TEXT NOT NULL, -- 'bitcoin', 'lightning', 'monero'
    payment_address TEXT NOT NULL,
    amount_expected TEXT NOT NULL,
    transaction_id TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'expired'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (datetime('now', '+24 hours'))
);

CREATE TABLE IF NOT EXISTS download_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT UNIQUE NOT NULL,
    order_id TEXT NOT NULL,
    book_id TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    downloads_remaining INTEGER DEFAULT 10,
    last_download_at TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES crypto_orders(order_id)
);

CREATE TABLE IF NOT EXISTS age_verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT
);

CREATE TABLE IF NOT EXISTS informed_consents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    book_id TEXT NOT NULL,
    tier INTEGER NOT NULL,
    consented_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    UNIQUE(email, book_id)
);
```

### 3. Frontend Crypto Checkout Page

```html
<!-- marketplace/frontend/crypto-checkout.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Crypto Checkout - Asymmetry Books</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: system-ui, -apple-system, sans-serif;
            background: #0A0A0A;
            color: #FFFFFF;
            line-height: 1.6;
        }
        .container {
            max-width: 600px;
            margin: 40px auto;
            padding: 20px;
        }
        .warning-box {
            background: #FF3B30;
            color: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .book-details {
            background: #1C1C1E;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .payment-method {
            background: #2C2C2E;
            padding: 15px;
            margin: 10px 0;
            border-radius: 8px;
            cursor: pointer;
            border: 2px solid transparent;
        }
        .payment-method:hover {
            border-color: #FFD60A;
        }
        .payment-method.selected {
            border-color: #FFD60A;
            background: #3A3A3C;
        }
        .payment-address {
            background: #000;
            padding: 15px;
            border-radius: 4px;
            font-family: monospace;
            word-break: break-all;
            margin: 15px 0;
        }
        .qr-code {
            text-align: center;
            padding: 20px;
        }
        button {
            background: #FFD60A;
            color: #000;
            border: none;
            padding: 15px 30px;
            border-radius: 8px;
            font-weight: bold;
            cursor: pointer;
            width: 100%;
            font-size: 16px;
        }
        button:hover {
            background: #FFC700;
        }
        .instructions {
            background: #1C1C1E;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
        }
        .instructions ol {
            margin-left: 20px;
        }
        .instructions li {
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Complete Your Purchase</h1>

        <div class="warning-box">
            <strong>⚠️ Educational Content Disclaimer</strong>
            <p>This content exposes institutional fraud and criminal tactics for educational purposes only. By proceeding, you acknowledge this material is for informed consent and victim protection, not instruction.</p>
        </div>

        <div class="book-details" id="book-details">
            <!-- Populated by JavaScript -->
        </div>

        <h2>Select Payment Method</h2>

        <div class="payment-method" data-method="bitcoin">
            <h3>₿ Bitcoin</h3>
            <p>On-chain payment • Confirmation in ~10-60 min</p>
            <p class="price" id="btc-price"></p>
        </div>

        <div class="payment-method" data-method="lightning">
            <h3>⚡ Lightning Network</h3>
            <p>Instant payment • Low fees</p>
            <p class="price" id="ln-price"></p>
        </div>

        <div class="payment-method" data-method="monero">
            <h3>🔒 Monero</h3>
            <p>Maximum privacy • Untraceable</p>
            <p class="price" id="xmr-price"></p>
        </div>

        <div id="payment-details" style="display: none;">
            <h2>Payment Instructions</h2>

            <div class="payment-address">
                <p><strong>Send to:</strong></p>
                <div id="address"></div>
                <button onclick="copyAddress()">Copy Address</button>
            </div>

            <div class="qr-code" id="qr-code">
                <!-- QR code generated here -->
            </div>

            <div class="instructions">
                <h3>How to Complete Payment:</h3>
                <ol>
                    <li>Send <strong id="amount"></strong> to the address above</li>
                    <li>Email proof of transaction to: <strong>orders@asymmetrybooks.com</strong></li>
                    <li>Include your order ID: <strong id="order-id"></strong></li>
                    <li>Download link sent within 1-24 hours after verification</li>
                </ol>
                <p><strong>Important:</strong> Send exact amount. Incorrect amounts may delay processing.</p>
            </div>
        </div>
    </div>

    <script>
        // Payment method selection
        document.querySelectorAll('.payment-method').forEach(method => {
            method.addEventListener('click', () => {
                document.querySelectorAll('.payment-method').forEach(m =>
                    m.classList.remove('selected')
                );
                method.classList.add('selected');

                const paymentMethod = method.dataset.method;
                createOrder(paymentMethod);
            });
        });

        async function createOrder(paymentMethod) {
            const bookId = new URLSearchParams(window.location.search).get('book');
            const email = prompt('Enter your email for order confirmation:');

            if (!email) return;

            const response = await fetch('/api/crypto/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookId, email, paymentMethod })
            });

            const data = await response.json();

            if (data.success) {
                document.getElementById('payment-details').style.display = 'block';
                document.getElementById('address').textContent = data.address;
                document.getElementById('amount').textContent = data.amount;
                document.getElementById('order-id').textContent = data.orderId;

                // Generate QR code (use library like qrcodejs)
                // generateQR(data.address, data.amount);
            }
        }

        function copyAddress() {
            const address = document.getElementById('address').textContent;
            navigator.clipboard.writeText(address);
            alert('Address copied to clipboard!');
        }
    </script>
</body>
</html>
```

---

## 🚀 Deployment Checklist

### Pre-Launch
- [ ] VPS secured (Njalla/FlokiNET)
- [ ] Domain registered (asymmetrybooks.com)
- [ ] Cloudflare configured
- [ ] SSL certificates installed
- [ ] Crypto wallets created (BTC, XMR)
- [ ] Payment addresses added to .env

### Content Preparation
- [ ] 40 book PDFs ready
- [ ] Cover images designed
- [ ] Catalog.json populated
- [ ] Descriptions written
- [ ] Content warnings added
- [ ] Disclaimers finalized

### Technical Setup
- [ ] Marketplace deployed via Docker
- [ ] Crypto checkout routes added
- [ ] Database schema updated
- [ ] Age verification implemented
- [ ] Informed consent flow tested
- [ ] Download token system working
- [ ] Tor hidden service configured

### Separation & Security
- [ ] All Teneo branding removed
- [ ] Separate email domain (asymmetrybooks.com)
- [ ] Neutral landing page created
- [ ] teneo.io/revolution redirect configured
- [ ] Backups automated
- [ ] Admin access separated

### Launch
- [ ] Test full purchase flow
- [ ] Verify PDF downloads
- [ ] Test on Tor (.onion)
- [ ] Soft launch to test group
- [ ] Monitor for issues
- [ ] Iterate based on feedback

---

## 🎯 Success Metrics

### Technical
- Uptime > 99%
- PDF download success rate > 95%
- Crypto payment verification < 24 hours
- Tor accessibility 100%

### Business
- First 10 sales (validate market)
- Average order value $97-197
- Customer satisfaction (qualitative feedback)
- Zero takedown attempts survived

---

## 📞 Next Steps

1. **Immediate:** Set up infrastructure (VPS, domain, wallets)
2. **Week 1:** Deploy marketplace with crypto checkout
3. **Week 2:** Upload first 10 books, test thoroughly
4. **Week 3:** Soft launch, iterate, scale

This is how you build the uncensorable library. Let's fucking do this.
