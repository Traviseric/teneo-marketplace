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

module.exports = router;
