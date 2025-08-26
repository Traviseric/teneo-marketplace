// Sample data generator for published books testing
const db = require('../database/database');
const crypto = require('crypto');

class SampleDataGenerator {
    constructor() {
        this.sampleBooks = [
            {
                title: "The Future of AI: A Comprehensive Guide",
                author: "Sarah Chen",
                publisher_name: "TechAuthor",
                genre: "AI & Technology",
                description: "An in-depth exploration of artificial intelligence and its impact on business and society.",
                asin: "B08XYZ123",
                price: 24.99,
                bsr: 2450,
                rating: 4.6,
                reviews: 127,
                trend: "up"
            },
            {
                title: "Mindful Leadership in Modern Times",
                author: "Marcus Johnson",
                publisher_name: "MindfulWriter",
                genre: "Business & Entrepreneurship",
                description: "A guide to leading with mindfulness in today's fast-paced business environment.",
                asin: "B09ABC456",
                price: 19.99,
                bsr: 8521,
                rating: 4.2,
                reviews: 89,
                trend: "stable"
            },
            {
                title: "Digital Marketing Mastery",
                author: "Emily Rodriguez",
                publisher_name: "MarketingGuru",
                genre: "Marketing & Sales",
                description: "Master the art of digital marketing with proven strategies and tactics.",
                asin: "B07DEF789",
                price: 29.99,
                bsr: 1678,
                rating: 4.7,
                reviews: 234,
                trend: "up"
            },
            {
                title: "Sustainable Living Guide",
                author: "David Green",
                publisher_name: "EcoAuthor",
                genre: "Health & Wellness",
                description: "Practical tips for living a more sustainable and environmentally friendly life.",
                asin: "B08GHI012",
                price: 16.99,
                bsr: 12432,
                rating: 4.1,
                reviews: 45,
                trend: "stable"
            },
            {
                title: "Creative Writing Workshop",
                author: "Lisa Thompson",
                publisher_name: "CreativeMinds",
                genre: "Personal Development",
                description: "Unlock your creative potential with exercises and techniques from professional writers.",
                asin: "B09JKL345",
                price: 22.99,
                bsr: 25789,
                rating: 4.0,
                reviews: 67,
                trend: "down"
            },
            {
                title: "Investment Strategies for Beginners",
                author: "Robert Kim",
                publisher_name: "FinanceExpert",
                genre: "Finance & Investment",
                description: "Learn the fundamentals of investing and building wealth for the future.",
                asin: "B07MNO678",
                price: 27.99,
                bsr: 3456,
                rating: 4.4,
                reviews: 198,
                trend: "up"
            },
            {
                title: "The Psychology of Success",
                author: "Dr. Amanda White",
                publisher_name: "MindsetMaster",
                genre: "Personal Development",
                description: "Understand the psychological principles that drive success and achievement.",
                asin: "B08PQR901",
                price: 21.99,
                bsr: 5432,
                rating: 4.5,
                reviews: 156,
                trend: "up"
            },
            {
                title: "Blockchain Revolution",
                author: "Alex Turner",
                publisher_name: "TechInnovator",
                genre: "AI & Technology",
                description: "Explore how blockchain technology is transforming industries worldwide.",
                asin: "B09STU234",
                price: 32.99,
                bsr: 4567,
                rating: 4.3,
                reviews: 112,
                trend: "stable"
            },
            {
                title: "Mediterranean Cookbook",
                author: "Sofia Martinez",
                publisher_name: "CulinaryArt",
                genre: "Health & Wellness",
                description: "Delicious and healthy Mediterranean recipes for everyday cooking.",
                asin: "B07VWX567",
                price: 18.99,
                bsr: 15678,
                rating: 4.8,
                reviews: 203,
                trend: "up"
            },
            {
                title: "Remote Work Mastery",
                author: "James Wilson",
                publisher_name: "ProductivityPro",
                genre: "Business & Entrepreneurship",
                description: "Master the art of remote work and boost your productivity from anywhere.",
                asin: "B08YZA890",
                price: 23.99,
                bsr: 7890,
                rating: 4.2,
                reviews: 134,
                trend: "stable"
            },
            {
                title: "The Art of Negotiation",
                author: "Catherine Brown",
                publisher_name: "SkillBuilder",
                genre: "Business & Entrepreneurship",
                description: "Learn advanced negotiation techniques for business and personal success.",
                asin: "B09BCD123",
                price: 26.99,
                bsr: 6543,
                rating: 4.4,
                reviews: 87,
                trend: "up"
            },
            {
                title: "Quantum Physics Simplified",
                author: "Dr. Michael Lee",
                publisher_name: "ScienceSimplified",
                genre: "AI & Technology",
                description: "Make sense of quantum physics with clear explanations and real-world examples.",
                asin: "B08EFG456",
                price: 28.99,
                bsr: 9876,
                rating: 4.1,
                reviews: 76,
                trend: "stable"
            },
            {
                title: "Social Media Strategy",
                author: "Jennifer Davis",
                publisher_name: "SocialGuru",
                genre: "Marketing & Sales",
                description: "Build an effective social media presence that drives engagement and sales.",
                asin: "B07HIJ789",
                price: 20.99,
                bsr: 11234,
                rating: 4.3,
                reviews: 145,
                trend: "down"
            },
            {
                title: "Mindfulness Meditation",
                author: "Zen Master Kim",
                publisher_name: "InnerPeace",
                genre: "Health & Wellness",
                description: "Discover inner peace and reduce stress through mindfulness meditation practices.",
                asin: "B09KLM012",
                price: 17.99,
                bsr: 13567,
                rating: 4.6,
                reviews: 189,
                trend: "stable"
            },
            {
                title: "Startup Funding Secrets",
                author: "Eric Patel",
                publisher_name: "StartupSage",
                genre: "Business & Entrepreneurship",
                description: "Learn how to secure funding for your startup from investors and venture capitalists.",
                asin: "B08NOP345",
                price: 31.99,
                bsr: 4321,
                rating: 4.5,
                reviews: 167,
                trend: "up"
            },
            {
                title: "Photography Basics",
                author: "Rachel Green",
                publisher_name: "ArtisticVision",
                genre: "Personal Development",
                description: "Master the fundamentals of photography and capture stunning images.",
                asin: "B07QRS678",
                price: 24.50,
                bsr: 18900,
                rating: 4.2,
                reviews: 98,
                trend: "stable"
            },
            {
                title: "Cryptocurrency Trading",
                author: "Nathan Ford",
                publisher_name: "CryptoMaster",
                genre: "Finance & Investment",
                description: "Navigate the world of cryptocurrency trading with expert strategies and insights.",
                asin: "B09TUV901",
                price: 29.50,
                bsr: 5678,
                rating: 4.0,
                reviews: 123,
                trend: "down"
            },
            {
                title: "The Science of Sleep",
                author: "Dr. Sleep Well",
                publisher_name: "HealthScience",
                genre: "Health & Wellness",
                description: "Understand the science behind sleep and improve your sleep quality naturally.",
                asin: "B08WXY234",
                price: 19.50,
                bsr: 22345,
                rating: 4.7,
                reviews: 201,
                trend: "up"
            },
            {
                title: "Machine Learning Algorithms",
                author: "Data Scientist Pro",
                publisher_name: "DataMaster",
                genre: "AI & Technology",
                description: "Comprehensive guide to machine learning algorithms and their applications.",
                asin: "B07ZAB567",
                price: 34.99,
                bsr: 3789,
                rating: 4.3,
                reviews: 156,
                trend: "stable"
            },
            {
                title: "Public Speaking Confidence",
                author: "Speaker Supreme",
                publisher_name: "ConfidenceCoach",
                genre: "Personal Development",
                description: "Overcome your fear of public speaking and become a confident presenter.",
                asin: "B09CDE890",
                price: 21.50,
                bsr: 14567,
                rating: 4.4,
                reviews: 112,
                trend: "up"
            },
            {
                title: "Vegan Nutrition Guide",
                author: "Plant Power Pro",
                publisher_name: "HealthyLiving",
                genre: "Health & Wellness",
                description: "Complete guide to plant-based nutrition for optimal health and vitality.",
                asin: "B08FGH123",
                price: 22.50,
                bsr: 16789,
                rating: 4.5,
                reviews: 178,
                trend: "stable"
            },
            {
                title: "E-commerce Empire",
                author: "Online Entrepreneur",
                publisher_name: "EcommercePro",
                genre: "Business & Entrepreneurship",
                description: "Build a successful e-commerce business from scratch with proven strategies.",
                asin: "B07IJK456",
                price: 27.50,
                bsr: 7234,
                rating: 4.1,
                reviews: 134,
                trend: "up"
            },
            {
                title: "Time Management Mastery",
                author: "Productivity Guru",
                publisher_name: "TimeOptimizer",
                genre: "Personal Development",
                description: "Master your time and boost productivity with proven time management techniques.",
                asin: "B09LMN789",
                price: 18.50,
                bsr: 19876,
                rating: 4.3,
                reviews: 145,
                trend: "stable"
            },
            {
                title: "Content Marketing Strategy",
                author: "Content Creator",
                publisher_name: "MarketingEdge",
                genre: "Marketing & Sales",
                description: "Create compelling content that attracts, engages, and converts your audience.",
                asin: "B08OPQ012",
                price: 25.50,
                bsr: 8901,
                rating: 4.2,
                reviews: 167,
                trend: "down"
            },
            {
                title: "Financial Freedom Blueprint",
                author: "Wealth Builder",
                publisher_name: "WealthMaster",
                genre: "Finance & Investment",
                description: "Your step-by-step guide to achieving financial independence and wealth.",
                asin: "B07RST345",
                price: 26.50,
                bsr: 6789,
                rating: 4.6,
                reviews: 189,
                trend: "up"
            },
            {
                title: "Yoga for Beginners",
                author: "Flexibility Master",
                publisher_name: "YogaLife",
                genre: "Health & Wellness",
                description: "Start your yoga journey with beginner-friendly poses and breathing techniques.",
                asin: "B09UVW678",
                price: 17.50,
                bsr: 21234,
                rating: 4.4,
                reviews: 156,
                trend: "stable"
            },
            {
                title: "Leadership Psychology",
                author: "Leader Supreme",
                publisher_name: "LeadershipPro",
                genre: "Business & Entrepreneurship",
                description: "Understand the psychology of effective leadership and inspire your team.",
                asin: "B08XYZ901",
                price: 30.50,
                bsr: 5432,
                rating: 4.3,
                reviews: 123,
                trend: "up"
            },
            {
                title: "Artificial Intelligence Ethics",
                author: "Ethics Expert",
                publisher_name: "AIEthics",
                genre: "AI & Technology",
                description: "Navigate the ethical challenges of AI development and implementation.",
                asin: "B07ABC234",
                price: 33.50,
                bsr: 4567,
                rating: 4.1,
                reviews: 98,
                trend: "stable"
            },
            {
                title: "SEO Optimization Guide",
                author: "SEO Master",
                publisher_name: "SEOPro",
                genre: "Marketing & Sales",
                description: "Optimize your website for search engines and increase organic traffic.",
                asin: "B09DEF567",
                price: 23.50,
                bsr: 10234,
                rating: 4.2,
                reviews: 134,
                trend: "up"
            },
            {
                title: "Personal Finance Basics",
                author: "Money Mentor",
                publisher_name: "FinancialWisdom",
                genre: "Finance & Investment",
                description: "Master personal finance fundamentals and take control of your money.",
                asin: "B08GHI890",
                price: 20.50,
                bsr: 12345,
                rating: 4.5,
                reviews: 178,
                trend: "stable"
            }
        ];

        this.publisherProfiles = [
            { name: "Sarah Chen", display_name: "TechAuthor", books_count: 0 },
            { name: "Marcus Johnson", display_name: "MindfulWriter", books_count: 0 },
            { name: "Emily Rodriguez", display_name: "MarketingGuru", books_count: 0 },
            { name: "David Green", display_name: "EcoAuthor", books_count: 0 },
            { name: "Lisa Thompson", display_name: "CreativeMinds", books_count: 0 },
            { name: "Robert Kim", display_name: "FinanceExpert", books_count: 0 },
            { name: "Dr. Amanda White", display_name: "MindsetMaster", books_count: 0 },
            { name: "Alex Turner", display_name: "TechInnovator", books_count: 0 },
            { name: "Sofia Martinez", display_name: "CulinaryArt", books_count: 0 },
            { name: "James Wilson", display_name: "ProductivityPro", books_count: 0 }
        ];
    }

    generateRandomUserId() {
        return 'user_' + crypto.randomBytes(8).toString('hex');
    }

    generateRandomTeneoBookId() {
        return 'teneo_book_' + crypto.randomBytes(6).toString('hex');
    }

    getRandomDateInPast(maxDaysAgo = 180) {
        const daysAgo = Math.floor(Math.random() * maxDaysAgo);
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        return date.toISOString();
    }

    async createSampleData() {
        try {
            console.log('🎯 Creating sample published books data...');

            // Create sample users and their stats first
            const userStats = new Map();

            for (let i = 0; i < this.sampleBooks.length; i++) {
                const book = this.sampleBooks[i];
                const userId = this.generateRandomUserId();
                const teneoBookId = this.generateRandomTeneoBookId();
                const createdAt = this.getRandomDateInPast();

                // Insert published book
                const insertBookQuery = `
                    INSERT INTO published_books (
                        teneo_book_id, teneo_user_id, amazon_asin, amazon_url,
                        title, author, description, cover_image_url, publication_date,
                        page_count, language, current_price, currency, bestseller_rank,
                        category_rank, primary_category, rating_average, rating_count,
                        review_count, verification_status, created_at, last_data_fetch
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;

                const bookParams = [
                    teneoBookId,
                    userId,
                    book.asin,
                    `https://amazon.com/dp/${book.asin}`,
                    book.title,
                    book.author,
                    book.description,
                    `https://images-na.ssl-images-amazon.com/images/I/${book.asin}.jpg`,
                    this.getRandomDateInPast(90),
                    Math.floor(Math.random() * 200) + 100, // 100-300 pages
                    'en',
                    book.price,
                    'USD',
                    book.bsr,
                    Math.floor(book.bsr / 10), // Category rank is typically better
                    book.genre,
                    book.rating,
                    book.reviews,
                    book.reviews,
                    'verified',
                    createdAt,
                    new Date().toISOString()
                ];

                const result = await db.run(insertBookQuery, bookParams);
                const publishedBookId = result.lastID;

                // Create book amazon data
                const amazonDataQuery = `
                    INSERT INTO book_amazon_data (
                        published_book_id, main_category, category_rankings,
                        keywords, trend_direction, rank_improvement_30d,
                        trend_score, last_updated
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `;

                const trendScore = book.trend === 'up' ? 70 + Math.floor(Math.random() * 30) : 
                                book.trend === 'down' ? 20 + Math.floor(Math.random() * 30) :
                                40 + Math.floor(Math.random() * 20);

                const rankImprovement = book.trend === 'up' ? Math.floor(Math.random() * 5000) + 1000 :
                                     book.trend === 'down' ? -Math.floor(Math.random() * 3000) - 500 :
                                     Math.floor(Math.random() * 1000) - 500;

                await db.run(amazonDataQuery, [
                    publishedBookId,
                    book.genre,
                    JSON.stringify([{rank: book.bsr, category: book.genre}]),
                    JSON.stringify(this.generateKeywords(book.title, book.genre)),
                    book.trend,
                    rankImprovement,
                    trendScore,
                    new Date().toISOString()
                ]);

                // Create historical data
                for (let j = 0; j < 5; j++) {
                    const historyDate = new Date(createdAt);
                    historyDate.setDate(historyDate.getDate() + (j * 7));
                    
                    const historicalBSR = book.bsr + (Math.floor(Math.random() * 2000) - 1000);
                    const historicalRating = Math.max(3.0, Math.min(5.0, book.rating + (Math.random() * 0.4 - 0.2)));
                    const historicalReviews = Math.max(1, book.reviews - Math.floor(Math.random() * 20));

                    const historyQuery = `
                        INSERT INTO book_ranking_history (
                            published_book_id, bestseller_rank, category_rank,
                            rating_average, rating_count, review_count, price,
                            trend_direction, rank_change, recorded_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `;

                    await db.run(historyQuery, [
                        publishedBookId,
                        historicalBSR,
                        Math.floor(historicalBSR / 10),
                        Math.round(historicalRating * 10) / 10,
                        historicalReviews,
                        historicalReviews,
                        book.price + (Math.random() * 4 - 2),
                        book.trend,
                        rankImprovement,
                        historyDate.toISOString()
                    ]);
                }

                // Track user stats
                if (!userStats.has(book.publisher_name)) {
                    userStats.set(book.publisher_name, {
                        userId: userId,
                        books: 0,
                        totalReviews: 0,
                        bestBSR: 999999,
                        author: book.author
                    });
                }

                const stats = userStats.get(book.publisher_name);
                stats.books++;
                stats.totalReviews += book.reviews;
                stats.bestBSR = Math.min(stats.bestBSR, book.bsr);
            }

            // Create publisher stats
            for (const [publisherName, stats] of userStats) {
                const publisherQuery = `
                    INSERT OR REPLACE INTO publisher_stats (
                        user_id, username, display_name, total_books, verified_books,
                        total_reviews, best_bsr, books_last_30_days, avg_rating,
                        badges_earned, free_generations_available, rewards_earned, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;

                const booksLast30Days = Math.min(stats.books, Math.floor(Math.random() * 5) + 1);
                const avgRating = 3.8 + (Math.random() * 1.0);

                await db.run(publisherQuery, [
                    stats.userId,
                    publisherName.toLowerCase().replace(/\s+/g, ''),
                    publisherName,
                    stats.books,
                    stats.books,
                    stats.totalReviews,
                    stats.bestBSR,
                    booksLast30Days,
                    Math.round(avgRating * 10) / 10,
                    JSON.stringify([]),
                    0,
                    0,
                    new Date().toISOString()
                ]);
            }

            // Update milestone progress
            await this.updateMilestoneProgress();

            console.log(`✅ Created ${this.sampleBooks.length} sample published books`);
            console.log(`✅ Created ${userStats.size} sample publishers`);
            console.log('🎉 Sample data generation complete!');

            return {
                books_created: this.sampleBooks.length,
                publishers_created: userStats.size,
                success: true
            };

        } catch (error) {
            console.error('❌ Error creating sample data:', error);
            throw error;
        }
    }

    generateKeywords(title, genre) {
        const titleWords = title.toLowerCase().split(/\s+/).filter(word => 
            word.length > 3 && !['the', 'and', 'for', 'with', 'from'].includes(word)
        );

        const genreWords = genre.toLowerCase().split(/\s+/);

        const commonKeywords = {
            'AI & Technology': ['artificial', 'intelligence', 'machine', 'learning', 'technology', 'digital', 'innovation'],
            'Business & Entrepreneurship': ['business', 'entrepreneur', 'startup', 'leadership', 'strategy', 'management'],
            'Marketing & Sales': ['marketing', 'sales', 'advertising', 'branding', 'promotion', 'customer'],
            'Health & Wellness': ['health', 'wellness', 'fitness', 'nutrition', 'lifestyle', 'wellbeing'],
            'Personal Development': ['personal', 'development', 'growth', 'success', 'motivation', 'improvement'],
            'Finance & Investment': ['finance', 'investment', 'money', 'wealth', 'financial', 'investing']
        };

        let keywords = [...titleWords];
        keywords.push(...genreWords);
        
        if (commonKeywords[genre]) {
            keywords.push(...commonKeywords[genre].slice(0, 3));
        }

        return [...new Set(keywords)].slice(0, 10);
    }

    async updateMilestoneProgress() {
        try {
            const countQuery = `
                SELECT COUNT(*) as verified_count 
                FROM published_books 
                WHERE verification_status = 'verified'
            `;
            const result = await db.get(countQuery);
            const verifiedCount = result.verified_count;

            const updateQuery = `
                UPDATE publication_milestones 
                SET current_count = ?, 
                    achieved_at = CASE 
                        WHEN ? >= target_count AND achieved_at IS NULL THEN CURRENT_TIMESTAMP 
                        ELSE achieved_at 
                    END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE milestone_name = '10K_BOOKS_GOAL'
            `;

            await db.run(updateQuery, [verifiedCount, verifiedCount]);
            console.log(`📊 Updated milestone progress: ${verifiedCount} books`);
        } catch (error) {
            console.error('Error updating milestone progress:', error);
        }
    }

    async clearSampleData() {
        try {
            console.log('🗑️  Clearing existing sample data...');
            
            // Clear in reverse order of dependencies
            await db.run('DELETE FROM book_ranking_history WHERE published_book_id IN (SELECT id FROM published_books)');
            await db.run('DELETE FROM book_amazon_data WHERE published_book_id IN (SELECT id FROM published_books)');
            await db.run('DELETE FROM published_books');
            await db.run('DELETE FROM publisher_stats');
            await db.run('DELETE FROM publisher_milestones');
            
            console.log('✅ Sample data cleared');
        } catch (error) {
            console.error('❌ Error clearing sample data:', error);
            throw error;
        }
    }
}

// CLI interface
if (require.main === module) {
    const generator = new SampleDataGenerator();
    
    const command = process.argv[2];
    
    if (command === 'clear') {
        generator.clearSampleData()
            .then(() => process.exit(0))
            .catch(error => {
                console.error(error);
                process.exit(1);
            });
    } else {
        generator.createSampleData()
            .then(() => process.exit(0))
            .catch(error => {
                console.error(error);
                process.exit(1);
            });
    }
}

module.exports = SampleDataGenerator;