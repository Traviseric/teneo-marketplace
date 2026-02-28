// Simple Daily Performance Digest Service - Minimal Version
const db = require('../database/database');

class SimpleDigestService {
    async generateSimpleDigest() {
        try {
            const digest = {
                bookOfTheDay: await this.getSimpleBookOfTheDay(),
                moverAndShaker: null,
                reviewChampion: null,
                risingCategory: null,
                collectiveIntelligence: await this.getSimpleIntelligence(),
                communityInsights: [],
                milestonesFeed: await this.getSimpleFeed(),
                generatedAt: new Date().toISOString()
            };

            return digest;
        } catch (error) {
            console.error('Error generating simple digest:', error);
            throw error;
        }
    }

    async getSimpleBookOfTheDay() {
        try {
            const query = `
                SELECT 
                    pb.id, pb.title, pb.author, pb.cover_image_url, pb.bestseller_rank,
                    ps.display_name, ps.username,
                    pb.created_at
                FROM published_books pb
                LEFT JOIN publisher_stats ps ON pb.teneo_user_id = ps.user_id
                WHERE pb.verification_status = 'verified'
                    AND pb.bestseller_rank IS NOT NULL
                ORDER BY pb.bestseller_rank ASC
                LIMIT 1
            `;

            const book = await db.get(query);
            if (book) {
                return {
                    ...book,
                    publisher_name: book.display_name || book.username || 'Publisher',
                    current_rank: book.bestseller_rank
                };
            }
        } catch (error) {
            console.error('getSimpleBookOfTheDay DB error:', error.message);
        }

        return null;
    }

    async getSimpleIntelligence() {
        try {
            const metricsQuery = `
                SELECT 
                    COUNT(pb.id) as total_books,
                    COUNT(CASE WHEN pb.verification_status = 'verified' THEN 1 END) as verified_books,
                    SUM(CASE WHEN pb.current_price > 0 THEN pb.current_price * 30 ELSE 0 END) as estimated_revenue,
                    SUM(CASE WHEN pb.rating_count > 0 THEN pb.rating_count ELSE 0 END) as total_reviews,
                    AVG(CASE WHEN pb.rating_average > 0 THEN pb.rating_average ELSE NULL END) as avg_rating,
                    COUNT(DISTINCT pb.teneo_user_id) as total_publishers
                FROM published_books pb
                WHERE pb.verification_status = 'verified'
            `;

            const metrics = await db.get(metricsQuery);
            
            return {
                metrics: {
                    total_books: metrics.total_books || 0,
                    verified_books: metrics.verified_books || 0,
                    estimated_revenue: metrics.estimated_revenue || 0,
                    total_reviews: metrics.total_reviews || 0,
                    avg_rating: metrics.avg_rating ? parseFloat(metrics.avg_rating).toFixed(1) : '0.0',
                    active_categories: metrics.active_categories || 0,
                    total_publishers: metrics.total_publishers || 0
                },
                velocityData: [],
                genreData: [],
                successRates: null
            };
        } catch (error) {
            console.error('getSimpleIntelligence DB error:', error.message);
            return null;
        }
    }

    async getSimpleFeed() {
        const feed = [];
        
        try {
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
                LIMIT 3
            `;

            const recentBooks = await db.all(recentBooksQuery);
            
            if (recentBooks && Array.isArray(recentBooks)) {
            
                recentBooks.forEach(book => {
                    const publisherName = book.display_name || book.username || 'Publisher';
                    feed.push({
                        type: 'book_published',
                        message: `📚 ${publisherName} published "${book.title}"`,
                        timestamp: book.created_at,
                        icon: '📚'
                    });
                });
            }
            
        } catch (error) {
            console.log('Recent books query failed:', error.message);
        }
        
        return feed.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5);
    }

    formatTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diffInMinutes = Math.floor((now - time) / (1000 * 60));
        
        if (diffInMinutes < 1) return 'just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h ago`;
        
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays}d ago`;
    }
}

module.exports = new SimpleDigestService();