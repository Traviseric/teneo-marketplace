# 🚀 Quick Start Guide

Get your bookstore running in 10 minutes or less!

## Prerequisites

- Node.js 14+ installed ([Download here](https://nodejs.org/))
- Git installed ([Download here](https://git-scm.com/))
- Stripe account (free to create at [stripe.com](https://stripe.com))

## Step 1: Clone and Install

```bash
# Clone the repository
git clone https://github.com/TravisEric/teneo-marketplace
cd teneo-marketplace

# Install dependencies and start
npm install
npm start
```

Your bookstore is now running at `http://localhost:3001` 🎉

## Step 2: Explore the Demo

### Try the Different Brands

Visit these URLs to see the three included brand examples:

- **Teneo Books**: http://localhost:3001/?brand=teneo
- **True Earth**: http://localhost:3001/?brand=true-earth  
- **WealthWise**: http://localhost:3001/?brand=wealth-wise

### Test Features

1. **Browse Books**: Click on any book to see details
2. **Shopping Cart**: Add books to cart (top-right icon)
3. **Checkout**: Use Stripe test card `4242 4242 4242 4242`
4. **Download**: After purchase, access your PDFs

## Step 3: Basic Configuration

### Create Environment File

```bash
cd marketplace/backend
cp .env.example .env
```

### Add Your Stripe Keys

Edit `.env` and add your Stripe test keys:

```env
STRIPE_SECRET_KEY=sk_test_your_test_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_test_key_here
```

Get these from your [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys).

### Restart the Server

```bash
# Stop the server (Ctrl+C) and restart
npm start
```

## What's Next?

### 🎨 Customize Your Brand
Create your own brand identity:
```bash
# Copy a brand template
cp -r marketplace/frontend/brands/default marketplace/frontend/brands/mybrand

# Edit the configuration
# - Edit catalog.json for your books
# - Edit config.json for brand settings
# - Add your PDF files to marketplace/frontend/books/mybrand/
```

Visit your brand at: http://localhost:3001/?brand=mybrand

### 📚 Add Your Books

1. Edit `marketplace/frontend/brands/mybrand/catalog.json`:
```json
{
  "name": "My Bookstore",
  "books": [
    {
      "id": "my-book-1",
      "title": "My First Book",
      "author": "Your Name",
      "price": 9.99,
      "description": "An amazing book"
    }
  ]
}
```

2. Add your PDF: `marketplace/frontend/books/mybrand/my-book-1.pdf`

### 🌐 Join the Network

Make your store discoverable:

1. Edit `marketplace/frontend/network-registry.json`
2. Add your store information
3. Other stores can now find your books!

### 🚀 Deploy to Production

Ready to go live? See our [Production Setup Guide](../PRODUCTION_SETUP.md).

## Common Tasks

### Generate Sample PDFs
```bash
npm run generate:pdfs
```

### Reset Database
```bash
npm run setup:db
```

### Run in Production Mode
```bash
npm run start:prod
```

### Use Docker
```bash
docker-compose up -d
```

## Troubleshooting

### Port Already in Use
If you see "Port 3001 already in use":
```bash
# Find and kill the process
lsof -i :3001  # On Mac/Linux
# or
netstat -ano | findstr :3001  # On Windows

# Or change the port in .env
PORT=3002
```

### Stripe Not Working
- Make sure you have valid test keys in `.env`
- Check that `.env` is in `marketplace/backend/` directory
- Restart the server after adding keys

### Can't See Books
- Check that `marketplace/backend/server.js` is running
- Look for errors in the console
- Try refreshing the page

### Email Not Sending
This is normal! Emails are simulated by default. To enable real emails:
1. Add email credentials to `.env`
2. See [Email Setup](../PRODUCTION_SETUP.md#email-setup)

## Quick Commands Reference

| Command | Description |
|---------|-------------|
| `npm start` | Start development server |
| `npm run start:prod` | Start production server |
| `npm run generate:pdfs` | Create sample PDFs |
| `npm run setup:db` | Initialize database |
| `npm run docker:up` | Start with Docker |

## Next Steps

- 📖 [Read the full documentation](../README.md#-documentation)
- 💰 [Learn about selling books](SELLING_BOOKS.md)
- 🎨 [Customize your brand](CUSTOMIZATION.md)
- 🌐 [Join the network](JOIN_NETWORK.md)
- 🔧 [Deploy to production](../PRODUCTION_SETUP.md)

## Get Help

- 💬 [Join our Discord](https://discord.gg/teneebooks)
- 📧 Email: support@teneo.ai
- 🐛 [Report issues](https://github.com/TravisEric/teneo-marketplace/issues)

---

**Congratulations!** You now have your own bookstore. Time to start selling! 🎉