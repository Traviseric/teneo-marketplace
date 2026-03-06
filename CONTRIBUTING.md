# Contributing to OpenBazaar AI

**Thank you for considering contributing to OpenBazaar AI!** 🎉

We're building the first censorship-resistant, federated marketplace for creators. Your contributions help protect freedom of speech and creator sovereignty.

---

## 🚀 Quick Start

### **1. Fork & Clone**

```bash
# Fork the repo on GitHub, then:
git clone https://github.com/YOUR_USERNAME/openbazaar-ai.git
cd openbazaar-ai
```

### **2. Install Dependencies**

```bash
# Install backend dependencies
cd marketplace/backend
npm install

# Return to root
cd ../..
```

### **3. Set Up Environment**

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your settings
# Minimum required:
# - SESSION_SECRET (generate with: openssl rand -hex 32)
# - Database path
```

### **4. Initialize Database**

```bash
# Create and seed database
node marketplace/backend/database/init.js

# (Optional) Create sample data
node marketplace/backend/scripts/create-real-data.js
```

### **5. Start Development Server**

```bash
# From project root
npm run dev

# Server runs on http://localhost:3001
```

### **6. Make Your Changes**

```bash
# Create a feature branch
git checkout -b feature/your-feature-name

# Make your changes
# Test locally

# Commit with clear message
git commit -m "Add: your feature description"

# Push to your fork
git push origin feature/your-feature-name
```

### **7. Submit Pull Request**

- Open PR on GitHub
- Describe what you changed and why
- Reference any related issues

---

## 📋 What Can I Contribute?

### **🎨 UI/UX Improvements**
- Better responsive design
- Accessibility improvements (ARIA labels, keyboard nav)
- Dark mode enhancements
- Mobile optimizations

### **🐛 Bug Fixes**
- Fix reported issues
- Improve error handling
- Add validation

### **📚 Documentation**
- Improve setup guides
- Add code comments
- Translate to other languages
- Create video tutorials

### **💻 Features**
- New payment providers (Coinbase, PayPal)
- Additional crypto support (Ethereum, Litecoin)
- Course player improvements
- Email template designs

### **🧪 Testing**
- Write unit tests
- Add integration tests
- Test on different platforms
- Security testing

### **🌐 Internationalization**
- Translate UI to other languages
- Add currency support
- Timezone handling

---

## ⚠️ What NOT to Contribute

**Please read**: [`docs/core/PUBLIC_REPO_GUIDELINES.md`](./docs/core/PUBLIC_REPO_GUIDELINES.md)

### **❌ Don't Add:**
- Proprietary content generation code
- Private API integrations (put in private repo)
- Secrets or API keys
- Large binary files (videos, large PDFs)
- Copyrighted content

### **✅ Do Add:**
- Generic UI/UX improvements
- Public API integrations
- Documentation
- Bug fixes
- Tests

**Rule of Thumb**: If it's about **displaying** content → contribute here. If it's about **generating** content → that's for private repos.

---

## 🎯 Contribution Guidelines

### **Code Style**

**We keep it simple**:
- Use existing code style (see nearby files)
- Add comments for complex logic
- Use meaningful variable names
- Keep functions small and focused

**JavaScript**:
```javascript
// Good
async function getUserOrders(userId) {
  // Fetch orders for specific user
  const orders = await db.all(
    'SELECT * FROM orders WHERE user_id = ?',
    [userId]
  );
  return orders;
}

// Less good
async function f(u) {
  let o = await db.all('SELECT * FROM orders WHERE user_id = ?', [u]);
  return o;
}
```

**HTML/CSS**:
- Use semantic HTML (`<article>`, `<nav>`, `<section>`)
- Prefer CSS classes over inline styles
- Mobile-first responsive design
- Test on Chrome, Firefox, Safari

### **Commit Messages**

**Format**: `Type: Brief description`

**Types**:
- `Add:` New feature
- `Fix:` Bug fix
- `Update:` Improve existing feature
- `Remove:` Delete code/feature
- `Docs:` Documentation only
- `Refactor:` Code cleanup (no behavior change)
- `Test:` Add or update tests

**Examples**:
```
✅ Add: Ethereum payment support
✅ Fix: Cart total calculation on discount
✅ Update: Improve mobile navigation
✅ Docs: Add Stripe setup guide
❌ Updated stuff
❌ WIP
❌ fixes
```

### **Pull Requests**

**Title**: Same format as commit messages

**Description** should include:
- **What**: What does this PR do?
- **Why**: Why is this needed?
- **How**: How does it work? (if complex)
- **Testing**: How did you test it?

**Example**:
```markdown
## Add: Ethereum payment support

### What
Adds Ethereum as a payment option alongside Bitcoin.

### Why
Many users requested ETH support (#45, #67, #89)

### How
- Added ethers.js dependency
- Created EthereumProvider in payment/providers/
- Updated checkout flow to detect ETH addresses
- Added webhook handler for ETH confirmations

### Testing
- Tested on Sepolia testnet
- Verified address validation
- Confirmed webhook triggers correctly
- Manual testing: bought test product with testnet ETH

### Screenshots
[screenshot of checkout with ETH option]
```

---

## 🔍 Before Submitting

**Checklist**:
- [ ] Code follows existing style
- [ ] Tested locally (works in browser)
- [ ] No console.log() left in code
- [ ] No secrets/API keys in code
- [ ] Comments added for complex logic
- [ ] Checked `docs/core/PUBLIC_REPO_GUIDELINES.md` for what to commit
- [ ] One feature per PR (not mixing multiple changes)

---

## 🧪 Testing

**Currently**: Manual testing (we don't have automated tests yet)

**How to Test**:
1. Start dev server: `npm run dev`
2. Open browser: `http://localhost:3001`
3. Test your feature:
   - Create test account
   - Try all user flows
   - Test edge cases (empty cart, invalid input, etc.)
   - Test on mobile (Chrome DevTools responsive mode)
4. Check browser console for errors

**Future**: We plan to add Jest + Playwright. If you want to add tests, that's very welcome!

---

## 📁 Project Structure

**Key Directories**:

```
openbazaar-ai/
├── marketplace/
│   ├── backend/
│   │   ├── routes/          # API endpoints
│   │   ├── database/        # SQLite schema & migrations
│   │   ├── services/        # Business logic
│   │   ├── auth/            # Authentication
│   │   └── middleware/      # Express middleware
│   └── frontend/
│       ├── brands/          # Multi-brand configs
│       ├── js/              # Client-side JavaScript
│       ├── css/             # Stylesheets
│       └── *.html           # Pages
├── course-module/           # Course platform
├── funnel-module/           # Funnel builder
├── docs/                    # Documentation
│   ├── core/               # Core guides
│   ├── features/           # Feature-specific docs
│   └── reference/          # API & technical reference
└── claude-files/            # Private (gitignored)
```

**Where to Put Things**:
- **New API endpoint**: `marketplace/backend/routes/`
- **New page**: `marketplace/frontend/`
- **New CSS**: `marketplace/frontend/css/`
- **Documentation**: `docs/`
- **Setup scripts**: `scripts/`

---

## 🐛 Reporting Issues

**Before opening an issue**:
1. Check if it's already reported
2. Make sure you're on the latest version
3. Try to reproduce in a clean install

**Issue Template**:

```markdown
**Describe the bug**
Clear description of what's wrong

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What should happen?

**Screenshots**
If applicable, add screenshots

**Environment**
- OS: [e.g. Ubuntu 22.04, macOS 13, Windows 11]
- Node.js version: [e.g. 18.17.0]
- Browser: [e.g. Chrome 120, Firefox 121]

**Additional context**
Any other relevant info
```

---

## 💬 Getting Help

**Stuck?**

1. **Check documentation**: [`DOCUMENTATION_MAP.md`](./DOCUMENTATION_MAP.md)
2. **Read setup guide**: [`README.md`](./README.md)
3. **Search issues**: Maybe someone had the same problem
4. **Open a discussion**: Use GitHub Discussions for questions
5. **Open an issue**: For bugs or feature requests

**Questions?**
- GitHub Discussions (coming soon)
- Discord (coming soon)
- GitHub Issues (for now)

---

## 🎖️ Recognition

**Contributors will be**:
- Listed in README.md
- Mentioned in release notes
- Part of building a censorship-resistant platform

**Top contributors** may be invited to:
- Help moderate the project
- Join the core team
- Get early access to new features

---

## 📜 Code of Conduct

**Be respectful**:
- Be kind and welcoming
- Respect different viewpoints
- Accept constructive criticism
- Focus on what's best for the community

**Not tolerated**:
- Harassment or discriminatory language
- Trolling or insulting comments
- Publishing others' private information
- Any conduct that would be inappropriate in a professional setting

**Enforcement**: Violations may result in temporary or permanent ban.

---

## 🌐 Federation Contributions

**Building a node?**

If you're deploying your own marketplace node:
1. Great! That's the whole point
2. Share your experience (blog post, video, etc.)
3. Submit improvements back to the main repo
4. Register your node in the network

**See**: `docs/features/FEDERATION_GUIDE.md` (coming soon)

---

## 🔐 Security Issues

**Found a security vulnerability?**

**DO NOT** open a public issue.

**Instead**:
1. Email: security@teneoai.com (coming soon)
2. Or: Open a draft security advisory on GitHub
3. Include: Description, steps to reproduce, potential impact

We'll respond within 48 hours and work with you to fix it.

---

## 📦 Release Process

**For maintainers**:

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create release branch: `release/v1.2.0`
4. Test thoroughly
5. Merge to `main`
6. Tag release: `git tag v1.2.0`
7. Push: `git push --tags`
8. Create GitHub release with notes

---

## 🎓 Learning Resources

**New to the project?**

- **Start here**: [`README.md`](./README.md)
- **Architecture**: [`docs/core/PUBLIC_REPO_GUIDELINES.md`](./docs/core/PUBLIC_REPO_GUIDELINES.md)
- **API Docs**: [`docs/reference/API_SPECIFICATION.md`](./docs/reference/API_SPECIFICATION.md)
- **All docs**: [`DOCUMENTATION_MAP.md`](./DOCUMENTATION_MAP.md)

**New to web development?**
- [MDN Web Docs](https://developer.mozilla.org/)
- [Node.js Guides](https://nodejs.org/en/docs/guides/)
- [SQLite Tutorial](https://www.sqlitetutorial.net/)

**New to open source?**
- [First Timers Only](https://www.firsttimersonly.com/)
- [How to Contribute to Open Source](https://opensource.guide/how-to-contribute/)

---

## 🚀 Your First Contribution

**Good first issues**:
- Documentation improvements
- Fixing typos
- Adding comments to code
- Improving error messages
- Mobile responsiveness fixes
- Accessibility improvements

**Look for**: `good-first-issue` label on GitHub

---

## 🙏 Thank You!

Every contribution matters:
- Bug reports help improve stability
- Documentation helps new users
- Code contributions add features
- Testing finds edge cases
- Feedback guides the roadmap

**You're helping build a platform that protects creator freedom.** 🎉

---

## 📞 Questions?

**Still not sure?**

Open an issue with the `question` label, and we'll help you get started!

---

**Happy contributing!** 🚀

---

**Last Updated**: 2025-11-22
**Maintained by**: OpenBazaar AI Community
