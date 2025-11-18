# Course Components
## Reusable Course Infrastructure for traviseric.com AND teneo-marketplace

**Built once. Used everywhere. Brand-swappable.**

---

## Philosophy

These components are **framework-agnostic** and **brand-agnostic**:

- ✅ Work in static HTML (teneo-marketplace)
- ✅ Work in Next.js (traviseric.com)
- ✅ Work in React, Vue, Svelte
- ✅ Brand-swappable via CSS variables
- ✅ Self-contained (HTML + CSS + JS in one file)

---

## Components

### 1. `course-nav.html` - Course Sidebar Navigation
**Purpose:** Show all modules, track progress, indicate locked content

**Features:**
- Progress bar (percentage complete)
- Module status indicators (completed ✓, active ▶, locked 🔒)
- FREE vs PRO badges
- Duration display
- Certificate link (when earned)
- Mobile responsive

**Usage:**
```html
<link rel="stylesheet" href="components-library/_base/variables.css">
<link rel="stylesheet" href="components-library/brand-themes/teneo-brand.css">

<!-- Include the component -->
<div id="courseNav"></div>
<script src="components-library/courses/course-nav.html"></script>
```

**Variables:**
- `{{COURSE_SLUG}}` - Course identifier
- `{{COURSE_TITLE}}` - Course name
- `{{PROGRESS_PERCENT}}` - Completion percentage (0-100)

---

### 2. `paywall-gate.html` - Upgrade Prompt
**Purpose:** Show when user tries to access paid content

**Features:**
- Feature list (what they get)
- Pricing display
- Money-back guarantee
- Smooth animations
- Escape key to close
- Analytics tracking

**Usage:**
```javascript
// Show paywall
showPaywall({
  courseSlug: 'framework',
  trigger: 'module-4-click'
});

// Or via event
window.dispatchEvent(new CustomEvent('showPaywall', {
  detail: { courseSlug: 'framework' }
}));
```

**Variables:**
- `{{COURSE_SLUG}}` - Course identifier
- `{{PRICE}}` - Price (default: 97)
- `{{BONUS_FEATURE_TITLE}}` - Optional extra feature
- `{{BONUS_FEATURE_DESCRIPTION}}` - Description

---

### 3. `progress-bar.html` - Progress Indicator
**Purpose:** Standalone progress tracker with stats and milestones

**Features:**
- Animated progress bar with gradient
- Completion percentage display
- Module completion stats (completed/total)
- Time remaining estimate
- Streak counter (gamification)
- Milestone celebrations (25%, 50%, 75%, 100%)
- Next lesson CTA button
- Certificate claim on 100%

**Usage:**
```html
<div id="courseProgressBar" data-course-slug="framework"></div>
<script src="components-library/courses/progress-bar.html"></script>
```

**API:**
```javascript
// Update progress externally
window.updateCourseProgress({
  overallProgress: 65,
  completedModules: 13,
  totalModules: 20,
  estimatedTimeRemaining: 180, // minutes
  streak: 7,
  nextLesson: { url: '/courses/framework/module-14', title: 'Module 14' }
});
```

---

### 4. `module-card.html` - Module Preview Card
**Purpose:** Display module overview on course landing pages

**Features:**
- Module number badge
- Status indicators (FREE, PRO, LOCKED, COMPLETED)
- Title, subtitle, description
- Lesson list preview
- Duration and lesson count
- Progress bar (if started)
- Hover animations
- Locked state with paywall trigger
- Mobile responsive

**Usage:**
```html
<!-- Static usage with template variables -->
<div class="module-card module-card--locked"
     data-module-slug="cognitive-vectoring"
     data-is-locked="true">
  <!-- Component structure -->
</div>

<!-- Dynamic initialization -->
<script src="components-library/courses/module-card.html"></script>
<script>
  window.initModuleCards();
  window.loadModuleProgress('framework');
</script>
```

---

### 5. `lesson-content.html` - Lesson Content Wrapper
**Purpose:** Formatted content wrapper for course lessons

**Features:**
- Breadcrumb navigation
- Lesson metadata (duration, number)
- Rich content formatting (headings, lists, code, images)
- Callout boxes (info, warning, success, error)
- Previous/next lesson navigation
- Mark as complete button with celebration
- Auto-complete on scroll to bottom
- Keyboard shortcuts (←/→ for navigation, C for complete)
- Reading progress tracking
- Mobile responsive

**Usage:**
```html
<article class="lesson-content"
         data-course-slug="framework"
         data-module-slug="mirror"
         data-lesson-slug="introduction">
  <!-- Lesson header, body, footer -->
</article>
<script src="components-library/courses/lesson-content.html"></script>
```

**Content formatting:**
```html
<!-- Callout boxes -->
<div class="lesson-content__callout lesson-content__callout--info">
  <div class="lesson-content__callout-title">💡 Key Insight</div>
  <div class="lesson-content__callout-content">Important concept here</div>
</div>
```

---

## How to Use Across Projects

### **Option A: traviseric.com (Next.js + Supabase)**

```tsx
// app/courses/[courseSlug]/layout.tsx
import CourseNav from '@/components/course/CourseNav'

export default function CourseLayout({ children }) {
  return (
    <div className="course-layout">
      <CourseNav
        courseSlug="framework"
        courseTitle="High-Bandwidth Human-AI Framework"
        progress={42}
      />
      <main>{children}</main>
    </div>
  )
}
```

**Adapt the component:**
1. Copy HTML structure from `course-nav.html`
2. Convert to React component
3. Use same CSS (it's already using CSS variables)
4. Connect to Supabase for progress data

---

### **Option B: teneo-marketplace (Express + SQLite)**

```html
<!-- marketplace/frontend/courses/framework.html -->
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="/components-library/_base/variables.css">
  <link rel="stylesheet" href="/components-library/_base/reset.css">
  <link rel="stylesheet" href="/components-library/brand-themes/teneo-brand.css">
</head>
<body>
  <div class="course-layout">
    <!-- Include course nav -->
    <?php include 'components-library/courses/course-nav.html'; ?>

    <main>
      <!-- Course content -->
    </main>
  </div>

  <!-- Include paywall -->
  <?php include 'components-library/courses/paywall-gate.html'; ?>
</body>
</html>
```

**Or with JavaScript:**
```javascript
// Load component dynamically
fetch('/components-library/courses/course-nav.html')
  .then(r => r.text())
  .then(html => {
    document.getElementById('courseNav').innerHTML = html;
  });
```

---

## Brand Swapping

### **traviseric.com Brand:**
```css
/* brand-themes/traviseric-brand.css */
:root {
  --brand-primary: #1a1a2e;
  --brand-accent: #e94560;
  --brand-success: #00d9ff;
  --brand-font-heading: 'Inter', sans-serif;
}
```

### **teneo-marketplace Brand:**
```css
/* brand-themes/teneo-brand.css */
:root {
  --brand-primary: #1e3f54;
  --brand-accent: #fea644;
  --brand-success: #10B981;
  --brand-font-heading: -apple-system, sans-serif;
}
```

**Same components, different look!**

---

## Database Integration

### **traviseric.com (Supabase):**
```typescript
// Check if user has access
const { data: purchase } = await supabase
  .from('course_purchases')
  .select('*')
  .eq('user_email', email)
  .eq('course_slug', courseSlug)
  .single()

const hasAccess = !!purchase

// Get progress
const { data: progress } = await supabase
  .from('course_progress')
  .select('*')
  .eq('user_email', email)
  .eq('course_slug', courseSlug)
```

### **teneo-marketplace (SQLite):**
```javascript
// Check if user has access
const purchase = db.prepare(
  'SELECT * FROM course_purchases WHERE user_email = ? AND course_slug = ?'
).get(email, courseSlug)

const hasAccess = !!purchase

// Get progress
const progress = db.prepare(
  'SELECT * FROM course_progress WHERE user_email = ? AND course_slug = ?'
).all(email, courseSlug)
```

**Same logic, different database!**

---

## Component Structure

All course components follow the same pattern:

```html
<!-- Component Name -->

<style>
  /* Uses CSS variables from _base/variables.css */
  .component {
    background: var(--brand-bg);
    color: var(--brand-text);
    font-family: var(--brand-font-main);
  }
</style>

<div class="component">
  <!-- Component HTML with {{VARIABLES}} -->
</div>

<script>
(function() {
  'use strict';
  // Self-contained JavaScript
  // No dependencies
  // Works anywhere
})();
</script>
```

---

## Complete Component List

### **Core Components:**
- [x] `course-nav.html` - Sidebar navigation
- [x] `paywall-gate.html` - Upgrade prompt
- [x] `progress-bar.html` - Progress indicator
- [x] `module-card.html` - Module preview card
- [x] `lesson-content.html` - Content wrapper
- [ ] `exercise-block.html` - Interactive exercises
- [ ] `certificate-display.html` - Show certificate
- [ ] `course-dashboard.html` - Student dashboard

### **Advanced Components:**
- [ ] `video-player.html` - Video lessons
- [ ] `quiz-component.html` - Knowledge checks
- [ ] `discussion-thread.html` - Comments/discussion
- [ ] `resource-download.html` - Downloadable files

---

## Build Roadmap

### **Phase 1: Core Infrastructure** (Week 1) ✅ COMPLETE
1. ✅ Course nav component
2. ✅ Paywall gate component
3. ✅ Progress bar component
4. ✅ Module card component
5. ✅ Lesson content wrapper

**Deliverable:** ✅ Can build basic course with modules and paywall

---

### **Phase 2: Enhanced Features** (Week 2)
6. [ ] Exercise block component
7. [ ] Certificate display component
8. [ ] Course dashboard component
9. [ ] Resource download component

**Deliverable:** Full-featured course platform

---

### **Phase 3: Advanced Features** (Week 3-4)
10. [ ] Video player component
11. [ ] Quiz/assessment component
12. [ ] Discussion thread component
13. [ ] Gamification (badges, streaks)

**Deliverable:** Complete Teachable replacement

---

## Integration Examples

### **Example 1: Launch Framework Course on traviseric.com**

```
1. Use course components from teneo-marketplace
2. Adapt to Next.js (copy HTML structure → React)
3. Connect to Supabase (for purchases/progress)
4. Apply traviseric brand theme
5. Deploy at traviseric.com/framework
6. Launch for $97
```

### **Example 2: Port to teneo-marketplace**

```
1. Copy components as-is (already HTML)
2. Connect to SQLite (course_purchases, course_progress)
3. Apply teneo brand theme
4. Deploy as static HTML or server-rendered
5. Open source for community
```

### **Example 3: White-label for Client**

```
1. Copy component library
2. Create client brand theme CSS
3. Configure course content
4. Deploy to client's domain
5. Charge $297/year licensing fee
```

---

## Why This Works

### **Separation of Concerns:**
- **Content:** MDX files (portable)
- **Components:** HTML/CSS/JS (reusable)
- **Brand:** CSS variables (swappable)
- **Data:** API layer (adaptable)

### **Progressive Enhancement:**
- Works with no JavaScript (basic HTML)
- Enhanced with JavaScript (interactivity)
- Works with any backend (Supabase, SQLite, etc.)
- Works with any framework (Next.js, vanilla, etc.)

### **Maximum Portability:**
- No build step required
- No dependencies
- Copy files and go
- Brand swap = change 1 CSS file

---

## The Strategy

**Build once at traviseric.com:**
- Prove it works
- Make real money
- Get real user feedback
- Iterate and improve

**Port to teneo-marketplace:**
- Extract components
- Make fully portable (no Supabase dependency)
- Open source it
- Network effects compound

**Result:**
- You use it for your courses
- Others use it for their courses
- Component library improves via community
- You charge for Orchestrator automation
- Everyone wins

---

## Next Steps

1. ✅ Finish core course components (3-5 more)
2. ✅ Build Framework course at traviseric.com
3. ✅ Launch and validate ($97 price point)
4. ✅ Port to teneo-marketplace (SQLite version)
5. ✅ Open source the portable version
6. ✅ Build white-label licensing ($297/year)

---

**One component library. Multiple projects. Infinite brands.**

**Build protocols, not platforms.** 🚀
