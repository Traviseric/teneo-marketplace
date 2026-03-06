# 📚 Book Funnel Builder - Interactive Template System

**Instead of a course → An AI-powered funnel builder that creates your entire sales funnel**

---

## 💡 The Vision

### **What the Book Funnel Blueprint Course Teaches:**
- Choose between 4 funnel types (Gated Sneak-Peak, Story-Driven, Reader Magnet, Direct-to-Sale)
- Build landing pages, lead magnets, sales pages
- Set up email sequences
- Create urgency and scarcity
- Track conversions

### **What We Build Instead:**
**An interactive funnel builder where users:**
1. Answer 5-7 questions about their book
2. Select funnel type (we recommend the best one)
3. Get instant, ready-to-use templates
4. Either fill them in manually OR paste AI prompts to auto-generate
5. Deploy their entire funnel in minutes

---

## 🎯 Core Concept

```
Traditional Course (Book Funnel Blueprint):
User watches videos → Takes notes → Implements manually → 7 days

Our Interactive Builder:
User answers questions → AI generates pages → Edit & deploy → 15 minutes
```

**Value Prop:**
> "Get your book funnel live in 15 minutes, not 7 days. AI-powered templates that adapt to YOUR book."

---

## 🏗️ Architecture

### **Step 1: Funnel Selector Quiz**

```
Question 1: What type of book are you selling?
[ ] Fiction (Novel, Thriller, Romance, etc.)
[ ] Non-Fiction (How-to, Business, Self-help)
[ ] Hybrid (Fiction with lessons, Story-based teaching)

Question 2: Do you have an email list?
[ ] Yes, over 1000 subscribers
[ ] Yes, under 1000 subscribers
[ ] No, starting from zero

Question 3: What's your primary goal?
[ ] Build email list (long-term)
[ ] Sell books immediately (short-term revenue)
[ ] Both

Question 4: Do you have a free lead magnet? (first chapter, bonus content)
[ ] Yes, I have something ready
[ ] No, but I can create one
[ ] No, I want to sell directly

Question 5: What's your traffic source?
[ ] Facebook/Instagram Ads
[ ] Amazon Ads
[ ] Organic (Social media, SEO)
[ ] I don't have traffic yet
```

**Result:**
```
Based on your answers:

✅ RECOMMENDED FUNNEL: Reader Magnet Funnel

Why this works for you:
- You're selling non-fiction with existing content
- You have no email list (this builds one)
- You can create a lead magnet from Chapter 1
- Works great with paid ads

Your funnel will have:
1. Landing page (opt-in for free chapter)
2. Thank you page (with book purchase link)
3. Email sequence (5 emails over 7 days)
4. Sales page (persuasive book description)
```

---

## 📄 Template Structure

### **The 4 Funnel Templates:**

#### **1. Gated Sneak-Peak Funnel**
**Best for:** Fiction authors with existing audience
**Pages needed:**
- Landing page (opt-in for first 3 chapters)
- Email delivery page
- Email sequence (3 emails)
- Amazon link with urgency

**Template Fields:**
```javascript
{
  bookTitle: "{{BOOK_TITLE}}",
  bookGenre: "{{GENRE}}",
  hookQuestion: "{{HOOK_QUESTION}}", // e.g., "What if you woke up in someone else's body?"
  chapterTeaser: "{{CHAPTER_1_TEASER}}",
  authorBio: "{{AUTHOR_BIO}}",
  amazonLink: "{{AMAZON_URL}}",
  emailSequence: [
    {
      day: 0,
      subject: "{{EMAIL_1_SUBJECT}}",
      body: "{{EMAIL_1_BODY}}"
    },
    // ... 2 more emails
  ]
}
```

#### **2. Story-Driven Sales Page**
**Best for:** High-concept books, no email needed
**Pages needed:**
- Long-form sales page (story + social proof)
- Direct Amazon/buy link

#### **3. Reader Magnet Funnel**
**Best for:** Building email list + selling
**Pages needed:**
- Landing page (free bonus content)
- Email sequence (7 emails)
- Sales page (book + bonuses)

#### **4. Direct-to-Sale Funnel**
**Best for:** Established authors, urgent launches
**Pages needed:**
- Sales page only (no lead magnet)
- Countdown timer
- Scarcity elements

---

## 🤖 AI Integration

### **Two Modes:**

#### **Mode 1: Manual Fill-In**
```html
<!-- User sees editable template -->
<h1>Discover {{BOOK_TITLE}}</h1>
<input type="text" placeholder="Enter your book title">

<p>{{HOOK_QUESTION}}</p>
<textarea placeholder="Write your compelling hook question"></textarea>
```

#### **Mode 2: AI-Powered (The Magic)**
```html
<!-- User sees AI prompt generator -->
<div class="ai-prompt-box">
  <h3>📝 AI Prompt for Hook Question</h3>
  <div class="prompt-to-copy">
    You are a book marketing expert. Write a compelling hook question
    for a {{GENRE}} book titled "{{BOOK_TITLE}}".
    The hook should create curiosity and make readers want to click.
    Format: One sentence, question form, max 15 words.

    Book description: {{BRIEF_DESCRIPTION}}
  </div>
  <button onclick="copyPrompt()">📋 Copy Prompt</button>
  <button onclick="generateWithAPI()">✨ Auto-Generate (Claude API)</button>
</div>

<textarea id="hook-result" placeholder="Paste AI response here (or click Auto-Generate)"></textarea>
```

**User Workflow:**
1. Click "Copy Prompt"
2. Paste into ChatGPT/Claude
3. Copy result back
4. Paste into template

**OR:**

1. Click "Auto-Generate"
2. AI generates instantly
3. User can edit or regenerate

---

## 🎨 UI/UX Design

### **Funnel Builder Interface**

```
┌─────────────────────────────────────────────────────────┐
│ Book Funnel Builder                         [Save][Export]│
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Step 1: Funnel Type                                   │
│  ✅ Reader Magnet Funnel                               │
│                                                         │
│  Step 2: Build Your Pages                              │
│  ┌──────────────────────────────────────────────────┐ │
│  │ 📄 Landing Page                      [Edit][AI]  │ │
│  │ ═══════════════════════════════════              │ │
│  │ Headline: [Editable text field]                  │ │
│  │   💡 AI Prompt → [Copy] or [Auto-Generate]      │ │
│  │                                                   │ │
│  │ Subheadline: [Editable text field]               │ │
│  │   💡 AI Prompt → [Copy] or [Auto-Generate]      │ │
│  │                                                   │ │
│  │ Lead Magnet Description: [Text area]             │ │
│  │   💡 AI Prompt → [Copy] or [Auto-Generate]      │ │
│  │                                                   │ │
│  │ CTA Button Text: [Get My Free Chapter]           │ │
│  │                                                   │ │
│  │ [Preview Landing Page]                            │ │
│  └──────────────────────────────────────────────────┘ │
│                                                         │
│  ┌──────────────────────────────────────────────────┐ │
│  │ 📧 Email Sequence (5 emails)         [Edit][AI]  │ │
│  │ ═══════════════════════════════════              │ │
│  │ Email 1: Welcome + Deliver Lead Magnet           │ │
│  │   Subject: [Editable] 💡 [AI Prompt]            │ │
│  │   Body: [Editable] 💡 [AI Prompt]               │ │
│  │                                                   │ │
│  │ Email 2: Story Behind the Book (Day 2)           │ │
│  │ Email 3: Social Proof (Day 3)                    │ │
│  │ Email 4: Urgency/Scarcity (Day 5)                │ │
│  │ Email 5: Last Chance (Day 7)                     │ │
│  └──────────────────────────────────────────────────┘ │
│                                                         │
│  ┌──────────────────────────────────────────────────┐ │
│  │ 🛒 Sales Page                        [Edit][AI]  │ │
│  │ ═══════════════════════════════════              │ │
│  │ [AI-generated sales copy based on book info]     │ │
│  └──────────────────────────────────────────────────┘ │
│                                                         │
│  Step 3: Deploy                                         │
│  [Generate HTML Files] [Connect to Email Service]      │
│  [Launch Funnel on OpenBazaar AI]                  │
└─────────────────────────────────────────────────────────┘
```

---

## 📝 Template Examples

### **Landing Page Template (Reader Magnet)**

```html
<!DOCTYPE html>
<html>
<head>
  <title>{{BOOK_TITLE}} - Free Chapter</title>
  <style>
    /* Editable template styling */
    :root {
      --primary-color: {{PRIMARY_COLOR|#7C3AED}};
      --accent-color: {{ACCENT_COLOR|#f7c948}};
    }
  </style>
</head>
<body>
  <div class="hero">
    <h1>{{HEADLINE}}</h1>
    <!-- AI Prompt: "Write a benefit-driven headline for {{BOOK_TITLE}}, a {{GENRE}} book.
         Make it promise a transformation or solution. Max 10 words." -->

    <p class="subheadline">{{SUBHEADLINE}}</p>
    <!-- AI Prompt: "Expand on the headline. What specific problem does this book solve?
         One sentence, conversational tone." -->

    <img src="{{BOOK_COVER_URL}}" alt="{{BOOK_TITLE}} Cover">
  </div>

  <div class="offer">
    <h2>Get the First Chapter FREE</h2>
    <ul class="benefits">
      <li>{{BENEFIT_1}}</li>
      <!-- AI Prompt: "List 3 specific benefits readers get from {{BOOK_TITLE}}.
           Format: Start with a verb (Discover, Learn, Master). One sentence each." -->
      <li>{{BENEFIT_2}}</li>
      <li>{{BENEFIT_3}}</li>
    </ul>

    <form class="email-capture">
      <input type="email" placeholder="Enter your email">
      <button>{{CTA_BUTTON_TEXT|Get My Free Chapter}}</button>
    </form>

    <p class="privacy">{{PRIVACY_TEXT|We respect your privacy. Unsubscribe anytime.}}</p>
  </div>

  <div class="social-proof">
    <h3>What Readers Are Saying</h3>
    <blockquote>
      "{{TESTIMONIAL_1}}"
      <cite>— {{TESTIMONIAL_1_AUTHOR}}</cite>
    </blockquote>
    <!-- AI Prompt: "Write 3 realistic testimonials for {{BOOK_TITLE}}.
         Include specific benefits each reader got. 2-3 sentences each." -->
  </div>

  <div class="urgency">
    <p>{{URGENCY_TEXT}}</p>
    <!-- AI Prompt: "Create urgency for claiming the free chapter.
         Mention limited spots, bonus content, or time-sensitive offer." -->
  </div>
</body>
</html>
```

---

## 🔧 Implementation

### **File Structure**

```
marketplace/frontend/
  funnel-builder/
    index.html                  ← Main builder interface
    templates/
      gated-sneak-peak/
        landing-page.html
        email-sequence.json
        variables.json
      story-driven-sales/
        sales-page.html
        variables.json
      reader-magnet/
        landing-page.html
        thank-you-page.html
        email-sequence.json
        sales-page.html
        variables.json
      direct-to-sale/
        sales-page.html
        countdown.js
        variables.json
    ai-prompts/
      landing-page-prompts.json
      email-prompts.json
      sales-page-prompts.json
    js/
      funnel-builder.js           ← Main builder logic
      template-engine.js          ← Variable replacement
      ai-prompt-generator.js      ← Generate AI prompts
      preview-generator.js        ← Live preview
      export-funnel.js            ← Export HTML/JSON
```

### **AI Prompt Templates**

**File:** `ai-prompts/landing-page-prompts.json`

```json
{
  "headline": {
    "prompt": "You are a direct-response copywriter. Write a compelling headline for a {{GENRE}} book titled '{{BOOK_TITLE}}'. The headline should promise a clear benefit or transformation. Use power words. Max 10 words.\n\nBook description: {{BOOK_DESCRIPTION}}\n\nTarget audience: {{TARGET_AUDIENCE}}",
    "examples": [
      "Discover the Secret to Financial Freedom in 30 Days",
      "The Thriller That Will Keep You Up All Night",
      "Master Productivity and Reclaim Your Time"
    ]
  },
  "subheadline": {
    "prompt": "Write a subheadline that expands on this headline: '{{GENERATED_HEADLINE}}'. It should create curiosity and hint at the solution without giving everything away. 1-2 sentences, conversational tone.",
    "examples": [
      "Learn the proven system used by 10,000+ readers to transform their finances",
      "A page-turner that critics are calling 'the best thriller of the year'",
      "The time management framework that finally works for busy professionals"
    ]
  },
  "benefits": {
    "prompt": "List 3 specific, measurable benefits readers will get from '{{BOOK_TITLE}}'. Each benefit should start with an action verb (Discover, Learn, Master, Unlock). Focus on outcomes, not features.\n\nBook description: {{BOOK_DESCRIPTION}}",
    "examples": [
      "Discover the 5-step framework for writing your first novel in 90 days",
      "Learn the psychology behind habit formation backed by science",
      "Master the art of persuasive writing that converts readers into buyers"
    ]
  },
  "urgency": {
    "prompt": "Create urgency for claiming a free chapter of '{{BOOK_TITLE}}'. Options: limited-time bonus, exclusive content only for first X subscribers, special launch pricing. Make it believable and ethical.",
    "examples": [
      "BONUS: Get our exclusive 10-page implementation guide (only available for the next 100 subscribers)",
      "Launch Special: Claim your free chapter + bonus workbook before midnight",
      "Limited Time: Get instant access to Chapter 1 + author Q&A invitation"
    ]
  }
}
```

---

## 💻 Core Functionality

### **1. Funnel Builder JavaScript**

```javascript
class FunnelBuilder {
  constructor() {
    this.funnelType = null;
    this.variables = {};
    this.templates = {};
    this.currentStep = 1;
  }

  // Step 1: Quiz and select funnel
  async selectFunnel(answers) {
    const recommendation = this.analyzeFunnelFit(answers);
    this.funnelType = recommendation.type;
    await this.loadTemplates(this.funnelType);
  }

  analyzeFunnelFit(answers) {
    // Logic to recommend best funnel based on quiz
    if (answers.bookType === 'fiction' && answers.hasEmailList) {
      return { type: 'gated-sneak-peak', confidence: 95 };
    } else if (answers.hasLeadMagnet && answers.goal === 'email-list') {
      return { type: 'reader-magnet', confidence: 90 };
    }
    // ... more logic
  }

  // Step 2: Load template files
  async loadTemplates(funnelType) {
    const response = await fetch(`/funnel-builder/templates/${funnelType}/variables.json`);
    const templateConfig = await response.json();
    this.templates = templateConfig;
    this.renderBuilder();
  }

  // Step 3: Render editable template
  renderBuilder() {
    const container = document.getElementById('builder-container');

    this.templates.pages.forEach(page => {
      const pageEditor = this.createPageEditor(page);
      container.appendChild(pageEditor);
    });
  }

  createPageEditor(page) {
    const editor = document.createElement('div');
    editor.className = 'page-editor';
    editor.innerHTML = `
      <h2>${page.name}</h2>
      ${page.variables.map(v => this.createVariableInput(v)).join('')}
    `;
    return editor;
  }

  createVariableInput(variable) {
    return `
      <div class="variable-input">
        <label>${variable.label}</label>
        ${variable.type === 'textarea' ?
          `<textarea id="${variable.name}" placeholder="${variable.placeholder}"></textarea>` :
          `<input type="text" id="${variable.name}" placeholder="${variable.placeholder}">`
        }
        <div class="ai-assistant">
          <button onclick="showAIPrompt('${variable.name}')">💡 AI Prompt</button>
          <button onclick="generateWithAI('${variable.name}')">✨ Auto-Generate</button>
        </div>
      </div>
    `;
  }

  // Step 4: AI prompt generation
  getAIPrompt(variableName) {
    const prompts = this.templates.aiPrompts;
    let prompt = prompts[variableName].prompt;

    // Replace placeholders with user's data
    Object.keys(this.variables).forEach(key => {
      prompt = prompt.replace(`{{${key}}}`, this.variables[key]);
    });

    return prompt;
  }

  // Step 5: Generate with Claude API (optional)
  async generateWithAI(variableName) {
    const prompt = this.getAIPrompt(variableName);

    const response = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    const result = await response.json();
    document.getElementById(variableName).value = result.text;
    this.variables[variableName] = result.text;
  }

  // Step 6: Preview funnel
  previewFunnel() {
    const template = this.templates.landingPage;
    let html = template;

    // Replace all variables
    Object.keys(this.variables).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, this.variables[key]);
    });

    // Open in new window
    const previewWindow = window.open('', '_blank');
    previewWindow.document.write(html);
  }

  // Step 7: Export funnel
  exportFunnel() {
    const funnel = {
      type: this.funnelType,
      variables: this.variables,
      pages: this.generateAllPages(),
      emailSequence: this.generateEmailSequence()
    };

    // Download as JSON
    this.downloadJSON(funnel, `${this.variables.BOOK_TITLE}-funnel.json`);

    // Also download HTML files
    funnel.pages.forEach(page => {
      this.downloadHTML(page.html, page.filename);
    });
  }

  generateAllPages() {
    return this.templates.pages.map(page => {
      let html = page.template;

      Object.keys(this.variables).forEach(key => {
        html = html.replace(new RegExp(`{{${key}}}`, 'g'), this.variables[key]);
      });

      return {
        name: page.name,
        filename: page.filename,
        html: html
      };
    });
  }
}
```

---

## 🎯 User Flow

### **Complete Journey:**

```
1. User clicks "Build Your Book Funnel" on OpenBazaar AI

2. Quiz (2 minutes)
   - Answer 5-7 questions
   - Get funnel recommendation

3. Template Customization (10-15 minutes)
   For each page section:
   a) Read the field description
   b) EITHER:
      - Fill in manually
      - Click "AI Prompt" → Copy to ChatGPT → Paste back
      - Click "Auto-Generate" → AI fills instantly (Claude API)
   c) Edit as needed

4. Preview (1 minute)
   - See live preview of all pages
   - Make final tweaks

5. Export (1 minute)
   - Download HTML files
   - Get email sequence copy
   - Get integration instructions

6. Deploy (5-10 minutes)
   - Upload to website/OpenBazaar AI
   - Connect email service
   - Launch ads

TOTAL TIME: 15-30 minutes vs 7 days with traditional course
```

---

## 🚀 MVP Features

### **Phase 1: Basic Builder (1 week)**
- [ ] Funnel selector quiz
- [ ] Reader Magnet template (most versatile)
- [ ] Editable text fields
- [ ] AI prompt copier (user pastes to external AI)
- [ ] Preview generator
- [ ] HTML export

### **Phase 2: AI Integration (1 week)**
- [ ] Claude API integration
- [ ] Auto-generate button
- [ ] Regenerate options
- [ ] Multiple variations

### **Phase 3: Advanced Features (2 weeks)**
- [ ] All 4 funnel templates
- [ ] Email sequence builder
- [ ] Countdown timer generator
- [ ] A/B testing variants
- [ ] Analytics integration

---

## 💰 Business Model

### **Why This Sells Books:**

1. **Users need Teneo to buy books** → Funnels drive traffic to Teneo
2. **Successful funnels = more authors** → More authors = more books on platform
3. **Free tool drives signups** → Users create account to access builder
4. **Export encourages publishing** → "Publish your book on Teneo to use funnel"

### **Upsell Opportunities:**

- **Free:** Basic funnel builder (Reader Magnet only)
- **Pro ($29):** All 4 funnels + AI auto-generate + email templates
- **Agency ($99):** Unlimited funnels + white-label + client management

---

## 🎨 Visual Design

Match Teneo branding:
- Purple/gold color scheme
- Clean, minimal interface
- Focus on the template preview
- AI features highlighted with ✨ sparkle icon
- Copy/paste workflow emphasized

---

**Next:** Build the Funnel Builder MVP? 🚀
