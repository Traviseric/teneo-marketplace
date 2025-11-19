# AI Discovery Engine 🤖

**Status:** ✅ Implemented (Phase 1)
**Version:** 1.0.0
**Last Updated:** November 17, 2025

---

## 🎯 Overview

The AI Discovery Engine makes the Teneo Marketplace **better than Amazon at book discovery** by using semantic search, controversy boosting, and suppression tracking.

### Key Features

1. **Semantic Search** - Understand natural language queries, not just keywords
2. **Controversy Boost** - Surface censored/suppressed books higher in results
3. **Reading Paths** - AI-generated learning journeys
4. **Knowledge Graph** - Discover relationships between books
5. **Suppression Tracking** - Track banned books in real-time

---

## 🚀 Quick Start

### Prerequisites

1. **OpenAI API Key** - Required for semantic search
   - Sign up at https://platform.openai.com
   - Create API key
   - Add to `.env`: `OPENAI_API_KEY=sk-...`

2. **Database** - SQLite database must be initialized
   ```bash
   node marketplace/backend/database/init.js
   ```

### Installation

**Step 1: Initialize AI Discovery**
```bash
node marketplace/backend/scripts/init-ai-discovery.js
```

This will:
- ✅ Create database tables
- ✅ Queue all books for embedding generation
- ✅ Process first 10 books
- ✅ Show you the status

**Step 2: Process All Embeddings** (Optional but recommended)
```bash
node marketplace/backend/scripts/process-all-embeddings.js
```

This will generate embeddings for all books in your catalog. It takes approximately:
- **10 books**: 1 minute
- **50 books**: 5 minutes
- **100 books**: 10 minutes

**Cost:** OpenAI charges ~$0.0001 per book for embeddings (very cheap!)

---

## 📡 API Endpoints

### 1. Semantic Search

**Endpoint:** `POST /api/discovery/semantic-search`

**Description:** Search books using natural language queries

**Request:**
```json
{
  "query": "books about institutional corruption in finance",
  "limit": 20,
  "controversyBoost": true,
  "suppressionBoost": true,
  "minScore": 0.6
}
```

**Response:**
```json
{
  "success": true,
  "query": "books about institutional corruption in finance",
  "results": [
    {
      "bookId": "pattern-code",
      "brand": "teneo",
      "title": "The Pattern Code",
      "author": "Alexandra Sterling",
      "description": "Decoding the hidden algorithms that govern reality",
      "category": "Science & Reality",
      "similarityScore": 0.89,
      "boostedScore": 1.07,
      "controversyScore": 45,
      "suppressionLevel": 20,
      "dangerIndex": 32
    }
  ],
  "count": 12,
  "searchDuration": 245
}
```

**Example Queries:**
- "Show me books Amazon doesn't want you to read"
- "What should I read after 'The Bitcoin Standard'?"
- "Books about government corruption"
- "Censored books on monetary policy"

---

### 2. Suppressed Books Feed

**Endpoint:** `GET /api/discovery/suppressed-books`

**Description:** Get "What They Don't Want You to Read" feed

**Request:**
```bash
GET /api/discovery/suppressed-books?limit=20
```

**Response:**
```json
{
  "success": true,
  "books": [
    {
      "bookId": "consciousness-revolution",
      "brand": "teneo",
      "title": "The Consciousness Revolution",
      "author": "Dr. Marcus Reid",
      "description": "How AI is revealing the true nature of human awareness",
      "dangerIndex": 85,
      "suppressionCount": 3,
      "maxImpact": 75
    }
  ],
  "count": 12
}
```

---

### 3. Generate Reading Path

**Endpoint:** `POST /api/discovery/reading-path`

**Description:** AI generates optimal reading sequence for a topic

**Request:**
```json
{
  "topic": "Austrian Economics",
  "level": "beginner"
}
```

**Response:**
```json
{
  "success": true,
  "path": {
    "pathId": "path_1234567890_abc123",
    "name": "Austrian Economics Fundamentals",
    "description": "A progressive journey from basic economic principles to advanced monetary theory",
    "books": [
      "economics-in-one-lesson",
      "the-bitcoin-standard",
      "human-action"
    ],
    "learning_goals": [
      "Understand subjective value theory",
      "Grasp time preference and interest rates",
      "Critique central banking"
    ],
    "estimated_hours": 40
  }
}
```

---

### 4. Knowledge Graph

**Endpoint:** `GET /api/discovery/knowledge-graph/:bookId`

**Description:** Get relationships between books

**Request:**
```bash
GET /api/discovery/knowledge-graph/pattern-code?depth=1
```

**Response:**
```json
{
  "success": true,
  "bookId": "pattern-code",
  "relationships": [
    {
      "citedBookId": "simulation-theory-decoded",
      "title": "Simulation Theory Decoded",
      "author": "Professor Zhang Wei",
      "category": "Future Paradigms",
      "relationshipType": "extends",
      "strength": 0.92,
      "context": "Builds on simulation hypothesis with mathematical framework"
    }
  ],
  "citedBy": [],
  "depth": 1
}
```

---

### 5. Controversy Metrics

**Endpoint:** `GET /api/discovery/controversy/:bookId`

**Description:** Get controversy and suppression data for a book

**Request:**
```bash
GET /api/discovery/controversy/consciousness-revolution
```

**Response:**
```json
{
  "success": true,
  "bookId": "consciousness-revolution",
  "controversyScore": 72,
  "suppressionEvents": [
    {
      "platform": "amazon",
      "eventType": "search_suppressed",
      "detectedAt": "2025-11-15T10:30:00Z",
      "impactScore": 65,
      "reason": "Violates content guidelines",
      "isActive": true
    }
  ],
  "banRisk": {
    "riskScore": 0.78,
    "riskLevel": "high",
    "riskFactors": {
      "controversial_topic": 0.8,
      "platform_warnings": 0.7,
      "media_attacks": 0.6
    },
    "calculatedAt": "2025-11-17T12:00:00Z"
  },
  "recentMetrics": []
}
```

---

### 6. Discovery Stats

**Endpoint:** `GET /api/discovery/stats`

**Description:** Get system-wide statistics

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalBooks": 47,
    "averageControversy": 32,
    "averageSuppression": 18,
    "controversialBooks": 12,
    "suppressedBooks": 5,
    "recentSearches": 234,
    "readingPaths": 8
  }
}
```

---

## 🛠️ Admin Endpoints

### Generate Embeddings

**Endpoint:** `POST /api/discovery/admin/generate-embeddings`

**Description:** Queue all books for embedding generation

**Response:**
```json
{
  "success": true,
  "message": "Queued 47 books for embedding generation",
  "queuedCount": 47
}
```

### Process Embeddings

**Endpoint:** `POST /api/discovery/admin/process-embeddings`

**Description:** Process embedding queue (batch)

**Request:**
```json
{
  "batchSize": 10
}
```

**Response:**
```json
{
  "success": true,
  "results": {
    "processed": 10,
    "failed": 0,
    "errors": []
  }
}
```

### Queue Status

**Endpoint:** `GET /api/discovery/admin/queue-status`

**Description:** Check embedding generation status

**Response:**
```json
{
  "success": true,
  "queue": {
    "total": 47,
    "pending": 12,
    "processing": 0,
    "completed": 35,
    "failed": 0
  },
  "embeddingsGenerated": 35
}
```

---

## 💻 Frontend Integration

### Example: Semantic Search Component

```javascript
// semantic-search.js

async function semanticSearch(query) {
    const response = await fetch('/api/discovery/semantic-search', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            query,
            limit: 20,
            controversyBoost: true,
            suppressionBoost: true
        })
    });

    const data = await response.json();
    return data.results;
}

// Usage
const results = await semanticSearch('books about censorship resistance');
console.log(results);
```

### Example: Suppressed Books Widget

```javascript
// suppressed-books-widget.js

async function loadSuppressedBooks() {
    const response = await fetch('/api/discovery/suppressed-books?limit=10');
    const data = await response.json();

    const widget = document.getElementById('suppressed-books');
    widget.innerHTML = `
        <h2>📢 What They Don't Want You to Read</h2>
        <div class="book-grid">
            ${data.books.map(book => `
                <div class="book-card danger-${Math.floor(book.dangerIndex / 20)}">
                    <h3>${book.title}</h3>
                    <p>${book.author}</p>
                    <div class="danger-badge">
                        Danger Index: ${book.dangerIndex}/100
                    </div>
                    <p>Suppressed ${book.suppressionCount} times</p>
                </div>
            `).join('')}
        </div>
    `;
}

// Load on page load
loadSuppressedBooks();
```

---

## 📊 Database Schema

### book_embeddings
Stores OpenAI embeddings for semantic search

| Column | Type | Description |
|--------|------|-------------|
| book_id | TEXT | Unique book identifier |
| brand | TEXT | Brand name |
| title | TEXT | Book title |
| author | TEXT | Book author |
| embedding_vector | TEXT | JSON array of 1536 floats |
| controversy_score | INTEGER | 0-100 controversy rating |
| suppression_level | INTEGER | 0-100 suppression rating |
| danger_index | INTEGER | 0-100 composite risk score |

### citation_network
Tracks relationships between books

| Column | Type | Description |
|--------|------|-------------|
| source_book_id | TEXT | Source book |
| cited_book_id | TEXT | Cited book |
| relationship_type | TEXT | 'supports', 'refutes', 'extends', etc. |
| relationship_strength | DECIMAL | 0.0-1.0 confidence |

### reading_paths
AI-generated learning paths

| Column | Type | Description |
|--------|------|-------------|
| path_id | TEXT | Unique path identifier |
| name | TEXT | Path name |
| topic | TEXT | Topic/subject |
| difficulty_level | TEXT | 'beginner', 'intermediate', 'advanced' |
| book_sequence | TEXT | JSON array of book IDs |
| learning_goals | TEXT | JSON array of objectives |

### book_suppression_events
Tracks censorship events

| Column | Type | Description |
|--------|------|-------------|
| book_id | TEXT | Book identifier |
| platform | TEXT | 'amazon', 'goodreads', etc. |
| event_type | TEXT | 'removed', 'shadowbanned', 'banned' |
| impact_score | INTEGER | 0-100 severity |
| is_active | BOOLEAN | Still suppressed? |

---

## 🎯 Use Cases

### 1. "Amazon Alternative" Search

Instead of showing books Amazon wants to sell, show books **users need to learn**.

```javascript
// Traditional keyword search
GET /api/books?q=economics

// AI Discovery semantic search
POST /api/discovery/semantic-search
{ "query": "books that challenge mainstream economics" }

// Result: Surfaces Austrian economics, crypto, anti-central banking books
```

### 2. "Banned This Week" Feed

Automatic marketing when books get censored.

```javascript
// Get recently suppressed books
GET /api/discovery/suppressed-books?limit=10

// Display with "BANNED" badge
// Email subscribers: "Amazon just removed this book!"
```

### 3. "Learning Paths" Feature

Help users progress from beginner to expert.

```javascript
// User: "I want to learn about Bitcoin"
POST /api/discovery/reading-path
{
  "topic": "Bitcoin and Cryptocurrency",
  "level": "beginner"
}

// AI generates:
// 1. "The Bitcoin Standard" (fundamentals)
// 2. "Mastering Bitcoin" (technical)
// 3. "The Blocksize War" (advanced history)
```

### 4. "Controversy Index" Badges

Show users how dangerous/suppressed each book is.

```javascript
// Get controversy data
GET /api/discovery/controversy/book-id

// Display badge:
// 🔥 Danger Index: 85/100
// 🚫 Banned in 3 countries
// ⚠️ 72% risk of future ban
```

---

## 🔧 Configuration

### Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-...

# Optional (defaults are fine)
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
```

### Cost Estimation

**OpenAI Pricing:**
- Embeddings: $0.00002 per 1K tokens
- Average book: 200 tokens
- **Cost per book: ~$0.000004** (extremely cheap!)

**Example Costs:**
- 100 books: $0.0004
- 1,000 books: $0.004
- 10,000 books: $0.04

**Total cost to embed 10,000 books: 4 cents!**

---

## 🚀 Roadmap

### Phase 1: Semantic Search ✅ COMPLETE
- OpenAI embeddings
- Vector similarity search
- Controversy boosting
- Basic API endpoints

### Phase 2: Knowledge Graph (Coming Soon)
- Automatic citation detection
- Relationship discovery
- Visual graph interface

### Phase 3: Advanced AI Features (Coming Soon)
- Ban prediction ML model
- Automatic controversy scoring
- Real-time suppression tracking
- Platform scraping

### Phase 4: Community Features (Future)
- User reading path creation
- Collaborative filtering
- Review integration

---

## 🐛 Troubleshooting

### "OPENAI_API_KEY not found"

Add your API key to `.env`:
```bash
OPENAI_API_KEY=sk-your-key-here
```

### "No books found for this topic"

Make sure embeddings have been generated:
```bash
node marketplace/backend/scripts/process-all-embeddings.js
```

### "Search returns empty results"

Check that books have embeddings:
```bash
curl http://localhost:3001/api/discovery/admin/queue-status
```

If `embeddingsGenerated` is 0, run:
```bash
node marketplace/backend/scripts/init-ai-discovery.js
```

---

## 📖 Examples

See `marketplace/frontend/examples/ai-discovery-demo.html` for a complete working demo.

---

## 🤝 Contributing

Want to improve the AI Discovery Engine?

1. Fork the repo
2. Create a feature branch
3. Submit a PR

**Ideas welcome:**
- Better controversy scoring algorithms
- Platform scraping for suppression detection
- ML models for ban prediction
- Improved knowledge graph visualization

---

**Questions?** Open an issue on GitHub!

**Built with:** OpenAI, SQLite, Express.js, and revolutionary thinking 🚀
