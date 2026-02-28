const axios = require('axios');
const cheerio = require('cheerio');
const db = require('../database/database');

class AmazonService {
    constructor() {
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
        this.baseURL = 'https://www.amazon.com';
        this.delay = 2000; // 2 second delay between requests
    }

    async fetchBookData(asin) {
        try {
            await this.sleep(this.delay);
            
            const url = `${this.baseURL}/dp/${asin}`;
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive'
                },
                timeout: 15000
            });

            const $ = cheerio.load(response.data);
            
            const bookData = {
                asin: asin,
                title: this.extractTitle($),
                author: this.extractAuthor($),
                description: this.extractDescription($),
                coverImage: this.extractCoverImage($),
                price: this.extractPrice($),
                currency: this.extractCurrency($),
                rating: this.extractRating($),
                ratingCount: this.extractRatingCount($),
                reviewCount: this.extractReviewCount($),
                bestseller_rank: this.extractBestsellerRank($),
                category: this.extractCategory($),
                publicationDate: this.extractPublicationDate($),
                pageCount: this.extractPageCount($),
                language: this.extractLanguage($),
                availability: this.extractAvailability($),
                
                // Enhanced data collection
                formats: this.extractFormatsAndPrices($),
                categoryRankings: this.extractCategoryRankings($),
                keywords: this.extractKeywords($),
                hasAPlusContent: this.extractAPlusContent($),
                alsoBoughtASINs: this.extractAlsoBought($),
                reviewSentiment: this.extractReviewSentiment($),
                estimatedSales: this.estimateDailySales(this.extractBestsellerRank($))
            };

            return bookData;
        } catch (error) {
            console.error(`Error fetching Amazon data for ASIN ${asin}:`, error.message);
            throw new Error(`Failed to fetch book data: ${error.message}`);
        }
    }

    extractTitle($) {
        return $('#productTitle').text().trim() || 
               $('h1.a-size-large').text().trim() ||
               $('[data-asin] h1').text().trim() || 
               null;
    }

    extractAuthor($) {
        const authorElement = $('.author .contributorNameID') || 
                            $('.author a[href*="/author/"]') ||
                            $('span.author a') ||
                            $('#bylineInfo .author a');
        
        if (authorElement.length > 0) {
            return authorElement.first().text().trim();
        }
        
        const bylineText = $('#bylineInfo').text();
        const authorMatch = bylineText.match(/by\s+([^(]+)/i);
        return authorMatch ? authorMatch[1].trim() : null;
    }

    extractDescription($) {
        const descriptionSelectors = [
            '#feature-bullets ul',
            '#bookDescription_feature_div noscript',
            '[data-feature-name="bookDescription"]',
            '.a-expander-content'
        ];
        
        for (const selector of descriptionSelectors) {
            const element = $(selector);
            if (element.length > 0) {
                return element.text().trim().substring(0, 1000);
            }
        }
        return null;
    }

    extractCoverImage($) {
        const imgSelectors = [
            '#landingImage',
            '#imgBlkFront',
            '#ebooksImgBlkFront',
            '.frontImage img',
            '.a-dynamic-image'
        ];
        
        for (const selector of imgSelectors) {
            const element = $(selector);
            if (element.length > 0) {
                const src = element.attr('src') || element.attr('data-src');
                if (src && src.includes('images-amazon.com')) {
                    return src;
                }
            }
        }
        return null;
    }

    extractPrice($) {
        const priceSelectors = [
            '.a-price-current .a-price-whole',
            '.a-offscreen',
            '.a-price .a-offscreen',
            '#priceblock_dealprice',
            '#priceblock_ourprice'
        ];
        
        for (const selector of priceSelectors) {
            const element = $(selector);
            if (element.length > 0) {
                const priceText = element.text().trim();
                const priceMatch = priceText.match(/[\d,]+\.?\d*/);
                if (priceMatch) {
                    return parseFloat(priceMatch[0].replace(',', ''));
                }
            }
        }
        return null;
    }

    extractCurrency($) {
        const priceElement = $('.a-price-symbol, .a-price-currency-symbol').first();
        if (priceElement.length > 0) {
            const symbol = priceElement.text().trim();
            const currencyMap = { '$': 'USD', '€': 'EUR', '£': 'GBP' };
            return currencyMap[symbol] || 'USD';
        }
        return 'USD';
    }

    extractRating($) {
        const ratingElement = $('[data-hook="average-star-rating"] .a-icon-alt, .reviewCountTextLinkedHistogram .a-icon-alt');
        if (ratingElement.length > 0) {
            const ratingText = ratingElement.text();
            const ratingMatch = ratingText.match(/(\d+\.?\d*)\s*out of/);
            return ratingMatch ? parseFloat(ratingMatch[1]) : null;
        }
        return null;
    }

    extractRatingCount($) {
        const ratingCountElement = $('[data-hook="total-review-count"], #acrCustomerReviewText');
        if (ratingCountElement.length > 0) {
            const countText = ratingCountElement.text();
            const countMatch = countText.match(/([\d,]+)/);
            return countMatch ? parseInt(countMatch[1].replace(',', '')) : null;
        }
        return null;
    }

    extractReviewCount($) {
        return this.extractRatingCount($);
    }

    extractBestsellerRank($) {
        const rankElement = $('#SalesRank, #detailBulletsWrapper_feature_div');
        if (rankElement.length > 0) {
            const rankText = rankElement.text();
            const rankMatch = rankText.match(/#([\d,]+)\s*in/);
            return rankMatch ? parseInt(rankMatch[1].replace(',', '')) : null;
        }
        return null;
    }

    extractCategory($) {
        const categoryElement = $('#wayfinding-breadcrumbs_feature_div a').last();
        if (categoryElement.length > 0) {
            return categoryElement.text().trim();
        }
        
        const rankElement = $('#SalesRank, #detailBulletsWrapper_feature_div');
        if (rankElement.length > 0) {
            const rankText = rankElement.text();
            const categoryMatch = rankText.match(/in\s+([^(]+)/);
            return categoryMatch ? categoryMatch[1].trim() : null;
        }
        return null;
    }

    extractPublicationDate($) {
        const detailsText = $('#detailBulletsWrapper_feature_div').text();
        const dateMatch = detailsText.match(/Publication date[:\s]+(\w+\s+\d+,\s+\d{4})/i);
        if (dateMatch) {
            return new Date(dateMatch[1]).toISOString().split('T')[0];
        }
        return null;
    }

    extractPageCount($) {
        const detailsText = $('#detailBulletsWrapper_feature_div').text();
        const pageMatch = detailsText.match(/(\d+)\s*pages/i);
        return pageMatch ? parseInt(pageMatch[1]) : null;
    }

    extractLanguage($) {
        const detailsText = $('#detailBulletsWrapper_feature_div').text();
        const languageMatch = detailsText.match(/Language[:\s]+(\w+)/i);
        return languageMatch ? languageMatch[1].toLowerCase() : 'en';
    }

    extractAvailability($) {
        const availabilityElement = $('#availability span');
        if (availabilityElement.length > 0) {
            return availabilityElement.text().trim();
        }
        return 'Unknown';
    }

    async validateASIN(asin) {
        if (!asin || typeof asin !== 'string') {
            return false;
        }
        
        const asinRegex = /^[A-Z0-9]{10}$/;
        return asinRegex.test(asin.toUpperCase());
    }

    async extractASINFromURL(url) {
        try {
            const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})|\/gp\/product\/([A-Z0-9]{10})|asin=([A-Z0-9]{10})/i);
            return asinMatch ? (asinMatch[1] || asinMatch[2] || asinMatch[3]).toUpperCase() : null;
        } catch (error) {
            return null;
        }
    }

    extractFormatsAndPrices($) {
        const formats = {};
        
        // Look for format selector
        $('.a-button-toggle .a-button-text').each((i, elem) => {
            const formatText = $(elem).text().trim().toLowerCase();
            const priceElement = $(elem).closest('.a-button').find('.a-price .a-offscreen');
            
            if (formatText.includes('kindle') || formatText.includes('ebook')) {
                formats.kindle = this.parsePrice(priceElement.text());
            } else if (formatText.includes('paperback')) {
                formats.paperback = this.parsePrice(priceElement.text());
            } else if (formatText.includes('hardcover')) {
                formats.hardcover = this.parsePrice(priceElement.text());
            }
        });
        
        // Fallback to main price if no formats found
        if (Object.keys(formats).length === 0) {
            formats.default = this.extractPrice($);
        }
        
        return formats;
    }

    extractCategoryRankings($) {
        const rankings = [];
        const rankingText = $('#SalesRank, #detailBulletsWrapper_feature_div').text();
        
        // Extract multiple category rankings
        const rankMatches = rankingText.match(/#([\d,]+)\s+in\s+([^(#\n]+)/g);
        if (rankMatches) {
            rankMatches.forEach(match => {
                const parts = match.match(/#([\d,]+)\s+in\s+(.+)/);
                if (parts) {
                    rankings.push({
                        rank: parseInt(parts[1].replace(/,/g, '')),
                        category: parts[2].trim()
                    });
                }
            });
        }
        
        return rankings;
    }

    extractKeywords($) {
        const keywords = new Set();
        
        // Extract from title
        const title = this.extractTitle($);
        if (title) {
            const titleWords = title.split(/\s+/).filter(word => 
                word.length > 3 && !/^(the|and|for|with|from|book|guide|complete)$/i.test(word)
            );
            titleWords.forEach(word => keywords.add(word.toLowerCase()));
        }
        
        // Extract from bullet points
        $('#feature-bullets li').each((i, elem) => {
            const text = $(elem).text().trim();
            const words = text.split(/\s+/).filter(word => 
                word.length > 4 && /^[a-zA-Z]+$/.test(word)
            );
            words.slice(0, 3).forEach(word => keywords.add(word.toLowerCase()));
        });
        
        // Extract from categories breadcrumb
        $('#wayfinding-breadcrumbs_feature_div a').each((i, elem) => {
            const category = $(elem).text().trim();
            if (category && category.length > 3) {
                keywords.add(category.toLowerCase());
            }
        });
        
        return Array.from(keywords).slice(0, 20); // Limit to top 20 keywords
    }

    extractAPlusContent($) {
        // Check for A+ Content presence
        return $('#aplus_feature_div').length > 0 || 
               $('.aplus-v2').length > 0 ||
               $('[data-aplus-module]').length > 0;
    }

    extractAlsoBought($) {
        const alsoBoughtASINs = [];
        
        // Look for "Customers who bought this item also bought" section
        $('[data-asin]').each((i, elem) => {
            const asin = $(elem).attr('data-asin');
            if (asin && asin.length === 10 && asin !== this.currentASIN) {
                alsoBoughtASINs.push(asin);
            }
        });
        
        // Also check for ASINs in URLs
        $('a[href*="/dp/"]').each((i, elem) => {
            const href = $(elem).attr('href');
            const asinMatch = href.match(/\/dp\/([A-Z0-9]{10})/);
            if (asinMatch && asinMatch[1] !== this.currentASIN) {
                alsoBoughtASINs.push(asinMatch[1]);
            }
        });
        
        // Remove duplicates and limit to 10
        return [...new Set(alsoBoughtASINs)].slice(0, 10);
    }

    extractReviewSentiment($) {
        const sentiment = {
            positive: 0,
            negative: 0,
            keywords: { positive: [], negative: [] }
        };
        
        // Analyze review snippets if available
        $('.cr-original-review-text').each((i, elem) => {
            const reviewText = $(elem).text().toLowerCase();
            
            // Simple sentiment analysis based on keywords
            const positiveKeywords = ['excellent', 'great', 'amazing', 'wonderful', 'love', 'perfect', 'recommend', 'fantastic', 'awesome', 'brilliant'];
            const negativeKeywords = ['terrible', 'awful', 'bad', 'horrible', 'hate', 'disappointed', 'waste', 'poor', 'boring', 'confusing'];
            
            let positiveCount = 0;
            let negativeCount = 0;
            
            positiveKeywords.forEach(keyword => {
                if (reviewText.includes(keyword)) {
                    positiveCount++;
                    sentiment.keywords.positive.push(keyword);
                }
            });
            
            negativeKeywords.forEach(keyword => {
                if (reviewText.includes(keyword)) {
                    negativeCount++;
                    sentiment.keywords.negative.push(keyword);
                }
            });
            
            if (positiveCount > negativeCount) {
                sentiment.positive++;
            } else if (negativeCount > positiveCount) {
                sentiment.negative++;
            }
        });
        
        // Remove duplicate keywords
        sentiment.keywords.positive = [...new Set(sentiment.keywords.positive)];
        sentiment.keywords.negative = [...new Set(sentiment.keywords.negative)];
        
        return sentiment;
    }

    estimateDailySales(bsr) {
        if (!bsr) return null;

        // Deterministic BSR to sales estimation (very rough approximation)
        // Based on general industry data - actual conversion varies significantly
        // Uses midpoint of each tier so the value is stable across page loads
        if (bsr < 100) return 600;
        if (bsr < 500) return 150;
        if (bsr < 1000) return 75;
        if (bsr < 5000) return 35;
        if (bsr < 10000) return 17;
        if (bsr < 50000) return 10;
        if (bsr < 100000) return 4;
        if (bsr < 500000) return 2;
        return 1;
    }

    parsePrice(priceText) {
        if (!priceText) return null;
        const priceMatch = priceText.match(/[\d,]+\.?\d*/);
        return priceMatch ? parseFloat(priceMatch[0].replace(',', '')) : null;
    }

    calculateDataQualityScore(bookData) {
        let score = 0;
        const checks = [
            () => bookData.title ? 10 : 0,
            () => bookData.author ? 10 : 0,
            () => bookData.description ? 10 : 0,
            () => bookData.coverImage ? 10 : 0,
            () => bookData.price ? 10 : 0,
            () => bookData.rating ? 10 : 0,
            () => bookData.bestseller_rank ? 15 : 0,
            () => bookData.categoryRankings?.length > 0 ? 10 : 0,
            () => bookData.keywords?.length > 0 ? 5 : 0,
            () => bookData.alsoBoughtASINs?.length > 0 ? 10 : 0
        ];
        
        score = checks.reduce((total, check) => total + check(), 0);
        return Math.min(score, 100);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async bulkFetchBookData(asins) {
        const results = [];
        const errors = [];
        
        for (let i = 0; i < asins.length; i++) {
            try {
                console.log(`Fetching ${i + 1}/${asins.length}: ${asins[i]}`);
                const bookData = await this.fetchBookData(asins[i]);
                results.push(bookData);
            } catch (error) {
                console.error(`Error fetching ${asins[i]}:`, error.message);
                errors.push({ asin: asins[i], error: error.message });
            }
        }
        
        return { results, errors };
    }

    // Enhanced methods for BSR trend tracking and historical data storage
    async updateBookDataWithTrends(publishedBookId, currentData) {
        try {
            // Get previous data for trend calculation
            const previousData = await this.getPreviousBookData(publishedBookId);
            
            // Calculate trends
            const trends = this.calculateTrends(previousData, currentData);
            
            // Store historical data
            await this.storeHistoricalData(publishedBookId, currentData, trends);
            
            // Update book_amazon_data table with trend information
            await this.updateBookAmazonData(publishedBookId, currentData, trends);
            
            return {
                ...currentData,
                trends,
                historical_updated: true
            };
        } catch (error) {
            console.error('Error updating book data with trends:', error);
            throw error;
        }
    }

    async getPreviousBookData(publishedBookId) {
        try {
            const query = `
                SELECT bestseller_rank, category_rank, rating_average, rating_count, 
                       review_count, price, recorded_at
                FROM book_ranking_history 
                WHERE published_book_id = ? 
                ORDER BY recorded_at DESC 
                LIMIT 1
            `;
            
            return await db.get(query, [publishedBookId]);
        } catch (error) {
            console.error('Error getting previous book data:', error);
            return null;
        }
    }

    calculateTrends(previousData, currentData) {
        const trends = {
            bsr_trend: 'stable',
            bsr_change: 0,
            bsr_improvement_30d: 0,
            rating_trend: 'stable',
            rating_change: 0,
            review_trend: 'stable',
            review_change: 0,
            trend_score: 0
        };

        if (!previousData) {
            trends.bsr_trend = 'new';
            return trends;
        }

        // BSR trend calculation (lower rank = better = positive trend)
        if (previousData.bestseller_rank && currentData.bestseller_rank) {
            const bsrChange = previousData.bestseller_rank - currentData.bestseller_rank;
            trends.bsr_change = bsrChange;
            trends.bsr_improvement_30d = bsrChange; // Simplified - would need 30-day data
            
            if (bsrChange > 1000) trends.bsr_trend = 'up';
            else if (bsrChange < -1000) trends.bsr_trend = 'down';
            else trends.bsr_trend = 'stable';
        }

        // Rating trend calculation
        if (previousData.rating_average && currentData.rating) {
            const ratingChange = currentData.rating - previousData.rating_average;
            trends.rating_change = Math.round(ratingChange * 100) / 100;
            
            if (ratingChange > 0.1) trends.rating_trend = 'up';
            else if (ratingChange < -0.1) trends.rating_trend = 'down';
            else trends.rating_trend = 'stable';
        }

        // Review count trend
        if (previousData.review_count && currentData.reviewCount) {
            const reviewChange = currentData.reviewCount - previousData.review_count;
            trends.review_change = reviewChange;
            
            if (reviewChange > 5) trends.review_trend = 'up';
            else if (reviewChange < -2) trends.review_trend = 'down';
            else trends.review_trend = 'stable';
        }

        // Calculate overall trend score (0-100)
        let score = 50; // Base score
        
        // BSR contribution (40 points max)
        if (trends.bsr_trend === 'up') score += 30;
        else if (trends.bsr_trend === 'down') score -= 20;
        
        // Rating contribution (20 points max)
        if (trends.rating_trend === 'up') score += 15;
        else if (trends.rating_trend === 'down') score -= 10;
        
        // Review contribution (20 points max)
        if (trends.review_trend === 'up') score += 15;
        else if (trends.review_trend === 'down') score -= 5;
        
        trends.trend_score = Math.max(0, Math.min(100, score));
        
        return trends;
    }

    async storeHistoricalData(publishedBookId, currentData, trends) {
        try {
            const insertQuery = `
                INSERT INTO book_ranking_history (
                    published_book_id, bestseller_rank, category_rank,
                    rating_average, rating_count, review_count, price,
                    trend_direction, rank_change, recorded_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `;
            
            const params = [
                publishedBookId,
                currentData.bestseller_rank,
                currentData.category_rank || null,
                currentData.rating,
                currentData.ratingCount,
                currentData.reviewCount,
                currentData.price,
                trends.bsr_trend,
                trends.bsr_change
            ];
            
            await db.run(insertQuery, params);
        } catch (error) {
            console.error('Error storing historical data:', error);
            throw error;
        }
    }

    async updateBookAmazonData(publishedBookId, currentData, trends) {
        try {
            // First check if record exists
            const existingQuery = `SELECT id FROM book_amazon_data WHERE published_book_id = ?`;
            const existing = await db.get(existingQuery, [publishedBookId]);
            
            if (existing) {
                // Update existing record
                const updateQuery = `
                    UPDATE book_amazon_data SET
                        main_category = ?,
                        category_rankings = ?,
                        keywords = ?,
                        trend_direction = ?,
                        rank_improvement_30d = ?,
                        trend_score = ?,
                        last_updated = CURRENT_TIMESTAMP
                    WHERE published_book_id = ?
                `;
                
                const params = [
                    this.extractMainCategory(currentData),
                    JSON.stringify(currentData.categoryRankings || []),
                    JSON.stringify(currentData.keywords || []),
                    trends.bsr_trend,
                    trends.bsr_improvement_30d,
                    trends.trend_score,
                    publishedBookId
                ];
                
                await db.run(updateQuery, params);
            } else {
                // Insert new record
                const insertQuery = `
                    INSERT INTO book_amazon_data (
                        published_book_id, main_category, category_rankings,
                        keywords, trend_direction, rank_improvement_30d,
                        trend_score, last_updated
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                `;
                
                const params = [
                    publishedBookId,
                    this.extractMainCategory(currentData),
                    JSON.stringify(currentData.categoryRankings || []),
                    JSON.stringify(currentData.keywords || []),
                    trends.bsr_trend,
                    trends.bsr_improvement_30d,
                    trends.trend_score
                ];
                
                await db.run(insertQuery, params);
            }
        } catch (error) {
            console.error('Error updating book amazon data:', error);
            throw error;
        }
    }

    extractMainCategory(bookData) {
        // Enhanced category extraction
        if (bookData.categoryRankings && bookData.categoryRankings.length > 0) {
            return bookData.categoryRankings[0].category;
        }
        
        if (bookData.category) {
            return bookData.category;
        }
        
        // Try to determine from keywords
        if (bookData.keywords && bookData.keywords.length > 0) {
            const businessKeywords = ['business', 'marketing', 'finance', 'entrepreneur', 'money'];
            const fictionKeywords = ['novel', 'story', 'fiction', 'romance', 'thriller'];
            const selfHelpKeywords = ['self-help', 'personal', 'development', 'motivation', 'success'];
            const techKeywords = ['technology', 'programming', 'software', 'computer', 'ai', 'artificial'];
            
            const keywordLower = bookData.keywords.map(k => k.toLowerCase());
            
            if (businessKeywords.some(k => keywordLower.includes(k))) return 'Business';
            if (fictionKeywords.some(k => keywordLower.includes(k))) return 'Fiction';
            if (selfHelpKeywords.some(k => keywordLower.includes(k))) return 'Self-Help';
            if (techKeywords.some(k => keywordLower.includes(k))) return 'Technology';
        }
        
        return 'Uncategorized';
    }

    async getBookTrendHistory(publishedBookId, days = 30) {
        try {
            const query = `
                SELECT bestseller_rank, rating_average, rating_count,
                       review_count, trend_direction, rank_change,
                       DATE(recorded_at) as date
                FROM book_ranking_history 
                WHERE published_book_id = ?
                AND recorded_at >= datetime('now', '-${days} days')
                ORDER BY recorded_at ASC
            `;
            
            return await db.all(query, [publishedBookId]);
        } catch (error) {
            console.error('Error getting book trend history:', error);
            return [];
        }
    }

    async refreshBookData(publishedBookId) {
        try {
            // Get book ASIN from published_books table
            const bookQuery = `SELECT amazon_asin FROM published_books WHERE id = ?`;
            const book = await db.get(bookQuery, [publishedBookId]);
            
            if (!book) {
                throw new Error('Published book not found');
            }
            
            // Fetch fresh data from Amazon
            const freshData = await this.fetchBookData(book.amazon_asin);
            
            // Update with trends
            const updatedData = await this.updateBookDataWithTrends(publishedBookId, freshData);
            
            // Update the published_books table with fresh data
            const updateBookQuery = `
                UPDATE published_books SET
                    current_price = ?,
                    bestseller_rank = ?,
                    rating_average = ?,
                    rating_count = ?,
                    review_count = ?,
                    last_data_fetch = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            
            await db.run(updateBookQuery, [
                freshData.price,
                freshData.bestseller_rank,
                freshData.rating,
                freshData.ratingCount,
                freshData.reviewCount,
                publishedBookId
            ]);
            
            return updatedData;
        } catch (error) {
            console.error('Error refreshing book data:', error);
            throw error;
        }
    }
}

module.exports = AmazonService;