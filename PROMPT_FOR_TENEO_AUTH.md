# Prompt for TENEO Auth Claude Code

**Copy this entire message and send it to Claude Code in the teneo-auth repository:**

---

I need to register the teneo-marketplace as an OAuth 2.0 client so it can use TENEO Auth SSO.

Please create a script that registers the marketplace as a first-party OAuth client.

**Create this file:** `scripts/register-marketplace-oauth-client.ts`

**Requirements:**

1. **Generate a secure client secret** (32+ bytes, cryptographically random)
2. **Hash it with bcrypt** (10 rounds)
3. **Insert an OAuth client** into the `oauth_clients` table with these details:

```typescript
{
  client_id: "teneo-marketplace",
  client_secret: "<hashed-secret>",
  name: "TENEO Marketplace",
  description: "AI-generated book marketplace with dual-mode payments",
  is_first_party: true,
  is_active: true,
  redirect_uris: [
    "https://marketplace.teneo.io/api/auth/callback",
    "http://localhost:3001/api/auth/callback"
  ],
  allowed_origins: [
    "https://marketplace.teneo.io",
    "http://localhost:3001"
  ],
  scopes: ["read", "profile", "credits", "email"],
  logo_url: "https://marketplace.teneo.io/logo.png",
  privacy_url: "https://marketplace.teneo.io/privacy",
  terms_url: "https://marketplace.teneo.io/terms",
  contact_email: "support@teneo.io"
}
```

4. **Output the plaintext CLIENT_SECRET** so I can add it to the marketplace `.env`
5. **Show the complete credentials** needed for marketplace configuration

**Reference:**
- OAuth schema: `supabase/migrations/005_oauth_2_schema.sql`
- Existing client examples: `supabase/migrations/006_seed_oauth_clients.sql` (if exists)

**Expected output format:**
```
✅ Marketplace registered successfully!

📋 Client Credentials (SAVE THESE):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLIENT_ID: teneo-marketplace
CLIENT_SECRET: <generated-secret>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  Add these to marketplace .env:
TENEO_CLIENT_ID=teneo-marketplace
TENEO_CLIENT_SECRET=<generated-secret>
TENEO_AUTH_URL=https://auth.teneo.io
TENEO_CALLBACK_URL=https://marketplace.teneo.io/api/auth/callback
```

After creating the script, run it and provide me with the credentials.

Thank you!

---

**That's the complete prompt.** Just copy everything above this line and send it to teneo-auth Claude Code.
