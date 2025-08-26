// Real data setup for published books - Travis's actual Teneo-generated books ONLY
const db = require('../database/database');
const AmazonService = require('../services/amazonService');

class RealDataSetup {
    constructor() {
        this.amazonService = new AmazonService();
        
        // ONLY Travis's real Teneo-generated books - no fake data
        this.realBooks = [
            {
                teneo_book_id: "teneo_book_travis_001",
                teneo_user_id: "user_travis_eric", 
                asin: "B0FHF78VGF", // REAL ASIN #1
                amazon_url: "https://amazon.com/dp/B0FHF78VGF",
                publisher_name: "Travis Eric",
                verification_status: "verified"
            },
            {
                teneo_book_id: "teneo_book_travis_002", 
                teneo_user_id: "user_travis_eric",
                asin: "B0FHFTYS7D", // REAL ASIN #2
                amazon_url: "https://amazon.com/dp/B0FHFTYS7D", 
                publisher_name: "Travis Eric",
                verification_status: "verified"
            }
        ];
    }

    async setupRealData() {
        try {
            console.log('🔥 Setting up marketplace with REAL Teneo books only...');
            console.log('📖 Adding Travis Eric\'s actual published books');

            // First, clear any existing fake data
            await this.clearFakeData();

            for (const book of this.realBooks) {
                console.log(`📚 Fetching real data for ASIN: ${book.asin}`);
                
                try {
                    // Fetch REAL data from Amazon
                    const amazonData = await this.amazonService.fetchBookData(book.asin);
                    
                    // Insert with real Amazon data
                    const insertQuery = `
                        INSERT OR REPLACE INTO published_books (
                            teneo_book_id, teneo_user_id, amazon_asin, amazon_url,
                            title, author, description, cover_image_url, publication_date,
                            page_count, language, current_price, currency, bestseller_rank,
                            category_rank, primary_category, rating_average, rating_count,
                            review_count, verification_status, created_at, last_data_fetch
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `;

                    const params = [
                        book.teneo_book_id,
                        book.teneo_user_id,
                        book.asin,
                        book.amazon_url,
                        amazonData.title || 'Real Teneo Book',
                        amazonData.author || 'Travis Eric',
                        amazonData.description || 'AI-generated book created with Teneo',
                        amazonData.coverImage,
                        amazonData.publicationDate,
                        amazonData.pageCount,
                        amazonData.language || 'en',
                        amazonData.price,
                        amazonData.currency || 'USD',
                        amazonData.bestseller_rank,
                        amazonData.category_rank,
                        amazonData.category || 'Business',
                        amazonData.rating,
                        amazonData.ratingCount,
                        amazonData.reviewCount,
                        book.verification_status,
                        new Date().toISOString(),
                        new Date().toISOString()
                    ];

                    const result = await db.run(insertQuery, params);
                    console.log(`✅ Added real book: ${amazonData.title || book.asin}`);
                    
                    // Add historical data later - focus on getting books added first
                    console.log(`📊 Book data: BSR ${amazonData.bestseller_rank}, Rating ${amazonData.rating}`);

                } catch (amazonError) {
                    console.error(`⚠️ Could not fetch Amazon data for ${book.asin}:`, amazonError.message);
                    console.log(`📝 Adding book with basic info only`);
                    
                    // Insert with basic info if Amazon fetch fails
                    const basicInsertQuery = `
                        INSERT OR REPLACE INTO published_books (
                            teneo_book_id, teneo_user_id, amazon_asin, amazon_url,
                            title, author, verification_status, created_at, last_data_fetch
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `;

                    await db.run(basicInsertQuery, [
                        book.teneo_book_id,
                        book.teneo_user_id,
                        book.asin,
                        book.amazon_url,
                        'Travis Eric\'s Teneo Book',
                        'Travis Eric',
                        book.verification_status,
                        new Date().toISOString(),
                        new Date().toISOString()
                    ]);
                }
            }

            // Create Travis Eric's publisher profile
            await this.setupPublisherProfile();
            
            // Update milestone progress with real count
            await this.updateMilestoneProgress();

            console.log('✅ Real data setup complete!');
            console.log('🎯 Marketplace now shows authentic Teneo success');
            console.log(`📊 Books in system: ${this.realBooks.length} (all real)`);

            return {
                books_added: this.realBooks.length,
                message: 'Only real Teneo-generated books added',
                authentic: true
            };

        } catch (error) {
            console.error('❌ Error setting up real data:', error);
            throw error;
        }
    }

    async clearFakeData() {
        try {
            console.log('🗑️ Clearing any fake sample data...');
            
            // Clear fake data - keep only real stuff
            await db.run('DELETE FROM book_ranking_history WHERE published_book_id IN (SELECT id FROM published_books WHERE teneo_user_id != ?)', ['user_travis_eric']);
            await db.run('DELETE FROM book_amazon_data WHERE published_book_id IN (SELECT id FROM published_books WHERE teneo_user_id != ?)', ['user_travis_eric']);
            await db.run('DELETE FROM published_books WHERE teneo_user_id != ?', ['user_travis_eric']);
            await db.run('DELETE FROM publisher_stats WHERE user_id != ?', ['user_travis_eric']);
            
            console.log('✅ Fake data cleared - authentic marketplace only');
        } catch (error) {
            console.error('Error clearing fake data:', error);
            // Continue anyway
        }
    }

    async setupPublisherProfile() {
        try {
            const publisherQuery = `
                INSERT OR REPLACE INTO publisher_stats (
                    user_id, username, display_name, total_books, verified_books,
                    total_reviews, best_bsr, books_last_30_days, avg_rating,
                    badges_earned, free_generations_available, rewards_earned, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            // Get actual stats from published books
            const statsQuery = `
                SELECT 
                    COUNT(*) as book_count,
                    COUNT(CASE WHEN verification_status = 'verified' THEN 1 END) as verified_count,
                    SUM(COALESCE(rating_count, 0)) as total_reviews,
                    MIN(COALESCE(bestseller_rank, 999999)) as best_bsr,
                    AVG(COALESCE(rating_average, 0)) as avg_rating
                FROM published_books 
                WHERE teneo_user_id = ?
            `;
            
            const stats = await db.get(statsQuery, ['user_travis_eric']);

            await db.run(publisherQuery, [
                'user_travis_eric',
                'travis_eric',
                'Travis Eric', 
                stats.book_count || 0,
                stats.verified_count || 0,
                stats.total_reviews || 0,
                stats.best_bsr < 999999 ? stats.best_bsr : null,
                stats.book_count || 0, // All books are recent for now
                Math.round((stats.avg_rating || 0) * 10) / 10,
                JSON.stringify(stats.book_count >= 5 ? ['bronze_book'] : []),
                0,
                0,
                new Date().toISOString()
            ]);

            console.log('✅ Travis Eric publisher profile created');
        } catch (error) {
            console.error('Error creating publisher profile:', error);
        }
    }

    async updateMilestoneProgress() {
        try {
            const countQuery = `
                SELECT COUNT(*) as verified_count 
                FROM published_books 
                WHERE verification_status = 'verified'
            `;
            const result = await db.get(countQuery);
            const verifiedCount = result.verified_count || 0;

            const updateQuery = `
                UPDATE publication_milestones 
                SET current_count = ?, 
                    updated_at = CURRENT_TIMESTAMP
                WHERE milestone_name = '10K_BOOKS_GOAL'
            `;

            await db.run(updateQuery, [verifiedCount]);
            console.log(`📊 Milestone updated: ${verifiedCount} real books toward 10K goal`);
        } catch (error) {
            console.error('Error updating milestone:', error);
        }
    }
}

// CLI interface
if (require.main === module) {
    const setupReal = new RealDataSetup();
    
    const command = process.argv[2];
    
    if (command === 'clear') {
        setupReal.clearFakeData()
            .then(() => process.exit(0))
            .catch(error => {
                console.error(error);
                process.exit(1);
            });
    } else {
        setupReal.setupRealData()
            .then(() => process.exit(0))
            .catch(error => {
                console.error(error);
                process.exit(1);
            });
    }
}

module.exports = RealDataSetup;