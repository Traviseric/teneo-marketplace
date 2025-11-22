# Public Content Guidelines

**For maintaining generic, open-source-friendly course content**

---

## 🎯 Core Principle

> **Public repo content must be GENERIC and EDUCATIONAL, never proprietary**

---

## ✅ DO Use (Generic Terms)

| Category | Good Examples |
|----------|--------------|
| **Publishing** | • Modern publishing<br>• AI-assisted publishing<br>• Digital publishing<br>• Self-publishing |
| **Tools** | • AI tools<br>• Modern authoring tools<br>• Publishing platforms<br>• Content generation systems |
| **Authors** | • Modern authors<br>• Digital authors<br>• Independent authors<br>• Self-publishers |
| **Speed** | • Days to weeks<br>• Faster than traditional<br>• Accelerated publishing<br>• Efficient workflows |
| **Branding** | • Book Marketing Academy<br>• Publishing Platform<br>• Course Platform<br>• Generic instructor names |

---

## ❌ DON'T Use (Proprietary Terms)

| Category | Avoid These |
|----------|-------------|
| **Brand Names** | • Teneo<br>• Teneo Engine<br>• Teneo-specific features<br>• Any company trademarks |
| **Proprietary Claims** | • "10x faster with [Brand]"<br>• "Our exclusive system"<br>• "Proprietary method"<br>• Specific tool names |
| **Internal References** | • Private repo names<br>• Internal tools<br>• Proprietary prompts<br>• Competitive advantages |

---

## 📝 Writing Guidelines

### **1. Course Titles**
```
✅ Good: "Book Funnel Blueprint"
✅ Good: "Modern Author Marketing System"
❌ Bad: "Teneo Book Funnel Blueprint"
❌ Bad: "The Teneo Publishing System"
```

### **2. Course Descriptions**
```
✅ Good: "Learn to build profitable funnels for your books"
✅ Good: "Turn your book into a revenue-generating machine"
❌ Bad: "Learn to use Teneo to build funnels"
❌ Bad: "The Teneo advantage for book marketing"
```

### **3. Instructor Names**
```
✅ Good: "Book Marketing Academy"
✅ Good: "Publishing Experts"
✅ Good: "Digital Marketing Institute"
❌ Bad: "Teneo Academy"
❌ Bad: "Teneo Marketing Team"
```

### **4. Lesson Content**
```
✅ Good: "Modern authors can publish multiple books per year"
✅ Good: "AI tools accelerate the publishing process"
❌ Bad: "With Teneo, you can publish 10x faster"
❌ Bad: "Teneo's 7-phase system generates..."
```

### **5. Tags and Metadata**
```
✅ Good: ["Marketing", "Publishing", "Self-Publishing", "Book Funnels"]
❌ Bad: ["Marketing", "Teneo", "Teneo Engine", "Book Funnels"]
```

---

## 🔍 Self-Check Questions

Before committing course content, ask:

1. **Brand Check**: Does this mention any proprietary brand names?
2. **Tool Check**: Does this reference specific internal tools?
3. **Method Check**: Does this claim exclusive/proprietary methods?
4. **Education Check**: Can anyone learn from this, regardless of tools used?

If you answer YES to questions 1-3, or NO to question 4: **Revise to be generic**.

---

## 📋 Review Checklist

Use this checklist when creating or updating course content:

### **course.json**
- [ ] Title is generic
- [ ] Subtitle doesn't mention proprietary brands
- [ ] Description uses generic language
- [ ] Instructor name is generic
- [ ] Tags don't include brand names
- [ ] Lesson titles are educational, not promotional
- [ ] No proprietary file paths or references

### **Lesson Content (.md files)**
- [ ] No brand name mentions
- [ ] Uses "AI tools" instead of specific tool names
- [ ] Timelines are approximate, not brand-specific
- [ ] Examples are universal, not proprietary
- [ ] Next lesson references match new generic titles

### **Assets**
- [ ] Images don't contain brand logos
- [ ] Videos don't have branded intros/outros
- [ ] Templates are generic and white-labelable
- [ ] Downloads don't reference proprietary systems

---

## 🔄 Migration Pattern

When converting proprietary content to generic:

### **Step 1: Identify**
```bash
# Search for brand mentions
grep -r "Teneo" course-module/
grep -r "proprietary" course-module/
```

### **Step 2: Replace**
| Find | Replace With |
|------|-------------|
| "Teneo" | "AI tools" or "modern publishing" |
| "Teneo Engine" | "content generation system" |
| "Teneo Book" | "your book" |
| "Teneo advantage" | "modern publishing advantage" |
| "With Teneo" | "With modern tools" |
| "3 days with Teneo" | "days to weeks" |

### **Step 3: Test**
- Read content out loud
- Ask: "Would a competitor's user find this useful?"
- If yes → Generic ✅
- If no → Still proprietary, revise ❌

---

## 🎨 White-Label Friendly

Content should be easily customizable by federation partners:

```markdown
✅ Good (Easy to customize):
"Learn to build book funnels that convert"
→ Anyone can teach this

❌ Bad (Hard to customize):
"Learn the Teneo method for book funnels"
→ Locked to our brand
```

---

## 📚 Examples: Before & After

### **Example 1: Course Introduction**

❌ **Before (Proprietary)**:
> "Welcome to the Teneo Book Funnel Course! With Teneo's revolutionary AI engine, you'll create funnels 10x faster than traditional methods. Teneo users publish 15 books per year."

✅ **After (Generic)**:
> "Welcome to the Book Funnel Blueprint! With modern AI tools, you'll create funnels faster than traditional methods. Digital authors can publish multiple books per year using these systems."

---

### **Example 2: Feature Description**

❌ **Before (Proprietary)**:
> "Use Teneo's 7-phase generation pattern to create your book in 3 days. This proprietary system is only available to Teneo users."

✅ **After (Generic)**:
> "Use structured content generation approaches to create your book efficiently. Many modern authors complete books in days to weeks using AI-assisted workflows."

---

### **Example 3: Call to Action**

❌ **Before (Proprietary)**:
> "Click here to open the Teneo Funnel Builder and generate your funnel automatically."

✅ **After (Generic)**:
> "Click here to open the funnel builder and create your funnel using the provided templates."

---

## 🚫 Common Pitfalls

### **1. Subtle Branding**
```
❌ "Our platform"
✅ "This platform" or "The platform"

❌ "Our exclusive method"
✅ "This proven method"
```

### **2. Implied Exclusivity**
```
❌ "Only we offer..."
✅ "This course offers..."

❌ "You can't get this anywhere else"
✅ "Learn these proven strategies"
```

### **3. Internal Jargon**
```
❌ "The Teneo way"
✅ "The recommended approach"

❌ "Teneo-powered"
✅ "AI-assisted"
```

---

## 🔧 Maintenance

### **Monthly Review**
- Search for new brand mentions
- Review recent commits for proprietary language
- Update this guide if new patterns emerge

### **Before Each Release**
```bash
# Run brand check
./scripts/check-brand-mentions.sh

# Review diff
git diff origin/main -- course-module/

# Confirm all content is generic
```

---

## 📞 Questions?

**If unsure whether content is too proprietary:**
1. Ask: "Would I be comfortable if a competitor used this?"
2. If yes → It's generic ✅
3. If no → It's proprietary, revise ❌

**Examples:**
- "Build book funnels" → Comfortable? YES ✅
- "Use Teneo to build funnels" → Comfortable? NO ❌

---

## 🎯 Goal

> Every piece of content in the public repo should be **educational, universal, and white-labelable**.

**Why This Matters:**
- Enables federation partners to customize
- Encourages open source contributions
- Protects proprietary competitive advantages
- Builds community trust

---

**Last Updated**: 2025-11-22
**Applies To**: All course content in `course-module/`
