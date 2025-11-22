# 🚀 Course Module Migration Guide

**Copy the Course Platform to Any Project (Including teneo-production)**

This guide shows you how to copy the entire course system to another repository with minimal changes.

---

## 📦 What You're Copying

The course platform is **100% self-contained** and includes:
- Frontend (HTML, CSS, JS)
- Backend routes & services
- Database schemas
- Configuration system

---

## 📂 Folder Structure (Portable Module)

```
course-module/                    ← Copy this entire folder
├── frontend/
│   ├── course-player.html       ← Student course player
│   ├── admin-course-builder.html ← Admin course creator
│   ├── css/
│   │   ├── course-player.css
│   │   └── course-builder.css
│   ├── js/
│   │   ├── course-player.js
│   │   ├── video-controls.js
│   │   ├── course-progress.js
│   │   └── course-builder.js
│   └── course-components/       ← Reusable components (already exists)
│
├── backend/
│   ├── routes/
│   │   ├── courses.js           ← Course CRUD API
│   │   ├── coursePlayer.js      ← Player API
│   │   └── courseBuilder.js     ← Builder API
│   ├── services/
│   │   ├── courseService.js
│   │   ├── coursePlayerService.js
│   │   └── videoService.js
│   └── database/
│       └── schema-courses.sql   ← Course database tables
│
├── config/
│   └── course-config.js         ← Environment-agnostic config
│
└── README.md                     ← This module's docs
```

---

## 🔧 Step-by-Step Migration

### **Step 1: Copy Course Module**

```bash
# From teneo-marketplace root
cp -r course-module /path/to/teneo-production/

# Or create the module first:
mkdir course-module
cp -r marketplace/frontend/course-player.html course-module/frontend/
cp -r marketplace/frontend/css/course-player.css course-module/frontend/css/
cp -r marketplace/frontend/js/course-player.js course-module/frontend/js/
# ... etc
```

### **Step 2: Update Configuration**

Edit `course-module/config/course-config.js`:

```javascript
module.exports = {
  // API Base URL (change per environment)
  apiBaseUrl: process.env.API_BASE_URL || '/api',

  // Video hosting
  videoProvider: process.env.VIDEO_PROVIDER || 'bunny', // 'bunny', 'self', 'vimeo'
  bunnyStreamApiKey: process.env.BUNNY_STREAM_API_KEY,

  // File upload paths
  uploadDir: process.env.COURSE_UPLOAD_DIR || './uploads/courses',

  // Features
  enableDrip: process.env.ENABLE_DRIP_CONTENT !== 'false',
  enableCertificates: process.env.ENABLE_CERTIFICATES !== 'false',
  enableDiscussions: process.env.ENABLE_DISCUSSIONS !== 'false',

  // Database table prefix (for multi-tenant)
  tablePrefix: process.env.COURSE_TABLE_PREFIX || 'course_',

  // Progress sync interval (ms)
  progressSyncInterval: 30000
};
```

### **Step 3: Install in Backend**

In your teneo-production `server.js` or main app file:

```javascript
// Import course routes
const courseRoutes = require('./course-module/backend/routes/courses');
const coursePlayerRoutes = require('./course-module/backend/routes/coursePlayer');
const courseBuilderRoutes = require('./course-module/backend/routes/courseBuilder');

// Mount routes
app.use('/api/courses', courseRoutes);
app.use('/api/course-player', coursePlayerRoutes);
app.use('/api/admin/courses', courseBuilderRoutes);

// Serve course frontend
app.use('/courses', express.static('course-module/frontend'));
```

### **Step 4: Run Database Migration**

```bash
# In teneo-production
sqlite3 your-database.db < course-module/backend/database/schema-courses.sql

# Or in your migration script:
node course-module/backend/database/migrate.js
```

### **Step 5: Update Frontend Paths**

In `course-module/frontend/js/course-player.js`:

```javascript
// Change this:
const API_BASE = '/api';

// To use config:
import config from '../config/course-config.js';
const API_BASE = config.apiBaseUrl;
```

Or inject via HTML:

```html
<script>
  window.COURSE_CONFIG = {
    apiBaseUrl: '<%= process.env.API_BASE_URL || "/api" %>'
  };
</script>
<script src="js/course-player.js"></script>
```

---

## 🎯 Zero-Dependency Migration

**No framework changes required!**

The course module works with:
- ✅ Express.js (what we're using)
- ✅ Any Node.js framework (Koa, Fastify, etc.)
- ✅ SQLite (current setup)
- ✅ PostgreSQL, MySQL (with schema tweaks)
- ✅ Vanilla JS frontend (no React/Vue/framework needed)

---

## 🔌 Integration Points

### **1. Authentication**

The course module expects a user object. Adapt your auth:

```javascript
// In teneo-production, you might have:
app.use('/api/courses', requireAuth, courseRoutes);

// Where requireAuth sets req.user:
function requireAuth(req, res, next) {
  // Your existing auth logic
  req.user = {
    id: session.userId,
    email: session.email
  };
  next();
}
```

### **2. Payments**

Link course purchases to your existing checkout:

```javascript
// In your checkout route (teneo-production)
const { enrollStudentInCourse } = require('./course-module/backend/services/courseService');

// After successful payment:
await enrollStudentInCourse({
  courseId: productId,
  userId: user.id,
  email: user.email,
  orderId: order.id,
  pricePaid: amount
});
```

### **3. Email Notifications**

Use your existing email service:

```javascript
// In course-module/backend/services/courseService.js
const emailService = require('../../services/emailService'); // Your existing service

async function sendCourseWelcomeEmail(enrollment) {
  await emailService.send({
    to: enrollment.email,
    template: 'course-welcome',
    data: {
      courseName: enrollment.courseName,
      accessUrl: `${config.siteUrl}/courses/${enrollment.courseId}/player`
    }
  });
}
```

---

## 🗂️ Database Schema Compatibility

### **Current (teneo-marketplace):**
Uses SQLite with simple schema

### **For teneo-production:**

**Option 1: Keep SQLite**
```javascript
// No changes needed
const db = require('better-sqlite3')('courses.db');
```

**Option 2: Switch to PostgreSQL**
```javascript
// Change in course-module/backend/database/db.js
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Update SQL syntax (minimal changes):
// SQLite: INTEGER PRIMARY KEY AUTOINCREMENT
// PostgreSQL: SERIAL PRIMARY KEY
```

**Option 3: Use Existing DB Connection**
```javascript
// In course-module/backend/database/db.js
module.exports = require('../../database/db'); // Your existing DB
```

---

## 📝 Configuration Checklist

### **Environment Variables (teneo-production .env)**

```env
# Course Module Configuration
COURSE_MODULE_ENABLED=true
API_BASE_URL=/api
COURSE_UPLOAD_DIR=./uploads/courses

# Video Hosting
VIDEO_PROVIDER=bunny
BUNNY_STREAM_API_KEY=your_key_here

# Features
ENABLE_DRIP_CONTENT=true
ENABLE_CERTIFICATES=true
ENABLE_DISCUSSIONS=true

# Database (if separate)
COURSE_DB_PATH=./courses.db
# Or use existing:
# DATABASE_URL=postgresql://...

# URLs
SITE_URL=https://yoursite.com
```

---

## 🎨 Branding Customization

### **Match teneo-production Branding:**

Edit `course-module/frontend/css/course-player.css`:

```css
:root {
  /* Change these to match teneo-production colors */
  --brand-primary: #7C3AED;    /* Your primary color */
  --brand-secondary: #3B82F6;  /* Secondary color */
  --brand-accent: #f7c948;     /* Accent color */
}
```

Or inject from config:

```html
<style>
  :root {
    --brand-primary: <%= brandConfig.primaryColor %>;
    --brand-secondary: <%= brandConfig.secondaryColor %>;
  }
</style>
```

---

## 🧪 Testing After Migration

### **1. Basic Test:**
```bash
# Start teneo-production server
npm start

# Visit course player
http://localhost:3001/courses/course-player.html?course=1&enrollment=1
```

### **2. API Test:**
```bash
# Test course API
curl http://localhost:3001/api/courses/1/player?enrollment=1
```

### **3. Video Upload Test:**
```bash
# Test video upload
curl -X POST http://localhost:3001/api/admin/courses/1/upload \
  -F "file=@test-video.mp4"
```

---

## 🔄 Keep Modules in Sync

### **Option 1: Git Submodule**
```bash
# In teneo-production
git submodule add ../teneo-marketplace/course-module course-module

# Update when course module changes
git submodule update --remote course-module
```

### **Option 2: npm Package**
```bash
# In teneo-marketplace
cd course-module
npm init
npm publish

# In teneo-production
npm install @teneo/course-module
```

### **Option 3: Manual Sync**
```bash
# Copy latest version
rsync -av ../teneo-marketplace/course-module/ ./course-module/
```

---

## 📦 Minimal Migration (Just Copy These)

**If you want the absolute minimum:**

### **Frontend (3 files):**
```
course-player.html
css/course-player.css
js/course-player.js
```

### **Backend (2 files):**
```
routes/coursePlayer.js
services/coursePlayerService.js
```

### **Database (1 file):**
```
database/schema-courses.sql
```

That's it! 6 files and you have a working course player.

---

## 🛠️ Customization Examples

### **Example 1: Add Custom Fields**

```javascript
// In course-module/backend/services/courseService.js
async function createCourse(courseData) {
  const course = await db.run(`
    INSERT INTO courses (
      title, subtitle, icon,
      custom_field_1,  ← Your custom field
      custom_field_2   ← Another custom field
    ) VALUES (?, ?, ?, ?, ?)
  `, [
    courseData.title,
    courseData.subtitle,
    courseData.icon,
    courseData.customField1,
    courseData.customField2
  ]);

  return course;
}
```

### **Example 2: Add Custom Routes**

```javascript
// In teneo-production/routes/customCourseRoutes.js
const express = require('express');
const router = express.Router();
const courseService = require('../course-module/backend/services/courseService');

// Custom route for your specific needs
router.get('/my-custom-endpoint', async (req, res) => {
  const courses = await courseService.getAllCourses();
  // Your custom logic
  res.json({ success: true, data: courses });
});

module.exports = router;
```

### **Example 3: Custom Progress Logic**

```javascript
// Override default progress tracking
// In course-module/config/course-config.js
module.exports = {
  // ... other config

  progressCalculation: (completedLessons, totalLessons) => {
    // Custom logic: weight quizzes more heavily
    const quizWeight = 2;
    const regularWeight = 1;

    const totalWeight = completedLessons.reduce((sum, lesson) => {
      return sum + (lesson.type === 'quiz' ? quizWeight : regularWeight);
    }, 0);

    return (totalWeight / (totalLessons * regularWeight)) * 100;
  }
};
```

---

## 🚨 Common Gotchas

### **1. Path Issues**
```javascript
// ❌ Don't hardcode paths
const css = '/css/course-player.css';

// ✅ Use relative paths or config
const css = `${config.assetsPath}/course-player.css`;
```

### **2. Database Differences**
```javascript
// ❌ SQLite-specific syntax
const courses = await db.all('SELECT * FROM courses LIMIT ?', [10]);

// ✅ Universal syntax
const courses = await db.query('SELECT * FROM courses LIMIT $1', [10]);
```

### **3. Authentication**
```javascript
// ❌ Assuming auth structure
const userId = req.session.user.id;

// ✅ Check your auth system
const userId = req.user?.id || req.session?.userId || null;
```

---

## ✅ Migration Checklist

**Before copying:**
- [ ] Review teneo-production folder structure
- [ ] Check database type (SQLite vs PostgreSQL)
- [ ] Note existing auth system
- [ ] Review existing email service
- [ ] Check brand colors

**During migration:**
- [ ] Copy course-module folder
- [ ] Update config/course-config.js
- [ ] Mount routes in server.js
- [ ] Run database migration
- [ ] Update API paths in frontend
- [ ] Test basic course loading

**After migration:**
- [ ] Test course player in browser
- [ ] Verify API endpoints work
- [ ] Test video upload
- [ ] Test progress tracking
- [ ] Test on mobile
- [ ] Update documentation

---

## 🎉 Success Criteria

**You've successfully migrated when:**
- ✅ Course player loads at `/courses/course-player.html`
- ✅ API returns course data at `/api/courses/:id/player`
- ✅ Progress tracking saves to database
- ✅ Videos play smoothly
- ✅ Mobile responsive works
- ✅ Branding matches your site

---

## 📞 Need Help?

**Common issues:**
1. **404 on course player** → Check static file serving path
2. **API errors** → Verify routes are mounted correctly
3. **Database errors** → Check table prefix and schema
4. **Video not playing** → Verify upload path and permissions
5. **Styling broken** → Check CSS file paths

**Quick fixes:**
```javascript
// Enable debug mode
process.env.DEBUG = 'course:*';

// Check what's mounted
console.log(app._router.stack);

// Test database connection
const db = require('./course-module/backend/database/db');
console.log(await db.get('SELECT 1'));
```

---

**The course module is now 100% portable and ready to copy to teneo-production!** 🚀
