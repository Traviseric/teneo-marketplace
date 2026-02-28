// Funnel API Routes
// Handles funnel save, load, deploy operations

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;

// Shared database connection
const db = require('../../../marketplace/backend/database/database');
const { authenticateAdmin } = require('../../../marketplace/backend/middleware/auth');

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
