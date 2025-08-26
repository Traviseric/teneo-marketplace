const db = require('../database/database');

class LeaderboardService {
    constructor() {
        this.leaderboardTypes = [
            'most_published',
            'rising_stars', 
            'best_sellers',
            'most_reviewed',
            'velocity_leaders'
        ];
        
        this.badgeConfig = {
            'bronze_book': { icon: '📘', name: 'Bronze Book', threshold: 5 },
            'silver_stack': { icon: '📚', name: 'Silver Stack', threshold: 10 },
            'gold_trophy': { icon: '🏆', name: 'Gold Trophy', threshold: 25 },
            'diamond': { icon: '💎', name: 'Diamond', threshold: 50 },
            'crown': { icon: '👑', name: 'Crown', threshold: 100 },
            'rocket': { icon: '🚀', name: 'Rocket', threshold: 250 },
            'star': { icon: '🌟', name: 'Star', threshold: 500 }
        };
    }

    async updateAllLeaderboards() {
        console.log('🏆 Starting leaderboard updates...');
        const startTime = Date.now();

        try {
            await this.refreshPublisherStats();
            
            for (const leaderboardType of this.leaderboardTypes) {
                await this.updateLeaderboard(leaderboardType);
            }

            const duration = Math.round((Date.now() - startTime) / 1000);
            console.log(`✅ All leaderboards updated in ${duration}s`);
            
        } catch (error) {
            console.error('💥 Error updating leaderboards:', error);
            throw error;
        }
    }

    async refreshPublisherStats() {
        console.log('📊 Refreshing publisher stats...');
        
        const publishersQuery = `
            SELECT 
                pb.teneo_user_id as user_id,
                COUNT(*) as total_books,
                COUNT(CASE WHEN pb.verification_status = 'verified' THEN 1 END) as verified_books,
                MIN(pb.bestseller_rank) as best_bsr,
                AVG(CASE WHEN pb.bestseller_rank IS NOT NULL THEN pb.bestseller_rank END) as avg_bsr,
                SUM(pb.rating_count) as total_reviews,
                AVG(pb.rating_average) as avg_rating,
                MIN(pb.created_at) as first_book_date,
                MAX(pb.created_at) as last_book_date,
                COUNT(CASE WHEN pb.created_at >= date('now', '-30 days') THEN 1 END) as books_last_30_days,
                COUNT(CASE WHEN pb.created_at >= date('now', '-7 days') THEN 1 END) as books_last_7_days
            FROM published_books pb
            WHERE pb.publication_status = 'active'
            GROUP BY pb.teneo_user_id
        `;

        const publishers = await db.all(publishersQuery);

        for (const pub of publishers) {
            await this.upsertPublisherStats(pub);
            await this.checkAndAwardMilestones(pub.user_id, pub.verified_books);
        }

        console.log(`📈 Updated stats for ${publishers.length} publishers`);
    }

    async upsertPublisherStats(publisherData) {
        const upsertQuery = `
            INSERT OR REPLACE INTO publisher_stats (
                user_id, total_books, verified_books, best_bsr, avg_bsr,
                total_reviews, avg_rating, first_book_date, last_book_date,
                books_last_30_days, books_last_7_days, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;

        await db.run(upsertQuery, [
            publisherData.user_id,
            publisherData.total_books,
            publisherData.verified_books,
            publisherData.best_bsr,
            publisherData.avg_bsr,
            publisherData.total_reviews,
            publisherData.avg_rating,
            publisherData.first_book_date,
            publisherData.last_book_date,
            publisherData.books_last_30_days,
            publisherData.books_last_7_days
        ]);
    }

    async checkAndAwardMilestones(userId, verifiedBooks) {
        const milestones = [5, 10, 25, 50, 100, 250, 500];
        
        for (const milestone of milestones) {
            if (verifiedBooks >= milestone) {
                await this.awardMilestone(userId, milestone.toString(), verifiedBooks);
            }
        }
    }

    async awardMilestone(userId, milestoneType, currentValue) {
        const checkQuery = `
            SELECT id, achieved_date FROM publisher_milestones 
            WHERE user_id = ? AND milestone_type = ? AND milestone_category = 'books_published'
        `;
        
        let milestone = await db.get(checkQuery, [userId, milestoneType]);
        
        if (!milestone) {
            const insertQuery = `
                INSERT INTO publisher_milestones (
                    user_id, milestone_type, milestone_category, target_value,
                    current_value, achieved_date, reward_status, reward_description, badge_id
                )
                SELECT ?, ?, 'books_published', target_value, ?, CURRENT_TIMESTAMP, 'granted', 
                       reward_description, badge_id
                FROM publisher_milestones 
                WHERE user_id = 'default' AND milestone_type = ? AND milestone_category = 'books_published'
            `;
            
            const result = await db.run(insertQuery, [userId, milestoneType, currentValue, milestoneType]);
            
            if (result.changes > 0) {
                await this.createReward(userId, milestoneType);
                await this.updatePublisherBadges(userId);
                console.log(`🎉 ${userId} achieved ${milestoneType} books milestone!`);
            }
        } else if (!milestone.achieved_date && currentValue >= parseInt(milestoneType)) {
            const updateQuery = `
                UPDATE publisher_milestones 
                SET current_value = ?, achieved_date = CURRENT_TIMESTAMP, reward_status = 'granted'
                WHERE user_id = ? AND milestone_type = ? AND milestone_category = 'books_published'
            `;
            
            await db.run(updateQuery, [currentValue, userId, milestoneType]);
            await this.createReward(userId, milestoneType);
            await this.updatePublisherBadges(userId);
            console.log(`🎉 ${userId} achieved ${milestoneType} books milestone!`);
        }
    }

    async createReward(userId, milestoneType) {
        const rewardMap = {
            '5': 1, '10': 2, '25': 5, '50': 10,
            '100': 20, '250': 50, '500': 100
        };
        
        const rewardValue = rewardMap[milestoneType] || 1;
        
        const insertQuery = `
            INSERT INTO publisher_rewards (
                user_id, reward_type, reward_value, earned_for, milestone_achieved
            ) VALUES (?, 'free_generation', ?, ?, ?)
        `;
        
        await db.run(insertQuery, [
            userId,
            rewardValue,
            `Achieved ${milestoneType} published books milestone`,
            milestoneType
        ]);

        const updateStatsQuery = `
            UPDATE publisher_stats 
            SET free_generations_available = free_generations_available + ?,
                rewards_earned = rewards_earned + 1
            WHERE user_id = ?
        `;
        
        await db.run(updateStatsQuery, [rewardValue, userId]);
    }

    async updatePublisherBadges(userId) {
        const milestonesQuery = `
            SELECT milestone_type, badge_id 
            FROM publisher_milestones 
            WHERE user_id = ? AND achieved_date IS NOT NULL AND milestone_category = 'books_published'
            ORDER BY target_value ASC
        `;
        
        const milestones = await db.all(milestonesQuery, [userId]);
        const badges = milestones.map(m => m.badge_id);
        
        const updateQuery = `
            UPDATE publisher_stats 
            SET badges_earned = ?, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        `;
        
        await db.run(updateQuery, [JSON.stringify(badges), userId]);
    }

    async updateLeaderboard(leaderboardType) {
        console.log(`🏅 Updating ${leaderboardType} leaderboard...`);
        
        await db.run('DELETE FROM leaderboard_cache WHERE leaderboard_type = ?', [leaderboardType]);
        
        let query;
        
        switch (leaderboardType) {
            case 'most_published':
                query = `
                    SELECT ps.user_id, ps.username, ps.display_name, ps.verified_books as value,
                           ps.total_books as secondary_value, ps.badges_earned as badge_display
                    FROM publisher_stats ps
                    WHERE ps.verified_books > 0
                    ORDER BY ps.verified_books DESC, ps.total_books DESC
                    LIMIT 100
                `;
                break;

            case 'rising_stars':
                query = `
                    SELECT ps.user_id, ps.username, ps.display_name, ps.books_last_30_days as value,
                           ps.verified_books as secondary_value, ps.badges_earned as badge_display
                    FROM publisher_stats ps
                    WHERE ps.books_last_30_days > 0
                    ORDER BY ps.books_last_30_days DESC, ps.books_last_7_days DESC
                    LIMIT 50
                `;
                break;

            case 'best_sellers':
                query = `
                    SELECT ps.user_id, ps.username, ps.display_name, ps.best_bsr as value,
                           ps.verified_books as secondary_value, ps.badges_earned as badge_display
                    FROM publisher_stats ps
                    WHERE ps.best_bsr IS NOT NULL AND ps.verified_books >= 3
                    ORDER BY ps.best_bsr ASC
                    LIMIT 50
                `;
                break;

            case 'most_reviewed':
                query = `
                    SELECT ps.user_id, ps.username, ps.display_name, ps.total_reviews as value,
                           ps.verified_books as secondary_value, ps.badges_earned as badge_display
                    FROM publisher_stats ps
                    WHERE ps.total_reviews > 0
                    ORDER BY ps.total_reviews DESC, ps.avg_rating DESC
                    LIMIT 50
                `;
                break;

            case 'velocity_leaders':
                query = `
                    SELECT ps.user_id, ps.username, ps.display_name,
                           CAST((julianday('now') - julianday(ps.first_book_date)) / NULLIF(ps.verified_books, 0) as DECIMAL(10,2)) as value,
                           ps.verified_books as secondary_value, ps.badges_earned as badge_display
                    FROM publisher_stats ps
                    WHERE ps.verified_books >= 5 AND ps.first_book_date IS NOT NULL
                    ORDER BY value ASC
                    LIMIT 25
                `;
                break;

            default:
                throw new Error(`Unknown leaderboard type: ${leaderboardType}`);
        }

        const results = await db.all(query);
        
        for (let i = 0; i < results.length; i++) {
            const rank = i + 1;
            const user = results[i];
            
            const insertQuery = `
                INSERT INTO leaderboard_cache (
                    leaderboard_type, user_id, username, display_name, rank, 
                    value, secondary_value, badge_display
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            await db.run(insertQuery, [
                leaderboardType,
                user.user_id,
                user.username || `Publisher${user.user_id.slice(-4)}`,
                user.display_name || user.username || `Publisher${user.user_id.slice(-4)}`,
                rank,
                user.value || 0,
                user.secondary_value || 0,
                user.badge_display || '[]'
            ]);
        }

        console.log(`📊 ${leaderboardType}: ${results.length} entries`);
    }

    async getLeaderboard(type, limit = 10) {
        const query = `
            SELECT user_id, username, display_name, rank, value, secondary_value, badge_display,
                   last_updated
            FROM leaderboard_cache 
            WHERE leaderboard_type = ?
            ORDER BY rank ASC
            LIMIT ?
        `;
        
        const results = await db.all(query, [type, limit]);
        
        return results.map(row => ({
            ...row,
            badges: this.parseBadges(row.badge_display),
            formatted_value: this.formatLeaderboardValue(type, row.value),
            secondary_formatted: this.formatSecondaryValue(type, row.secondary_value)
        }));
    }

    async getAllLeaderboards(limit = 10) {
        const leaderboards = {};
        
        for (const type of this.leaderboardTypes) {
            leaderboards[type] = await this.getLeaderboard(type, limit);
        }
        
        return leaderboards;
    }

    async getUserRankings(userId) {
        const query = `
            SELECT leaderboard_type, rank, value, secondary_value
            FROM leaderboard_cache 
            WHERE user_id = ?
            ORDER BY rank ASC
        `;
        
        const rankings = await db.all(query, [userId]);
        
        const result = {};
        for (const ranking of rankings) {
            result[ranking.leaderboard_type] = {
                rank: ranking.rank,
                value: ranking.value,
                formatted_value: this.formatLeaderboardValue(ranking.leaderboard_type, ranking.value)
            };
        }
        
        return result;
    }

    parseBadges(badgeJson) {
        try {
            const badgeIds = JSON.parse(badgeJson || '[]');
            return badgeIds.map(id => ({
                id,
                ...this.badgeConfig[id],
                earned: true
            }));
        } catch (e) {
            return [];
        }
    }

    formatLeaderboardValue(type, value) {
        if (!value) return '0';
        
        switch (type) {
            case 'most_published':
            case 'rising_stars':
            case 'most_reviewed':
                return value.toLocaleString();
            case 'best_sellers':
                return `#${value.toLocaleString()}`;
            case 'velocity_leaders':
                return `${value} days/book`;
            default:
                return value.toString();
        }
    }

    formatSecondaryValue(type, value) {
        if (!value) return '';
        
        switch (type) {
            case 'rising_stars':
                return `${value} total`;
            case 'best_sellers':
            case 'most_reviewed':
                return `${value} books`;
            case 'velocity_leaders':
                return `${value} books`;
            default:
                return '';
        }
    }

    getLeaderboardTitle(type) {
        const titles = {
            'most_published': 'Most Published',
            'rising_stars': 'Rising Stars (30 days)',
            'best_sellers': 'Best Sellers (BSR)',
            'most_reviewed': 'Most Reviewed',
            'velocity_leaders': 'Velocity Leaders'
        };
        
        return titles[type] || type;
    }

    getLeaderboardDescription(type) {
        const descriptions = {
            'most_published': 'Publishers with the most verified books',
            'rising_stars': 'Most books published in the last 30 days',
            'best_sellers': 'Lowest average Amazon Best Seller Rank',
            'most_reviewed': 'Most total reviews across all books',
            'velocity_leaders': 'Fastest time between book publications'
        };
        
        return descriptions[type] || '';
    }
}

module.exports = LeaderboardService;