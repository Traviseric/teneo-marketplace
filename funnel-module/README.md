# 🚀 Funnel Module - Interactive Book Funnel Builder

**Build book funnels in minutes with AI-powered templates**

---

## 📋 What This Is

A self-contained, portable funnel builder that:
- Creates professional book sales funnels in 5-60 minutes
- Provides 4 proven funnel templates
- Offers AI-powered copy assistance (3 modes: manual, prompts, auto-generate)
- Integrates seamlessly with the course platform
- Exports ready-to-deploy HTML/ZIP files

---

## 🎯 Quick Start

### Standalone Mode (Direct Access)

```bash
# 1. Make sure you're in the marketplace directory
cd marketplace

# 2. Start the server
npm start

# 3. Open funnel builder
http://localhost:3001/funnel-builder
```

### Course Integration Mode

```bash
# Access from Book Funnel Blueprint course
http://localhost:3001/courses/course-player.html?course=book-funnel-blueprint

# Opens funnel builder with context when user clicks action buttons
```

---

## 📂 File Structure

```
funnel-module/
├── frontend/
│   ├── funnel-builder.html          # Main UI
│   ├── funnel-wizard.html           # Quiz (coming Day 2)
│   ├── css/
│   │   └── funnel-builder.css       # Custom styles
│   └── js/
│       ├── funnel-builder.js        # Core logic ✅
│       ├── funnel-wizard.js         # Quiz logic (Day 2)
│       ├── aiHelpers.js             # AI integration (Day 2)
│       └── funnelExport.js          # Export features (Day 3)
├── backend/
│   ├── routes/
│   │   └── funnels.js               # API routes (Day 3)
│   ├── services/
│   │   ├── funnelService.js         # Funnel CRUD (Day 3)
│   │   └── funnelAI.js              # AI generation (Day 2)
│   └── database/
│       └── schema-funnels.sql       # Database schema (Day 3)
├── config/
│   ├── funnel-config.js             # Settings (Day 3)
│   └── funnel-prompts.json          # AI prompts (Day 2)
├── templates/
│   ├── book-sales-page.html         # ✅ Exists
│   ├── thank-you.html               # ✅ Exists
│   ├── story-driven.html            # Day 3
│   ├── reader-magnet.html           # Day 3
│   └── direct-sale.html             # Day 3
└── README.md                        # This file
```

---

## 🎨 Features

### ✅ Implemented (Day 1 Morning)

**Core UI:**
- Welcome screen with template selection
- 4 funnel template cards
- Builder interface (variable inputs + live preview)
- Template variable auto-detection
- Live preview (desktop/tablet/mobile modes)
- Progress tracking
- Course context detection
- Auto-save to localStorage

**Templates:**
- Gated Sneak-Peak Funnel (book-sales-page.html)
- Story-Driven Sales Funnel (placeholder)
- Reader Magnet Funnel (placeholder)
- Direct-to-Sale Funnel (placeholder)

### 🔨 In Progress (Day 1 Afternoon/Evening)

**Export Features:**
- Download HTML
- Download ZIP
- Copy to clipboard
- Deploy to Teneo

**Integration:**
- Template processor integration
- Variable replacement engine
- Draft save/load from backend

### 📋 Upcoming (Day 2+)

**AI Features (Day 2):**
- AI prompt library (30+ prompts)
- Prompt helper UI
- Auto-generate with Claude API
- Funnel wizard (5-question quiz)

**Backend (Day 3):**
- Save/load drafts API
- Deploy funnel API
- Funnel analytics
- Database persistence

---

## 🔌 Integration Points

### With Course Platform

**URL Parameters:**
```javascript
/funnel-builder?course=book-funnel-blueprint&lesson=4&step=headline&returnUrl=/courses/...
```

**Detected Context:**
- Shows "Course Mode" badge
- Focuses on relevant variable
- "Back to Course" button
- Progress syncs to course

### With Template Processor

```javascript
// Uses existing template-processor.js
const processed = templateProcessor.replaceVariables(template, variables);
```

### With Marketplace

```javascript
// Opens from admin dashboard
/funnel-builder?template=book-sales-page&bookId=123

// Auto-fills book data from catalog
```

---

## 💡 Usage Examples

### Example 1: New User (via Course)

```
1. User enrolls in "Book Funnel Blueprint" course
2. Lesson 1: "Choose Your Funnel Type" → Click [Take Quiz]
3. Quiz recommends: "Gated Sneak-Peak Funnel"
4. Lesson 2: "Craft Your Headline" → Click [Open Funnel Builder]
5. Builder opens with BOOK_TITLE field highlighted
6. User types OR clicks [💡 AI Prompt] for help
7. Fills all variables (AI-assisted)
8. Clicks [🚀 Deploy to Teneo]
9. Funnel live in ~60 minutes
```

### Example 2: Experienced User (Standalone)

```
1. User goes directly to /funnel-builder
2. Clicks "Browse Templates"
3. Selects "Direct-to-Sale Funnel"
4. Clicks [✨ Auto-Generate All] (premium)
5. Reviews AI-generated copy
6. Makes minor edits
7. Clicks [Download ZIP]
8. Funnel ready in ~5 minutes
```

### Example 3: Return User

```
1. User returns days later
2. Opens /funnel-builder
3. Prompt: "Continue editing your previous funnel?"
4. Clicks [Yes]
5. All variables restored
6. Continues from where they left off
```

---

## 🎯 AI Prompt System (Day 2)

### Three Modes:

**Mode 1: Manual (Free)**
```
User types everything manually
No AI required
Always available
```

**Mode 2: Copy-Paste Prompts (Free)**
```
1. User clicks [💡 AI Prompt]
2. Popup shows pre-written prompt
3. User clicks [Copy Prompt]
4. Pastes into ChatGPT/Claude
5. Copies AI result
6. Pastes back into field

Works with ANY AI tool
```

**Mode 3: Auto-Generate (Premium)**
```
1. User clicks [✨ Auto-Generate]
2. Sends prompt to Claude API
3. Result auto-fills field
4. User reviews and edits

Requires API key
Fastest option
```

---

## 📊 Template Variables

### Core Variables (All Templates)

```javascript
{
  BOOK_TITLE: 'Book title',
  BOOK_SUBTITLE: 'Tagline/subtitle',
  AUTHOR_NAME: 'Author name',
  AUTHOR_BIO: 'Author bio (2-3 sentences)',
  PRICE: '19.99',
  ORIGINAL_PRICE: '29.99',
  BOOK_COVER: 'URL to cover image',
  AUTHOR_IMAGE: 'URL to author photo',
  PRIMARY_COLOR: '#7C3AED',
  ACCENT_COLOR: '#EC4899',
  BRAND_NAME: 'Brand/publisher name',
  CTA_TEXT: 'Buy Now - Instant Download'
}
```

### Benefit Variables (6 benefits)

```javascript
{
  BENEFIT_1_TITLE: 'First benefit headline',
  BENEFIT_1_TEXT: 'Benefit description',
  BENEFIT_2_TITLE: ...,
  // ... through BENEFIT_6
}
```

### Social Proof Variables (3 testimonials)

```javascript
{
  TESTIMONIAL_1_TEXT: 'Customer review',
  TESTIMONIAL_1_NAME: 'Customer name',
  TESTIMONIAL_1_TITLE: 'Customer title/credential',
  // ... through TESTIMONIAL_3
}
```

### FAQ Variables (5 FAQs)

```javascript
{
  FAQ_1_Q: 'Question',
  FAQ_1_A: 'Answer',
  // ... through FAQ_5
}
```

### Other Variables

```javascript
{
  GUARANTEE_TEXT: 'Money-back guarantee',
  SOCIAL_FACEBOOK: 'Facebook URL',
  SOCIAL_TWITTER: 'Twitter URL',
  SOCIAL_INSTAGRAM: 'Instagram URL',
  SUPPORT_EMAIL: 'support@example.com'
}
```

**Total: 30+ variables per template**

---

## 🔧 Configuration

### Environment Variables (Optional)

```bash
# In .env
FUNNEL_BUILDER_ENABLED=true
CLAUDE_API_KEY=your_key_here  # For auto-generate feature
AUTO_SAVE_INTERVAL=30000      # 30 seconds
```

### Frontend Configuration

```javascript
// In funnel-builder.js
const config = {
  autoSaveInterval: 30000,     // 30 seconds
  previewUpdateDelay: 500,     // 500ms debounce
  enableAIGenerate: false,     // Requires API key
  defaultTemplate: 'book-sales-page'
};
```

---

## 🧪 Testing

### Manual Testing Checklist:

**Day 1 Morning ✅:**
- [ ] Open /funnel-builder
- [ ] Welcome screen loads
- [ ] Click "Browse Templates"
- [ ] Template grid shows 4 templates
- [ ] Click "Gated Sneak-Peak Funnel"
- [ ] Builder interface loads
- [ ] Variable inputs auto-generate
- [ ] Type in BOOK_TITLE field
- [ ] Preview updates in real-time
- [ ] Progress bar updates
- [ ] Change preview modes (desktop/tablet/mobile)

**Day 1 Afternoon (Pending):**
- [ ] Click [💡 AI Prompt] button
- [ ] Modal shows AI prompt
- [ ] Click [Copy Prompt]
- [ ] Prompt copies to clipboard
- [ ] Close modal

**Day 1 Evening (Pending):**
- [ ] Click [Export] → [Download HTML]
- [ ] HTML file downloads
- [ ] Open HTML file in browser
- [ ] Looks correct with filled variables
- [ ] Click [Save Draft]
- [ ] Refresh page
- [ ] Prompt to continue editing
- [ ] Draft restores correctly

---

## 📈 Day-by-Day Progress

### Day 1 (Today) ✅

**Morning (8am-12pm):** ✅ COMPLETE
- [x] Folder structure created
- [x] funnel-builder.html (complete UI)
- [x] funnel-builder.css (all styles)
- [x] funnel-builder.js (core logic)
- [x] README.md (this file)

**Afternoon (12pm-4pm):** IN PROGRESS
- [ ] AI prompt generation
- [ ] AI modal integration
- [ ] Copy to clipboard
- [ ] Auto-generate button (stub)

**Evening (4pm-8pm):** TODO
- [ ] Export HTML function
- [ ] Export ZIP function
- [ ] Deploy API integration
- [ ] Auto-save to backend

**Deliverable:** Funnel builder with manual fill + live preview

---

### Day 2 (Tomorrow)

**AI Integration:**
- [ ] Create funnel-prompts.json (30+ prompts)
- [ ] AI prompt generator
- [ ] Claude API integration (optional)
- [ ] Funnel wizard (quiz)

**Deliverable:** AI-powered funnel builder

---

### Day 3 (Day After Tomorrow)

**Backend & Export:**
- [ ] Backend API routes
- [ ] Database schema
- [ ] Deploy feature
- [ ] ZIP export with JSZip
- [ ] 3 additional templates

**Deliverable:** Production-ready funnel builder

---

## 🐛 Known Issues

- [ ] Auto-generate requires Claude API key (not implemented yet)
- [ ] Deploy feature needs backend API (coming Day 3)
- [ ] ZIP export needs JSZip library (coming Day 3)
- [ ] Only 1 template active (book-sales-page.html), others placeholder

---

## 🚀 Deployment

### Mount in Server

```javascript
// In marketplace/backend/server.js

// Serve funnel builder frontend
app.use('/funnel-builder', express.static('funnel-module/frontend'));

// Mount API routes (Day 3)
// const funnelRoutes = require('./funnel-module/backend/routes/funnels');
// app.use('/api/funnels', funnelRoutes);
```

### Test Locally

```bash
npm start

# Visit:
http://localhost:3001/funnel-builder
```

---

## 📝 Current Status

**Build Progress:** Day 1 Morning Complete (25% total)

**What Works:**
- ✅ Template selection
- ✅ Variable auto-detection
- ✅ Input form generation
- ✅ Live preview
- ✅ Preview modes (desktop/tablet/mobile)
- ✅ Progress tracking
- ✅ Course context detection
- ✅ Auto-save (localStorage)

**What's Next:**
- 🔨 AI prompt helpers (Day 1 Afternoon)
- 🔨 Export features (Day 1 Evening)
- 🔨 Backend integration (Day 3)

---

## 💡 Tips

1. **Start with the quiz** - Helps beginners choose the right template
2. **Use AI prompts** - Eliminates writer's block
3. **Preview often** - See changes in real-time
4. **Save frequently** - Auto-saves every 30 seconds
5. **Export early** - Test your funnel before deploying

---

## 📞 Support

**Documentation:**
- Integration Plan: `/FUNNEL_BUILDER_INTEGRATION_PLAN.md`
- Infrastructure Audit: `/FUNNEL_INFRASTRUCTURE_AUDIT.md`
- Course Design: `/BOOK_FUNNEL_BUILDER_CONCEPT.md`

**Commands:**
```bash
# Test funnel builder
npm start
open http://localhost:3001/funnel-builder

# Check logs
tail -f logs/funnel-builder.log
```

---

**Built with ❤️ as part of the Teneo Marketplace platform**

**Status:** Day 1 Morning Complete ✅
**Next:** Day 1 Afternoon - AI Prompt Integration
