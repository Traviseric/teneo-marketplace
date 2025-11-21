#!/bin/bash

# Course Module Copy Script
# Usage: ./copy-course-module.sh /path/to/teneo-production

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if target path provided
if [ -z "$1" ]; then
  echo -e "${YELLOW}Usage: ./copy-course-module.sh /path/to/target-project${NC}"
  echo ""
  echo "Example:"
  echo "  ./copy-course-module.sh /d/Travis\ Eric/TE\ Code/teneo-production"
  exit 1
fi

TARGET_PATH="$1"

# Verify target exists
if [ ! -d "$TARGET_PATH" ]; then
  echo -e "${YELLOW}Error: Target path does not exist: $TARGET_PATH${NC}"
  exit 1
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Course Module Copy Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Target: ${GREEN}$TARGET_PATH${NC}"
echo ""

# Create course-module directory in target
echo -e "${BLUE}[1/7]${NC} Creating course-module directory..."
mkdir -p "$TARGET_PATH/course-module"

# Copy frontend files
echo -e "${BLUE}[2/7]${NC} Copying frontend files..."
mkdir -p "$TARGET_PATH/course-module/frontend/css"
mkdir -p "$TARGET_PATH/course-module/frontend/js"

cp marketplace/frontend/course-player.html "$TARGET_PATH/course-module/frontend/"
cp marketplace/frontend/admin-course-builder.html "$TARGET_PATH/course-module/frontend/"
cp marketplace/frontend/css/course-player.css "$TARGET_PATH/course-module/frontend/css/"
cp marketplace/frontend/js/course-player.js "$TARGET_PATH/course-module/frontend/js/"
cp marketplace/frontend/js/video-controls.js "$TARGET_PATH/course-module/frontend/js/"
cp marketplace/frontend/js/course-progress.js "$TARGET_PATH/course-module/frontend/js/"

echo -e "${GREEN}   ✓ Frontend files copied${NC}"

# Copy backend files (create placeholders if they don't exist)
echo -e "${BLUE}[3/7]${NC} Creating backend structure..."
mkdir -p "$TARGET_PATH/course-module/backend/routes"
mkdir -p "$TARGET_PATH/course-module/backend/services"
mkdir -p "$TARGET_PATH/course-module/backend/database"

echo -e "${GREEN}   ✓ Backend structure created${NC}"

# Copy config
echo -e "${BLUE}[4/7]${NC} Copying configuration..."
mkdir -p "$TARGET_PATH/course-module/config"
cp course-module/config/course-config.js "$TARGET_PATH/course-module/config/"

echo -e "${GREEN}   ✓ Configuration copied${NC}"

# Copy documentation
echo -e "${BLUE}[5/7]${NC} Copying documentation..."
cp course-module/README.md "$TARGET_PATH/course-module/"
cp COURSE_MODULE_MIGRATION_GUIDE.md "$TARGET_PATH/"
cp COURSE_PLATFORM_DESIGN.md "$TARGET_PATH/"

echo -e "${GREEN}   ✓ Documentation copied${NC}"

# Create .env.example
echo -e "${BLUE}[6/7]${NC} Creating .env.example..."
cat > "$TARGET_PATH/course-module/.env.example" << 'EOF'
# Course Module Configuration

# API
COURSE_API_BASE_URL=/api
SITE_URL=http://localhost:3001

# Video Hosting
VIDEO_PROVIDER=self
BUNNY_STREAM_API_KEY=
BUNNY_STREAM_LIBRARY_ID=
BUNNY_CDN_URL=

# Upload
COURSE_UPLOAD_DIR=./uploads/courses
MAX_VIDEO_SIZE=524288000

# Features
ENABLE_DRIP_CONTENT=true
ENABLE_CERTIFICATES=true
ENABLE_DISCUSSIONS=true
ENABLE_QUIZZES=true
ENABLE_NOTES=false
ENABLE_REVIEWS=true

# Database
DB_TYPE=sqlite
COURSE_DB_PATH=./courses.db
DATABASE_URL=

# Progress
PROGRESS_SYNC_INTERVAL=30000
AUTO_COMPLETE_THRESHOLD=90

# Branding
BRAND_PRIMARY_COLOR=#7C3AED
BRAND_SECONDARY_COLOR=#3B82F6
BRAND_ACCENT_COLOR=#f7c948

# Email
SEND_COURSE_WELCOME_EMAIL=true
SEND_COURSE_COMPLETION_EMAIL=true
EMAIL_FROM_NAME=Course Platform
EMAIL_FROM_ADDRESS=courses@example.com

# Security
REQUIRE_COURSE_AUTH=true
VERIFY_ENROLLMENT=true
DOWNLOAD_TOKEN_EXPIRY=24
MAX_DOWNLOAD_ATTEMPTS=5

# Development
DEBUG=false
USE_MOCK_COURSE_DATA=false
NODE_ENV=production
EOF

echo -e "${GREEN}   ✓ .env.example created${NC}"

# Create integration guide
echo -e "${BLUE}[7/7]${NC} Creating quick start guide..."
cat > "$TARGET_PATH/course-module/QUICK_START.md" << 'EOF'
# Quick Start - Course Module

## 1. Install Dependencies

```bash
npm install multer better-sqlite3
```

## 2. Add to Your Server

In your main server file (e.g., `server.js`):

```javascript
const express = require('express');
const app = express();

// Mount course routes (create these files or use existing)
const courseRoutes = require('./course-module/backend/routes/courses');
app.use('/api/courses', courseRoutes);

// Serve course player
app.use('/courses', express.static('course-module/frontend'));
```

## 3. Run Database Migration

```bash
# If using SQLite:
sqlite3 your-database.db < course-module/backend/database/schema-courses.sql

# If using PostgreSQL:
psql your-database < course-module/backend/database/schema-courses-postgres.sql
```

## 4. Configure Environment

```bash
cp course-module/.env.example .env
# Edit .env with your settings
```

## 5. Test It

```bash
npm start

# Open in browser:
http://localhost:3001/courses/course-player.html?course=1&enrollment=1
```

## Next Steps

- Read: COURSE_MODULE_MIGRATION_GUIDE.md
- Review: course-module/config/course-config.js
- Customize: course-module/frontend/css/course-player.css

## Need Help?

Check course-module/README.md for detailed instructions.
EOF

echo -e "${GREEN}   ✓ Quick start guide created${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✓ Course Module Copied Successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Files copied to: ${GREEN}$TARGET_PATH/course-module/${NC}"
echo ""
echo -e "Next steps:"
echo -e "  1. cd $TARGET_PATH"
echo -e "  2. Read course-module/QUICK_START.md"
echo -e "  3. Configure course-module/.env.example"
echo -e "  4. Integrate with your server"
echo ""
echo -e "${BLUE}Happy course building! 🚀${NC}"
