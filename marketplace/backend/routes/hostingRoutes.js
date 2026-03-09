'use strict';

/**
 * Hosting Routes — managed hosting tier subscriptions
 *
 * GET  /api/hosting/tiers        — list available tiers (public)
 * POST /api/hosting/subscribe    — create Stripe subscription checkout
 * POST /api/hosting/webhook      — Stripe webhook: activate/deactivate hosting
 */

const router = require('express').Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../database/database');
const { isValidEmail } = require('../utils/validate');
const HOSTING_TIERS = require('../config/hostingTiers');

// ---------------------------------------------------------------------------
// GET /api/hosting/tiers — public tier listing
// ---------------------------------------------------------------------------

router.get('/tiers', (req, res) => {
  const tiers = HOSTING_TIERS.map(({ id, name, price, features }) => ({ id, name, price, features }));
  res.json({ success: true, tiers });
});

// ---------------------------------------------------------------------------
// POST /api/hosting/subscribe — create Stripe subscription checkout session
// ---------------------------------------------------------------------------

router.post('/subscribe', async (req, res) => {
  try {
    const { tierId, customerEmail, successUrl, cancelUrl } = req.body;

    if (!tierId || !customerEmail) {
      return res.status(400).json({ error: 'Missing required fields: tierId, customerEmail' });
    }
    if (!isValidEmail(customerEmail)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const tier = HOSTING_TIERS.find((t) => t.id === tierId);
    if (!tier) return res.status(404).json({ error: `Unknown hosting tier: ${tierId}` });

    if (!tier.stripe_price_id) {
      return res.status(422).json({
        error: `Hosting tier '${tier.name}' has no Stripe price configured. Set STRIPE_PRICE_${tierId.toUpperCase()} env var.`,
      });
    }

    const baseUrl = process.env.MARKETPLACE_URL || 'http://localhost:3001';
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: customerEmail,
      line_items: [{ price: tier.stripe_price_id, quantity: 1 }],
      success_url: successUrl || `${baseUrl}/hosting/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${baseUrl}/hosting/pricing`,
      metadata: {
        type: 'managed_hosting',
        tier_id: tierId,
        customer_email: customerEmail,
      },
    });

    res.json({ success: true, url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('[hosting] subscribe error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/hosting/webhook — Stripe subscription lifecycle for hosting
// ---------------------------------------------------------------------------

router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET_HOSTING || process.env.STRIPE_WEBHOOK_SECRET;
  let event;

  if (secret && sig) {
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, secret);
    } catch (err) {
      console.error('[hosting webhook] signature verification failed:', err.message);
      return res.status(400).json({ error: 'Webhook signature verification failed' });
    }
  } else {
    event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created': {
        const sub = event.data.object;
        const meta = sub.metadata || {};
        if (meta.type !== 'managed_hosting') break;

        // Create store_builds record to kick off provisioning
        db.run(
          `INSERT INTO store_builds (intake_payload, status, tier, payment_session_id)
           VALUES (?, 'intake', ?, ?)`,
          [
            JSON.stringify({ customer_email: meta.customer_email, tier_id: meta.tier_id, stripe_subscription_id: sub.id }),
            meta.tier_id,
            sub.id,
          ],
          function (err) {
            if (err) console.error('[hosting webhook] store_builds insert error:', err.message);
            else console.log(`[hosting] Created store_build for subscription ${sub.id} (tier: ${meta.tier_id})`);
          }
        );
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        if ((sub.metadata || {}).type !== 'managed_hosting') break;
        db.run(
          `UPDATE store_builds SET status = 'suspended', updated_at = datetime('now') WHERE payment_session_id = ?`,
          [sub.id],
          (err) => {
            if (err) console.error('[hosting webhook] suspend error:', err.message);
            else console.log(`[hosting] Suspended store_build for subscription ${sub.id}`);
          }
        );
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        if ((sub.metadata || {}).type !== 'managed_hosting') break;
        if (sub.status === 'active') {
          db.run(
            `UPDATE store_builds SET status = 'active', updated_at = datetime('now') WHERE payment_session_id = ? AND status = 'suspended'`,
            [sub.id],
            (err) => { if (err) console.error('[hosting webhook] reactivate error:', err.message); }
          );
        }
        break;
      }

      default:
        break;
    }

    res.json({ received: true });
  } catch (err) {
    console.error('[hosting webhook] handler error:', err.message);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

module.exports = router;
