# TENEO Auth - OAuth Client Setup for Marketplace

**For:** TENEO Auth repository (`teneo-auth`)
**Goal:** Register openbazaar-ai as an OAuth 2.0 client for SSO integration

---

## 📋 Task for TENEO Auth Repository

The openbazaar-ai needs to be registered as an OAuth 2.0 client in TENEO Auth to enable SSO login.

### **What Needs to be Done:**

Create a script or database migration to register the marketplace as a first-party OAuth client with the following configuration:

---

## 🔧 OAuth Client Configuration

### **Client Details:**

```json
{
  "client_id": "openbazaar-ai",
  "client_secret": "<generate-secure-secret>",
  "name": "OpenBazaar AI",
  "description": "AI-generated book marketplace with dual-mode payments",
  "is_first_party": true,
  "is_active": true,

  "redirect_uris": [
    "https://marketplace.teneo.io/api/auth/callback",
    "http://localhost:3001/api/auth/callback"
  ],

  "allowed_origins": [
    "https://marketplace.teneo.io",
    "http://localhost:3001"
  ],

  "scopes": ["read", "profile", "credits", "email"],

  "logo_url": "https://marketplace.teneo.io/logo.png",
  "privacy_url": "https://marketplace.teneo.io/privacy",
  "terms_url": "https://marketplace.teneo.io/terms",
  "contact_email": "support@teneo.io"
}
```

---

## 📝 Suggested Implementation Script

Create this file in teneo-auth:

**File:** `scripts/register-marketplace-oauth-client.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function registerMarketplaceClient() {
  console.log('Registering OpenBazaar AI as OAuth client...');

  // Generate secure client secret
  const clientSecret = crypto.randomBytes(32).toString('hex');
  const hashedSecret = await bcrypt.hash(clientSecret, 10);

  // Insert OAuth client
  const { data, error } = await supabase
    .from('oauth_clients')
    .insert({
      client_id: 'openbazaar-ai',
      client_secret: hashedSecret,
      name: 'OpenBazaar AI',
      description: 'AI-generated book marketplace with dual-mode payments',
      is_first_party: true,
      is_active: true,
      redirect_uris: [
        'https://marketplace.teneo.io/api/auth/callback',
        'http://localhost:3001/api/auth/callback',
      ],
      allowed_origins: [
        'https://marketplace.teneo.io',
        'http://localhost:3001',
      ],
      scopes: ['read', 'profile', 'credits', 'email'],
      logo_url: 'https://marketplace.teneo.io/logo.png',
      privacy_url: 'https://marketplace.teneo.io/privacy',
      terms_url: 'https://marketplace.teneo.io/terms',
      contact_email: 'support@teneo.io',
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Failed to register client:', error);
    process.exit(1);
  }

  console.log('✅ Marketplace registered successfully!');
  console.log('\n📋 Client Credentials (SAVE THESE):');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`CLIENT_ID: openbazaar-ai`);
  console.log(`CLIENT_SECRET: ${clientSecret}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n⚠️  Add these to marketplace .env:');
  console.log(`TENEO_CLIENT_ID=openbazaar-ai`);
  console.log(`TENEO_CLIENT_SECRET=${clientSecret}`);
  console.log('TENEO_AUTH_URL=https://auth.teneo.io');
  console.log('TENEO_CALLBACK_URL=https://marketplace.teneo.io/api/auth/callback');
  console.log('\n✅ Done! The marketplace can now use TENEO Auth SSO.');
}

registerMarketplaceClient();
```

---

## 🏃 How to Run (in teneo-auth repository)

```bash
# From teneo-auth directory
cd D:\Travis Eric\TE Code\teneo-auth

# Run the registration script
tsx scripts/register-marketplace-oauth-client.ts
```

This will:
1. Generate a secure client secret
2. Hash it with bcrypt (for secure storage)
3. Insert the OAuth client into `oauth_clients` table
4. Display the credentials to add to marketplace `.env`

---

## 🔐 Security Notes

1. **Client Secret:** Generate a cryptographically secure random secret (32+ bytes)
2. **Hash Storage:** Store hashed secret in database (bcrypt with 10 rounds)
3. **First-Party Flag:** Set `is_first_party: true` to skip consent screen for marketplace
4. **Redirect URIs:** Only whitelist exact callback URLs (production + localhost)
5. **CORS Origins:** Only allow marketplace domains

---

## 🎯 Expected Outcome

After running this script, the openbazaar-ai will be able to:

1. **Redirect users to TENEO Auth** for login/registration
2. **Exchange OAuth authorization codes** for access tokens
3. **Verify user identity** via TENEO Auth JWT tokens
4. **Access unified credits** across the TENEO ecosystem
5. **Provide SSO experience** (login once, use everywhere)

---

## 🔄 OAuth Flow (How It Works)

```
┌─────────────┐                  ┌──────────────┐                  ┌─────────────┐
│ Marketplace │                  │  TENEO Auth  │                  │    User     │
│   (Client)  │                  │   (Server)   │                  │  (Browser)  │
└──────┬──────┘                  └──────┬───────┘                  └──────┬──────┘
       │                                │                                 │
       │ 1. Redirect to /oauth/authorize                                 │
       ├────────────────────────────────────────────────────────────────>│
       │    with client_id, redirect_uri, PKCE challenge                 │
       │                                │                                 │
       │                                │<─ 2. User logs in or registers ─┤
       │                                │                                 │
       │ 3. Redirect back with code     │                                 │
       │<────────────────────────────────────────────────────────────────┤
       │                                │                                 │
       │ 4. Exchange code for token     │                                 │
       ├───────────────────────────────>│                                 │
       │    POST /oauth/token           │                                 │
       │    {code, verifier, secret}    │                                 │
       │                                │                                 │
       │ 5. Return access_token + user  │                                 │
       │<───────────────────────────────┤                                 │
       │                                │                                 │
       │ 6. Create local session        │                                 │
       │    User logged in!             │                                 │
       │                                │                                 │
```

---

## 📖 Related Files in Marketplace

Once the OAuth client is registered, the marketplace uses:

- `marketplace/backend/auth/providers/TeneoAuthProvider.js` - OAuth 2.0 client implementation
- `marketplace/backend/auth/config.js` - Provider selection logic
- `marketplace/backend/routes/auth.js` - Auth endpoints (login, callback, verify)

---

## ✅ Checklist

For teneo-auth repository:

- [ ] Create `scripts/register-marketplace-oauth-client.ts`
- [ ] Run script to register OAuth client
- [ ] Save generated CLIENT_SECRET securely
- [ ] Provide credentials to marketplace team
- [ ] Verify OAuth endpoints are working:
  - `/api/oauth/authorize`
  - `/api/oauth/token`
  - `/api/oauth/userinfo`
  - `/api/auth/verify`

For marketplace repository (after OAuth client is registered):

- [ ] Add credentials to `.env`:
  ```bash
  AUTH_PROVIDER=teneo-auth
  TENEO_CLIENT_ID=openbazaar-ai
  TENEO_CLIENT_SECRET=<from-script-output>
  TENEO_AUTH_URL=https://auth.teneo.io
  TENEO_CALLBACK_URL=https://marketplace.teneo.io/api/auth/callback
  ```
- [ ] Test OAuth login flow
- [ ] Verify user data syncs correctly
- [ ] Confirm unified credits work

---

## 🚀 Summary

**Prompt for teneo-auth Claude Code:**

> I need to register the openbazaar-ai as an OAuth 2.0 client so it can use TENEO Auth SSO.
>
> Please create a script at `scripts/register-marketplace-oauth-client.ts` that:
> 1. Generates a secure client secret
> 2. Hashes it with bcrypt
> 3. Inserts an OAuth client with:
>    - client_id: "openbazaar-ai"
>    - name: "OpenBazaar AI"
>    - is_first_party: true
>    - redirect_uris: ["https://marketplace.teneo.io/api/auth/callback", "http://localhost:3001/api/auth/callback"]
>    - scopes: ["read", "profile", "credits", "email"]
> 4. Outputs the CLIENT_SECRET for the marketplace team
>
> Reference the OAuth schema at `supabase/migrations/005_oauth_2_schema.sql`.

---

**That's it!** Once registered, the marketplace can use TENEO Auth for SSO. 🎉
