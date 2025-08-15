# 📚 Open Book Marketplace - Self-Hosted Digital Bookstore

> Build your own digital bookstore with print-on-demand support in 10 minutes

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/Traviseric/teneo-marketplace
cd book-marketplace

# Install dependencies
cd marketplace/backend
npm install

# Configure your store
cp .env.example .env
# Edit .env with your settings

# Start the server
npm start

# Open http://localhost:3001
```

Your bookstore is now running! 🎉

## ✨ Features

### Core Features (Available Now)
- 🛍️ **Full E-commerce Experience** - Shopping cart, checkout, order management
- 💳 **Stripe Integration** - Secure payment processing
- 📚 **Digital Downloads** - Automated PDF delivery with secure tokens
- 🖨️ **Print-on-Demand** - Lulu.com integration for physical books
- 🔐 **Admin Dashboard** - Manage books, orders, and settings
- 📧 **Email Notifications** - Order confirmations and download links
- 🎨 **White-Label Ready** - Fully customizable branding
- 📱 **Mobile Responsive** - Works on all devices

### Security Features
- 🔒 **Secure Authentication** - bcrypt password hashing, session management
- 🛡️ **CSRF Protection** - Prevents cross-site request forgery
- ⚡ **Rate Limiting** - Protects against brute force attacks
- 📋 **Audit Trail** - Logs all admin actions

### Coming Soon
- 🌐 **Federation Support** - Connect multiple marketplaces
- 🔍 **Network Search** - Discover books across federated stores
- 📊 **Advanced Analytics** - Sales tracking and insights

## 🛠️ Configuration

### Environment Variables

Create a `.env` file in `marketplace/backend/` with:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Branding (Customize these!)
MARKETPLACE_NAME=My Book Store
MARKETPLACE_TAGLINE=Great Books, Great Prices
MARKETPLACE_DESCRIPTION=Your favorite digital bookstore
SUPPORT_EMAIL=support@yourdomain.com
PUBLIC_URL=https://yourdomain.com

# Admin Security
ADMIN_PASSWORD_HASH=your-bcrypt-hash-here
SESSION_SECRET=your-random-64-char-string

# Stripe (Get keys from https://stripe.com)
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Email (Gmail example)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Optional: Lulu Print-on-Demand
LULU_CLIENT_KEY=your-lulu-key
LULU_CLIENT_SECRET=your-lulu-secret
```

### Generate Admin Password

```bash
cd marketplace/backend
node scripts/generate-password-hash.js --generate
# Or use your own password:
node scripts/generate-password-hash.js "YourSecurePassword123!"
```

## 📁 Project Structure

```
marketplace/
├── backend/
│   ├── server.js           # Express server
│   ├── routes/             # API endpoints
│   ├── services/           # Business logic
│   ├── middleware/         # Auth & security
│   └── database/           # SQLite database
├── frontend/
│   ├── index.html          # Main store page
│   ├── admin.html          # Admin dashboard
│   ├── js/                 # Frontend JavaScript
│   └── css/                # Styles
└── shared/
    └── brands/             # Multi-brand support
```

## 🎨 Customization

### Basic Branding

1. Update environment variables in `.env`
2. Replace logo/favicon in `frontend/assets/`
3. Customize colors in CSS variables

### Advanced Customization

- Modify email templates in `services/email-service.js`
- Add custom pages in `frontend/`
- Extend API endpoints in `routes/`

## 🚀 Deployment

### Development

```bash
npm start
# Visit http://localhost:3001
```

### Production

1. Set `NODE_ENV=production` in `.env`
2. Use a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start server.js --name bookstore
   ```
3. Set up reverse proxy (nginx/Apache)
4. Configure SSL certificate
5. Set secure environment variables

### Recommended Hosting

- **VPS**: DigitalOcean, Linode, Vultr
- **PaaS**: Heroku, Railway, Render
- **Cloud**: AWS EC2, Google Cloud, Azure

## 🔧 Admin Dashboard

Access the admin dashboard at `/admin`

Features:
- 📚 Visual book manager with drag-and-drop
- 📊 Sales analytics and order management
- 🎨 Store settings and branding
- 📧 Email template customization
- 🌐 Network configuration (federation)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Fork and clone the repo
git clone https://github.com/Traviseric/teneo-marketplace
cd book-marketplace

# Create a branch
git checkout -b feature/your-feature

# Make changes and test
npm test

# Submit a pull request
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Built with:
- Node.js & Express
- Stripe for payments
- Lulu for print-on-demand
- SQLite for data storage

## 📞 Support

- 📧 Email: support@yourdomain.com
- 💬 Discord: [Join our community](#)
- 📖 Docs: [Documentation](#)
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/book-marketplace/issues)

---

Made with ❤️ by the Open Source Community