# Contributing to OpenBazaar AI

First off, thank you for considering contributing to OpenBazaar AI! It's people like you that make the uncensorable book network a reality.

## Code of Conduct

By participating in this project, you agree to abide by our principles:
- **Freedom of Speech**: We support open expression
- **Decentralization**: No single point of control
- **Creator First**: Authors and readers come first
- **Open Source**: Knowledge should be free

## How Can I Contribute?

### 🐛 Reporting Bugs

Before creating bug reports, please check existing issues. When creating a bug report, include:

- Clear and descriptive title
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots (if applicable)
- Your environment (OS, Node version, browser)

### 💡 Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. Include:

- Clear and descriptive title
- Step-by-step description of the enhancement
- Explain why this enhancement would be useful
- List some examples of how it would be used

### 🔧 Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code, add tests (when we have them!)
3. Ensure your code follows the existing style
4. Write a clear commit message
5. Open a PR with a clear title and description

## Development Setup

```bash
# Clone your fork
git clone https://github.com/your-username/openbazaar-ai
cd openbazaar-ai

# Add upstream remote
git remote add upstream https://github.com/Traviseric/openbazaar-ai

# Install dependencies
npm install

# Create a branch
git checkout -b feature/my-feature

# Start development
npm start
```

## Project Structure

```
openbazaar-ai/
├── marketplace/
│   ├── frontend/          # Client-side code
│   │   ├── brands/       # Brand configurations
│   │   ├── js/          # JavaScript modules
│   │   └── *.html       # HTML pages
│   └── backend/          # Server-side code
│       ├── routes/      # API endpoints
│       ├── services/    # Business logic
│       └── database/    # Database layer
└── docs/                # Documentation
```

## Coding Conventions

### JavaScript
- Use ES6+ features
- Async/await over callbacks
- Meaningful variable names
- Comment complex logic

### CSS
- Use CSS custom properties for theming
- Mobile-first responsive design
- BEM naming convention for classes

### Git Commits
- Use present tense ("Add feature" not "Added feature")
- Keep commits focused and atomic
- Reference issues and pull requests

Example:
```
Add network discovery feature

- Implement cross-store search API
- Add network client for federation
- Update UI to show network results

Fixes #123
```

## Areas We Need Help

### 🎨 Frontend
- Mobile responsive improvements
- Accessibility (ARIA labels, keyboard nav)
- New themes and brand templates
- Performance optimizations

### 🔧 Backend
- Additional payment gateways (PayPal, crypto)
- Database migrations for PostgreSQL
- API rate limiting
- Enhanced security features

### 🌐 Federation
- Protocol improvements
- Discovery optimization
- Trust and verification system
- Cross-store recommendations

### 📚 Documentation
- Translations to other languages
- Video tutorials
- API documentation
- More examples

### 🧪 Testing
- Unit tests for backend
- Integration tests
- E2E tests with Playwright
- Performance benchmarks

## Review Process

1. **Automated checks** run on all PRs
2. **Code review** by maintainers
3. **Testing** in development environment
4. **Documentation** updates if needed
5. **Merge** when approved

## Release Process

We use semantic versioning (MAJOR.MINOR.PATCH):

- **PATCH**: Bug fixes, minor updates
- **MINOR**: New features, backwards compatible
- **MAJOR**: Breaking changes

## Community

- **Discord**: [Join our server](https://discord.gg/teneebooks)
- **Twitter**: [@TeneoNetwork](https://twitter.com/teneonetwork)
- **Forum**: Coming soon!

## Recognition

Contributors are recognized in:
- README.md contributors section
- Release notes
- Annual contributor spotlight

## Questions?

Feel free to:
- Open an issue for questions
- Ask in Discord
- Email: contribute@teneo.ai

Thank you for helping build the future of uncensorable publishing! 🚀