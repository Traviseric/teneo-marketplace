# 🚀 Copy Course Module to teneo-production

**One-command migration to your production repo**

---

## ⚡ Quick Copy (30 seconds)

### **Option 1: Use the Copy Script (Recommended)**

**On Windows:**
```bash
copy-course-module.bat "D:\Travis Eric\TE Code\teneo-production"
```

**On Mac/Linux:**
```bash
chmod +x copy-course-module.sh
./copy-course-module.sh "/path/to/teneo-production"
```

**That's it!** The script automatically copies all files and creates integration guides.

---

### **Option 2: Manual Copy**

```bash
# Copy entire course-module folder
cp -r course-module /path/to/teneo-production/

# Copy documentation
cp COURSE_MODULE_MIGRATION_GUIDE.md /path/to/teneo-production/
cp COURSE_PLATFORM_DESIGN.md /path/to/teneo-production/
```

---

## 📂 What Gets Copied

```
teneo-production/
└── course-module/              ← New folder
    ├── frontend/
    │   ├── course-player.html
    │   ├── admin-course-builder.html
    │   ├── css/
    │   │   └── course-player.css
    │   └── js/
    │       ├── course-player.js
    │       ├── video-controls.js
    │       └── course-progress.js
    ├── backend/
    │   ├── routes/              (structure created)
    │   ├── services/            (structure created)
    │   └── database/            (structure created)
    ├── config/
    │   └── course-config.js     ← All settings here
    ├── .env.example             ← Copy to .env
    ├── README.md                ← Module docs
    └── QUICK_START.md           ← Integration guide
```

---

## 🔌 Integration Steps (5 minutes)

### **1. Navigate to teneo-production**
```bash
cd /path/to/teneo-production
```

### **2. Review Quick Start**
```bash
cat course-module/QUICK_START.md
```

### **3. Install Dependencies**
```bash
npm install multer better-sqlite3
```

### **4. Add to Server**

In your `server.js` or main file:

```javascript
// At the top with other imports
const path = require('path');

// Serve course player (static files)
app.use('/courses', express.static(path.join(__dirname, 'course-module/frontend')));

// Mount course API routes (when you create them)
// const courseRoutes = require('./course-module/backend/routes/courses');
// app.use('/api/courses', courseRoutes);
```

### **5. Test Frontend Only (No Backend Needed Yet)**

```bash
npm start

# Open in browser:
http://localhost:3001/courses/course-player.html
```

**It will work immediately with mock data!**

---

## ✅ Verification Checklist

After copying, verify:

- [ ] `course-module/` folder exists in teneo-production
- [ ] Can access `http://localhost:3001/courses/course-player.html`
- [ ] Course player loads with mock data
- [ ] Navigation works (prev/next buttons)
- [ ] Progress circle displays
- [ ] Mobile responsive (resize browser)

---

## 🎯 Next Steps (When Ready for Backend)

### **Phase 1: Frontend Only (Works Now)**
✅ Course player UI functional
✅ Mock data displays correctly
✅ Navigation and progress tracking work (localStorage)

### **Phase 2: Add Backend API (1-2 days)**
```javascript
// Create: course-module/backend/routes/courses.js
// Create: course-module/backend/services/courseService.js
// Mount: app.use('/api/courses', courseRoutes)
```

### **Phase 3: Database Integration (1 day)**
```bash
# Run migration
sqlite3 teneo-production.db < course-module/backend/database/schema-courses.sql
```

### **Phase 4: Real Courses (Ongoing)**
- Use admin builder to create courses
- Upload videos
- Enroll students

---

## 🔄 Syncing Updates

If course module gets updated in teneo-marketplace:

**Option 1: Re-run Copy Script**
```bash
./copy-course-module.sh "/path/to/teneo-production"
# Overwrites with latest version
```

**Option 2: Manual Sync**
```bash
rsync -av teneo-marketplace/course-module/ teneo-production/course-module/
```

**Option 3: Git Submodule (Advanced)**
```bash
cd teneo-production
git submodule add ../teneo-marketplace/course-module course-module
git submodule update --remote
```

---

## 🎨 Customization in teneo-production

### **Change Branding**

Edit `course-module/frontend/css/course-player.css`:
```css
:root {
  --brand-primary: #YourColor;
  --brand-secondary: #YourColor;
  --brand-accent: #YourColor;
}
```

### **Change Configuration**

Edit `course-module/config/course-config.js`:
```javascript
module.exports = {
  apiBaseUrl: '/your-api-path',
  videoProvider: 'bunny', // or 'self'
  // ... other settings
};
```

### **Add Custom Features**

The module is yours! Modify anything:
- Add new lesson types
- Custom progress calculation
- Additional UI components
- Integration with your existing systems

---

## 📝 Important Files

**Read These First:**
1. `course-module/QUICK_START.md` - Integration guide
2. `course-module/README.md` - Module documentation
3. `COURSE_MODULE_MIGRATION_GUIDE.md` - Full migration details
4. `course-module/config/course-config.js` - All settings

**Reference:**
1. `COURSE_PLATFORM_DESIGN.md` - UI/UX specifications
2. `COURSES_PLATFORM_IMPLEMENTATION.md` - Backend implementation
3. `course-module/.env.example` - Environment variables

---

## 🐛 Troubleshooting

### **"Cannot find course-player.html"**
```bash
# Check if files copied correctly
ls -la teneo-production/course-module/frontend/
```

### **"404 on /courses/course-player.html"**
```javascript
// In server.js, make sure you have:
app.use('/courses', express.static('course-module/frontend'));
```

### **"Styles not loading"**
```html
<!-- In course-player.html, paths should be relative: -->
<link rel="stylesheet" href="css/course-player.css">
<!-- NOT absolute: -->
<!-- <link rel="stylesheet" href="/css/course-player.css"> -->
```

---

## 💡 Tips

1. **Start with frontend only** - It works with mock data immediately
2. **Add backend when ready** - No rush, frontend is fully functional
3. **Keep it simple** - Don't over-customize at first
4. **Test often** - Open in browser and click around
5. **Read the docs** - Everything is documented in course-module/

---

## 🎉 Success!

**You now have:**
- ✅ Course player in teneo-production
- ✅ All frontend files working
- ✅ Mock data for testing
- ✅ Complete documentation
- ✅ Ready to integrate backend when needed

**Next:**
- Open course player in browser
- Test navigation and features
- Read integration docs
- Plan backend implementation

---

## 📞 Need Help?

**Common commands:**
```bash
# Test if server is running
curl http://localhost:3001/courses/course-player.html

# Check if files exist
ls course-module/frontend/

# View configuration
cat course-module/config/course-config.js

# Read quick start
cat course-module/QUICK_START.md
```

**Debug mode:**
```bash
DEBUG=true npm start
```

---

**The course module is now in teneo-production and ready to use!** 🚀

Just run the copy script and you're 90% done. The frontend works immediately with zero backend setup needed.
