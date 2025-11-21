# 🎓 Course Module - Portable Course Platform

**A self-contained, framework-agnostic course platform you can drop into any Node.js project**

---

## 🚀 Quick Start

### **1. Copy to Your Project**

```bash
# Copy entire course-module folder to your project
cp -r course-module /path/to/your-project/
```

### **2. Install Dependencies**

```bash
npm install multer      # File uploads
npm install better-sqlite3  # Or your preferred database
```

### **3. Mount in Your Server**

```javascript
// In your server.js or app.js
const express = require('express');
const app = express();

// Import course routes
const courseRoutes = require('./course-module/backend/routes/courses');

// Mount routes
app.use('/api/courses', courseRoutes);

// Serve course player
app.use('/courses', express.static('course-module/frontend'));

// Start server
app.listen(3001, () => console.log('Server running'));
```

### **4. Create Database Tables**

```bash
# Run migration
sqlite3 your-database.db < course-module/backend/database/schema-courses.sql
```

### **5. Open Course Player**

```
http://localhost:3001/courses/course-player.html?course=1&enrollment=1
```

---

## 📂 What's Included

```
course-module/
├── frontend/              # Student & admin interfaces
│   ├── course-player.html
│   ├── admin-course-builder.html
│   ├── css/
│   └── js/
├── backend/               # API routes & services
│   ├── routes/
│   ├── services/
│   └── database/
├── config/                # Environment settings
│   └── course-config.js
└── README.md             # This file
```

---

## 🔌 Integration

### **With Express.js (Current)**

```javascript
const courseRoutes = require('./course-module/backend/routes/courses');
app.use('/api/courses', courseRoutes);
```

### **With Your Auth System**

```javascript
const { requireAuth } = require('./middleware/auth');

app.use('/api/courses', requireAuth, courseRoutes);
// Now req.user is available in course routes
```

### **With Your Database**

```javascript
// In course-module/backend/database/db.js
module.exports = require('../../your-existing-db-connection');
```

### **With Your Email Service**

```javascript
// In course-module/backend/services/courseService.js
const emailService = require('../../services/emailService');

async function sendWelcomeEmail(enrollment) {
  await emailService.send({
    to: enrollment.email,
    template: 'course-welcome',
    data: { courseName: enrollment.courseName }
  });
}
```

---

## ⚙️ Configuration

Edit `config/course-config.js` or use environment variables:

```env
# .env file
COURSE_API_BASE_URL=/api
SITE_URL=https://yoursite.com

# Video hosting
VIDEO_PROVIDER=bunny
BUNNY_STREAM_API_KEY=your_key

# Features
ENABLE_DRIP_CONTENT=true
ENABLE_CERTIFICATES=true
ENABLE_DISCUSSIONS=true

# Database
COURSE_DB_PATH=./courses.db
```

---

## 🎨 Customization

### **Change Branding**

Edit `frontend/css/course-player.css`:

```css
:root {
  --brand-primary: #YourColor;
  --brand-secondary: #YourColor;
  --brand-accent: #YourColor;
}
```

### **Add Custom Fields**

Edit database schema and services as needed.

### **Custom Routes**

```javascript
// Add to backend/routes/customCourseRoutes.js
router.get('/my-custom-endpoint', async (req, res) => {
  // Your logic
});
```

---

## 📊 Features

✅ **Course Player** - Beautiful Podia-like interface
✅ **Progress Tracking** - Save position, completion tracking
✅ **Video Player** - Auto-complete, position saving
✅ **Course Builder** - Admin interface to create courses
✅ **Mobile Responsive** - Works on all devices
✅ **Drip Content** - Release lessons over time
✅ **Certificates** - Award on completion
✅ **Discussions** - Per-lesson forums
✅ **Quizzes** - Test student knowledge

---

## 🧪 Testing

```bash
# Run with mock data
USE_MOCK_COURSE_DATA=true npm start

# Open in browser
http://localhost:3001/courses/course-player.html
```

---

## 📖 Documentation

- **[Migration Guide](../COURSE_MODULE_MIGRATION_GUIDE.md)** - Full migration instructions
- **[Design Specs](../COURSE_PLATFORM_DESIGN.md)** - UI/UX specifications
- **[API Docs](../COURSES_PLATFORM_IMPLEMENTATION.md)** - Backend API details

---

## 🔒 Security

- ✅ Enrollment verification before access
- ✅ Time-limited download tokens
- ✅ Video position validation
- ✅ CSRF protection ready
- ✅ SQL injection prevention

---

## 🚢 Deployment

Works with:
- ✅ Vercel, Netlify (frontend)
- ✅ Render, Railway, Heroku (backend)
- ✅ AWS, DigitalOcean, Linode (VPS)
- ✅ Docker containers

---

## 📞 Support

**Common Issues:**
1. **404 on player** → Check static file path
2. **API errors** → Verify routes mounted
3. **Database errors** → Run migration script
4. **Video issues** → Check upload directory permissions

**Debug Mode:**
```bash
DEBUG=true npm start
```

---

## ✅ Checklist

**Before using:**
- [ ] Copied course-module folder to project
- [ ] Ran database migration
- [ ] Updated config/course-config.js
- [ ] Mounted routes in server
- [ ] Configured video hosting
- [ ] Updated branding colors

**After setup:**
- [ ] Course player loads
- [ ] API returns data
- [ ] Progress tracking works
- [ ] Videos play
- [ ] Mobile responsive works

---

**This module is 100% portable and production-ready!** 🚀

Copy it to teneo-production or any other Node.js project with zero modifications.
