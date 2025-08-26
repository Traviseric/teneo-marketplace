// Amazon Search API - Clever backup strategy
// Much less aggressive than product page scraping
// Uses search results which are more permissive

const axios = require('axios');
const cheerio = require('cheerio');

class AmazonSearchService {
    constructor() {
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        this.baseURL = 'https://www.amazon.com';
        this.delay = 3000; // Longer delay for safety
        this.maxRetries = 2;
    }

    // Search for book by ASIN - less detection than product page scraping
    async searchByASIN(asin) {
        try {
            console.log(`🔍 Searching Amazon for ASIN: ${asin}`);
            
            // Search URL is less aggressive than direct product page
            const searchUrl = `${this.baseURL}/s?k=${asin}`;
            
            const response = await this.makeRequest(searchUrl);
            const $ = cheerio.load(response.data);
            
            // Extract data from search results
            const bookData = this.extractFromSearchResults($, asin);
            
            if (bookData.found) {
                console.log(`✅ Found book in search: ${bookData.title}`);
                return bookData;
            } else {
                console.log(`⚠️ ASIN ${asin} not found in search results`);
                return null;
            }
            
        } catch (error) {
            console.error(`❌ Search failed for ${asin}:`, error.message);
            return null;
        }
    }

    // Make request with proper headers and delays
    async makeRequest(url, retries = 0) {
        await this.sleep(this.delay);
        
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'Cache-Control': 'max-age=0'
                },
                timeout: 15000
            });
            
            return response;
            
        } catch (error) {
            if (retries < this.maxRetries) {
                console.log(`🔄 Retrying search request (${retries + 1}/${this.maxRetries})`);
                await this.sleep(this.delay * 2); // Longer delay on retry
                return this.makeRequest(url, retries + 1);
            }
            throw error;
        }
    }

    // Extract book data from search results
    extractFromSearchResults($, targetASIN) {
        const results = [];
        
        // Amazon search result selectors
        $('[data-component-type="s-search-result"]').each((index, element) => {
            const $result = $(element);
            
            try {
                // Extract ASIN from the result
                const asin = this.extractASINFromResult($result);
                
                if (asin === targetASIN) {
                    // Found our book!
                    const bookData = {
                        found: true,
                        asin: asin,
                        title: this.extractTitleFromResult($result),
                        author: this.extractAuthorFromResult($result),
                        price: this.extractPriceFromResult($result),
                        currency: 'USD',
                        rating: this.extractRatingFromResult($result),
                        ratingCount: this.extractRatingCountFromResult($result),
                        coverImage: this.extractImageFromResult($result),
                        productUrl: this.extractUrlFromResult($result),
                        
                        // Search results don't have BSR, but we can get basic data
                        availability: 'In Stock', // Assumption if it shows in search
                        format: this.extractFormatFromResult($result),
                        
                        // Metadata
                        source: 'amazon_search',
                        fetched_at: new Date().toISOString()
                    };
                    
                    results.push(bookData);
                }
            } catch (resultError) {
                // Continue processing other results
                console.error('Error processing search result:', resultError.message);
            }
        });
        
        // Return first match or null
        return results.length > 0 ? results[0] : { found: false, asin: targetASIN };
    }

    // Extract ASIN from search result
    extractASINFromResult($result) {
        // Multiple ways to find ASIN in search results
        
        // Method 1: data-asin attribute
        let asin = $result.attr('data-asin');
        if (asin) return asin;
        
        // Method 2: from product link
        const link = $result.find('a[href*="/dp/"]').first().attr('href');
        if (link) {
            const match = link.match(/\/dp\/([A-Z0-9]{10})/);
            if (match) return match[1];
        }
        
        // Method 3: from data attributes
        asin = $result.find('[data-asin]').first().attr('data-asin');
        if (asin) return asin;
        
        return null;
    }

    extractTitleFromResult($result) {
        // Multiple selectors for title
        const titleSelectors = [
            'h2 a span',
            '[data-cy="title-recipe-title"]',
            '.s-size-mini span',
            'h2 span'
        ];
        
        for (const selector of titleSelectors) {
            const title = $result.find(selector).first().text().trim();
            if (title && title.length > 3) {
                return title;
            }
        }
        
        return null;
    }

    extractAuthorFromResult($result) {
        const authorSelectors = [
            '.a-color-secondary .a-size-base',
            'span[data-cy="secondary-text"]',
            '.s-color-secondary',
            '.a-color-secondary'
        ];
        
        for (const selector of authorSelectors) {
            const author = $result.find(selector).first().text().trim();
            if (author && !author.includes('$') && !author.includes('★')) {
                // Clean up common prefixes
                return author.replace(/^by\s+/i, '').trim();
            }
        }
        
        return null;
    }

    extractPriceFromResult($result) {
        const priceSelectors = [
            '.a-price-whole',
            '.a-offscreen',
            '[data-a-color="price"] .a-offscreen',
            '.a-price .a-offscreen'
        ];
        
        for (const selector of priceSelectors) {
            const priceText = $result.find(selector).first().text().trim();
            if (priceText && priceText.includes('$')) {
                const match = priceText.match(/\$(\d+\.?\d*)/);
                if (match) {
                    return parseFloat(match[1]);
                }
            }
        }
        
        return null;
    }

    extractRatingFromResult($result) {
        const ratingSelectors = [
            '.a-icon-alt',
            '[aria-label*="stars"]',
            '.a-star-rating .a-icon-alt'
        ];
        
        for (const selector of ratingSelectors) {
            const ratingText = $result.find(selector).attr('aria-label') || '';
            const match = ratingText.match(/(\d+\.?\d*)\s*out\s*of\s*5/i);
            if (match) {
                return parseFloat(match[1]);
            }
        }
        
        return null;
    }

    extractRatingCountFromResult($result) {
        const countSelectors = [
            '.a-size-base',
            'span[aria-label*="ratings"]'
        ];
        
        for (const selector of countSelectors) {
            const countText = $result.find(selector).text().trim();
            const match = countText.match(/(\d+,?\d*)/);
            if (match) {
                return parseInt(match[1].replace(',', ''));
            }
        }
        
        return null;
    }

    extractImageFromResult($result) {
        const img = $result.find('img').first();
        let src = img.attr('src') || img.attr('data-src');
        
        if (src && src.includes('images-na.ssl-images-amazon.com')) {
            // Clean up Amazon image URL to get better quality
            src = src.replace(/\._[A-Z0-9_]+_\./, '._SY522_.');
            return src;
        }
        
        return null;
    }

    extractUrlFromResult($result) {
        const link = $result.find('a[href*="/dp/"]').first().attr('href');
        if (link) {
            return link.startsWith('http') ? link : `${this.baseURL}${link}`;
        }
        return null;
    }

    extractFormatFromResult($result) {
        const text = $result.text().toLowerCase();
        if (text.includes('kindle')) return 'Kindle Edition';
        if (text.includes('paperback')) return 'Paperback';
        if (text.includes('hardcover')) return 'Hardcover';
        return 'Kindle Edition'; // Default assumption
    }

    // Batch search for multiple ASINs
    async searchMultipleASINs(asins) {
        const results = [];
        
        for (const asin of asins) {
            try {
                const result = await this.searchByASIN(asin);
                if (result && result.found) {
                    results.push(result);
                }
                
                // Longer delay between multiple searches
                await this.sleep(this.delay * 1.5);
                
            } catch (error) {
                console.error(`Failed to search for ${asin}:`, error.message);
                results.push({
                    found: false,
                    asin: asin,
                    error: error.message
                });
            }
        }
        
        return results;
    }

    // Enhanced search with ISBN fallback
    async enhancedSearch(asin, isbn = null) {
        // Try ASIN first
        let result = await this.searchByASIN(asin);
        
        // If ASIN search fails and we have ISBN, try that
        if (!result?.found && isbn) {
            console.log(`🔄 ASIN search failed, trying ISBN: ${isbn}`);
            result = await this.searchByASIN(isbn);
        }
        
        return result;
    }

    // Safety utilities
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Rate limiting check
    isRateLimited(response) {
        return response.status === 503 || 
               response.status === 429 ||
               response.data?.includes('Robot Check') ||
               response.data?.includes('Type the characters you see');
    }
}

// CLI interface for testing
if (require.main === module) {
    const searchService = new AmazonSearchService();
    
    const asin = process.argv[2] || 'B0FHF78VGF';
    
    console.log(`🔍 Testing Amazon Search API for ASIN: ${asin}`);
    
    searchService.searchByASIN(asin)
        .then(result => {
            if (result && result.found) {
                console.log('✅ Search successful!');
                console.log('📊 Result:', JSON.stringify(result, null, 2));
            } else {
                console.log('❌ Search failed or book not found');
            }
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Search error:', error);
            process.exit(1);
        });
}

module.exports = AmazonSearchService;