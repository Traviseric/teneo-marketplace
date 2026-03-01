---
id: 105
title: "Add quiz schema and routes for course module"
priority: P2
severity: medium
status: completed
source: OVERNIGHT_TASKS.md
file: marketplace/backend/routes/quiz.js
line: null
created: "2026-02-28T20:00:00Z"
execution_hint: sequential
context_group: course_module
group_reason: "Touches database/schema.sql and routes — same feature area as courseRoutes.js"
---

# Add Quiz Schema and Routes for Course Module

**Priority:** P2 (medium)
**Source:** OVERNIGHT_TASKS.md (task 083 — confirmed not implemented)
**Location:** `marketplace/backend/routes/quiz.js` (create), `marketplace/backend/database/schema.sql`

## Problem

The course platform has no quiz engine. `courseRoutes.js` implements CRUD for courses, lessons, and enrollment/progress but there is no quiz functionality. Verified that:

- No `quiz.js` route file exists in `marketplace/backend/routes/`
- No `quizzes` or `quiz_responses` table exists in `marketplace/backend/database/schema.sql`
- The course completion model has no way to test learner knowledge

Without quizzes, the course module cannot support certification (which requires passing a quiz to earn a certificate).

## How to Fix

**Step 1: Add tables to `marketplace/backend/database/schema.sql`**

```sql
CREATE TABLE IF NOT EXISTS quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    passing_score INTEGER NOT NULL DEFAULT 70,  -- percentage
    max_attempts INTEGER DEFAULT 3,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quiz_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL DEFAULT 'multiple_choice',  -- multiple_choice | true_false | short_answer
    options TEXT,  -- JSON array of answer options
    correct_answer TEXT NOT NULL,
    points INTEGER DEFAULT 1,
    order_index INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS quiz_responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id INTEGER NOT NULL REFERENCES quizzes(id),
    user_email TEXT NOT NULL,
    answers TEXT NOT NULL,  -- JSON object: {question_id: answer}
    score INTEGER,
    passed INTEGER DEFAULT 0,
    attempt_number INTEGER DEFAULT 1,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quizzes_course_id ON quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_responses_quiz_user ON quiz_responses(quiz_id, user_email);
```

**Step 2: Create `marketplace/backend/routes/quiz.js`**

```javascript
const express = require('express');
const router = express.Router();
const db = require('../database/database');
const { requireAdmin } = require('../auth/authMiddleware');

// GET /api/quizzes/course/:courseId — list quizzes for a course
router.get('/course/:courseId', async (req, res) => { ... });

// GET /api/quizzes/:id — get quiz with questions (for learner)
router.get('/:id', async (req, res) => { ... });

// POST /api/quizzes — create quiz (admin only)
router.post('/', requireAdmin, async (req, res) => { ... });

// PUT /api/quizzes/:id — update quiz (admin only)
router.put('/:id', requireAdmin, async (req, res) => { ... });

// DELETE /api/quizzes/:id — delete quiz (admin only)
router.delete('/:id', requireAdmin, async (req, res) => { ... });

// POST /api/quizzes/:id/submit — submit quiz answers
router.post('/:id/submit', async (req, res) => {
    // Validate answers against correct_answer fields
    // Calculate score
    // INSERT into quiz_responses
    // Return { score, passed, attempt_number }
});

// GET /api/quizzes/:id/results — get user's quiz results
router.get('/:id/results', async (req, res) => { ... });

module.exports = router;
```

**Step 3: Mount in `marketplace/backend/server.js`**

```javascript
const quizRoutes = require('./routes/quiz');
app.use('/api/quizzes', quizRoutes);
```

**Step 4: Update `database/init.js`** to ensure the new tables are created on `node init.js` run.

**Step 5: Add tests in `marketplace/backend/__tests__/quiz.test.js`**
- Test quiz CRUD (create, read, update, delete)
- Test quiz submission with correct answers → score = 100
- Test quiz submission with wrong answers → score < passing_score
- Test max_attempts enforcement

## Acceptance Criteria

- [ ] `quizzes`, `quiz_questions`, and `quiz_responses` tables added to `database/schema.sql`
- [ ] `database/init.js` creates the tables on init
- [ ] `routes/quiz.js` created with CRUD + submit + results endpoints
- [ ] Quiz routes mounted in `server.js` at `/api/quizzes`
- [ ] Admin endpoints protected with `requireAdmin` middleware
- [ ] Submit endpoint calculates score and records `passed` (1/0)
- [ ] Tests added covering quiz CRUD and submission scoring
- [ ] All 130 existing tests still pass

## Notes

_Generated from OVERNIGHT_TASKS.md P2 item (task 083). Verified not done: no quiz.js in routes/, no quiz tables in schema.sql. Certificate generation (task 084) already done (certificateService.js exists) and likely depends on quiz passing score — consider wiring quiz.passed check into certificate endpoint._
