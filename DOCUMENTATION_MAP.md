# Documentation Map

**Complete guide to all separation strategy documentation**

**Last Updated**: 2025-11-22

---

## 🗺️ **Navigation Guide**

This project has TWO types of documentation:
1. **Public** (committed to repo) - Anyone can read
2. **Private** (gitignored in `claude-files/`) - Your eyes only

---

## 📂 **PUBLIC DOCUMENTATION** (Open Source)

### **Core Guidelines**

📄 **[docs/core/PUBLIC_REPO_GUIDELINES.md](./docs/core/PUBLIC_REPO_GUIDELINES.md)**
- **What**: Guidelines for what belongs in public vs. private repos
- **Read First**: Yes - understand the boundaries
- **Contains**:
  - What belongs in public repo (safe to commit)
  - What belongs in private repo (keep secret)
  - Self-check questions before committing
  - Red flag terms to avoid
  - Examples of safe vs. unsafe documentation

---

### **API Reference**

📄 **[docs/reference/API_SPECIFICATION.md](./docs/reference/API_SPECIFICATION.md)**
- **What**: Complete REST API documentation
- **For**: Developers integrating with marketplace
- **Contains**:
  - Course API (list, get, enroll, progress)
  - Book API (catalog, details, purchase)
  - Checkout API (Stripe integration)
  - Network API (federation)
  - Admin API (publishing - requires auth)
  - Error codes, rate limiting, SDKs

---

### **Quick References**

📄 **[INTEGRATION_STRATEGY_SUMMARY.md](./INTEGRATION_STRATEGY_SUMMARY.md)**
- **What**: Executive summary of integration strategy
- **Read This If**: You want the TL;DR version
- **Contains**:
  - Quick overview
  - Links to all docs
  - Implementation checklist
  - Next steps

📄 **[COURSE_MODULE_CLEANUP_SUMMARY.md](./COURSE_MODULE_CLEANUP_SUMMARY.md)**
- **What**: Summary of course-module cleanup (Teneo → generic)
- **Contains**:
  - What was changed
  - Before/after examples
  - Verification results
  - Next action items

📄 **[CLAUDE.md](./CLAUDE.md)**
- **What**: Instructions for AI assistants working on this repo
- **Contains**:
  - Public/private separation section (lines 100-124)
  - Development commands
  - Architecture overview
  - Git safety protocols

---

### **Course Module Docs**

📄 **[course-module/README.md](./course-module/README.md)**
- **What**: How to use the course module
- **Contains**:
  - Quick start guide
  - Integration examples
  - Configuration options

📄 **[course-module/CLEANUP_CHANGELOG.md](./course-module/CLEANUP_CHANGELOG.md)**
- **What**: Detailed log of cleanup changes
- **Contains**:
  - Line-by-line changes
  - Before/after comparisons
  - Summary statistics

📄 **[course-module/PUBLIC_CONTENT_GUIDELINES.md](./course-module/PUBLIC_CONTENT_GUIDELINES.md)**
- **What**: Guidelines for writing public content
- **Read Before**: Adding any new course content
- **Contains**:
  - DO/DON'T lists with examples
  - Self-check questions
  - Review checklist
  - White-label best practices

---

### **Feature Documentation**

📄 **[docs/features/COURSE_PLATFORM_INTEGRATION.md](./docs/features/COURSE_PLATFORM_INTEGRATION.md)**
- **What**: Course platform integration strategy
- **Contains**:
  - Shared component library
  - traviseric.com + marketplace integration
  - Revenue projections
  - Implementation phases

---

## 🔒 **PRIVATE DOCUMENTATION** (Gitignored)

### **Private Documentation**

📄 **`claude-files/PRIVATE_INTEGRATION_NOTES.md`** (Gitignored)
- **Location**: `claude-files/`
- **⚠️ NEVER COMMIT**: Contains secrets and proprietary info
- **Contains**:
  - 🔒 Protected IP list (content generation specifics)
  - API keys and secrets
  - Private integration endpoints
  - Testing procedures with private systems
  - Proprietary implementation details

📄 **`claude-files/PRIVATE_SEPARATION_ARCHITECTURE.md`** (Gitignored)
- **Location**: `claude-files/`
- **⚠️ NEVER COMMIT**: Contains detailed private architecture
- **Contains**:
  - Complete architectural split (with sensitive details)
  - Integration patterns between public and private systems
  - Data flow diagrams (internal)
  - Implementation details
  - Private repo file structures

---

## 🎯 **WHICH DOCUMENT DO I READ?**

### **If you want to...**

| Goal | Read This |
|------|-----------|
| **Understand what's public vs. private** | `docs/core/PUBLIC_REPO_GUIDELINES.md` |
| **Build against the API** | `docs/reference/API_SPECIFICATION.md` |
| **Write course content** | `course-module/PUBLIC_CONTENT_GUIDELINES.md` |
| **See what changed** | `COURSE_MODULE_CLEANUP_SUMMARY.md` |
| **Know what NEVER to commit** | `docs/core/PUBLIC_REPO_GUIDELINES.md` |
| **Integrate with private systems** | `claude-files/PRIVATE_*` files ⚠️ (gitignored) |
| **See detailed architecture** | `claude-files/PRIVATE_SEPARATION_ARCHITECTURE.md` ⚠️ |

---

## 🚨 **CRITICAL: What NEVER Goes in Public Repo**

### ❌ **Protected IP (Private Repos ONLY)**

**Content Generation:**
- Any code that creates books, courses, or funnels
- Proprietary generation algorithms or patterns
- AI prompt libraries and templates
- Automation scripts for content creation

**Advanced Systems:**
- Internal architecture details
- File structures from private repos
- Proprietary automation systems
- Brand analysis implementations

**Business Logic:**
- Revenue optimization algorithms
- Conversion optimization code
- Customer analytics systems
- Competitive advantage implementations

### ✅ **Safe for Public Repo (marketplace)**

**Display & UI:**
- Course player UI (generic)
- Book catalog pages
- Shopping cart / checkout
- Progress tracking UI

**Infrastructure:**
- Generic funnel templates
- Public REST APIs (CRUD only)
- Federation protocol
- Multi-brand configs
- Database schemas (empty)

---

## 📋 **Document Hierarchy**

```
Root Documentation
├── 📄 DOCUMENTATION_MAP.md (this file) ← START HERE
├── 📄 COURSE_MODULE_CLEANUP_SUMMARY.md (cleanup summary)
├── 📄 CLAUDE.md (AI assistant instructions)
│
├── docs/core/
│   └── 📄 PUBLIC_REPO_GUIDELINES.md (what's public vs. private)
│
├── docs/reference/
│   └── 📄 API_SPECIFICATION.md (API docs)
│
├── docs/features/
│   └── 📄 COURSE_PLATFORM_INTEGRATION.md (integration strategy)
│
├── course-module/
│   ├── 📄 README.md (how to use)
│   ├── 📄 CLEANUP_CHANGELOG.md (what changed)
│   └── 📄 PUBLIC_CONTENT_GUIDELINES.md (content rules)
│
└── claude-files/ (GITIGNORED - NEVER COMMIT)
    ├── 📄 PRIVATE_INTEGRATION_NOTES.md (secrets & protected IP) ⚠️
    └── 📄 PRIVATE_SEPARATION_ARCHITECTURE.md (detailed architecture) ⚠️
```

---

## 🔄 **Documentation Workflow**

### **When Adding New Public Content:**

1. Read `course-module/PUBLIC_CONTENT_GUIDELINES.md`
2. Write content generically (no Teneo references)
3. Check against protected IP list in `claude-files/PRIVATE_INTEGRATION_NOTES.md`
4. If unsure, ask: "Would a competitor be comfortable with this?"
5. Commit to public repo

### **When Adding Private Integration Logic:**

1. Write in `teneo-production` (private repo)
2. Document in `claude-files/PRIVATE_INTEGRATION_NOTES.md`
3. Update protected IP list if needed
4. **NEVER** commit `claude-files/` to public repo

### **When Updating Architecture:**

1. Update master doc: `docs/core/PUBLIC_PRIVATE_SEPARATION_ARCHITECTURE.md`
2. Update quick ref: `INTEGRATION_STRATEGY_SUMMARY.md`
3. Update private notes if secrets/IP affected
4. Update this map if new docs created

---

## ✅ **Verification Checklist**

Before committing to public repo:

- [ ] No mentions of "Teneo" in code files
- [ ] No proprietary AI prompts
- [ ] No references to 8-step pattern, DNA extraction, etc.
- [ ] No API keys or secrets
- [ ] `claude-files/` is in `.gitignore`
- [ ] Content follows `PUBLIC_CONTENT_GUIDELINES.md`
- [ ] Referenced the protected IP list

---

## 🆘 **Quick Help**

**Q: Where do I document API keys?**
→ `claude-files/PRIVATE_INTEGRATION_NOTES.md` (never public)

**Q: Where's the list of protected IP?**
→ `claude-files/PRIVATE_INTEGRATION_NOTES.md` section "What's Protected"

**Q: Can I mention Teneo in course content?**
→ No. See `course-module/PUBLIC_CONTENT_GUIDELINES.md`

**Q: What's safe to open source?**
→ See `docs/core/PUBLIC_PRIVATE_SEPARATION_ARCHITECTURE.md` section "What Stays in TENEO-MARKETPLACE"

**Q: How do I integrate with teneo-production?**
→ See `claude-files/PRIVATE_INTEGRATION_NOTES.md` (private)

**Q: Where's the API documentation?**
→ `docs/reference/API_SPECIFICATION.md`

---

## 🚀 **Getting Started (For New Contributors)**

1. **Read**: `INTEGRATION_STRATEGY_SUMMARY.md` (5 min overview)
2. **Read**: `docs/core/PUBLIC_PRIVATE_SEPARATION_ARCHITECTURE.md` (complete picture)
3. **Skim**: `docs/reference/API_SPECIFICATION.md` (API structure)
4. **Review**: `course-module/PUBLIC_CONTENT_GUIDELINES.md` (if touching courses)
5. **Start Contributing**: You now understand the boundaries!

---

## 📞 **Still Confused?**

**Open an issue**: https://github.com/Traviseric/teneo-marketplace/issues

Reference this doc and ask specific questions about:
- What can/can't be committed
- Where to document something
- Which doc to read for X

---

**Last Updated**: 2025-11-22
**Maintained By**: Project maintainers
**Feedback**: Open an issue or PR
