# Configuration Guide

Complete reference for all environment variables and configuration options.

## Environment Variables

Create a `.env` file in the backend directory with these settings:

### Server Configuration

```env
# Server port (default: 3000)
PORT=3000

# Environment: development, production
NODE_ENV=production

# Session secret (generate a random string)
SESSION_SECRET=your-random-session-secret-change-this
```

### Branding & Customization

```env
# Store branding
MARKETPLACE_NAME=My Digital Bookstore
MARKETPLACE_TAGLINE=Your favorite books, instantly delivered
MARKETPLACE_LOGO_URL=/images/logo.png

# Contact information
SUPPORT_EMAIL=support@yourdomain.com
CONTACT_EMAIL=hello@yourdomain.com
CONTACT_PHONE=+1-234-567-8900

# Social media (optional)
SOCIAL_TWITTER=https://twitter.com/yourstore
SOCIAL_FACEBOOK=https://facebook.com/yourstore
SOCIAL_INSTAGRAM=https://instagram.com/yourstore
```

### Email Configuration

```env
# SMTP settings for order notifications
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password

# Email branding
EMAIL_FROM_NAME=My Bookstore
EMAIL_FROM_ADDRESS=noreply@yourdomain.com

# Email templates (optional)
EMAIL_TEMPLATE_HEADER_COLOR=#4F46E5
EMAIL_TEMPLATE_FOOTER_TEXT=Thank you for your purchase!
```

### Payment Processing (Stripe)

```env
# Stripe API keys
STRIPE_PUBLISHABLE_KEY=pk_test_51ABC...
STRIPE_SECRET_KEY=sk_test_51ABC...

# Stripe webhook (for production)
STRIPE_WEBHOOK_SECRET=whsec_...

# Currency settings
CURRENCY=USD
CURRENCY_SYMBOL=$
```

### Database Configuration

```env
# SQLite (default)
DATABASE_TYPE=sqlite
DATABASE_PATH=./database/marketplace.db

# PostgreSQL (optional, for production)
DATABASE_TYPE=postgres
DATABASE_URL=postgresql://user:pass@localhost:5432/marketplace
```

### Security Settings

```env
# Admin authentication
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2b$10$... # Use bcrypt to generate

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100  # per window

# CORS (for API access)
CORS_ORIGIN=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

### File Storage

```env
# Upload limits
MAX_FILE_SIZE_MB=50
ALLOWED_FILE_TYPES=.pdf,.epub

# Storage paths
UPLOAD_DIR=./uploads
BOOKS_DIR=./uploads/books
PREVIEWS_DIR=./uploads/previews
TEMP_DIR=./uploads/temp
```

### Feature Flags

```env
# Enable/disable features
ENABLE_PREVIEWS=true
ENABLE_EMAIL_NOTIFICATIONS=true
ENABLE_ANALYTICS=false
ENABLE_REVIEWS=false
ENABLE_WISHLISTS=false
ENABLE_API=false

# Business rules
ALLOW_FREE_BOOKS=true
MINIMUM_PRICE=0.99
MAXIMUM_PRICE=999.99
PREVIEW_PAGE_LIMIT=10
```

### Analytics (Optional)

```env
# Google Analytics
GOOGLE_ANALYTICS_ID=UA-XXXXX-Y

# Custom analytics endpoint
ANALYTICS_ENDPOINT=https://analytics.yourdomain.com/track
```

### API Configuration (Optional)

```env
# Enable API access
API_ENABLED=true
API_RATE_LIMIT=1000  # requests per hour

# API authentication
API_KEY_HEADER=X-API-Key
```

## Configuration Files

### Frontend Configuration

Edit `frontend/config.js`:

```javascript
const config = {
  // API endpoint
  API_URL: window.location.origin,
  
  // Stripe public key
  STRIPE_KEY: 'pk_test_...',
  
  // UI settings
  ITEMS_PER_PAGE: 12,
  SHOW_PRICES_WITH_TAX: false,
  
  // Feature flags
  ENABLE_SEARCH: true,
  ENABLE_CATEGORIES: true,
  ENABLE_SORT: true
};
```

### Email Templates

Customize email templates in `backend/templates/`:

- `order-confirmation.html` - Sent after purchase
- `download-link.html` - Contains secure download link
- `welcome.html` - For new subscribers

### Custom Styling

Edit `frontend/css/custom.css`:

```css
:root {
  /* Brand colors */
  --primary-color: #4F46E5;
  --secondary-color: #7C3AED;
  
  /* Typography */
  --font-family: 'Inter', sans-serif;
  --heading-font: 'Poppins', sans-serif;
  
  /* Layout */
  --max-width: 1200px;
  --border-radius: 8px;
}
```

## Advanced Configuration

### Multi-language Support

```env
# Default language
DEFAULT_LANGUAGE=en

# Supported languages
SUPPORTED_LANGUAGES=en,es,fr,de
```

### CDN Configuration

```env
# Static asset CDN
CDN_URL=https://cdn.yourdomain.com
CDN_ENABLED=true
```

### Backup Settings

```env
# Automated backups
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *  # 2 AM daily
BACKUP_RETENTION_DAYS=30
BACKUP_LOCATION=./backups
```

### Performance Tuning

```env
# Caching
CACHE_ENABLED=true
CACHE_TTL=3600  # 1 hour

# Database
DB_CONNECTION_POOL_SIZE=10
DB_QUERY_TIMEOUT=5000  # 5 seconds
```

## Environment-Specific Settings

### Development (.env.development)

```env
NODE_ENV=development
DEBUG=true
VERBOSE_ERRORS=true
MOCK_PAYMENTS=true
```

### Production (.env.production)

```env
NODE_ENV=production
DEBUG=false
VERBOSE_ERRORS=false
FORCE_HTTPS=true
SECURE_COOKIES=true
```

### Testing (.env.test)

```env
NODE_ENV=test
DATABASE_PATH=:memory:
MOCK_EMAIL=true
MOCK_PAYMENTS=true
```

## Validation

The marketplace validates configuration on startup. Check logs for:

- Missing required variables
- Invalid values
- Deprecated settings

## Best Practices

1. **Security**
   - Never commit `.env` files
   - Use strong, unique passwords
   - Rotate secrets regularly

2. **Performance**
   - Enable caching in production
   - Use CDN for static assets
   - Optimize database queries

3. **Monitoring**
   - Set up error logging
   - Monitor payment failures
   - Track conversion rates

4. **Backups**
   - Regular database backups
   - Test restore procedures
   - Store backups offsite