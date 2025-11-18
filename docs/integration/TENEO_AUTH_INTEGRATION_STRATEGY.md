# TENEO Auth Integration Strategy

**Session:** November 17, 2025
**Goal:** Integrate teneo-auth SSO platform with teneo-marketplace for unified authentication

---

## 🎯 Executive Summary

**Challenge:** teneo-marketplace needs authentication to be complete. We have teneo-auth (enterprise SSO platform) available.

**Question:** Since marketplace is open source, how do we integrate authentication?

**Answer:** **Two-Tier Strategy**
1. **TENEO Cloud (Hosted)** - Use teneo-auth as default SSO for official deployment
2. **Self-Hosted (Open Source)** - Provide standalone auth module for independent deployments

---

## 🏗️ Architecture Options

### **Option 1: TENEO Auth as Default SSO** ⭐ **RECOMMENDED**

**Strategy:** Make teneo-auth the default authentication provider, but allow self-hosted deployments to use alternatives.

**Benefits:**
- ✅ Official deployment has enterprise-grade auth out of the box
- ✅ OAuth 2.0 + SSO for TENEO ecosystem integration
- ✅ Unified credit system across TENEO services
- ✅ No vendor lock-in (self-hosted can use alternatives)
- ✅ Best of both worlds: powerful default, flexible deployment

**Implementation:**
```javascript
// marketplace/backend/config/auth.config.js

module.exports = {
  // Default: TENEO Auth SSO (for cloud deployments)
  authProvider: process.env.AUTH_PROVIDER || 'teneo-auth',

  providers: {
    'teneo-auth': {
      authUrl: process.env.TENEO_AUTH_URL || 'https://auth.teneo.io',
      clientId: process.env.TENEO_CLIENT_ID,
      clientSecret: process.env.TENEO_CLIENT_SECRET,
      callbackUrl: process.env.TENEO_CALLBACK_URL,
    },

    // Alternative for self-hosted
    'local': {
      // SQLite-based auth (current implementation)
      useMagicLinks: true,
      emailProvider: 'smtp',
    },

    // Future providers (optional)
    'auth0': { /* ... */ },
    'supabase': { /* ... */ },
  }
}
```

**Architecture:**
```
┌─────────────────────────────────────────────────┐
│         TENEO Marketplace (Open Source)         │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │    Auth Abstraction Layer (Public)      │   │
│  │  - login()                              │   │
│  │  - register()                           │   │
│  │  - verifyToken()                        │   │
│  │  - getUser()                            │   │
│  └──────────┬──────────────────────────────┘   │
│             │                                   │
│  ┌──────────┴──────────┬────────────────────┐  │
│  │                     │                    │  │
│  ▼                     ▼                    ▼  │
│ ┌────────┐    ┌────────────┐    ┌─────────┐   │
│ │ TENEO  │    │   Local    │    │  Auth0  │   │
│ │  Auth  │    │   SQLite   │    │ Supabase│   │
│ │  (SSO) │    │  (Magic)   │    │   etc.  │   │
│ └────────┘    └────────────┘    └─────────┘   │
│  (Default)      (Self-Host)      (Optional)    │
└─────────────────────────────────────────────────┘
```

---

### **Option 2: Standalone Auth Module**

**Strategy:** Keep marketplace authentication completely independent, with teneo-auth as optional integration.

**Benefits:**
- ✅ Marketplace works standalone without any external dependencies
- ✅ No configuration required for basic deployment
- ✅ Simpler mental model for new users

**Drawbacks:**
- ❌ No SSO with TENEO ecosystem
- ❌ Duplicate user accounts (marketplace vs TENEO services)
- ❌ No unified credit system
- ❌ More complex setup for official TENEO Cloud deployment

---

### **Option 3: Closed Source Auth, Open Source Marketplace**

**Strategy:** Keep teneo-auth closed source, marketplace open source with auth abstraction.

**Benefits:**
- ✅ Protects TENEO Auth IP
- ✅ Marketplace remains open and forkable
- ✅ Official deployments get full SSO benefits

**Drawbacks:**
- ❌ Self-hosted users need to implement their own auth
- ❌ Creates friction for community adoption
- ❌ Splits ecosystem (TENEO Cloud vs community forks)

---

## ✅ Recommended Approach: **Option 1** (TENEO Auth as Default SSO)

### **Why This Works Best:**

1. **Official TENEO Cloud Deployment:**
   - Uses teneo-auth out of the box
   - OAuth 2.0 SSO with all TENEO services
   - Unified credit system (buy on marketplace, use on BCG/AIBridge/etc.)
   - Enterprise-grade security

2. **Self-Hosted Community Deployments:**
   - Use built-in SQLite + magic links (current implementation)
   - No external dependencies required
   - Works offline, no API keys needed
   - Can optionally integrate with TENEO Auth if desired

3. **Federation Network:**
   - Each node can choose its auth provider
   - TENEO Cloud nodes use teneo-auth (unified accounts)
   - Independent nodes use local auth (autonomous)
   - Cross-node checkout works via temporary tokens

---

## 🔧 Implementation Plan

### **Phase 1: Auth Abstraction Layer** (Week 1)

**Goal:** Create provider-agnostic auth interface

**Files to Create:**
```
marketplace/backend/
├── auth/
│   ├── AuthProvider.js         # Abstract auth interface
│   ├── providers/
│   │   ├── TeneoAuthProvider.js   # OAuth 2.0 integration
│   │   ├── LocalAuthProvider.js   # SQLite + magic links
│   │   └── Auth0Provider.js       # Optional third-party
│   └── config.js               # Provider selection logic
```

**Implementation:**

```javascript
// marketplace/backend/auth/AuthProvider.js

class AuthProvider {
  /**
   * Abstract base class for authentication providers
   * All providers must implement these methods
   */

  async register(email, name) {
    throw new Error('Not implemented');
  }

  async login(email) {
    throw new Error('Not implemented');
  }

  async verifyToken(token) {
    throw new Error('Not implemented');
  }

  async getUser(userId) {
    throw new Error('Not implemented');
  }

  async logout(userId) {
    throw new Error('Not implemented');
  }
}

module.exports = AuthProvider;
```

```javascript
// marketplace/backend/auth/providers/TeneoAuthProvider.js

const AuthProvider = require('../AuthProvider');
const fetch = require('node-fetch');

class TeneoAuthProvider extends AuthProvider {
  constructor(config) {
    super();
    this.authUrl = config.authUrl;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
  }

  async register(email, name) {
    // Redirect to TENEO Auth registration
    const redirectUrl = `${this.authUrl}/register?client_id=${this.clientId}&redirect_uri=${this.callbackUrl}`;
    return { type: 'redirect', url: redirectUrl };
  }

  async login(email) {
    // Redirect to TENEO Auth login (OAuth 2.0)
    const redirectUrl = `${this.authUrl}/api/oauth/authorize?client_id=${this.clientId}&redirect_uri=${this.callbackUrl}&response_type=code`;
    return { type: 'redirect', url: redirectUrl };
  }

  async verifyToken(token) {
    // Verify JWT with TENEO Auth
    const response = await fetch(`${this.authUrl}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });

    if (!response.ok) {
      throw new Error('Invalid token');
    }

    const { user } = await response.json();
    return user;
  }

  async getUser(userId) {
    // Fetch user from TENEO Auth
    const response = await fetch(`${this.authUrl}/api/user`, {
      headers: {
        'Authorization': `Bearer ${this.serviceKey}`,
        'Content-Type': 'application/json'
      }
    });

    return await response.json();
  }
}

module.exports = TeneoAuthProvider;
```

```javascript
// marketplace/backend/auth/providers/LocalAuthProvider.js

const AuthProvider = require('../AuthProvider');
const db = require('../../database/db');
const crypto = require('crypto');
const emailService = require('../../services/emailService');

class LocalAuthProvider extends AuthProvider {
  async register(email, name) {
    // Check if user exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Create user
    const userId = crypto.randomUUID();
    db.prepare('INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)').run(
      userId,
      email,
      name,
      new Date().toISOString()
    );

    // Send magic link
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour

    db.prepare('INSERT INTO magic_links (token, user_id, expires_at, used) VALUES (?, ?, ?, 0)').run(
      token,
      userId,
      expires.toISOString()
    );

    await emailService.sendMagicLink(email, token);

    return { type: 'magic_link', message: 'Check your email for login link' };
  }

  async login(email) {
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate magic link
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour

    db.prepare('INSERT INTO magic_links (token, user_id, expires_at, used) VALUES (?, ?, ?, 0)').run(
      token,
      user.id,
      expires.toISOString()
    );

    await emailService.sendMagicLink(email, token);

    return { type: 'magic_link', message: 'Check your email for login link' };
  }

  async verifyToken(token) {
    const link = db.prepare(`
      SELECT ml.*, u.*
      FROM magic_links ml
      JOIN users u ON ml.user_id = u.id
      WHERE ml.token = ? AND ml.used = 0 AND ml.expires_at > ?
    `).get(token, new Date().toISOString());

    if (!link) {
      throw new Error('Invalid or expired token');
    }

    // Mark as used
    db.prepare('UPDATE magic_links SET used = 1 WHERE token = ?').run(token);

    return {
      id: link.user_id,
      email: link.email,
      name: link.name
    };
  }

  async getUser(userId) {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }
}

module.exports = LocalAuthProvider;
```

```javascript
// marketplace/backend/auth/config.js

const TeneoAuthProvider = require('./providers/TeneoAuthProvider');
const LocalAuthProvider = require('./providers/LocalAuthProvider');

function getAuthProvider() {
  const providerType = process.env.AUTH_PROVIDER || 'local';

  switch (providerType) {
    case 'teneo-auth':
      return new TeneoAuthProvider({
        authUrl: process.env.TENEO_AUTH_URL || 'https://auth.teneo.io',
        clientId: process.env.TENEO_CLIENT_ID,
        clientSecret: process.env.TENEO_CLIENT_SECRET,
        callbackUrl: process.env.TENEO_CALLBACK_URL,
        serviceKey: process.env.TENEO_SERVICE_KEY
      });

    case 'local':
    default:
      return new LocalAuthProvider();
  }
}

module.exports = { getAuthProvider };
```

---

### **Phase 2: Update Marketplace Routes** (Week 1)

**Goal:** Replace hardcoded auth with abstraction layer

**Files to Update:**
- `marketplace/backend/routes/auth.js` - Use AuthProvider instead of direct DB
- `marketplace/backend/server.js` - Initialize auth provider
- `marketplace/backend/middleware/auth.js` - Generic token verification

**Example:**

```javascript
// marketplace/backend/routes/auth.js (refactored)

const express = require('express');
const router = express.Router();
const { getAuthProvider } = require('../auth/config');

const authProvider = getAuthProvider();

// Registration endpoint
router.post('/register', async (req, res) => {
  try {
    const { email, name } = req.body;
    const result = await authProvider.register(email, name);

    if (result.type === 'redirect') {
      res.json({ redirect: result.url });
    } else {
      res.json({ message: result.message });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email } = req.body;
    const result = await authProvider.login(email);

    if (result.type === 'redirect') {
      res.json({ redirect: result.url });
    } else {
      res.json({ message: result.message });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// OAuth callback (for TENEO Auth)
router.get('/callback', async (req, res) => {
  try {
    const { code } = req.query;

    if (authProvider.handleOAuthCallback) {
      const user = await authProvider.handleOAuthCallback(code);

      // Create session
      req.session.userId = user.id;
      res.redirect('/dashboard');
    } else {
      res.status(400).json({ error: 'OAuth not supported by current auth provider' });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Token verification
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;
    const user = await authProvider.verifyToken(token);
    res.json({ user });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
```

---

### **Phase 3: Frontend Integration** (Week 2)

**Goal:** Update frontend to handle both auth flows

**Files to Update:**
- `marketplace/frontend/js/auth.js` - Detect auth type, handle redirects
- `marketplace/frontend/login.html` - Show appropriate UI based on auth type

**Example:**

```javascript
// marketplace/frontend/js/auth.js

class AuthClient {
  constructor() {
    this.authType = null;
    this.init();
  }

  async init() {
    // Detect auth type from backend
    const response = await fetch('/api/auth/config');
    const config = await response.json();
    this.authType = config.type; // 'teneo-auth' or 'local'
  }

  async login(email) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const result = await response.json();

    if (result.redirect) {
      // OAuth flow - redirect to TENEO Auth
      window.location.href = result.redirect;
    } else {
      // Magic link flow - show confirmation
      this.showMagicLinkSent(email);
    }
  }

  async verifySession() {
    const token = localStorage.getItem('auth_token');
    if (!token) return null;

    const response = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });

    if (response.ok) {
      const { user } = await response.json();
      return user;
    }

    return null;
  }

  showMagicLinkSent(email) {
    // Show UI confirmation
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('magic-link-sent').style.display = 'block';
    document.getElementById('email-sent-to').textContent = email;
  }
}

// Initialize
const auth = new AuthClient();
```

---

### **Phase 4: Environment Configuration** (Week 2)

**Goal:** Document deployment options

**Files to Create:**
- `.env.example` - Template with all auth options
- `AUTH_SETUP.md` - Deployment guide

**Example `.env.example`:**

```bash
# ========================================
# AUTHENTICATION CONFIGURATION
# ========================================

# Auth Provider: 'local' (default) or 'teneo-auth'
AUTH_PROVIDER=local

# ----------------------------------------
# Option 1: Local Auth (SQLite + Magic Links)
# ----------------------------------------
# No additional configuration required
# Uses SQLite database for user storage
# Sends magic links via configured email service

# ----------------------------------------
# Option 2: TENEO Auth SSO (OAuth 2.0)
# ----------------------------------------
# Recommended for TENEO Cloud deployments
# Provides unified authentication across TENEO ecosystem

# TENEO_AUTH_URL=https://auth.teneo.io
# TENEO_CLIENT_ID=your-marketplace-client-id
# TENEO_CLIENT_SECRET=your-client-secret
# TENEO_CALLBACK_URL=https://your-marketplace.com/api/auth/callback
# TENEO_SERVICE_KEY=your-service-api-key

# To use TENEO Auth:
# 1. Register your marketplace at https://auth.teneo.io/oauth/register
# 2. Copy the client credentials above
# 3. Set AUTH_PROVIDER=teneo-auth
# 4. Restart server
```

---

## 📊 Comparison: TENEO Cloud vs Self-Hosted

| Feature | TENEO Cloud (Official) | Self-Hosted (Community) |
|---------|------------------------|-------------------------|
| **Auth Provider** | TENEO Auth SSO | Local SQLite + Magic Links |
| **User Accounts** | Unified across TENEO services | Marketplace-only accounts |
| **Login Method** | OAuth 2.0 (one-click) | Magic link emails |
| **Credit System** | Unified (buy anywhere, use everywhere) | Marketplace-only credits |
| **SSO Integration** | ✅ All TENEO services | ❌ Standalone |
| **Setup Complexity** | Medium (OAuth credentials required) | Low (works out of box) |
| **External Dependencies** | TENEO Auth API | None (fully offline) |
| **Best For** | Official deployment, TENEO ecosystem | Independent deployments, forks |

---

## 🚀 Migration Path for Existing Users

**If marketplace already has users in SQLite:**

1. **Keep local auth as fallback**
2. **Add TENEO Auth as optional**
3. **Provide migration tool:**

```javascript
// marketplace/backend/scripts/migrate-to-teneo-auth.js

async function migrateUsersToTeneoAuth() {
  const localUsers = db.prepare('SELECT * FROM users').all();

  for (const user of localUsers) {
    try {
      // Register user in TENEO Auth
      const response = await fetch('https://auth.teneo.io/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-service-key': process.env.TENEO_SERVICE_KEY
        },
        body: JSON.stringify({
          email: user.email,
          name: user.name,
          credits: user.credits,
          metadata: {
            migratedFrom: 'marketplace',
            originalId: user.id,
            createdAt: user.created_at
          }
        })
      });

      const { user: teneoUser } = await response.json();

      // Update local record
      db.prepare('UPDATE users SET teneo_user_id = ? WHERE id = ?').run(
        teneoUser.id,
        user.id
      );

      console.log(`✅ Migrated ${user.email}`);
    } catch (error) {
      console.error(`❌ Failed to migrate ${user.email}:`, error.message);
    }
  }

  console.log('Migration complete');
}
```

---

## 🎯 Launch Strategy

### **Week 1-2: Implementation**
- Build auth abstraction layer
- Update marketplace routes
- Test both providers

### **Week 3: Documentation**
- Write deployment guides
- Create video tutorials
- Update README with auth options

### **Week 4: Launch**
- Deploy TENEO Cloud with teneo-auth
- Release open source with local auth default
- Publish migration guide

---

## 📖 Documentation to Create

1. **`AUTH_SETUP.md`** - Complete setup guide for both options
2. **`TENEO_CLOUD_VS_SELF_HOSTED.md`** - Comparison and decision guide
3. **`OAUTH_INTEGRATION_GUIDE.md`** - Step-by-step OAuth setup
4. **`.env.example`** - Updated with all auth options

---

## 🎬 Next Steps

**To get started, you should:**

1. **Decide on strategy:** Confirm Option 1 (TENEO Auth as default SSO) is correct approach
2. **Build abstraction layer:** Create `AuthProvider` interface
3. **Test with local auth:** Verify existing magic link flow works through abstraction
4. **Add TENEO Auth provider:** Implement OAuth 2.0 integration
5. **Update documentation:** Create deployment guides

**Immediate next action:**
- Create `marketplace/backend/auth/` directory structure
- Implement `AuthProvider.js` base class
- Build `LocalAuthProvider.js` (port existing magic link code)
- Build `TeneoAuthProvider.js` (OAuth 2.0 integration)

---

## 💡 Summary

**Best approach:** Use **TENEO Auth as the default SSO provider**, but keep the abstraction layer flexible.

**Why this works:**
- ✅ Official TENEO Cloud deployment gets enterprise auth
- ✅ Self-hosted users get simple magic link auth out of the box
- ✅ Open source remains fully functional without dependencies
- ✅ Federation network nodes can choose their auth strategy
- ✅ Future-proof (can add Auth0, Supabase, etc.)

**Key principle:**
> "Make the right thing easy, but don't force it."

TENEO Cloud users get seamless SSO. Community users get zero-config local auth. Everyone wins.

---

**Ready to implement?** Let me know and I'll start building the auth abstraction layer.
