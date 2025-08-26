# 📚 Teneo Marketplace Backend API Documentation

**Status**: ✅ **COMPLETE** - Ready for Frontend Integration  
**Server URL**: `http://localhost:3001/api`  
**Last Updated**: August 26, 2025  
**Sample Data**: 30 published books with realistic metrics loaded

---

## 🚀 **QUICK START FOR TENEO-PRODUCTION CLAUDE**

The marketplace backend APIs are **100% complete** and running. Here's what you need to integrate:

### **1. Server Status**
```bash
# ✅ Server is running on:
http://localhost:3001/api/published/

# ✅ Health check:
GET http://localhost:3001/api/health
```

### **2. Three Main Endpoints for /published Page**
1. **`GET /api/published/stats`** - Community statistics  
2. **`GET /api/published/books`** - Filterable book listings
3. **`GET /api/published/leaderboards`** - Publisher rankings

---

## 📊 **API ENDPOINTS - COMPLETE SPECIFICATIONS**

### **1. Published Books API**
```
GET /api/published/books
```

**✅ Query Parameters (ALL IMPLEMENTED):**
- `sort` - `recent` | `best_bsr` | `most_reviews` | `biggest_improvement` | `trending_up`
- `time` - `all` | `today` | `week` | `month`
- `genre` - `all` | `AI & Technology` | `Business & Entrepreneurship` | etc.
- `publisher` - `all` | specific publisher name
- `page` - pagination page number (default: 1)
- `limit` - items per page (default: 20)

**✅ Response Format:**
```json
{
  "success": true,
  "data": {
    "books": [
      {
        "id": 1,
        "teneo_book_id": "teneo_book_abc123",
        "amazon_asin": "B08XYZ123",
        "amazon_url": "https://amazon.com/dp/B08XYZ123",
        "title": "The Future of AI: A Comprehensive Guide",
        "author": "Sarah Chen",
        "description": "An in-depth exploration of artificial intelligence...",
        "cover_image_url": "https://images-na.ssl-images-amazon.com/images/I/B08XYZ123.jpg",
        "current_price": 24.99,
        "currency": "USD",
        "bestseller_rank": 2450,
        "rating_average": 4.6,
        "rating_count": 127,
        "review_count": 127,
        "verification_status": "verified",
        "created_at": "2024-12-15T10:30:00.000Z",
        "publication_date": "2024-11-20T00:00:00.000Z",
        "publisher_name": "TechAuthor",
        "genre": "AI & Technology",
        "trend_direction": "up",
        "rank_improvement_30d": 1200,
        "trend_score": 75
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 30,
      "pages": 2
    },
    "filters": {
      "available_genres": [
        "AI & Technology", 
        "Business & Entrepreneurship", 
        "Marketing & Sales", 
        "Health & Wellness", 
        "Personal Development", 
        "Finance & Investment"
      ],
      "available_publishers": [
        "TechAuthor", 
        "MindfulWriter", 
        "MarketingGuru", 
        "EcoAuthor", 
        "CreativeMinds"
      ]
    }
  }
}
```

### **2. Statistics API**
```
GET /api/published/stats
```

**✅ Response Format:**
```json
{
  "success": true,
  "data": {
    "overall": {
      "total_books": 30,
      "verified_books": 30,
      "ranked_books": 28,
      "active_publishers": 10,
      "avg_rating": 4.3,
      "total_reviews": 4247
    },
    "recent": {
      "books_today": 0,
      "books_this_week": 5,
      "books_this_month": 12,
      "new_publishers": 2,
      "growth_rate": 15.5
    },
    "milestones": {
      "progress_to_goal": 30,
      "goal_target": 10000,
      "estimated_completion": "Spring 2027"
    }
  }
}
```

### **3. Leaderboards API**
```
GET /api/published/leaderboards
```

**✅ Response Format:**
```json
{
  "success": true,
  "data": {
    "top_publishers": [
      {
        "name": "TechAuthor",
        "books_count": 1,
        "badge": "📚",
        "trend": "stable"
      }
    ],
    "rising_stars": [
      {
        "name": "MarketingGuru", 
        "books_this_month": 1,
        "growth": "+100%"
      }
    ],
    "best_sellers": [
      {
        "name": "MarketingGuru",
        "avg_bsr": 1678,
        "best_book": "Digital Marketing Mastery"
      }
    ]
  }
}
```

---

## 🔧 **CORS & AUTHENTICATION**

### **✅ CORS Configuration**
The server is configured to accept requests from all Teneo domains:
```javascript
// ✅ ENABLED for these origins:
'https://teneo.io'
'https://www.teneo.io' 
'https://staging.teneo.io'
'http://localhost:3333'  // Teneo development
```

### **Authentication Notes**
- The published books API endpoints are **public** (no authentication required for read-only access)
- Book submission endpoints require Teneo authentication (handled by existing middleware)
- All endpoints return consistent JSON format with `success: true|false`

---

## 📈 **SAMPLE DATA OVERVIEW**

**✅ 30 Sample Books Loaded** with realistic data:

### **Genres Distribution:**
- **AI & Technology**: 5 books (BSR range: 2,450 - 9,876)
- **Business & Entrepreneurship**: 7 books (BSR range: 4,321 - 8,521)  
- **Marketing & Sales**: 4 books (BSR range: 1,678 - 11,234)
- **Health & Wellness**: 6 books (BSR range: 12,432 - 22,345)
- **Personal Development**: 5 books (BSR range: 14,567 - 25,789)
- **Finance & Investment**: 3 books (BSR range: 3,456 - 12,345)

### **Publisher Profiles:**
- **TechAuthor** (Sarah Chen) - AI specialist
- **MarketingGuru** (Emily Rodriguez) - Digital marketing expert  
- **MindfulWriter** (Marcus Johnson) - Leadership coach
- **FinanceExpert** (Robert Kim) - Investment strategist
- **And 6 more realistic publisher personas**

### **Metrics Range:**
- **BSR Rankings**: 1,678 (best) to 25,789 (emerging)
- **Ratings**: 4.0 to 4.8 stars (realistic range)
- **Reviews**: 45 to 234 reviews per book
- **Prices**: $16.99 to $34.99 (market-appropriate)
- **Trends**: Mix of "up", "down", "stable" for testing

---

## 🛠️ **ENHANCED FEATURES IMPLEMENTED**

### **1. Advanced Filtering System**
- **Time-based**: Filter by today, week, month, or all time
- **Genre-based**: Filter by specific book categories
- **Publisher-based**: Filter by individual publishers
- **Performance-based**: Sort by BSR, reviews, trends, recent

### **2. Trend Tracking System**
Each book includes trend analysis:
- `trend_direction`: "up" | "down" | "stable" | "new"
- `rank_improvement_30d`: Numeric change in BSR over 30 days
- `trend_score`: 0-100 composite score of book performance

### **3. Historical Data Storage**
- `book_ranking_history` table stores daily snapshots
- Enables trend calculation and performance graphs
- 5 historical data points per sample book for testing

### **4. Badge & Milestone System**
- 7 achievement levels: 📘 (5) → 📚 (10) → 🏆 (25) → 💎 (50) → 👑 (100) → 🚀 (250) → 🌟 (500)
- Automatic badge assignment based on book count
- Community milestone tracking (10,000 book goal)

---

## 🧪 **TESTING ENDPOINTS**

### **Quick Test Commands:**
```bash
# 1. Health check
curl "http://localhost:3001/api/health"

# 2. Get community stats
curl "http://localhost:3001/api/published/stats"

# 3. Get all books (paginated)
curl "http://localhost:3001/api/published/books?limit=5"

# 4. Filter by genre
curl "http://localhost:3001/api/published/books?genre=AI%20%26%20Technology"

# 5. Sort by best BSR
curl "http://localhost:3001/api/published/books?sort=best_bsr&limit=3"

# 6. Get leaderboards
curl "http://localhost:3001/api/published/leaderboards"

# 7. Test CORS with Teneo origin
curl -H "Origin: https://staging.teneo.io" "http://localhost:3001/api/published/stats"
```

### **Expected Results:**
- ✅ All endpoints return `{"success": true}`
- ✅ Books API returns 30 sample books when no filters applied
- ✅ Filtering works correctly (test with genre="AI & Technology" returns 5 books)
- ✅ Sorting works correctly (sort=best_bsr returns books ordered by rank)
- ✅ CORS headers allow Teneo domain requests

---

## 📁 **FILE STRUCTURE REFERENCE**

### **Key Backend Files Modified/Created:**
```
marketplace/backend/
├── routes/publishedBooks.js (✅ Enhanced with 3 new endpoints)
├── services/amazonService.js (✅ Enhanced with trend tracking)  
├── services/badgeService.js (✅ Enhanced with milestone system)
├── server.js (✅ Updated CORS configuration)
└── scripts/create-sample-data.js (✅ New - 30 sample books)
```

### **Database Tables Utilized:**
- `published_books` - Main book records
- `book_ranking_history` - Historical performance data
- `book_amazon_data` - Enhanced Amazon metadata
- `publisher_stats` - Publisher performance metrics
- `publisher_milestones` - Achievement tracking
- `publication_milestones` - Community goals (10K target)

---

## 🚨 **IMPORTANT INTEGRATION NOTES**

### **For the Teneo-Production Claude:**

1. **✅ Server is Ready**: The marketplace backend is running and tested
2. **✅ CORS Configured**: Your frontend can make requests to these APIs
3. **✅ Data Available**: 30 realistic sample books are loaded for testing
4. **✅ Response Format**: All APIs return consistent JSON structure

### **Integration Checklist:**
- [ ] Create React components that call these API endpoints
- [ ] Test API calls from your frontend using the provided URLs
- [ ] Implement the UI components using the returned data structure  
- [ ] Add the `/published` route to your React Router
- [ ] Test the full integration with sample data

### **Error Handling:**
All APIs include proper error responses:
```json
{
  "success": false,
  "error": "Error message description"
}
```

---

## 🎉 **READY FOR FRONTEND INTEGRATION**

**The marketplace backend is 100% complete and ready for integration!** 

The teneo-production Claude can now:
1. ✅ Call all three main API endpoints
2. ✅ Use the sample data for UI testing
3. ✅ Implement filtering, sorting, and pagination
4. ✅ Build the community stats dashboard
5. ✅ Display publisher leaderboards

**Next Step**: The frontend integration to create the `/published` page! 🚀

---

*Backend implementation completed by: Teneo-Marketplace Claude*  
*Ready for frontend integration by: Teneo-Production Claude*