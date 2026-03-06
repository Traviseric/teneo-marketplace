# Public Repository Guidelines

**What belongs in openbazaar-ai (public open source repo)**

---

## 🎯 Core Principle

> **This is a DISPLAY-ONLY marketplace. Generation logic lives elsewhere.**

---

## ✅ What Belongs in This Repo (Public)

### **Display & Consumption**
- Book marketplace UI (displays books for sale)
- Course player (plays course content)
- Shopping cart and checkout flow
- Progress tracking UI
- User authentication (login/register)

### **Generic Infrastructure**
- Multi-brand configuration system
- Generic funnel builder (template-based, no automation)
- Federation network (node discovery, search)
- Public REST APIs (CRUD operations only)
- Database schemas (empty structures)

### **Static Content**
- Documentation for marketplace features
- API documentation
- Setup guides
- Contributing guidelines

---

## ❌ What Does NOT Belong (Keep Private)

### **Content Generation**
- Any code that CREATES books, courses, or funnels
- AI prompt libraries or templates
- Automation scripts for content generation
- Brand analysis or profiling systems

### **Business Logic**
- Proprietary algorithms
- Revenue optimization code
- Advanced analytics systems
- Conversion optimization tools

### **Internal Details**
- Private repo architecture or file structures
- Internal tool names or implementation details
- Competitive advantages or "secret sauce"
- Customer data or analytics

---

## 📋 Safe Communication Pattern

### ✅ **Safe to Document (Generic)**

```markdown
✅ "This marketplace displays courses created by content management systems"
✅ "Books are published to this marketplace via our admin API"
✅ "The funnel builder uses templates that users customize"
✅ "Partners can publish their own content to the marketplace"
```

### ❌ **NOT Safe (Exposes Private Details)**

```markdown
❌ "We use a 7-phase generation pattern to create books"
❌ "The shadow-repository system manages Git automation"
❌ "Our DNA extraction algorithm analyzes brand profiles"
❌ "The orchestrator.js file coordinates content generation"
```

---

## 🔍 Self-Check Questions

Before committing documentation, ask:

1. **Generation Check**: Does this explain HOW content is generated?
   - If YES → Move to private repo ❌
   - If NO → Safe for public ✅

2. **Architecture Check**: Does this reveal internal system architecture?
   - If YES → Move to private repo ❌
   - If NO → Safe for public ✅

3. **Competitive Check**: Would revealing this help competitors?
   - If YES → Keep private ❌
   - If NO → Safe for public ✅

4. **Generic Check**: Could ANY marketplace implement this?
   - If YES → Safe for public ✅
   - If NO → Keep private ❌

---

## 📚 Documentation Strategy

### **Public Docs Should Focus On:**

- **HOW to use** the marketplace (not how it's built internally)
- **WHAT features** are available (not how they're implemented)
- **HOW to integrate** via APIs (generic REST patterns)
- **HOW to contribute** UI/UX improvements

### **Private Docs Should Cover:**

- Internal architecture decisions
- Content generation workflows
- Proprietary system implementations
- Competitive advantages

---

## 🎯 Examples: Public vs. Private

### **Example 1: Course Publishing**

**❌ Too Detailed (Private):**
> "Courses are generated using our proprietary system which uses a 7-phase orchestration pattern. The system first extracts brand DNA, then uses multi-dimensional evaluation..."

**✅ Generic (Public):**
> "Courses can be published to this marketplace via the admin API. The marketplace displays course content and tracks student progress."

---

### **Example 2: Integration**

**❌ Too Detailed (Private):**
> "In teneo-production, run the marketplace-publisher service which converts the output from teneo-engine/orchestrator.js into the public schema..."

**✅ Generic (Public):**
> "Content can be published from any external system using our REST API. See API_SPECIFICATION.md for details."

---

### **Example 3: Features**

**❌ Too Detailed (Private):**
> "The automatic funnel generator uses Claude Code agents and the shadow-repository pattern to create Git-backed course content..."

**✅ Generic (Public):**
> "The funnel builder provides templates that users can customize. Users fill in their content and publish when ready."

---

## 🚨 Red Flag Terms (Avoid in Public Docs)

| Term | Why It's Sensitive | Generic Alternative |
|------|-------------------|---------------------|
| "7-phase pattern" | Reveals proprietary method | "content generation system" |
| "DNA extraction" | Reveals specific algorithm | "brand analysis" |
| "Shadow repository" | Reveals implementation | "content management" |
| "orchestrator.js" | Reveals file structure | "automation system" |
| "teneo-pattern.js" | Reveals implementation | "generation logic" |
| "multi-dimensional evaluation" | Reveals algorithm | "quality assessment" |
| "selective refinement" | Reveals process | "content optimization" |

---

## ✅ Approved Documentation Types

### **For Public Repo:**

1. **API Documentation** - REST endpoints, request/response formats
2. **UI Documentation** - How to use the marketplace interface
3. **Integration Guides** - How to publish content via API
4. **Contributing Guides** - How to improve UI/UX
5. **Setup Instructions** - How to deploy a marketplace node

### **For Private Repo Only:**

1. **Architecture Diagrams** - Internal system design
2. **Algorithm Documentation** - How generation works
3. **Implementation Details** - File structures, code patterns
4. **Proprietary Processes** - Competitive advantages
5. **Integration Internals** - How private systems connect

---

## 📁 File Organization

```
openbazaar-ai/ (PUBLIC)
├── docs/
│   ├── api/                    # ✅ API documentation
│   ├── guides/                 # ✅ User guides
│   └── core/
│       └── PUBLIC_REPO_GUIDELINES.md  # ✅ This file
├── README.md                   # ✅ General overview
├── CLAUDE.md                   # ✅ AI assistant guide
└── claude-files/               # ⚠️ GITIGNORED (private notes)
    └── *.md                    # Private integration details

teneo-production/ (PRIVATE - different repo)
├── docs/
│   ├── architecture/           # 🔒 System design
│   ├── algorithms/             # 🔒 Proprietary logic
│   └── integration/            # 🔒 How systems connect
└── teneo-engine/               # 🔒 Generation code
```

---

## 🔒 Sensitive Topics Checklist

Before documenting, check if your content mentions:

- [ ] Specific number of phases/steps in generation process
- [ ] Algorithm names or implementations
- [ ] File structures from private repos
- [ ] Internal tool names
- [ ] Proprietary methodologies
- [ ] Competitive advantages
- [ ] Private repo architecture

If you checked ANY box → Document in private repo, NOT public.

---

## 🎯 The Golden Rule

```
If it says HOW we generate → Private
If it says WHAT we display → Public
```

**Examples:**
- "The marketplace displays course modules" → **Public** ✅
- "We generate modules using XYZ pattern" → **Private** ❌

---

## 📞 When in Doubt

**Ask yourself:**

1. "Would I be comfortable if a competitor read this?"
   - YES → Probably safe for public
   - NO → Keep private

2. "Does this explain a unique approach or advantage?"
   - YES → Keep private
   - NO → Probably safe for public

3. "Could someone recreate our system from this?"
   - YES → Keep private
   - NO → Probably safe for public

---

## ✅ Final Checklist

Before committing documentation to public repo:

- [ ] No mentions of specific generation algorithms
- [ ] No file structure from private repos
- [ ] No proprietary process descriptions
- [ ] No internal tool names
- [ ] No competitive advantage revelations
- [ ] Content focuses on USING not BUILDING
- [ ] Generic language throughout
- [ ] Would pass the "competitor test"

---

**Last Updated**: 2025-11-22
**Purpose**: Protect competitive advantages while enabling open source
**Golden Rule**: Display = Public, Generate = Private
