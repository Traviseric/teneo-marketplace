/**
 * Email Marketing Management Routes
 *
 * All operations use the shared DB adapter (SQLite local / Supabase in production).
 *
 * Subscriber Management (admin):
 *   GET  /api/email-marketing/subscribers          - list subscribers with pagination
 *   GET  /api/email-marketing/subscribers/:id      - get subscriber details
 *   DELETE /api/email-marketing/subscribers/:id    - remove subscriber
 *
 * Email Sequences (admin):
 *   GET  /api/email-marketing/sequences            - list sequences
 *   POST /api/email-marketing/sequences            - create sequence
 *   PUT  /api/email-marketing/sequences/:id        - update sequence
 *   DELETE /api/email-marketing/sequences/:id      - delete sequence
 *   GET  /api/email-marketing/sequences/:id/emails - list sequence emails
 *   POST /api/email-marketing/sequences/:id/emails - add email to sequence
 *
 * Broadcasts (admin):
 *   GET  /api/email-marketing/broadcasts           - list broadcasts
 *   POST /api/email-marketing/broadcasts           - create broadcast
 *
 * Unsubscribe (public):
 *   GET  /api/email-marketing/unsubscribe/:token   - unsubscribe via token link
 */

const express = require('express');
const router = express.Router();
const db = require('../database/database');
const { authenticateAdmin } = require('../middleware/auth');

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

// ─── Subscriber Management ───────────────────────────────────────────────────

// GET /api/email-marketing/subscribers
router.get('/subscribers', authenticateAdmin, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
        const offset = parseInt(req.query.offset, 10) || 0;
        const status = req.query.status; // optional filter: active, unsubscribed, etc.
        const search = req.query.search;

        let sql = 'SELECT id, email, name, source, status, confirmed, created_at, updated_at FROM subscribers WHERE 1=1';
        const params = [];

        if (status) {
            sql += ' AND status = ?';
            params.push(status);
        }
        if (search) {
            sql += ' AND (email LIKE ? OR name LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        const countSql = sql.replace('SELECT id, email, name, source, status, confirmed, created_at, updated_at', 'SELECT COUNT(*) as total');
        const [countRow, subscribers] = await Promise.all([
            dbGet(countSql, params),
            dbAll(sql + ' ORDER BY created_at DESC LIMIT ? OFFSET ?', [...params, limit, offset])
        ]);

        res.json({
            success: true,
            total: countRow ? countRow.total : 0,
            subscribers,
            limit,
            offset
        });
    } catch (error) {
        console.error('[emailMarketing] list subscribers error:', error);
        res.status(500).json({ success: false, error: 'Failed to list subscribers' });
    }
});

// GET /api/email-marketing/subscribers/:id
router.get('/subscribers/:id', authenticateAdmin, async (req, res) => {
    try {
        const subscriber = await dbGet(
            'SELECT id, email, name, source, status, confirmed, created_at, updated_at FROM subscribers WHERE id = ?',
            [req.params.id]
        );
        if (!subscriber) return res.status(404).json({ success: false, error: 'Subscriber not found' });

        const [tags, segments, activity] = await Promise.all([
            dbAll(
                `SELECT t.id, t.name, t.color FROM tags t
                 JOIN subscriber_tags st ON t.id = st.tag_id
                 WHERE st.subscriber_id = ?`,
                [subscriber.id]
            ),
            dbAll(
                `SELECT s.id, s.name FROM segments s
                 JOIN subscriber_segments ss ON s.id = ss.segment_id
                 WHERE ss.subscriber_id = ?`,
                [subscriber.id]
            ),
            dbGet('SELECT * FROM subscriber_activity WHERE subscriber_id = ?', [subscriber.id])
        ]);

        res.json({ success: true, subscriber: { ...subscriber, tags, segments, activity: activity || null } });
    } catch (error) {
        console.error('[emailMarketing] get subscriber error:', error);
        res.status(500).json({ success: false, error: 'Failed to get subscriber' });
    }
});

// DELETE /api/email-marketing/subscribers/:id
router.delete('/subscribers/:id', authenticateAdmin, async (req, res) => {
    try {
        await dbRun('DELETE FROM subscribers WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('[emailMarketing] delete subscriber error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete subscriber' });
    }
});

// ─── Email Sequences ──────────────────────────────────────────────────────────

// GET /api/email-marketing/sequences
router.get('/sequences', authenticateAdmin, async (req, res) => {
    try {
        const sequences = await dbAll(
            'SELECT id, name, description, trigger_event, trigger_value, active, created_at FROM email_sequences ORDER BY created_at DESC',
            []
        );
        res.json({ success: true, sequences });
    } catch (error) {
        console.error('[emailMarketing] list sequences error:', error);
        res.status(500).json({ success: false, error: 'Failed to list sequences' });
    }
});

// POST /api/email-marketing/sequences
router.post('/sequences', authenticateAdmin, async (req, res) => {
    try {
        const { name, description, trigger_event, trigger_value } = req.body;
        if (!name || !trigger_event) {
            return res.status(400).json({ success: false, error: 'name and trigger_event are required' });
        }
        const result = await dbRun(
            `INSERT INTO email_sequences (name, description, trigger_event, trigger_value, active)
             VALUES (?, ?, ?, ?, 1)`,
            [name, description || null, trigger_event, trigger_value || null]
        );
        res.status(201).json({ success: true, sequenceId: result.lastID });
    } catch (error) {
        if (error.message && error.message.includes('UNIQUE')) {
            return res.status(409).json({ success: false, error: 'Sequence name already exists' });
        }
        console.error('[emailMarketing] create sequence error:', error);
        res.status(500).json({ success: false, error: 'Failed to create sequence' });
    }
});

// PUT /api/email-marketing/sequences/:id
router.put('/sequences/:id', authenticateAdmin, async (req, res) => {
    try {
        const { name, description, trigger_event, trigger_value, active } = req.body;
        await dbRun(
            `UPDATE email_sequences
             SET name = COALESCE(?, name),
                 description = COALESCE(?, description),
                 trigger_event = COALESCE(?, trigger_event),
                 trigger_value = COALESCE(?, trigger_value),
                 active = COALESCE(?, active),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
                name || null,
                description !== undefined ? description : null,
                trigger_event || null,
                trigger_value !== undefined ? trigger_value : null,
                active !== undefined ? (active ? 1 : 0) : null,
                req.params.id
            ]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('[emailMarketing] update sequence error:', error);
        res.status(500).json({ success: false, error: 'Failed to update sequence' });
    }
});

// DELETE /api/email-marketing/sequences/:id
router.delete('/sequences/:id', authenticateAdmin, async (req, res) => {
    try {
        await dbRun('DELETE FROM email_sequences WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('[emailMarketing] delete sequence error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete sequence' });
    }
});

// GET /api/email-marketing/sequences/:id/emails
router.get('/sequences/:id/emails', authenticateAdmin, async (req, res) => {
    try {
        const emails = await dbAll(
            `SELECT se.id, se.order_number, se.delay_days, se.delay_hours, se.subject_override, se.active,
                    et.name as template_name, et.subject as template_subject
             FROM sequence_emails se
             LEFT JOIN email_templates et ON se.template_id = et.id
             WHERE se.sequence_id = ?
             ORDER BY se.order_number`,
            [req.params.id]
        );
        res.json({ success: true, emails });
    } catch (error) {
        console.error('[emailMarketing] list sequence emails error:', error);
        res.status(500).json({ success: false, error: 'Failed to list sequence emails' });
    }
});

// POST /api/email-marketing/sequences/:id/emails
router.post('/sequences/:id/emails', authenticateAdmin, async (req, res) => {
    try {
        const { order_number, delay_days, delay_hours, template_id, subject_override } = req.body;
        if (!template_id) {
            return res.status(400).json({ success: false, error: 'template_id is required' });
        }
        // Auto-assign order_number if not provided
        let orderNum = order_number;
        if (!orderNum) {
            const maxRow = await dbGet(
                'SELECT MAX(order_number) as max_order FROM sequence_emails WHERE sequence_id = ?',
                [req.params.id]
            );
            orderNum = (maxRow && maxRow.max_order != null ? maxRow.max_order : 0) + 1;
        }
        const result = await dbRun(
            `INSERT INTO sequence_emails (sequence_id, order_number, delay_days, delay_hours, template_id, subject_override, active)
             VALUES (?, ?, ?, ?, ?, ?, 1)`,
            [req.params.id, orderNum, delay_days || 0, delay_hours || 0, template_id, subject_override || null]
        );
        res.status(201).json({ success: true, emailId: result.lastID, order_number: orderNum });
    } catch (error) {
        if (error.message && error.message.includes('UNIQUE')) {
            return res.status(409).json({ success: false, error: 'order_number already exists in sequence' });
        }
        console.error('[emailMarketing] add sequence email error:', error);
        res.status(500).json({ success: false, error: 'Failed to add email to sequence' });
    }
});

// ─── Broadcasts ───────────────────────────────────────────────────────────────

// GET /api/email-marketing/broadcasts
router.get('/broadcasts', authenticateAdmin, async (req, res) => {
    try {
        const broadcasts = await dbAll(
            `SELECT b.id, b.name, b.subject_override, b.status, b.scheduled_at, b.sent_at,
                    b.total_recipients, b.sent_count, b.created_at,
                    t.name as template_name
             FROM email_broadcasts b
             LEFT JOIN email_templates t ON b.template_id = t.id
             ORDER BY b.created_at DESC`,
            []
        );
        res.json({ success: true, broadcasts });
    } catch (error) {
        console.error('[emailMarketing] list broadcasts error:', error);
        res.status(500).json({ success: false, error: 'Failed to list broadcasts' });
    }
});

// POST /api/email-marketing/broadcasts
router.post('/broadcasts', authenticateAdmin, async (req, res) => {
    try {
        const { name, template_id, segment_ids, subject_override, scheduled_at } = req.body;
        if (!name || !template_id) {
            return res.status(400).json({ success: false, error: 'name and template_id are required' });
        }
        const result = await dbRun(
            `INSERT INTO email_broadcasts (name, template_id, segment_ids, subject_override, scheduled_at, status)
             VALUES (?, ?, ?, ?, ?, 'draft')`,
            [name, template_id, segment_ids || null, subject_override || null, scheduled_at || null]
        );
        res.status(201).json({ success: true, broadcastId: result.lastID });
    } catch (error) {
        console.error('[emailMarketing] create broadcast error:', error);
        res.status(500).json({ success: false, error: 'Failed to create broadcast' });
    }
});

// ─── Analytics ────────────────────────────────────────────────────────────────

// GET /api/email-marketing/analytics
// Returns broadcast performance and sequence stats with open/click rates
router.get('/analytics', authenticateAdmin, async (req, res) => {
    try {
        // Broadcast performance: join sends to compute open/click rates per broadcast
        const broadcasts = await dbAll(
            `SELECT
                b.id,
                b.name,
                b.subject_override,
                b.status,
                b.sent_at,
                b.created_at,
                b.total_recipients,
                b.sent_count,
                COUNT(DISTINCT es.id) as send_count,
                COUNT(DISTINCT CASE WHEN es.opened_at IS NOT NULL THEN es.id END) as opened_count,
                COUNT(DISTINCT CASE WHEN es.clicked_at IS NOT NULL THEN es.id END) as clicked_count
             FROM email_broadcasts b
             LEFT JOIN email_sends es ON es.broadcast_id = b.id
             GROUP BY b.id
             ORDER BY b.created_at DESC`,
            []
        );

        const broadcastStats = broadcasts.map(b => {
            const sent = b.send_count || b.sent_count || 0;
            const opened = b.opened_count || 0;
            const clicked = b.clicked_count || 0;
            return {
                id: b.id,
                name: b.name,
                subject: b.subject_override || b.name,
                status: b.status,
                sent,
                opened,
                clicked,
                open_rate: sent > 0 ? ((opened / sent) * 100).toFixed(1) + '%' : '—',
                click_rate: sent > 0 ? ((clicked / sent) * 100).toFixed(1) + '%' : '—',
                sent_at: b.sent_at || b.created_at
            };
        });

        // Sequence stats: subscribers per sequence and step completion
        const sequences = await dbAll(
            `SELECT
                es.id,
                es.name,
                es.active,
                COUNT(DISTINCT ss.subscriber_id) as total_subscribers,
                COUNT(DISTINCT CASE WHEN ss.status = 'active' THEN ss.subscriber_id END) as active_subscribers,
                COUNT(DISTINCT CASE WHEN ss.status = 'completed' THEN ss.subscriber_id END) as completed_subscribers
             FROM email_sequences es
             LEFT JOIN subscriber_sequences ss ON ss.sequence_id = es.id
             GROUP BY es.id
             ORDER BY es.created_at DESC`,
            []
        );

        // Summary stats
        const totalSent = broadcastStats.reduce((s, b) => s + b.sent, 0);
        const totalOpened = broadcastStats.reduce((s, b) => s + b.opened, 0);
        const totalClicked = broadcastStats.reduce((s, b) => s + b.clicked, 0);
        const bestBroadcast = broadcastStats.length
            ? broadcastStats.reduce((best, b) => {
                const rate = b.sent > 0 ? b.opened / b.sent : 0;
                const bestRate = best.sent > 0 ? best.opened / best.sent : 0;
                return rate > bestRate ? b : best;
              }, broadcastStats[0])
            : null;

        res.json({
            success: true,
            summary: {
                total_sent: totalSent,
                total_opened: totalOpened,
                total_clicked: totalClicked,
                overall_open_rate: totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) + '%' : '—',
                overall_click_rate: totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) + '%' : '—',
                best_subject: bestBroadcast ? bestBroadcast.subject : null
            },
            broadcasts: broadcastStats,
            sequences
        });
    } catch (error) {
        console.error('[emailMarketing] analytics error:', error);
        res.status(500).json({ success: false, error: 'Failed to load analytics' });
    }
});

// ─── Open / Click Tracking (public pixel + redirect) ─────────────────────────

// 1×1 transparent GIF for open tracking
const TRACKING_PIXEL = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
);

// GET /api/email-marketing/track/open/:sendId
// Called by the tracking pixel embedded in emails
router.get('/track/open/:sendId', async (req, res) => {
    // Always return the pixel — never fail visibly
    res.set('Content-Type', 'image/gif');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.send(TRACKING_PIXEL);

    // Record the open asynchronously (don't block the pixel response)
    const sendId = parseInt(req.params.sendId, 10);
    if (!Number.isFinite(sendId)) return;
    try {
        await dbRun(
            `UPDATE email_sends SET opened_at = COALESCE(opened_at, CURRENT_TIMESTAMP) WHERE id = ?`,
            [sendId]
        );
        await dbRun(
            `INSERT INTO email_events (event_type, send_id, ip_address, user_agent)
             VALUES ('open', ?, ?, ?)`,
            [sendId, req.ip || null, req.get('user-agent') || null]
        );
    } catch (e) {
        // Non-fatal — pixel already sent
    }
});

// GET /api/email-marketing/track/click/:sendId?url=https://...
// Logs a click then redirects to the destination URL
router.get('/track/click/:sendId', async (req, res) => {
    const destination = req.query.url;
    const sendId = parseInt(req.params.sendId, 10);

    // Record asynchronously then redirect
    if (Number.isFinite(sendId) && destination) {
        try {
            await dbRun(
                `UPDATE email_sends SET clicked_at = COALESCE(clicked_at, CURRENT_TIMESTAMP) WHERE id = ?`,
                [sendId]
            );
            await dbRun(
                `INSERT INTO email_events (event_type, send_id, url, ip_address, user_agent)
                 VALUES ('click', ?, ?, ?, ?)`,
                [sendId, destination, req.ip || null, req.get('user-agent') || null]
            );
        } catch (e) {
            // Non-fatal
        }
    }

    if (destination) {
        res.redirect(302, destination);
    } else {
        res.status(400).send('Missing url parameter');
    }
});

// ─── Unsubscribe (public) ─────────────────────────────────────────────────────

// GET /api/email-marketing/unsubscribe/:token
router.get('/unsubscribe/:token', async (req, res) => {
    try {
        const subscriber = await dbGet(
            'SELECT id, email FROM subscribers WHERE unsubscribe_token = ?',
            [req.params.token]
        );
        if (!subscriber) {
            return res.status(404).send('<html><body><h2>Invalid unsubscribe link.</h2></body></html>');
        }

        await dbRun(
            `UPDATE subscribers SET status = 'unsubscribed', unsubscribed_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [subscriber.id]
        );

        res.send(`<html><body style="font-family:sans-serif;max-width:500px;margin:80px auto;text-align:center">
<h2>Unsubscribed</h2>
<p>You have been unsubscribed from our mailing list.</p>
<p style="color:#888;font-size:13px">Email: ${subscriber.email}</p>
</body></html>`);
    } catch (error) {
        console.error('[emailMarketing] unsubscribe error:', error);
        res.status(500).send('<html><body><h2>Error processing unsubscribe request.</h2></body></html>');
    }
});

module.exports = router;
