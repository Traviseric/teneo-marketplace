# 📚 Course Platform - Complete Implementation Guide

**Transform Teneo Marketplace into a full course hosting platform matching Podia's capabilities**

---

## 🎯 Podia's Course Platform Features

Based on research and actual user experience:

### **Course Structure:**
- ✅ Modules (sections/chapters)
- ✅ Lessons (individual units)
- ✅ Videos (self-hosted, no need for Vimeo/YouTube)
- ✅ Audio files
- ✅ Quizzes
- ✅ Embeds (YouTube, PDFs, external content)
- ✅ Downloadable files

### **Delivery Models:**
- ✅ Self-paced (all content available immediately)
- ✅ Drip courses (time-based release)
- ✅ Cohort-based (group start dates)

### **Student Engagement:**
- ✅ Discussion forums (per course)
- ✅ Comments on lessons
- ✅ Q&A sections
- ✅ Community features
- ✅ Announcements

### **Pricing & Access:**
- ✅ One-time purchase
- ✅ Payment plans (split into installments)
- ✅ Subscriptions (monthly/annual access)
- ✅ Pre-sells (launch validation)
- ✅ Course bundles
- ✅ Coupons & discounts

### **Automation:**
- ✅ Drip content scheduling
- ✅ Completion triggers (email when course done)
- ✅ Progress tracking
- ✅ Certificates upon completion
- ✅ Email integration (send announcements)

---

## 📊 Current State - What We Have

### **Existing Course Components** ✅

Location: `marketplace/frontend/course-components/`

We already have 5 production-ready components:

1. **`course-card.html`** - Course preview cards
2. **`course-progress.html`** - Visual progress tracking (% complete, progress bars)
3. **`lesson-content.html`** - Individual lesson viewer
4. **`module-card.html`** - Module/section cards with expand/collapse
5. **`quiz-component.html`** - Interactive quiz system

**Features Built:**
- ✅ Responsive design
- ✅ Dark mode support
- ✅ Progress persistence (localStorage)
- ✅ Keyboard shortcuts
- ✅ Mobile-optimized

### **What's Missing:**

1. **Backend Infrastructure**
   - Database tables for courses/modules/lessons
   - API routes for course CRUD
   - Enrollment & progress tracking
   - Payment integration for courses

2. **Content Management**
   - Course builder (admin interface)
   - Video upload & hosting
   - File management
   - Quiz builder

3. **Student Experience**
   - Student dashboard
   - Discussion forums
   - Certificates
   - Drip scheduling

4. **Advanced Features**
   - Cohorts
   - Live sessions
   - Assignments & submissions
   - Grading system

---

## 🗄️ Database Schema

### Complete Course Database Structure

```sql
-- courses.sql

-- Main courses table
CREATE TABLE courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  short_description TEXT,
  thumbnail_url TEXT,
  featured_image_url TEXT,
  category TEXT,
  difficulty_level TEXT, -- beginner, intermediate, advanced
  price DECIMAL(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',

  -- Delivery settings
  delivery_mode TEXT DEFAULT 'self_paced', -- self_paced, drip, cohort
  drip_interval_days INTEGER, -- for drip courses

  -- Access control
  is_published BOOLEAN DEFAULT 0,
  require_enrollment BOOLEAN DEFAULT 1,
  max_students INTEGER, -- NULL = unlimited

  -- SEO
  meta_title TEXT,
  meta_description TEXT,

  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  published_at DATETIME,

  -- Stats
  total_enrollments INTEGER DEFAULT 0,
  total_completions INTEGER DEFAULT 0,
  avg_rating DECIMAL(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0
);

CREATE INDEX idx_courses_slug ON courses(slug);
CREATE INDEX idx_courses_published ON courses(is_published);

-- Course modules (sections/chapters)
CREATE TABLE course_modules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,

  -- Drip settings (module-level)
  unlock_after_days INTEGER DEFAULT 0, -- days after enrollment

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE INDEX idx_modules_course ON course_modules(course_id);
CREATE INDEX idx_modules_order ON course_modules(course_id, order_index);

-- Individual lessons
CREATE TABLE course_lessons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  module_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,

  -- Content
  content_type TEXT NOT NULL, -- video, audio, text, pdf, quiz, embed
  content_url TEXT, -- video/audio URL or file path
  content_html TEXT, -- text content (Markdown rendered to HTML)
  duration_seconds INTEGER, -- for video/audio

  -- Embed settings
  embed_type TEXT, -- youtube, vimeo, pdf, external
  embed_url TEXT,

  -- Files
  downloadable_files TEXT, -- JSON array of file URLs

  -- Drip settings (lesson-level)
  unlock_after_days INTEGER DEFAULT 0,
  require_previous_completion BOOLEAN DEFAULT 0,

  -- Settings
  allow_comments BOOLEAN DEFAULT 1,
  is_preview BOOLEAN DEFAULT 0, -- free preview lesson

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE CASCADE
);

CREATE INDEX idx_lessons_module ON course_lessons(module_id);
CREATE INDEX idx_lessons_order ON course_lessons(module_id, order_index);

-- Student enrollments
CREATE TABLE course_enrollments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL,
  user_id INTEGER, -- NULL for guest purchases (email-only)
  email TEXT NOT NULL,

  -- Payment info
  order_id INTEGER,
  price_paid DECIMAL(10,2),
  payment_plan TEXT, -- full, installment_1_of_3, etc.

  -- Access control
  status TEXT DEFAULT 'active', -- active, expired, refunded, suspended
  enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME, -- NULL = lifetime access
  completed_at DATETIME,

  -- Progress
  last_accessed_lesson_id INTEGER,
  last_accessed_at DATETIME,

  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

CREATE INDEX idx_enrollments_course ON course_enrollments(course_id);
CREATE INDEX idx_enrollments_user ON course_enrollments(user_id);
CREATE INDEX idx_enrollments_email ON course_enrollments(email);

-- Lesson progress tracking
CREATE TABLE lesson_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  enrollment_id INTEGER NOT NULL,
  lesson_id INTEGER NOT NULL,

  -- Progress
  status TEXT DEFAULT 'not_started', -- not_started, in_progress, completed
  progress_percent INTEGER DEFAULT 0, -- for video: % watched

  -- Video tracking
  video_position_seconds INTEGER DEFAULT 0,

  -- Timestamps
  started_at DATETIME,
  completed_at DATETIME,
  last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (enrollment_id) REFERENCES course_enrollments(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES course_lessons(id) ON DELETE CASCADE,

  UNIQUE(enrollment_id, lesson_id)
);

CREATE INDEX idx_lesson_progress_enrollment ON lesson_progress(enrollment_id);
CREATE INDEX idx_lesson_progress_lesson ON lesson_progress(lesson_id);

-- Quizzes
CREATE TABLE course_quizzes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lesson_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  passing_score INTEGER DEFAULT 70, -- percentage
  allow_retakes BOOLEAN DEFAULT 1,
  max_attempts INTEGER, -- NULL = unlimited
  shuffle_questions BOOLEAN DEFAULT 0,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (lesson_id) REFERENCES course_lessons(id) ON DELETE CASCADE
);

-- Quiz questions
CREATE TABLE quiz_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL, -- multiple_choice, true_false, short_answer
  order_index INTEGER NOT NULL,
  points INTEGER DEFAULT 1,

  -- Options (JSON for multiple choice)
  options TEXT, -- ["Option A", "Option B", "Option C", "Option D"]
  correct_answer TEXT, -- "A" or "true" or exact text for short answer
  explanation TEXT, -- shown after answer

  FOREIGN KEY (quiz_id) REFERENCES course_quizzes(id) ON DELETE CASCADE
);

-- Quiz attempts
CREATE TABLE quiz_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id INTEGER NOT NULL,
  enrollment_id INTEGER NOT NULL,

  -- Results
  score_percent INTEGER,
  passed BOOLEAN DEFAULT 0,

  -- Answers (JSON)
  answers TEXT, -- {"1": "A", "2": "true", "3": "user's short answer"}

  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,

  FOREIGN KEY (quiz_id) REFERENCES course_quizzes(id) ON DELETE CASCADE,
  FOREIGN KEY (enrollment_id) REFERENCES course_enrollments(id) ON DELETE CASCADE
);

CREATE INDEX idx_quiz_attempts_enrollment ON quiz_attempts(enrollment_id);

-- Discussion forums (per course)
CREATE TABLE course_discussions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL,
  lesson_id INTEGER, -- NULL = general course discussion
  user_id INTEGER,
  email TEXT NOT NULL,
  name TEXT,

  -- Content
  title TEXT,
  message TEXT NOT NULL,

  -- Moderation
  is_pinned BOOLEAN DEFAULT 0,
  is_approved BOOLEAN DEFAULT 1,
  is_instructor_reply BOOLEAN DEFAULT 0,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES course_lessons(id) ON DELETE CASCADE
);

CREATE INDEX idx_discussions_course ON course_discussions(course_id);
CREATE INDEX idx_discussions_lesson ON course_discussions(lesson_id);

-- Discussion replies
CREATE TABLE discussion_replies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discussion_id INTEGER NOT NULL,
  user_id INTEGER,
  email TEXT NOT NULL,
  name TEXT,

  message TEXT NOT NULL,
  is_instructor_reply BOOLEAN DEFAULT 0,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (discussion_id) REFERENCES course_discussions(id) ON DELETE CASCADE
);

-- Course reviews/ratings
CREATE TABLE course_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL,
  enrollment_id INTEGER NOT NULL,

  rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
  review_text TEXT,

  -- Display
  is_featured BOOLEAN DEFAULT 0,
  is_approved BOOLEAN DEFAULT 1,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (enrollment_id) REFERENCES course_enrollments(id) ON DELETE CASCADE,

  UNIQUE(enrollment_id) -- one review per enrollment
);

-- Certificates
CREATE TABLE course_certificates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  enrollment_id INTEGER NOT NULL,

  -- Certificate data
  certificate_number TEXT UNIQUE NOT NULL,
  issue_date DATE NOT NULL,

  -- PDF generation
  pdf_url TEXT,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (enrollment_id) REFERENCES course_enrollments(id) ON DELETE CASCADE,

  UNIQUE(enrollment_id)
);

-- Cohorts (for cohort-based courses)
CREATE TABLE course_cohorts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  max_students INTEGER,

  status TEXT DEFAULT 'upcoming', -- upcoming, active, completed

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- Cohort enrollments (links enrollments to cohorts)
CREATE TABLE cohort_enrollments (
  cohort_id INTEGER NOT NULL,
  enrollment_id INTEGER NOT NULL,

  PRIMARY KEY (cohort_id, enrollment_id),

  FOREIGN KEY (cohort_id) REFERENCES course_cohorts(id) ON DELETE CASCADE,
  FOREIGN KEY (enrollment_id) REFERENCES course_enrollments(id) ON DELETE CASCADE
);

-- Course announcements
CREATE TABLE course_announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL,
  cohort_id INTEGER, -- NULL = all students

  title TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Email notification
  send_email BOOLEAN DEFAULT 0,
  email_sent_at DATETIME,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (cohort_id) REFERENCES course_cohorts(id) ON DELETE CASCADE
);

-- Course bundles
CREATE TABLE course_bundles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  thumbnail_url TEXT,

  bundle_price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2), -- sum of individual course prices
  savings_percent INTEGER,

  is_published BOOLEAN DEFAULT 0,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Courses in bundles (many-to-many)
CREATE TABLE bundle_courses (
  bundle_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,

  PRIMARY KEY (bundle_id, course_id),

  FOREIGN KEY (bundle_id) REFERENCES course_bundles(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);
```

---

## 🔧 Backend Implementation

### Course Routes

**File:** `marketplace/backend/routes/courses.js`

```javascript
const express = require('express');
const router = express.Router();
const courseService = require('../services/courseService');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/courses');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|mp4|webm|mp3|wav/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// ==================
// PUBLIC ROUTES
// ==================

// Get all published courses
router.get('/', async (req, res) => {
  try {
    const { category, difficulty, search } = req.query;

    const courses = await courseService.getPublishedCourses({
      category,
      difficulty,
      search
    });

    res.json({ success: true, data: courses });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single course (public details)
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const course = await courseService.getCourseBySlug(slug, { includeModules: true });

    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    res.json({ success: true, data: course });
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Enroll in course (after payment)
router.post('/:courseId/enroll', async (req, res) => {
  try {
    const { courseId } = req.params;
    const { email, orderId, pricePaid } = req.body;

    const enrollment = await courseService.enrollStudent({
      courseId,
      email,
      orderId,
      pricePaid
    });

    res.json({ success: true, data: enrollment });
  } catch (error) {
    console.error('Error enrolling student:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// ==================
// STUDENT ROUTES (Authenticated)
// ==================

// Get student's enrolled courses
router.get('/student/my-courses', requireAuth, async (req, res) => {
  try {
    const email = req.user.email; // from auth middleware

    const enrollments = await courseService.getStudentEnrollments(email);

    res.json({ success: true, data: enrollments });
  } catch (error) {
    console.error('Error fetching student courses:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get course content (enrolled students only)
router.get('/:courseId/content', requireAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const email = req.user.email;

    // Verify enrollment
    const hasAccess = await courseService.verifyEnrollment(courseId, email);
    if (!hasAccess) {
      return res.status(403).json({ success: false, error: 'Not enrolled in this course' });
    }

    const content = await courseService.getCourseContent(courseId, email);

    res.json({ success: true, data: content });
  } catch (error) {
    console.error('Error fetching course content:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single lesson
router.get('/:courseId/lessons/:lessonId', requireAuth, async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const email = req.user.email;

    const hasAccess = await courseService.verifyEnrollment(courseId, email);
    if (!hasAccess) {
      return res.status(403).json({ success: false, error: 'Not enrolled' });
    }

    const lesson = await courseService.getLesson(lessonId, email);

    res.json({ success: true, data: lesson });
  } catch (error) {
    console.error('Error fetching lesson:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update lesson progress
router.post('/:courseId/lessons/:lessonId/progress', requireAuth, async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const { status, progressPercent, videoPositionSeconds } = req.body;
    const email = req.user.email;

    const hasAccess = await courseService.verifyEnrollment(courseId, email);
    if (!hasAccess) {
      return res.status(403).json({ success: false, error: 'Not enrolled' });
    }

    const progress = await courseService.updateLessonProgress({
      email,
      lessonId,
      status,
      progressPercent,
      videoPositionSeconds
    });

    res.json({ success: true, data: progress });
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mark lesson as complete
router.post('/:courseId/lessons/:lessonId/complete', requireAuth, async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const email = req.user.email;

    const result = await courseService.completeLesson(courseId, lessonId, email);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error completing lesson:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Submit quiz
router.post('/:courseId/quizzes/:quizId/submit', requireAuth, async (req, res) => {
  try {
    const { courseId, quizId } = req.params;
    const { answers } = req.body;
    const email = req.user.email;

    const result = await courseService.submitQuiz({
      courseId,
      quizId,
      email,
      answers
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error submitting quiz:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get certificate
router.get('/:courseId/certificate', requireAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const email = req.user.email;

    const certificate = await courseService.getCertificate(courseId, email);

    if (!certificate) {
      return res.status(404).json({ success: false, error: 'Certificate not available yet' });
    }

    res.json({ success: true, data: certificate });
  } catch (error) {
    console.error('Error fetching certificate:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================
// DISCUSSION/COMMUNITY
// ==================

// Get course discussions
router.get('/:courseId/discussions', requireAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { lessonId } = req.query;

    const discussions = await courseService.getDiscussions(courseId, lessonId);

    res.json({ success: true, data: discussions });
  } catch (error) {
    console.error('Error fetching discussions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Post discussion
router.post('/:courseId/discussions', requireAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { lessonId, title, message } = req.body;
    const email = req.user.email;

    const discussion = await courseService.createDiscussion({
      courseId,
      lessonId,
      email,
      title,
      message
    });

    res.json({ success: true, data: discussion });
  } catch (error) {
    console.error('Error creating discussion:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Reply to discussion
router.post('/discussions/:discussionId/replies', requireAuth, async (req, res) => {
  try {
    const { discussionId } = req.params;
    const { message } = req.body;
    const email = req.user.email;

    const reply = await courseService.replyToDiscussion({
      discussionId,
      email,
      message
    });

    res.json({ success: true, data: reply });
  } catch (error) {
    console.error('Error replying to discussion:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// ==================
// ADMIN ROUTES
// ==================

// Create course
router.post('/admin/courses', requireAdmin, async (req, res) => {
  try {
    const courseData = req.body;
    const course = await courseService.createCourse(courseData);

    res.json({ success: true, data: course });
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Update course
router.put('/admin/courses/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const course = await courseService.updateCourse(id, updates);

    res.json({ success: true, data: course });
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Upload video/file
router.post('/admin/courses/:courseId/upload', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const { courseId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const fileUrl = `/uploads/courses/${file.filename}`;

    res.json({ success: true, data: { url: fileUrl, filename: file.filename } });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add module
router.post('/admin/courses/:courseId/modules', requireAdmin, async (req, res) => {
  try {
    const { courseId } = req.params;
    const moduleData = req.body;

    const module = await courseService.createModule(courseId, moduleData);

    res.json({ success: true, data: module });
  } catch (error) {
    console.error('Error creating module:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Add lesson
router.post('/admin/modules/:moduleId/lessons', requireAdmin, async (req, res) => {
  try {
    const { moduleId } = req.params;
    const lessonData = req.body;

    const lesson = await courseService.createLesson(moduleId, lessonData);

    res.json({ success: true, data: lesson });
  } catch (error) {
    console.error('Error creating lesson:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get course analytics
router.get('/admin/courses/:courseId/analytics', requireAdmin, async (req, res) => {
  try {
    const { courseId } = req.params;

    const analytics = await courseService.getCourseAnalytics(courseId);

    res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
```

---

## 🎨 Frontend - Student Experience

### Student Course Dashboard

**File:** `marketplace/frontend/student-dashboard.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Courses - Student Dashboard</title>
  <link rel="stylesheet" href="css/course-platform.css">
</head>
<body>
  <div class="dashboard-container">
    <header class="dashboard-header">
      <h1>My Courses</h1>
      <div class="user-info">
        <span id="student-name"></span>
        <a href="/account">Account</a>
      </div>
    </header>

    <div class="courses-grid" id="enrolled-courses">
      <!-- Course cards populated by JS -->
    </div>
  </div>

  <!-- Course Card Template -->
  <template id="course-card-template">
    <div class="course-card">
      <img class="course-thumbnail" src="" alt="">
      <div class="course-info">
        <h3 class="course-title"></h3>
        <div class="course-progress">
          <div class="progress-bar">
            <div class="progress-fill"></div>
          </div>
          <span class="progress-text"></span>
        </div>
        <div class="course-actions">
          <a href="#" class="btn-continue">Continue Learning</a>
          <button class="btn-certificate" style="display:none;">Get Certificate</button>
        </div>
      </div>
    </div>
  </template>

  <script src="js/student-dashboard.js"></script>
</body>
</html>
```

### Course Player

**File:** `marketplace/frontend/course-player.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Course Player</title>
  <link rel="stylesheet" href="css/course-player.css">
</head>
<body>
  <div class="course-player">
    <!-- Sidebar with course curriculum -->
    <aside class="course-sidebar">
      <div class="sidebar-header">
        <h2 id="course-title"></h2>
        <button id="toggle-sidebar" aria-label="Toggle sidebar">☰</button>
      </div>

      <div class="course-progress-overview">
        <div class="progress-circle">
          <svg viewBox="0 0 36 36">
            <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"></path>
            <path class="circle-progress" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"></path>
            <text x="18" y="20.35" class="percentage">0%</text>
          </svg>
        </div>
        <p><span id="completed-lessons">0</span> of <span id="total-lessons">0</span> lessons</p>
      </div>

      <div class="course-curriculum" id="course-curriculum">
        <!-- Modules and lessons populated by JS -->
      </div>
    </aside>

    <!-- Main content area -->
    <main class="lesson-content">
      <div class="lesson-header">
        <h1 id="lesson-title"></h1>
        <div class="lesson-actions">
          <button id="prev-lesson" disabled>← Previous</button>
          <button id="mark-complete">Mark as Complete</button>
          <button id="next-lesson">Next →</button>
        </div>
      </div>

      <div class="lesson-body">
        <!-- Video player for video lessons -->
        <div id="video-container" style="display:none;">
          <video id="lesson-video" controls>
            <source src="" type="video/mp4">
          </video>
        </div>

        <!-- Audio player for audio lessons -->
        <div id="audio-container" style="display:none;">
          <audio id="lesson-audio" controls>
            <source src="" type="audio/mp3">
          </audio>
        </div>

        <!-- Text content for text lessons -->
        <div id="text-container" class="lesson-text">
          <!-- Rendered HTML content -->
        </div>

        <!-- Quiz container -->
        <div id="quiz-container" style="display:none;">
          <!-- Quiz component loaded here -->
        </div>

        <!-- Downloadable resources -->
        <div id="resources" class="lesson-resources" style="display:none;">
          <h3>📥 Downloadable Resources</h3>
          <ul id="resources-list">
            <!-- Resource links -->
          </ul>
        </div>
      </div>

      <!-- Discussion section -->
      <div class="lesson-discussions">
        <h3>💬 Discussions</h3>
        <button id="new-discussion-btn">Start a Discussion</button>
        <div id="discussions-list">
          <!-- Discussion threads -->
        </div>
      </div>
    </main>
  </div>

  <script src="js/course-player.js"></script>
</body>
</html>
```

---

## 🎬 Video Hosting Options

### Option 1: Self-Hosted (Like Podia)

**Pros:**
- ✅ No third-party costs
- ✅ Full control
- ✅ Privacy (videos not on YouTube/Vimeo)
- ✅ No ads or branding

**Cons:**
- ❌ High bandwidth costs
- ❌ Need video encoding/transcoding
- ❌ CDN required for global delivery

**Implementation:**
```javascript
// Use ffmpeg for video processing
const ffmpeg = require('fluent-ffmpeg');

// Convert uploaded video to multiple qualities
function transcodeVideo(inputPath, outputDir) {
  return Promise.all([
    // 1080p
    ffmpeg(inputPath)
      .output(`${outputDir}/1080p.mp4`)
      .videoCodec('libx264')
      .size('1920x1080')
      .run(),
    // 720p
    ffmpeg(inputPath)
      .output(`${outputDir}/720p.mp4`)
      .size('1280x720')
      .run(),
    // 480p
    ffmpeg(inputPath)
      .output(`${outputDir}/480p.mp4`)
      .size('854x480')
      .run()
  ]);
}
```

### Option 2: External Hosting (Vimeo Pro, Bunny CDN)

**Recommended:** **Bunny Stream** (https://bunny.net/stream/)

**Pricing:**
- $0.005/GB storage
- $0.01/GB bandwidth
- ~$10/month for typical course

**Features:**
- ✅ Automatic transcoding
- ✅ Global CDN
- ✅ Domain restrictions (only play on your site)
- ✅ DRM (prevent downloads)
- ✅ Analytics

**Integration:**
```javascript
const BunnyStream = require('@bunny.net/stream');

async function uploadToBunny(videoPath) {
  const video = await BunnyStream.videos.create({
    title: 'Lesson 1: Introduction'
  });

  await BunnyStream.videos.upload(video.guid, videoPath);

  return `https://iframe.mediadelivery.net/embed/${video.guid}`;
}
```

---

## 📊 Course Analytics Dashboard

### Metrics to Track

**Course-Level:**
- Total enrollments
- Completion rate (% who finish)
- Average time to complete
- Revenue generated
- Average rating

**Lesson-Level:**
- Drop-off points (where students quit)
- Avg time spent per lesson
- Rewatch rate
- Quiz performance

**Student-Level:**
- Engagement score
- Last activity date
- Progress percentage
- Lessons completed
- Quizzes passed

---

## 🚀 MVP Implementation Checklist

### Phase 1: Core Platform (2 weeks)

- [ ] Database schema implementation
- [ ] Backend API routes (CRUD courses/modules/lessons)
- [ ] File upload system
- [ ] Basic course player (video + text)
- [ ] Progress tracking
- [ ] Student dashboard

### Phase 2: Content Features (2 weeks)

- [ ] Quiz builder & player
- [ ] Discussion forums
- [ ] Certificates (PDF generation)
- [ ] Downloadable resources
- [ ] Course search & filtering

### Phase 3: Advanced Features (2 weeks)

- [ ] Drip content scheduling
- [ ] Cohort system
- [ ] Payment plans integration
- [ ] Course bundles
- [ ] Email notifications (new lesson, completion)

### Phase 4: Polish (1 week)

- [ ] Mobile optimization
- [ ] Video player enhancements (playback speed, subtitles)
- [ ] Analytics dashboard
- [ ] Admin course builder UI
- [ ] Student reviews & ratings

---

## 🎯 Competitive Advantages vs Podia

### What We'll Match:
✅ Full course hosting
✅ Video/audio/text/quiz support
✅ Progress tracking
✅ Discussions & community
✅ Certificates
✅ Drip content
✅ Payment plans
✅ Course bundles

### What We'll Do Better:
🚀 **AI Course Generator** (outline → full course structure)
🚀 **Book → Course Converter** (turn your book into a course automatically)
🚀 **Federated Course Discovery** (courses across network nodes)
🚀 **Crypto Payment Support** (reach global students)
🚀 **Offline Download** (students can download for offline viewing)
🚀 **Open Source** (self-host your own course platform)

---

## 💡 Next Steps

1. **Implement Phase 1** (core platform with database + API)
2. **Integrate with existing checkout** (add courses as purchasable items)
3. **Build course player** (reuse existing course components)
4. **Add video hosting** (Bunny Stream integration)
5. **Deploy MVP** and test with real course

**Timeline:** 6-8 weeks to full Podia parity + unique features

Ready to start building? 🚀
