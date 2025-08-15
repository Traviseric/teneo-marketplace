# Basic Bookstore Example

This example shows the minimal configuration needed to run a Book Marketplace.

## Features

- ✅ Book catalog display
- ✅ Stripe payment processing
- ✅ Digital downloads
- ❌ Email notifications (disabled)
- ❌ Book previews (disabled)
- ❌ Analytics (disabled)
- ❌ Federation network (disabled)

## Quick Start

1. Copy this configuration:
   ```bash
   cp -r examples/basic-bookstore/* .
   ```

2. Create `.env` file:
   ```env
   PORT=3001
   MARKETPLACE_NAME=Simple Books
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   ```

3. Start the server:
   ```bash
   npm start
   ```

## Use Case

Perfect for:
- Authors selling their own books
- Small publishers
- Testing the platform
- Learning the codebase

## Customization

To enable more features, update `config.json`:

```json
{
  "features": {
    "email_notifications": true,  // Enable email
    "previews": true,            // Enable PDF previews
    "analytics": true            // Enable analytics
  }
}
```

## Next Steps

Once comfortable with the basic setup:
1. Enable email notifications
2. Add book previews
3. Customize the design
4. Consider joining the federation network