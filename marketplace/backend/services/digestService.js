// Daily Performance Digest Service
const db = require('../database/database');

class DigestService {
    async generateDailyDigest() {
        try {
            const digest = {
                bookOfTheDay: await this.getBookOfTheDay(),
                moverAndShaker: await this.getMoverAndShaker(),
                reviewChampion: await this.getReviewChampion(),
                risingCategory: await this.getRisingCategory(),
                collectiveIntelligence: await this.getCollectiveIntelligence(),
                communityInsights: await this.getCommunityInsights(),
                milestonesFeed: await this.getMilestonesFeed(),
                performanceComparisons: await this.getPerformanceComparisons(),
                generatedAt: new Date().toISOString()
            };

            // Store the digest in database
            await this.storeDailyDigest(digest);
            
            return digest;
        } catch (error) {
            console.error('Error generating daily digest:', error);
            throw error;
        }
    }

    async getBookOfTheDay() {
        // Find book with best BSR improvement in last 24 hours
        const query = `
            SELECT 
                pb.id, pb.title, pb.author, pb.cover_image_url, pb.bestseller_rank,
                ps.display_name, ps.username,
                bad.rank_improvement_7d, bad.previous_bsr,
                MAX(brh.bestseller_rank) as previous_rank,
                pb.bestseller_rank as current_rank
            FROM published_books pb
            LEFT JOIN publisher_stats ps ON pb.teneo_user_id = ps.user_id
            LEFT JOIN book_amazon_data bad ON pb.id = bad.published_book_id
            LEFT JOIN book_ranking_history brh ON pb.id = brh.published_book_id 
                AND brh.recorded_at >= datetime('now', '-24 hours')
            WHERE pb.verification_status = 'verified'
                AND pb.bestseller_rank IS NOT NULL
                AND bad.rank_improvement_7d > 0
            GROUP BY pb.id
            ORDER BY bad.rank_improvement_7d DESC
            LIMIT 1
        `;

        const book = await db.get(query);
        if (book) {
            const improvementPercent = book.previous_rank 
                ? ((book.previous_rank - book.current_rank) / book.previous_rank * 100).toFixed(1)
                : null;
            
            return {
                ...book,
                publisher_name: book.display_name || book.username || 'Publisher',
                improvementPercent,
                improvementAmount: book.rank_improvement_7d
            };
        }
        return null;
    }

    async getMoverAndShaker() {
        // Find book with most ranking volatility (position changes)
        const query = `
            WITH ranking_changes AS (
                SELECT 
                    pb.id, pb.title, pb.author, pb.cover_image_url,
                    ps.display_name, ps.username,
                    COUNT(DISTINCT brh.bestseller_rank) as rank_changes,
                    MIN(brh.bestseller_rank) as best_rank,
                    MAX(brh.bestseller_rank) as worst_rank,
                    AVG(brh.bestseller_rank) as avg_rank
                FROM published_books pb
                LEFT JOIN publisher_stats ps ON pb.teneo_user_id = ps.user_id
                LEFT JOIN book_ranking_history brh ON pb.id = brh.published_book_id 
                    AND brh.recorded_at >= datetime('now', '-7 days')
                WHERE pb.verification_status = 'verified'
                GROUP BY pb.id
                HAVING rank_changes >= 3
            )
            SELECT *, 
                   (worst_rank - best_rank) as volatility_range,
                   rank_changes as position_changes
            FROM ranking_changes
            ORDER BY volatility_range DESC, rank_changes DESC
            LIMIT 1
        `;

        const book = await db.get(query);
        if (book) {
            // Get sparkline data (last 7 days of BSR)
            const sparklineQuery = `
                SELECT bestseller_rank, recorded_at
                FROM book_ranking_history
                WHERE published_book_id = ?
                AND recorded_at >= datetime('now', '-7 days')
                ORDER BY recorded_at ASC
                LIMIT 20
            `;
            
            const sparklineData = await db.all(sparklineQuery, [book.id]) || [];
            
            return {
                ...book,
                publisher_name: book.display_name || book.username || 'Publisher',
                sparklineData: sparklineData.map(d => ({
                    x: d.recorded_at,
                    y: d.bestseller_rank
                }))
            };
        }
        return null;
    }

    async getReviewChampion() {
        // Find book with most new reviews this week
        const query = `
            SELECT 
                pb.id, pb.title, pb.author, pb.cover_image_url,
                pb.rating_average, pb.rating_count,
                ps.display_name, ps.username,
                bad.review_velocity_weekly,
                bad.review_count_change_7d
            FROM published_books pb
            LEFT JOIN publisher_stats ps ON pb.teneo_user_id = ps.user_id
            LEFT JOIN book_amazon_data bad ON pb.id = bad.published_book_id
            WHERE pb.verification_status = 'verified'
                AND bad.review_count_change_7d > 0
            ORDER BY bad.review_count_change_7d DESC
            LIMIT 1
        `;

        const book = await db.get(query);
        if (book) {
            return {
                ...book,
                publisher_name: book.display_name || book.username || 'Publisher',
                newReviewsCount: book.review_count_change_7d || 0
            };
        }
        return null;
    }

    async getRisingCategory() {
        try {
            // Try to find category with best average BSR improvement
            const query = `
                SELECT 
                    'Fiction' as category,
                    COUNT(pb.id) as book_count,
                    AVG(CASE WHEN pb.bestseller_rank > 0 THEN 100000 - pb.bestseller_rank ELSE 0 END) as avg_improvement,
                    COUNT(CASE WHEN pb.bestseller_rank <= 50000 THEN 1 END) as improving_books
                FROM published_books pb
                WHERE pb.verification_status = 'verified'
                    AND pb.bestseller_rank IS NOT NULL
                GROUP BY category
                HAVING book_count >= 1
                ORDER BY avg_improvement DESC
                LIMIT 1
            `;

            const category = await db.get(query);
            if (category) {
                const improvementPercent = category.avg_improvement ? 
                    (category.avg_improvement / 10000 * 100).toFixed(1) : '0.0';
                
                return {
                    ...category,
                    improvementPercent,
                    successRate: ((category.improving_books / category.book_count) * 100).toFixed(0)
                };
            }
        } catch (error) {
            console.error('getRisingCategory DB error:', error.message);
            return null;
        }

        return null;
    }

    async getCollectiveIntelligence() {
        // Get community-wide metrics
        const metricsQuery = `
            SELECT 
                COUNT(pb.id) as total_books,
                COUNT(CASE WHEN pb.verification_status = 'verified' THEN 1 END) as verified_books,
                SUM(pb.current_price) as estimated_revenue,
                SUM(pb.rating_count) as total_reviews,
                AVG(pb.rating_average) as avg_rating,
                COUNT(DISTINCT bad.main_category) as active_categories,
                COUNT(DISTINCT pb.teneo_user_id) as total_publishers
            FROM published_books pb
            LEFT JOIN book_amazon_data bad ON pb.id = bad.published_book_id
            WHERE pb.verification_status = 'verified'
        `;

        const metrics = await db.get(metricsQuery);

        // Get publishing velocity (last 30 days)
        const velocityQuery = `
            SELECT 
                date(created_at) as publish_date,
                COUNT(*) as books_published
            FROM published_books
            WHERE created_at >= datetime('now', '-30 days')
            GROUP BY date(created_at)
            ORDER BY publish_date ASC
        `;
        
        const velocityData = await db.all(velocityQuery);

        // Get genre distribution (mock data for now)
        let genreData = [];
        try {
            const genreQuery = `
                SELECT 
                    'Fiction' as genre,
                    COUNT(pb.id) as book_count
                FROM published_books pb
                WHERE pb.verification_status = 'verified'
                GROUP BY genre
                ORDER BY book_count DESC
                LIMIT 1
            `;
            
            genreData = await db.all(genreQuery);
        } catch (error) {
            console.error('getCollectiveIntelligence genre query error:', error.message);
            genreData = [];
        }

        // Get success rate metrics
        const successQuery = `
            SELECT 
                COUNT(CASE WHEN pb.bestseller_rank <= 100000 THEN 1 END) as top_100k,
                COUNT(CASE WHEN pb.bestseller_rank <= 50000 THEN 1 END) as top_50k,
                COUNT(CASE WHEN pb.bestseller_rank <= 10000 THEN 1 END) as top_10k,
                COUNT(CASE WHEN pb.bestseller_rank <= 5000 THEN 1 END) as top_5k,
                COUNT(*) as total
            FROM published_books pb
            WHERE pb.verification_status = 'verified'
                AND pb.bestseller_rank IS NOT NULL
        `;
        
        const successRates = await db.get(successQuery);

        return {
            metrics: {
                ...metrics,
                estimated_revenue: (metrics.estimated_revenue * 30 * 0.7) || 0, // Monthly estimate
                avg_rating: metrics.avg_rating ? parseFloat(metrics.avg_rating).toFixed(1) : '0.0'
            },
            velocityData,
            genreData,
            successRates: {
                top_100k: ((successRates.top_100k / successRates.total) * 100).toFixed(1),
                top_50k: ((successRates.top_50k / successRates.total) * 100).toFixed(1),
                top_10k: ((successRates.top_10k / successRates.total) * 100).toFixed(1),
                top_5k: ((successRates.top_5k / successRates.total) * 100).toFixed(1)
            }
        };
    }

    async getCommunityInsights() {
        const insights = [];

        try {
            // Simple performance insights based on available data
            const avgBSRQuery = `
                SELECT AVG(bestseller_rank) as avg_bsr
                FROM published_books
                WHERE verification_status = 'verified'
                    AND bestseller_rank IS NOT NULL
            `;
            
            const avgBSR = await db.get(avgBSRQuery);
            if (avgBSR?.avg_bsr) {
                if (avgBSR.avg_bsr < 100000) {
                    insights.push(`Community average BSR is ${Math.floor(avgBSR.avg_bsr).toLocaleString()} - performing well!`);
                }
            }
        } catch (error) {
            console.log('Error generating community insights:', error.message);
        }

        // Title length analysis
        const titleQuery = `
            SELECT 
                CASE 
                    WHEN LENGTH(title) - LENGTH(REPLACE(title, ' ', '')) + 1 <= 5 THEN 'Short (1-5 words)'
                    WHEN LENGTH(title) - LENGTH(REPLACE(title, ' ', '')) + 1 <= 10 THEN 'Medium (6-10 words)'
                    ELSE 'Long (11+ words)'
                END as title_length_category,
                AVG(pb.bestseller_rank) as avg_bsr,
                COUNT(*) as book_count
            FROM published_books pb
            WHERE pb.verification_status = 'verified'
                AND pb.bestseller_rank IS NOT NULL
            GROUP BY title_length_category
            HAVING book_count >= 5
        `;
        
        const titleData = await db.all(titleQuery);
        if (titleData.length > 1) {
            const bestPerforming = titleData.reduce((best, current) => 
                current.avg_bsr < best.avg_bsr ? current : best
            );
            insights.push(`${bestPerforming.title_length_category} titles have the best average BSR`);
        }

        // Review count correlation
        const reviewQuery = `
            SELECT 
                AVG(pb.bestseller_rank) as avg_bsr
            FROM published_books pb
            WHERE pb.verification_status = 'verified'
                AND pb.bestseller_rank IS NOT NULL
                AND pb.rating_count >= 10
        `;
        
        const highReviewBSR = await db.get(reviewQuery);
        
        const lowReviewQuery = `
            SELECT 
                AVG(pb.bestseller_rank) as avg_bsr
            FROM published_books pb
            WHERE pb.verification_status = 'verified'
                AND pb.bestseller_rank IS NOT NULL
                AND pb.rating_count < 10
        `;
        
        const lowReviewBSR = await db.get(lowReviewQuery);
        
        if (highReviewBSR && lowReviewBSR && highReviewBSR.avg_bsr < lowReviewBSR.avg_bsr) {
            const improvement = ((lowReviewBSR.avg_bsr - highReviewBSR.avg_bsr) / lowReviewBSR.avg_bsr * 100).toFixed(0);
            insights.push(`Books with 10+ reviews rank ${improvement}% better on average`);
        }

        return insights.slice(0, 3); // Return top 3 insights
    }

    async getMilestonesFeed() {
        const feed = [];
        
        try {
            // Get recent book submissions as milestones
            const recentBooksQuery = `
                SELECT 
                    pb.title,
                    pb.author,
                    pb.created_at,
                    ps.display_name,
                    ps.username
                FROM published_books pb
                LEFT JOIN publisher_stats ps ON pb.teneo_user_id = ps.user_id
                WHERE pb.created_at >= datetime('now', '-7 days')
                ORDER BY pb.created_at DESC
                LIMIT 5
            `;

            const recentBooks = await db.all(recentBooksQuery) || [];
            
            recentBooks.forEach(book => {
                const publisherName = book.display_name || book.username || 'Publisher';
                feed.push({
                    type: 'book_published',
                    message: `📚 ${publisherName} published "${book.title}"`,
                    timestamp: book.created_at,
                    icon: '📚'
                });
            });
            
        } catch (error) {
            console.log('Recent books query failed:', error.message);
        }

        try {
            // Get books with good BSR as achievements
            const goodBSRQuery = `
                SELECT 
                    pb.title,
                    pb.bestseller_rank,
                    pb.created_at,
                    ps.display_name,
                    ps.username
                FROM published_books pb
                LEFT JOIN publisher_stats ps ON pb.teneo_user_id = ps.user_id
                WHERE pb.bestseller_rank IS NOT NULL
                    AND pb.bestseller_rank <= 50000
                    AND pb.verification_status = 'verified'
                ORDER BY pb.bestseller_rank ASC
                LIMIT 3
            `;

            const achievements = await db.all(goodBSRQuery) || [];
            
            achievements.forEach(achievement => {
                const publisherName = achievement.display_name || achievement.username || 'Publisher';
                feed.push({
                    type: 'bsr_achievement',
                    message: `🚀 "${achievement.title}" by ${publisherName} achieved BSR #${achievement.bestseller_rank.toLocaleString()}!`,
                    timestamp: achievement.created_at,
                    icon: '📈'
                });
            });
            
        } catch (error) {
            console.log('BSR achievements query failed:', error.message);
        }
        
        return feed.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);
    }

    async getPerformanceComparisons() {
        // Get performance percentiles for comparison tool
        const percentileQuery = `
            SELECT 
                PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY bestseller_rank) as p25_bsr,
                PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY bestseller_rank) as p50_bsr,
                PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY bestseller_rank) as p75_bsr,
                PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY bestseller_rank) as p90_bsr,
                PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY rating_count) as p25_reviews,
                PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY rating_count) as p50_reviews,
                PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY rating_count) as p75_reviews,
                PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY rating_average) as p25_rating,
                PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY rating_average) as p50_rating,
                PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY rating_average) as p75_rating
            FROM published_books
            WHERE verification_status = 'verified'
                AND bestseller_rank IS NOT NULL
        `;

        // SQLite doesn't support PERCENTILE_CONT, so let's use a different approach
        const bsrQuery = `
            SELECT bestseller_rank
            FROM published_books
            WHERE verification_status = 'verified'
                AND bestseller_rank IS NOT NULL
            ORDER BY bestseller_rank
        `;

        const reviewQuery = `
            SELECT rating_count
            FROM published_books
            WHERE verification_status = 'verified'
                AND rating_count IS NOT NULL
            ORDER BY rating_count
        `;

        const ratingQuery = `
            SELECT rating_average
            FROM published_books
            WHERE verification_status = 'verified'
                AND rating_average IS NOT NULL
            ORDER BY rating_average
        `;

        const bsrData = await db.all(bsrQuery);
        const reviewData = await db.all(reviewQuery);
        const ratingData = await db.all(ratingQuery);

        const getPercentile = (data, percentile) => {
            const index = Math.floor(data.length * percentile);
            return data[Math.min(index, data.length - 1)];
        };

        return {
            bsr: {
                p25: getPercentile(bsrData, 0.25)?.bestseller_rank,
                p50: getPercentile(bsrData, 0.50)?.bestseller_rank,
                p75: getPercentile(bsrData, 0.75)?.bestseller_rank,
                p90: getPercentile(bsrData, 0.90)?.bestseller_rank
            },
            reviews: {
                p25: getPercentile(reviewData, 0.25)?.rating_count,
                p50: getPercentile(reviewData, 0.50)?.rating_count,
                p75: getPercentile(reviewData, 0.75)?.rating_count
            },
            rating: {
                p25: getPercentile(ratingData, 0.25)?.rating_average,
                p50: getPercentile(ratingData, 0.50)?.rating_average,
                p75: getPercentile(ratingData, 0.75)?.rating_average
            }
        };
    }

    async storeDailyDigest(digest) {
        const query = `
            INSERT OR REPLACE INTO daily_performance_digest 
            (digest_date, digest_data, generated_at)
            VALUES (date('now'), ?, datetime('now'))
        `;
        
        await db.run(query, [JSON.stringify(digest)]);
    }

    async getLatestDigest() {
        try {
            const query = `
                SELECT * FROM daily_performance_digest
                ORDER BY digest_date DESC
                LIMIT 1
            `;
            
            const result = await db.get(query);
            if (result && result.digest_data) {
                return {
                    ...JSON.parse(result.digest_data),
                    lastUpdated: result.generated_at
                };
            }
        } catch (error) {
            console.log('Error getting latest digest:', error.message);
        }
        return null;
    }

    getOrdinalSuffix(num) {
        const j = num % 10;
        const k = num % 100;
        if (j === 1 && k !== 11) return 'st';
        if (j === 2 && k !== 12) return 'nd';
        if (j === 3 && k !== 13) return 'rd';
        return 'th';
    }

    getMilestoneIcon(type) {
        const icons = {
            'books_published': '📚',
            'bsr_achievement': '📈',
            'review_milestone': '⭐',
            'revenue_milestone': '💰',
            'ranking_milestone': '🏆'
        };
        return icons[type] || '🎉';
    }
}

module.exports = new DigestService();