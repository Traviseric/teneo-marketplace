# 🚀 Funnel Builder + Course Integration Plan
## Complete System Build Plan (1 Week / 6 Days)

**Last Updated:** 2024-11-20

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Day-by-Day Build Plan](#day-by-day-build-plan)
3. [File Structure](#file-structure)
4. [Integration Architecture](#integration-architecture)
5. [Data Flow](#data-flow)
6. [API Endpoints](#api-endpoints)
7. [User Journeys](#user-journeys)
8. [Testing Checklist](#testing-checklist)
9. [Deployment Steps](#deployment-steps)
10. [Resumption Points](#resumption-points)

---

## 🎯 System Overview

### What We're Building:

**Two Tools + One Course:**

1. **Tool 1: Course Builder** ✅ (Already Built)
   - Platform for creating ANY courses
   - Located: `course-module/`
   - Status: Production-ready, portable

2. **Tool 2: Funnel Builder** 🔨 (Building Now)
   - Interactive template system for book funnels
   - 4 funnel types: Gated Sneak-Peak, Story-Driven, Reader Magnet, Direct-to-Sale
   - AI-powered variable filling
   - Located: Will create in `funnel-module/`

3. **Content: "Book Funnel Blueprint" Course** 🔨 (Building Now)
   - NOT a traditional "how-to" course
   - Interactive course that walks users through BUILDING their funnel
   - Each lesson = one step in the funnel builder
   - By end of course, they have a complete, deployed funnel

### The Vision:

```
User enrolls in "Book Funnel Blueprint" course
  ↓
Lesson 1: "Choose Your Funnel Type" → Opens Funnel Builder (quiz)
  ↓
Lesson 2: "Craft Your Headline" → Fills in BOOK_TITLE variable (with AI help)
  ↓
Lesson 3: "Write Your Benefits" → Fills in BENEFIT_1-6 variables
  ↓
... (5 more lessons)
  ↓
Lesson 8: "Launch Your Funnel" → Exports/deploys finished funnel
  ↓
RESULT: User has live, working book funnel in 60 minutes
```

---

## 📅 Day-by-Day Build Plan

### **Day 1-3: Build Basic Funnel Builder (72 hours)**

#### Day 1: Core UI (24 hours)

**Morning (8 hours):**
- [ ] Create `funnel-module/` folder structure
- [ ] Create `funnel-module/frontend/funnel-builder.html`
- [ ] Design UI layout (quiz + editor + preview)
- [ ] Create CSS (`funnel-builder.css`)

**Afternoon (8 hours):**
- [ ] Build variable input form generator
- [ ] Auto-detect variables from templates
- [ ] Create input fields dynamically
- [ ] Add form validation

**Evening (8 hours):**
- [ ] Integrate `template-processor.js`
- [ ] Build live preview panel
- [ ] Real-time variable replacement
- [ ] Test with `book-sales-page.html`

**Deliverable:** Funnel builder UI with manual fill + live preview

---

#### Day 2: AI Integration (24 hours)

**Morning (8 hours):**
- [ ] Create `funnel-prompts.json` (30+ AI prompts)
- [ ] Build AI prompt helper UI (💡 button)
- [ ] Prompt popup with copy button
- [ ] Test prompts with ChatGPT

**Afternoon (8 hours):**
- [ ] Add "Auto-Generate" button
- [ ] Create `aiHelpers.js` module
- [ ] Integrate Claude API (optional)
- [ ] Add loading states

**Evening (8 hours):**
- [ ] Build funnel wizard (5-question quiz)
- [ ] Quiz logic + recommendation engine
- [ ] Connect quiz results to template selection
- [ ] Test all quiz paths

**Deliverable:** AI-powered funnel builder with 3 modes (manual, prompts, auto)

---

#### Day 3: Export & Polish (24 hours)

**Morning (8 hours):**
- [ ] Add export features:
  - [ ] Download HTML (single file)
  - [ ] Download ZIP (multi-file)
  - [ ] Copy to clipboard
- [ ] Test exports in different browsers

**Afternoon (8 hours):**
- [ ] Create funnel save/load system
- [ ] LocalStorage for draft funnels
- [ ] "Continue editing" feature
- [ ] Funnel library (browse saved)

**Evening (8 hours):**
- [ ] Deploy to Teneo feature
- [ ] Create backend API (`/api/funnels/deploy`)
- [ ] Save funnel to database
- [ ] Generate live URL
- [ ] Test deployment

**Deliverable:** Complete, production-ready funnel builder

---

### **Day 4-5: Create Course Content (48 hours)**

#### Day 4: Course Structure & Lessons 1-4 (24 hours)

**Morning (8 hours):**
- [ ] Create course data structure
- [ ] Course metadata (title, description, pricing)
- [ ] Module 1: Foundation (3 lessons)
  - [ ] Lesson 1: "Choose Your Funnel Type" (quiz walkthrough)
  - [ ] Lesson 2: "Understand Your Audience" (worksheet)
  - [ ] Lesson 3: "Open Funnel Builder" (action button)
- [ ] Write lesson content (text-based, no video)

**Afternoon (8 hours):**
- [ ] Module 2: Building Your Funnel (5 lessons)
  - [ ] Lesson 4: "Craft Your Headline" (BOOK_TITLE variable)
  - [ ] Lesson 5: "Write Your Benefits" (BENEFIT variables)
  - [ ] Lesson 6: "Add Social Proof" (TESTIMONIAL variables)
  - [ ] Lesson 7: "Create Your Guarantee" (GUARANTEE variable)
  - [ ] Lesson 8: "Price Your Book" (PRICE variables)
- [ ] Write lesson content + instructions

**Evening (8 hours):**
- [ ] Create action buttons for each lesson
- [ ] "Open Funnel Builder" → Opens builder with context
- [ ] "AI Prompt Helper" → Shows AI prompt for this step
- [ ] "Preview Your Work" → Opens live preview
- [ ] Test buttons

**Deliverable:** Lessons 1-8 complete with action buttons

---

#### Day 5: Course Lessons 9-12 & Polish (24 hours)

**Morning (8 hours):**
- [ ] Module 3: Launch & Optimize (4 lessons)
  - [ ] Lesson 9: "Design Thank You Page" (thank-you.html)
  - [ ] Lesson 10: "Set Up Email Follow-Up" (email sequence)
  - [ ] Lesson 11: "Deploy Your Funnel" (export/deploy)
  - [ ] Lesson 12: "Track & Optimize" (analytics setup)
- [ ] Write lesson content

**Afternoon (8 hours):**
- [ ] Add bonus lessons:
  - [ ] Bonus 1: "Advanced AI Prompts"
  - [ ] Bonus 2: "Funnel Templates Library"
  - [ ] Bonus 3: "A/B Testing Your Funnel"
- [ ] Create downloadable resources:
  - [ ] Funnel planning worksheet (PDF)
  - [ ] AI prompt cheat sheet
  - [ ] Example funnels

**Evening (8 hours):**
- [ ] Add progress tracking
- [ ] Completion certificate
- [ ] Final course review form
- [ ] Test complete course flow

**Deliverable:** Complete 12-lesson course with bonuses

---

### **Day 6: Integration & Shipping (24 hours)**

#### Morning: Integration (8 hours)

- [ ] Connect course to funnel builder
- [ ] Pass context from course to builder (URL params)
- [ ] Save funnel progress per course lesson
- [ ] "Return to Course" button in builder
- [ ] Test bidirectional navigation

#### Afternoon: Testing (8 hours)

- [ ] Complete user journey test (enroll → finish → deploy)
- [ ] Test all action buttons
- [ ] Test AI prompts
- [ ] Test export/deploy
- [ ] Mobile responsive testing
- [ ] Browser compatibility (Chrome, Firefox, Safari)

#### Evening: Polish & Ship (8 hours)

- [ ] Fix bugs from testing
- [ ] Add onboarding tutorial
- [ ] Create landing page for course
- [ ] Write documentation
- [ ] Deploy to production
- [ ] Announce launch

**Deliverable:** Complete, tested, shipped system

---

## 📁 File Structure

```
openbazaar-ai/
├── course-module/                    # Course Builder (Already Built ✅)
│   ├── frontend/
│   │   ├── course-player.html
│   │   ├── admin-course-builder.html
│   │   ├── css/
│   │   └── js/
│   ├── backend/
│   ├── config/
│   └── README.md
│
├── funnel-module/                    # Funnel Builder (Building 🔨)
│   ├── frontend/
│   │   ├── funnel-builder.html      # Main UI
│   │   ├── funnel-wizard.html       # Quiz
│   │   ├── css/
│   │   │   └── funnel-builder.css
│   │   └── js/
│   │       ├── funnel-builder.js    # Core logic
│   │       ├── funnel-wizard.js     # Quiz logic
│   │       ├── aiHelpers.js         # AI integration
│   │       └── funnelExport.js      # Export features
│   ├── backend/
│   │   ├── routes/
│   │   │   └── funnels.js           # API routes
│   │   ├── services/
│   │   │   ├── funnelService.js     # Funnel CRUD
│   │   │   └── funnelAI.js          # AI generation
│   │   └── database/
│   │       └── schema-funnels.sql   # Funnel storage
│   ├── templates/
│   │   ├── book-sales-page.html     # Existing ✅
│   │   ├── thank-you.html           # Existing ✅
│   │   ├── story-driven.html        # To create
│   │   ├── reader-magnet.html       # To create
│   │   └── direct-sale.html         # To create
│   ├── config/
│   │   ├── funnel-config.js         # Settings
│   │   └── funnel-prompts.json      # AI prompts
│   ├── QUICK_START.md
│   └── README.md
│
├── courses/                          # Course Content (Building 🔨)
│   └── book-funnel-blueprint/
│       ├── course.json              # Course metadata
│       ├── modules.json             # Module structure
│       ├── lessons/
│       │   ├── 01-choose-funnel-type.json
│       │   ├── 02-understand-audience.json
│       │   ├── 03-open-builder.json
│       │   ├── 04-craft-headline.json
│       │   ├── 05-write-benefits.json
│       │   ├── 06-add-social-proof.json
│       │   ├── 07-create-guarantee.json
│       │   ├── 08-price-book.json
│       │   ├── 09-design-thank-you.json
│       │   ├── 10-email-followup.json
│       │   ├── 11-deploy-funnel.json
│       │   └── 12-track-optimize.json
│       └── resources/
│           ├── funnel-planning-worksheet.pdf
│           ├── ai-prompt-cheat-sheet.pdf
│           └── example-funnels/
│
├── marketplace/frontend/brands/master-templates/
│   ├── book-sales-page.html         # Existing ✅
│   └── thank-you.html               # Existing ✅
│
├── marketplace/frontend/js/
│   └── template-processor.js        # Existing ✅
│
└── docs/
    ├── FUNNEL_INFRASTRUCTURE_AUDIT.md        # Existing ✅
    ├── FUNNEL_BUILDER_INTEGRATION_PLAN.md   # This file 🔨
    ├── BOOK_FUNNEL_BUILDER_CONCEPT.md       # Existing ✅
    └── COURSE_PLATFORM_DESIGN.md            # Existing ✅
```

---

## 🔌 Integration Architecture

### Component Relationships:

```
┌─────────────────────────────────────────────────┐
│          COURSE PLATFORM (course-module/)       │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │  Course Player (course-player.html)      │  │
│  │                                          │  │
│  │  Lesson: "Craft Your Headline"          │  │
│  │                                          │  │
│  │  [📺 Lesson Content]                     │  │
│  │                                          │  │
│  │  Instructions:                           │  │
│  │  - Write a compelling book title        │  │
│  │  - Use AI prompt below for help         │  │
│  │  - Click button to open funnel builder  │  │
│  │                                          │  │
│  │  ┌────────────────────────────────────┐ │  │
│  │  │ [🚀 Open Funnel Builder] ←─────────┼─┼──┼── Action Button
│  │  └────────────────────────────────────┘ │  │     (passes context)
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                       │
                       │ URL params:
                       │ ?course=book-funnel-blueprint
                       │ &lesson=4
                       │ &step=headline
                       │ &returnUrl=/courses/book-funnel-blueprint
                       ↓
┌─────────────────────────────────────────────────┐
│       FUNNEL BUILDER (funnel-module/)          │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │  Funnel Builder (funnel-builder.html)   │  │
│  │                                          │  │
│  │  Context Detected:                       │  │
│  │  - Course: Book Funnel Blueprint         │  │
│  │  - Lesson: 4                             │  │
│  │  - Focus: BOOK_TITLE variable           │  │
│  │                                          │  │
│  │  ┌─────────────────────────────────┐    │  │
│  │  │ 📝 Book Title                   │    │  │
│  │  │ [_____________________]         │    │  │
│  │  │                                 │    │  │
│  │  │ [💡 AI Prompt] [✨ Auto-Gen]    │    │  │
│  │  └─────────────────────────────────┘    │  │
│  │                                          │  │
│  │  [💾 Save Progress] [⬅️ Back to Course]  │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                       │
                       │ Saves progress to:
                       │ - localStorage (draft)
                       │ - Backend API (persistent)
                       ↓
┌─────────────────────────────────────────────────┐
│           DATABASE (SQLite)                     │
│                                                 │
│  course_enrollments                             │
│  ├─ user_id                                     │
│  ├─ course_id: 'book-funnel-blueprint'         │
│  └─ progress: { currentLesson: 4 }             │
│                                                 │
│  funnel_drafts                                  │
│  ├─ user_id                                     │
│  ├─ funnel_name                                 │
│  ├─ variables: { BOOK_TITLE: '...', ... }     │
│  ├─ template: 'book-sales-page'                │
│  ├─ created_at                                  │
│  └─ updated_at                                  │
└─────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow

### Flow 1: Course → Funnel Builder

```javascript
// In course-player.html (Lesson with action button)
function openFunnelBuilder(lessonContext) {
  const params = new URLSearchParams({
    course: 'book-funnel-blueprint',
    lesson: lessonContext.lessonNumber,
    step: lessonContext.focusVariable,  // e.g., 'headline'
    returnUrl: window.location.href
  });

  // Open funnel builder with context
  window.location.href = `/funnel-builder?${params.toString()}`;
}
```

### Flow 2: Funnel Builder Detects Context

```javascript
// In funnel-builder.js
class FunnelBuilder {
  constructor() {
    this.context = this.parseURLContext();

    if (this.context.course) {
      // Course integration mode
      this.showCourseIntegrationUI();
      this.focusOnVariable(this.context.step);
      this.loadDraftIfExists();
    } else {
      // Standalone mode
      this.showFullBuilderUI();
    }
  }

  parseURLContext() {
    const params = new URLSearchParams(window.location.search);
    return {
      course: params.get('course'),
      lesson: params.get('lesson'),
      step: params.get('step'),
      returnUrl: params.get('returnUrl')
    };
  }

  focusOnVariable(variableName) {
    // Auto-scroll to relevant variable
    const input = document.getElementById(variableName);
    if (input) {
      input.scrollIntoView({ behavior: 'smooth' });
      input.focus();

      // Highlight this variable
      input.closest('.variable-input').classList.add('highlighted');
    }
  }
}
```

### Flow 3: Save Progress

```javascript
// Auto-save every 30 seconds
setInterval(() => {
  saveFunnelDraft();
}, 30000);

async function saveFunnelDraft() {
  const draft = {
    userId: currentUser.id,
    funnelName: document.getElementById('funnel-name').value,
    template: selectedTemplate,
    variables: getCurrentVariables(),
    context: this.context  // Include course context
  };

  // Save to backend
  await fetch('/api/funnels/save-draft', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(draft)
  });

  // Also save to localStorage (backup)
  localStorage.setItem('funnel-draft', JSON.stringify(draft));
}
```

### Flow 4: Return to Course

```javascript
// In funnel-builder.html
function returnToCourse() {
  // Save current progress
  await saveFunnelDraft();

  // Mark lesson step as complete (if all required fields filled)
  if (this.context.lesson && this.isStepComplete()) {
    await fetch('/api/courses/mark-step-complete', {
      method: 'POST',
      body: JSON.stringify({
        courseId: this.context.course,
        lessonId: this.context.lesson,
        stepId: this.context.step
      })
    });
  }

  // Return to course
  if (this.context.returnUrl) {
    window.location.href = this.context.returnUrl;
  } else {
    window.location.href = '/courses/book-funnel-blueprint';
  }
}
```

### Flow 5: Load Draft on Return

```javascript
// User returns to funnel builder from course
async function loadDraftFunnel() {
  // Try to load from backend first
  const response = await fetch('/api/funnels/get-draft?userId=' + currentUser.id);

  if (response.ok) {
    const draft = await response.json();
    restoreFunnelState(draft);
  } else {
    // Fallback to localStorage
    const localDraft = localStorage.getItem('funnel-draft');
    if (localDraft) {
      restoreFunnelState(JSON.parse(localDraft));
    }
  }
}

function restoreFunnelState(draft) {
  // Restore all variable inputs
  Object.entries(draft.variables).forEach(([varName, value]) => {
    const input = document.getElementById(varName);
    if (input) {
      input.value = value;
    }
  });

  // Update live preview
  updatePreview();

  // Show "Continue editing" message
  showNotification('Welcome back! Your progress has been restored.');
}
```

---

## 🌐 API Endpoints

### Backend Routes: `/api/funnels`

```javascript
// marketplace/backend/routes/funnels.js

const express = require('express');
const router = express.Router();
const funnelService = require('../services/funnelService');

// Save funnel draft (auto-save while editing)
router.post('/save-draft', async (req, res) => {
  const { userId, funnelName, template, variables, context } = req.body;

  const draft = await funnelService.saveDraft({
    userId,
    funnelName,
    template,
    variables: JSON.stringify(variables),
    context: JSON.stringify(context),
    updatedAt: new Date()
  });

  res.json({ success: true, draftId: draft.id });
});

// Get user's draft funnel
router.get('/get-draft', async (req, res) => {
  const { userId } = req.query;

  const draft = await funnelService.getDraft(userId);

  if (draft) {
    res.json({
      ...draft,
      variables: JSON.parse(draft.variables),
      context: JSON.parse(draft.context)
    });
  } else {
    res.status(404).json({ error: 'No draft found' });
  }
});

// Deploy funnel to production
router.post('/deploy', async (req, res) => {
  const { userId, funnelName, template, variables } = req.body;

  // Process template with variables
  const processedHTML = templateProcessor.replaceVariables(
    await loadTemplate(template),
    variables
  );

  // Save to static files
  const url = await funnelService.deployFunnel({
    userId,
    funnelName,
    html: processedHTML,
    template,
    variables
  });

  res.json({ success: true, url });
});

// Export funnel as ZIP
router.post('/export', async (req, res) => {
  const { template, variables } = req.body;

  const zipFile = await funnelService.createZipExport(template, variables);

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename=funnel.zip');
  res.send(zipFile);
});

module.exports = router;
```

### Backend Service: `funnelService.js`

```javascript
// marketplace/backend/services/funnelService.js

const db = require('../database/db');
const fs = require('fs').promises;
const path = require('path');
const slugify = require('slugify');

class FunnelService {
  async saveDraft({ userId, funnelName, template, variables, context, updatedAt }) {
    // Upsert draft (update if exists, insert if new)
    const result = await db.run(`
      INSERT INTO funnel_drafts (user_id, funnel_name, template, variables, context, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        funnel_name = excluded.funnel_name,
        template = excluded.template,
        variables = excluded.variables,
        context = excluded.context,
        updated_at = excluded.updated_at
    `, [userId, funnelName, template, variables, context, updatedAt]);

    return { id: result.lastID };
  }

  async getDraft(userId) {
    return await db.get(`
      SELECT * FROM funnel_drafts
      WHERE user_id = ?
      ORDER BY updated_at DESC
      LIMIT 1
    `, [userId]);
  }

  async deployFunnel({ userId, funnelName, html, template, variables }) {
    const slug = slugify(funnelName, { lower: true, strict: true });

    // Create directory for this funnel
    const funnelDir = path.join(__dirname, '../../frontend/funnels', slug);
    await fs.mkdir(funnelDir, { recursive: true });

    // Save HTML file
    await fs.writeFile(path.join(funnelDir, 'index.html'), html);

    // Save metadata
    await fs.writeFile(
      path.join(funnelDir, 'funnel.json'),
      JSON.stringify({ template, variables, deployedAt: new Date() }, null, 2)
    );

    // Save to database
    await db.run(`
      INSERT INTO deployed_funnels (user_id, funnel_name, slug, template, variables, deployed_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [userId, funnelName, slug, template, JSON.stringify(variables), new Date()]);

    return `/funnels/${slug}`;
  }

  async createZipExport(template, variables) {
    const JSZip = require('jszip');
    const zip = new JSZip();

    // Process template
    const processedHTML = await this.processTemplate(template, variables);

    // Add files to ZIP
    zip.file('index.html', processedHTML);
    zip.file('README.txt', 'Upload this funnel to your web host and visit index.html');

    // Include CSS if template has custom styles
    if (variables.CUSTOM_CSS) {
      zip.file('styles.css', variables.CUSTOM_CSS);
    }

    return await zip.generateAsync({ type: 'nodebuffer' });
  }

  async processTemplate(templateName, variables) {
    const templatePath = path.join(__dirname, '../../frontend/brands/master-templates', templateName);
    const templateContent = await fs.readFile(templatePath, 'utf-8');

    // Use template processor
    const TemplateProcessor = require('../../frontend/js/template-processor');
    const processor = new TemplateProcessor();

    return processor.replaceVariables(templateContent, variables);
  }
}

module.exports = new FunnelService();
```

### Database Schema: `schema-funnels.sql`

```sql
-- Funnel drafts (auto-saved while editing)
CREATE TABLE IF NOT EXISTS funnel_drafts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  funnel_name TEXT NOT NULL,
  template TEXT NOT NULL,
  variables TEXT NOT NULL,  -- JSON
  context TEXT,             -- JSON (course context if any)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)  -- One draft per user (auto-updates)
);

-- Deployed funnels (production)
CREATE TABLE IF NOT EXISTS deployed_funnels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  funnel_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  template TEXT NOT NULL,
  variables TEXT NOT NULL,  -- JSON
  deployed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  views INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0
);

-- Funnel analytics
CREATE TABLE IF NOT EXISTS funnel_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  funnel_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,  -- 'view', 'click', 'conversion'
  event_data TEXT,           -- JSON
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (funnel_id) REFERENCES deployed_funnels(id)
);

-- Create indexes
CREATE INDEX idx_drafts_user ON funnel_drafts(user_id);
CREATE INDEX idx_deployed_user ON deployed_funnels(user_id);
CREATE INDEX idx_deployed_slug ON deployed_funnels(slug);
CREATE INDEX idx_analytics_funnel ON funnel_analytics(funnel_id, event_type);
```

---

## 👤 User Journeys

### Journey 1: New User (No Experience)

```
Step 1: Discover Course
  → User finds "Book Funnel Blueprint" course
  → Sees promise: "Build your funnel in 60 minutes"
  → Enrolls (free or paid)

Step 2: Start Course
  → Course Player loads
  → Lesson 1: "Choose Your Funnel Type"
  → Takes 5-question quiz
  → Recommendation: "Gated Sneak-Peak Funnel"
  → Clicks: [Start Building]

Step 3: Funnel Builder Opens
  → Quiz results pre-selected template
  → UI shows: "You're building a Gated Sneak-Peak funnel"
  → [Back to Course] button visible (top-right)

Step 4: Work Through Lessons
  → Each lesson focuses on one variable
  → Lesson 2: Craft headline → BOOK_TITLE variable highlighted
  → User types manually OR clicks [💡 AI Prompt]
  → AI prompt appears: "Write a compelling title for a book about..."
  → User copies prompt → ChatGPT → pastes result
  → Progress auto-saves every 30 seconds

Step 5: Complete Variables (Lessons 2-8)
  → Lesson 3: Benefits → BENEFIT_1-6 variables
  → Lesson 4: Social proof → TESTIMONIAL variables
  → Lesson 5: Guarantee → GUARANTEE_TEXT variable
  → Lesson 6: Pricing → PRICE variables
  → Each lesson = 5-10 minutes
  → Live preview updates in real-time

Step 6: Deploy Funnel (Lesson 11)
  → All variables filled
  → Preview looks good
  → Clicks: [🚀 Deploy to Teneo]
  → Funnel goes live: /funnels/your-book-title
  → Gets shareable URL

Step 7: Track & Optimize (Lesson 12)
  → Course teaches basic analytics
  → Shows how to track views/conversions
  → A/B testing ideas
  → Course complete!

RESULT: User has live funnel in ~60 minutes
```

---

### Journey 2: Experienced User (Standalone)

```
Step 1: Direct to Funnel Builder
  → User bypasses course
  → Goes directly to /funnel-builder
  → No course context

Step 2: Choose Template
  → Sees 4 funnel types
  → Clicks "Gated Sneak-Peak"
  → Builder loads with all variables

Step 3: Rapid Fill
  → User knows what they want
  → Types quickly OR uses Auto-Generate (Claude API)
  → Clicks [✨ Auto-Generate All] (premium feature)
  → All variables fill in 30 seconds

Step 4: Quick Review & Deploy
  → Reviews preview
  → Makes minor edits
  → Clicks [🚀 Deploy]
  → Live in 5 minutes

RESULT: Funnel built in ~5 minutes (expert mode)
```

---

### Journey 3: Return User (Continue Editing)

```
Step 1: Return to Builder
  → User left mid-funnel
  → Returns days later
  → Opens /funnel-builder

Step 2: Draft Restored
  → System detects saved draft
  → Shows notification: "Welcome back! Continue editing?"
  → Clicks [Yes, Continue]
  → All variables restored from last session

Step 3: Finish & Deploy
  → Completes remaining variables
  → Deploys funnel

RESULT: Progress preserved, no frustration
```

---

## ✅ Testing Checklist

### Funnel Builder Tests:

- [ ] **Template Loading**
  - [ ] Loads book-sales-page.html correctly
  - [ ] Loads thank-you.html correctly
  - [ ] Detects all variables in template
  - [ ] Generates input fields dynamically

- [ ] **Variable Input**
  - [ ] Manual typing works
  - [ ] Real-time preview updates
  - [ ] Validation works (required fields)
  - [ ] Default values populate

- [ ] **AI Prompts**
  - [ ] [💡 AI Prompt] button shows prompt
  - [ ] Prompt includes context (book title, audience, etc.)
  - [ ] Copy to clipboard works
  - [ ] Prompts are high-quality

- [ ] **Auto-Generate (Optional)**
  - [ ] [✨ Auto-Generate] button works
  - [ ] Calls Claude API correctly
  - [ ] Fills variable with result
  - [ ] Handles API errors gracefully

- [ ] **Funnel Wizard (Quiz)**
  - [ ] All 5 questions work
  - [ ] Recommendation logic correct
  - [ ] Pre-selects template based on answers
  - [ ] Can skip quiz and choose manually

- [ ] **Live Preview**
  - [ ] Updates in real-time
  - [ ] Renders correctly
  - [ ] Mobile responsive preview
  - [ ] Preview in new window works

- [ ] **Save/Load Draft**
  - [ ] Auto-saves every 30 seconds
  - [ ] Saves to localStorage
  - [ ] Saves to backend API
  - [ ] Restores on page reload
  - [ ] Shows "Draft saved" notification

- [ ] **Export Features**
  - [ ] Download HTML works
  - [ ] Download ZIP works (multi-file)
  - [ ] Copy to clipboard works
  - [ ] Exported files open correctly

- [ ] **Deploy**
  - [ ] Deploys to /funnels/slug
  - [ ] Creates directory
  - [ ] Saves to database
  - [ ] Returns correct URL
  - [ ] Funnel is live and accessible

### Course Integration Tests:

- [ ] **Course Player**
  - [ ] All 12 lessons load
  - [ ] Lesson content displays
  - [ ] Action buttons appear
  - [ ] Progress tracking works

- [ ] **Action Buttons**
  - [ ] [Open Funnel Builder] passes context correctly
  - [ ] URL params include course, lesson, step
  - [ ] [Back to Course] returns to correct lesson
  - [ ] [AI Prompt Helper] shows relevant prompt

- [ ] **Context Detection**
  - [ ] Funnel builder detects course context
  - [ ] Highlights relevant variable
  - [ ] Shows course progress UI
  - [ ] Hides irrelevant features

- [ ] **Progress Tracking**
  - [ ] Marks lesson complete when step done
  - [ ] Updates course progress bar
  - [ ] Saves progress to database
  - [ ] Persists across sessions

### End-to-End Tests:

- [ ] **Complete User Journey**
  - [ ] Enroll in course
  - [ ] Complete all 12 lessons
  - [ ] Build complete funnel
  - [ ] Deploy funnel
  - [ ] Funnel is live
  - [ ] Get completion certificate

- [ ] **Browser Compatibility**
  - [ ] Chrome (desktop)
  - [ ] Firefox (desktop)
  - [ ] Safari (desktop)
  - [ ] Chrome (mobile)
  - [ ] Safari (iOS)

- [ ] **Mobile Responsive**
  - [ ] Funnel builder works on mobile
  - [ ] Course player works on mobile
  - [ ] Preview works on mobile
  - [ ] Deploy works on mobile

- [ ] **Performance**
  - [ ] Page load < 2 seconds
  - [ ] Preview updates < 500ms
  - [ ] Auto-save doesn't lag UI
  - [ ] No memory leaks

---

## 🚀 Deployment Steps

### Pre-Deployment Checklist:

- [ ] All tests passing
- [ ] Documentation complete
- [ ] No console errors
- [ ] Mobile responsive verified
- [ ] Cross-browser tested

### Deployment Process:

**Step 1: Database Setup**
```bash
# Run funnel schema migration
sqlite3 marketplace/backend/database/openbazaar-ai.db < funnel-module/backend/database/schema-funnels.sql

# Verify tables created
sqlite3 marketplace/backend/database/openbazaar-ai.db ".tables"
# Should see: funnel_drafts, deployed_funnels, funnel_analytics
```

**Step 2: Backend Deployment**
```bash
# Copy funnel module to marketplace
cp -r funnel-module/ marketplace/

# Install dependencies (if any new ones)
cd marketplace/backend
npm install

# Mount funnel routes in server.js
# Add to marketplace/backend/server.js:
```

```javascript
// Mount funnel builder routes
const funnelRoutes = require('./funnel-module/backend/routes/funnels');
app.use('/api/funnels', funnelRoutes);

// Serve funnel builder frontend
app.use('/funnel-builder', express.static('funnel-module/frontend'));

// Serve deployed funnels
app.use('/funnels', express.static('frontend/funnels'));
```

**Step 3: Frontend Deployment**
```bash
# Ensure all files in place
ls marketplace/funnel-module/frontend/
# Should see: funnel-builder.html, funnel-wizard.html, css/, js/

# Test locally first
npm start
# Visit: http://localhost:3001/funnel-builder
```

**Step 4: Course Deployment**
```bash
# Create course in database
node marketplace/backend/scripts/create-course.js courses/book-funnel-blueprint/

# Or manually via admin dashboard
# Admin → Courses → Create New Course
# Upload course.json, modules.json, lesson files
```

**Step 5: Verify Deployment**
```bash
# Test funnel builder standalone
curl http://localhost:3001/funnel-builder

# Test course player
curl http://localhost:3001/courses/course-player.html?course=book-funnel-blueprint&enrollment=1

# Test API endpoints
curl http://localhost:3001/api/funnels/get-draft?userId=1

# Test deployed funnel
# Build a funnel via UI, deploy it, then:
curl http://localhost:3001/funnels/test-funnel
```

**Step 6: Production Deployment**
```bash
# If using Git for deployment
git add .
git commit -m "Add funnel builder + course integration"
git push origin main

# If using VPS
scp -r funnel-module/ user@server:/path/to/openbazaar-ai/
ssh user@server "cd /path/to/openbazaar-ai && npm restart"

# If using Docker
docker build -t openbazaar-ai .
docker run -p 3001:3001 openbazaar-ai
```

---

## 🔖 Resumption Points

### If You Need to Stop and Resume:

Each day has clear deliverables. You can stop at any point and resume using these markers:

#### **After Day 1 (Core UI):**
**What's Done:**
- ✅ Funnel builder HTML/CSS created
- ✅ Variable input forms working
- ✅ Live preview functional
- ✅ Manual fill works

**Resume Point:**
```bash
# Check status
ls funnel-module/frontend/
# Should see: funnel-builder.html, funnel-builder.css, funnel-builder.js

# Test what works
npm start
# Visit: http://localhost:3001/funnel-builder
# Try: Load template, fill variables, see preview
```

**Next Task:** Start Day 2 (AI Integration)

---

#### **After Day 2 (AI Integration):**
**What's Done:**
- ✅ All Day 1 features
- ✅ AI prompts created (funnel-prompts.json)
- ✅ Prompt helper UI working
- ✅ Auto-generate button functional
- ✅ Funnel quiz working

**Resume Point:**
```bash
# Check AI features
cat funnel-module/config/funnel-prompts.json
# Should see 30+ prompts

# Test AI features
# Visit builder, click [💡 AI Prompt], verify popup
# Click [✨ Auto-Generate], verify it works (if API configured)
```

**Next Task:** Start Day 3 (Export & Polish)

---

#### **After Day 3 (Funnel Builder Complete):**
**What's Done:**
- ✅ All Day 1-2 features
- ✅ Export features (HTML, ZIP, clipboard)
- ✅ Save/load drafts working
- ✅ Deploy to Teneo working

**Resume Point:**
```bash
# Verify funnel builder is production-ready
npm start

# Test complete flow:
# 1. Build funnel
# 2. Export ZIP
# 3. Save draft
# 4. Deploy
# 5. Visit deployed URL

# All should work
```

**Next Task:** Start Day 4 (Course Content)

---

#### **After Day 4 (Course Lessons 1-8):**
**What's Done:**
- ✅ Complete funnel builder
- ✅ Course structure created
- ✅ Lessons 1-8 written
- ✅ Action buttons added

**Resume Point:**
```bash
# Check course files
ls courses/book-funnel-blueprint/lessons/
# Should see: 01-choose-funnel-type.json through 08-price-book.json

# Test in course player
# Visit: http://localhost:3001/courses/course-player.html?course=book-funnel-blueprint
# Verify lessons load, action buttons work
```

**Next Task:** Start Day 5 (Lessons 9-12 + Bonuses)

---

#### **After Day 5 (Course Complete):**
**What's Done:**
- ✅ Complete funnel builder
- ✅ All 12 lessons
- ✅ Bonus lessons
- ✅ Downloadable resources

**Resume Point:**
```bash
# Verify complete course
cat courses/book-funnel-blueprint/course.json
# Should show all 12 lessons + bonuses

# Test complete course flow
# Start lesson 1, work through to lesson 12
# Verify progress tracking
```

**Next Task:** Start Day 6 (Integration & Shipping)

---

#### **After Day 6 (COMPLETE):**
**What's Done:**
- ✅ Everything
- ✅ Tested end-to-end
- ✅ Deployed to production
- ✅ Ready to ship

**Resume Point:**
```bash
# Verify production deployment
curl https://yoursite.com/funnel-builder
curl https://yoursite.com/courses/book-funnel-blueprint

# Check database
sqlite3 marketplace/backend/database/openbazaar-ai.db "SELECT COUNT(*) FROM deployed_funnels;"

# If all looks good, you're DONE! 🎉
```

---

## 📊 Progress Tracking

### Use this checklist to track overall progress:

**Funnel Builder (Days 1-3):**
- [ ] Day 1: Core UI (8am-8pm)
  - [ ] Morning: HTML/CSS layout
  - [ ] Afternoon: Variable forms
  - [ ] Evening: Live preview
- [ ] Day 2: AI Integration (8am-8pm)
  - [ ] Morning: AI prompts
  - [ ] Afternoon: Auto-generate
  - [ ] Evening: Funnel wizard
- [ ] Day 3: Export & Polish (8am-8pm)
  - [ ] Morning: Export features
  - [ ] Afternoon: Save/load drafts
  - [ ] Evening: Deploy feature

**Course Content (Days 4-5):**
- [ ] Day 4: Lessons 1-8 (8am-8pm)
  - [ ] Morning: Course structure + Lessons 1-3
  - [ ] Afternoon: Lessons 4-8
  - [ ] Evening: Action buttons
- [ ] Day 5: Lessons 9-12 + Polish (8am-8pm)
  - [ ] Morning: Lessons 9-12
  - [ ] Afternoon: Bonus content
  - [ ] Evening: Final review

**Integration & Ship (Day 6):**
- [ ] Day 6: Integration & Launch (8am-8pm)
  - [ ] Morning: Connect systems
  - [ ] Afternoon: Full testing
  - [ ] Evening: Deploy & announce

---

## 🎯 Success Criteria

### The system is ready when:

**Funnel Builder:**
- [ ] User can build complete funnel in 5-60 minutes
- [ ] AI prompts help with every variable
- [ ] Live preview updates in real-time
- [ ] Export works (HTML, ZIP, deploy)
- [ ] Mobile responsive
- [ ] No critical bugs

**Course:**
- [ ] 12 lessons load and display correctly
- [ ] Action buttons open funnel builder with context
- [ ] Progress tracking works
- [ ] Users can complete course in 60-90 minutes
- [ ] Course teaches AND builds simultaneously

**Integration:**
- [ ] Course → Funnel Builder: Context passes correctly
- [ ] Funnel Builder → Course: Return works
- [ ] Progress saves and restores
- [ ] Deployed funnels are live
- [ ] End-to-end flow tested and working

**User Experience:**
- [ ] New user can complete course + build funnel (60 min)
- [ ] Experienced user can build funnel directly (5 min)
- [ ] Draft saves prevent lost work
- [ ] AI helps eliminate writer's block
- [ ] System feels polished and professional

---

## 📞 Support & Maintenance

### After Launch:

**Monitor:**
- Error logs (check daily)
- User feedback (course completion rates)
- Funnel deployment success rates
- API errors (AI generation failures)

**Iterate:**
- Add more funnel templates based on demand
- Improve AI prompts based on results
- Add requested features
- Fix bugs as reported

**Scale:**
- Optimize database queries if usage grows
- Add caching for template processing
- CDN for deployed funnels
- Load balancing if needed

---

## 🎉 Launch Checklist

### Before announcing:

- [ ] Complete end-to-end test (enroll → build → deploy)
- [ ] Mobile testing on 3+ devices
- [ ] Browser testing (Chrome, Firefox, Safari)
- [ ] Performance testing (page load times)
- [ ] Security review (SQL injection, XSS prevention)
- [ ] Backup database
- [ ] Monitor logs for first 24 hours
- [ ] Prepare support docs/FAQs
- [ ] Create demo video (optional)
- [ ] Announce launch 🚀

---

**This integration plan is your roadmap. Bookmark this file and refer to it whenever you resume work.**

**Current Status:** Day 0 (Planning Complete) ✅
**Next Task:** Day 1 Morning - Create funnel-module folder structure and funnel-builder.html layout

---

**Let's build this! 🚀**
