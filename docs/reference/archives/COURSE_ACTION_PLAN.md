# Course Platform Action Plan

**What to do next to launch Framework course at traviseric.com**

---

## 🎯 Goal

Launch High-Bandwidth Human-AI Framework course at **traviseric.com/framework** for **$97**

**Target:** 4 weeks to launch

**Revenue Target:** 50 sales/month = $4,850/mo

---

## ✅ What's Already Done

### **teneo-marketplace (Component Library)**
- [x] `course-nav.html` - Sidebar navigation
- [x] `paywall-gate.html` - Upgrade prompt
- [x] `progress-bar.html` - Progress tracker
- [x] `module-card.html` - Module preview cards
- [x] `lesson-content.html` - Lesson wrapper
- [x] Complete documentation

### **traviseric.com (Infrastructure)**
- [x] Database schema (Supabase migration)
- [x] TypeScript type system (`lib/course/types.ts`)
- [x] API utilities (`lib/course/api.ts`)
- [x] React hooks (`lib/course/hooks.ts`)
- [x] Authentication system (`lib/course/auth.ts`)
- [x] API routes (`app/api/course/*`)
- [x] Basic components (`CourseNav`, `ProgressBar`, `PaywallGate`, `ModuleContent`)
- [x] Course config (`lib/course/configs/framework.ts`)

---

## 🚧 What You Need to Build (Priority Order)

### **Week 1: Foundation** (Nov 18-24)

#### 1. Apply Database Migration ⚡️ HIGH PRIORITY
**Why:** Need database tables before anything else works

**File:** `supabase/migrations/20250117000000_create_course_tables.sql`

**Action:**
```bash
# Option A: Supabase CLI
cd D:\Travis Eric\TE Code\traviseric.com
supabase db push

# Option B: Dashboard
# 1. Go to Supabase Dashboard
# 2. SQL Editor
# 3. Paste migration SQL
# 4. Run
```

**Test:**
```bash
# Verify tables exist
supabase db pull
```

**Status:** ⏳ TODO

---

#### 2. Add Environment Variables ⚡️ HIGH PRIORITY
**Why:** API routes need these to work

**File:** `.env.local`

**Add:**
```env
# Stripe (get from dashboard.stripe.com)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Supabase (you already have these)
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Site URL
NEXT_PUBLIC_SITE_URL=https://traviseric.com
# For local testing:
# NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Test:**
```bash
# Start dev server
npm run dev

# Should not see any missing env var errors
```

**Status:** ⏳ TODO

---

#### 3. Configure Stripe Webhook ⚡️ HIGH PRIORITY
**Why:** Course purchases won't work without it

**Action:**
1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. URL: `https://traviseric.com/api/course/webhook`
   - For testing: Use Stripe CLI or ngrok
4. Select events:
   - ✅ `checkout.session.completed`
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`
   - ✅ `charge.refunded`
5. Copy webhook signing secret → `.env.local`

**Test:**
```bash
# Use Stripe CLI for local testing
stripe listen --forward-to localhost:3000/api/course/webhook
stripe trigger checkout.session.completed
```

**Status:** ⏳ TODO

---

#### 4. Build ModuleCard Component
**Why:** Need for landing page to show all 20 modules

**File:** `components/course/ModuleCard.tsx`

**Port from:** `teneo-marketplace/courses/module-card.html`

**Template:**
```tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, BookOpen, Lock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CourseModule } from '@/lib/course/types';

interface ModuleCardProps {
  module: CourseModule;
  moduleNumber: number;
  isLocked: boolean;
  isCompleted?: boolean;
  progress?: number;
  onClick?: () => void;
}

export function ModuleCard({
  module,
  moduleNumber,
  isLocked,
  isCompleted = false,
  progress = 0,
  onClick
}: ModuleCardProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1",
        isLocked && "opacity-60",
        isCompleted && "border-success-green/30"
      )}
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <Badge variant={module.isFree ? "success" : "default"}>
            {module.isFree ? "FREE" : "PRO"}
          </Badge>
          <span className="font-mono text-sm text-muted-foreground">
            Module {String(moduleNumber).padStart(2, '0')}
          </span>
        </div>
        <CardTitle className="text-lg">{module.title}</CardTitle>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          {module.description}
        </p>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {module.duration}
          </span>
          <span className="flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            {module.lessons?.length || 5} lessons
          </span>
          {isLocked && (
            <Lock className="h-3 w-3 ml-auto" />
          )}
          {isCompleted && (
            <CheckCircle2 className="h-3 w-3 ml-auto text-success-green" />
          )}
        </div>

        {progress > 0 && !isCompleted && (
          <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-sovereignty-gold transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

**Status:** ⏳ TODO

---

### **Week 2: Content & Landing Page** (Nov 25 - Dec 1)

#### 5. Create Landing Page
**Why:** Entry point for the course

**File:** `app/framework/page.tsx`

**Sections:**
1. **Hero**
   - Headline: "Master High-Bandwidth Human-AI Collaboration"
   - Subheadline: "The complete framework for Builders who ship daily"
   - CTA: "Start Free" (first 4 modules)

2. **Your Story** (The Forge)
   - Excerpt from Module 0
   - Build credibility
   - Show transformation

3. **Course Outline**
   - Grid of ModuleCard components
   - Show all 20 modules
   - Highlight free tier (modules 0-3)

4. **Pricing**
   - One-time payment: $97
   - Lifetime access
   - 30-day money-back guarantee
   - EnrollButton (Stripe)

5. **Social Proof** (when available)
   - Testimonials
   - Student count
   - Completion rate

**Template:**
```tsx
import { frameworkCourse } from '@/lib/course/configs/framework';
import { ModuleCard } from '@/components/course/ModuleCard';
import { EnrollButton } from '@/components/course/EnrollButton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function FrameworkLandingPage() {
  return (
    <div className="container max-w-6xl py-16">
      {/* Hero */}
      <section className="text-center mb-16">
        <h1 className="text-5xl font-bold font-heading mb-6">
          Master High-Bandwidth Human-AI Collaboration
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          The complete framework for Builders who ship daily, rest fully, and operate at 5 AM clarity.
        </p>
        <Link href="/framework/the-forge">
          <Button size="lg" variant="default">
            Start Free
          </Button>
        </Link>
      </section>

      {/* Course Modules */}
      <section className="mb-16">
        <h2 className="text-3xl font-bold mb-8">Course Outline</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {frameworkCourse.modules.map((module, i) => (
            <ModuleCard
              key={module.slug}
              module={module}
              moduleNumber={i + 1}
              isLocked={!module.isFree}
              onClick={() => {
                if (module.isFree) {
                  window.location.href = `/framework/${module.slug}`;
                }
              }}
            />
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="text-center">
        <h2 className="text-3xl font-bold mb-4">Unlock Complete Access</h2>
        <p className="text-xl mb-8">One-time payment. Lifetime access.</p>
        <div className="text-4xl font-bold mb-8">${frameworkCourse.price}</div>
        <EnrollButton courseSlug="framework" />
      </section>
    </div>
  );
}
```

**Status:** ⏳ TODO

---

#### 6. Convert Framework Content to MDX
**Why:** Need actual course content

**Source:** `docs/High_Bandwidth_Human_AI_Framework.md`

**Create:** `content/framework/` directory with 20 MDX files

**Structure:**
```
content/framework/
├── 00-the-forge.mdx
├── 01-mirror-principle.mdx
├── 02-three-archetypes.mdx
├── 03-emotional-stability.mdx
├── 04-cognitive-vectoring.mdx
...
├── 19-advanced-protocols.mdx
```

**MDX Template:**
```mdx
---
title: "Module 1: The Mirror Principle"
description: "Understanding AI as cognitive reflection"
duration: "45 min"
isFree: true
---

# The Mirror Principle

## Core Concept

Your AI interactions reflect your cognitive architecture...

## Key Insights

- Insight 1
- Insight 2
- Insight 3

## Exercise

[Interactive exercise here]

## Next Steps

Continue to Module 2...
```

**Action:**
1. Read full framework doc
2. Break into 20 logical modules
3. Create MDX file for each
4. Add frontmatter metadata
5. Format with headings, lists, etc.

**Status:** ⏳ TODO

---

### **Week 3: Integration & Testing** (Dec 2-8)

#### 7. Integrate Email Service
**Why:** Send magic links and purchase confirmations

**Recommended:** Resend (resend.com)

**Install:**
```bash
npm install resend
```

**File:** `lib/course/email.ts`

**Template:**
```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendMagicLink(email: string, token: string, courseSlug: string) {
  const magicLink = `${process.env.NEXT_PUBLIC_SITE_URL}/course/auth/verify?token=${token}`;

  await resend.emails.send({
    from: 'Travis Eric <courses@traviseric.com>',
    to: email,
    subject: 'Access Your Course',
    html: `
      <h2>Click to Access Your Course</h2>
      <p><a href="${magicLink}">Access Course</a></p>
      <p>This link expires in 30 days.</p>
    `
  });
}

export async function sendPurchaseConfirmation(
  email: string,
  courseSlug: string,
  courseName: string
) {
  // Generate magic link token
  const token = await createAccessToken(email, courseSlug);
  const accessLink = `${process.env.NEXT_PUBLIC_SITE_URL}/course/auth/verify?token=${token}`;

  await resend.emails.send({
    from: 'Travis Eric <courses@traviseric.com>',
    to: email,
    subject: `Welcome to ${courseName}!`,
    html: `
      <h2>Thank you for your purchase!</h2>
      <p>You now have lifetime access to ${courseName}.</p>
      <p><a href="${accessLink}" style="background: #fea644; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Start Learning</a></p>
    `
  });
}
```

**Update webhook:** `app/api/course/webhook/route.ts`
```typescript
import { sendPurchaseConfirmation } from '@/lib/course/email';

// After successful payment
await sendPurchaseConfirmation(
  session.customer_email,
  courseSlug,
  'High-Bandwidth Human-AI Framework'
);
```

**Status:** ⏳ TODO

---

#### 8. Test Purchase Flow End-to-End
**Why:** Make sure everything works before launch

**Test Scenarios:**

1. **Happy Path:**
   - Click "Unlock Full Framework"
   - Complete Stripe checkout (test mode)
   - Receive email confirmation
   - Click magic link
   - Verify access granted
   - Test module navigation
   - Mark module complete
   - Check progress tracking

2. **Free Tier:**
   - Access modules 0-3 without purchase
   - Verify locked modules show paywall
   - Test paywall CTA

3. **Edge Cases:**
   - Invalid/expired magic link
   - Duplicate purchase attempt
   - Failed payment
   - Refund request

**Test Checklist:**
- [ ] Stripe checkout works
- [ ] Webhook receives payment event
- [ ] Database record created
- [ ] Email sent successfully
- [ ] Magic link works
- [ ] Cookie set correctly
- [ ] Access granted
- [ ] Progress tracking works
- [ ] Mark complete works
- [ ] Keyboard shortcuts work

**Status:** ⏳ TODO

---

### **Week 4: Polish & Launch** (Dec 9-15)

#### 9. Polish & Optimization
**Tasks:**
- [ ] Mobile responsiveness
- [ ] Loading states
- [ ] Error handling
- [ ] Analytics tracking
- [ ] SEO optimization (meta tags, Open Graph)
- [ ] Accessibility (keyboard navigation, ARIA labels)

**Status:** ⏳ TODO

---

#### 10. Soft Launch to Email List
**Why:** Test with real users, get feedback

**Action:**
1. Email your list
2. Offer early bird discount ($77 instead of $97)
3. Ask for feedback
4. Monitor analytics
5. Fix issues

**Status:** ⏳ TODO

---

#### 11. Public Launch 🚀
**Why:** Make money!

**Checklist:**
- [ ] All modules converted to MDX
- [ ] Purchase flow tested
- [ ] Email service working
- [ ] Landing page live
- [ ] Analytics tracking
- [ ] Social sharing ready

**Launch Day:**
- [ ] Publish landing page
- [ ] Announce on Twitter/X
- [ ] Post on LinkedIn
- [ ] Email list announcement
- [ ] Monitor purchases
- [ ] Respond to questions
- [ ] Track analytics

**Status:** ⏳ TODO

---

## 📊 Success Metrics

Track in Supabase:

**Conversion Funnel:**
- Landing page views
- Free tier signups
- Paywall impressions
- Purchases
- Completion rate

**Targets:**
- 30% landing → free signup
- 25% free → purchase (excellent)
- 70% purchase → completion
- <5% refund rate

**Revenue:**
- Week 1: 10 sales = $970
- Month 1: 50 sales = $4,850
- Month 3: 100 sales = $9,700

---

## 🚀 Quick Start (This Week)

**If you could only do 3 things this week:**

1. ✅ **Apply database migration** (5 min)
2. ✅ **Add environment variables** (10 min)
3. ✅ **Configure Stripe webhook** (15 min)

**That gives you:**
- Working API routes
- Functional Stripe integration
- Foundation for everything else

**Then next week:**
- Build ModuleCard component
- Create landing page
- Start MDX conversion

**Result:** Framework course launched in 4 weeks, $97/sale, lifetime revenue stream.

---

## 💡 Pro Tips

1. **Start with FREE tier:** Launch modules 0-3 immediately to build audience
2. **Test in production:** Use Stripe test mode, but test like it's real
3. **Ship ugly:** Don't wait for perfection, iterate after launch
4. **Track everything:** Analytics are gold for optimization
5. **Build in public:** Share progress on Twitter, builds anticipation

---

**You have all the infrastructure. Just need to execute.** 🔨

**Build protocols, not platforms. Ship daily. Rest fully. 5 AM Builder.** ⚡️
