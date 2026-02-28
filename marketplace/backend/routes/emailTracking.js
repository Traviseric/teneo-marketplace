/**
 * Email Open/Click Tracking Routes
 *
 * POST /api/email/subscribe             - Newsletter subscribe (stores in subscribers table)
 * GET  /api/email/track/open/:sendId    - Returns 1×1 GIF, logs open event
 * GET  /api/email/track/click/:sendId?url=<encoded>  - Logs click, redirects
 * GET  /api/email/stats/:sendId         - Per-send open/click stats (admin)
 */

const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../database/database');
const { authenticateAdmin } = require('../middleware/auth');

// 1×1 transparent GIF (standard email tracking pixel)
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

// Promise wrappers for raw sqlite3 (matches pattern in courseRoutes.js)
function dbGet(sql, params) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => { if (err) reject(err); else resolve(row); });
  });
}

function dbRun(sql, params) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) { if (err) reject(err); else resolve(this); });
  });
}

function dbAll(sql, params) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => { if (err) reject(err); else resolve(rows || []); });
  });
}

/**
 * POST /api/email/subscribe
 * Stores a newsletter subscriber in the subscribers table.
 * Body: { email, name?, source? }
 */
router.post('/subscribe', async (req, res) => {
  const { email, name = '', source = 'newsletter_widget' } = req.body || {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: 'Valid email required' });
  }

  try {
    const confirmToken = crypto.randomBytes(32).toString('hex');
    const unsubscribeToken = crypto.randomBytes(32).toString('hex');
    const ip = req.ip || null;
    const ua = req.headers['user-agent'] || null;

    await dbRun(
      `INSERT INTO subscribers (email, name, source, ip_address, user_agent, confirm_token, unsubscribe_token, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        email.trim().toLowerCase(),
        name.trim() || null,
        source,
        ip,
        ua,
        confirmToken,
        unsubscribeToken
      ]
    );

    res.json({ success: true, message: 'Subscribed successfully' });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ success: false, error: 'Email already subscribed' });
    }
    console.error('[emailTracking] subscribe error:', err.message);
    res.status(500).json({ success: false, error: 'Subscription failed. Please try again.' });
  }
});

/**
 * GET /api/email/track/open/:sendId
 * Records an open event in the DB and returns a 1×1 transparent GIF.
 * Never returns an error response — always serves the pixel to avoid
 * breaking email clients.
 */
router.get('/track/open/:sendId', async (req, res) => {
  res.set({
    'Content-Type': 'image/gif',
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

  try {
    const sendId = parseInt(req.params.sendId, 10);
    if (!isNaN(sendId)) {
      const ipAddress = req.ip || null;
      const userAgent = req.headers['user-agent'] || null;

      // Log event (fire-and-forget; errors are caught silently)
      const send = await dbGet(
        'SELECT id, subscriber_id FROM email_sends WHERE id = ?',
        [sendId]
      ).catch(() => null);

      if (send) {
        await dbRun(
          `INSERT INTO email_events (event_type, send_id, subscriber_id, ip_address, user_agent)
           VALUES ('open', ?, ?, ?, ?)`,
          [sendId, send.subscriber_id || null, ipAddress, userAgent]
        ).catch(() => {});

        // Mark first open on the send record
        await dbRun(
          `UPDATE email_sends SET opened_at = CURRENT_TIMESTAMP
           WHERE id = ? AND opened_at IS NULL`,
          [sendId]
        ).catch(() => {});

        // Increment subscriber activity counters
        if (send.subscriber_id) {
          await dbRun(
            `UPDATE subscriber_activity
             SET total_emails_opened = total_emails_opened + 1,
                 last_email_opened_at = CURRENT_TIMESTAMP
             WHERE subscriber_id = ?`,
            [send.subscriber_id]
          ).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.error('[emailTracking] open pixel error:', err.message);
  }

  res.end(TRACKING_PIXEL);
});

/**
 * GET /api/email/track/click/:sendId?url=<encoded>
 * Records a click event in the DB then issues a 302 redirect.
 * Validates the destination URL to prevent open-redirect abuse.
 */
router.get('/track/click/:sendId', async (req, res) => {
  const rawUrl = req.query.url;

  // Validate URL — only allow http/https destinations (no javascript:, data:, etc.)
  let safeUrl = null;
  if (rawUrl) {
    try {
      const decoded = decodeURIComponent(rawUrl);
      const parsed = new URL(decoded);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        safeUrl = decoded;
      }
    } catch {
      // Invalid URL — fall through to 400
    }
  }

  if (!safeUrl) {
    return res.status(400).json({ error: 'Missing or invalid url parameter' });
  }

  try {
    const sendId = parseInt(req.params.sendId, 10);
    if (!isNaN(sendId)) {
      const ipAddress = req.ip || null;
      const userAgent = req.headers['user-agent'] || null;

      const send = await dbGet(
        'SELECT id, subscriber_id FROM email_sends WHERE id = ?',
        [sendId]
      ).catch(() => null);

      if (send) {
        await dbRun(
          `INSERT INTO email_events (event_type, send_id, subscriber_id, url, ip_address, user_agent)
           VALUES ('click', ?, ?, ?, ?, ?)`,
          [sendId, send.subscriber_id || null, safeUrl, ipAddress, userAgent]
        ).catch(() => {});

        // Mark first click on the send record
        await dbRun(
          `UPDATE email_sends SET clicked_at = CURRENT_TIMESTAMP
           WHERE id = ? AND clicked_at IS NULL`,
          [sendId]
        ).catch(() => {});

        // Increment subscriber activity counters
        if (send.subscriber_id) {
          await dbRun(
            `UPDATE subscriber_activity
             SET total_emails_clicked = total_emails_clicked + 1,
                 last_email_clicked_at = CURRENT_TIMESTAMP
             WHERE subscriber_id = ?`,
            [send.subscriber_id]
          ).catch(() => {});
        }

        // Increment email_links aggregate click count
        await dbRun(
          `UPDATE email_links
           SET clicks = clicks + 1,
               last_clicked_at = CURRENT_TIMESTAMP,
               first_clicked_at = COALESCE(first_clicked_at, CURRENT_TIMESTAMP)
           WHERE send_id = ? AND url = ?`,
          [sendId, safeUrl]
        ).catch(() => {});
      }
    }
  } catch (err) {
    console.error('[emailTracking] click tracking error:', err.message);
  }

  res.redirect(302, safeUrl);
});

/**
 * GET /api/email/stats/:sendId  (admin only)
 * Returns open_count, click_count, unique_opens, unique_clicks for a send.
 */
router.get('/stats/:sendId', authenticateAdmin, async (req, res) => {
  const sendId = parseInt(req.params.sendId, 10);
  if (isNaN(sendId)) {
    return res.status(400).json({ error: 'Invalid sendId' });
  }

  try {
    const [send, openCount, clickCount, uniqueOpens, uniqueClicks] = await Promise.all([
      dbGet(
        'SELECT id, to_email, subject, status, sent_at, opened_at, clicked_at FROM email_sends WHERE id = ?',
        [sendId]
      ),
      dbGet(
        `SELECT COUNT(*) AS count FROM email_events WHERE send_id = ? AND event_type = 'open'`,
        [sendId]
      ),
      dbGet(
        `SELECT COUNT(*) AS count FROM email_events WHERE send_id = ? AND event_type = 'click'`,
        [sendId]
      ),
      dbGet(
        `SELECT COUNT(DISTINCT ip_address) AS count FROM email_events WHERE send_id = ? AND event_type = 'open'`,
        [sendId]
      ),
      dbGet(
        `SELECT COUNT(DISTINCT ip_address) AS count FROM email_events WHERE send_id = ? AND event_type = 'click'`,
        [sendId]
      )
    ]);

    res.json({
      success: true,
      sendId,
      send: send || null,
      stats: {
        open_count: openCount ? openCount.count : 0,
        click_count: clickCount ? clickCount.count : 0,
        unique_opens: uniqueOpens ? uniqueOpens.count : 0,
        unique_clicks: uniqueClicks ? uniqueClicks.count : 0
      }
    });
  } catch (err) {
    console.error('[emailTracking] stats error:', err);
    res.status(500).json({ error: 'Failed to fetch email stats' });
  }
});

module.exports = router;
