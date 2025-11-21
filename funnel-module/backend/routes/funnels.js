// Funnel API Routes
// Handles funnel save, load, deploy operations

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;

// Funnel service (will create next)
// const funnelService = require('../services/funnelService');

/**
 * Save funnel draft
 * POST /api/funnels/save-draft
 * Body: { userId, funnelName, template, variables, context }
 */
router.post('/save-draft', async (req, res) => {
  try {
    const { userId, funnelName, template, variables, context } = req.body;

    // Validate
    if (!userId || !funnelName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // For now, just return success
    // TODO: Integrate with database when funnelService is ready
    const draft = {
      id: Date.now(),
      userId,
      funnelName,
      template,
      variables,
      context,
      updatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      draft: draft,
      message: 'Draft saved successfully'
    });
  } catch (error) {
    console.error('Save draft error:', error);
    res.status(500).json({ error: 'Failed to save draft' });
  }
});

/**
 * Get user's draft funnel
 * GET /api/funnels/get-draft?userId=1
 */
router.get('/get-draft', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    // TODO: Get from database when ready
    // For now, return null (frontend will use localStorage)
    res.json({
      success: true,
      draft: null,
      message: 'No draft found (using localStorage fallback)'
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
 */
router.post('/deploy', async (req, res) => {
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
    const processedHTML = await processTemplate(template, variables);

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

    // TODO: Get from database
    // For now, scan funnels directory
    const funnelsDir = path.join(__dirname, '..', '..', '..', 'marketplace', 'frontend', 'funnels');

    try {
      const dirs = await fs.readdir(funnelsDir);
      const funnels = [];

      for (const dir of dirs) {
        const metadataPath = path.join(funnelsDir, dir, 'funnel.json');
        try {
          const metadata = await fs.readFile(metadataPath, 'utf-8');
          const funnel = JSON.parse(metadata);

          // Only return this user's funnels
          if (funnel.userId == userId) {
            funnels.push({
              slug: funnel.slug,
              name: funnel.funnelName,
              deployedAt: funnel.deployedAt,
              url: `${process.env.SITE_URL || 'http://localhost:3001'}/funnels/${funnel.slug}`
            });
          }
        } catch (err) {
          // Skip funnels without metadata
          continue;
        }
      }

      res.json({
        success: true,
        funnels: funnels,
        count: funnels.length
      });
    } catch (error) {
      // Funnels directory doesn't exist yet
      res.json({
        success: true,
        funnels: [],
        count: 0
      });
    }
  } catch (error) {
    console.error('List funnels error:', error);
    res.status(500).json({ error: 'Failed to list funnels' });
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
