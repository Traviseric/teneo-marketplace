# Cross-Project Course Integration Guide

**How teneo-marketplace and traviseric.com Course Components Work Together**

---

## Overview

You have **TWO complete course systems** that need to complement each other:

### **traviseric.com** (Next.js + Supabase)
- ✅ Full TypeScript type system
- ✅ React hooks for state management
- ✅ Database schema and API layer
- ✅ Magic link authentication
- ✅ Stripe integration complete
- ✅ React/TSX components built

**Location:** `D:\Travis Eric\TE Code\traviseric.com\lib\course\`

### **teneo-marketplace** (Express + SQLite)
- ✅ Vanilla HTML/CSS/JS components
- ✅ Framework-agnostic design
- ✅ Brand-swappable via CSS variables
- ✅ Self-contained, no dependencies
- ✅ Ready to open source

**Location:** `D:\Travis Eric\TE Code\teneo-marketplace\marketplace\frontend\components-library\courses\`

---

## Component Comparison

### **What traviseric.com Has (React/TypeScript)**

| Component | File | Features |
|-----------|------|----------|
| CourseNav | `CourseNav.tsx` | Uses `useCourseProgress` hook, Next.js Link, Lucide icons |
| ProgressBar | `ProgressBar.tsx` | Uses `useCourseStats` hook, shadcn Progress component |
| PaywallGate | `PaywallGate.tsx` | Tailwind styling, shadcn Card/Button |
| ModuleContent | `ModuleContent.tsx` | Hooks: `useCourseProgress`, `useTimeTracking`, `useCourseKeyboard` |
| CourseLayout | `CourseLayout.tsx` | Main wrapper with sidebar (needs reading) |
| EnrollButton | `EnrollButton.tsx` | Stripe checkout trigger (needs reading) |

### **What teneo-marketplace Has (Vanilla HTML/CSS/JS)**

| Component | File | Features |
|-----------|------|----------|
| course-nav | `course-nav.html` | Vanilla JS, API fetch, localStorage fallback |
| paywall-gate | `paywall-gate.html` | Pure CSS animations, template variables |
| progress-bar | `progress-bar.html` | Gradient animation, milestone celebrations |
| module-card | `module-card.html` | Landing page cards with hover effects |
| lesson-content | `lesson-content.html` | Rich content formatting, keyboard shortcuts |

---

## Key Differences

### **Technology Stack**

**traviseric.com:**
```typescript
// React hooks for state
const { progress, loading, markComplete } = useCourseProgress(courseSlug, moduleSlug);
const { stats } = useCourseStats(courseSlug);
const timeSpent = useTimeTracking(courseSlug, moduleSlug);

// Next.js Link component
<Link href={`/framework/${module.slug}`}>

// Tailwind + shadcn UI
<Button size="lg" className="bg-sovereignty-gold">
```

**teneo-marketplace:**
```javascript
// Vanilla JS fetch API
async function loadProgress() {
  const response = await fetch(`/api/course/progress?course=${courseSlug}`);
  const data = await response.json();
}

// Standard anchor tags
<a href="/courses/framework/module-1">

// CSS variables + custom styles
<button class="paywall-cta" style="background: var(--brand-accent)">
```

### **State Management**

**traviseric.com:**
- React hooks manage all state
- Server Components + Client Components pattern
- Real-time updates via Supabase subscriptions (optional)

**teneo-marketplace:**
- Vanilla JavaScript state
- LocalStorage fallback
- Event-driven communication between components
- `window.dispatchEvent(new CustomEvent('lessonComplete', {...}))`

### **Styling Approach**

**traviseric.com:**
- Tailwind utility classes
- shadcn/ui components
- Custom CSS variables for brand colors:
  - `sovereignty-gold`
  - `reality-black`
  - `success-green`

**teneo-marketplace:**
- CSS-in-JS (style tags in components)
- CSS variables for everything:
  - `--brand-primary`
  - `--brand-accent`
  - `--brand-success`
  - `--spacing-lg`
  - `--font-size-xl`

---

## What Each Side Needs from the Other

### **traviseric.com NEEDS from teneo-marketplace:**

#### 1. **Module Cards for Landing Page**
**Missing:** Cards to display all modules on `/framework` landing page

**Copy from:** `teneo-marketplace/courses/module-card.html`

**Adapt to React:**
```tsx
// components/course/ModuleCard.tsx
interface ModuleCardProps {
  module: CourseModule;
  moduleNumber: number;
  isLocked: boolean;
  progress: number;
}

export function ModuleCard({ module, moduleNumber, isLocked, progress }: ModuleCardProps) {
  return (
    <Card className={cn(
      "hover:shadow-lg transition-all",
      isLocked && "opacity-60"
    )}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Badge variant={module.isFree ? "success" : "default"}>
            {module.isFree ? "FREE" : "PRO"}
          </Badge>
          <span className="font-mono text-sm">
            Module {String(moduleNumber).padStart(2, '0')}
          </span>
        </div>
        <CardTitle>{module.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Module description, lessons, etc. */}
      </CardContent>
    </Card>
  );
}
```

#### 2. **Enhanced Progress Tracking**
**Missing:** Milestone celebrations, streak tracking, time remaining

**Copy from:** `teneo-marketplace/courses/progress-bar.html`

**Add to ProgressBar.tsx:**
- Milestone celebrations (🎉 at 25%, 50%, 75%, 100%)
- Streak counter
- Time remaining estimate
- Next lesson CTA

#### 3. **Rich Content Formatting**
**Missing:** Callout boxes, code highlighting, better typography

**Copy from:** `teneo-marketplace/courses/lesson-content.html`

**Add styles for:**
- Info/warning/success/error callouts
- Better blockquote styling
- Code block styling
- Image/video embeds

---

### **teneo-marketplace NEEDS from traviseric.com:**

#### 1. **Database Schema (SQLite version)**
**Missing:** Complete database tables for courses

**Port from:** `traviseric.com/supabase/migrations/20250117000000_create_course_tables.sql`

**Create:** `teneo-marketplace/marketplace/backend/database/schema-courses.sql`

```sql
-- SQLite version (no UUID type)
CREATE TABLE course_purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT NOT NULL,
  course_slug TEXT NOT NULL,
  price INTEGER NOT NULL,
  stripe_session_id TEXT,
  purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_email, course_slug)
);

CREATE TABLE course_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT NOT NULL,
  course_slug TEXT NOT NULL,
  module_slug TEXT NOT NULL,
  lesson_slug TEXT,
  completed BOOLEAN DEFAULT 0,
  time_spent INTEGER DEFAULT 0,
  completed_at DATETIME,
  last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE course_access_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT NOT NULL,
  course_slug TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  used BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE course_certificates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT NOT NULL,
  course_slug TEXT NOT NULL,
  earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  certificate_url TEXT,
  UNIQUE(user_email, course_slug)
);

CREATE TABLE course_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT,
  course_slug TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data TEXT, -- JSON string
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. **API Routes (Express version)**
**Missing:** Backend API endpoints for course operations

**Port from:** `traviseric.com/app/api/course/`

**Create:** `teneo-marketplace/marketplace/backend/routes/courses.js`

```javascript
const express = require('express');
const router = express.Router();
const db = require('../database');
const courseService = require('../services/courseService');

// Check course access
router.get('/api/course/access/check', async (req, res) => {
  const { courseSlug } = req.query;
  const email = req.session?.email;

  if (!email) {
    return res.json({ hasAccess: false });
  }

  const purchase = db.prepare(
    'SELECT * FROM course_purchases WHERE user_email = ? AND course_slug = ?'
  ).get(email, courseSlug);

  res.json({ hasAccess: !!purchase });
});

// Get progress
router.get('/api/course/progress', async (req, res) => {
  const { course } = req.query;
  const email = req.session?.email;

  const progress = db.prepare(
    'SELECT * FROM course_progress WHERE user_email = ? AND course_slug = ?'
  ).all(email, course);

  const stats = courseService.calculateStats(progress);

  res.json({
    progress,
    overallProgress: stats.completionPercentage,
    completedModules: stats.completedCount,
    totalModules: stats.totalCount
  });
});

// Mark module/lesson complete
router.post('/api/course/mark-complete', async (req, res) => {
  const { courseSlug, moduleSlug, lessonSlug } = req.body;
  const email = req.session?.email;

  if (!email) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Insert or update progress
  const stmt = db.prepare(`
    INSERT INTO course_progress (user_email, course_slug, module_slug, lesson_slug, completed, completed_at)
    VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(user_email, course_slug, module_slug) DO UPDATE SET completed = 1, completed_at = CURRENT_TIMESTAMP
  `);

  stmt.run(email, courseSlug, moduleSlug, lessonSlug);

  res.json({ success: true });
});

module.exports = router;
```

#### 3. **Magic Link Authentication**
**Missing:** Passwordless auth for course access

**Port from:** `traviseric.com/lib/course/auth.ts`

**Create:** `teneo-marketplace/marketplace/backend/services/authService.js`

```javascript
const crypto = require('crypto');
const db = require('../database');

class AuthService {
  // Generate magic link token
  generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Create access token
  async createAccessToken(email, courseSlug) {
    const token = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    db.prepare(`
      INSERT INTO course_access_tokens (user_email, course_slug, token, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(email, courseSlug, token, expiresAt.toISOString());

    return token;
  }

  // Verify token
  async verifyToken(token) {
    const record = db.prepare(`
      SELECT * FROM course_access_tokens
      WHERE token = ? AND used = 0 AND expires_at > CURRENT_TIMESTAMP
    `).get(token);

    if (!record) return null;

    // Mark as used
    db.prepare('UPDATE course_access_tokens SET used = 1 WHERE id = ?')
      .run(record.id);

    return {
      email: record.user_email,
      courseSlug: record.course_slug
    };
  }
}

module.exports = new AuthService();
```

#### 4. **Email Service Integration**
**Missing:** Send magic links, purchase confirmations

**Port from:** traviseric.com would have this (not yet built)

**Create:** `teneo-marketplace/marketplace/backend/services/courseEmailService.js`

```javascript
const emailService = require('./emailService'); // Existing email service

class CourseEmailService {
  async sendMagicLink(email, courseSlug, token) {
    const magicLink = `${process.env.SITE_URL}/course/auth/verify?token=${token}`;

    await emailService.sendEmail({
      to: email,
      subject: 'Access Your Course',
      html: `
        <h2>Click to Access Your Course</h2>
        <p><a href="${magicLink}">Access Course</a></p>
        <p>This link expires in 30 days.</p>
      `
    });
  }

  async sendPurchaseConfirmation(email, courseSlug, courseName) {
    const token = await authService.createAccessToken(email, courseSlug);
    const accessLink = `${process.env.SITE_URL}/course/auth/verify?token=${token}`;

    await emailService.sendEmail({
      to: email,
      subject: `Welcome to ${courseName}!`,
      html: `
        <h2>Thank you for your purchase!</h2>
        <p>You now have lifetime access to ${courseName}.</p>
        <p><a href="${accessLink}">Start Learning</a></p>
      `
    });
  }
}

module.exports = new CourseEmailService();
```

---

## Integration Strategy

### **Phase 1: traviseric.com Launch (Priority)**

**Timeline:** 2-3 weeks

**Why first:** Supabase already set up, faster to market, validate with real users

**Tasks:**
1. ✅ Database schema (already done via migration)
2. ✅ React components (already built)
3. ✅ API routes (already built)
4. [ ] Add ModuleCard component (port from teneo-marketplace)
5. [ ] Enhance ProgressBar (add milestones, streak)
6. [ ] Create course landing page `/framework`
7. [ ] Convert 20 modules to MDX
8. [ ] Integrate email service (Resend)
9. [ ] Test magic link flow
10. [ ] Test Stripe checkout
11. [ ] Launch 🚀

**Revenue:** $97 per sale (target: 50 sales/month = $4,850/mo)

---

### **Phase 2: teneo-marketplace Port (Open Source)**

**Timeline:** 1-2 weeks after traviseric.com launch

**Why second:** Proven concept, real user feedback, optimized for conversions

**Tasks:**
1. [ ] Port database schema to SQLite
2. [ ] Create Express API routes
3. [ ] Add magic link auth service
4. [ ] Integrate with existing email service
5. [ ] Create course service layer
6. [ ] Test with sample course
7. [ ] Add to teneo books (create book courses)
8. [ ] Open source 🎉

**Result:** Self-hosted, portable, no Supabase dependency

---

### **Phase 3: Cross-Pollination (Best of Both)**

**Timeline:** Ongoing

**Continuous improvement loop:**

1. **traviseric.com → teneo-marketplace**
   - Port new React components to vanilla HTML/CSS/JS
   - Extract reusable patterns
   - Add to component library

2. **teneo-marketplace → traviseric.com**
   - Port enhanced features back to React
   - Improve UX based on vanilla implementation
   - Add missing components (module cards, enhanced progress)

3. **Shared improvements**
   - Better animations
   - Accessibility fixes
   - Mobile responsiveness
   - Performance optimizations

---

## What to Build Next

### **For traviseric.com** (Immediate Priority)

#### 1. ModuleCard Component
**Why:** Need it for landing page showing all 20 modules

**File:** `components/course/ModuleCard.tsx`

**Copy structure from:** `teneo-marketplace/courses/module-card.html`

**Features needed:**
- Module number badge
- FREE vs PRO badge
- Title, subtitle, description
- Lesson count and duration
- Hover lift animation
- Lock overlay for paid modules
- Click to navigate or show paywall

#### 2. Landing Page
**Why:** Entry point for the course, drive conversions

**File:** `app/framework/page.tsx`

**Sections:**
- Hero (compelling headline + CTA)
- Your story (The Forge module excerpt)
- Course outline (ModuleCard grid)
- FREE tier modules (show value)
- Pricing (one-time $97)
- EnrollButton (Stripe checkout)

#### 3. MDX Content Migration
**Why:** Need actual course content to launch

**Source:** `docs/High_Bandwidth_Human_AI_Framework.md`

**Create:** 20 MDX files in `content/framework/`

**Structure:**
```mdx
---
title: "Module 1: The Mirror Principle"
description: "Understanding AI as cognitive reflection"
duration: "45 min"
---

# The Mirror Principle

Your AI interactions reflect your cognitive architecture...

[Content here]
```

---

### **For teneo-marketplace** (After traviseric.com launch)

#### 1. Database Schema
**File:** `marketplace/backend/database/schema-courses.sql`

**Copy from:** traviseric.com Supabase migration (convert to SQLite)

#### 2. Course Service Layer
**File:** `marketplace/backend/services/courseService.js`

**Responsibilities:**
- Check course access
- Track progress
- Calculate completion stats
- Generate certificates
- Handle analytics

#### 3. Course API Routes
**File:** `marketplace/backend/routes/courses.js`

**Endpoints:**
- `GET /api/course/access/check`
- `GET /api/course/progress`
- `POST /api/course/mark-complete`
- `POST /api/course/auth/request`
- `GET /api/course/auth/verify`

#### 4. Magic Link Integration
**File:** `marketplace/backend/services/authService.js`

**Flow:**
1. User purchases course via Stripe
2. Webhook creates course_purchase record
3. System sends magic link email
4. User clicks link → verifies token → sets cookie
5. User has access for 30 days

---

## Revenue Model (Combined)

### **Year 1 Projections:**

**traviseric.com courses:**
- Framework course: 200 sales × $97 = $19,400
- Advanced courses: 50 sales × $297 = $14,850
- **Subtotal: $34,250/year**

**teneo-marketplace book courses:**
- 10 book courses @ $97-197 each
- 100 sales/year total = $19,700
- **Subtotal: $19,700/year**

**Platform licensing (white-label):**
- 50 licenses × $297/year = $14,850
- **Subtotal: $14,850/year**

**Total Year 1: $68,800/year from courses**

---

## Component Sharing Workflow

### **How to Port Components Between Projects**

#### **HTML → React (teneo-marketplace → traviseric.com)**

1. **Copy HTML structure**
2. **Convert class names to className**
3. **Replace template variables with props**
4. **Convert inline styles to Tailwind**
5. **Replace vanilla JS with React hooks**
6. **Add TypeScript types**

**Example:**
```html
<!-- teneo-marketplace: progress-bar.html -->
<div class="progress-bar">
  <span>{{PROGRESS_PERCENT}}%</span>
</div>
```

```tsx
// traviseric.com: ProgressBar.tsx
interface ProgressBarProps {
  progressPercent: number;
}

export function ProgressBar({ progressPercent }: ProgressBarProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium">{progressPercent}%</span>
    </div>
  );
}
```

#### **React → HTML (traviseric.com → teneo-marketplace)**

1. **Remove TypeScript types**
2. **Convert hooks to vanilla JS state**
3. **Replace Tailwind with CSS-in-JS**
4. **Convert props to template variables**
5. **Add IIFE wrapper for isolation**

**Example:**
```tsx
// traviseric.com: ModuleContent.tsx
const { progress, markComplete } = useCourseProgress(courseSlug, moduleSlug);
```

```javascript
<!-- teneo-marketplace: lesson-content.html -->
<script>
(function() {
  let progress = { completed: false };

  async function loadProgress() {
    const res = await fetch(`/api/course/progress?...`);
    progress = await res.json();
  }

  async function markComplete() {
    await fetch('/api/course/mark-complete', { method: 'POST', ... });
  }
})();
</script>
```

---

## Bottom Line

### **You have TWO complementary systems:**

**traviseric.com (React/Supabase):**
- Production-ready TypeScript infrastructure
- Stripe integration complete
- Magic link auth ready
- React hooks for state management
- **Missing:** Landing page, MDX content, enhanced components

**teneo-marketplace (Vanilla/SQLite):**
- Framework-agnosable HTML/CSS/JS components
- Brand-swappable design system
- Self-contained, no dependencies
- **Missing:** Database schema, API routes, auth system

### **Strategy:**

1. **Launch traviseric.com FIRST** (2-3 weeks)
   - Port missing components from teneo-marketplace
   - Create landing page
   - Convert content to MDX
   - Launch at $97

2. **Port to teneo-marketplace SECOND** (1-2 weeks)
   - Add database schema
   - Create API routes
   - Integrate auth system
   - Open source it

3. **Cross-pollinate ONGOING**
   - Share improvements both ways
   - Maintain component parity
   - Build once, use everywhere

---

**Result:** Complete course infrastructure owned by you, working across both projects, saving $1,428/year in Teachable fees, enabling $68k+/year in course revenue.

**Build once. Use everywhere. Own forever.** 🚀
