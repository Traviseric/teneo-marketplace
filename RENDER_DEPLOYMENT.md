# 🚀 Render Deployment Guide

**Deploy teneo-marketplace to Render in 5 minutes**

---

## 📋 Prerequisites

Before deploying, you'll need:

1. **GitHub Account** - Repository is already set up
2. **Render Account** - Sign up at https://render.com (free)
3. **Stripe Account** - For payment processing (get keys at https://dashboard.stripe.com)
4. **Email Provider** (Optional) - Gmail or SendGrid for notifications

---

## 🎯 Deployment Steps

### Step 1: Generate Your Secrets

**Run these commands locally to generate unique secrets:**

```bash
# Generate session secret
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Generate admin password hash (change "YourPassword" to your desired password)
node marketplace/backend/scripts/generate-password-hash.js "YourSecurePassword123"
```

**Save these values** - you'll need them in Step 3!

---

### Step 2: Connect Repository to Render

1. Go to https://dashboard.render.com
2. Sign in with GitHub
3. Click **"New +"** → **"Blueprint"**
4. Select repository: `Traviseric/teneo-marketplace`
5. Click **"Connect"**

Render will auto-detect `deploy/render.yaml` ✅

---

### Step 3: Configure Environment Variables

In the Render dashboard, add these environment variables:

#### **Required Variables**

```bash
NODE_ENV=production
SESSION_SECRET=<from-step-1-above>
ADMIN_PASSWORD_HASH=<from-step-1-above>
```

#### **Stripe Keys** (Get from https://dashboard.stripe.com/test/apikeys)

```bash
STRIPE_SECRET_KEY=sk_test_... (or sk_live_... for production)
STRIPE_PUBLISHABLE_KEY=pk_test_... (or pk_live_... for production)
STRIPE_WEBHOOK_SECRET=whsec_... (optional, for webhooks)
```

#### **Optional: Email Notifications**

```bash
EMAIL_ENABLED=true
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
```

**How to get Gmail App Password:**
1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification
3. Go to App Passwords
4. Generate password for "Mail"

#### **Optional: Branding**

```bash
MARKETPLACE_NAME=Your Marketplace Name
MARKETPLACE_TAGLINE=Your Tagline
SUPPORT_EMAIL=support@yourdomain.com
```

---

### Step 4: Deploy

1. Review your settings
2. Select plan:
   - **Free** - Good for testing (sleeps after 15min)
   - **Starter ($7/mo)** - Always on, recommended for production
3. Click **"Apply"**

**Deployment takes 3-5 minutes** ⏱️

---

## ✅ Post-Deployment Testing

Once deployed, test these endpoints:

### Homepage
```
https://your-app.onrender.com
```

### Health Check
```
https://your-app.onrender.com/api/health
```
Should return: `{"status":"healthy"}`

### Admin Dashboard
```
https://your-app.onrender.com/admin
```
Login with: `admin` / `<your-password-from-step-1>`

### Test Purchase
1. Browse to a book
2. Add to cart
3. Checkout with test card: `4242 4242 4242 4242`
4. Verify download link works

---

## 🔒 Security Best Practices

### ⚠️ NEVER Commit These to Git:

- ❌ `.env` files
- ❌ `SESSION_SECRET`
- ❌ `ADMIN_PASSWORD_HASH`
- ❌ Stripe secret keys
- ❌ Email passwords
- ❌ Database files

### ✅ Safe to Commit:

- ✅ Code files (`.js`, `.html`, `.css`)
- ✅ Configuration templates (`.env.example`)
- ✅ Documentation
- ✅ Database schemas (empty)

---

## 📊 Monitoring

### View Logs

In Render dashboard:
1. Go to your service
2. Click **"Logs"** tab
3. See real-time output

### Health Checks

Render automatically pings `/api/health` every 60 seconds.
If it fails 3 times, the service restarts automatically.

---

## 🔧 Troubleshooting

### Build Fails

**Check:**
- All environment variables are set
- `package.json` is valid
- Node version is compatible (16+)

### Database Issues

**Error:** `Database locked`
- SQLite can have concurrency issues with high traffic
- Consider upgrading to Postgres for production

### Stripe Errors

**Error:** `Invalid API key`
- Verify you copied the full key (starts with `sk_test_` or `sk_live_`)
- Check for extra spaces

---

## 💰 Pricing

| Plan | Price | RAM | Storage | Use Case |
|------|-------|-----|---------|----------|
| Free | $0 | 512MB | 1GB | Testing |
| Starter | $7/mo | 512MB | 1GB | Small production |
| Standard | $25/mo | 2GB | 10GB | High traffic |

---

## 🚀 Continuous Deployment

Render automatically redeploys when you push to `main`:

```bash
git add .
git commit -m "Update marketplace"
git push origin main
```

Render detects the push and redeploys in 2-3 minutes!

---

## 📞 Support

**Render Documentation:** https://render.com/docs
**Marketplace Issues:** https://github.com/Traviseric/teneo-marketplace/issues

---

## ⚡ Quick Reference

**1. Generate Secrets:**
```bash
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node marketplace/backend/scripts/generate-password-hash.js "YourPassword"
```

**2. Deploy:**
- https://dashboard.render.com/select-repo?type=blueprint

**3. Add Environment Variables:**
- SESSION_SECRET, ADMIN_PASSWORD_HASH, STRIPE_SECRET_KEY, etc.

**4. Click Apply** → Wait 3-5 min → Done! 🎉

---

**Your marketplace will be live at:** `https://your-app-name.onrender.com`
