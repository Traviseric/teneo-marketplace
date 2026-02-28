---
id: 83
title: "Add quiz schema and routes to course platform"
priority: P2
severity: high
status: completed
source: feature_audit
file: course-module/, marketplace/backend/routes/courseRoutes.js
created: "2026-02-28T12:00:00"
execution_hint: sequential
context_group: course_module
group_reason: "Same feature area as certificate generation task 084"
---

# Add quiz schema and routes to course platform

**Priority:** P2 (high)
**Source:** feature_audit
**Location:** course-module/, marketplace/backend/routes/courseRoutes.js

## Problem

Course platform is missing 4 of the 7 features claimed in README: quizzes, certificates, discussion forums, and drip/cohort delivery. The existing backend only implements modules, lessons, progress tracking, and enrollment.

Quizzes are the first and highest-priority missing feature — they're needed for certificates (you need to pass a quiz to earn one) and they're a core differentiator vs static PDFs.

**Code with issue:**
No quiz table exists in schema.sql. No quiz routes exist in courseRoutes.js. No quiz UI exists in course-module/.

## How to Fix

1. Add to `marketplace/backend/database/schema.sql` (or create `schema-courses-quiz.sql`):
   ```sql
   CREATE TABLE IF NOT EXISTS course_quizzes (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     course_id INTEGER NOT NULL REFERENCES courses(id),
     lesson_id INTEGER REFERENCES course_lessons(id),
     title TEXT NOT NULL,
     passing_score INTEGER DEFAULT 70,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   );

   CREATE TABLE IF NOT EXISTS quiz_questions (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     quiz_id INTEGER NOT NULL REFERENCES course_quizzes(id),
     question_text TEXT NOT NULL,
     question_type TEXT DEFAULT 'multiple_choice',
     correct_answer TEXT NOT NULL,
     options TEXT, -- JSON array for multiple choice
     order_index INTEGER DEFAULT 0
   );

   CREATE TABLE IF NOT EXISTS quiz_attempts (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     quiz_id INTEGER NOT NULL REFERENCES course_quizzes(id),
     user_email TEXT NOT NULL,
     score INTEGER NOT NULL,
     passed BOOLEAN NOT NULL,
     answers TEXT, -- JSON of submitted answers
     attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP
   );
   ```

2. Add routes in `courseRoutes.js`:
   - `GET /api/courses/:slug/quizzes` — list quizzes for course (enrolled users only)
   - `GET /api/courses/:slug/quiz/:quizId` — get quiz questions (without revealing correct_answer)
   - `POST /api/courses/:slug/quiz/:quizId/submit` — submit answers, calculate score, store attempt, return result + pass/fail

3. Add admin routes:
   - `POST /api/admin/courses/:slug/quiz` — create quiz with questions
   - `PUT /api/admin/courses/:slug/quiz/:quizId` — update quiz

## Acceptance Criteria

- [ ] quiz tables added to schema and created on db init
- [ ] Student can retrieve quiz questions (correct answers hidden)
- [ ] Student can submit answers and receive pass/fail result
- [ ] Score stored in quiz_attempts for certificate eligibility check
- [ ] Admin can create/edit quizzes

## Notes

_Generated from feature_audit high-severity finding. First milestone of course feature completion._
