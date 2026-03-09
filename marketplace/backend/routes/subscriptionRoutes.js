'use strict';

/**
 * Subscription Routes — membership tiers + recurring billing
 *
 * POST /api/subscriptions/create-session  — create Stripe subscription checkout
 * GET  /api/subscriptions/tiers/:storeSlug — list tiers for a store (public)
 * GET  /api/subscriptions/my/:storeSlug   — check active subscription (auth'd)
 * POST /api/admin/subscriptions/tiers     — create tier (admin)
 * PUT  /api/admin/subscriptions/tiers/:id — update tier (admin)
 * DELETE /api/admin/subscriptions/tiers/:id — delete tier (admin)
 * POST /api/subscriptions/webhook         — Stripe subscription webhook events
 */

const router = require('express').Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../database/database');
const { isValidEmail } = require('../utils/validate');
const { authenticateAdmin } = require('../middleware/auth');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTier(tierId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM membership_tiers WHERE id = ? AND active = 1', [tierId], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function getSubscription(customerEmail, storeSlug) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM subscriptions WHERE customer_email = ? AND store_slug = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1`,
      [customerEmail, storeSlug],
      (err, row) => {
        if (err) return reject(err);
        resolve(row);
      }
    );
  });
}

function upsertSubscription(data) {
  return new Promise((resolve, reject) => {
    const now = Math.floor(Date.now() / 1000);
    db.run(
      `INSERT INTO subscriptions (id, customer_email, store_slug, tier_id, stripe_subscription_id, stripe_customer_id, status, current_period_end, created_at, updated_at)
       VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(stripe_subscription_id) DO UPDATE SET
         status = excluded.status,
         current_period_end = excluded.current_period_end,
         updated_at = excluded.updated_at`,
      [
        data.customer_email,
        data.store_slug,
        data.tier_id,
        data.stripe_subscription_id,
        data.stripe_customer_id || null,
        data.status || 'active',
        data.current_period_end || null,
        now,
        now,
      ],
      function (err) {
        if (err) return reject(err);
        resolve(this.lastID);
      }
    );
  });
}

function updateSubscriptionStatus(stripeSubId, status) {
  return new Promise((resolve, reject) => {
    const now = Math.floor(Date.now() / 1000);
    db.run(
      'UPDATE subscriptions SET status = ?, updated_at = ? WHERE stripe_subscription_id = ?',
      [status, now, stripeSubId],
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });
}

// ---------------------------------------------------------------------------
// Public: List tiers for a store
// ---------------------------------------------------------------------------

router.get('/tiers/:storeSlug', (req, res) => {
  const { storeSlug } = req.params;
  db.all(
    'SELECT id, name, price_monthly, features, content_access FROM membership_tiers WHERE store_slug = ? AND active = 1 ORDER BY price_monthly ASC',
    [storeSlug],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      const tiers = rows.map((r) => ({
        ...r,
        features: JSON.parse(r.features || '[]'),
        content_access: JSON.parse(r.content_access || '[]'),
      }));
      res.json({ success: true, tiers });
    }
  );
});

// ---------------------------------------------------------------------------
// Public: Create Stripe subscription checkout session
// ---------------------------------------------------------------------------

router.post('/create-session', async (req, res) => {
  try {
    const { tierId, customerEmail, storeSlug, successUrl, cancelUrl } = req.body;

    if (!tierId || !customerEmail || !storeSlug) {
      return res.status(400).json({ error: 'Missing required fields: tierId, customerEmail, storeSlug' });
    }
    if (!isValidEmail(customerEmail)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const tier = await getTier(tierId);
    if (!tier) return res.status(404).json({ error: 'Tier not found or inactive' });
    if (!tier.stripe_price_id) {
      return res.status(422).json({ error: 'Tier has no Stripe price configured. Contact store owner.' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: customerEmail,
      line_items: [{ price: tier.stripe_price_id, quantity: 1 }],
      success_url: successUrl || `${process.env.MARKETPLACE_URL || 'http://localhost:3001'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.MARKETPLACE_URL || 'http://localhost:3001'}/cancel`,
      metadata: {
        tier_id: tierId,
        store_slug: storeSlug,
        customer_email: customerEmail,
        type: 'membership_subscription',
      },
    });

    res.json({ success: true, url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('[subscriptions] create-session error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Auth'd: Check active subscription for a store
// ---------------------------------------------------------------------------

router.get('/my/:storeSlug', async (req, res) => {
  try {
    const { storeSlug } = req.params;
    const email = req.query.email || req.session?.userEmail;
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Email required' });
    }
    const sub = await getSubscription(email, storeSlug);
    if (!sub) return res.json({ success: true, active: false });
    res.json({
      success: true,
      active: sub.status === 'active',
      tier_id: sub.tier_id,
      current_period_end: sub.current_period_end,
      status: sub.status,
    });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// ---------------------------------------------------------------------------
// Stripe webhook — subscription lifecycle events
// Raw body required for signature verification
// ---------------------------------------------------------------------------

router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET_SUBSCRIPTIONS || process.env.STRIPE_WEBHOOK_SECRET;
  let event;

  if (secret && sig) {
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, secret);
    } catch (err) {
      console.error('[subscriptions webhook] signature verification failed:', err.message);
      return res.status(400).json({ error: 'Webhook signature verification failed' });
    }
  } else {
    // Dev mode: parse body directly
    event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created': {
        const sub = event.data.object;
        const meta = sub.metadata || {};
        if (meta.type === 'membership_subscription') {
          await upsertSubscription({
            customer_email: meta.customer_email || sub.customer_email || '',
            store_slug: meta.store_slug || '',
            tier_id: meta.tier_id || '',
            stripe_subscription_id: sub.id,
            stripe_customer_id: sub.customer,
            status: sub.status === 'active' ? 'active' : sub.status,
            current_period_end: sub.current_period_end,
          });
          console.log(`[subscriptions] Created subscription ${sub.id} for ${meta.customer_email}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        await updateSubscriptionStatus(sub.id, sub.status === 'active' ? 'active' : sub.status);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await updateSubscriptionStatus(sub.id, 'cancelled');
        console.log(`[subscriptions] Cancelled subscription ${sub.id}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          await updateSubscriptionStatus(invoice.subscription, 'past_due');
          console.log(`[subscriptions] Marked past_due: ${invoice.subscription}`);
        }
        break;
      }

      default:
        // Ignore unhandled events
        break;
    }

    res.json({ received: true });
  } catch (err) {
    console.error('[subscriptions webhook] handler error:', err.message);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

// ---------------------------------------------------------------------------
// Admin: Tier CRUD
// ---------------------------------------------------------------------------

router.post('/admin/tiers', authenticateAdmin, async (req, res) => {
  try {
    const { storeSlug, name, price_monthly, stripe_price_id, features, content_access } = req.body;
    if (!storeSlug || !name || price_monthly === undefined) {
      return res.status(400).json({ error: 'Missing required fields: storeSlug, name, price_monthly' });
    }
    const featuresJson = JSON.stringify(features || []);
    const contentJson = JSON.stringify(content_access || []);
    db.run(
      `INSERT INTO membership_tiers (store_slug, name, price_monthly, stripe_price_id, features, content_access)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [storeSlug, name, price_monthly, stripe_price_id || null, featuresJson, contentJson],
      function (err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.status(201).json({ success: true, id: this.lastID });
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/admin/tiers/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price_monthly, stripe_price_id, features, content_access, active } = req.body;
    db.run(
      `UPDATE membership_tiers SET name = COALESCE(?, name), price_monthly = COALESCE(?, price_monthly),
       stripe_price_id = COALESCE(?, stripe_price_id), features = COALESCE(?, features),
       content_access = COALESCE(?, content_access), active = COALESCE(?, active),
       updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [
        name || null,
        price_monthly !== undefined ? price_monthly : null,
        stripe_price_id || null,
        features ? JSON.stringify(features) : null,
        content_access ? JSON.stringify(content_access) : null,
        active !== undefined ? (active ? 1 : 0) : null,
        id,
      ],
      function (err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (this.changes === 0) return res.status(404).json({ error: 'Tier not found' });
        res.json({ success: true });
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/admin/tiers/:id', authenticateAdmin, (req, res) => {
  db.run('UPDATE membership_tiers SET active = 0 WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (this.changes === 0) return res.status(404).json({ error: 'Tier not found' });
    res.json({ success: true });
  });
});

// ---------------------------------------------------------------------------
// Content gating middleware — export for use in other routes
// ---------------------------------------------------------------------------

/**
 * requiresSubscription(storeSlug)
 * Returns Express middleware that checks the `subscriptions` table for an active
 * subscription before serving gated content.
 *
 * Usage:
 *   router.get('/gated-content', requiresSubscription('my-store'), handler);
 *
 * The middleware reads customerEmail from:
 *   1. req.session.userEmail
 *   2. req.query.email
 *   3. req.body.email
 */
function requiresSubscription(storeSlug) {
  return async (req, res, next) => {
    const email =
      req.session?.userEmail ||
      req.query.email ||
      req.body?.email;

    if (!email) {
      return res.status(401).json({ error: 'Subscription required. Please log in.' });
    }

    try {
      const sub = await getSubscription(email, storeSlug);
      if (!sub || sub.status !== 'active') {
        return res.status(403).json({ error: 'Active subscription required for this content.' });
      }
      req.subscription = sub;
      next();
    } catch (err) {
      res.status(500).json({ error: 'Subscription check failed' });
    }
  };
}

module.exports = router;
module.exports.requiresSubscription = requiresSubscription;
