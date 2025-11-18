# Authentication Setup Guide

**Updated:** November 17, 2025

The TENEO Marketplace supports two authentication methods:
1. **Local Auth** (SQLite + Magic Links) - Default for self-hosted deployments
2. **TENEO Auth SSO** (OAuth 2.0) - For TENEO Cloud deployment

---

## 🎯 Quick Decision Guide

**Use Local Auth if you:**
- ✅ Self-hosting the marketplace independently
- ✅ Want zero external dependencies
- ✅ Don't need SSO with other TENEO services
- ✅ Prefer passwordless magic link authentication
- ✅ Need it to work offline

**Use TENEO Auth SSO if you:**
- ✅ Running as part of TENEO Cloud ecosystem
- ✅ Want unified accounts across TENEO services (BCG, AIBridge, etc.)
- ✅ Need unified credit system (buy anywhere, use everywhere)
- ✅ Want OAuth 2.0 enterprise security
- ✅ Prefer one-click login experience

---

## Option 1: Local Auth (Default)

### Features

- **Passwordless** - No password management required
- **Magic Links** - Users login via email links
- **SQLite** - Fully offline, no external services
- **Zero Config** - Works out of the box
- **Privacy First** - All data stays on your server

### Setup

1. **Ensure email is configured** (`.env`):
   ```bash
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   EMAIL_FROM=Marketplace <your-email@gmail.com>
   ```

2. **Set auth provider** (`.env`):
   ```bash
   AUTH_PROVIDER=local
   MAGIC_LINK_EXPIRY_MINUTES=60
   ```

3. **Initialize database**:
   ```bash
   npm run db:init
   ```

4. **Start server**:
   ```bash
   npm start
   ```

That's it! Local auth is ready.

### How It Works

1. User enters email on `/login`
2. System generates secure random token
3. Email sent with magic link: `http://yoursite.com/api/auth/verify-magic-link?token=abc123`
4. User clicks link
5. Token verified, session created
6. User logged in

### Security Features

- ✅ Cryptographically secure tokens (32 bytes)
- ✅ Time-limited links (60 minutes default)
- ✅ One-time use (auto-expires after use)
- ✅ Audit logging for all auth events
- ✅ Rate limiting on login attempts

---

## Option 2: TENEO Auth SSO

### Features

- **Single Sign-On** - One account for all TENEO services
- **Unified Credits** - Buy on BCG, use on marketplace
- **OAuth 2.0** - Industry-standard security with PKCE
- **No Password Management** - Handled by TENEO Auth
- **Enterprise Grade** - JWT tokens, refresh tokens, secure session management

### Setup

#### Step 1: Get OAuth Credentials

Contact TENEO team or register at `https://auth.teneo.io/oauth/register`:

- **Marketplace Name:** Your Marketplace Name
- **Callback URL:** `https://your-marketplace.com/api/auth/callback`
- **Scopes:** `read`, `profile`, `credits`, `email`

You'll receive:
- `CLIENT_ID` (e.g., `teneo-marketplace`)
- `CLIENT_SECRET` (secure random string)

#### Step 2: Configure Environment

Add to `.env`:
```bash
AUTH_PROVIDER=teneo-auth

TENEO_AUTH_URL=https://auth.teneo.io
TENEO_CLIENT_ID=teneo-marketplace
TENEO_CLIENT_SECRET=your-client-secret-here
TENEO_CALLBACK_URL=https://your-marketplace.com/api/auth/callback
TENEO_SERVICE_KEY=your-service-key-here
```

#### Step 3: Initialize Database

```bash
npm run db:init
```

This creates the `oauth_tokens` and user sync tables.

#### Step 4: Test Login Flow

1. Start server: `npm start`
2. Go to `/login`
3. Click "Login with TENEO"
4. Redirects to `auth.teneo.io`
5. Login or register on TENEO Auth
6. Redirects back to your marketplace
7. Logged in!

### How It Works (OAuth 2.0 Flow)

```
┌──────────────┐        ┌─────────────┐        ┌───────────────┐
│  Marketplace │        │ TENEO Auth  │        │     User      │
└──────┬───────┘        └──────┬──────┘        └───────┬───────┘
       │                       │                       │
       │ 1. Redirect to OAuth authorize               │
       ├──────────────────────────────────────────────>│
       │   /oauth/authorize?client_id=marketplace     │
       │                       │                       │
       │                       │<─── 2. User logs in ──┤
       │                       │                       │
       │ 3. Redirect back with auth code              │
       │<─────────────────────────────────────────────┤
       │   /callback?code=abc123                      │
       │                       │                       │
       │ 4. Exchange code for token                   │
       ├──────────────────────>│                       │
       │   POST /oauth/token   │                       │
       │                       │                       │
       │ 5. Return access_token + user                │
       │<──────────────────────┤                       │
       │                       │                       │
       │ 6. Create session, user logged in            │
       │                       │                       │
```

### User Data Sync

When a user logs in via TENEO Auth:

1. **First Login:** Local user record created, linked to TENEO user ID
2. **Subsequent Logins:** Local record updated with fresh data
3. **Credits:** Always fetched fresh from TENEO Auth (single source of truth)
4. **Profile:** Name, email, avatar synced on each login

### Unified Credit System

Users who login via TENEO Auth:
- **Credit Balance:** Shown from TENEO Auth (real-time)
- **Purchases:** When they buy on marketplace, credits added to TENEO Auth
- **Usage:** Credits can be used on ANY TENEO service
- **Example:** Buy 1000 credits on marketplace → Use 500 on BCG → 500 remaining everywhere

---

## Switching Between Providers

### From Local → TENEO Auth

1. Set `AUTH_PROVIDER=teneo-auth` in `.env`
2. Configure TENEO credentials
3. Restart server
4. Existing local users can still login (marketplace checks both)
5. New users login via TENEO Auth

### From TENEO Auth → Local

1. Set `AUTH_PROVIDER=local` in `.env`
2. Restart server
3. Local magic links used for login
4. TENEO OAuth tokens no longer checked

### Migration Script

To migrate existing local users to TENEO Auth:

```bash
npm run migrate:users-to-teneo
```

This will:
- Register each local user on TENEO Auth
- Link local records to TENEO user IDs
- Migrate credit balances
- Preserve all user data

---

## API Endpoints

### Public Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/config` | GET | Get auth provider info |
| `/api/auth/register` | POST | Register new user |
| `/api/auth/login` | POST | Initiate login |
| `/api/auth/callback` | GET | OAuth callback (TENEO Auth only) |
| `/api/auth/verify-magic-link` | GET | Verify magic link (Local only) |
| `/api/auth/verify` | POST | Verify JWT token |

### Protected Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/me` | GET | Get current user |
| `/api/auth/logout` | POST | Logout user |

---

## Frontend Integration

### Detect Auth Type

```javascript
// Get auth config
const response = await fetch('/api/auth/config');
const config = await response.json();

if (config.type === 'teneo-auth') {
  // Show OAuth login button
  showOAuthButton();
} else {
  // Show magic link email form
  showMagicLinkForm();
}
```

### Login Flow

```javascript
async function login(email) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });

  const result = await response.json();

  if (result.type === 'redirect') {
    // OAuth flow - redirect to TENEO Auth
    window.location.href = result.url;
  } else {
    // Magic link flow - show confirmation
    showMessage('Check your email for the login link!');
  }
}
```

### Get Current User

```javascript
async function getCurrentUser() {
  const response = await fetch('/api/auth/me', {
    credentials: 'include' // Include session cookie
  });

  if (response.ok) {
    const user = await response.json();
    return user;
  }

  return null;
}
```

---

## Database Schema

### Users Table

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  auth_provider TEXT DEFAULT 'local', -- 'local' or 'teneo-auth'
  teneo_user_id TEXT UNIQUE, -- For TENEO Auth users
  credits INTEGER DEFAULT 0,
  email_verified BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME
);
```

### Magic Links Table (Local Auth)

```sql
CREATE TABLE magic_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  used BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### OAuth Tokens Table (TENEO Auth)

```sql
CREATE TABLE oauth_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at DATETIME,
  provider TEXT DEFAULT 'teneo-auth',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## Security Best Practices

### For All Deployments

1. **Use HTTPS** in production (required for secure cookies)
2. **Set strong SESSION_SECRET** (32+ characters random)
3. **Enable rate limiting** on auth endpoints
4. **Monitor audit logs** for suspicious activity
5. **Keep dependencies updated** (`npm audit`)

### For Local Auth

1. **Secure SMTP credentials** (use app passwords, not account passwords)
2. **Short magic link expiry** (60 minutes max)
3. **One-time use tokens** (auto-expire after use)

### For TENEO Auth

1. **Protect CLIENT_SECRET** (never commit to git)
2. **Validate OAuth state** (CSRF protection)
3. **Use PKCE** (code challenge/verifier)
4. **Verify redirect URIs** (exact match only)

---

## Troubleshooting

### Local Auth Issues

**Problem:** Magic link emails not sending
- **Fix:** Check EMAIL_* environment variables
- **Test:** `npm run test:email`

**Problem:** Magic link expired
- **Fix:** Increase `MAGIC_LINK_EXPIRY_MINUTES`
- **Default:** 60 minutes

**Problem:** "Invalid or expired login link"
- **Cause:** Token already used or expired
- **Fix:** Request new magic link

### TENEO Auth Issues

**Problem:** "Invalid client credentials"
- **Fix:** Check `TENEO_CLIENT_ID` and `TENEO_CLIENT_SECRET`
- **Verify:** Credentials match TENEO Auth registration

**Problem:** "Invalid redirect URI"
- **Cause:** Callback URL doesn't match registration
- **Fix:** Update `TENEO_CALLBACK_URL` or re-register OAuth client

**Problem:** "Invalid state" error
- **Cause:** CSRF validation failed
- **Fix:** Ensure sessions are enabled (`SESSION_SECRET` set)

---

## Support

**Documentation:**
- Main README: `/README.md`
- Integration Guide: `/TENEO_AUTH_INTEGRATION_STRATEGY.md`
- OAuth Client Setup: `/TENEO_AUTH_OAUTH_CLIENT_SETUP.md`

**Need Help?**
- GitHub Issues: https://github.com/Traviseric/teneo-marketplace/issues
- Discord: https://discord.gg/teneebooks
- Email: support@teneo.ai

---

## Summary

**For self-hosted deployments:**
```bash
AUTH_PROVIDER=local
# That's it! Works out of the box.
```

**For TENEO Cloud:**
```bash
AUTH_PROVIDER=teneo-auth
TENEO_CLIENT_ID=teneo-marketplace
TENEO_CLIENT_SECRET=<from-oauth-registration>
TENEO_CALLBACK_URL=https://your-marketplace.com/api/auth/callback
```

**Both options provide secure, modern authentication. Choose based on your deployment needs!**
