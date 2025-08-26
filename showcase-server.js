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
                total_books: 0,
                verified_books: 0,
                ranked_books: 0,
                avg_rating: 0,
                best_rank: null
            },
            recent: {
                books_this_week: 0,
                new_authors: 0
            },
            milestones: [{
                milestone_name: '10K_BOOKS_GOAL',
                current_count: 0,
                target_count: 10000,
                achieved_at: null
            }],
            empty_state: {
                show: true,
                message: "🎯 Ready for authentic Teneo success stories",
                subtitle: "Quality over quantity - real AI publishing results only"
            }
        }
    });
});

app.get('/api/published/dashboard', (req, res) => {
    // Authentic empty state - showing real potential
    // In production, this will show actual Teneo-generated books
    const realBooks = [
        // Empty state - will be populated with real user submissions
        // When users submit their published Teneo books, they'll appear here
    ];

    res.json({
        success: true,
        data: {
            books: realBooks,
            pagination: {
                current_page: 1,
                per_page: 20,
                total_items: realBooks.length,
                total_pages: realBooks.length > 0 ? 1 : 0
            },
            empty_state: {
                show: realBooks.length === 0,
                title: "🚀 Building the Future of AI Publishing",
                message: "The Teneo marketplace is ready for real AI-generated books. When authors publish their Teneo creations on Amazon, they'll showcase here.",
                call_to_action: "Be the first to share your Teneo success story!",
                authentic: true
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
                entries: []
            },
            rising_stars: {
                title: "Rising Stars", 
                entries: []
            },
            best_sellers: {
                title: "Best Sellers",
                entries: []
            },
            empty_state: {
                show: true,
                title: "🏆 Leaderboards Coming Soon",
                message: "As Teneo authors share their publishing success, competitive leaderboards will emerge here.",
                authentic: true
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