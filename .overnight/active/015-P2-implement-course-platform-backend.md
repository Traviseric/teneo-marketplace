---
id: 15
title: "Implement course platform backend routes and database schema"
priority: P2
severity: critical
status: completed
source: feature_audit
file: course-module/
line: 1
created: "2026-02-28T00:00:00"
execution_hint: long_running
context_group: features
group_reason: "Large feature implementation; standalone course module"
---

# Implement course platform backend routes and database schema

**Priority:** P2 (medium — high effort, not deployment blocker)
**Source:** feature_audit
**Location:** course-module/

## Problem

The course platform is a headline feature documented extensively in README, docs, and course-module/README.md as complete with checkmarks. In reality:

- **Only `course-config.js` (206 lines) exists** — environment configuration only
- **NO actual course routes** — `server.js` serves course frontend at `/courses` but mounts zero course API routes
- **NO enrollment system** — no database tables for courses, enrollments, progress
- **NO lesson delivery** — no endpoints to serve course content
- **NO quiz engine** — documented feature with zero implementation
- **NO certificate generation** — documented feature with zero implementation
- The `admin-course-builder.html` frontend page has no backend to connect to

## How to Fix

This is a large task. Implement in phases:

**Phase 1: Database Schema** — Create `marketplace/backend/database/schema-courses.sql`:
```sql
CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand_id TEXT NOT NULL,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    price_cents INTEGER DEFAULT 0,
    is_published INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS course_modules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER REFERENCES courses(id),
    title TEXT NOT NULL,
    order_index INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS course_lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module_id INTEGER REFERENCES course_modules(id),
    title TEXT NOT NULL,
    content_type TEXT DEFAULT 'video',  -- video|text|quiz
    content_url TEXT,
    content_body TEXT,
    order_index INTEGER DEFAULT 0,
    is_free_preview INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS course_enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER REFERENCES courses(id),
    user_email TEXT NOT NULL,
    order_id TEXT,
    enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME
);

CREATE TABLE IF NOT EXISTS course_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    enrollment_id INTEGER REFERENCES course_enrollments(id),
    lesson_id INTEGER REFERENCES course_lessons(id),
    completed_at DATETIME,
    PRIMARY KEY (enrollment_id, lesson_id)
);
```

**Phase 2: Backend Routes** — Create `marketplace/backend/routes/courseRoutes.js`:
```javascript
// Public
GET /api/courses — list published courses
GET /api/courses/:slug — course detail + curriculum
GET /api/courses/:slug/preview — free preview lessons

// Auth-required (enrolled users)
GET /api/courses/:slug/learn — full course access (check enrollment)
GET /api/courses/:slug/lessons/:lessonId — individual lesson
POST /api/courses/:slug/progress/:lessonId — mark lesson complete
GET /api/courses/:slug/progress — user's progress for course

// Admin
POST /api/admin/courses — create course
PUT /api/admin/courses/:id — update course
POST /api/admin/courses/:id/publish — publish course
POST /api/admin/courses/:id/modules — add module
POST /api/admin/modules/:id/lessons — add lesson
```

**Phase 3: Mount in server.js**:
```javascript
const courseRoutes = require('./routes/courseRoutes');
app.use('/api/courses', courseRoutes);
```

**Phase 4: Enrollment after purchase** — Wire Stripe webhook to create enrollment when a course product is purchased.

## Acceptance Criteria

- [ ] Database schema for courses, modules, lessons, enrollments, progress created
- [ ] Course listing API (`GET /api/courses`) returns published courses
- [ ] Course detail API returns curriculum structure
- [ ] Enrollment check middleware protects lesson content
- [ ] Progress tracking endpoints work
- [ ] Course routes mounted in server.js
- [ ] Stripe webhook creates enrollment on purchase (basic integration)

## Notes

_Generated from feature_audit findings. This is a P2 due to high effort — security P0 tasks must come first. Start with Phase 1+2+3 for MVP; quiz engine and certificates can be follow-up tasks._
