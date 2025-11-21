# 🎓 Course Platform - Design Specifications

**Based on:** Podia course interface (The Book Funnel Blueprint example)
**Goal:** Clean, professional course player matching Teneo Marketplace branding

---

## 📐 Layout Structure

### **Overall Layout**
```
┌─────────────────────────────────────────────────────────────┐
│ Header: Course Title (left) | User Menu (right)            │
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│   Sidebar    │           Main Content Area                  │
│   (300px)    │              (flexible)                      │
│              │                                              │
│  - Icon      │  ┌──────────────────────────────┐           │
│  - Title     │  │      Video Player            │           │
│  - Progress  │  │      (16:9 aspect ratio)     │           │
│              │  └──────────────────────────────┘           │
│  - TOC       │                                              │
│    - Module  │  Content text / description                  │
│      - Lesson│                                              │
│      - Lesson│                                              │
│    - Module  │                                              │
│              │                                              │
│              │                                              │
│              ├──────────────────────────────────────────────┤
│              │  [← Prev]  [✓ Completed]  [Next →]          │
└──────────────┴──────────────────────────────────────────────┘
```

---

## 🎨 Component Breakdown

### **1. Header Bar**
**Height:** 60-70px
**Background:** Dark (#1a1d23 or similar)
**Border:** Gold/yellow bottom border (2px, #f7c948)

**Left Side:**
- Course title (white text, 20px font)
- Breadcrumb trail: `Products / Course / Section / Lesson`

**Right Side:**
- User avatar (circle, 40px)
- Dropdown menu on click

---

### **2. Sidebar (Left Column)**

**Width:** 300px (fixed)
**Background:** Light gray (#f5f5f5)
**Padding:** 20px

#### **Top Section:**
- **Icon:** Emoji or icon (32px) - e.g., 💰 (gold money bag)
- **Course Title:** Bold, 16px
- **Progress Circle:**
  - Circular progress indicator
  - Shows "1/14 completed" in center
  - Uses brand colors (purple/blue gradient)

#### **Table of Contents:**
**Structure:**
- Collapsible modules/sections
- Nested lessons under each module
- Current lesson highlighted

**Module Header:**
- Bold text (14px)
- Collapse/expand arrow (›)
- Optional lock icon if not unlocked

**Lesson Item:**
- Regular weight (13px)
- Checkmark (✓) if completed
- Indented 20px from module
- Hover state (light background)
- Active lesson (darker background, left border accent)

**Example:**
```
Building a Profitable Author Funnel 💰 ▼
  ✓ The plug-and-play system for profitable author funnels

CHOOSE YOUR FUNNEL IN 60 SEC ▼
  ☐ Video Walkthrough of The Funnels - What to build and why
  ☐ The 2-Step Funnel Selector Matrix Quiz
  ☐ Strategic Tip from Charlotte

MODULE 2: THE 4 FUNNEL BLUEPRINTS ▼
  ☐ Funnel #1: The Gated Sneak-Peak Funnel
  ☐ Funnel #2: The Story-Driven Sales Page
  ...
```

---

### **3. Main Content Area**

**Background:** White
**Padding:** 40px

#### **Video Player:**
- **Aspect Ratio:** 16:9
- **Max Width:** 900px (centered)
- **Controls:** Play/pause, progress bar, volume, fullscreen, playback speed
- **Poster Image:** Course thumbnail before play
- **Border Radius:** 8px (subtle rounded corners)

#### **Lesson Title:**
- **Font Size:** 28px
- **Font Weight:** Bold
- **Margin Top:** 30px
- **Color:** Dark gray (#2d3748)

#### **Lesson Description:**
- **Font Size:** 16px
- **Line Height:** 1.6
- **Color:** Medium gray (#4a5568)
- **Max Width:** 700px (for readability)
- **Formatted text:** Supports bold, italic, links, lists

#### **What You'll Need to Begin:**
- Bullet list
- Checkboxes or bullet points
- Links styled with brand color (blue/purple)

---

### **4. Navigation Footer (Bottom of Content)**

**Position:** Sticky at bottom or at end of content
**Background:** Light gray (#f9fafb)
**Padding:** 20px
**Border Top:** 1px solid #e2e8f0

**Layout (Flexbox):**
```
[← Previous Lesson]     [✓ Completed]     [Next Lesson →]
     (left)              (center)             (right)
```

**Button Styles:**
- **Previous/Next:** Gray buttons, arrow icons
- **Completed Checkbox:** Toggle checkbox with label
  - Unchecked: White background, gray border
  - Checked: Green background (#10b981), white checkmark

---

## 🎨 Color Palette

**Matching Teneo Marketplace Branding:**

```css
/* Primary Colors */
--brand-primary: #7C3AED;      /* Purple (existing) */
--brand-secondary: #3B82F6;    /* Blue */
--brand-accent: #f7c948;       /* Gold/Yellow */

/* Backgrounds */
--bg-dark: #0d1117;            /* Header background */
--bg-light: #f5f5f5;           /* Sidebar background */
--bg-white: #ffffff;           /* Content area */
--bg-hover: #e5e7eb;           /* Hover states */

/* Text Colors */
--text-primary: #1f2937;       /* Main text */
--text-secondary: #6b7280;     /* Secondary text */
--text-light: #9ca3af;         /* Muted text */
--text-white: #ffffff;         /* White text */

/* Status Colors */
--success: #10b981;            /* Green (completed) */
--warning: #f59e0b;            /* Orange (in progress) */
--danger: #ef4444;             /* Red (locked) */

/* Borders */
--border-light: #e5e7eb;
--border-dark: #374151;
```

---

## 📱 Responsive Design

### **Desktop (> 1024px):**
- Full two-column layout
- Sidebar 300px fixed width
- Content area fills remaining space

### **Tablet (768px - 1024px):**
- Sidebar collapsible (hamburger menu)
- Content area full width when sidebar hidden
- Sticky header with menu toggle

### **Mobile (< 768px):**
- Sidebar becomes slide-out drawer
- Video player responsive (100% width)
- Navigation buttons stack vertically
- Smaller font sizes

---

## 🧩 Component Specifications

### **Progress Circle**

**HTML Structure:**
```html
<div class="progress-circle">
  <svg viewBox="0 0 36 36" class="circular-chart">
    <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
    <path class="circle" stroke-dasharray="7, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
    <text x="18" y="20.35" class="percentage">1/14</text>
  </svg>
  <p class="progress-text">completed</p>
</div>
```

**CSS:**
```css
.circular-chart {
  max-width: 80px;
  max-height: 80px;
}

.circle-bg {
  fill: none;
  stroke: #eee;
  stroke-width: 3.8;
}

.circle {
  fill: none;
  stroke-width: 2.8;
  stroke: #7C3AED;
  stroke-linecap: round;
  animation: progress 1s ease-out forwards;
}

.percentage {
  fill: #1f2937;
  font-size: 0.5em;
  text-anchor: middle;
}
```

### **Lesson Item (Active State)**

```css
.lesson-item {
  padding: 10px 15px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  gap: 10px;
}

.lesson-item:hover {
  background: #e5e7eb;
}

.lesson-item.active {
  background: #e0e7ff;
  border-left: 3px solid #7C3AED;
  font-weight: 600;
}

.lesson-item.completed {
  color: #10b981;
}

.lesson-item.locked {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### **Video Player Container**

```css
.video-container {
  position: relative;
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}

.video-container::before {
  content: '';
  display: block;
  padding-top: 56.25%; /* 16:9 Aspect Ratio */
}

.video-container video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
```

---

## 📋 Features to Implement

### **Phase 1: Core Player (Week 1)**
- [x] Two-column layout (sidebar + content)
- [x] Course header with breadcrumbs
- [x] Progress circle visualization
- [x] Collapsible table of contents
- [x] Video player integration
- [x] Lesson content rendering (Markdown → HTML)
- [x] Navigation (prev/next buttons)
- [x] Completion checkbox

### **Phase 2: Interactivity (Week 2)**
- [ ] Progress tracking (localStorage + API)
- [ ] Video position saving (resume where left off)
- [ ] Lesson completion tracking
- [ ] Unlock logic (drip content)
- [ ] Keyboard shortcuts (← → for navigation)
- [ ] Auto-advance to next lesson option

### **Phase 3: Enhancement (Week 3)**
- [ ] Notes feature (student can write notes on lessons)
- [ ] Downloadable resources
- [ ] Quiz integration
- [ ] Discussion threads per lesson
- [ ] Search within course
- [ ] Bookmarks/favorites

---

## 🎯 User Experience Flow

### **First Visit:**
1. User lands on course page (enrolled via purchase)
2. Sees welcome video + course overview
3. Progress circle shows 0/X completed
4. First lesson auto-selected

### **Watching Lesson:**
1. User clicks lesson in sidebar
2. Video loads and starts playing
3. Progress bar updates in real-time
4. User can pause/resume
5. Video position saved every 5 seconds

### **Completing Lesson:**
1. User checks "Completed" checkbox
2. Progress circle updates (1/14 → 2/14)
3. Lesson marked with green checkmark in sidebar
4. Next lesson unlocks (if drip enabled)
5. Optional: Auto-advance to next lesson

### **Navigation:**
- Click any unlocked lesson in sidebar
- Use prev/next buttons at bottom
- Keyboard: ← (previous) → (next)
- Breadcrumb navigation at top

---

## 🛠️ Technical Implementation

### **File Structure:**
```
marketplace/frontend/
  course-player.html          # Main player page
  course-builder-admin.html   # Admin course creation
  css/
    course-player.css         # Player styles
    course-builder.css        # Builder styles
  js/
    course-player.js          # Player functionality
    course-progress.js        # Progress tracking
    video-controls.js         # Video player controls
    toc-manager.js            # Table of contents logic
    course-builder.js         # Admin builder

marketplace/backend/
  routes/
    coursePlayer.js           # Course delivery routes
    courseBuilder.js          # Course creation routes
  services/
    coursePlayerService.js    # Player business logic
```

### **Data Flow:**

**Loading Course:**
```javascript
GET /api/courses/:courseId/player?enrollment=:enrollmentId
Response: {
  course: { id, title, description, thumbnail },
  modules: [
    {
      id, title, order,
      lessons: [
        { id, title, type, content_url, description, locked, completed }
      ]
    }
  ],
  progress: {
    completed_lessons: 3,
    total_lessons: 14,
    last_lesson_id: 7,
    percentage: 21
  }
}
```

**Updating Progress:**
```javascript
POST /api/courses/:courseId/lessons/:lessonId/progress
Body: {
  completed: true,
  video_position: 125 // seconds
}
Response: {
  success: true,
  new_progress: { completed_lessons: 4, total_lessons: 14 }
}
```

---

## 🎨 Design Mockup (ASCII)

```
┌──────────────────────────────────────────────────────────────────────┐
│ The Book Funnel Blueprint                            [User Avatar ▼] │
│ Products / Course / Section / Lesson                                 │
├────────────────┬─────────────────────────────────────────────────────┤
│                │                                                     │
│  💰            │  ┌───────────────────────────────────────────┐     │
│  The Book      │  │                                           │     │
│  Funnel        │  │         ▶  Video Player                   │     │
│  Blueprint     │  │            (16:9)                         │     │
│                │  │                                           │     │
│  ⭕ 1/14       │  └───────────────────────────────────────────┘     │
│   completed    │                                                     │
│                │  The plug-and-play system for profitable           │
│ ──────────     │  author funnels                                    │
│                │                                                     │
│ Building... ▼  │  Welcome to The Book Funnel Blueprint — the        │
│  ✓ The plug... │  plug-and-play system I used to sell over          │
│                │  50,000 books without a publisher.                 │
│ CHOOSE... ▼    │                                                     │
│  ☐ Video Wa... │  This isn't a course. It's a system. You'll be     │
│  ☐ The 2-St... │  launching your optimized book funnel in less      │
│  ☐ Strategic...│  than a week — with full confidence in what        │
│                │  you're building and why it works.                 │
│ MODULE 2... ▼  │                                                     │
│  ☐ Funnel #1...│  What You'll Need to Begin                         │
│  ☐ Funnel #2...│  • Your own book online store and Amazon link      │
│  ☐ Funnel #3...│  • 1-2 hours to review this guide                  │
│  ☐ Funnel #4...│  • 1-2 hours per day over the next 3-7 days       │
│                │                                                     │
│                ├─────────────────────────────────────────────────────┤
│                │  [← Previous]  [✓ Completed]  [Next Lesson →]      │
└────────────────┴─────────────────────────────────────────────────────┘
```

---

## ✅ Success Criteria

**Visual Match:**
- [x] Layout matches Podia screenshots
- [x] Branding matches Teneo Marketplace colors
- [x] Professional, clean aesthetic
- [x] Responsive on all devices

**Functionality:**
- [x] Video plays smoothly
- [x] Progress tracking works
- [x] Navigation intuitive
- [x] TOC collapsible/expandable
- [x] Completion tracking accurate

**Performance:**
- [ ] Page loads in < 2 seconds
- [ ] Video starts in < 1 second
- [ ] Smooth scrolling and transitions
- [ ] No jank or layout shifts

---

**Next Steps:**
1. Build HTML/CSS for course player
2. Implement JavaScript for interactivity
3. Create admin course builder interface
4. Test with real course data
5. Deploy and iterate based on feedback
