const express = require('express');
const router = express.Router();
const db = require('../database/database');
const TeneoAuthMiddleware = require('../middleware/teneoAuth');
const AmazonService = require('../services/amazonService');
const BadgeService = require('../services/badgeService');

const amazonService = new AmazonService();
const badgeService = new BadgeService();

router.post('/submit', TeneoAuthMiddleware.requireVerifiedUser, async (req, res) => {
    try {
        const { teneo_book_id, amazon_url, submission_notes } = req.body;
        const teneo_user_id = req.teneoUser.id;

        if (!teneo_book_id || !amazon_url) {
            return res.status(400).json({
                success: false,
                error: 'Teneo book ID and Amazon URL are required'
            });
        }

        const asin = await amazonService.extractASINFromURL(amazon_url);
        if (!asin) {
            return res.status(400).json({
                success: false,
                error: 'Invalid Amazon URL - could not extract ASIN'
            });
        }

        if (!await amazonService.validateASIN(asin)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid ASIN format'
            });
        }

        const bookOwnershipValidation = await TeneoAuthMiddleware.validateUserOwnsBook(teneo_user_id, teneo_book_id);
        if (!bookOwnershipValidation.valid) {
            return res.status(403).json({
                success: false,
                error: bookOwnershipValidation.error || 'You do not own this Teneo book'
            });
        }

        const existingBookQuery = `
            SELECT id FROM published_books 
            WHERE teneo_book_id = ? AND teneo_user_id = ?
            OR amazon_asin = ?
        `;
        const existingBook = await db.get(existingBookQuery, [teneo_book_id, teneo_user_id, asin]);
        
        if (existingBook) {
            return res.status(409).json({
                success: false,
                error: 'This book has already been submitted'
            });
        }

        console.log(`Fetching Amazon data for ASIN: ${asin}`);
        const amazonData = await amazonService.fetchBookData(asin);

        const insertQuery = `
            INSERT INTO published_books (
                teneo_book_id, teneo_user_id, amazon_asin, amazon_url,
                title, author, description, cover_image_url, publication_date,
                page_count, language, current_price, currency, bestseller_rank,
                category_rank, primary_category, rating_average, rating_count,
                review_count, submission_notes, last_data_fetch
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;

        const insertParams = [
            teneo_book_id,
            teneo_user_id,
            asin,
            amazon_url,
            amazonData.title || bookOwnershipValidation.book?.title,
            amazonData.author || bookOwnershipValidation.book?.author,
            amazonData.description,
            amazonData.coverImage,
            amazonData.publicationDate,
            amazonData.pageCount,
            amazonData.language || 'en',
            amazonData.price,
            amazonData.currency || 'USD',
            amazonData.bestseller_rank,
            amazonData.category_rank,
            amazonData.category,
            amazonData.rating,
            amazonData.ratingCount,
            amazonData.reviewCount,
            submission_notes
        ];

        const result = await db.run(insertQuery, insertParams);

        if (amazonData.bestseller_rank || amazonData.rating || amazonData.price) {
            const historyQuery = `
                INSERT INTO book_ranking_history (
                    published_book_id, bestseller_rank, category_rank,
                    rating_average, rating_count, review_count, price
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            
            await db.run(historyQuery, [
                result.lastID,
                amazonData.bestseller_rank,
                amazonData.category_rank,
                amazonData.rating,
                amazonData.ratingCount,
                amazonData.reviewCount,
                amazonData.price
            ]);
        }

        await updateMilestoneProgress();

        // Get updated book count and check for new badges
        const bookCountQuery = `
            SELECT COUNT(*) as verified_books FROM published_books 
            WHERE teneo_user_id = ? AND verification_status = 'verified'
        `;
        const bookCountResult = await db.get(bookCountQuery, [teneo_user_id]);
        const verifiedBooks = bookCountResult.verified_books;

        // Check for badges (won't award until verified, but check proximity)
        const newBadges = await badgeService.checkAndAwardBadges(teneo_user_id, verifiedBooks);
        const proximityAlerts = await badgeService.checkMilestoneProximity(teneo_user_id);

        res.json({
            success: true,
            message: 'Book submitted successfully',
            book_id: result.lastID,
            data: {
                id: result.lastID,
                teneo_book_id,
                amazon_asin: asin,
                title: amazonData.title,
                author: amazonData.author,
                verification_status: 'pending'
            },
            new_badges: newBadges.length > 0 ? newBadges.map(badgeId => badgeService.formatBadgeNotification(badgeId)) : [],
            proximity_alerts: proximityAlerts
        });

    } catch (error) {
        console.error('Error submitting published book:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to submit book',
            details: error.message
        });
    }
});

router.get('/dashboard', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            sort_by = 'created_at', 
            order = 'DESC', 
            filter = 'all',
            timeframe = 'all',
            publisher = 'all',
            genre = 'all'
        } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let whereClauses = [];
        let params = [];
        
        // Performance filters
        if (filter === 'verified') {
            whereClauses.push('pb.verification_status = ?');
            params.push('verified');
        } else if (filter === 'pending') {
            whereClauses.push('pb.verification_status = ?');
            params.push('pending');
        } else if (filter === 'trending_up') {
            whereClauses.push('bad.trend_direction = ?');
            params.push('up');
        } else if (filter === 'new_bestsellers') {
            whereClauses.push('pb.bestseller_rank IS NOT NULL AND pb.bestseller_rank <= 10000');
            whereClauses.push('pb.created_at >= datetime("now", "-7 days")')
        } else if (filter === 'most_reviewed') {
            whereClauses.push('pb.rating_count >= 50');
        }
        
        // Time filters
        if (timeframe === 'today') {
            whereClauses.push('pb.created_at >= date("now", "start of day")');
        } else if (timeframe === 'week') {
            whereClauses.push('pb.created_at >= datetime("now", "-7 days")')
        } else if (timeframe === 'month') {
            whereClauses.push('pb.created_at >= datetime("now", "-30 days")');
        }
        
        // Publisher filter
        if (publisher !== 'all') {
            whereClauses.push('(ps.display_name = ? OR ps.username = ?)');
            params.push(publisher, publisher);
        }
        
        // Genre filter (assuming we have genre data)
        if (genre !== 'all') {
            whereClauses.push('bad.main_category LIKE ?');
            params.push(`%${genre}%`);
        }
        
        const whereClause = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

        const allowedSortColumns = {
            'created_at': 'pb.created_at',
            'bestseller_rank': 'pb.bestseller_rank',
            'rating_average': 'pb.rating_average',
            'rating_count': 'pb.rating_count',
            'title': 'pb.title',
            'biggest_improvement': 'bad.rank_improvement_30d',
            'trending_up': 'bad.trend_score'
        };
        
        const sortColumn = allowedSortColumns[sort_by] || 'pb.created_at';
        const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        const booksQuery = `
            SELECT 
                pb.id, pb.teneo_book_id, pb.teneo_user_id, pb.amazon_asin, pb.amazon_url,
                pb.title, pb.author, pb.description, pb.cover_image_url, pb.current_price,
                pb.currency, pb.bestseller_rank, pb.rating_average, pb.rating_count,
                pb.review_count, pb.verification_status, pb.publication_status,
                pb.created_at, pb.last_data_fetch,
                ps.username, ps.display_name,
                COALESCE(ps.display_name, ps.username, 'Publisher' || substr(pb.teneo_user_id, -4)) as publisher_name,
                bad.main_category as genre,
                bad.trend_direction,
                bad.rank_improvement_30d,
                bad.trend_score
            FROM published_books pb
            LEFT JOIN publisher_stats ps ON pb.teneo_user_id = ps.user_id
            LEFT JOIN book_amazon_data bad ON pb.id = bad.published_book_id
            ${whereClause}
            ORDER BY ${sortColumn} ${sortOrder}
            LIMIT ? OFFSET ?
        `;

        const countQuery = `
            SELECT COUNT(*) as total 
            FROM published_books pb
            LEFT JOIN publisher_stats ps ON pb.teneo_user_id = ps.user_id
            LEFT JOIN book_amazon_data bad ON pb.id = bad.published_book_id
            ${whereClause}
        `;

        const books = await db.all(booksQuery, [...params, parseInt(limit), offset]);
        const totalResult = await db.get(countQuery, params);
        const total = totalResult.total;

        const progressQuery = `
            SELECT milestone_name, target_count, current_count, 
                   description, reward_description, achieved_at
            FROM publication_milestones
            ORDER BY target_count ASC
        `;
        const milestones = await db.all(progressQuery);

        const statsQuery = `
            SELECT 
                COUNT(*) as total_books,
                COUNT(CASE WHEN verification_status = 'verified' THEN 1 END) as verified_books,
                COUNT(CASE WHEN bestseller_rank IS NOT NULL THEN 1 END) as ranked_books,
                AVG(rating_average) as avg_rating,
                MIN(bestseller_rank) as best_rank
            FROM published_books
        `;
        const stats = await db.get(statsQuery);

        res.json({
            success: true,
            data: {
                books,
                pagination: {
                    current_page: parseInt(page),
                    per_page: parseInt(limit),
                    total_items: total,
                    total_pages: Math.ceil(total / parseInt(limit))
                },
                stats,
                milestones
            }
        });

    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch dashboard data'
        });
    }
});

router.get('/user/:userId', TeneoAuthMiddleware.requireTeneoAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (req.teneoUser.id !== userId) {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

        const booksQuery = `
            SELECT 
                id, teneo_book_id, amazon_asin, amazon_url, title, author,
                current_price, currency, bestseller_rank, rating_average,
                rating_count, verification_status, created_at, last_data_fetch
            FROM published_books 
            WHERE teneo_user_id = ?
            ORDER BY created_at DESC
        `;

        const books = await db.all(booksQuery, [userId]);

        const statsQuery = `
            SELECT 
                COUNT(*) as total_books,
                COUNT(CASE WHEN verification_status = 'verified' THEN 1 END) as verified_books,
                AVG(rating_average) as avg_rating,
                MIN(bestseller_rank) as best_rank
            FROM published_books
            WHERE teneo_user_id = ?
        `;
        const stats = await db.get(statsQuery, [userId]);

        res.json({
            success: true,
            data: {
                books,
                stats
            }
        });

    } catch (error) {
        console.error('Error fetching user books:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user books'
        });
    }
});

router.put('/:bookId/verify', TeneoAuthMiddleware.requireTeneoAuth, async (req, res) => {
    try {
        const { bookId } = req.params;
        const { verification_status, admin_notes } = req.body;

        if (!['verified', 'rejected', 'pending'].includes(verification_status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid verification status'
            });
        }

        const updateQuery = `
            UPDATE published_books 
            SET verification_status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;

        await db.run(updateQuery, [verification_status, bookId]);

        if (verification_status === 'verified') {
            await updateMilestoneProgress();
            
            // Check for newly earned badges when book is verified
            const userQuery = `
                SELECT teneo_user_id FROM published_books WHERE id = ?
            `;
            const book = await db.get(userQuery, [bookId]);
            
            if (book) {
                const statsQuery = `
                    SELECT COUNT(*) as verified_books, 
                           SUM(rating_count) as total_reviews,
                           MIN(bestseller_rank) as best_bsr
                    FROM published_books 
                    WHERE teneo_user_id = ? AND verification_status = 'verified'
                `;
                const stats = await db.get(statsQuery, [book.teneo_user_id]);
                
                await badgeService.checkAndAwardBadges(
                    book.teneo_user_id, 
                    stats.verified_books,
                    stats.total_reviews || 0,
                    stats.best_bsr
                );
            }
        }

        res.json({
            success: true,
            message: 'Book verification status updated'
        });

    } catch (error) {
        console.error('Error updating verification status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update verification status'
        });
    }
});

// Enhanced Published Books API - matches MARKETPLACE-CLAUDE-TASKS.md specification
router.get('/books', async (req, res) => {
    try {
        const {
            sort = 'recent',           // recent, best_bsr, most_reviews, biggest_improvement, trending_up
            time = 'all',              // all, today, week, month  
            genre = 'all',             // all, business, fiction, non-fiction, etc.
            publisher = 'all',         // all, specific publisher name
            page = 1,                  // pagination
            limit = 20                 // items per page
        } = req.query;
        
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        let whereClauses = [];
        let params = [];
        
        // Time filters
        if (time === 'today') {
            whereClauses.push('pb.created_at >= date("now", "start of day")');
        } else if (time === 'week') {
            whereClauses.push('pb.created_at >= datetime("now", "-7 days")');
        } else if (time === 'month') {
            whereClauses.push('pb.created_at >= datetime("now", "-30 days")');
        }
        
        // Genre filter
        if (genre !== 'all') {
            whereClauses.push('(pb.primary_category LIKE ? OR bad.main_category LIKE ?)');
            params.push(`%${genre}%`, `%${genre}%`);
        }
        
        // Publisher filter
        if (publisher !== 'all') {
            whereClauses.push('(ps.display_name = ? OR ps.username = ?)');
            params.push(publisher, publisher);
        }
        
        // Add verification filter (only show verified books for public API)
        whereClauses.push('pb.verification_status = ?');
        params.push('verified');
        
        const whereClause = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
        
        // Sort mapping
        const sortMapping = {
            'recent': 'pb.created_at DESC',
            'best_bsr': 'pb.bestseller_rank ASC',
            'most_reviews': 'pb.rating_count DESC',
            'biggest_improvement': 'bad.rank_improvement_30d DESC',
            'trending_up': 'bad.trend_score DESC'
        };
        
        const orderBy = sortMapping[sort] || 'pb.created_at DESC';
        
        const booksQuery = `
            SELECT 
                pb.id, pb.teneo_book_id, pb.amazon_asin, pb.amazon_url,
                pb.title, pb.author, pb.description, pb.cover_image_url, 
                pb.current_price, pb.currency, pb.bestseller_rank, 
                pb.rating_average, pb.rating_count, pb.review_count,
                pb.verification_status, pb.created_at, pb.publication_date,
                COALESCE(ps.display_name, ps.username, 'Publisher' || substr(pb.teneo_user_id, -4)) as publisher_name,
                COALESCE(bad.main_category, pb.primary_category, 'Uncategorized') as genre,
                bad.trend_direction,
                bad.rank_improvement_30d,
                bad.trend_score
            FROM published_books pb
            LEFT JOIN publisher_stats ps ON pb.teneo_user_id = ps.user_id
            LEFT JOIN book_amazon_data bad ON pb.id = bad.published_book_id
            ${whereClause}
            ORDER BY ${orderBy}
            LIMIT ? OFFSET ?
        `;
        
        const countQuery = `
            SELECT COUNT(*) as total 
            FROM published_books pb
            LEFT JOIN publisher_stats ps ON pb.teneo_user_id = ps.user_id
            LEFT JOIN book_amazon_data bad ON pb.id = bad.published_book_id
            ${whereClause}
        `;
        
        // Get available filters for metadata
        const genresQuery = `
            SELECT DISTINCT COALESCE(bad.main_category, pb.primary_category, 'Uncategorized') as genre
            FROM published_books pb
            LEFT JOIN book_amazon_data bad ON pb.id = bad.published_book_id
            WHERE pb.verification_status = 'verified' 
            AND COALESCE(bad.main_category, pb.primary_category) IS NOT NULL
            ORDER BY genre
        `;
        
        const publishersQuery = `
            SELECT DISTINCT COALESCE(ps.display_name, ps.username, 'Publisher' || substr(pb.teneo_user_id, -4)) as publisher_name
            FROM published_books pb
            LEFT JOIN publisher_stats ps ON pb.teneo_user_id = ps.user_id
            WHERE pb.verification_status = 'verified'
            ORDER BY publisher_name
        `;
        
        const [books, totalResult, availableGenres, availablePublishers] = await Promise.all([
            db.all(booksQuery, [...params, parseInt(limit), offset]),
            db.get(countQuery, params),
            db.all(genresQuery),
            db.all(publishersQuery)
        ]);
        
        const total = totalResult.total;
        
        res.json({
            success: true,
            data: {
                books,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: total,
                    pages: Math.ceil(total / parseInt(limit))
                },
                filters: {
                    available_genres: availableGenres.map(g => g.genre).filter(g => g && g !== 'Uncategorized'),
                    available_publishers: availablePublishers.map(p => p.publisher_name)
                }
            }
        });
        
    } catch (error) {
        console.error('Error fetching published books:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch published books'
        });
    }
});

router.get('/stats', async (req, res) => {
    try {
        const overallStatsQuery = `
            SELECT 
                COUNT(*) as total_books,
                COUNT(CASE WHEN verification_status = 'verified' THEN 1 END) as verified_books,
                COUNT(CASE WHEN bestseller_rank IS NOT NULL THEN 1 END) as ranked_books,
                COUNT(DISTINCT teneo_user_id) as active_publishers,
                ROUND(AVG(CASE WHEN rating_average IS NOT NULL THEN rating_average END), 1) as avg_rating,
                SUM(CASE WHEN rating_count IS NOT NULL THEN rating_count ELSE 0 END) as total_reviews
            FROM published_books
            WHERE verification_status = 'verified'
        `;

        const recentStatsQuery = `
            SELECT 
                COUNT(CASE WHEN created_at >= date('now') THEN 1 END) as books_today,
                COUNT(CASE WHEN created_at >= datetime('now', '-7 days') THEN 1 END) as books_this_week,
                COUNT(CASE WHEN created_at >= datetime('now', '-30 days') THEN 1 END) as books_this_month,
                COUNT(DISTINCT CASE WHEN created_at >= datetime('now', '-30 days') THEN teneo_user_id END) as new_publishers
            FROM published_books
            WHERE verification_status = 'verified'
        `;

        // Calculate growth rate (books this month vs previous month)
        const growthQuery = `
            SELECT 
                COUNT(CASE WHEN created_at >= datetime('now', '-30 days') THEN 1 END) as current_month,
                COUNT(CASE WHEN created_at >= datetime('now', '-60 days') AND created_at < datetime('now', '-30 days') THEN 1 END) as previous_month
            FROM published_books
            WHERE verification_status = 'verified'
        `;

        const milestonesQuery = `
            SELECT milestone_name, target_count, current_count
            FROM publication_milestones
            WHERE milestone_name = '10K_BOOKS_GOAL'
            LIMIT 1
        `;

        const [overallStats, recentStats, growthStats, milestoneResult] = await Promise.all([
            db.get(overallStatsQuery),
            db.get(recentStatsQuery),
            db.get(growthQuery),
            db.get(milestonesQuery)
        ]);

        // Calculate growth rate
        const growthRate = growthStats.previous_month > 0 
            ? Math.round(((growthStats.current_month - growthStats.previous_month) / growthStats.previous_month) * 100 * 10) / 10
            : 0;

        // Estimate completion date based on current rate
        const milestone = milestoneResult || { current_count: 0, target_count: 10000 };
        const remaining = milestone.target_count - milestone.current_count;
        const monthlyRate = recentStats.books_this_month || 1;
        const monthsToComplete = Math.ceil(remaining / monthlyRate);
        const estimatedDate = new Date();
        estimatedDate.setMonth(estimatedDate.getMonth() + monthsToComplete);
        const season = Math.ceil((estimatedDate.getMonth() + 1) / 3);
        const seasonNames = ['Winter', 'Spring', 'Summer', 'Fall'];
        const estimatedCompletion = `${seasonNames[season - 1]} ${estimatedDate.getFullYear()}`;

        const stats = {
            overall: {
                total_books: overallStats.total_books || 0,
                verified_books: overallStats.verified_books || 0,
                ranked_books: overallStats.ranked_books || 0,
                active_publishers: overallStats.active_publishers || 0,
                avg_rating: overallStats.avg_rating || 0,
                total_reviews: overallStats.total_reviews || 0
            },
            recent: {
                books_today: recentStats.books_today || 0,
                books_this_week: recentStats.books_this_week || 0,
                books_this_month: recentStats.books_this_month || 0,
                new_publishers: recentStats.new_publishers || 0,
                growth_rate: growthRate
            },
            milestones: {
                progress_to_goal: milestone.current_count || 0,
                goal_target: milestone.target_count || 10000,
                estimated_completion: estimatedCompletion
            }
        };

        res.json({ 
            success: true, 
            data: stats 
        });

    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch statistics'
        });
    }
});

router.get('/leaderboards', async (req, res) => {
    try {
        // Top Publishers (by book count)
        const topPublishersQuery = `
            SELECT 
                COALESCE(ps.display_name, ps.username, 'Publisher' || substr(pb.teneo_user_id, -4)) as name,
                COUNT(*) as books_count,
                ps.badge_display,
                CASE 
                    WHEN COUNT(CASE WHEN pb.created_at >= datetime('now', '-30 days') THEN 1 END) > 
                         COUNT(CASE WHEN pb.created_at >= datetime('now', '-60 days') AND pb.created_at < datetime('now', '-30 days') THEN 1 END)
                    THEN 'up'
                    WHEN COUNT(CASE WHEN pb.created_at >= datetime('now', '-30 days') THEN 1 END) < 
                         COUNT(CASE WHEN pb.created_at >= datetime('now', '-60 days') AND pb.created_at < datetime('now', '-30 days') THEN 1 END)
                    THEN 'down'
                    ELSE 'stable'
                END as trend
            FROM published_books pb
            LEFT JOIN publisher_stats ps ON pb.teneo_user_id = ps.user_id
            WHERE pb.verification_status = 'verified'
            GROUP BY pb.teneo_user_id, ps.display_name, ps.username, ps.badge_display
            ORDER BY books_count DESC, pb.teneo_user_id ASC
            LIMIT 10
        `;

        // Rising Stars (most books this month)
        const risingStarsQuery = `
            SELECT 
                COALESCE(ps.display_name, ps.username, 'Publisher' || substr(pb.teneo_user_id, -4)) as name,
                COUNT(*) as books_this_month,
                CASE 
                    WHEN prev_month_count.count > 0 
                    THEN '+' || ROUND(((COUNT(*) - prev_month_count.count) * 100.0 / prev_month_count.count), 0) || '%'
                    ELSE '+100%'
                END as growth
            FROM published_books pb
            LEFT JOIN publisher_stats ps ON pb.teneo_user_id = ps.user_id
            LEFT JOIN (
                SELECT 
                    teneo_user_id,
                    COUNT(*) as count
                FROM published_books 
                WHERE created_at >= datetime('now', '-60 days') 
                AND created_at < datetime('now', '-30 days')
                AND verification_status = 'verified'
                GROUP BY teneo_user_id
            ) prev_month_count ON pb.teneo_user_id = prev_month_count.teneo_user_id
            WHERE pb.created_at >= datetime('now', '-30 days')
            AND pb.verification_status = 'verified'
            GROUP BY pb.teneo_user_id, ps.display_name, ps.username, prev_month_count.count
            HAVING books_this_month >= 2
            ORDER BY books_this_month DESC, pb.teneo_user_id ASC
            LIMIT 5
        `;

        // Best Sellers (lowest average BSR)
        const bestSellersQuery = `
            SELECT 
                COALESCE(ps.display_name, ps.username, 'Publisher' || substr(pb.teneo_user_id, -4)) as name,
                ROUND(AVG(CASE WHEN pb.bestseller_rank IS NOT NULL THEN pb.bestseller_rank END), 0) as avg_bsr,
                (
                    SELECT title 
                    FROM published_books pb2 
                    WHERE pb2.teneo_user_id = pb.teneo_user_id 
                    AND pb2.bestseller_rank IS NOT NULL
                    AND pb2.verification_status = 'verified'
                    ORDER BY pb2.bestseller_rank ASC 
                    LIMIT 1
                ) as best_book
            FROM published_books pb
            LEFT JOIN publisher_stats ps ON pb.teneo_user_id = ps.user_id
            WHERE pb.verification_status = 'verified'
            AND pb.bestseller_rank IS NOT NULL
            GROUP BY pb.teneo_user_id, ps.display_name, ps.username
            HAVING avg_bsr IS NOT NULL
            ORDER BY avg_bsr ASC
            LIMIT 5
        `;

        const [topPublishers, risingStars, bestSellers] = await Promise.all([
            db.all(topPublishersQuery),
            db.all(risingStarsQuery),
            db.all(bestSellersQuery)
        ]);

        // Add badges for top publishers
        const topPublishersWithBadges = topPublishers.map(publisher => {
            let badge = '📚';
            if (publisher.books_count >= 50) badge = '👑';
            else if (publisher.books_count >= 25) badge = '💎';
            else if (publisher.books_count >= 10) badge = '🏆';
            else if (publisher.books_count >= 5) badge = '📘';
            
            return {
                name: publisher.name,
                books_count: publisher.books_count,
                badge: badge,
                trend: publisher.trend
            };
        });

        const leaderboards = {
            top_publishers: topPublishersWithBadges,
            rising_stars: risingStars.map(star => ({
                name: star.name,
                books_this_month: star.books_this_month,
                growth: star.growth
            })),
            best_sellers: bestSellers.map(seller => ({
                name: seller.name,
                avg_bsr: seller.avg_bsr,
                best_book: seller.best_book || 'Unknown Title'
            }))
        };

        res.json({ 
            success: true, 
            data: leaderboards 
        });

    } catch (error) {
        console.error('Error fetching leaderboards:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch leaderboards'
        });
    }
});

async function updateMilestoneProgress() {
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
    } catch (error) {
        console.error('Error updating milestone progress:', error);
    }
}

module.exports = router;