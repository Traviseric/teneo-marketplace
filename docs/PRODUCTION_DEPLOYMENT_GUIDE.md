# 🚀 Production Deployment Guide

This guide will help you replace demo content with your real books and launch your marketplace.

## 📋 Quick Start Checklist

- [ ] Replace demo books with real books
- [ ] Add book covers to assets folder
- [ ] Update catalog.json with real data
- [ ] Configure production environment
- [ ] Set up Stripe live keys
- [ ] Test all functionality
- [ ] Optimize for SEO
- [ ] Go live!

## 📚 Step 1: Replace Demo Books with Real Books

### 1.1 Prepare Your Book Assets

Create this folder structure for your brand:
```
marketplace/frontend/brands/teneo/assets/
├── covers/
│   ├── book1-cover.jpg
│   ├── book2-cover.jpg
│   └── ...
├── previews/
│   ├── book1-preview.pdf
│   ├── book2-preview.pdf
│   └── ...
└── full/
    ├── book1-full.pdf
    ├── book2-full.pdf
    └── ...
```

### 1.2 Book Cover Requirements

**Recommended Specifications:**
- **Format**: JPG or PNG
- **Size**: 400x600 pixels (2:3 aspect ratio)
- **File Size**: Under 500KB for fast loading
- **Quality**: High resolution for crisp display
- **Naming**: Use book ID (e.g., `advanced-ai-consciousness-cover.jpg`)

**Image Optimization Tips:**
```bash
# Using ImageMagick to resize and optimize
convert original-cover.jpg -resize 400x600^ -quality 85 book-cover.jpg

# Using online tools:
# - TinyPNG.com for compression
# - Canva.com for design
# - Remove.bg for background removal
```

### 1.3 Add Book Covers to Assets Folder

1. Create the assets directory structure:
```bash
mkdir -p marketplace/frontend/brands/teneo/assets/covers
mkdir -p marketplace/frontend/brands/teneo/assets/previews
mkdir -p marketplace/frontend/brands/teneo/assets/full
```

2. Copy your book covers:
```bash
cp your-book-covers/* marketplace/frontend/brands/teneo/assets/covers/
```

3. Verify covers are accessible:
```bash
ls -la marketplace/frontend/brands/teneo/assets/covers/
```

## 📖 Step 2: Update catalog.json with Real Book Data

### 2.1 Current Demo Data Structure

The current `marketplace/frontend/brands/teneo/catalog.json` contains demo books. Here's the structure:

```json
{
  "brand": "teneo",
  "name": "Teneo Books",
  "description": "Knowledge Beyond Boundaries™",
  "books": [
    {
      "id": "advanced-ai-consciousness",
      "title": "Advanced AI Consciousness",
      "author": "Dr. Sarah Chen",
      "description": "A groundbreaking exploration...",
      "price": 29.99,
      "originalPrice": 39.99,
      "coverImage": "/brands/teneo/assets/covers/advanced-ai-consciousness-cover.jpg",
      "format": ["ebook", "audiobook"],
      "badge": "Bestseller",
      "rating": 4.8,
      "pages": 324,
      "category": "Technology",
      "currency": "USD"
    }
  ],
  "collections": [...]
}
```

### 2.2 Replace with Your Real Books

1. **Backup current catalog:**
```bash
cp marketplace/frontend/brands/teneo/catalog.json marketplace/frontend/brands/teneo/catalog.backup.json
```

2. **Update the catalog.json file:**
```json
{
  "brand": "teneo",
  "name": "Your Brand Name",
  "description": "Your brand tagline",
  "books": [
    {
      "id": "your-book-1",
      "title": "Your Book Title",
      "author": "Your Name",
      "description": "Compelling description of your book that sells the value and benefits to readers...",
      "price": 19.99,
      "originalPrice": 24.99,
      "coverImage": "/brands/teneo/assets/covers/your-book-1-cover.jpg",
      "format": ["ebook"],
      "badge": "New Release",
      "rating": 5.0,
      "pages": 200,
      "category": "Your Category",
      "currency": "USD",
      "seo": {
        "title": "Your Book Title - Full SEO Title",
        "description": "SEO description under 160 characters that includes keywords",
        "keywords": ["keyword1", "keyword2", "keyword3"],
        "canonicalUrl": "https://yourdomain.com/books/your-book-1"
      }
    }
  ],
  "collections": []
}
```

### 2.3 Book Data Fields Reference

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `id` | ✅ | string | Unique identifier (url-friendly) |
| `title` | ✅ | string | Book title |
| `author` | ✅ | string | Author name |
| `description` | ✅ | string | Book description (HTML allowed) |
| `price` | ✅ | number | Current price |
| `originalPrice` | ❌ | number | Original price (for sales) |
| `coverImage` | ✅ | string | Path to cover image |
| `format` | ✅ | array | Available formats: ["ebook", "audiobook", "print"] |
| `badge` | ❌ | string | Display badge: "Bestseller", "New", "Limited" |
| `rating` | ❌ | number | Rating (1-5) |
| `pages` | ❌ | number | Number of pages |
| `category` | ❌ | string | Book category |
| `currency` | ✅ | string | Currency code ("USD", "EUR", etc.) |
| `seo` | ❌ | object | SEO metadata |

### 2.4 Using the Book Manager

Alternatively, use the built-in book manager:

1. Go to `http://localhost:3001/manage-books.html`
2. Login with password: `admin123`
3. Click "Add New Book"
4. Fill in your book details
5. Upload cover image
6. Save changes

## 🎨 Step 3: Asset Management

### 3.1 Create Assets Folder Structure

```bash
# Create all necessary folders
mkdir -p marketplace/frontend/brands/teneo/assets/{covers,previews,full,thumbnails}
```

### 3.2 Organize Your Assets

**Covers Folder** (`/assets/covers/`)
- High-quality book covers
- 400x600 pixels
- Under 500KB each

**Previews Folder** (`/assets/previews/`)
- Sample chapters or previews
- PDF format
- 2-5 pages maximum

**Full Folder** (`/assets/full/`)
- Complete book files
- PDF format
- Password protected or token-based access

**Thumbnails Folder** (`/assets/thumbnails/`)
- Small preview images
- 200x300 pixels
- For quick loading

### 3.3 Update Static File Serving

The server already serves static files from the brands folder. Verify in `marketplace/backend/server.js`:

```javascript
// Static files
app.use(express.static(path.join(__dirname, '../frontend')));
```

## 🔧 Step 4: Production Environment Setup

### 4.1 Update Environment Variables

Edit your `.env` file:

```env
# Production Settings
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://yourdomain.com

# Stripe Live Keys (replace with your live keys)
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_LIVE_WEBHOOK_SECRET

# Database
DATABASE_PATH=./marketplace/backend/database/orders.db

# Security
ADMIN_PASSWORD=your_secure_admin_password

# Email (for order confirmations)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### 4.2 Stripe Configuration

1. **Get Live Keys:**
   - Go to [Stripe Dashboard](https://dashboard.stripe.com)
   - Switch to "Live mode"
   - Copy your live keys

2. **Set up Webhooks:**
   - Create webhook endpoint: `https://yourdomain.com/api/webhook`
   - Select events: `checkout.session.completed`
   - Copy webhook secret

3. **Test Payments:**
   - Use real payment methods
   - Verify webhook delivery
   - Check order processing

### 4.3 Security Hardening

**Change Default Passwords:**
```bash
# Generate secure admin password
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

**Enable HTTPS:**
```javascript
// Add to server.js for production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}
```

## 🔍 Step 5: SEO Optimization

### 5.1 Add SEO Meta Tags

Update `marketplace/frontend/index.html`:

```html
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- SEO Meta Tags -->
  <title>Your Bookstore - Quality Books Online</title>
  <meta name="description" content="Discover quality books on [your topics]. Download instantly and start reading today.">
  <meta name="keywords" content="books, ebooks, [your keywords]">
  <meta name="author" content="Your Name">
  
  <!-- Open Graph -->
  <meta property="og:title" content="Your Bookstore">
  <meta property="og:description" content="Quality books on [your topics]">
  <meta property="og:image" content="/brands/teneo/assets/covers/featured-book.jpg">
  <meta property="og:url" content="https://yourdomain.com">
  <meta property="og:type" content="website">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Your Bookstore">
  <meta name="twitter:description" content="Quality books on [your topics]">
  <meta name="twitter:image" content="/brands/teneo/assets/covers/featured-book.jpg">
  
  <!-- Canonical URL -->
  <link rel="canonical" href="https://yourdomain.com">
  
  <!-- Structured Data -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BookStore",
    "name": "Your Bookstore",
    "url": "https://yourdomain.com",
    "description": "Quality books on [your topics]",
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "US"
    }
  }
  </script>
</head>
```

### 5.2 Individual Book SEO

Update `marketplace/frontend/js/marketplace.js` to include book-specific SEO:

```javascript
function updateBookSEO(book) {
  // Update page title
  document.title = `${book.title} by ${book.author} - Your Bookstore`;
  
  // Update meta description
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    metaDesc.content = book.description.substring(0, 160) + '...';
  }
  
  // Update Open Graph
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.content = book.title;
  
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.content = book.description.substring(0, 160) + '...';
  
  const ogImage = document.querySelector('meta[property="og:image"]');
  if (ogImage) ogImage.content = book.coverImage;
  
  // Add structured data for book
  const bookSchema = {
    "@context": "https://schema.org",
    "@type": "Book",
    "name": book.title,
    "author": {
      "@type": "Person",
      "name": book.author
    },
    "description": book.description,
    "image": book.coverImage,
    "offers": {
      "@type": "Offer",
      "price": book.price,
      "priceCurrency": book.currency || "USD",
      "availability": "https://schema.org/InStock"
    }
  };
  
  // Add to page
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.text = JSON.stringify(bookSchema);
  document.head.appendChild(script);
}
```

### 5.3 Performance Optimization

**Image Optimization:**
```javascript
// Add lazy loading to images
function optimizeImages() {
  const images = document.querySelectorAll('img[data-src]');
  
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.classList.remove('lazy');
        observer.unobserve(img);
      }
    });
  });
  
  images.forEach(img => imageObserver.observe(img));
}
```

**Compress Assets:**
```bash
# Install compression tools
npm install compression --save

# Add to server.js
const compression = require('compression');
app.use(compression());
```

## 🚀 Step 6: Go-Live Checklist

### 6.1 Pre-Launch Testing

- [ ] **Books Display Correctly**
  - [ ] All book covers load
  - [ ] Descriptions are accurate
  - [ ] Prices are correct
  - [ ] Categories work

- [ ] **Shopping Cart Functions**
  - [ ] Add to cart works
  - [ ] Remove from cart works
  - [ ] Quantity updates work
  - [ ] Total calculates correctly

- [ ] **Checkout Process**
  - [ ] Stripe integration works
  - [ ] Test payments process
  - [ ] Order confirmation emails sent
  - [ ] Download links work

- [ ] **Admin Panel**
  - [ ] Login works with new password
  - [ ] Book manager functions
  - [ ] CSV import works
  - [ ] Backup/restore works

### 6.2 Performance Testing

- [ ] **Page Speed**
  - [ ] Homepage loads under 3 seconds
  - [ ] Book pages load under 2 seconds
  - [ ] Images optimized and compressed
  - [ ] Mobile performance tested

- [ ] **Load Testing**
  - [ ] Test with 10+ concurrent users
  - [ ] Cart handles multiple users
  - [ ] Database performs well
  - [ ] Server doesn't crash

### 6.3 SEO Readiness

- [ ] **Meta Tags**
  - [ ] All pages have titles
  - [ ] All pages have descriptions
  - [ ] Open Graph tags set
  - [ ] Twitter Cards configured

- [ ] **Structured Data**
  - [ ] Book schema implemented
  - [ ] BookStore schema added
  - [ ] Test with Google's Rich Results Test

- [ ] **Technical SEO**
  - [ ] SSL certificate installed
  - [ ] Robots.txt created
  - [ ] Sitemap.xml generated
  - [ ] 404 pages handled

### 6.4 Final Launch Steps

1. **Domain Setup**
   ```bash
   # Point domain to your server
   # Set up DNS records
   # Configure SSL certificate
   ```

2. **Server Configuration**
   ```bash
   # Set NODE_ENV=production
   # Update FRONTEND_URL
   # Configure process manager (PM2)
   ```

3. **Monitoring Setup**
   ```bash
   # Set up error logging
   # Configure uptime monitoring
   # Set up analytics tracking
   ```

4. **Backup Strategy**
   ```bash
   # Automated database backups
   # Asset file backups
   # Configuration backups
   ```

### 6.5 Post-Launch Monitoring

- [ ] **Health Checks**
  - [ ] Server uptime monitoring
  - [ ] Payment processing monitoring
  - [ ] Error rate monitoring
  - [ ] Performance monitoring

- [ ] **Analytics**
  - [ ] Google Analytics setup
  - [ ] Sales tracking
  - [ ] User behavior analysis
  - [ ] Conversion rate monitoring

## 📞 Support & Troubleshooting

### Common Issues

**Book covers not loading:**
- Check file paths in catalog.json
- Verify assets folder permissions
- Ensure images are under 500KB

**Stripe payments failing:**
- Verify live keys are correct
- Check webhook endpoint
- Test with different payment methods

**Admin panel not accessible:**
- Verify ADMIN_PASSWORD in .env
- Check Basic Auth implementation
- Clear browser cache

### Getting Help

- **Documentation**: Check `/docs` folder
- **Issues**: Create GitHub issue
- **Community**: Join Discord server
- **Email**: support@yourdomain.com

---

## 🎉 Congratulations!

Your Teneo Marketplace is now ready for production! You've successfully:

✅ Replaced demo content with real books  
✅ Optimized for SEO and performance  
✅ Set up secure payment processing  
✅ Created a professional bookstore  

**Next Steps:**
- Monitor your first sales
- Gather customer feedback
- Add more books to your catalog
- Join the Teneo Network for increased visibility

Happy selling! 🚀📚