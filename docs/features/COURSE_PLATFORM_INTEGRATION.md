# Course Platform Integration Strategy

**Shared Component Library Between teneo-marketplace & traviseric.com**

---

## The Vision

**Build course infrastructure ONCE. Use it EVERYWHERE.**

### Projects Using This:
1. **traviseric.com** - Your Framework course ($97)
2. **teneo-marketplace** - Book courses ($97-297)
3. **White-label licensing** - Sell to other educators ($297/year)

---

## What We're Replacing

| Platform | Cost/Month | Cost/Year | Replacement |
|----------|------------|-----------|-------------|
| Teachable | $119 | $1,428 | This |
| Thinkific | $49 | $588 | This |
| Kajabi | $149 | $1,788 | This |
| **Total** | **$317** | **$3,804** | **$0** |

**Combined with teneo-marketplace SaaS replacement:**
- ClickFunnels: $3,564/year
- ConvertKit: $3,600/year
- SamCart: $2,388/year
- **Course platforms: $3,804/year**

**Total SaaS stack cost: $13,356/year**
**Your cost: $240/year (hosting)**
**Savings: $13,116/year**

---

## The Architecture

### **Shared Component Library**

```
teneo-marketplace/
└── marketplace/frontend/components-library/
    ├── _base/
    │   ├── variables.css         # CSS custom properties
    │   └── reset.css             # Base styles
    ├── brand-themes/
    │   ├── teneo-brand.css       # Teneo marketplace theme
    │   └── traviseric-brand.css  # Travis Eric theme
    ├── heroes/                   # Landing page heroes
    ├── forms/                    # Forms & CTAs
    ├── pricing/                  # Pricing tables
    └── courses/                  # ← NEW: Course components
        ├── course-nav.html           # Sidebar navigation
        ├── paywall-gate.html         # Upgrade prompt
        ├── progress-bar.html         # Progress tracking
        ├── module-card.html          # Module previews
        ├── lesson-content.html       # Content wrapper
        ├── exercise-block.html       # Interactive exercises
        ├── certificate-display.html  # Certificates
        └── README.md                 # Documentation
```

---

## How It Works Across Projects

### **traviseric.com (Next.js + Supabase):**

**Tech Stack:**
- Next.js 14 (React)
- Supabase (PostgreSQL)
- Vercel (hosting)
- Stripe (payments)

**Usage:**
```tsx
// Copy HTML structure from component library
// Adapt to React components
// Same CSS variables work perfectly

import CourseNav from '@/components/course/CourseNav'

<CourseNav
  courseSlug="framework"
  courseTitle="High-Bandwidth Human-AI Framework"
  progress={42}
/>
```

**Database:**
```sql
-- Supabase (PostgreSQL)
CREATE TABLE course_purchases (...)
CREATE TABLE course_progress (...)
CREATE TABLE course_certificates (...)
```

---

### **teneo-marketplace (Express + SQLite):**

**Tech Stack:**
- Express.js (Node.js)
- SQLite (database)
- VPS (self-hosted)
- Stripe (payments)

**Usage:**
```html
<!-- Use components directly (no adaptation needed) -->
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="/components-library/_base/variables.css">
  <link rel="stylesheet" href="/components-library/brand-themes/teneo-brand.css">
</head>
<body>
  <!-- Include component -->
  <div id="courseNav"></div>
  <script src="/components-library/courses/course-nav.html"></script>
</body>
</html>
```

**Database:**
```sql
-- SQLite (same schema, different DB)
CREATE TABLE course_purchases (...)
CREATE TABLE course_progress (...)
CREATE TABLE course_certificates (...)
```

---

## Brand Swapping

### **Same components, different brands:**

**traviseric.com:**
```css
:root {
  --brand-primary: #1a1a2e;      /* Dark blue */
  --brand-accent: #e94560;       /* Red accent */
  --brand-success: #00d9ff;      /* Cyan */
}
```

**teneo-marketplace:**
```css
:root {
  --brand-primary: #1e3f54;      /* Navy */
  --brand-accent: #fea644;       /* Orange */
  --brand-success: #10B981;      /* Green */
}
```

**Result:** Instant brand consistency across all components!

---

## The Implementation Plan

### **Phase 1: Build at traviseric.com** (Weeks 1-4)

**Why traviseric.com first:**
- ✅ Supabase already set up (faster to build)
- ✅ Modern stack (better for your brand)
- ✅ Launch Framework course quickly
- ✅ Make real money immediately
- ✅ Test with real users

**Steps:**
1. Use components from teneo-marketplace library
2. Adapt to Next.js (copy HTML → React)
3. Connect to Supabase
4. Apply traviseric brand theme
5. Launch Framework course ($97)

**Timeline:** 4 weeks
**Revenue:** $97 per sale (target: 50 sales/month = $4,850/mo)

---

### **Phase 2: Port to teneo-marketplace** (Month 2)

**Why port later:**
- ✅ Proven concept (works on traviseric.com)
- ✅ Real user feedback incorporated
- ✅ Optimized for conversions
- ✅ No external dependencies needed

**Steps:**
1. Extract course infrastructure
2. Create SQLite version (no Supabase dependency)
3. Adapt components to vanilla HTML (already done!)
4. Apply teneo brand theme
5. Add to teneo-marketplace

**Timeline:** 2 weeks
**Result:** Self-hosted, portable course platform

---

### **Phase 3: Open Source** (Month 3)

**Why open source:**
- ✅ Brings users to your ecosystem
- ✅ Proves the concept works
- ✅ Network effects (others build courses)
- ✅ You charge for Orchestrator automation

**Steps:**
1. Complete documentation
2. Create demo course
3. Write blog post: "How I Replaced Teachable and Saved $1,428/Year"
4. Launch on GitHub
5. Post on Hacker News, Product Hunt

**Timeline:** 2 weeks
**Result:** Community adoption, network effects

---

### **Phase 4: White-Label Licensing** (Month 4-6)

**Business model:**
- Sell course platform infrastructure to other educators
- $297/year licensing fee
- Their branding, their domain
- Support from you

**Target market:**
- Indie course creators
- Subject matter experts
- Agencies building courses for clients

**Revenue projection:**
- 50 licenses × $297/year = $14,850/year

---

## Revenue Model (Combined)

### **Year 1 Projections:**

**Your Courses (traviseric.com):**
- Framework course: 200 sales × $97 = $19,400/mo
- Advanced courses: 50 sales × $297 = $14,850/mo
- **Subtotal: $34,250/mo**

**Book Courses (teneo-marketplace):**
- 10 book courses @ $197 each
- 100 sales/month total = $19,700/mo
- **Subtotal: $19,700/mo**

**Orchestrator (automation):**
- 1,000 users × $97/mo = $97,000/mo

**Course Platform Licensing:**
- 50 licenses × $297/year = $1,238/mo

**Total Year 1 MRR: $152,188/mo**
**Total Year 1 ARR: $1,826,256**

---

## Technical Differences

### **traviseric.com Stack:**
```yaml
frontend: Next.js 14 (React, TypeScript)
database: Supabase (PostgreSQL)
auth: Magic links (Supabase Auth)
hosting: Vercel
payments: Stripe
cost: $25/month (Supabase Pro)
```

### **teneo-marketplace Stack:**
```yaml
frontend: Express.js (HTML, vanilla JS)
database: SQLite (better-sqlite3)
auth: Magic links (custom)
hosting: VPS ($5-20/month)
payments: Stripe
cost: $5-20/month
```

**Key difference:** Supabase vs SQLite

**Same:** Components, brand system, payment flow, user experience

---

## Why This Strategy Wins

### **1. Speed to Market**
- Build at traviseric.com first (faster with Supabase)
- Launch Framework course in 4 weeks
- Make money immediately
- Validate before porting

### **2. Maximum Portability**
- Component library works anywhere
- Brand swapping via CSS
- Database-agnostic (Supabase OR SQLite)
- Framework-agnostic (Next.js OR vanilla)

### **3. Network Effects**
- You use it (your courses)
- Others use it (open source adoption)
- Community improves it (contributions)
- You charge for automation (Orchestrator revenue)

### **4. No Vendor Lock-In**
- Own all the code
- No platform fees
- No Teachable/Kajabi dependency
- True sovereignty

---

## Components Built

### **Core Components (Priority 1):** ✅ COMPLETE
- [x] `course-nav.html` - Sidebar navigation with progress tracking
- [x] `paywall-gate.html` - Upgrade prompt with pricing
- [x] `progress-bar.html` - Progress indicator with milestones
- [x] `module-card.html` - Module preview cards for landing pages
- [x] `lesson-content.html` - Content wrapper with rich formatting

### **Enhanced Components (Priority 2):**
- [ ] `exercise-block.html` - Interactive exercises
- [ ] `certificate-display.html` - Show certificate
- [ ] `course-dashboard.html` - Student dashboard
- [ ] `resource-download.html` - Downloadable files

### **Advanced Components (Priority 3):**
- [ ] `video-player.html` - Video lessons
- [ ] `quiz-component.html` - Knowledge checks
- [ ] `discussion-thread.html` - Comments

---

## Next Steps

### **Immediate (This Week):** ✅ COMPLETE
1. ✅ Created course component library structure
2. ✅ Built course-nav component
3. ✅ Built paywall-gate component
4. ✅ Built progress-bar component
5. ✅ Built module-card component
6. ✅ Built lesson-content component
7. ✅ Documented all components in README

### **Short Term (Weeks 2-4):**
6. [ ] Build Framework course at traviseric.com
7. [ ] Convert 20 modules to MDX
8. [ ] Launch at $97
9. [ ] Get first 50 sales

### **Medium Term (Months 2-3):**
10. [ ] Port to teneo-marketplace (SQLite version)
11. [ ] Build 10 book courses
12. [ ] Open source the platform
13. [ ] Launch white-label licensing

---

## The Bottom Line

**You're building:**
- ✅ Course infrastructure for traviseric.com (your courses)
- ✅ Course infrastructure for teneo-marketplace (book courses)
- ✅ Open source course platform (Teachable replacement)
- ✅ White-label licensing product ($297/year)

**Result:**
- Save $13,116/year in SaaS fees
- Make $1.8M+ ARR Year 1
- Own complete infrastructure
- No platform dependencies
- True sovereignty

**All from ONE shared component library.** 🚀

---

**Build once. Use everywhere. Own forever.**
