'use strict';

/**
 * wellKnownRoutes.js — NIP-05 DNS verification for merchants
 *
 * Serves /.well-known/nostr.json so that Nostr clients can verify that
 * a store's handle (e.g. alice@openbazaar.ai) maps to its Nostr pubkey.
 *
 * Spec: https://github.com/nostr-protocol/nips/blob/master/05.md
 *
 * Mount this router BEFORE other routes in server.js so the /.well-known path
 * is served correctly:
 *   app.use('/.well-known', wellKnownRoutes);
 */

const express = require('express');
const router = express.Router();
const db = require('../database/database');

/**
 * GET /.well-known/nostr.json?name=<handle>
 *
 * Returns: { names: { "<handle>": "<pubkey_hex>" } }
 *   or 404 if the store or pubkey is not found.
 *
 * Always includes Access-Control-Allow-Origin: * per NIP-05 spec.
 */
router.get('/nostr.json', async (req, res) => {
  // NIP-05 requires CORS wildcard
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Cache-Control', 'public, max-age=300'); // 5-min cache

  const name = req.query.name;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'name query parameter required' });
  }

  // Sanitize: only allow [a-z0-9-_] to match valid store slugs
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (!slug) {
    return res.status(400).json({ error: 'invalid name' });
  }

  try {
    const store = await db.get(
      'SELECT slug, nostr_pubkey FROM stores WHERE slug = ?',
      [slug]
    );

    if (!store || !store.nostr_pubkey) {
      return res.status(404).json({ names: {} });
    }

    return res.json({
      names: {
        [store.slug]: store.nostr_pubkey,
      },
    });
  } catch (err) {
    console.error('[NIP-05] Database error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /.well-known/agent-capabilities.json
 *
 * OpenAI plugin manifest-compatible discovery document for AI agents.
 * Describes available agent endpoints, auth methods, and payment options.
 */
router.get('/agent-capabilities.json', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Cache-Control', 'public, max-age=3600'); // 1-hour cache

  const publicUrl = process.env.SITE_URL || process.env.PUBLIC_URL || 'http://localhost:3001';
  const storeName = process.env.STORE_NAME || 'OpenBazaar Store';
  const storeId = process.env.STORE_ID || 'openbazaar-default';

  res.json({
    schema_version: '1.0',
    name: storeName,
    store_id: storeId,
    description: `${storeName} — AI-native marketplace. Digital products, instant delivery. Lightning and Stripe payments accepted.`,
    base_url: publicUrl,
    api_version: 'v1',
    endpoints: {
      catalog: {
        method: 'GET',
        path: '/api/agent/catalog',
        description: 'Browse product catalog with capabilities and pricing',
        auth_required: false,
        response_schema: `${publicUrl}/.well-known/agent-capabilities.json#/schemas/Product`,
        query_params: {
          type: 'Filter by product type: "digital", "pod", or "physical"',
          capability: 'Filter by capability: "digital_download", "instant_delivery", "course_access"',
        },
      },
      quote: {
        method: 'POST',
        path: '/api/agent/quote',
        description: 'Get a purchase quote for one or more products',
        auth_required: true,
        request_body: {
          items: 'Array of { product_id: string, quantity?: number }',
          agent_id: 'Optional agent identifier for audit logging',
        },
      },
      purchase: {
        method: 'POST',
        path: '/api/agent/purchase',
        description: 'Initiate payment — returns Lightning invoice or Stripe checkout URL',
        auth_required: true,
        request_body: {
          quote_id: 'Quote ID from /api/agent/quote (preferred)',
          items: 'Direct items array (if no quote_id)',
          payment_method: '"lightning" (instant) or "stripe" (requires human)',
          customer_email: 'Optional customer email for receipts',
        },
      },
      order_status: {
        method: 'GET',
        path: '/api/agent/order/:orderId',
        description: 'Poll order status — returns download_url when fulfilled',
        auth_required: false,
      },
    },
    authentication: {
      methods: [
        {
          type: 'api_key',
          header: 'X-Api-Key',
          description: 'Static API key (contact store operator for credentials)',
        },
        {
          type: 'nostr_nip98',
          header: 'Authorization',
          scheme: 'Nostr <base64-encoded-kind-27235-event>',
          description: 'Self-sovereign auth via Nostr NIP-98 signed events',
          spec: 'https://github.com/nostr-protocol/nips/blob/master/98.md',
        },
      ],
      agent_id_header: 'X-Agent-Id',
      agent_id_description: 'Optional agent identifier header — used for rate limiting and audit logs',
    },
    payment_methods: [
      {
        method: 'lightning',
        currency: 'sats',
        description: 'Instant Lightning Network payment via ArxMint',
        autonomy: 'fully_autonomous',
      },
      {
        method: 'stripe',
        currency: 'USD',
        description: 'Stripe checkout — requires human interaction',
        autonomy: 'human_assisted',
      },
    ],
    schemas: {
      Product: {
        id: 'string (brandId:productId)',
        title: 'string',
        agent_description: 'string (machine-optimized with structured metadata)',
        price_usd_cents: 'integer',
        price_sats: 'integer (Lightning pricing)',
        type: 'string (digital|pod|physical)',
        capabilities: 'string[] e.g. ["digital_download","instant_delivery"]',
        requirements: 'string[] e.g. ["shipping_address"] for physical items',
      },
    },
    contact: process.env.STORE_EMAIL || null,
  });
});

module.exports = router;
