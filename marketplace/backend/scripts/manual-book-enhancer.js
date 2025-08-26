// Manual Book Enhancement System
// Gives Travis immediate control over book data without relying on scraping

const db = require('../database/database');

class ManualBookEnhancer {
    constructor() {
        // Travis's real books with manual enhancement data
        this.enhancedBooks = [
            {
                asin: "B0FHF78VGF",
                teneo_book_id: "teneo_book_travis_001",
                teneo_user_id: "user_travis_eric",
                
                // REAL DATA - Manually verified by Travis
                manual_data: {
                    title: "The Hidden Triggers of Elite Habits: Decode the Micro-Cues That Automate World-Class Performance",
                    author: "Travis Eric",
                    description: "A revolutionary approach to habit formation that reveals the micro-cues elite performers use to automate world-class behavior. Generated with Teneo AI and refined through real-world testing.",
                    
                    // Performance metrics (Travis updates these)
                    bestseller_rank: 1637,
                    category_rank: 45,
                    primary_category: "Business & Money > Management & Leadership",
                    
                    // Pricing (Travis controls)
                    current_price: 9.99,
                    currency: "USD",
                    
                    // Reviews (Travis tracks)
                    rating_average: 4.2,
                    rating_count: 23,
                    review_count: 12,
                    
                    // Images (Direct Amazon URLs)
                    cover_image_url: "https://m.media-amazon.com/images/I/71jY3DCUANL._SY522_.jpg",
                    
                    // Publishing info
                    publication_date: "2024-12-15",
                    page_count: 186,
                    language: "en",
                    
                    // Marketing data Travis can control
                    featured: true,
                    trending: "up",
                    tags: ["AI-generated", "business", "habits", "productivity", "elite-performance"],
                    
                    // Success metrics
                    verification_status: "verified",
                    success_level: "bestseller", // bestseller, rising, established, new
                    
                    // Last updated
                    last_manual_update: new Date().toISOString()
                }
            },
            {
                asin: "B0FHFTYS7D", 
                teneo_book_id: "teneo_book_travis_002",
                teneo_user_id: "user_travis_eric",
                
                manual_data: {
                    title: "The Patterned Species: Mapping Humanity's Recurring Codes to Forecast Our Future",
                    author: "Travis Eric", 
                    description: "An exploration of recurring human patterns throughout history and how understanding these codes can help us predict and shape our collective future. Created with advanced AI and human insight.",
                    
                    // Travis will update these manually
                    bestseller_rank: null, // Not ranked yet or Travis hasn't updated
                    category_rank: null,
                    primary_category: "Science & Math > Future Studies",
                    
                    current_price: 12.99,
                    currency: "USD",
                    
                    rating_average: null, // No ratings yet
                    rating_count: 0,
                    review_count: 0,
                    
                    cover_image_url: null, // Travis needs to add
                    
                    publication_date: "2024-12-20",
                    page_count: 224,
                    language: "en",
                    
                    featured: false,
                    trending: "new",
                    tags: ["AI-generated", "future-studies", "patterns", "humanity", "forecasting"],
                    
                    verification_status: "verified",
                    success_level: "new",
                    
                    last_manual_update: new Date().toISOString()
                }
            }
        ];
    }

    // Load enhanced books into database
    async loadEnhancedBooks() {
        try {
            console.log('🔧 Loading manually enhanced book data...');
            
            for (const book of this.enhancedBooks) {
                const data = book.manual_data;
                
                // Insert/update book with enhanced manual data
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
                    `https://amazon.com/dp/${book.asin}`,
                    data.title,
                    data.author,
                    data.description,
                    data.cover_image_url,
                    data.publication_date,
                    data.page_count,
                    data.language,
                    data.current_price,
                    data.currency,
                    data.bestseller_rank,
                    data.category_rank,
                    data.primary_category,
                    data.rating_average,
                    data.rating_count,
                    data.review_count,
                    data.verification_status,
                    new Date().toISOString(),
                    data.last_manual_update
                ];

                await db.run(insertQuery, params);
                console.log(`✅ Enhanced: ${data.title}`);
                
                // Add enhanced metadata to separate table
                await this.addEnhancedMetadata(book);
            }

            console.log('✅ Manual enhancement complete!');
            return {
                success: true,
                books_enhanced: this.enhancedBooks.length,
                message: 'All books enhanced with manual data'
            };

        } catch (error) {
            console.error('❌ Error loading enhanced books:', error);
            throw error;
        }
    }

    // Store additional enhancement metadata
    async addEnhancedMetadata(book) {
        try {
            const enhancedDataQuery = `
                INSERT OR REPLACE INTO book_amazon_data (
                    published_book_id, formats_available, keywords_detected,
                    estimated_daily_sales, data_quality_score, last_updated
                ) 
                SELECT id, ?, ?, ?, ?, ?
                FROM published_books 
                WHERE amazon_asin = ?
            `;

            const data = book.manual_data;
            const enhancedParams = [
                JSON.stringify(["kindle", "paperback"]), // Available formats
                JSON.stringify(data.tags), // Keywords from tags
                this.estimateDailySales(data.bestseller_rank), // Smart estimation
                95, // High quality score for manual data
                data.last_manual_update,
                book.asin
            ];

            await db.run(enhancedDataQuery, enhancedParams);
            
        } catch (error) {
            console.error('Error adding enhanced metadata:', error);
            // Continue anyway - main book data is more important
        }
    }

    // Smart sales estimation based on BSR
    estimateDailySales(bsr) {
        if (!bsr) return 0;
        if (bsr < 1000) return 50;
        if (bsr < 5000) return 20;
        if (bsr < 10000) return 10;
        if (bsr < 50000) return 5;
        if (bsr < 100000) return 2;
        return 1;
    }

    // Get book for editing
    getBookForEdit(asin) {
        return this.enhancedBooks.find(book => book.asin === asin);
    }

    // Update book data (Travis can call this)
    updateBook(asin, updates) {
        const bookIndex = this.enhancedBooks.findIndex(book => book.asin === asin);
        if (bookIndex !== -1) {
            this.enhancedBooks[bookIndex].manual_data = {
                ...this.enhancedBooks[bookIndex].manual_data,
                ...updates,
                last_manual_update: new Date().toISOString()
            };
            return true;
        }
        return false;
    }

    // Add new book (when Travis publishes more)
    addNewBook(bookData) {
        const newBook = {
            asin: bookData.asin,
            teneo_book_id: `teneo_book_travis_${String(this.enhancedBooks.length + 1).padStart(3, '0')}`,
            teneo_user_id: "user_travis_eric",
            manual_data: {
                ...bookData,
                verification_status: "verified",
                last_manual_update: new Date().toISOString()
            }
        };
        
        this.enhancedBooks.push(newBook);
        return newBook;
    }

    // Generate simple API data (no complex joins)
    async getSimpleBookData() {
        try {
            const books = await db.all(`
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
                WHERE teneo_user_id = 'user_travis_eric'
                ORDER BY created_at DESC
            `);

            return {
                success: true,
                data: {
                    books: books.map(book => ({
                        ...book,
                        publisher_name: "Travis Eric",
                        trend_direction: this.getTrendDirection(book.bestseller_rank),
                        success_badge: this.getSuccessBadge(book.bestseller_rank, book.rating_average)
                    })),
                    total_books: books.length,
                    verified_books: books.filter(b => b.verification_status === 'verified').length
                }
            };
        } catch (error) {
            console.error('Error getting simple book data:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    getTrendDirection(bsr) {
        if (!bsr) return null;
        if (bsr < 5000) return "up";
        if (bsr < 20000) return "stable"; 
        return "down";
    }

    getSuccessBadge(bsr, rating) {
        if (bsr && bsr < 10000) return "bestseller";
        if (rating && rating >= 4.0) return "highly-rated";
        if (bsr && bsr < 50000) return "rising";
        return "published";
    }
}

// CLI interface for Travis to manage books
if (require.main === module) {
    const enhancer = new ManualBookEnhancer();
    
    const command = process.argv[2];
    
    if (command === 'load') {
        enhancer.loadEnhancedBooks()
            .then(result => {
                console.log('📊 Result:', result);
                process.exit(0);
            })
            .catch(error => {
                console.error(error);
                process.exit(1);
            });
            
    } else if (command === 'api-test') {
        enhancer.getSimpleBookData()
            .then(result => {
                console.log('📋 API Response:', JSON.stringify(result, null, 2));
                process.exit(0);
            })
            .catch(error => {
                console.error(error);
                process.exit(1);
            });
            
    } else {
        console.log(`
🔧 Manual Book Enhancement System

Commands:
  node manual-book-enhancer.js load      - Load enhanced book data
  node manual-book-enhancer.js api-test  - Test API response
  
Travis can edit the enhancedBooks array to update data immediately!
        `);
        process.exit(0);
    }
}

module.exports = ManualBookEnhancer;