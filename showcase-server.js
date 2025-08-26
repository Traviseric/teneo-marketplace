// Simple static server to showcase the modern dashboard
const express = require('express');
const path = require('path');

const app = express();

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, 'marketplace/frontend')));

// Mock API endpoints for demo
app.get('/api/published/stats', (req, res) => {
    res.json({
        success: true,
        data: {
            overall: {
                total_books: 142,
                verified_books: 98,
                ranked_books: 76,
                avg_rating: 4.3,
                best_rank: 2847
            },
            recent: {
                books_this_week: 12,
                new_authors: 8
            },
            milestones: [{
                milestone_name: '10K_BOOKS_GOAL',
                current_count: 142,
                target_count: 10000,
                achieved_at: null
            }]
        }
    });
});

app.get('/api/published/dashboard', (req, res) => {
    const mockBooks = [
        {
            id: 1,
            title: "The Future of AI: A Comprehensive Guide",
            author: "Sarah Chen",
            cover_image_url: "https://picsum.photos/200/300?random=1",
            bestseller_rank: 12847,
            rating_average: 4.5,
            rating_count: 127,
            current_price: 24.99,
            verification_status: "verified",
            created_at: new Date().toISOString(),
            publisher_name: "TechAuthor",
            trend_direction: "up"
        },
        {
            id: 2,
            title: "Mindful Leadership in Modern Times",
            author: "Marcus Johnson",
            cover_image_url: "https://picsum.photos/200/300?random=2",
            bestseller_rank: 34521,
            rating_average: 4.2,
            rating_count: 89,
            current_price: 19.99,
            verification_status: "verified",
            created_at: new Date(Date.now() - 86400000).toISOString(),
            publisher_name: "MindfulWriter"
        },
        {
            id: 3,
            title: "Digital Marketing Mastery",
            author: "Emily Rodriguez",
            cover_image_url: "https://picsum.photos/200/300?random=3",
            bestseller_rank: 5678,
            rating_average: 4.7,
            rating_count: 234,
            current_price: 29.99,
            verification_status: "verified",
            created_at: new Date(Date.now() - 172800000).toISOString(),
            publisher_name: "MarketingGuru",
            trend_direction: "up"
        },
        {
            id: 4,
            title: "Sustainable Living Guide",
            author: "David Green",
            cover_image_url: "https://picsum.photos/200/300?random=4",
            bestseller_rank: 87432,
            rating_average: 4.1,
            rating_count: 45,
            current_price: 16.99,
            verification_status: "verified",
            created_at: new Date(Date.now() - 259200000).toISOString(),
            publisher_name: "EcoAuthor"
        },
        {
            id: 5,
            title: "Creative Writing Workshop",
            author: "Lisa Thompson",
            cover_image_url: "https://picsum.photos/200/300?random=5",
            bestseller_rank: 156789,
            rating_average: 4.0,
            rating_count: 67,
            current_price: 22.99,
            verification_status: "verified",
            created_at: new Date(Date.now() - 345600000).toISOString(),
            publisher_name: "CreativeMinds"
        },
        {
            id: 6,
            title: "Investment Strategies for Beginners",
            author: "Robert Kim",
            cover_image_url: "https://picsum.photos/200/300?random=6",
            bestseller_rank: 23456,
            rating_average: 4.4,
            rating_count: 198,
            current_price: 27.99,
            verification_status: "verified",
            created_at: new Date(Date.now() - 432000000).toISOString(),
            publisher_name: "FinanceExpert",
            trend_direction: "up"
        }
    ];

    res.json({
        success: true,
        data: {
            books: mockBooks,
            pagination: {
                current_page: 1,
                per_page: 20,
                total_items: mockBooks.length,
                total_pages: 1
            }
        }
    });
});

app.get('/api/publishers/leaderboards', (req, res) => {
    res.json({
        success: true,
        data: {
            most_published: {
                title: "Most Published",
                entries: [
                    { rank: 1, user_id: "user1", display_name: "TechAuthor", formatted_value: "12 books", badge_display: '["gold_trophy"]' },
                    { rank: 2, user_id: "user2", display_name: "MarketingGuru", formatted_value: "8 books", badge_display: '["silver_stack"]' },
                    { rank: 3, user_id: "user3", display_name: "CreativeMinds", formatted_value: "6 books", badge_display: '["bronze_book"]' }
                ]
            },
            rising_stars: {
                title: "Rising Stars",
                entries: [
                    { rank: 1, user_id: "user4", display_name: "NewAuthor", formatted_value: "3 books this month", badge_display: '["rocket"]' },
                    { rank: 2, user_id: "user5", display_name: "FreshWriter", formatted_value: "2 books this month", badge_display: '["star"]' }
                ]
            },
            best_sellers: {
                title: "Best Sellers",
                entries: [
                    { rank: 1, user_id: "user6", display_name: "Bestselling Author", formatted_value: "Avg BSR: 5,678", badge_display: '["diamond"]' },
                    { rank: 2, user_id: "user7", display_name: "Popular Writer", formatted_value: "Avg BSR: 12,847", badge_display: '["crown"]' }
                ]
            }
        }
    });
});

// Publisher Stories and Marketplace APIs
app.get('/api/publisher-stories/marketplace/stats', (req, res) => {
    res.json({
        success: true,
        data: {
            stats: {
                total_books: 142,
                waitlist_count: 1247,
                claimed_stores: 23,
                founding_members: 5,
                milestone: { target_value: 10000, current_value: 142, percentage: 1.42 }
            },
            comparison: {
                amazon: {
                    royalty: '70%',
                    control: 'Limited',
                    data_access: 'None',
                    exclusivity: 'Required',
                    payment_terms: '60 days'
                },
                teneo: {
                    royalty: '95%',
                    control: 'Full',
                    data_access: 'Complete',
                    exclusivity: 'Never',
                    payment_terms: '7 days'
                }
            }
        }
    });
});

app.post('/api/publisher-stories/marketplace/waitlist', (req, res) => {
    const publisherData = req.body;
    const referralCode = generateReferralCode(publisherData.publisher_name || 'USER');
    
    res.json({
        success: true,
        data: { referralCode }
    });
});

app.get('/api/publisher-stories/success-stories', (req, res) => {
    const mockStories = [
        {
            id: 1,
            publisher_name: 'Sarah Chen',
            story_category: 'first_time',
            headline: 'From 0 to 12 books in 60 days',
            quote: 'The Teneo community taught me everything about covers, titles, and marketing. I went from knowing nothing to having a profitable publishing business.',
            revenue_highlight: '$8,400',
            review_highlight: '4.6★',
            books_count: 12,
            days_to_achievement: 60,
            featured: true
        },
        {
            id: 2,
            publisher_name: 'Marcus Johnson',
            story_category: 'rapid_growth',
            headline: 'Built genre authority with 25 books',
            quote: 'Teneo\'s AI helped me find profitable niches I never would have discovered. Now I dominate three categories in business books.',
            revenue_highlight: '$15K/mo',
            review_highlight: '4.4★',
            books_count: 25,
            days_to_achievement: 120,
            featured: true
        },
        {
            id: 3,
            publisher_name: 'Elena Rodriguez',
            story_category: 'international',
            headline: 'Publishing in 5 languages globally',
            quote: 'Started with English, now my books sell worldwide. The translation tips from the community opened up whole new markets.',
            revenue_highlight: '€15K/mo',
            review_highlight: '4.7★',
            books_count: 40,
            days_to_achievement: 180,
            featured: true
        }
    ];
    
    res.json({
        success: true,
        data: { stories: mockStories }
    });
});

app.get('/api/publisher-stories/tips/:category?', (req, res) => {
    const { category } = req.params;
    
    const mockTips = [
        {
            id: 1,
            category: 'cover_design',
            tip_text: 'Use high contrast colors and large, readable fonts. Your cover needs to look good as a thumbnail.',
            publisher_name: 'Sarah Chen',
            helpful_count: 45
        },
        {
            id: 2,
            category: 'title_optimization',
            tip_text: 'Include your main keyword in the subtitle. Amazon\'s algorithm loves clear, searchable subtitles.',
            publisher_name: 'Marcus Johnson',
            helpful_count: 38
        },
        {
            id: 3,
            category: 'marketing',
            tip_text: 'Launch with 5-10 books in the same series. Readers who like one will buy them all.',
            publisher_name: 'Elena Rodriguez',
            helpful_count: 52
        },
        {
            id: 4,
            category: 'pricing',
            tip_text: 'Start at $2.99 for your first book in a series, then increase to $4.99+ for subsequent books.',
            publisher_name: 'David Kim',
            helpful_count: 29
        }
    ];
    
    let filteredTips = mockTips;
    if (category && category !== 'undefined') {
        filteredTips = mockTips.filter(tip => tip.category === category);
    }
    
    res.json({
        success: true,
        data: { tips: filteredTips }
    });
});

function generateReferralCode(name) {
    const cleanName = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
    const namePrefix = cleanName.substring(0, 4);
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${namePrefix}${randomSuffix}`;
}

app.get('/api/digest/daily', (req, res) => {
    res.json({
        success: true,
        data: {
            bookOfTheDay: {
                id: 1,
                title: "Digital Marketing Mastery",
                author: "Emily Rodriguez",
                publisher_name: "MarketingGuru",
                cover_image_url: "https://picsum.photos/200/300?random=3",
                improvementPercent: "34.2",
                previous_rank: 8654,
                current_rank: 5678
            },
            collectiveIntelligence: {
                metrics: {
                    total_books: 142,
                    verified_books: 98,
                    estimated_revenue: 45280,
                    total_reviews: 1847,
                    avg_rating: "4.3",
                    active_categories: 12,
                    total_publishers: 67
                },
                velocityData: Array.from({length: 30}, (_, i) => ({
                    publish_date: new Date(Date.now() - (29-i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    books_published: Math.floor(Math.random() * 8) + 1
                })),
                genreData: [
                    { genre: 'Business', book_count: 34 },
                    { genre: 'Fiction', book_count: 28 },
                    { genre: 'Self-Help', book_count: 24 },
                    { genre: 'Technology', book_count: 19 },
                    { genre: 'Health', book_count: 15 }
                ]
            },
            communityInsights: [
                "Books with professional covers perform 40% better",
                "Tuesday-Thursday releases get 25% more visibility", 
                "Optimal description length is 15-25 words"
            ],
            milestonesFeed: [
                {
                    type: 'book_published',
                    message: '📚 TechAuthor published "The Future of AI"',
                    timestamp: new Date().toISOString(),
                    icon: '📚'
                },
                {
                    type: 'bsr_achievement',
                    message: '🚀 "Digital Marketing Mastery" hit BSR #5,678!',
                    timestamp: new Date(Date.now() - 3600000).toISOString(),
                    icon: '📈'
                },
                {
                    type: 'milestone',
                    message: '🎯 Community reached 140+ published books!',
                    timestamp: new Date(Date.now() - 7200000).toISOString(),
                    icon: '🎉'
                }
            ],
            generatedAt: new Date().toISOString()
        }
    });
});

// Catch-all handler for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'marketplace/frontend/published.html'));
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`🎨 Modern Dashboard Showcase running on http://localhost:${PORT}`);
    console.log(`📊 Visit: http://localhost:${PORT}/published`);
});

module.exports = app;