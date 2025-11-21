# 🚀 Funnel Builder - Quick Start Guide

**Get your funnel builder running in 2 minutes**

---

## ⚡ Quick Test (30 seconds)

```bash
# 1. Start server (from marketplace/backend directory)
cd marketplace/backend
npm start

# 2. Open in browser
http://localhost:3001/funnel-builder

# 3. Test it
- Click "Browse Templates"
- Click "Gated Sneak-Peak Funnel"
- Type in "BOOK_TITLE" field
- Watch live preview update
```

**That's it! If you see the funnel builder UI, you're good to go.**

---

## 🎯 What Works Right Now (Day 1 Morning)

✅ **Core UI:**
- Template selection (4 templates)
- Variable input forms (auto-generated)
- Live preview (updates in real-time)
- Preview modes (desktop/tablet/mobile)
- Progress tracking
- Auto-save (localStorage)

✅ **Templates:**
- Gated Sneak-Peak Funnel (book-sales-page.html) - ACTIVE
- Story-Driven, Reader Magnet, Direct-Sale (placeholder)

---

## 📝 How to Use

### Step 1: Choose Template

**Option A: Take Quiz (Coming Day 2)**
```
Click [Take Quiz]
→ Answer 5 questions
→ Get recommendation
→ Template auto-selected
```

**Option B: Browse Templates**
```
Click [Browse Templates]
→ See 4 funnel types
→ Click one to select
```

### Step 2: Fill Variables

**Manual Mode:**
```
1. Type in each field
2. Preview updates automatically
3. Progress bar shows completion
```

**AI Prompt Mode: (Coming Day 1 Afternoon)**
```
1. Click [💡 AI Prompt] on any field
2. Copy the prompt
3. Paste into ChatGPT/Claude
4. Copy AI's response
5. Paste into field
```

**Auto-Generate Mode: (Coming Day 2)**
```
1. Click [✨ Auto-Generate]
2. AI fills field automatically
3. Review and edit
```

### Step 3: Export

**Download HTML: (Coming Day 1 Evening)**
```
Click [Export] → [Download HTML]
→ Get single HTML file
→ Upload to your website
```

**Download ZIP:**
```
Click [Export] → [Download ZIP]
→ Get full package (HTML + CSS + images)
```

**Deploy to Teneo: (Coming Day 3)**
```
Click [Export] → [Deploy to Teneo]
→ Funnel goes live instantly
→ Get shareable URL
```

---

## 🔌 Integration with Course

### From Course Platform:

```
1. User enrolls in "Book Funnel Blueprint" course
2. Lesson has action button: [Open Funnel Builder]
3. Click button → funnel builder opens with context
4. Focus on relevant variable for that lesson
5. Work in funnel builder
6. Click [Back to Course] when done
7. Progress saved automatically
```

### URL Parameters:

```
/funnel-builder?course=book-funnel-blueprint&lesson=4&step=headline
```

- `course`: Course ID
- `lesson`: Lesson number
- `step`: Variable to focus on
- `returnUrl`: Where to return

---

## 🎨 Example: Build a Funnel

### Quick Example (5 minutes with AI)

```
1. Open /funnel-builder
2. Click "Browse Templates"
3. Select "Gated Sneak-Peak Funnel"
4. Fill in key fields:
   - BOOK_TITLE: "IRS Secrets Exposed"
   - AUTHOR_NAME: "John Smith"
   - PRICE: "19.99"
   - ORIGINAL_PRICE: "29.99"
5. Click [💡 AI Prompt] for benefits
6. Copy prompt → ChatGPT → paste result
7. Repeat for testimonials, FAQ, guarantee
8. Preview looks good
9. Click [Download HTML]
10. Done!
```

### Full Example (60 minutes manually)

```
1. Take quiz (get recommendation)
2. Fill ALL variables (30+ fields)
3. Write custom copy for each
4. Add real testimonials
5. Create FAQ section
6. Write guarantee
7. Add author bio
8. Set pricing
9. Preview on mobile/tablet/desktop
10. Deploy to Teneo
11. Share URL
```

---

## 🐛 Troubleshooting

### Issue: "Funnel builder not loading"

**Solution:**
```bash
# Check if server is running
curl http://localhost:3001/funnel-builder

# If not running:
cd marketplace/backend
npm start
```

### Issue: "Preview not updating"

**Solution:**
```
1. Check browser console for errors
2. Refresh page
3. Try typing in a different field
4. Clear browser cache
```

### Issue: "Can't see my saved draft"

**Solution:**
```
1. Check localStorage:
   - Open browser DevTools
   - Go to Application → Local Storage
   - Look for "funnel-draft"
2. If empty, draft wasn't saved
3. Fill fields and wait 30 seconds (auto-save)
```

### Issue: "Export buttons not working"

**Solution:**
```
Day 1 Morning: Export not implemented yet
Coming Day 1 Evening: Will work then

For now: Use live preview and screenshot
```

---

## 📊 Current Status

**Implemented:** Day 1 Morning (25%)
**Testing:** In progress
**Next:** Day 1 Afternoon (AI prompts)

---

## 🔄 What's Coming

### Day 1 Afternoon (Next)
- AI prompt library (30+ prompts)
- Prompt helper modal
- Copy to clipboard
- Auto-generate button (stub)

### Day 1 Evening
- Download HTML export
- Download ZIP export
- Deploy to Teneo API
- Backend draft save

### Day 2
- Funnel wizard (quiz)
- Claude API integration
- 30+ AI prompts
- Auto-generate functionality

### Day 3
- 3 more templates
- Complete backend
- Database persistence
- Analytics

---

## 💡 Tips

**For Best Results:**

1. **Start simple** - Use AI prompts to fill variables quickly
2. **Preview often** - Switch between desktop/tablet/mobile
3. **Save frequently** - Auto-saves every 30 seconds
4. **Test on real device** - Open fullscreen preview on phone
5. **Export early** - Download HTML to test outside builder

**Common Mistakes to Avoid:**

- ❌ Not filling required fields (BOOK_TITLE, AUTHOR_NAME, PRICE)
- ❌ Forgetting to save before closing
- ❌ Using generic copy (be specific!)
- ❌ Not testing mobile preview
- ❌ Skipping the guarantee section

---

## 📞 Need Help?

**Documentation:**
- README.md - Full documentation
- FUNNEL_BUILDER_INTEGRATION_PLAN.md - Complete build plan
- FUNNEL_INFRASTRUCTURE_AUDIT.md - What we have vs what we're building

**Logs:**
```bash
# Server logs
npm start

# Browser console
Right-click → Inspect → Console
```

**Common Questions:**

Q: Can I use this without the course?
A: Yes! Go directly to /funnel-builder

Q: Can I save multiple funnels?
A: Coming Day 3 (database backend)

Q: Can I edit HTML directly?
A: Coming Day 3 (advanced mode)

Q: Works on mobile?
A: Yes! Fully responsive

---

## ✅ Verification Checklist

After starting funnel builder, verify:

- [ ] /funnel-builder loads
- [ ] Welcome screen appears
- [ ] Template grid shows 4 templates
- [ ] Can select a template
- [ ] Builder interface loads
- [ ] Variable inputs appear
- [ ] Can type in fields
- [ ] Preview updates live
- [ ] Can switch preview modes
- [ ] Progress bar updates
- [ ] Auto-save works (check localStorage)

**If all checked, you're ready to build funnels!** 🎉

---

**Questions? Check the README.md or integration plan docs.**

**Ready to build? Open http://localhost:3001/funnel-builder and start!**
