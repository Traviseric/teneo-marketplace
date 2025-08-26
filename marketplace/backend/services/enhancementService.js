const db = require('../database/database');
const AmazonService = require('./amazonService');

class EnhancementService {
    constructor() {
        this.amazonService = new AmazonService();
    }

    /**
     * Smart data fetching with fallback strategy:
     * 1. Try Amazon API (if available) 
     * 2. Try Amazon scraping (if not blocked)
     * 3. Try manual enhancement data
     * 4. Return basic data with enhancement suggestion
     */
    async getEnhancedBookData(asin) {
        try {
            // Strategy 1: Try Amazon API first (when available)
            if (process.env.AMAZON_API_KEY) {
                try {
                    return await this.fetchFromAmazonAPI(asin);
                } catch (apiError) {
                    console.log(`Amazon API failed for ${asin}:`, apiError.message);
                }
            }

            // Strategy 2: Try scraping (with caution)
            try {
                const scrapedData = await this.amazonService.fetchBookData(asin);
                if (scrapedData && scrapedData.title) {
                    return {
                        ...scrapedData,
                        source: 'amazon_scraping',
                        confidence: 'high'
                    };
                }
            } catch (scrapingError) {
                console.log(`Amazon scraping failed for ${asin}:`, scrapingError.message);
            }

            // Strategy 3: Use manual enhancement data
            const manualData = await this.getManualEnhancement(asin);
            if (manualData) {
                return {
                    ...manualData,
                    source: 'manual_enhancement',
                    confidence: 'high'
                };
            }

            // Strategy 4: Return minimal data with enhancement suggestion
            return {
                asin: asin,
                title: null,
                author: null,
                source: 'none',
                confidence: 'low',
                suggestion: 'Consider adding manual enhancement data for this book',
                enhancement_url: `/manual-book-enhancement.html?asin=${asin}`
            };

        } catch (error) {
            console.error('Error in enhanced book data fetching:', error);
            throw error;
        }
    }

    /**
     * Get manual enhancement data for an ASIN
     */
    async getManualEnhancement(asin) {
        try {
            const query = `
                SELECT * FROM manual_book_enhancements 
                WHERE asin = ? 
                ORDER BY COALESCE(updated_at, created_at) DESC 
                LIMIT 1
            `;
            
            const enhancement = await db.get(query, [asin]);
            
            if (!enhancement) {
                return null;
            }

            return {
                asin: enhancement.asin,
                title: enhancement.actual_title,
                author: enhancement.actual_author,
                description: enhancement.description,
                coverImage: enhancement.cover_image_url,
                price: enhancement.current_price,
                currency: enhancement.currency || 'USD',
                rating: enhancement.rating_average,
                ratingCount: enhancement.rating_count,
                reviewCount: enhancement.review_count,
                bestseller_rank: enhancement.bestseller_rank,
                category_rank: enhancement.category_rank,
                category: enhancement.primary_category,
                publicationDate: enhancement.publication_date,
                pageCount: enhancement.page_count,
                language: enhancement.language || 'en',
                
                // Enhancement metadata
                enhancement_source: enhancement.source,
                enhancement_notes: enhancement.notes,
                last_updated: enhancement.updated_at || enhancement.created_at
            };

        } catch (error) {
            console.error('Error fetching manual enhancement:', error);
            return null;
        }
    }

    /**
     * Save manual enhancement data
     */
    async saveManualEnhancement(asin, enhancementData, source = 'manual_entry', notes = null) {
        try {
            const query = `
                INSERT OR REPLACE INTO manual_book_enhancements (
                    asin, actual_title, actual_author, description,
                    bestseller_rank, category_rank, primary_category,
                    current_price, currency, rating_average, rating_count,
                    review_count, cover_image_url, publication_date,
                    page_count, language, source, notes, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `;

            const result = await db.run(query, [
                asin,
                enhancementData.title,
                enhancementData.author,
                enhancementData.description,
                enhancementData.bestseller_rank,
                enhancementData.category_rank,
                enhancementData.category,
                enhancementData.price,
                enhancementData.currency || 'USD',
                enhancementData.rating,
                enhancementData.ratingCount,
                enhancementData.reviewCount,
                enhancementData.coverImage,
                enhancementData.publicationDate,
                enhancementData.pageCount,
                enhancementData.language || 'en',
                source,
                notes
            ]);

            return {
                success: true,
                enhancement_id: result.lastID || result.changes,
                action: result.changes > 0 ? 'updated' : 'created'
            };

        } catch (error) {
            console.error('Error saving manual enhancement:', error);
            throw error;
        }
    }

    /**
     * Batch process multiple ASINs for enhancement
     */
    async batchEnhanceBooks(asins, options = {}) {
        const results = [];
        const errors = [];
        const delay = options.delay || 3000; // 3 second delay between requests

        for (const asin of asins) {
            try {
                await this.sleep(delay);
                
                const enhancedData = await this.getEnhancedBookData(asin);
                
                results.push({
                    asin,
                    title: enhancedData.title,
                    source: enhancedData.source,
                    confidence: enhancedData.confidence,
                    status: 'success'
                });

            } catch (error) {
                errors.push({
                    asin,
                    error: error.message,
                    status: 'failed'
                });
            }
        }

        return {
            processed: asins.length,
            successful: results.length,
            failed: errors.length,
            results,
            errors
        };
    }

    /**
     * Amazon Search Results Fallback
     * Less aggressive than full page scraping
     */
    async searchAmazonForBasicData(asin) {
        try {
            // Search for the ASIN specifically
            const searchUrl = `https://www.amazon.com/s?k=${asin}`;
            
            // Use lighter scraping for search results
            const response = await fetch(searchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (!response.ok) {
                throw new Error(`Search failed: ${response.status}`);
            }

            const html = await response.text();
            
            // Extract basic info from search results (less detection risk)
            const titleMatch = html.match(/<span class="[^"]*"[^>]*>([^<]+)<\/span>/);
            const priceMatch = html.match(/\$(\d+\.?\d*)/);
            
            const basicData = {
                asin,
                title: titleMatch ? titleMatch[1] : null,
                price: priceMatch ? parseFloat(priceMatch[1]) : null,
                source: 'amazon_search_light',
                confidence: 'medium',
                timestamp: new Date().toISOString()
            };

            // Cache this data for future use
            await this.cacheSearchResult(asin, basicData);
            
            return basicData;

        } catch (error) {
            console.error(`Amazon search failed for ${asin}:`, error.message);
            return null;
        }
    }

    /**
     * Cache search results for future fallback
     */
    async cacheSearchResult(asin, searchData) {
        try {
            const query = `
                INSERT OR REPLACE INTO amazon_search_cache (
                    asin, title, price, search_source, search_timestamp
                ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            `;

            await db.run(query, [
                asin,
                searchData.title,
                searchData.price,
                searchData.source
            ]);

        } catch (error) {
            console.error('Error caching search result:', error);
        }
    }

    /**
     * Placeholder for future Amazon API integration
     */
    async fetchFromAmazonAPI(asin) {
        // When Amazon API is approved, implement here
        throw new Error('Amazon API not yet implemented - awaiting approval');
    }

    /**
     * Utility function for delays
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = EnhancementService;