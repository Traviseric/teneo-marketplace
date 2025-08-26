// Simple showcase server - crash-proof for testing
const express = require('express');
const path = require('path');

const app = express();

// Serve static files
app.use(express.static(path.join(__dirname, 'marketplace/frontend')));

// Simple API endpoints with manual data - no database crashes
app.get('/api/published/dashboard', (req, res) => {
    // Manual data from Travis's books - completely reliable
    const travisBooks = [
        {
            id: 1,
            teneo_book_id: "teneo_book_travis_001",
            amazon_asin: "B0FHF78VGF",
            amazon_url: "https://amazon.com/dp/B0FHF78VGF",
            title: "The Hidden Triggers of Elite Habits: Decode the Micro-Cues That Automate World-Class Performance",
            author: "Travis Eric",
            description: "A revolutionary approach to habit formation that reveals the micro-cues elite performers use to automate world-class behavior. Generated with Teneo AI and refined through real-world testing.",
            cover_image_url: "https://m.media-amazon.com/images/I/71jY3DCUANL._SY522_.jpg",
            current_price: 9.99,
            currency: "USD",
            bestseller_rank: 1637,
            category_rank: 45,
            primary_category: "Business & Money",
            rating_average: 4.2,
            rating_count: 23,
            review_count: 12,
            verification_status: "verified",
            created_at: "2024-12-15T00:00:00.000Z",
            publication_date: "2024-12-15",
            publisher_name: "Travis Eric",
            trend_direction: "up",
            success_badge: "bestseller",
            is_featured: true,
            days_since_published: 14
        },
        {
            id: 2,
            teneo_book_id: "teneo_book_travis_002",
            amazon_asin: "B0FHFTYS7D",
            amazon_url: "https://amazon.com/dp/B0FHFTYS7D",
            title: "The Patterned Species: Mapping Humanity's Recurring Codes to Forecast Our Future",
            author: "Travis Eric",
            description: "An exploration of recurring human patterns throughout history and how understanding these codes can help us predict and shape our collective future. Created with advanced AI and human insight.",
            cover_image_url: null, // Travis needs to add
            current_price: 12.99,
            currency: "USD",
            bestseller_rank: null,
            category_rank: null,
            primary_category: "Science & Math",
            rating_average: null,
            rating_count: 0,
            review_count: 0,
            verification_status: "verified",
            created_at: "2024-12-20T00:00:00.000Z",
            publication_date: "2024-12-20",
            publisher_name: "Travis Eric",
            trend_direction: null,
            success_badge: "published",
            is_featured: false,
            days_since_published: 9
        }
    ];

    res.json({
        success: true,
        data: {
            books: travisBooks,
            pagination: {
                current_page: 1,
                per_page: 20,
                total_items: travisBooks.length,
                total_pages: 1
            },
            stats: {
                total_books: travisBooks.length,
                verified_books: travisBooks.filter(b => b.verification_status === 'verified').length,
                bestsellers: travisBooks.filter(b => b.bestseller_rank && b.bestseller_rank < 10000).length,
                avg_rating: 4.2
            }
        }
    });
});

app.get('/api/published/stats', (req, res) => {
    res.json({
        success: true,
        data: {
            overall: {
                total_books: 2,
                verified_books: 2,
                ranked_books: 1,
                avg_rating: 4.2,
                best_rank: 1637
            },
            recent: {
                books_this_week: 2,
                new_authors: 1
            },
            milestones: [{
                milestone_name: '10K_BOOKS_GOAL',
                current_count: 2,
                target_count: 10000,
                achieved_at: null
            }]
        }
    });
});

// Default route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'marketplace/frontend/optimized-showcase.html'));
});

const PORT = 3004; // Different port to avoid conflicts
app.listen(PORT, () => {
    console.log(`🎨 Simple Showcase Server running on http://localhost:${PORT}`);
    console.log(`📊 Real book data: http://localhost:${PORT}/api/published/dashboard`);
    console.log(`🚀 Optimized showcase: http://localhost:${PORT}`);
});

module.exports = app;