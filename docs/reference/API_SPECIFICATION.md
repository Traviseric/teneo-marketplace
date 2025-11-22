# API Specification

**teneo-marketplace Public API Documentation**

---

## Overview

This API allows you to:
- **Browse** books and courses
- **Purchase** digital products
- **Track** learning progress
- **Publish** content (admin only)
- **Search** across federation network

**Base URL**: `https://marketplace.teneoai.com/api`

**Authentication**: Most endpoints are public. Admin endpoints require API key.

---

## Course API

### List Courses

```http
GET /api/courses
```

**Query Parameters:**
- `category` (optional): Filter by category
- `limit` (optional): Number of results (default: 20)
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "courses": [
    {
      "id": "course-abc123",
      "title": "Book Funnel Builder Blueprint",
      "description": "Learn to build profitable book funnels in 7 days",
      "price": 497,
      "modules": 4,
      "lessons": 35,
      "duration": 420,
      "thumbnail_url": "https://cdn.example.com/thumb.jpg",
      "created_at": "2025-11-22T10:00:00Z"
    }
  ],
  "total": 10,
  "limit": 20,
  "offset": 0
}
```

---

### Get Course Details

```http
GET /api/courses/:id
```

**Response:**
```json
{
  "id": "course-abc123",
  "title": "Book Funnel Builder Blueprint",
  "description": "Learn to build profitable book funnels",
  "price": 497,
  "modules": [
    {
      "id": "module-1",
      "title": "Gated Funnel Strategy",
      "description": "Master the gated funnel approach",
      "lessons": [
        {
          "id": "lesson-1",
          "title": "Introduction to Gated Funnels",
          "description": "Learn the fundamentals",
          "duration": 600,
          "free_preview": true,
          "video_url": "https://cdn.example.com/preview.mp4"
        },
        {
          "id": "lesson-2",
          "title": "Building Your First Gated Funnel",
          "duration": 900,
          "free_preview": false
        }
      ]
    }
  ],
  "metadata": {
    "instructor": "Travis Eric",
    "level": "beginner",
    "language": "en",
    "updated_at": "2025-11-22T10:00:00Z"
  }
}
```

---

### Get Lesson Content

```http
GET /api/courses/:courseId/lessons/:lessonId
```

**Headers:**
```http
Authorization: Bearer {user_token}
```

**Response:**
```json
{
  "id": "lesson-1",
  "title": "Introduction to Gated Funnels",
  "content": {
    "markdown": "# Lesson Content\n\nThis is the lesson content in Markdown...",
    "video_url": "https://cdn.example.com/video1.mp4",
    "resources": [
      {
        "title": "Template: Gated Funnel",
        "url": "https://cdn.example.com/template.zip"
      }
    ]
  },
  "quiz": {
    "questions": [
      {
        "id": "q1",
        "question": "What is a gated funnel?",
        "type": "multiple_choice",
        "options": [
          "A funnel that requires payment upfront",
          "A funnel that offers free content with paid upsells",
          "A funnel with email capture"
        ],
        "correct_answer": 1
      }
    ]
  },
  "next_lesson": {
    "id": "lesson-2",
    "title": "Building Your First Gated Funnel"
  }
}
```

---

### Enroll in Course

```http
POST /api/courses/:id/enroll
```

**Headers:**
```http
Authorization: Bearer {user_token}
```

**Request Body:**
```json
{
  "payment_intent_id": "pi_abc123xyz"
}
```

**Response:**
```json
{
  "success": true,
  "enrollment_id": "enr_xyz789",
  "course_id": "course-abc123",
  "access_granted": true,
  "expires_at": null
}
```

---

### Update Progress

```http
POST /api/courses/:courseId/progress
```

**Headers:**
```http
Authorization: Bearer {user_token}
```

**Request Body:**
```json
{
  "lesson_id": "lesson-1",
  "completed": true,
  "time_spent": 600,
  "quiz_score": 0.9
}
```

**Response:**
```json
{
  "success": true,
  "progress": {
    "course_id": "course-abc123",
    "lessons_completed": 5,
    "total_lessons": 35,
    "percentage": 14,
    "points_earned": 50
  }
}
```

---

### Get Progress

```http
GET /api/courses/:courseId/progress
```

**Headers:**
```http
Authorization: Bearer {user_token}
```

**Response:**
```json
{
  "course_id": "course-abc123",
  "lessons_completed": 5,
  "total_lessons": 35,
  "percentage": 14,
  "points_earned": 50,
  "badges": [
    {
      "id": "first_lesson",
      "name": "Getting Started",
      "icon": "🎯",
      "earned_at": "2025-11-22T10:30:00Z"
    }
  ],
  "completed_lessons": ["lesson-1", "lesson-2", "lesson-3"],
  "current_lesson": "lesson-4"
}
```

---

## Books API

### List Books

```http
GET /api/books
```

**Query Parameters:**
- `brand` (optional): Filter by brand
- `category` (optional): Filter by category
- `limit` (optional): Number of results (default: 20)
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "books": [
    {
      "id": "book-123",
      "title": "The Art of Book Funnels",
      "author": "Travis Eric",
      "description": "Master the art of selling books online",
      "price": 19.99,
      "cover_url": "https://cdn.example.com/cover.jpg",
      "category": "business",
      "pages": 250,
      "format": "pdf"
    }
  ],
  "total": 50,
  "limit": 20,
  "offset": 0
}
```

---

### Get Book Details

```http
GET /api/books/:id
```

**Response:**
```json
{
  "id": "book-123",
  "title": "The Art of Book Funnels",
  "author": "Travis Eric",
  "description": "Master the art of selling books online with proven funnel strategies",
  "price": 19.99,
  "cover_url": "https://cdn.example.com/cover.jpg",
  "category": "business",
  "pages": 250,
  "format": "pdf",
  "sample_url": "https://cdn.example.com/sample.pdf",
  "preview_pages": 25,
  "table_of_contents": [
    "Chapter 1: Introduction",
    "Chapter 2: The Gated Funnel",
    "Chapter 3: Reader Magnets"
  ],
  "reviews": {
    "average": 4.8,
    "count": 127
  }
}
```

---

## Checkout API

### Create Checkout Session

```http
POST /api/checkout
```

**Request Body:**
```json
{
  "items": [
    {
      "type": "book",
      "id": "book-123",
      "quantity": 1
    },
    {
      "type": "course",
      "id": "course-abc123",
      "quantity": 1
    }
  ],
  "customer_email": "user@example.com",
  "success_url": "https://marketplace.teneoai.com/success",
  "cancel_url": "https://marketplace.teneoai.com/cart"
}
```

**Response:**
```json
{
  "checkout_url": "https://checkout.stripe.com/pay/abc123xyz",
  "session_id": "cs_abc123",
  "expires_at": "2025-11-22T11:00:00Z"
}
```

---

## Download API

### Get Download Link

```http
GET /api/download/:token
```

**Response:**
```json
{
  "download_url": "https://cdn.example.com/books/secure-download-abc123.pdf",
  "filename": "the-art-of-book-funnels.pdf",
  "expires_at": "2025-11-22T12:00:00Z"
}
```

**Notes:**
- Download tokens are single-use
- Tokens expire after 1 hour
- Tokens are generated after successful purchase

---

## Network API (Federation)

### Discover Nodes

```http
GET /api/network/nodes
```

**Response:**
```json
{
  "nodes": [
    {
      "id": "node-1",
      "name": "Teneo Official Marketplace",
      "url": "https://marketplace.teneoai.com",
      "status": "online",
      "books_count": 50,
      "courses_count": 10,
      "last_seen": "2025-11-22T10:00:00Z"
    },
    {
      "id": "node-2",
      "name": "Partner Marketplace",
      "url": "https://partner.example.com",
      "status": "online",
      "books_count": 30,
      "courses_count": 5,
      "last_seen": "2025-11-22T10:00:00Z"
    }
  ]
}
```

---

### Search Network

```http
GET /api/network/search?q={query}
```

**Query Parameters:**
- `q` (required): Search query
- `type` (optional): `book` or `course`
- `limit` (optional): Results per node (default: 10)

**Response:**
```json
{
  "query": "book funnels",
  "results": [
    {
      "node_id": "node-1",
      "node_name": "Teneo Official Marketplace",
      "items": [
        {
          "type": "book",
          "id": "book-123",
          "title": "The Art of Book Funnels",
          "url": "https://marketplace.teneoai.com/books/book-123",
          "price": 19.99
        }
      ]
    },
    {
      "node_id": "node-2",
      "node_name": "Partner Marketplace",
      "items": [
        {
          "type": "course",
          "id": "course-456",
          "title": "Funnel Mastery Course",
          "url": "https://partner.example.com/courses/course-456",
          "price": 297
        }
      ]
    }
  ],
  "total_results": 15,
  "nodes_searched": 2
}
```

---

## Admin API (Authentication Required)

All admin endpoints require authentication via API key.

**Headers:**
```http
Authorization: Bearer {admin_api_key}
```

---

### Publish Course

```http
POST /api/admin/courses
```

**Request Body:**
```json
{
  "id": "course-abc123",
  "title": "Book Funnel Builder Blueprint",
  "description": "Learn to build profitable book funnels",
  "price": 497,
  "modules": [
    {
      "id": "module-1",
      "title": "Gated Funnel Strategy",
      "lessons": [
        {
          "id": "lesson-1",
          "title": "Introduction to Gated Funnels",
          "content_url": "https://cdn.example.com/content.md",
          "video_url": "https://cdn.example.com/video.mp4",
          "duration": 600
        }
      ]
    }
  ],
  "metadata": {
    "instructor": "Travis Eric",
    "level": "beginner",
    "language": "en"
  }
}
```

**Response:**
```json
{
  "success": true,
  "course_id": "course-abc123",
  "url": "https://marketplace.teneoai.com/courses/course-abc123",
  "published_at": "2025-11-22T10:00:00Z"
}
```

---

### Update Course

```http
PUT /api/admin/courses/:id
```

**Request Body:** Same as publish

**Response:**
```json
{
  "success": true,
  "course_id": "course-abc123",
  "updated_at": "2025-11-22T10:30:00Z"
}
```

---

### Delete Course

```http
DELETE /api/admin/courses/:id
```

**Response:**
```json
{
  "success": true,
  "course_id": "course-abc123",
  "deleted_at": "2025-11-22T10:45:00Z"
}
```

---

### Publish Book

```http
POST /api/admin/books
```

**Request Body:**
```json
{
  "id": "book-123",
  "title": "The Art of Book Funnels",
  "author": "Travis Eric",
  "description": "Master the art of selling books online",
  "price": 19.99,
  "pdf_url": "https://cdn.example.com/book.pdf",
  "cover_url": "https://cdn.example.com/cover.jpg",
  "sample_url": "https://cdn.example.com/sample.pdf",
  "metadata": {
    "category": "business",
    "pages": 250,
    "isbn": "978-1-234567-89-0"
  }
}
```

**Response:**
```json
{
  "success": true,
  "book_id": "book-123",
  "url": "https://marketplace.teneoai.com/books/book-123",
  "published_at": "2025-11-22T10:00:00Z"
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

**Common Error Codes:**

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limiting

**Public endpoints**: 100 requests per 15 minutes per IP
**Admin endpoints**: 1000 requests per 15 minutes per API key

**Headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1700000000
```

---

## Webhooks

Configure webhooks to receive notifications about events.

### Supported Events

- `course.enrolled` - User enrolled in course
- `course.completed` - User completed course
- `book.purchased` - Book purchased
- `order.created` - New order created
- `order.fulfilled` - Order fulfilled

### Webhook Payload

```json
{
  "event": "course.enrolled",
  "timestamp": "2025-11-22T10:00:00Z",
  "data": {
    "course_id": "course-abc123",
    "user_id": "user-xyz789",
    "enrollment_id": "enr_abc123"
  }
}
```

---

## SDKs & Libraries

**JavaScript/Node.js:**
```bash
npm install @teneo/marketplace-sdk
```

```javascript
import { TeneoMarketplace } from '@teneo/marketplace-sdk';

const client = new TeneoMarketplace({
  apiKey: 'your_admin_key',
  baseUrl: 'https://marketplace.teneoai.com'
});

// Publish course
await client.courses.create(courseData);

// Get course details
const course = await client.courses.get('course-abc123');
```

**Python:**
```bash
pip install teneo-marketplace
```

```python
from teneo_marketplace import TeneoMarketplace

client = TeneoMarketplace(
    api_key='your_admin_key',
    base_url='https://marketplace.teneoai.com'
)

# Publish course
client.courses.create(course_data)

# Get course details
course = client.courses.get('course-abc123')
```

---

## Versioning

Current version: **v1**

API version is included in the URL: `/api/v1/courses`

When we release v2, v1 will remain available for 12 months.

---

## Support

**Documentation**: https://docs.teneoai.com
**Community**: https://community.teneoai.com
**Issues**: https://github.com/Traviseric/teneo-marketplace/issues

---

**Last Updated**: 2025-11-22
