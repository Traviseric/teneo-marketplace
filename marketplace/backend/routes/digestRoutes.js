const express = require('express');
const router = express.Router();
const simpleDigestService = require('../services/simpleDigestService');

// Get latest daily digest
router.get('/daily', async (req, res) => {
    try {
        console.log('Generating simple daily digest...');
        const digest = await simpleDigestService.generateSimpleDigest();
        
        res.json({
            success: true,
            data: digest
        });
        
    } catch (error) {
        console.error('Error fetching daily digest:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch daily digest'
        });
    }
});

// Force regenerate daily digest
router.post('/daily/regenerate', async (req, res) => {
    try {
        const digest = await simpleDigestService.generateSimpleDigest();
        
        res.json({
            success: true,
            data: digest,
            message: 'Daily digest regenerated successfully'
        });
        
    } catch (error) {
        console.error('Error regenerating daily digest:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to regenerate daily digest'
        });
    }
});

// Get community insights only
router.get('/insights', async (req, res) => {
    try {
        const digest = await simpleDigestService.generateSimpleDigest();
        const insights = digest.communityInsights || [];

        res.json({
            success: true,
            data: { insights }
        });

    } catch (error) {
        console.error('Error fetching community insights:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch community insights'
        });
    }
});

// Get milestones feed
router.get('/milestones', async (req, res) => {
    try {
        const feed = await simpleDigestService.getSimpleFeed();
        
        res.json({
            success: true,
            data: { feed }
        });
        
    } catch (error) {
        console.error('Error fetching milestones feed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch milestones feed'
        });
    }
});

// Get performance comparison data for a specific book
router.get('/compare/:bookId', async (req, res) => {
    try {
        const { bookId } = req.params;
        
        // Get book data
        const bookQuery = `
            SELECT bestseller_rank, rating_count, rating_average, title
            FROM published_books
            WHERE id = ? AND verification_status = 'verified'
        `;
        
        const book = await require('../database/database').get(bookQuery, [bookId]);
        if (!book) {
            return res.status(404).json({
                success: false,
                error: 'Book not found'
            });
        }
        
        const comparisons = await digestService.getPerformanceComparisons();
        
        // Calculate percentiles for this book
        const bsrPercentile = calculatePercentile(book.bestseller_rank, [
            comparisons.bsr.p25, comparisons.bsr.p50, comparisons.bsr.p75, comparisons.bsr.p90
        ]);
        
        const reviewPercentile = calculatePercentile(book.rating_count, [
            comparisons.reviews.p25, comparisons.reviews.p50, comparisons.reviews.p75
        ]);
        
        const ratingPercentile = calculatePercentile(book.rating_average, [
            comparisons.rating.p25, comparisons.rating.p50, comparisons.rating.p75
        ]);
        
        res.json({
            success: true,
            data: {
                book: {
                    title: book.title,
                    bestseller_rank: book.bestseller_rank,
                    rating_count: book.rating_count,
                    rating_average: book.rating_average
                },
                percentiles: {
                    bsr: bsrPercentile,
                    reviews: reviewPercentile,
                    rating: ratingPercentile
                },
                comparisons
            }
        });
        
    } catch (error) {
        console.error('Error fetching book comparison:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch book comparison'
        });
    }
});

function calculatePercentile(value, thresholds) {
    if (!value) return 0;
    
    // For BSR (lower is better)
    if (thresholds.length === 4) {
        if (value <= thresholds[0]) return 75; // Better than 75%
        if (value <= thresholds[1]) return 50; // Better than 50%
        if (value <= thresholds[2]) return 25; // Better than 25%
        if (value <= thresholds[3]) return 10; // Better than 10%
        return 5; // Better than 5%
    }
    
    // For reviews/ratings (higher is better)
    if (value >= thresholds[2]) return 75; // Better than 75%
    if (value >= thresholds[1]) return 50; // Better than 50%
    if (value >= thresholds[0]) return 25; // Better than 25%
    return 10; // Better than 10%
}

module.exports = router;