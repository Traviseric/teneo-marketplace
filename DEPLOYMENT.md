# 🚀 DEPLOYMENT GUIDE - AUTHORITATIVE

**This is the authoritative deployment guide. All AI assistants and developers must follow these protocols.**

---

## 🚨 CRITICAL: Pre-Commit Safety Checklist

**BEFORE ANY `git commit` or `git push`, verify:**

### ✅ Safe to Commit
- [ ] Code files (.js, .html, .css, .json schemas)
- [ ] Documentation (.md files)
- [ ] Config templates (.env.example, config.example.json)
- [ ] Database schemas (empty .sql files)
- [ ] Docker configs (docker-compose.yml, Dockerfile)
- [ ] Sample data (demo/example content only)

### ❌ NEVER COMMIT
- [ ] `.env` files (contains real credentials)
- [ ] `.db` or `.sqlite` files (contains customer data)
- [ ] PDF files in `marketplace/frontend/books/` (copyrighted content)
- [ ] `claude-files/` directory (private business docs)
- [ ] `teneo-express/` directory (private SaaS code)
- [ ] Private keys, certificates, credentials
- [ ] Customer/order data
- [ ] Analytics or revenue data

**If unsure, DO NOT COMMIT. Ask the user first.**

---

## 🔒 .gitignore Verification

**Before committing, ALWAYS verify .gitignore is protecting sensitive files:**

```bash
# Check what will be committed
git status

# Verify sensitive files are ignored
git check-ignore .env
git check-ignore marketplace/backend/database/marketplace.db
git check-ignore marketplace/frontend/books/real-book.pdf
git check-ignore claude-files/

# Should output the file path if ignored correctly
# If no output, FILE IS NOT IGNORED - DO NOT COMMIT
```

**If any sensitive file shows in `git status`, STOP and update .gitignore first.**

---

## 📋 Standard Git Workflow

### Step 1: Check Status
```bash
cd "D:\Travis Eric\TE Code\teneo-marketplace"
git status
```

**Review output carefully:**
- Modified files should be code/docs only
- No .env, .db, or .pdf files should appear
- If sensitive files appear, they're not being ignored - STOP

### Step 2: Add Safe Files Only
```bash
# Add specific files (safer than git add .)
git add README.md
git add marketplace/backend/routes/newFeature.js
git add docs/new-guide.md

# Or add by pattern (verify with git status first)
git add *.md
git add marketplace/backend/routes/*.js

# NEVER use: git add . (too risky)
# NEVER use: git add -A (too risky)
```

### Step 3: Verify What's Staged
```bash
# See exactly what will be committed
git diff --staged --name-only

# Review each file
git diff --staged
```

**If you see any of these, UNSTAGE IMMEDIATELY:**
- .env
- *.db
- *.pdf (in books/)
- claude-files/
- Any credentials/keys

```bash
# Unstage if needed
git restore --staged filename
```

### Step 4: Commit with Descriptive Message
```bash
git commit -m "type: brief description

- Detail 1
- Detail 2
- Detail 3"

# Types: feat, fix, docs, refactor, chore, test
```

### Step 5: Push to Remote
```bash
# Push to main branch
git push origin main

# Or if working on feature branch
git push origin feature-name
```

---

## 🎯 Current Safe Commit (2025-01-14)

**Files ready to commit NOW:**

```bash
# Navigate to repo
cd "D:\Travis Eric\TE Code\teneo-marketplace"

# Add new documentation
git add DUAL_MODE_ARCHITECTURE.md
git add CENSORSHIP_RESISTANT_MVP.md
git add INFORMATION_ASYMMETRY_IMPLEMENTATION.md
git add MVP_48_HOUR_LAUNCH.md
git add DOCUMENTATION_INDEX.md
git add QUICK_START.md
git add PUBLIC_VS_PRIVATE_STRATEGY.md
git add DEPLOYMENT.md
git add README.md
git add CLAUDE.md

# Verify what's staged
git status

# Should show ONLY .md files
# If you see .env, .db, .pdf - STOP and investigate

# Commit
git commit -m "docs: add dual-mode + federation architecture

- Complete dual-mode operation (primary + fallback)
- Federated network protocol and implementation
- Censorship-resistant deployment strategies
- Information Asymmetry brand implementation
- 48-hour MVP launch guide
- Comprehensive documentation index
- Public vs private repository strategy
- Authoritative deployment guide
- Updated CLAUDE.md with safety protocols

Enables community to deploy federated nodes while protecting
sensitive data. All credentials and content remain local."

# Push to GitHub
git push origin main
```

---

## 🌐 Deployment Environments

### Local Development
**Location:** Your local machine
**Purpose:** Development, testing, documentation
**Security:** Full access to everything

**Has access to:**
- ✅ Real .env with credentials
- ✅ Real book PDFs
- ✅ Database with real data
- ✅ Private docs (claude-files/)
- ✅ All code

**Never commit:**
- ❌ .env
- ❌ *.db files
- ❌ Book PDFs
- ❌ Private docs

---

### Staging/Test Environment
**Location:** Test VPS or local Docker
**Purpose:** Pre-production testing
**Security:** Test data only

**Deploy with:**
- Code from GitHub (public repo)
- Test .env (fake credentials)
- Sample books (not real content)
- Test database (no real customers)

**Commands:**
```bash
# Clone public repo
git clone https://github.com/Traviseric/teneo-marketplace.git

# Use test environment
cp .env.test .env
npm run dev
```

---

### Production Environment
**Location:** Live VPS (Njalla, FlokiNET, etc.)
**Purpose:** Public marketplace
**Security:** Maximum security

**Deploy with:**
```bash
# 1. Clone public code
git clone https://github.com/Traviseric/teneo-marketplace.git
cd teneo-marketplace

# 2. Add production .env (SCP from secure location)
scp ~/secure/.env.production vps:/opt/teneo-marketplace/marketplace/backend/.env

# 3. Add real books (SCP separately, NOT from git)
scp -r ~/books/*.pdf vps:/opt/teneo-marketplace/marketplace/frontend/books/

# 4. Deploy
docker-compose up -d

# 5. Verify .env and books are NOT in git
cd /opt/teneo-marketplace
git status  # Should be clean, no .env or .pdf files
```

**CRITICAL:** Production credentials and content are NEVER in git. Always deploy separately via SCP/SFTP.

---

## 🔐 Credential Management

### Development (.env.development)
**Location:** Local machine only
**Contains:** Test Stripe keys, local database
**Never commit:** ❌

```env
STRIPE_SECRET_KEY=sk_test_...
DATABASE_PATH=./dev.db
```

### Production (.env.production)
**Location:** Secure local storage + production VPS
**Contains:** Live Stripe keys, real credentials
**Never commit:** ❌
**Store:** Encrypted backup on local machine

```env
STRIPE_SECRET_KEY=sk_live_...
BTC_ADDRESS=bc1q...real...
DATABASE_PATH=./production.db
```

### Template (.env.example)
**Location:** Git repository (public)
**Contains:** Variable names only, no real values
**Safe to commit:** ✅

```env
STRIPE_SECRET_KEY=sk_test_your_key_here
DATABASE_PATH=./marketplace.db
```

---

## 📚 Content Deployment

### Book PDFs
**NEVER commit to git**

**Deploy method:**
```bash
# Prepare books locally
mkdir ~/secure-books
cp book1.pdf ~/secure-books/
cp book2.pdf ~/secure-books/

# Deploy to production via SCP
scp ~/secure-books/*.pdf vps:/opt/teneo-marketplace/marketplace/frontend/books/information_asymmetry/pdfs/

# Verify not in git
ssh vps
cd /opt/teneo-marketplace
git status  # Should not show .pdf files
```

### Cover Images
**Can commit generic covers**
**Never commit copyrighted images**

```bash
# Generic placeholder: ✅ Safe to commit
git add marketplace/frontend/brands/*/assets/covers/placeholder.jpg

# Real book cover (copyrighted): ❌ Deploy separately
scp cover.jpg vps:/opt/teneo-marketplace/marketplace/frontend/brands/teneo/assets/covers/
```

---

## 🚨 Emergency: Accidentally Committed Sensitive File

### If you committed but NOT pushed:
```bash
# Undo last commit, keep changes
git reset --soft HEAD~1

# Remove sensitive file
git restore --staged sensitive-file.env

# Add to .gitignore
echo "sensitive-file.env" >> .gitignore

# Commit safely
git add .gitignore
git commit -m "chore: add sensitive file to gitignore"
```

### If you already pushed to GitHub:
```bash
# 1. Remove from git history (NUCLEAR OPTION)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch path/to/sensitive.env" \
  --prune-empty --tag-name-filter cat -- --all

# 2. Force push (rewrites history)
git push origin --force --all

# 3. Rotate compromised credentials IMMEDIATELY
# - Change Stripe keys
# - Rotate database passwords
# - Update Bitcoin addresses if exposed
# - Change all API keys

# 4. Add to .gitignore to prevent future commits
echo "path/to/sensitive.env" >> .gitignore
git add .gitignore
git commit -m "chore: add sensitive pattern to gitignore"
git push origin main
```

**CRITICAL:** If credentials were exposed publicly, assume they're compromised. Rotate immediately.

---

## 📊 Pre-Push Checklist

**Before EVERY `git push`, verify:**

- [ ] `git status` shows only code/docs
- [ ] No .env files staged
- [ ] No .db files staged
- [ ] No .pdf files staged (unless sample)
- [ ] No claude-files/ or teneo-express/ staged
- [ ] `git diff --staged` reviewed all changes
- [ ] Commit message is descriptive
- [ ] Branch is correct (main or feature branch)

**If ANY checkbox fails, investigate before pushing.**

---

## 🤖 For AI Assistants (Claude Code)

**MANDATORY PROTOCOLS:**

### Before Any Git Operation:
1. **Read this file:** DEPLOYMENT.md (this file)
2. **Check .gitignore:** Verify sensitive files are ignored
3. **Review git status:** Confirm only safe files will be committed
4. **Ask user if unsure:** Never guess about sensitive data

### Safe Files to Commit:
- ✅ .js, .html, .css, .json (code files)
- ✅ .md files (documentation)
- ✅ .example files (templates with no real data)
- ✅ .sql files (empty schemas)
- ✅ Docker configs
- ✅ Package.json, package-lock.json

### NEVER Commit Without User Confirmation:
- ❌ Any file with "private", "secret", "credential" in name
- ❌ .env files (except .env.example)
- ❌ .db, .sqlite files
- ❌ .pdf, .epub files (unless explicitly sample)
- ❌ Directories: claude-files/, teneo-express/, node_modules/
- ❌ Any file the user says is private

### If User Asks to Commit:
1. Show `git status` output
2. List files that will be committed
3. Flag any potentially sensitive files
4. Ask for explicit confirmation: "I see X files will be committed. File Y looks sensitive. Proceed?"
5. Only commit after clear approval

### Standard Response Template:
```
I'm about to commit these files:
✅ README.md (safe - documentation)
✅ marketplace/backend/routes/newRoute.js (safe - code)
⚠️  .env (WARNING - contains credentials, should not commit)

Files marked ⚠️ appear to be sensitive. Should I:
1. Skip these files and commit only safe files?
2. Cancel the commit?
3. Proceed anyway (not recommended)?
```

---

## 🎯 Quick Reference

### Safe Commands (Use Freely)
```bash
git status
git diff
git log
git branch
git checkout -b feature-name
git pull origin main
```

### Careful Commands (Review First)
```bash
git add <specific-file>  # Review file first
git commit -m "message"  # After reviewing staged files
git push origin <branch> # After verifying what's pushed
```

### Dangerous Commands (Almost Never Use)
```bash
git add .                # Too broad, might include sensitive files
git add -A               # Same as above
git push --force         # Rewrites history, dangerous
git filter-branch        # Only for emergency credential removal
```

---

## 📞 When in Doubt

**STOP. ASK USER.**

Better to ask than to:
- Expose credentials publicly
- Leak customer data
- Violate privacy regulations
- Compromise security

**No commit is urgent enough to skip safety checks.**

---

## ✅ Current Deployment Status

**Public Repo:** https://github.com/Traviseric/teneo-marketplace
**Status:** Ready for new documentation commit
**Next Action:** Commit documentation files (listed above)

**Protected by .gitignore:**
- ✅ .env files
- ✅ Database files
- ✅ PDF books
- ✅ claude-files/
- ✅ teneo-express/

**Safe to commit:**
- ✅ All new documentation (.md files)
- ✅ Updated README.md
- ✅ Updated CLAUDE.md

**Ready to push:** YES ✅

---

**Last Updated:** 2025-01-14
**Maintained By:** Teneo Marketplace Team
**Authoritative:** This guide supersedes all other deployment instructions
