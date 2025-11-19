/**
 * Live Censorship Tracker Service
 *
 * Monitors books across platforms and detects censorship in real-time.
 * Turns every ban into free marketing (Streisand Effect automation).
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const crypto = require('crypto');
const db = require('../database/db');
const aiDiscoveryService = require('./aiDiscoveryService');

class CensorshipTrackerService {
    constructor() {
        this.browser = null;
        this.isRunning = false;
        this.checkInterval = 60 * 60 * 1000; // 1 hour default
    }

    /**
     * Initialize browser for scraping
     */
    async initBrowser() {
        if (!this.browser) {
            this.browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu'
                ]
            });
            console.log('✅ Browser initialized for censorship tracking');
        }
        return this.browser;
    }

    /**
     * Close browser
     */
    async closeBrowser() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    /**
     * Start continuous monitoring
     */
    async startMonitoring() {
        if (this.isRunning) {
            console.log('⚠️  Censorship tracking already running');
            return;
        }

        this.isRunning = true;
        console.log('🚀 Starting censorship tracker...');

        // Initialize browser
        await this.initBrowser();

        // Run initial check
        await this.checkAllBooks();

        // Schedule periodic checks
        this.monitoringInterval = setInterval(async () => {
            await this.checkAllBooks();
        }, this.checkInterval);

        console.log(`✅ Censorship tracker running (checking every ${this.checkInterval / 1000 / 60} minutes)`);
    }

    /**
     * Stop monitoring
     */
    async stopMonitoring() {
        this.isRunning = false;

        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        await this.closeBrowser();
        console.log('⏹️  Censorship tracker stopped');
    }

    /**
     * Check all monitored books
     */
    async checkAllBooks() {
        try {
            console.log('\n📊 Starting book availability check...');

            // Get books to check (prioritize high-priority books)
            const booksToCheck = await db.all(`
                SELECT * FROM monitored_books
                WHERE is_active = 1
                AND (
                    last_check IS NULL
                    OR datetime(last_check, '+' || check_interval_hours || ' hours') <= datetime('now')
                )
                ORDER BY priority DESC, last_check ASC
                LIMIT 50
            `);

            console.log(`📚 Checking ${booksToCheck.length} books...`);

            let newBans = 0;
            let restored = 0;

            for (const book of booksToCheck) {
                try {
                    // Check each platform
                    const platforms = this.getPlatformsForBook(book);

                    for (const platform of platforms) {
                        const result = await this.checkBookAvailability(book, platform);

                        if (result.statusChanged) {
                            if (!result.isAvailable) {
                                newBans++;
                                console.log(`🚨 BAN DETECTED: ${book.book_id} on ${platform.name}`);
                                await this.handleBanDetected(book, platform.name, result);
                            } else {
                                restored++;
                                console.log(`✅ RESTORED: ${book.book_id} on ${platform.name}`);
                                await this.handleBookRestored(book, platform.name, result);
                            }
                        }
                    }

                    // Update last check time
                    await db.run(`
                        UPDATE monitored_books
                        SET last_check = CURRENT_TIMESTAMP
                        WHERE id = ?
                    `, [book.id]);

                    // Rate limiting
                    await this.sleep(2000);

                } catch (error) {
                    console.error(`Error checking book ${book.book_id}:`, error.message);
                }
            }

            console.log(`\n📊 Check complete:`);
            console.log(`   - Books checked: ${booksToCheck.length}`);
            console.log(`   - New bans: ${newBans}`);
            console.log(`   - Restored: ${restored}\n`);

        } catch (error) {
            console.error('Error in checkAllBooks:', error);
        }
    }

    /**
     * Get platforms to check for a book
     */
    getPlatformsForBook(book) {
        const platforms = [];

        if (book.amazon_asin) {
            platforms.push({
                name: 'amazon',
                url: `https://www.amazon.com/dp/${book.amazon_asin}`,
                identifier: book.amazon_asin
            });
        }

        if (book.goodreads_id) {
            platforms.push({
                name: 'goodreads',
                url: `https://www.goodreads.com/book/show/${book.goodreads_id}`,
                identifier: book.goodreads_id
            });
        }

        if (book.isbn) {
            platforms.push({
                name: 'google_books',
                url: `https://www.google.com/books/edition/_/${book.isbn}`,
                identifier: book.isbn
            });
        }

        return platforms;
    }

    /**
     * Check if book is available on a platform
     */
    async checkBookAvailability(book, platform) {
        const scraper = this.getScraperForPlatform(platform.name);
        const result = await scraper(platform.url, platform.identifier);

        // Get previous status
        const previousSnapshot = await db.get(`
            SELECT is_available FROM availability_snapshots
            WHERE monitored_book_id = ?
            AND platform = ?
            ORDER BY checked_at DESC
            LIMIT 1
        `, [book.id, platform.name]);

        const previouslyAvailable = previousSnapshot ? previousSnapshot.is_available === 1 : true;
        const statusChanged = previouslyAvailable !== result.isAvailable;

        // Save snapshot
        const snapshotId = await this.saveSnapshot(book.id, platform.name, result);

        return {
            ...result,
            statusChanged,
            previouslyAvailable,
            snapshotId
        };
    }

    /**
     * Get scraper function for platform
     */
    getScraperForPlatform(platformName) {
        const scrapers = {
            amazon: this.scrapeAmazon.bind(this),
            goodreads: this.scrapeGoodreads.bind(this),
            google_books: this.scrapeGoogleBooks.bind(this)
        };

        return scrapers[platformName] || this.scrapeGeneric.bind(this);
    }

    /**
     * Scrape Amazon for book availability
     */
    async scrapeAmazon(url, asin) {
        try {
            const browser = await this.initBrowser();
            const page = await browser.newPage();

            // Set user agent to avoid detection
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            const startTime = Date.now();
            const response = await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            const responseTime = Date.now() - startTime;
            const statusCode = response.status();

            // Check if page exists
            if (statusCode === 404) {
                await page.close();
                return {
                    isAvailable: false,
                    responseCode: 404,
                    responseTime,
                    pageTitle: 'Page Not Found',
                    detectionMethod: 'scraper'
                };
            }

            // Get page title
            const pageTitle = await page.title();

            // Check for "unavailable" or "not found" indicators
            const pageContent = await page.content();
            const contentHash = crypto.createHash('md5').update(pageContent).digest('hex');

            const unavailableIndicators = [
                'currently unavailable',
                'no longer available',
                'been removed',
                'cannot be found',
                'product not found'
            ];

            const isUnavailable = unavailableIndicators.some(indicator =>
                pageContent.toLowerCase().includes(indicator)
            );

            await page.close();

            return {
                isAvailable: !isUnavailable && statusCode === 200,
                responseCode: statusCode,
                responseTime,
                pageTitle,
                pageContentHash: contentHash,
                detectionMethod: 'scraper',
                confidenceScore: isUnavailable ? 0.9 : 0.7
            };

        } catch (error) {
            console.error(`Amazon scraping error for ${url}:`, error.message);

            return {
                isAvailable: false,
                responseCode: 0,
                responseTime: 0,
                pageTitle: 'Error',
                detectionMethod: 'scraper',
                confidenceScore: 0.3,
                error: error.message
            };
        }
    }

    /**
     * Scrape Goodreads for book availability
     */
    async scrapeGoodreads(url, goodreadsId) {
        try {
            const browser = await this.initBrowser();
            const page = await browser.newPage();

            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

            const startTime = Date.now();
            const response = await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            const responseTime = Date.now() - startTime;
            const statusCode = response.status();

            if (statusCode === 404) {
                await page.close();
                return {
                    isAvailable: false,
                    responseCode: 404,
                    responseTime,
                    detectionMethod: 'scraper'
                };
            }

            const pageTitle = await page.title();
            await page.close();

            return {
                isAvailable: statusCode === 200,
                responseCode: statusCode,
                responseTime,
                pageTitle,
                detectionMethod: 'scraper',
                confidenceScore: 0.8
            };

        } catch (error) {
            console.error(`Goodreads scraping error:`, error.message);
            return {
                isAvailable: false,
                responseCode: 0,
                responseTime: 0,
                detectionMethod: 'scraper',
                confidenceScore: 0.3,
                error: error.message
            };
        }
    }

    /**
     * Scrape Google Books (uses API instead)
     */
    async scrapeGoogleBooks(url, isbn) {
        try {
            const apiUrl = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`;
            const startTime = Date.now();

            const response = await axios.get(apiUrl, { timeout: 10000 });
            const responseTime = Date.now() - startTime;

            const isAvailable = response.data.totalItems > 0;

            return {
                isAvailable,
                responseCode: response.status,
                responseTime,
                pageTitle: isAvailable ? response.data.items[0].volumeInfo.title : 'Not Found',
                detectionMethod: 'api',
                confidenceScore: 0.95
            };

        } catch (error) {
            return {
                isAvailable: false,
                responseCode: error.response?.status || 0,
                responseTime: 0,
                detectionMethod: 'api',
                confidenceScore: 0.5,
                error: error.message
            };
        }
    }

    /**
     * Generic scraper fallback
     */
    async scrapeGeneric(url) {
        try {
            const response = await axios.get(url, {
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            return {
                isAvailable: response.status === 200,
                responseCode: response.status,
                responseTime: 0,
                detectionMethod: 'http',
                confidenceScore: 0.6
            };

        } catch (error) {
            return {
                isAvailable: false,
                responseCode: error.response?.status || 0,
                responseTime: 0,
                detectionMethod: 'http',
                confidenceScore: 0.4,
                error: error.message
            };
        }
    }

    /**
     * Save availability snapshot
     */
    async saveSnapshot(monitoredBookId, platform, result) {
        const snapshotResult = await db.run(`
            INSERT INTO availability_snapshots
            (monitored_book_id, platform, is_available, response_code, response_time_ms,
             page_title, page_content_hash, detection_method, confidence_score)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            monitoredBookId,
            platform,
            result.isAvailable ? 1 : 0,
            result.responseCode || 0,
            result.responseTime || 0,
            result.pageTitle || '',
            result.pageContentHash || '',
            result.detectionMethod || 'scraper',
            result.confidenceScore || 0.5
        ]);

        return snapshotResult.lastID;
    }

    /**
     * Handle ban detected
     */
    async handleBanDetected(book, platform, result) {
        try {
            // Create censorship alert
            const alertResult = await db.run(`
                INSERT INTO censorship_alerts
                (book_id, platform, alert_type, severity, after_snapshot_id, is_verified)
                VALUES (?, ?, 'new_ban', 'high', ?, 0)
            `, [book.book_id, platform, result.snapshotId]);

            const alertId = alertResult.lastID;

            // Archive with Wayback Machine
            await this.archiveWithWayback(book, platform);

            // Trigger Streisand Effect
            await this.triggerStreisandEffect(book, platform, alertId);

            // Update controversy score
            await aiDiscoveryService.calculateControversyScore(book.book_id);

            console.log(`✅ Handled ban for ${book.book_id} on ${platform}`);

        } catch (error) {
            console.error('Error handling ban:', error);
        }
    }

    /**
     * Handle book restored
     */
    async handleBookRestored(book, platform, result) {
        try {
            await db.run(`
                INSERT INTO censorship_alerts
                (book_id, platform, alert_type, severity, after_snapshot_id, is_verified)
                VALUES (?, ?, 'restored', 'low', ?, 1)
            `, [book.book_id, platform, result.snapshotId]);

            console.log(`✅ Logged restoration for ${book.book_id} on ${platform}`);

        } catch (error) {
            console.error('Error handling restoration:', error);
        }
    }

    /**
     * Archive page with Wayback Machine
     */
    async archiveWithWayback(book, platform) {
        try {
            const platformUrl = this.getPlatformUrl(book, platform);
            if (!platformUrl) return;

            // Save to Wayback Machine (they have a save API)
            const saveUrl = `https://web.archive.org/save/${platformUrl}`;

            const response = await axios.get(saveUrl, {
                timeout: 30000,
                validateStatus: () => true // Accept any status
            });

            // Extract Wayback URL from response
            const waybackUrl = response.headers['content-location'] ||
                             `https://web.archive.org/web/*/${platformUrl}`;

            await db.run(`
                INSERT INTO wayback_archives
                (book_id, platform, original_url, wayback_url, archive_status, archive_reason)
                VALUES (?, ?, ?, ?, 'archived', 'ban_detected')
            `, [book.book_id, platform, platformUrl, waybackUrl]);

            console.log(`📦 Archived ${platform} page: ${waybackUrl}`);

        } catch (error) {
            console.error('Wayback archiving error:', error.message);
        }
    }

    /**
     * Get platform URL for book
     */
    getPlatformUrl(book, platform) {
        const urls = {
            amazon: book.amazon_asin ? `https://www.amazon.com/dp/${book.amazon_asin}` : null,
            goodreads: book.goodreads_id ? `https://www.goodreads.com/book/show/${book.goodreads_id}` : null,
            google_books: book.isbn ? `https://books.google.com/books?isbn=${book.isbn}` : null
        };

        return urls[platform];
    }

    /**
     * Trigger Streisand Effect (automatic marketing on ban)
     */
    async triggerStreisandEffect(book, platform, alertId) {
        try {
            console.log(`🔥 Triggering Streisand Effect for ${book.book_id}`);

            // 1. Increase book visibility in search
            await db.run(`
                UPDATE book_embeddings
                SET
                    suppression_level = CASE
                        WHEN suppression_level < 90 THEN suppression_level + 10
                        ELSE 100
                    END,
                    danger_index = CASE
                        WHEN danger_index < 90 THEN danger_index + 10
                        ELSE 100
                    END,
                    search_weight = search_weight * 1.2
                WHERE book_id = ?
            `, [book.book_id]);

            // 2. Queue email alert
            await this.queueEmailAlert(book, platform, alertId);

            // 3. Queue social media post
            await this.queueSocialPost(book, platform, alertId);

            // 4. Mark alert as processed
            await db.run(`
                UPDATE censorship_alerts
                SET streisand_triggered = 1
                WHERE id = ?
            `, [alertId]);

            console.log(`✅ Streisand Effect triggered successfully`);

        } catch (error) {
            console.error('Error triggering Streisand Effect:', error);
        }
    }

    /**
     * Queue email alert
     */
    async queueEmailAlert(book, platform, alertId) {
        // Get book details
        const bookDetails = await db.get(`
            SELECT * FROM book_embeddings WHERE book_id = ?
        `, [book.book_id]);

        if (!bookDetails) return;

        // Get subscribers
        const subscribers = await db.all(`
            SELECT email FROM alert_subscriptions
            WHERE is_verified = 1
            AND is_active = 1
            AND (subscribe_all_bans = 1 OR subscribe_platform LIKE '%${platform}%')
        `);

        const subject = `🚨 CENSORED: "${bookDetails.title}" removed from ${platform}`;
        const bodyHtml = `
            <h1>Censorship Alert!</h1>
            <p><strong>${platform}</strong> just removed this book:</p>
            <h2>"${bookDetails.title}"</h2>
            <p>by ${bookDetails.author}</p>
            <p><strong>Danger Index: ${bookDetails.danger_index}/100</strong></p>
            <p>Get it before it's gone: <a href="YOUR_MARKETPLACE_URL/book/${book.book_id}">Read Now</a></p>
        `;

        // Queue emails
        for (const subscriber of subscribers) {
            await db.run(`
                INSERT INTO email_alert_queue
                (alert_id, recipient_email, recipient_type, subject, body_html, status)
                VALUES (?, ?, 'subscriber', ?, ?, 'pending')
            `, [alertId, subscriber.email, subject, bodyHtml]);
        }

        console.log(`📧 Queued ${subscribers.length} email alerts`);
    }

    /**
     * Queue social media post
     */
    async queueSocialPost(book, platform, alertId) {
        const bookDetails = await db.get(`
            SELECT * FROM book_embeddings WHERE book_id = ?
        `, [book.book_id]);

        if (!bookDetails) return;

        const postText = `🚨 CENSORSHIP ALERT

${platform} just removed "${bookDetails.title}" by ${bookDetails.author}.

📕 Danger Index: ${bookDetails.danger_index}/100
🔥 Why are they scared?

Read it here: YOUR_MARKETPLACE_URL/book/${book.book_id}

#Censorship #FreeSpeech #BannedBooks`;

        await db.run(`
            INSERT INTO social_post_queue
            (alert_id, platform, post_text, hashtags, status)
            VALUES (?, 'twitter', ?, '["Censorship","FreeSpeech","BannedBooks"]', 'pending')
        `, [alertId, postText]);

        console.log(`🐦 Queued social media post`);
    }

    /**
     * Add book to monitoring
     */
    async addBookToMonitoring(bookId, brand, platformIdentifiers = {}) {
        try {
            await db.run(`
                INSERT OR REPLACE INTO monitored_books
                (book_id, brand, amazon_asin, goodreads_id, google_books_id, isbn, is_active, priority)
                VALUES (?, ?, ?, ?, ?, ?, 1, 3)
            `, [
                bookId,
                brand,
                platformIdentifiers.amazon_asin || null,
                platformIdentifiers.goodreads_id || null,
                platformIdentifiers.google_books_id || null,
                platformIdentifiers.isbn || null
            ]);

            console.log(`✅ Added ${bookId} to censorship monitoring`);

        } catch (error) {
            console.error('Error adding book to monitoring:', error);
        }
    }

    /**
     * Utility: Sleep
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = new CensorshipTrackerService();
