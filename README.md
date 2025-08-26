# 📚 Teneo Marketplace - Open Source Publisher Tracking Platform

**An open-source marketplace backend for tracking AI-generated books published on Amazon and building publisher communities.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![SQLite](https://img.shields.io/badge/Database-SQLite-blue.svg)](https://sqlite.org/)

---

## 🎯 **Purpose**

The Teneo Marketplace is an open-source platform designed to:

- **Track Published Books**: Monitor books published by community members on Amazon
- **Build Publisher Networks**: Create communities of AI-assisted publishers  
- **Provide Analytics**: Track performance metrics, trends, and achievements
- **Enable Growth**: Support publishers with data-driven insights and rewards
- **Foster Community**: Leaderboards, milestones, and success sharing

Perfect for AI content creators, publishing communities, and platforms wanting to track their members' publishing success.

---

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+
- NPM or Yarn
- SQLite (included)

### **Installation**
```bash
# Clone the repository
git clone https://github.com/your-org/teneo-marketplace.git
cd teneo-marketplace

# Install backend dependencies
cd marketplace/backend
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start the development server
npm run dev
```

The API will be available at `http://localhost:3001/api`

### **Sample Data**
```bash
# Load 30 sample books for testing
node scripts/create-sample-data.js

# Clear sample data
node scripts/create-sample-data.js clear
```

---

## 📊 **API Endpoints**

### **Published Books**
```http
GET /api/published/books
```
**Query Parameters:**
- `sort` - `recent` | `best_bsr` | `most_reviews` | `biggest_improvement` | `trending_up`
- `time` - `all` | `today` | `week` | `month`
- `genre` - `all` | specific genre name
- `publisher` - `all` | specific publisher name
- `page` - pagination page (default: 1)
- `limit` - items per page (default: 20)

### **Community Statistics**
```http
GET /api/published/stats
```
Returns overall community metrics, recent activity, and milestone progress.

### **Publisher Leaderboards**
```http
GET /api/published/leaderboards
```
Returns top publishers, rising stars, and best-selling authors.

### **Complete API Documentation**
See [API-DOCUMENTATION.md](./marketplace/backend/API-DOCUMENTATION.md) for detailed specifications.

---

## 🏗️ **Architecture**

### **Backend Stack**
- **Runtime**: Node.js with Express.js
- **Database**: SQLite with comprehensive schema
- **Authentication**: Pluggable authentication system
- **APIs**: RESTful JSON APIs with consistent response format

### **Key Features**
- **📈 Trend Tracking**: Historical BSR and rating analysis
- **🏆 Achievement System**: 7-tier badge system for milestones
- **📊 Analytics**: Publisher performance metrics and growth tracking
- **🔍 Advanced Filtering**: Sort and filter by multiple criteria
- **📱 Mobile-Ready**: Responsive design and mobile-optimized APIs

### **Database Schema**
```
published_books          - Main book records
book_ranking_history     - Historical performance data
book_amazon_data         - Enhanced Amazon metadata
publisher_stats          - Publisher metrics and achievements
publisher_milestones     - Badge and reward tracking
publication_milestones   - Community goal tracking
```

---

## 🎨 **Frontend Integration**

The marketplace includes a complete frontend interface:

```bash
# Serve the frontend
cd marketplace/frontend
# Open brands/teneo/marketplace-standalone.html in your browser
```

### **Multi-Brand Support**
The platform supports multiple brands/organizations:
- Each brand has its own configuration and styling
- Shared marketplace infrastructure
- Customizable themes and branding

---

## 🔧 **Configuration**

### **Environment Variables**
```bash
# Database
DATABASE_PATH=./data/marketplace.db

# Server
PORT=3001
NODE_ENV=development

# Optional integrations
STRIPE_SECRET_KEY=sk_test_...  # For payments
EMAIL_USER=your-email@domain.com  # For notifications
ADMIN_PASSWORD_HASH=...  # For admin access
```

### **CORS Configuration**
Update `marketplace/backend/server.js` to allow your domains:
```javascript
app.use(cors({
  origin: [
    'https://your-domain.com',
    'http://localhost:3000'
  ],
  credentials: true
}));
```

---

## 🎯 **Badge System**

The platform includes a comprehensive achievement system:

| Books Published | Badge | Reward |
|----------------|-------|---------|
| 5 books | 📘 Bronze Book | 1 free generation |
| 10 books | 📚 Silver Stack | 2 free generations |
| 25 books | 🏆 Gold Trophy | 5 free generations |
| 50 books | 💎 Diamond | 10 free generations |
| 100 books | 👑 Crown | 20 free generations |
| 250 books | 🚀 Rocket | 50 free generations |
| 500 books | 🌟 Star | 100 free generations |

---

## 🧪 **Testing**

### **API Testing**
```bash
# Health check
curl "http://localhost:3001/api/health"

# Get community stats
curl "http://localhost:3001/api/published/stats"

# Get books with filtering
curl "http://localhost:3001/api/published/books?sort=best_bsr&limit=5"

# Get publisher leaderboards
curl "http://localhost:3001/api/published/leaderboards"
```

### **Authentic Data Approach**
**🎯 Quality Over Fake Quantity**: This marketplace prioritizes authentic data over fabricated success stories.

**Real Data Only**:
- Only genuine Teneo-generated books are featured
- Real Amazon ASINs with actual performance metrics
- Authentic publisher profiles and achievements
- No fake sample data or misleading representations

**Setup**:
```bash
# Initialize with authentic data
cd marketplace/backend/scripts
node create-real-data.js
```

**Empty State Design**: When no books are submitted, the marketplace shows inspiring empty states encouraging real user participation rather than fake data.

---

## 🤝 **Contributing**

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### **Development Setup**
```bash
# Install dependencies
npm install

# Start development server with auto-restart
npm run dev

# Run with sample data
node scripts/create-sample-data.js
npm run dev
```

### **Pull Request Process**
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

## 📜 **License**

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## 🌟 **Use Cases**

### **For Publishers**
- Track your book performance across Amazon
- See ranking trends and improvements
- Earn badges and achievements for milestones
- Connect with other publishers in your niche

### **For Communities**
- Build publisher networks and track collective progress
- Provide value to members through analytics and insights
- Create competition and engagement through leaderboards
- Support member growth with data-driven feedback

### **For Platforms**
- Add publisher tracking to your existing platform
- White-label the marketplace for your brand
- Integrate with your authentication and payment systems
- Scale to support thousands of publishers and books

---

## 🚀 **Roadmap**

### **Phase 1: Foundation** ✅
- ✅ Core API endpoints for book tracking
- ✅ Publisher statistics and leaderboards  
- ✅ Achievement system with badges
- ✅ Historical data tracking

### **Phase 2: Enhancement** 🚧
- Advanced analytics and reporting
- Email notifications for milestones
- Publisher collaboration features
- Mobile app API support

### **Phase 3: Marketplace** 🔮
- Direct sales integration
- Print-on-demand support  
- Revenue sharing systems
- Multi-platform federation

---

## 📞 **Support**

- **Documentation**: [API-DOCUMENTATION.md](./marketplace/backend/API-DOCUMENTATION.md)
- **Issues**: [GitHub Issues](https://github.com/your-org/teneo-marketplace/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/teneo-marketplace/discussions)

---

## 🙏 **Acknowledgments**

- Built with ❤️ for the AI publishing community
- Inspired by the need for transparent, community-driven publishing platforms
- Designed to empower publishers and challenge monopolistic practices

**"Building the infrastructure for the next generation of publishers"** 🚀

---

*Ready to track your publishing success? Get started with the Teneo Marketplace today!*