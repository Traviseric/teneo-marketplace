/**
 * AI Discovery Routes
 *
 * Revolutionary semantic search and knowledge discovery endpoints
 */

const express = require('express');
const router = express.Router();
const aiDiscoveryService = require('../services/aiDiscoveryService');
const db = require('../database/database');
const { authenticateAdmin } = require('../middleware/auth');

/**
 * POST /api/discovery/semantic-search
 * Semantic search using natural language queries
 */
router.post('/semantic-search', async (req, res) => {
    try {
        const {
            query,
            limit = 20,
            controversyBoost = true,
            suppressionBoost = true,
            minScore = 0.6
        } = req.body;

        if (!query || query.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Search query is required'
            });
        }

        const startTime = Date.now();

        const results = await aiDiscoveryService.semanticSearch(query, {
            limit,
            controversyBoost,
            suppressionBoost,
            minScore
        });

        const searchDuration = Date.now() - startTime;

        res.json({
            success: true,
            query,
            results,
            count: results.length,
            searchDuration,
            features: {
                controversyBoost,
                suppressionBoost
            }
        });

    } catch (error) {
        console.error('Error in semantic search endpoint:', error);
        res.status(500).json({
            success: false,
            error: 'Search failed',
            message: error.message
        });
    }
});

/**
 * GET /api/discovery/suppressed-books
 * Get "What They Don't Want You to Read" feed
 */
router.get('/suppressed-books', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;

        const suppressedBooks = await aiDiscoveryService.getSuppressedBooksFeed(limit);

        res.json({
            success: true,
            books: suppressedBooks,
            count: suppressedBooks.length
        });

    } catch (error) {
        console.error('Error getting suppressed books:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve suppressed books'
        });
    }
});

/**
 * POST /api/discovery/reading-path
 * Generate AI-powered reading path
 */
router.post('/reading-path', async (req, res) => {
    try {
        const { topic, level = 'beginner' } = req.body;

        if (!topic) {
            return res.status(400).json({
                success: false,
                error: 'Topic is required'
            });
        }

        const path = await aiDiscoveryService.generateReadingPath(topic, level);

        if (!path) {
            return res.status(404).json({
                success: false,
                error: 'No books found for this topic'
            });
        }

        res.json({
            success: true,
            path
        });

    } catch (error) {
        console.error('Error generating reading path:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate reading path',
            message: error.message
        });
    }
});

/**
 * GET /api/discovery/reading-paths
 * Get all reading paths (optionally filtered by topic)
 */
router.get('/reading-paths', async (req, res) => {
    try {
        const { topic, difficulty, featured } = req.query;

        let query = 'SELECT * FROM reading_paths WHERE 1=1';
        const params = [];

        if (topic) {
            query += ' AND topic LIKE ?';
            params.push(`%${topic}%`);
        }

        if (difficulty) {
            query += ' AND difficulty_level = ?';
            params.push(difficulty);
        }

        if (featured === 'true') {
            query += ' AND is_featured = 1';
        }

        query += ' ORDER BY popularity_score DESC, completion_count DESC LIMIT 50';

        const paths = await db.all(query, params);

        res.json({
            success: true,
            paths: paths.map(p => ({
                ...p,
                book_sequence: JSON.parse(p.book_sequence),
                learning_goals: p.learning_goals ? JSON.parse(p.learning_goals) : []
            })),
            count: paths.length
        });

    } catch (error) {
        console.error('Error getting reading paths:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve reading paths'
        });
    }
});

/**
 * GET /api/discovery/knowledge-graph/:bookId
 * Get knowledge graph for a book (related books, citations, etc.)
 */
router.get('/knowledge-graph/:bookId', async (req, res) => {
    try {
        const { bookId } = req.params;
        const depth = parseInt(req.query.depth) || 1;

        // Get direct relationships
        const relationships = await db.all(`
            SELECT
                cn.*,
                be.title as cited_title,
                be.author as cited_author,
                be.category as cited_category
            FROM citation_network cn
            JOIN book_embeddings be ON cn.cited_book_id = be.book_id
            WHERE cn.source_book_id = ?
            ORDER BY cn.relationship_strength DESC
            LIMIT 20
        `, [bookId]);

        // Get reverse relationships (books that cite this one)
        const citedBy = await db.all(`
            SELECT
                cn.*,
                be.title as source_title,
                be.author as source_author,
                be.category as source_category
            FROM citation_network cn
            JOIN book_embeddings be ON cn.source_book_id = be.book_id
            WHERE cn.cited_book_id = ?
            ORDER BY cn.relationship_strength DESC
            LIMIT 20
        `, [bookId]);

        res.json({
            success: true,
            bookId,
            relationships: relationships.map(r => ({
                citedBookId: r.cited_book_id,
                title: r.cited_title,
                author: r.cited_author,
                category: r.cited_category,
                relationshipType: r.relationship_type,
                strength: r.relationship_strength,
                context: r.citation_context
            })),
            citedBy: citedBy.map(r => ({
                sourceBookId: r.source_book_id,
                title: r.source_title,
                author: r.source_author,
                category: r.source_category,
                relationshipType: r.relationship_type,
                strength: r.relationship_strength
            })),
            depth
        });

    } catch (error) {
        console.error('Error getting knowledge graph:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve knowledge graph'
        });
    }
});

/**
 * GET /api/discovery/controversy/:bookId
 * Get controversy metrics for a book
 */
router.get('/controversy/:bookId', async (req, res) => {
    try {
        const { bookId } = req.params;

        // Get current controversy score
        const controversyScore = await aiDiscoveryService.calculateControversyScore(bookId);

        // Get suppression events
        const suppressionEvents = await db.all(`
            SELECT * FROM book_suppression_events
            WHERE book_id = ?
            ORDER BY detected_at DESC
            LIMIT 20
        `, [bookId]);

        // Get ban risk score
        const banRisk = await db.get(`
            SELECT * FROM book_ban_risk_scores
            WHERE book_id = ?
        `, [bookId]);

        // Get recent metrics
        const recentMetrics = await db.all(`
            SELECT * FROM book_controversy_metrics
            WHERE book_id = ?
            ORDER BY date DESC
            LIMIT 30
        `, [bookId]);

        res.json({
            success: true,
            bookId,
            controversyScore,
            suppressionEvents: suppressionEvents.map(e => ({
                platform: e.platform,
                eventType: e.event_type,
                detectedAt: e.detected_at,
                impactScore: e.impact_score,
                reason: e.removal_reason,
                isActive: e.is_active === 1
            })),
            banRisk: banRisk ? {
                riskScore: banRisk.risk_score,
                riskLevel: banRisk.risk_level,
                riskFactors: JSON.parse(banRisk.risk_factors || '{}'),
                calculatedAt: banRisk.calculated_at
            } : null,
            recentMetrics: recentMetrics.map(m => ({
                date: m.date,
                score: m.daily_controversy_score,
                trend: m.trend_direction,
                socialMentions: m.social_mentions,
                mediaArticles: m.media_articles
            }))
        });

    } catch (error) {
        console.error('Error getting controversy data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve controversy data'
        });
    }
});

/**
 * POST /api/discovery/admin/generate-embeddings
 * Admin: Generate embeddings for all books (or specific book)
 */
router.post('/admin/generate-embeddings', authenticateAdmin, async (req, res) => {
    try {
        // Queue all books for embedding generation
        const queuedCount = await aiDiscoveryService.queueAllBooksForEmbedding();

        res.json({
            success: true,
            message: `Queued ${queuedCount} books for embedding generation`,
            queuedCount
        });

    } catch (error) {
        console.error('Error queuing embeddings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to queue embeddings',
            message: error.message
        });
    }
});

/**
 * POST /api/discovery/admin/process-embeddings
 * Admin: Process embedding queue
 */
router.post('/admin/process-embeddings', authenticateAdmin, async (req, res) => {
    try {
        const batchSize = parseInt(req.body.batchSize) || 10;

        const results = await aiDiscoveryService.processEmbeddingQueue(batchSize);

        res.json({
            success: true,
            results
        });

    } catch (error) {
        console.error('Error processing embeddings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process embeddings',
            message: error.message
        });
    }
});

/**
 * GET /api/discovery/admin/queue-status
 * Admin: Get embedding queue status
 */
router.get('/admin/queue-status', authenticateAdmin, async (req, res) => {
    try {
        const stats = await db.get(`
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
            FROM embedding_generation_queue
        `);

        const embeddingCount = await db.get(`
            SELECT COUNT(*) as count FROM book_embeddings
        `);

        res.json({
            success: true,
            queue: stats,
            embeddingsGenerated: embeddingCount.count
        });

    } catch (error) {
        console.error('Error getting queue status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get queue status'
        });
    }
});

/**
 * GET /api/discovery/stats
 * Get AI discovery system statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await db.get(`
            SELECT
                COUNT(DISTINCT book_id) as total_books,
                AVG(controversy_score) as avg_controversy,
                AVG(suppression_level) as avg_suppression,
                COUNT(CASE WHEN controversy_score > 50 THEN 1 END) as controversial_books,
                COUNT(CASE WHEN suppression_level > 50 THEN 1 END) as suppressed_books
            FROM book_embeddings
        `);

        const searchCount = await db.get(`
            SELECT COUNT(*) as count FROM semantic_search_log
            WHERE created_at >= date('now', '-7 days')
        `);

        const pathCount = await db.get(`
            SELECT COUNT(*) as count FROM reading_paths
        `);

        res.json({
            success: true,
            stats: {
                totalBooks: stats.total_books,
                averageControversy: Math.round(stats.avg_controversy || 0),
                averageSuppression: Math.round(stats.avg_suppression || 0),
                controversialBooks: stats.controversial_books,
                suppressedBooks: stats.suppressed_books,
                recentSearches: searchCount.count,
                readingPaths: pathCount.count
            }
        });

    } catch (error) {
        console.error('Error getting discovery stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get stats'
        });
    }
});

module.exports = router;
