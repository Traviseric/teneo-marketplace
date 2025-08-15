# Contributing to Book Marketplace

First off, thank you for considering contributing to Book Marketplace! 🎉 

It's people like you that make Book Marketplace such a great tool for authors and readers worldwide. This document provides guidelines for contributing to the project - please take a moment to read through it before submitting your first issue or pull request.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Features](#suggesting-features)
  - [Submitting Code](#submitting-code)
  - [Improving Documentation](#improving-documentation)
- [Development Guidelines](#development-guidelines)
  - [Code Style](#code-style)
  - [Commit Messages](#commit-messages)
  - [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Network Showcase](#network-showcase)
- [Community](#community)

## Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

**Examples of positive behavior:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Examples of unacceptable behavior:**
- Trolling, insulting/derogatory comments, and personal attacks
- Public or private harassment
- Publishing others' private information without permission
- Other conduct which could reasonably be considered inappropriate

## How Can I Contribute?

### Reporting Bugs 🐛

Found a bug? Help us fix it! Here's how to report it effectively:

1. **Check existing issues** - Someone might have already reported it
2. **Use the bug report template** when creating an issue
3. **Include details:**
   - Clear, descriptive title
   - Steps to reproduce (1... 2... 3...)
   - Expected behavior
   - Actual behavior
   - Screenshots if applicable
   - Your environment (OS, browser, Node version)

**Example Bug Report:**
```markdown
Title: Payment fails with "Invalid card" for valid test card

Steps to reproduce:
1. Add any book to cart
2. Click checkout
3. Enter test card 4242 4242 4242 4242
4. Submit payment

Expected: Payment succeeds
Actual: Error "Invalid card number"

Environment: Windows 10, Chrome 120, Node 18.x
```

### Suggesting Features 💡

Have an idea to make Book Marketplace better? We'd love to hear it!

1. **Check the roadmap** - It might already be planned
2. **Use the feature request template**
3. **Explain the why:**
   - What problem does it solve?
   - Who would benefit?
   - How would it work?

**Example Feature Request:**
```markdown
Title: Add wishlist functionality for readers

Problem: Readers can't save books for later purchase

Solution: Add a wishlist feature where users can:
- Save books without purchasing
- Get notified of price drops
- Share wishlists with friends

Benefits: Increased engagement and future sales
```

### Submitting Code 🚀

Ready to contribute code? Awesome! Here's our process:

1. **Find an issue** labeled `good first issue` or `help wanted`
2. **Comment** on the issue to claim it
3. **Fork** the repository
4. **Create a branch** from `main`
5. **Make your changes**
6. **Test thoroughly**
7. **Submit a PR**

### Improving Documentation 📚

Documentation improvements are always welcome! This includes:
- Fixing typos
- Adding examples
- Clarifying confusing sections
- Translating to other languages

## Development Guidelines

### Code Style

We keep it simple and consistent:

#### JavaScript
```javascript
// ✅ Good
function calculateDiscount(price, percentage) {
  if (percentage < 0 || percentage > 100) {
    throw new Error('Invalid percentage');
  }
  return price * (1 - percentage / 100);
}

// ❌ Avoid
function calc(p,perc){
  return p*(1-perc/100)
}
```

#### CSS
```css
/* ✅ Good */
.book-card {
  display: flex;
  padding: 1rem;
  border-radius: 8px;
  background: white;
}

/* ❌ Avoid */
.book-card{display:flex;padding:1rem;border-radius:8px;background:white;}
```

#### General Rules
- Use meaningful variable names
- Add comments for complex logic
- Keep functions small and focused
- Use consistent indentation (2 spaces)
- Always use semicolons in JavaScript
- Prefer `const` over `let` when possible

### Commit Messages

Write clear commit messages that explain what and why:

```bash
# ✅ Good
git commit -m "Fix payment validation for international cards"
git commit -m "Add wishlist feature to user dashboard"
git commit -m "Update README with PostgreSQL setup instructions"

# ❌ Avoid
git commit -m "Fixed stuff"
git commit -m "Updates"
git commit -m "asdf"
```

Format:
- Start with a verb (Add, Fix, Update, Remove)
- Keep under 72 characters
- Reference issues: "Fix payment bug (#123)"

### Testing

Before submitting:

1. **Test manually** - Does it work as expected?
2. **Test edge cases** - What could go wrong?
3. **Test responsiveness** - Does it work on mobile?
4. **Run existing tests** - `npm test` (if available)

## Pull Request Process

### Before Submitting

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex parts
- [ ] Documentation updated if needed
- [ ] Changes tested locally
- [ ] Commit messages are clear

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement

## How Has This Been Tested?
Describe testing steps

## Screenshots (if applicable)
Add screenshots here

## Checklist
- [ ] My code follows the project style
- [ ] I've tested my changes
- [ ] I've updated documentation
```

### Review Process

1. **Automated checks** run first
2. **Community review** - Others may comment
3. **Maintainer review** - Final approval
4. **Merge** - Your contribution is live! 🎉

Be patient - reviews can take a few days. We'll provide feedback if changes are needed.

## Network Showcase

Running a Book Marketplace? Add your store to our showcase!

### How to Add Your Store

1. Fork the repository
2. Edit `SHOWCASE.md`
3. Add your store:

```markdown
### [Your Store Name](https://your-store-url.com)
- **Specialty:** Science Fiction & Fantasy
- **Location:** United States
- **Founded:** 2024
- **Books:** 500+
- **Special Features:** Author interviews, Book clubs
```

4. Submit a PR with title: "Add [Store Name] to showcase"

### Requirements

- Live, functioning marketplace
- Using Book Marketplace codebase
- Following content guidelines
- HTTPS enabled

## Community

### Getting Help

- **Discord:** [Join our server](https://discord.gg/bookmarketplace)
- **Discussions:** Use GitHub Discussions for questions
- **Email:** community@bookmarketplace.org

### Ways to Contribute Beyond Code

- **Answer questions** in discussions
- **Share your store** success stories
- **Write tutorials** or blog posts
- **Help with translations**
- **Report security issues** (privately)

### Recognition

We recognize contributors in several ways:
- Listed in CONTRIBUTORS.md
- Special Discord role
- Featured in release notes
- Invitation to maintainer meetings (regular contributors)

## Security Issues

Found a security vulnerability? Please DO NOT open a public issue.

Email security@bookmarketplace.org with:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We'll respond within 48 hours and work with you to resolve it.

## Questions?

Not sure about something? No problem! 

- Check existing issues and discussions
- Ask in Discord
- Open a discussion on GitHub
- Email maintainers

Remember: There are no stupid questions. We were all beginners once!

## Thank You! 🙏

Every contribution matters - whether it's fixing a typo, adding a feature, or helping someone in Discord. You're making the web a more open place for authors and readers.

Welcome to the Book Marketplace community! We're excited to see what you'll contribute.

---

*This contributing guide is a living document. Feel free to suggest improvements!*