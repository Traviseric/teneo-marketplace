/**
 * Censorship Tracker Routes
 *
 * API endpoints for live censorship tracking and alerts
 */

const express = require('express');
const router = express.Router();
const censorshipTracker = require('../services/censorshipTrackerService');
const db = require('../database/database');

/**
 * GET /api/censorship/recent-bans
 * Get recently detected bans
 */
router.get('/recent-bans', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const platform = req.query.platform;

        let query = `
            SELECT
                ca.id,
                ca.book_id,
                ca.platform,
                ca.alert_type,
                ca.severity,
                ca.created_at,
                ca.is_verified,
                be.title,
                be.author,
                be.description,
                be.danger_index,
                be.suppression_level
            FROM censorship_alerts ca
            LEFT JOIN book_embeddings be ON ca.book_id = be.book_id
            WHERE ca.alert_type = 'new_ban'
        `;

        const params = [];

        if (platform) {
            query += ' AND ca.platform = ?';
            params.push(platform);
        }

        query += ' ORDER BY ca.created_at DESC LIMIT ?';
        params.push(limit);

        const bans = await db.all(query, params);

        res.json({
            success: true,
            bans,
            count: bans.length
        });

    } catch (error) {
        console.error('Error getting recent bans:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve recent bans'
        });
    }
});

/**
 * GET /api/censorship/stats
 * Get censorship statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await db.get(`
            SELECT
                COUNT(DISTINCT CASE WHEN alert_type = 'new_ban' THEN book_id END) as total_banned_books,
                COUNT(CASE WHEN alert_type = 'new_ban' AND created_at >= date('now', '-7 days') THEN 1 END) as bans_this_week,
                COUNT(CASE WHEN alert_type = 'new_ban' AND created_at >= date('now', '-30 days') THEN 1 END) as bans_this_month,
                COUNT(CASE WHEN alert_type = 'restored' THEN 1 END) as total_restorations
            FROM censorship_alerts
        `);

        const platformStats = await db.all(`
            SELECT
                platform,
                COUNT(*) as ban_count,
                COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_severity_count
            FROM censorship_alerts
            WHERE alert_type = 'new_ban'
            GROUP BY platform
            ORDER BY ban_count DESC
        `);

        const monitoringStats = await db.get(`
            SELECT
                COUNT(*) as total_monitored,
                COUNT(CASE WHEN is_active = 1 THEN 1 END) as actively_monitored,
                AVG(priority) as avg_priority
            FROM monitored_books
        `);

        res.json({
            success: true,
            stats: {
                ...stats,
                platformBreakdown: platformStats,
                monitoring: monitoringStats
            }
        });

    } catch (error) {
        console.error('Error getting censorship stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve statistics'
        });
    }
});

/**
 * GET /api/censorship/timeline/:bookId
 * Get censorship timeline for a specific book
 */
router.get('/timeline/:bookId', async (req, res) => {
    try {
        const { bookId } = req.params;

        const events = await db.all(`
            SELECT
                ca.id,
                ca.platform,
                ca.alert_type,
                ca.severity,
                ca.created_at,
                ca.is_verified,
                wa.wayback_url,
                wa.original_url
            FROM censorship_alerts ca
            LEFT JOIN wayback_archives wa ON ca.book_id = wa.book_id
                AND ca.platform = wa.platform
            WHERE ca.book_id = ?
            ORDER BY ca.created_at DESC
        `, [bookId]);

        const snapshots = await db.all(`
            SELECT
                s.platform,
                s.is_available,
                s.checked_at,
                s.response_code,
                s.detection_method
            FROM availability_snapshots s
            JOIN monitored_books mb ON s.monitored_book_id = mb.id
            WHERE mb.book_id = ?
            ORDER BY s.checked_at DESC
            LIMIT 100
        `, [bookId]);

        res.json({
            success: true,
            bookId,
            events,
            snapshots,
            eventCount: events.length
        });

    } catch (error) {
        console.error('Error getting timeline:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve timeline'
        });
    }
});

/**
 * GET /api/censorship/banned-this-week
 * Get "Banned This Week" feed
 */
router.get('/banned-this-week', async (req, res) => {
    try {
        const bannedBooks = await db.all(`
            SELECT
                ca.book_id,
                ca.platform,
                ca.created_at,
                be.title,
                be.author,
                be.description,
                be.danger_index,
                be.category,
                COUNT(DISTINCT ca.platform) as platform_count
            FROM censorship_alerts ca
            JOIN book_embeddings be ON ca.book_id = be.book_id
            WHERE ca.alert_type = 'new_ban'
            AND ca.created_at >= date('now', '-7 days')
            GROUP BY ca.book_id
            ORDER BY ca.created_at DESC, platform_count DESC
            LIMIT 20
        `);

        res.json({
            success: true,
            books: bannedBooks,
            count: bannedBooks.length,
            weekStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        });

    } catch (error) {
        console.error('Error getting banned this week:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve banned books'
        });
    }
});

/**
 * GET /api/censorship/archives/:bookId
 * Get Wayback Machine archives for a book
 */
router.get('/archives/:bookId', async (req, res) => {
    try {
        const { bookId } = req.params;

        const archives = await db.all(`
            SELECT * FROM wayback_archives
            WHERE book_id = ?
            ORDER BY requested_at DESC
        `, [bookId]);

        res.json({
            success: true,
            bookId,
            archives,
            count: archives.length
        });

    } catch (error) {
        console.error('Error getting archives:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve archives'
        });
    }
});

/**
 * POST /api/censorship/admin/start-monitoring
 * Admin: Start continuous monitoring
 */
router.post('/admin/start-monitoring', async (req, res) => {
    try {
        await censorshipTracker.startMonitoring();

        res.json({
            success: true,
            message: 'Censorship monitoring started'
        });

    } catch (error) {
        console.error('Error starting monitoring:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start monitoring',
            message: error.message
        });
    }
});

/**
 * POST /api/censorship/admin/stop-monitoring
 * Admin: Stop continuous monitoring
 */
router.post('/admin/stop-monitoring', async (req, res) => {
    try {
        await censorshipTracker.stopMonitoring();

        res.json({
            success: true,
            message: 'Censorship monitoring stopped'
        });

    } catch (error) {
        console.error('Error stopping monitoring:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to stop monitoring'
        });
    }
});

/**
 * POST /api/censorship/admin/check-now
 * Admin: Trigger immediate check of all books
 */
router.post('/admin/check-now', async (req, res) => {
    try {
        // Run check in background
        censorshipTracker.checkAllBooks().catch(err => {
            console.error('Background check error:', err);
        });

        res.json({
            success: true,
            message: 'Book availability check started in background'
        });

    } catch (error) {
        console.error('Error triggering check:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to trigger check'
        });
    }
});

/**
 * POST /api/censorship/admin/add-book
 * Admin: Add book to monitoring
 */
router.post('/admin/add-book', async (req, res) => {
    try {
        const { bookId, brand, platformIdentifiers } = req.body;

        if (!bookId || !brand) {
            return res.status(400).json({
                success: false,
                error: 'bookId and brand are required'
            });
        }

        await censorshipTracker.addBookToMonitoring(bookId, brand, platformIdentifiers || {});

        res.json({
            success: true,
            message: `Book ${bookId} added to monitoring`
        });

    } catch (error) {
        console.error('Error adding book to monitoring:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add book to monitoring'
        });
    }
});

/**
 * GET /api/censorship/admin/monitored-books
 * Admin: Get list of monitored books
 */
router.get('/admin/monitored-books', async (req, res) => {
    try {
        const books = await db.all(`
            SELECT
                mb.*,
                be.title,
                be.author,
                be.danger_index,
                COUNT(DISTINCT ca.id) as alert_count
            FROM monitored_books mb
            LEFT JOIN book_embeddings be ON mb.book_id = be.book_id
            LEFT JOIN censorship_alerts ca ON mb.book_id = ca.book_id
            GROUP BY mb.id
            ORDER BY mb.priority DESC, mb.last_check DESC
            LIMIT 100
        `);

        res.json({
            success: true,
            books,
            count: books.length
        });

    } catch (error) {
        console.error('Error getting monitored books:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve monitored books'
        });
    }
});

/**
 * POST /api/censorship/subscribe
 * Subscribe to censorship alerts
 */
router.post('/subscribe', async (req, res) => {
    try {
        const { email, preferences = {} } = req.body;

        if (!email || !email.includes('@')) {
            return res.status(400).json({
                success: false,
                error: 'Valid email is required'
            });
        }

        // Generate verification token
        const crypto = require('crypto');
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const unsubscribeToken = crypto.randomBytes(32).toString('hex');

        await db.run(`
            INSERT INTO alert_subscriptions
            (email, subscribe_all_bans, subscribe_platform, subscribe_topics,
             alert_frequency, verification_token, unsubscribe_token)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            email,
            preferences.subscribeAllBans !== false ? 1 : 0,
            JSON.stringify(preferences.platforms || []),
            JSON.stringify(preferences.topics || []),
            preferences.frequency || 'immediate',
            verificationToken,
            unsubscribeToken
        ]);

        // TODO: Send verification email

        res.json({
            success: true,
            message: 'Subscription created. Please check your email to verify.',
            verificationToken // Remove in production, send via email only
        });

    } catch (error) {
        console.error('Error creating subscription:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create subscription'
        });
    }
});

/**
 * GET /api/censorship/verify/:token
 * Verify email subscription
 */
router.get('/verify/:token', async (req, res) => {
    try {
        const { token } = req.params;

        const result = await db.run(`
            UPDATE alert_subscriptions
            SET is_verified = 1, verified_at = CURRENT_TIMESTAMP
            WHERE verification_token = ?
        `, [token]);

        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                error: 'Invalid verification token'
            });
        }

        res.json({
            success: true,
            message: 'Email verified successfully!'
        });

    } catch (error) {
        console.error('Error verifying subscription:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to verify subscription'
        });
    }
});

/**
 * GET /api/censorship/unsubscribe/:token
 * Unsubscribe from alerts
 */
router.get('/unsubscribe/:token', async (req, res) => {
    try {
        const { token } = req.params;

        const result = await db.run(`
            UPDATE alert_subscriptions
            SET is_active = 0
            WHERE unsubscribe_token = ?
        `, [token]);

        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                error: 'Invalid unsubscribe token'
            });
        }

        res.json({
            success: true,
            message: 'Successfully unsubscribed from censorship alerts'
        });

    } catch (error) {
        console.error('Error unsubscribing:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to unsubscribe'
        });
    }
});

module.exports = router;
