const express = require('express');
const router = express.Router();
const db = require('../database/database');
const TeneoAuthMiddleware = require('../middleware/teneoAuth');

// Get detailed book performance data
router.get('/:bookId/performance', async (req, res) => {
    try {
        const { bookId } = req.params;
        const { timeframe = '30' } = req.query; // days

        // Get book basic info
        const bookQuery = `
            SELECT pb.*, 
                   ps.username, ps.display_name,
                   bad.* 
            FROM published_books pb
            LEFT JOIN publisher_stats ps ON pb.teneo_user_id = ps.user_id
            LEFT JOIN book_amazon_data bad ON pb.id = bad.published_book_id
            WHERE pb.id = ?
        `;
        
        const book = await db.get(bookQuery, [bookId]);
        if (!book) {
            return res.status(404).json({ success: false, error: 'Book not found' });
        }

        // Get BSR history
        const bsrHistoryQuery = `
            SELECT bestseller_rank, rating_average, review_count, price, recorded_at
            FROM book_ranking_history 
            WHERE published_book_id = ? 
            AND recorded_at >= date('now', '-${parseInt(timeframe)} days')
            ORDER BY recorded_at ASC
        `;
        
        const bsrHistory = await db.all(bsrHistoryQuery, [bookId]);

        // Get category rankings history
        const categoryRankingsQuery = `
            SELECT category_name, category_rank, recorded_at
            FROM book_category_rankings
            WHERE published_book_id = ?
            AND recorded_at >= date('now', '-${parseInt(timeframe)} days')
            ORDER BY recorded_at ASC
        `;
        
        const categoryHistory = await db.all(categoryRankingsQuery, [bookId]);

        // Get price history
        const priceHistoryQuery = `
            SELECT format, price, recorded_at
            FROM book_price_history
            WHERE published_book_id = ?
            AND recorded_at >= date('now', '-${parseInt(timeframe)} days')
            ORDER BY recorded_at ASC
        `;
        
        const priceHistory = await db.all(priceHistoryQuery, [bookId]);

        // Get insights
        const insightsQuery = `
            SELECT insight_type, insight_title, insight_description, confidence_score, data_points
            FROM book_insights
            WHERE published_book_id = ? AND is_active = 1
            ORDER BY confidence_score DESC, generated_at DESC
        `;
        
        const insights = await db.all(insightsQuery, [bookId]);

        // Calculate performance metrics
        const metrics = await calculatePerformanceMetrics(book, bsrHistory);

        res.json({
            success: true,
            data: {
                book: {
                    ...book,
                    publisher_name: book.display_name || book.username || 'Publisher',
                    formats_available: book.formats_available ? JSON.parse(book.formats_available) : [],
                    category_rankings: book.category_rankings ? JSON.parse(book.category_rankings) : [],
                    keywords_detected: book.keywords_detected ? JSON.parse(book.keywords_detected) : [],
                    also_bought_asins: book.also_bought_asins ? JSON.parse(book.also_bought_asins) : [],
                    review_keywords: book.review_keywords ? JSON.parse(book.review_keywords) : { positive: [], negative: [] }
                },
                performance: {
                    bsr_history: bsrHistory,
                    category_history: categoryHistory,
                    price_history: priceHistory,
                    metrics: metrics
                },
                insights: insights.map(insight => ({
                    ...insight,
                    data_points: insight.data_points ? JSON.parse(insight.data_points) : {}
                }))
            }
        });

    } catch (error) {
        console.error('Error fetching book performance:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch book performance data'
        });
    }
});

// Get publisher notes for a book
router.get('/:bookId/notes/:userId', TeneoAuthMiddleware.requireTeneoAuth, async (req, res) => {
    try {
        const { bookId, userId } = req.params;

        if (req.teneoUser.id !== userId) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        const notesQuery = `
            SELECT * FROM book_publisher_notes 
            WHERE published_book_id = ? AND user_id = ?
        `;
        
        const notes = await db.get(notesQuery, [bookId, userId]);

        res.json({
            success: true,
            data: notes || {
                notes_markdown: '',
                publishing_tips: '',
                marketing_tactics: '',
                teneo_modifications: ''
            }
        });

    } catch (error) {
        console.error('Error fetching publisher notes:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch publisher notes'
        });
    }
});

// Update publisher notes for a book
router.put('/:bookId/notes/:userId', TeneoAuthMiddleware.requireTeneoAuth, async (req, res) => {
    try {
        const { bookId, userId } = req.params;
        const { notes_markdown, publishing_tips, marketing_tactics, teneo_modifications } = req.body;

        if (req.teneoUser.id !== userId) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        const updateQuery = `
            INSERT OR REPLACE INTO book_publisher_notes 
            (published_book_id, user_id, notes_markdown, publishing_tips, marketing_tactics, teneo_modifications, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;
        
        await db.run(updateQuery, [bookId, userId, notes_markdown, publishing_tips, marketing_tactics, teneo_modifications]);

        res.json({
            success: true,
            message: 'Notes updated successfully'
        });

    } catch (error) {
        console.error('Error updating publisher notes:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update publisher notes'
        });
    }
});

// Generate AI insights for a book
router.post('/:bookId/generate-insights', async (req, res) => {
    try {
        const { bookId } = req.params;
        
        // Get book data for analysis
        const book = await db.get('SELECT * FROM published_books WHERE id = ?', [bookId]);
        if (!book) {
            return res.status(404).json({ success: false, error: 'Book not found' });
        }

        // Get recent performance data
        const recentData = await db.all(`
            SELECT * FROM book_ranking_history 
            WHERE published_book_id = ? 
            ORDER BY recorded_at DESC 
            LIMIT 30
        `, [bookId]);

        // Generate insights based on data patterns
        const insights = await generateBookInsights(book, recentData);

        // Store insights in database
        for (const insight of insights) {
            const insertQuery = `
                INSERT INTO book_insights 
                (published_book_id, insight_type, insight_title, insight_description, confidence_score, data_points)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            
            await db.run(insertQuery, [
                bookId,
                insight.type,
                insight.title,
                insight.description,
                insight.confidence,
                JSON.stringify(insight.dataPoints)
            ]);
        }

        res.json({
            success: true,
            data: { insights }
        });

    } catch (error) {
        console.error('Error generating insights:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate insights'
        });
    }
});

// Helper functions
async function calculatePerformanceMetrics(book, bsrHistory) {
    const metrics = {
        best_rank: book.best_bsr || null,
        current_rank: book.bestseller_rank || null,
        rank_improvement_7d: null,
        rank_improvement_30d: null,
        review_velocity: null,
        estimated_monthly_revenue: book.estimated_monthly_revenue || null,
        trend_direction: 'stable'
    };

    if (bsrHistory.length > 0) {
        const recent = bsrHistory.slice(-7);
        const older = bsrHistory.slice(0, 7);

        if (recent.length > 0 && older.length > 0) {
            const recentAvg = recent.reduce((sum, r) => sum + (r.bestseller_rank || 0), 0) / recent.length;
            const olderAvg = older.reduce((sum, r) => sum + (r.bestseller_rank || 0), 0) / older.length;
            
            metrics.rank_improvement_7d = olderAvg - recentAvg; // Positive = improvement
            
            if (metrics.rank_improvement_7d > 1000) {
                metrics.trend_direction = 'up';
            } else if (metrics.rank_improvement_7d < -1000) {
                metrics.trend_direction = 'down';
            }
        }

        // Calculate review velocity (reviews per day)
        const firstEntry = bsrHistory[0];
        const lastEntry = bsrHistory[bsrHistory.length - 1];
        const daysDiff = Math.max(1, Math.floor((new Date(lastEntry.recorded_at) - new Date(firstEntry.recorded_at)) / (1000 * 60 * 60 * 24)));
        const reviewDiff = (lastEntry.review_count || 0) - (firstEntry.review_count || 0);
        metrics.review_velocity = Math.max(0, reviewDiff / daysDiff);
    }

    return metrics;
}

async function generateBookInsights(book, recentData) {
    const insights = [];

    if (recentData.length > 7) {
        // Weekend performance analysis
        const weekendData = recentData.filter(d => {
            const day = new Date(d.recorded_at).getDay();
            return day === 0 || day === 6; // Sunday or Saturday
        });

        const weekdayData = recentData.filter(d => {
            const day = new Date(d.recorded_at).getDay();
            return day > 0 && day < 6;
        });

        if (weekendData.length > 0 && weekdayData.length > 0) {
            const weekendAvg = weekendData.reduce((sum, d) => sum + (d.bestseller_rank || 0), 0) / weekendData.length;
            const weekdayAvg = weekdayData.reduce((sum, d) => sum + (d.bestseller_rank || 0), 0) / weekdayData.length;
            
            if (weekendAvg < weekdayAvg - 1000) {
                insights.push({
                    type: 'pattern',
                    title: 'Weekend Performance Boost',
                    description: 'Your book ranks significantly better on weekends. Consider weekend-focused marketing.',
                    confidence: 0.8,
                    dataPoints: { weekendAvg, weekdayAvg }
                });
            }
        }
    }

    // Review sentiment analysis
    if (book.review_sentiment_positive > book.review_sentiment_negative * 2) {
        insights.push({
            type: 'optimization',
            title: 'Leverage Positive Reviews',
            description: 'Your book has overwhelmingly positive reviews. Consider featuring review quotes in marketing.',
            confidence: 0.9,
            dataPoints: { 
                positive: book.review_sentiment_positive, 
                negative: book.review_sentiment_negative 
            }
        });
    }

    // BSR improvement trend
    if (recentData.length > 14) {
        const firstWeek = recentData.slice(0, 7);
        const secondWeek = recentData.slice(7, 14);
        
        const firstWeekAvg = firstWeek.reduce((sum, d) => sum + (d.bestseller_rank || 0), 0) / firstWeek.length;
        const secondWeekAvg = secondWeek.reduce((sum, d) => sum + (d.bestseller_rank || 0), 0) / secondWeek.length;
        
        if (secondWeekAvg < firstWeekAvg - 2000) {
            insights.push({
                type: 'trend',
                title: 'Strong Upward Momentum',
                description: 'Your book is showing consistent rank improvement. Keep up your current marketing efforts.',
                confidence: 0.85,
                dataPoints: { improvement: firstWeekAvg - secondWeekAvg }
            });
        }
    }

    return insights;
}

module.exports = router;