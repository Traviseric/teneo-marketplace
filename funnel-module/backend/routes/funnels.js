// Funnel API Routes
// Handles funnel save, load, deploy operations

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;

// Shared database connection
const db = require('../../../marketplace/backend/database/database');
const { authenticateAdmin } = require('../../../marketplace/backend/middleware/auth');
const { requireAuth } = require('../../../marketplace/backend/routes/auth');

// DB helpers
function dbRun(sql, params) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) { if (err) reject(err); else resolve(this); });
    });
}
function dbGet(sql, params) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => { if (err) reject(err); else resolve(row); });
    });
}
function dbAll(sql, params) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => { if (err) reject(err); else resolve(rows); });
    });
}

/**
 * Save funnel draft
 * POST /api/funnels/save-draft
 * Body: { userId, funnelName, template, variables, context }
 * Auth: admin token required
 */
router.post('/save-draft', authenticateAdmin, async (req, res) => {
  try {
    const { userId, funnelName, template, variables, context } = req.body;

    if (!userId || !funnelName) {
      return res.status(400).json({ error: 'Missing required fields: userId and funnelName' });
    }

    const variablesJson = typeof variables === 'string' ? variables : JSON.stringify(variables || {});
    const contextJson = typeof context === 'string' ? context : JSON.stringify(context || {});

    const result = await dbRun(
      `INSERT INTO funnel_drafts (user_id, funnel_name, template, variables, context, updated_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id, funnel_name)
       DO UPDATE SET template = excluded.template, variables = excluded.variables,
                     context = excluded.context, updated_at = CURRENT_TIMESTAMP`,
      [userId, funnelName, template || '', variablesJson, contextJson]
    );

    const saved = await dbGet('SELECT * FROM funnel_drafts WHERE user_id = ? AND funnel_name = ?', [userId, funnelName]);

    res.json({
      success: true,
      draft: {
        id: saved.id,
        userId: saved.user_id,
        funnelName: saved.funnel_name,
        template: saved.template,
        variables: safeParseJson(saved.variables),
        context: safeParseJson(saved.context),
        updatedAt: saved.updated_at
      },
      message: 'Draft saved successfully'
    });
  } catch (error) {
    console.error('Save draft error:', error);
    res.status(500).json({ error: 'Failed to save draft' });
  }
});

/**
 * Get user's draft funnel(s)
 * GET /api/funnels/get-draft?userId=1[&funnelName=My+Funnel]
 */
router.get('/get-draft', async (req, res) => {
  try {
    const { userId, funnelName } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    let draft;
    if (funnelName) {
      draft = await dbGet(
        'SELECT * FROM funnel_drafts WHERE user_id = ? AND funnel_name = ?',
        [userId, funnelName]
      );
    } else {
      // Return most recently updated draft for this user
      draft = await dbGet(
        'SELECT * FROM funnel_drafts WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1',
        [userId]
      );
    }

    if (!draft) {
      return res.json({ success: true, draft: null, message: 'No draft found' });
    }

    res.json({
      success: true,
      draft: {
        id: draft.id,
        userId: draft.user_id,
        funnelName: draft.funnel_name,
        template: draft.template,
        variables: safeParseJson(draft.variables),
        context: safeParseJson(draft.context),
        updatedAt: draft.updated_at
      }
    });
  } catch (error) {
    console.error('Get draft error:', error);
    res.status(500).json({ error: 'Failed to get draft' });
  }
});

/**
 * Deploy funnel to production
 * POST /api/funnels/deploy
 * Body: { userId, funnelName, template, variables }
 * Auth: admin token required
 */
router.post('/deploy', authenticateAdmin, async (req, res) => {
  try {
    const { userId, funnelName, template, variables } = req.body;

    // Validate
    if (!userId || !funnelName || !template || !variables) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create slug from funnel name
    const slug = sanitizeSlug(funnelName);

    // Create funnel directory
    const funnelDir = path.join(__dirname, '..', '..', '..', 'marketplace', 'frontend', 'funnels', slug);
    await fs.mkdir(funnelDir, { recursive: true });

    // Process template with variables
    let processedHTML = await processTemplate(template, variables);

    // Inject funnel tracker before </body>
    const trackerInjection = `  <meta name="funnel-id" content="${slug}">\n  <script src="/js/funnel-tracker.js"></script>\n`;
    if (processedHTML.includes('</body>')) {
      processedHTML = processedHTML.replace('</body>', trackerInjection + '</body>');
    } else {
      processedHTML += '\n' + trackerInjection;
    }

    // Save HTML file
    await fs.writeFile(path.join(funnelDir, 'index.html'), processedHTML);

    // Save metadata
    const metadata = {
      userId,
      funnelName,
      template,
      variables,
      deployedAt: new Date().toISOString(),
      slug
    };
    await fs.writeFile(
      path.join(funnelDir, 'funnel.json'),
      JSON.stringify(metadata, null, 2)
    );

    // Track deployment in database
    try {
      // Check if a funnel record with this slug already exists
      const existing = await dbGet('SELECT id FROM funnels WHERE slug = ? AND user_id = ?', [slug, userId]);
      if (existing) {
        await dbRun('UPDATE funnels SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['published', existing.id]);
      } else {
        await dbRun(
          'INSERT INTO funnels (brand_id, name, slug, status, user_id) VALUES (?, ?, ?, ?, ?)',
          [variables.brandId || 'default', funnelName, slug, 'published', userId]
        );
      }
    } catch (dbErr) {
      // Non-fatal: log but don't fail the deploy
      console.warn('Failed to track funnel in DB:', dbErr.message);
    }

    // Build URL
    const baseUrl = process.env.SITE_URL || 'http://localhost:3001';
    const url = `${baseUrl}/funnels/${slug}`;

    res.json({
      success: true,
      url: url,
      slug: slug,
      message: 'Funnel deployed successfully!'
    });
  } catch (error) {
    console.error('Deploy error:', error);
    res.status(500).json({
      error: 'Failed to deploy funnel',
      details: error.message
    });
  }
});

/**
 * Export funnel as ZIP
 * POST /api/funnels/export
 * Body: { template, variables }
 */
router.post('/export', async (req, res) => {
  try {
    const { template, variables } = req.body;

    if (!template || !variables) {
      return res.status(400).json({ error: 'Missing template or variables' });
    }

    // Process template
    const processedHTML = await processTemplate(template, variables);

    // For now, return HTML
    // TODO: Create ZIP file when JSZip is available server-side
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizeSlug(variables.BOOK_TITLE || 'funnel')}.html"`);
    res.send(processedHTML);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export funnel' });
  }
});

/**
 * List user's deployed funnels
 * GET /api/funnels/list?userId=1
 */
router.get('/list', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    // Query database for this user's funnels
    const dbFunnels = await dbAll(
      'SELECT * FROM funnels WHERE user_id = ? ORDER BY updated_at DESC',
      [userId]
    );

    const baseUrl = process.env.SITE_URL || 'http://localhost:3001';

    // Fetch stats for all funnels in one query
    const slugs = dbFunnels.map(f => f.slug);
    let eventCounts = {};
    if (slugs.length > 0) {
      const placeholders = slugs.map(() => '?').join(', ');
      const eventRows = await dbAll(
        `SELECT funnel_id, event_type, COUNT(*) as count
         FROM funnel_events
         WHERE funnel_id IN (${placeholders})
         GROUP BY funnel_id, event_type`,
        slugs
      );
      eventRows.forEach(row => {
        if (!eventCounts[row.funnel_id]) {
          eventCounts[row.funnel_id] = { pageviews: 0, cta_clicks: 0, checkout_starts: 0, purchases: 0 };
        }
        const s = eventCounts[row.funnel_id];
        if (row.event_type === 'pageview')       s.pageviews       = row.count;
        if (row.event_type === 'cta_click')      s.cta_clicks      = row.count;
        if (row.event_type === 'checkout_start') s.checkout_starts = row.count;
        if (row.event_type === 'purchase')       s.purchases       = row.count;
      });
    }

    const funnels = dbFunnels.map(f => {
      const s = eventCounts[f.slug] || { pageviews: 0, cta_clicks: 0, checkout_starts: 0, purchases: 0 };
      s.conversion_rate = s.pageviews > 0 ? ((s.purchases / s.pageviews) * 100).toFixed(2) : '0.00';
      return {
        id: f.id,
        slug: f.slug,
        name: f.name,
        status: f.status,
        updatedAt: f.updated_at,
        url: `${baseUrl}/funnels/${f.slug}`,
        stats: s
      };
    });

    res.json({ success: true, funnels, count: funnels.length });
  } catch (error) {
    console.error('List funnels error:', error);
    res.status(500).json({ error: 'Failed to list funnels' });
  }
});

/**
 * Track a funnel conversion event (public — called by funnel-tracker.js)
 * POST /api/funnels/events
 * Body: { funnelId, pageSlug, eventType, sessionId, metadata }
 */
const VALID_EVENT_TYPES = ['pageview', 'cta_click', 'checkout_start', 'purchase'];
router.post('/events', async (req, res) => {
  try {
    const { funnelId, pageSlug, eventType, sessionId, metadata } = req.body;

    if (!funnelId || !eventType || !VALID_EVENT_TYPES.includes(eventType)) {
      return res.status(400).json({ error: 'Missing or invalid funnelId / eventType' });
    }

    const metadataJson = typeof metadata === 'string' ? metadata : JSON.stringify(metadata || {});

    await dbRun(
      `INSERT INTO funnel_events (funnel_id, page_slug, event_type, session_id, metadata)
       VALUES (?, ?, ?, ?, ?)`,
      [funnelId, pageSlug || funnelId, eventType, sessionId || null, metadataJson]
    );

    // Update conversion_rate in funnels table after purchase events
    if (eventType === 'purchase') {
      try {
        const counts = await dbAll(
          `SELECT event_type, COUNT(*) as count FROM funnel_events WHERE funnel_id = ? GROUP BY event_type`,
          [funnelId]
        );
        let pageviews = 0;
        let purchases = 0;
        counts.forEach(row => {
          if (row.event_type === 'pageview') pageviews = row.count;
          if (row.event_type === 'purchase') purchases = row.count;
        });
        const rate = pageviews > 0 ? (purchases / pageviews) * 100 : 0;
        await dbRun(
          `UPDATE funnels SET conversion_rate = ?, updated_at = CURRENT_TIMESTAMP WHERE slug = ?`,
          [parseFloat(rate.toFixed(4)), funnelId]
        );
      } catch (rateErr) {
        // Non-fatal
        console.warn('[funnels] Failed to update conversion_rate:', rateErr.message);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Funnel event tracking error:', error);
    res.status(500).json({ error: 'Failed to record event' });
  }
});

/**
 * Get conversion stats for a funnel
 * GET /api/funnels/stats/:funnelId
 * Auth: admin token required
 */
router.get('/stats/:funnelId', authenticateAdmin, async (req, res) => {
  try {
    const { funnelId } = req.params;

    const rows = await dbAll(
      `SELECT event_type, COUNT(*) as count
       FROM funnel_events
       WHERE funnel_id = ?
       GROUP BY event_type`,
      [funnelId]
    );

    const stats = { pageviews: 0, cta_clicks: 0, checkout_starts: 0, purchases: 0 };
    rows.forEach(row => {
      if (row.event_type === 'pageview')       stats.pageviews       = row.count;
      if (row.event_type === 'cta_click')      stats.cta_clicks      = row.count;
      if (row.event_type === 'checkout_start') stats.checkout_starts = row.count;
      if (row.event_type === 'purchase')       stats.purchases       = row.count;
    });

    stats.conversion_rate = stats.pageviews > 0
      ? ((stats.purchases / stats.pageviews) * 100).toFixed(2)
      : '0.00';

    res.json({ success: true, funnelId, stats });
  } catch (error) {
    console.error('Funnel stats error:', error);
    res.status(500).json({ error: 'Failed to get funnel stats' });
  }
});

/**
 * Delete deployed funnel
 * DELETE /api/funnels/:slug
 */
router.delete('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const funnelDir = path.join(__dirname, '..', '..', '..', 'marketplace', 'frontend', 'funnels', slug);

    // Check if funnel exists
    try {
      const metadataPath = path.join(funnelDir, 'funnel.json');
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));

      // Verify ownership
      if (metadata.userId != userId) {
        return res.status(403).json({ error: 'Not authorized to delete this funnel' });
      }

      // Delete directory
      await fs.rm(funnelDir, { recursive: true, force: true });

      // Remove from DB (non-fatal if record not found)
      await dbRun(
        'DELETE FROM funnels WHERE slug = ? AND user_id = ?',
        [slug, userId]
      ).catch((dbErr) => console.warn('[funnels] DB delete failed:', dbErr.message));

      res.json({
        success: true,
        message: 'Funnel deleted successfully'
      });
    } catch (error) {
      res.status(404).json({ error: 'Funnel not found' });
    }
  } catch (error) {
    console.error('Delete funnel error:', error);
    res.status(500).json({ error: 'Failed to delete funnel' });
  }
});

/**
 * Subscribe to a funnel (email opt-in) — auto-enrolls into linked email sequence
 * POST /api/funnels/:id/subscribe
 * Body: { email, name }
 * Public endpoint
 */
router.post('/:id/subscribe', async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });

    const funnel = await dbGet('SELECT * FROM funnels WHERE id = ?', [req.params.id]);
    if (!funnel) return res.status(404).json({ error: 'Funnel not found' });

    const crypto = require('crypto');
    const confirmToken = crypto.randomBytes(32).toString('hex');
    const unsubscribeToken = crypto.randomBytes(32).toString('hex');

    // Upsert subscriber
    let subscriberId;
    const existing = await dbGet('SELECT id FROM subscribers WHERE email = ?', [email]);
    if (existing) {
      subscriberId = existing.id;
    } else {
      const result = await dbRun(
        `INSERT INTO subscribers (email, name, source, confirm_token, unsubscribe_token, status)
         VALUES (?, ?, ?, ?, ?, 'active')`,
        [email, name || null, `funnel:${funnel.slug || funnel.id}`, confirmToken, unsubscribeToken]
      );
      subscriberId = result.lastID;
      // Initialize activity record (non-fatal)
      dbRun(
        `INSERT OR IGNORE INTO subscriber_activity (subscriber_id) VALUES (?)`,
        [subscriberId]
      ).catch(() => {});
    }

    // Auto-enroll in linked email sequence if configured
    let sequenceEnrolled = false;
    if (funnel.sequence_id) {
      try {
        const seq = await dbGet(
          `SELECT id FROM email_sequences WHERE id = ? AND active = 1`,
          [funnel.sequence_id]
        );
        if (seq) {
          const alreadyIn = await dbGet(
            `SELECT id FROM subscriber_sequences
             WHERE subscriber_id = ? AND sequence_id = ? AND status = 'active'`,
            [subscriberId, funnel.sequence_id]
          );
          if (!alreadyIn) {
            await dbRun(
              `INSERT INTO subscriber_sequences (subscriber_id, sequence_id, status)
               VALUES (?, ?, 'active')`,
              [subscriberId, funnel.sequence_id]
            );
          }
          sequenceEnrolled = true;
        }
      } catch (seqErr) {
        console.warn('[funnels] sequence enrollment failed:', seqErr.message);
      }
    }

    // Track opt-in as a funnel event
    await dbRun(
      `INSERT INTO funnel_events (funnel_id, page_slug, event_type, session_id, metadata)
       VALUES (?, ?, 'opt_in', NULL, ?)`,
      [funnel.slug || String(funnel.id), funnel.slug || String(funnel.id), JSON.stringify({ email })]
    );

    res.json({ success: true, subscriberId, sequenceEnrolled });
  } catch (error) {
    console.error('[funnels] subscribe error:', error);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

/**
 * Update funnel settings (sequence_id, name, status)
 * PATCH /api/funnels/:id
 * Body: { sequence_id?, name?, status? }
 * Auth: admin required
 */
router.patch('/:id', authenticateAdmin, async (req, res) => {
  try {
    const updates = [];
    const params = [];

    if (req.body.sequence_id !== undefined) {
      updates.push('sequence_id = ?');
      params.push(req.body.sequence_id);
    }
    if (req.body.name !== undefined) {
      updates.push('name = ?');
      params.push(req.body.name);
    }
    if (req.body.status !== undefined) {
      updates.push('status = ?');
      params.push(req.body.status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.params.id);

    await dbRun(
      `UPDATE funnels SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    res.json({ success: true });
  } catch (error) {
    console.error('[funnels] patch error:', error);
    res.status(500).json({ error: 'Failed to update funnel' });
  }
});

/**
 * Generate a funnel config from a natural-language brief (AI)
 * POST /api/funnels/generate
 * Body: { brief }
 * Auth: authenticated user required
 */
router.post('/generate', requireAuth, async (req, res) => {
  try {
    const { brief } = req.body;
    if (!brief || brief.trim().length < 10) {
      return res.status(400).json({ error: 'brief must be at least 10 characters' });
    }
    const { generateFunnel } = require('../../../marketplace/backend/services/aiFunnelBuilderService');
    const funnel = await generateFunnel(brief.trim());
    res.json({ success: true, funnel });
  } catch (error) {
    console.error('[funnels] generate error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Generate funnel from brief AND persist to DB (creates funnel + email sequence)
 * POST /api/funnels/generate-and-save
 * Body: { brief }
 * Auth: authenticated user required
 */
router.post('/generate-and-save', requireAuth, async (req, res) => {
  try {
    const { brief } = req.body;
    const userId = req.session.userId || req.session.user_id || req.body.userId || 'anonymous';
    if (!brief || brief.trim().length < 10) {
      return res.status(400).json({ error: 'brief must be at least 10 characters' });
    }

    const { generateFunnel } = require('../../../marketplace/backend/services/aiFunnelBuilderService');
    const config = await generateFunnel(brief.trim());

    // Persist funnel record
    const slug = sanitizeSlug(config.headline || 'ai-funnel-' + Date.now());
    const funnelResult = await dbRun(
      `INSERT INTO funnels (brand_id, name, slug, status, user_id, config_json)
       VALUES (?, ?, ?, 'draft', ?, ?)`,
      ['default', config.headline || 'AI Funnel', slug, userId, JSON.stringify(config)]
    );
    const funnelId = funnelResult.lastID;

    // Persist email sequence if provided
    let sequenceId = null;
    if (config.email_sequence && config.email_sequence.length > 0) {
      try {
        const seqName = `${config.headline} Sequence (${funnelId})`;
        const seqResult = await dbRun(
          `INSERT INTO email_sequences (name, description, trigger_event, active)
           VALUES (?, ?, 'funnel_optin', 1)`,
          [seqName, config.lead_magnet_description || brief.trim().slice(0, 120)]
        );
        sequenceId = seqResult.lastID;

        // Create email_templates + sequence_emails for each email in the sequence
        for (let i = 0; i < config.email_sequence.length; i++) {
          const email = config.email_sequence[i];
          const tplName = `${seqName} - Email ${i + 1} (${Date.now()})`;
          const tplResult = await dbRun(
            `INSERT INTO email_templates (name, subject, body_html, preview_text, category)
             VALUES (?, ?, ?, ?, 'sequence')`,
            [tplName, email.subject || `Email ${i + 1}`, email.body || email.outline || '', email.preview_text || '']
          );
          const templateId = tplResult.lastID;

          await dbRun(
            `INSERT INTO sequence_emails (sequence_id, order_number, delay_days, template_id, active)
             VALUES (?, ?, ?, ?, 1)`,
            [sequenceId, i + 1, email.delay_days || i * 2, templateId]
          );
        }

        // Link sequence to funnel
        await dbRun('UPDATE funnels SET sequence_id = ? WHERE id = ?', [sequenceId, funnelId]);
      } catch (seqErr) {
        console.warn('[funnels] sequence persist failed:', seqErr.message);
      }
    }

    res.status(201).json({ success: true, funnelId, slug, sequenceId, config });
  } catch (error) {
    console.error('[funnels] generate-and-save error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper: Safe JSON parse (returns original value on failure)
function safeParseJson(str) {
  if (!str || typeof str !== 'string') return str;
  try { return JSON.parse(str); } catch (e) { return str; }
}

// Helper: Sanitize slug
function sanitizeSlug(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

// Helper: Process template with variables
async function processTemplate(templateName, variables) {
  try {
    // Map template names to file paths
    const templatePaths = {
      'book-sales-page': path.join(__dirname, '..', '..', '..', 'marketplace', 'frontend', 'brands', 'master-templates', 'book-sales-page.html'),
      'story-driven': path.join(__dirname, '..', '..', '..', 'marketplace', 'frontend', 'brands', 'master-templates', 'book-sales-page.html'),
      'reader-magnet': path.join(__dirname, '..', '..', '..', 'marketplace', 'frontend', 'brands', 'master-templates', 'book-sales-page.html'),
      'direct-sale': path.join(__dirname, '..', '..', '..', 'marketplace', 'frontend', 'brands', 'master-templates', 'book-sales-page.html')
    };

    const templatePath = templatePaths[templateName];

    if (!templatePath) {
      throw new Error(`Unknown template: ${templateName}`);
    }

    // Read template
    let html = await fs.readFile(templatePath, 'utf-8');

    // Replace variables
    Object.entries(variables).forEach(([key, value]) => {
      // Replace {{VAR}} and {{VAR|default}}
      const regex = new RegExp(`{{${key}(\\|[^}]*)?}}`, 'g');
      html = html.replace(regex, value || '');
    });

    // Clean up remaining variables with defaults
    html = html.replace(/{{([^|]+)\|([^}]+)}}/g, '$2');

    // Remove unmatched variables
    html = html.replace(/{{[^}]+}}/g, '');

    return html;
  } catch (error) {
    console.error('Template processing error:', error);
    throw error;
  }
}

module.exports = router;
