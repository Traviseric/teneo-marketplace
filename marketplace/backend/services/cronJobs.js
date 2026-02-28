const cron = require('node-cron');
const db = require('../database/database');
const AmazonService = require('./amazonService');
const LeaderboardService = require('./leaderboardService');
const emailService = require('./emailService');

// Minimal HTML escaper for email templates in cron jobs
function escapeHtmlCron(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Promise wrappers for the raw sqlite3 db connection
function dbGet(sql, params) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => { if (err) reject(err); else resolve(row); });
    });
}
function dbAll(sql, params) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => { if (err) reject(err); else resolve(rows || []); });
    });
}
function dbRun(sql, params) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) { if (err) reject(err); else resolve(this); });
    });
}

class CronJobService {
    constructor() {
        this.amazonService = new AmazonService();
        this.leaderboardService = new LeaderboardService();
        this.isRunning = false;
        this.leaderboardRunning = false;
        this.cartAbandonmentRunning = false;
    }

    start() {
        console.log('🕒 Starting cron job service...');
        
        cron.schedule('0 2 * * *', async () => {
            console.log('🔄 Starting daily book data update...');
            await this.updateAllBooksData();
        }, {
            timezone: "UTC"
        });

        cron.schedule('*/30 * * * *', async () => {
            console.log('📊 Updating milestone progress...');
            await this.updateMilestoneProgress();
        });

        cron.schedule('0 */1 * * *', async () => {
            console.log('🏆 Starting hourly leaderboard update...');
            await this.updateLeaderboards();
        });

        // Cart abandonment recovery — runs every 2 hours
        cron.schedule('0 */2 * * *', async () => {
            console.log('🛒 Starting cart abandonment check...');
            await this.processAbandonedCarts();
        }, { timezone: 'UTC' });

        console.log('✅ Cron jobs scheduled successfully');
    }

    async updateAllBooksData() {
        if (this.isRunning) {
            console.log('⏸️ Book update already running, skipping...');
            return;
        }

        this.isRunning = true;
        const startTime = Date.now();

        try {
            const booksQuery = `
                SELECT id, amazon_asin, title, author, last_data_fetch
                FROM published_books 
                WHERE publication_status = 'active'
                ORDER BY 
                    CASE 
                        WHEN last_data_fetch IS NULL THEN 0
                        ELSE (julianday('now') - julianday(last_data_fetch))
                    END DESC
            `;

            const books = await db.all(booksQuery);
            console.log(`📚 Found ${books.length} books to update`);

            let successCount = 0;
            let errorCount = 0;

            for (let i = 0; i < books.length; i++) {
                const book = books[i];
                console.log(`📖 Updating ${i + 1}/${books.length}: ${book.title} (ASIN: ${book.amazon_asin})`);

                try {
                    const amazonData = await this.amazonService.fetchBookData(book.amazon_asin);
                    
                    await this.updateBookData(book.id, amazonData);
                    
                    await this.recordRankingHistory(book.id, amazonData);
                    
                    successCount++;
                    
                    await this.sleep(3000);
                    
                } catch (error) {
                    console.error(`❌ Error updating book ${book.amazon_asin}:`, error.message);
                    errorCount++;
                    
                    await this.sleep(1000);
                }
            }

            const duration = Math.round((Date.now() - startTime) / 1000);
            console.log(`✅ Book update completed in ${duration}s. Success: ${successCount}, Errors: ${errorCount}`);
            
            await this.logCronExecution('book_data_update', true, `Updated ${successCount} books, ${errorCount} errors`);

        } catch (error) {
            console.error('💥 Critical error in book update process:', error);
            await this.logCronExecution('book_data_update', false, error.message);
        } finally {
            this.isRunning = false;
        }
    }

    async updateBookData(bookId, amazonData) {
        const updateQuery = `
            UPDATE published_books SET
                current_price = ?,
                currency = ?,
                bestseller_rank = ?,
                category_rank = ?,
                primary_category = ?,
                rating_average = ?,
                rating_count = ?,
                review_count = ?,
                last_data_fetch = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;

        await db.run(updateQuery, [
            amazonData.price,
            amazonData.currency || 'USD',
            amazonData.bestseller_rank,
            amazonData.category_rank,
            amazonData.category,
            amazonData.rating,
            amazonData.ratingCount,
            amazonData.reviewCount,
            bookId
        ]);
    }

    async recordRankingHistory(bookId, amazonData) {
        if (!amazonData.bestseller_rank && !amazonData.rating && !amazonData.price) {
            return;
        }

        const historyQuery = `
            INSERT INTO book_ranking_history (
                published_book_id, bestseller_rank, category_rank,
                rating_average, rating_count, review_count, price
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        await db.run(historyQuery, [
            bookId,
            amazonData.bestseller_rank,
            amazonData.category_rank,
            amazonData.rating,
            amazonData.ratingCount,
            amazonData.reviewCount,
            amazonData.price
        ]);
    }

    async updateMilestoneProgress() {
        try {
            const countQuery = `
                SELECT 
                    COUNT(*) as total_books,
                    COUNT(CASE WHEN verification_status = 'verified' THEN 1 END) as verified_books
                FROM published_books 
                WHERE publication_status = 'active'
            `;
            
            const result = await db.get(countQuery);
            
            const updateMilestoneQuery = `
                UPDATE publication_milestones 
                SET current_count = ?, 
                    achieved_at = CASE 
                        WHEN ? >= target_count AND achieved_at IS NULL THEN CURRENT_TIMESTAMP 
                        ELSE achieved_at 
                    END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE milestone_name = '10K_BOOKS_GOAL'
            `;

            await db.run(updateMilestoneQuery, [result.verified_books, result.verified_books]);

            const milestone = await db.get(
                `SELECT current_count, target_count, achieved_at FROM publication_milestones WHERE milestone_name = '10K_BOOKS_GOAL'`
            );

            if (milestone?.achieved_at && !this.milestoneNotified) {
                console.log('🎉 10K Books milestone achieved!');
                this.milestoneNotified = true;
            }

        } catch (error) {
            console.error('Error updating milestone progress:', error);
        }
    }

    async logCronExecution(jobName, success, message) {
        try {
            const logQuery = `
                INSERT OR REPLACE INTO cron_execution_log 
                (job_name, success, message, executed_at) 
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            `;
            await db.run(logQuery, [jobName, success ? 1 : 0, message]);
        } catch (error) {
            console.error('Error logging cron execution:', error);
        }
    }

    async getLastUpdateStatus() {
        try {
            const query = `
                SELECT job_name, success, message, executed_at
                FROM cron_execution_log 
                ORDER BY executed_at DESC 
                LIMIT 5
            `;
            return await db.all(query);
        } catch (error) {
            console.error('Error getting last update status:', error);
            return [];
        }
    }

    async runManualUpdate() {
        console.log('🔄 Manual book update triggered...');
        await this.updateAllBooksData();
    }

    async updateSingleBook(bookId) {
        try {
            const bookQuery = `
                SELECT id, amazon_asin, title 
                FROM published_books 
                WHERE id = ?
            `;
            
            const book = await db.get(bookQuery, [bookId]);
            if (!book) {
                throw new Error('Book not found');
            }

            console.log(`📖 Updating single book: ${book.title} (ASIN: ${book.amazon_asin})`);
            
            const amazonData = await this.amazonService.fetchBookData(book.amazon_asin);
            await this.updateBookData(book.id, amazonData);
            await this.recordRankingHistory(book.id, amazonData);
            
            console.log(`✅ Successfully updated book: ${book.title}`);
            return { success: true, message: 'Book updated successfully' };

        } catch (error) {
            console.error(`❌ Error updating single book:`, error);
            return { success: false, error: error.message };
        }
    }

    async getUpdateStats() {
        try {
            const statsQuery = `
                SELECT 
                    COUNT(*) as total_books,
                    COUNT(CASE WHEN last_data_fetch > datetime('now', '-24 hours') THEN 1 END) as updated_today,
                    COUNT(CASE WHEN last_data_fetch IS NULL THEN 1 END) as never_updated,
                    MIN(last_data_fetch) as oldest_update,
                    MAX(last_data_fetch) as newest_update
                FROM published_books 
                WHERE publication_status = 'active'
            `;

            return await db.get(statsQuery);
        } catch (error) {
            console.error('Error getting update stats:', error);
            return null;
        }
    }

    async updateLeaderboards() {
        if (this.leaderboardRunning) {
            console.log('⏸️ Leaderboard update already running, skipping...');
            return;
        }

        this.leaderboardRunning = true;
        const startTime = Date.now();

        try {
            await this.leaderboardService.updateAllLeaderboards();
            
            const duration = Math.round((Date.now() - startTime) / 1000);
            console.log(`✅ Leaderboards updated in ${duration}s`);
            
            await this.logCronExecution('leaderboard_update', true, `Updated all leaderboards in ${duration}s`);
        } catch (error) {
            console.error('💥 Error updating leaderboards:', error);
            await this.logCronExecution('leaderboard_update', false, error.message);
        } finally {
            this.leaderboardRunning = false;
        }
    }

    async runManualLeaderboardUpdate() {
        console.log('🔄 Manual leaderboard update triggered...');
        await this.updateLeaderboards();
    }

    /**
     * Process abandoned carts and send recovery emails.
     * An abandoned cart is an order with status='pending' created 2–24 hours ago
     * where the customer has NOT completed a purchase for the same book, and
     * no abandonment email has been sent yet.
     */
    async processAbandonedCarts() {
        if (this.cartAbandonmentRunning) {
            console.log('⏸️ Cart abandonment check already running, skipping...');
            return;
        }

        this.cartAbandonmentRunning = true;
        let processed = 0;
        let errors = 0;

        try {
            const abandoned = await dbAll(
                `SELECT o.order_id, o.customer_email, o.customer_name,
                        o.book_title, o.book_id
                 FROM orders o
                 WHERE o.status = 'pending'
                   AND o.abandonment_email_sent_at IS NULL
                   AND o.created_at <= datetime('now', '-2 hours')
                   AND o.created_at >= datetime('now', '-24 hours')
                   AND NOT EXISTS (
                     SELECT 1 FROM orders c
                     WHERE c.customer_email = o.customer_email
                       AND c.book_id = o.book_id
                       AND c.status = 'completed'
                   )`,
                []
            );

            console.log(`🛒 Found ${abandoned.length} abandoned cart(s) to recover`);

            const baseUrl = process.env.BASE_URL || 'http://localhost:3001';

            for (const order of abandoned) {
                try {
                    const checkoutUrl = `${baseUrl}/checkout?book=${encodeURIComponent(order.book_id)}`;
                    const name = order.customer_name || 'there';

                    const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
<h2>You left something in your cart 📚</h2>
<p>Hi ${escapeHtmlCron(name)},</p>
<p>We noticed you were interested in <strong>${escapeHtmlCron(order.book_title)}</strong> but didn't complete your purchase.</p>
<p>Your cart is still waiting. Complete your order now while it's available:</p>
<p style="text-align:center;margin:30px 0">
  <a href="${escapeHtmlCron(checkoutUrl)}" style="background:#1a56db;color:#fff;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:bold">Complete My Order</a>
</p>
<p style="color:#6b7280;font-size:12px">Order reference: ${escapeHtmlCron(order.order_id)}</p>
</body></html>`;

                    const text = `Hi ${name},\n\nYou left "${order.book_title}" in your cart.\n\nComplete your order: ${checkoutUrl}\n\nOrder: ${order.order_id}`;

                    const result = await emailService.sendEmail({
                        to: order.customer_email,
                        subject: `You left something behind — ${order.book_title}`,
                        html,
                        text
                    });

                    if (result.success) {
                        await dbRun(
                            `UPDATE orders SET abandonment_email_sent_at = CURRENT_TIMESTAMP WHERE order_id = ?`,
                            [order.order_id]
                        );
                        processed++;
                        console.log(`✉️  Cart abandonment email sent to ${order.customer_email} (order ${order.order_id})`);
                    } else {
                        errors++;
                        console.error(`❌ Failed to send cart abandonment email for order ${order.order_id}: ${result.error}`);
                    }
                } catch (err) {
                    errors++;
                    console.error(`❌ Error processing abandoned cart ${order.order_id}:`, err.message);
                }
            }

            await this.logCronExecution('cart_abandonment', true, `Processed ${processed} carts, ${errors} errors`);
        } catch (err) {
            console.error('💥 Critical error in cart abandonment job:', err);
            await this.logCronExecution('cart_abandonment', false, err.message);
        } finally {
            this.cartAbandonmentRunning = false;
        }

        return { processed, errors };
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    stop() {
        console.log('🛑 Stopping cron job service...');
        // Note: node-cron doesn't provide a direct way to stop all jobs
        // In a production environment, you might want to keep track of job references
    }
}

module.exports = CronJobService;