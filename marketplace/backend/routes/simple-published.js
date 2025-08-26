// Simple, crash-proof published books API
// No complex joins, just reliable data

const express = require('express');
const router = express.Router();
const db = require('../database/database');

// Simple dashboard endpoint - no crashes!
router.get('/dashboard', async (req, res) => {
    try {
        // Simple query - no joins, no complex stuff
        const books = await new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    id,
                    teneo_book_id,
                    amazon_asin,
                    amazon_url,
                    title,
                    author,
                    description,
                    cover_image_url,
                    current_price,
                    currency,
                    bestseller_rank,
                    rating_average,
                    rating_count,
                    review_count,
                    verification_status,
                    created_at,
                    publication_date
                FROM published_books 
                WHERE teneo_user_id = ? AND verification_status = ?
                ORDER BY created_at DESC
            `, ['user_travis_eric', 'verified'], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        // Add computed fields safely
        const enhancedBooks = books.map(book => ({
            ...book,
            publisher_name: "Travis Eric",
            trend_direction: getTrendDirection(book.bestseller_rank),
            success_badge: getSuccessBadge(book.bestseller_rank, book.rating_average),
            amazon_asin: book.amazon_asin, // Ensure ASIN is available
            is_featured: book.bestseller_rank && book.bestseller_rank < 10000,
            days_since_published: getDaysSincePublished(book.created_at)
        }));

        res.json({
            success: true,
            data: {
                books: enhancedBooks,
                pagination: {
                    current_page: 1,
                    per_page: 20,
                    total_items: enhancedBooks.length,
                    total_pages: enhancedBooks.length > 0 ? 1 : 0
                },
                stats: {
                    total_books: enhancedBooks.length,
                    verified_books: enhancedBooks.filter(b => b.verification_status === 'verified').length,
                    bestsellers: enhancedBooks.filter(b => b.bestseller_rank && b.bestseller_rank < 10000).length,
                    avg_rating: calculateAverageRating(enhancedBooks)
                },
                empty_state: enhancedBooks.length === 0 ? {
                    show: true,
                    title: "🚀 Building the Future of AI Publishing",
                    message: "The Teneo marketplace is ready for real AI-generated books. When authors publish their Teneo creations on Amazon, they'll showcase here.",
                    call_to_action: "Be the first to share your Teneo success story!",
                    authentic: true
                } : null
            }
        });

    } catch (error) {
        console.error('Error in simple dashboard:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load books',
            data: {
                books: [],
                empty_state: {
                    show: true,
                    title: "Loading Error",
                    message: "Unable to load books at this time. Please try again.",
                    authentic: true
                }
            }
        });
    }
});

// Simple stats endpoint
router.get('/stats', async (req, res) => {
    try {
        const stats = await new Promise((resolve, reject) => {
            db.get(`
                SELECT 
                    COUNT(*) as total_books,
                    COUNT(CASE WHEN verification_status = 'verified' THEN 1 END) as verified_books,
                    COUNT(CASE WHEN bestseller_rank IS NOT NULL THEN 1 END) as ranked_books,
                    AVG(CASE WHEN rating_average IS NOT NULL THEN rating_average END) as avg_rating,
                    MIN(CASE WHEN bestseller_rank IS NOT NULL THEN bestseller_rank END) as best_rank
                FROM published_books 
                WHERE teneo_user_id = ?
            `, ['user_travis_eric'], (err, row) => {
                if (err) reject(err);
                else resolve(row || {});
            });
        });

        res.json({
            success: true,
            data: {
                overall: {
                    total_books: stats.total_books || 0,
                    verified_books: stats.verified_books || 0,
                    ranked_books: stats.ranked_books || 0,
                    avg_rating: Math.round((stats.avg_rating || 0) * 10) / 10,
                    best_rank: stats.best_rank || null
                },
                recent: {
                    books_this_week: 0, // Would need date calculation
                    new_authors: 1 // Travis
                },
                milestones: [{
                    milestone_name: '10K_BOOKS_GOAL',
                    current_count: stats.verified_books || 0,
                    target_count: 10000,
                    achieved_at: null
                }],
                empty_state: (stats.total_books || 0) === 0 ? {
                    show: true,
                    message: "🎯 Ready for authentic Teneo success stories",
                    subtitle: "Quality over quantity - real AI publishing results only"
                } : null
            }
        });

    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load stats'
        });
    }
});

// Helper functions
function getTrendDirection(bsr) {
    if (!bsr) return null;
    if (bsr < 5000) return "up";
    if (bsr < 20000) return "stable"; 
    return null; // Don't show negative trends
}

function getSuccessBadge(bsr, rating) {
    if (bsr && bsr < 10000) return "bestseller";
    if (rating && rating >= 4.0) return "highly-rated";
    if (bsr && bsr < 50000) return "rising";
    return "published";
}

function getDaysSincePublished(dateString) {
    const publishDate = new Date(dateString);
    const now = new Date();
    return Math.floor((now - publishDate) / (1000 * 60 * 60 * 24));
}

function calculateAverageRating(books) {
    const ratingsBooks = books.filter(b => b.rating_average);
    if (ratingsBooks.length === 0) return 0;
    
    const sum = ratingsBooks.reduce((acc, book) => acc + book.rating_average, 0);
    return Math.round((sum / ratingsBooks.length) * 10) / 10;
}

module.exports = router;