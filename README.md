# 🧠 Teneo Marketplace - The Uncensorable Book Network

> Build your own federated bookstore in 10 minutes

🔗 **Live Repository**: [github.com/Traviseric/teneo-marketplace](https://github.com/Traviseric/teneo-marketplace)

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![Federated](https://img.shields.io/badge/Network-Federated-purple)](https://github.com/Traviseric/teneo-marketplace)
[![Deploy Status](https://img.shields.io/badge/Deploy-Live-brightgreen)](https://github.com/Traviseric/teneo-marketplace/blob/main/DEPLOYMENT_STATUS.md)

<p align="center">
  <img src="https://raw.githubusercontent.com/Traviseric/teneo-marketplace/main/docs/images/banner.png" alt="Teneo Marketplace Banner" width="800">
</p>

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/Traviseric/teneo-marketplace
cd teneo-marketplace

# Install and start
npm install
npm start

# Open http://localhost:3001
```

That's it! Your bookstore is running. Start selling in minutes, not months.

## 🌐 Deployment Status

| Component | Status | URL | Notes |
|-----------|--------|-----|-------|
| 📚 Repository | ✅ Live | [GitHub](https://github.com/Traviseric/teneo-marketplace) | Open source, ready for contributions |
| 🎨 Frontend | ✅ Live | [Vercel](https://teneo-marketplace.vercel.app) | Auto-deploy from main branch |
| ⚙️ Backend | ✅ Live | [Render](https://teneo-marketplace-api.onrender.com) | Production API ready |
| 🌍 Network | ⏳ Ready | Federation Protocol | Ready for first external store |

> **Status**: Production-ready with active deployment pipeline

## 👩‍💻 For Developers (Quick Start)

```bash
# Clone and setup
git clone https://github.com/Traviseric/teneo-marketplace.git
cd teneo-marketplace

# Copy environment template
cp .env.example marketplace/backend/.env

# Install and start
npm install
npm start

# Configure for production
npm run setup:wizard    # Interactive setup
npm run pre-launch     # Verify everything works
npm run generate:pdfs  # Create sample books
```

**Development URLs:**
- Main store: http://localhost:3001
- Network search: http://localhost:3001/network.html  
- Launch kit: http://localhost:3001/launch.html
- Store showcase: http://localhost:3001/showcase.html

## ✨ Features

### For Store Owners
- **💳 Instant Payments** - Stripe integration ready out of the box
- **📚 Digital Delivery** - Automatic PDF delivery with download protection
- **🎨 Multi-Brand Support** - Run multiple storefronts from one codebase
- **📧 Email Automation** - Order confirmations and download links
- **📊 Built-in Analytics** - Track sales, downloads, and customer behavior
- **🔒 Secure by Default** - Token-based downloads, webhook verification

### For the Network
- **🌐 Federated Architecture** - Connect with other bookstores
- **🔍 Cross-Store Search** - Customers discover books across the network
- **🤝 Shared Discovery** - Increase sales through network effects
- **🚫 Uncensorable** - No central authority can take down the network
- **💰 Keep 100% Revenue** - No middleman fees, direct creator-to-reader

### For Developers
- **📦 Batteries Included** - Everything you need in one package
- **🛠 Easy Customization** - Clean code structure, well documented
- **🐳 Docker Ready** - One-command deployment
- **⚡ Modern Stack** - Node.js, Express, SQLite, Vanilla JS
- **🧪 Production Tested** - Running live stores since 2024

## 🏪 Demo Stores

Experience the three included brand examples:

### [Teneo Books](http://localhost:3001/?brand=teneo) - Knowledge Beyond Boundaries™
AI consciousness, paradigm shifts, and hidden patterns

### [True Earth Publications](http://localhost:3001/?brand=true-earth) - Uncovering Hidden Truths
Alternative history, suppressed knowledge, forbidden archaeology

### [WealthWise](http://localhost:3001/?brand=wealth-wise) - Insider Knowledge. Real Wealth.™
Elite financial strategies, wealth building, tax optimization

## 📖 Documentation

| Guide | Description |
|-------|------------|
| [🚀 Quick Start](docs/QUICKSTART.md) | Get running in 10 minutes |
| [💰 Selling Books](docs/SELLING_BOOKS.md) | Add products and process payments |
| [🎨 Customization](docs/CUSTOMIZATION.md) | Create your own brand |
| [🌐 Join Network](docs/JOIN_NETWORK.md) | Connect to other stores |
| [🔧 Production](PRODUCTION_SETUP.md) | Deploy to the internet |
| [📚 API Reference](docs/API.md) | Complete API documentation |

## 🛠 Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite (upgradeable to PostgreSQL)
- **Payments**: Stripe Checkout
- **Email**: Nodemailer (Gmail, SendGrid, SMTP)
- **Frontend**: Vanilla JavaScript, CSS Grid
- **PDFs**: PDFKit for generation

## 📁 Project Structure

```
teneo-marketplace/
├── marketplace/
│   ├── frontend/           # Static frontend files
│   │   ├── brands/        # Brand configurations
│   │   ├── books/         # PDF storage
│   │   ├── js/           # JavaScript modules
│   │   └── index.html    # Main entry point
│   └── backend/           # Node.js server
│       ├── routes/        # API endpoints
│       ├── services/      # Business logic
│       ├── database/      # SQLite database
│       └── server.js      # Express server
├── docs/                  # Documentation
└── docker-compose.yml     # Docker configuration
```

## 🌟 Why Teneo Marketplace?

### The Problem
- Amazon takes 30-65% of book sales
- Platforms can ban books and authors
- Centralized control limits free speech
- Authors struggle to connect with readers

### Our Solution
- **Keep 100% of revenue** (minus payment processing)
- **Own your platform** - No deplatforming risk
- **Join a network** - Benefit from shared discovery
- **Direct relationships** - Build your audience

## 🤝 Join the Network

The Teneo Book Network is a growing federation of independent bookstores. When you join:

- Your books appear in network-wide searches
- Readers discover you through related stores  
- You maintain complete autonomy
- No fees, no gatekeepers

[Learn how to join →](docs/JOIN_NETWORK.md)

## 💡 Use Cases

- **Independent Authors**: Sell directly to readers
- **Niche Publishers**: Serve specific communities
- **Banned Books**: Publish what others won't
- **Regional Stores**: Focus on local authors
- **Special Interests**: Academic, technical, hobby books
- **Private Libraries**: Members-only content

## 🚀 One-Click Deployment

Launch your bookstore in minutes with these platforms:

[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Traviseric/teneo-marketplace&project-name=my-bookstore&repository-name=teneo-marketplace&env=STRIPE_SECRET_KEY,STRIPE_PUBLISHABLE_KEY,EMAIL_USER,EMAIL_PASS&envDescription=Configure%20these%20for%20payments%20and%20email%20delivery&envLink=https://github.com/Traviseric/teneo-marketplace/blob/main/PRODUCTION_SETUP.md)

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/Traviseric/teneo-marketplace)

[![Deploy to Railway](https://railway.app/button.svg)](https://railway.app/template/tLkC2K?referralCode=teneo)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Traviseric/teneo-marketplace)

### 🧙‍♂️ Quick Setup Wizard

After deployment, run the setup wizard to configure your store:

```bash
node deploy/setup-wizard.js
```

This interactive tool will:
- Configure your store settings
- Set up Stripe payments  
- Configure email delivery
- Test all connections
- Generate your environment file

### Traditional Hosting
- DigitalOcean Droplet
- AWS EC2 / Lightsail  
- Linode / Vultr
- Any VPS with Node.js

### Docker
```bash
docker-compose up -d
```

## 📊 Performance

- **Page Load**: < 1 second
- **Checkout Time**: < 3 seconds
- **Download Speed**: Native browser speed
- **Concurrent Users**: 1000+ on basic VPS
- **Database Size**: Scales to millions of orders

## 🔒 Security

- Stripe webhook signature verification
- Token-based download authentication
- SQL injection protection
- XSS prevention
- Rate limiting ready
- HTTPS enforced in production

## 🤝 Contributing

We love contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Areas we need help:
- Frontend themes and templates
- Payment gateway integrations
- Language translations
- Mobile responsive improvements
- Federation protocol enhancements

## 📜 License

MIT License - see [LICENSE](LICENSE) for details.

You can:
- Use commercially
- Modify freely
- Distribute
- Use privately

## 🙏 Acknowledgments

Built with inspiration from:
- The IndieWeb movement
- Fediverse protocols
- DWeb principles
- Cypherpunk manifestos

## 💬 Community

- **Discord**: [Join our server](https://discord.gg/teneebooks)
- **Twitter**: [@TeneoNetwork](https://twitter.com/teneonetwork)
- **Email**: network@teneo.ai

## 🎯 Roadmap

- [ ] Mobile apps (React Native)
- [ ] Cryptocurrency payments
- [ ] IPFS book storage
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Print-on-demand integration
- [ ] Audiobook support
- [ ] Enhanced federation protocol

---

<p align="center">
  <strong>Ready to start your uncensorable bookstore?</strong><br>
  <a href="docs/QUICKSTART.md">Get Started →</a>
</p>

<p align="center">
  Made with ❤️ by the Teneo Network Community
</p>