const router = require('express').Router();
const { randomUUID } = require('crypto');
const { buildStoreFromBrief, parseEditIntent, deepMerge } = require('../services/aiStoreBuilderService');
const { renderStorePage } = require('../services/storeRendererService');
const storeBuildService = require('../services/storeBuildService');
const storeBuilderService = require('../services/storeBuilderService');
const emailService = require('../services/emailService');
const { isValidEmail } = require('../utils/validate');
const db = require('../database/database');
const { requireAuth } = require('./auth');
const { authenticateAdmin } = require('../middleware/auth');
const { requireNip98Auth } = require('../auth/nip98');

/*
 * Managed-store intake schema
 * required: business_brief (>=50 chars), contact_email, tier
 * optional: contact_name, website_url, brand_examples, payment_ref, notes
 * tiers: builder | pro | white_label
 */
const VALID_TIERS = ['builder', 'pro', 'white_label'];
const BRIEF_MIN_LENGTH = 50;

// POST /api/store-builder/generate
// Body: { "brief": "I sell soy candles online, earthy aesthetic" }
// Returns: { success: true, config: <StoreConfig> }
// Accepts NIP-98 HTTP auth for headless/agent clients (Authorization: Nostr <base64-event>)
// Falls through to session auth if NIP-98 header absent (public endpoint, no auth required)
router.post('/generate', async (req, res) => {
  // If a NIP-98 Authorization header is present, verify it and attach pubkey to req
  if (req.headers['authorization'] && req.headers['authorization'].startsWith('Nostr ')) {
    const { verifyNip98Auth } = require('../auth/nip98');
    const result = verifyNip98Auth(req);
    if (!result.valid) {
      return res.status(401).json({ error: 'NIP-98 authentication failed', message: result.error });
    }
    req.nostrPubkey = result.pubkey;
  }
  const { brief } = req.body;
  if (!brief || brief.length < 20) {
    return res.status(400).json({ error: 'Brief too short. Describe your business in at least 20 characters.' });
  }
  try {
    const config = await buildStoreFromBrief(brief);
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/store-builder/render
// Body: { "config": <StoreConfig> }
// Returns: { success: true, html: "<html>..." }
router.post('/render', (req, res) => {
  const { config } = req.body;
  if (!config) return res.status(400).json({ error: 'config required' });
  try {
    const html = renderStorePage(config);
    res.json({ success: true, html });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/store-builder/generate-and-render
// Single call: brief → config → HTML
// Body: { "brief": "..." }
// Returns: { success: true, config, html }
router.post('/generate-and-render', async (req, res) => {
  const { brief } = req.body;
  if (!brief || brief.length < 20) {
    return res.status(400).json({ error: 'Brief too short. Describe your business in at least 20 characters.' });
  }
  try {
    const config = await buildStoreFromBrief(brief);
    const html = renderStorePage(config);
    res.json({ success: true, config, html });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────────
// Persistence endpoints (require auth)
// ──────────────────────────────────────────────────

// POST /api/store-builder/save
// Save a store config (and optionally rendered HTML) to the DB.
// Body: { config, html?, slug? }
// Returns: { success: true, storeId, slug, url }
router.post('/save', requireAuth, async (req, res) => {
  const { config, html, slug: providedSlug } = req.body;
  if (!config || !config.name) {
    return res.status(400).json({ error: 'config with name required' });
  }

  const userId = req.session.userId || req.session.user_id || null;

  try {
    const { storeId, slug, url } = await storeBuilderService.saveStore(config, html || null, userId, providedSlug || null);

    const products = (config.commerce && config.commerce.products) || [];
    await storeBuilderService.saveProducts(storeId, products);

    res.json({ success: true, storeId, slug, url });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'A store with this slug already exists.' });
    }
    res.status(500).json({ error: err.message });
  }
});

// GET /api/store-builder/stores
// List the authenticated user's stores.
// Returns: { success: true, stores: [...] }
router.get('/stores', requireAuth, async (req, res) => {
  const userId = req.session.userId || req.session.user_id || null;
  try {
    const stores = await db.all(
      'SELECT id, slug, status, created_at, updated_at FROM stores WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    res.json({ success: true, stores });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/store-builder/stores/:id
// Load a specific store (full config + html).
// Returns: { success: true, store: { ...fields, config: <parsed> } }
router.get('/stores/:id', requireAuth, async (req, res) => {
  const userId = req.session.userId || req.session.user_id || null;
  try {
    const store = await db.get(
      'SELECT * FROM stores WHERE id = ? AND user_id = ?',
      [req.params.id, userId]
    );
    if (!store) return res.status(404).json({ error: 'Store not found' });

    let config;
    try {
      config = typeof store.config === 'string' ? JSON.parse(store.config) : store.config;
    } catch (_) {
      config = store.config;
    }

    res.json({ success: true, store: { ...store, config } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/store-builder/stores/:id/products
// List products for a specific store (owned by user).
// Returns: { success: true, products: [...] }
router.get('/stores/:id/products', requireAuth, async (req, res) => {
  const userId = req.session.userId || req.session.user_id || null;
  try {
    const store = await db.get(
      'SELECT id FROM stores WHERE id = ? AND user_id = ?',
      [req.params.id, userId]
    );
    if (!store) return res.status(404).json({ error: 'Store not found' });

    const products = await db.all(
      'SELECT * FROM store_products WHERE store_id = ? ORDER BY created_at ASC',
      [store.id]
    );
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────────
// Subscriber capture (public — no auth required)
// ──────────────────────────────────────────────────

// POST /api/store-builder/stores/:id/subscribe
// Capture an email address for a published store.
// Body: { email, name? }
// Returns: { success: true, subscribed: true } or { success: true, alreadySubscribed: true }
router.post('/stores/:id/subscribe', async (req, res) => {
  const { email, name } = req.body;
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  try {
    const store = await db.get(
      "SELECT id FROM stores WHERE id = ? AND status = 'published'",
      [req.params.id]
    );
    if (!store) return res.status(404).json({ error: 'Store not found' });

    const result = await storeBuilderService.addSubscriber(store.id, email, { name });
    res.json({ success: true, subscribed: true, alreadySubscribed: result.alreadySubscribed || false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/store-builder/stores/:id/subscribers
// List subscribers for a store. Owner only.
// Returns: { success: true, subscribers: [...] }
router.get('/stores/:id/subscribers', requireAuth, async (req, res) => {
  const userId = req.session.userId || req.session.user_id || null;
  try {
    const store = await db.get(
      'SELECT id FROM stores WHERE id = ? AND user_id = ?',
      [req.params.id, userId]
    );
    if (!store) return res.status(404).json({ error: 'Store not found' });

    const subscribers = await storeBuilderService.listSubscribers(store.id);
    res.json({ success: true, subscribers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────────
// Natural language editing
// ──────────────────────────────────────────────────

// PATCH /api/store-builder/stores/:id/edit
// Apply a natural-language instruction to update store config + HTML.
// Body: { instruction: "change hero text to '...'" }
// Returns: { success: true, config, html, patch }
router.patch('/stores/:id/edit', requireAuth, async (req, res) => {
  const { instruction } = req.body;
  if (!instruction) return res.status(400).json({ error: 'instruction required' });

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'AI editing requires ANTHROPIC_API_KEY to be configured.' });
  }

  const userId = req.session.userId || req.session.user_id || null;
  try {
    const store = await db.get(
      'SELECT * FROM stores WHERE id = ? AND user_id = ?',
      [req.params.id, userId]
    );
    if (!store) return res.status(404).json({ error: 'Store not found' });

    let existingConfig;
    try {
      existingConfig = typeof store.config === 'string' ? JSON.parse(store.config) : store.config;
    } catch (_) {
      return res.status(500).json({ error: 'Store config is corrupted' });
    }

    const patch = await parseEditIntent(instruction, existingConfig);
    const updatedConfig = deepMerge(existingConfig, patch);
    const html = renderStorePage(updatedConfig);

    await db.run(
      'UPDATE stores SET config = ?, html = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [JSON.stringify(updatedConfig), html, req.params.id]
    );

    res.json({ success: true, config: updatedConfig, html, patch });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────────
// Preview, publish, unpublish
// ──────────────────────────────────────────────────

// GET /api/store-builder/stores/:id/preview
// Returns rendered HTML for authenticated store owner (draft access).
router.get('/stores/:id/preview', requireAuth, async (req, res) => {
  const userId = req.session.userId || req.session.user_id || null;
  try {
    const store = await db.get(
      'SELECT * FROM stores WHERE id = ? AND user_id = ?',
      [req.params.id, userId]
    );
    if (!store) return res.status(404).json({ error: 'Store not found' });

    let html = store.html;
    if (!html) {
      const config = typeof store.config === 'string' ? JSON.parse(store.config) : store.config;
      html = renderStorePage(config);
    }

    res.set('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/store-builder/stores/:id/publish
// Set status = 'published', returns public URL.
router.post('/stores/:id/publish', requireAuth, async (req, res) => {
  const userId = req.session.userId || req.session.user_id || null;
  try {
    const store = await db.get(
      'SELECT * FROM stores WHERE id = ? AND user_id = ?',
      [req.params.id, userId]
    );
    if (!store) return res.status(404).json({ error: 'Store not found' });

    const slug = store.slug || '';
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      return res.status(400).json({ error: 'Store has an invalid or missing slug' });
    }

    await db.run(
      'UPDATE stores SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['published', req.params.id]
    );

    res.json({ success: true, url: `/store/${slug}`, slug });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/store-builder/stores/:id/unpublish
// Revert status to 'draft'.
router.post('/stores/:id/unpublish', requireAuth, async (req, res) => {
  const userId = req.session.userId || req.session.user_id || null;
  try {
    const store = await db.get(
      'SELECT id FROM stores WHERE id = ? AND user_id = ?',
      [req.params.id, userId]
    );
    if (!store) return res.status(404).json({ error: 'Store not found' });

    await db.run(
      'UPDATE stores SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['draft', req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────────
// Managed intake (paid build requests)
// ──────────────────────────────────────────────────

// POST /api/store-builder/intake
// Production-facing paid entry point for managed store builds.
// Validates the intake payload, creates a store_builds record, and sends
// an acknowledgment email to the submitter.
router.post('/intake', async (req, res) => {
  const {
    business_brief,
    contact_email,
    tier,
    contact_name,
    website_url,
    brand_examples,
    payment_ref,
    notes,
  } = req.body;

  // Validate required fields
  const errors = {};
  if (!business_brief || typeof business_brief !== 'string') {
    errors.business_brief = 'Required';
  } else if (business_brief.trim().length < BRIEF_MIN_LENGTH) {
    errors.business_brief = `Must be at least ${BRIEF_MIN_LENGTH} characters`;
  }
  if (!contact_email) {
    errors.contact_email = 'Required';
  } else if (!isValidEmail(contact_email)) {
    errors.contact_email = 'Must be a valid email address';
  }
  if (!tier) {
    errors.tier = 'Required';
  } else if (!VALID_TIERS.includes(tier)) {
    errors.tier = `Must be one of: ${VALID_TIERS.join(', ')}`;
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ error: 'Validation failed', fields: errors });
  }

  const intakePayload = {
    business_brief: business_brief.trim(),
    contact_email,
    tier,
    ...(contact_name && { contact_name }),
    ...(website_url && { website_url }),
    ...(brand_examples && { brand_examples }),
    ...(payment_ref && { payment_ref }),
    ...(notes && { notes }),
  };

  try {
    const buildId = await storeBuildService.createBuild(intakePayload, tier);

    // Fire-and-forget acknowledgment email — non-fatal
    emailService.sendEmail({
      to: contact_email,
      subject: 'Your AI store build request received',
      html: `<p>Hi${contact_name ? ' ' + contact_name : ''},</p>
<p>We've received your AI store build request. Here are your details:</p>
<ul>
  <li><strong>Build ID:</strong> ${buildId}</li>
  <li><strong>Tier:</strong> ${tier}</li>
  <li><strong>Estimated delivery:</strong> 48 hours</li>
</ul>
<p>We'll be in touch with updates. Keep your Build ID for reference.</p>`,
      text: `Your AI store build request was received.\nBuild ID: ${buildId}\nTier: ${tier}\nEstimated delivery: 48h`,
    }).catch(err => {
      console.warn('[Intake] Acknowledgment email failed:', err.message);
    });

    res.status(201).json({
      success: true,
      build_id: buildId,
      status: 'intake',
      estimated_delivery: '48h',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────────
// Store builds (managed-service commercialization)
// ──────────────────────────────────────────────────

// POST /api/store-builder/builds
// Create a new build record. Used by the intake API (task 043).
// Body: { intake_payload: {...}, tier: 'builder'|'pro'|'white_label' }
router.post('/builds', async (req, res) => {
  const { intake_payload, tier } = req.body;
  if (!intake_payload) {
    return res.status(400).json({ error: 'intake_payload required' });
  }
  try {
    const buildId = await storeBuildService.createBuild(intake_payload, tier);
    const build = await storeBuildService.getBuild(buildId);
    res.status(201).json({ success: true, build_id: buildId, status: 'intake', build });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/store-builder/builds
// List all builds. Admin only.
// Query: ?status=intake|planning|building|qa|delivered|failed
router.get('/builds', authenticateAdmin, async (req, res) => {
  const { status, limit } = req.query;
  try {
    const filters = {};
    if (status) filters.status = status;
    if (limit) filters.limit = parseInt(limit, 10);
    const builds = await storeBuildService.listBuilds(filters);
    res.json({ success: true, builds });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/store-builder/builds/:id
// Get a single build's status. Public (no auth) so customers can check their build.
router.get('/builds/:id', async (req, res) => {
  try {
    const build = await storeBuildService.getBuild(req.params.id);
    if (!build) return res.status(404).json({ error: 'Build not found' });
    // Expose only safe subset to unauthenticated callers
    const { id, status, tier, created_at, updated_at, delivered_at } = build;
    res.json({ success: true, build: { id, status, tier, created_at, updated_at, delivered_at } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/store-builder/builds/:id/status
// Update build status. Admin only.
// Body: { status: '...', notes: '...' }
router.patch('/builds/:id/status', authenticateAdmin, async (req, res) => {
  const { status, notes } = req.body;
  if (!status) return res.status(400).json({ error: 'status required' });
  try {
    await storeBuildService.updateStatus(req.params.id, status, notes);
    const build = await storeBuildService.getBuild(req.params.id);
    res.json({ success: true, build });
  } catch (err) {
    if (err.message.includes('Invalid status') || err.message.includes('Build not found')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
