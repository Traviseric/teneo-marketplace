const db = require('../database/database');

class BadgeService {
    constructor() {
        this.badgeConfig = {
            'bronze_book': {
                icon: '📘',
                name: 'Bronze Book',
                description: 'Published 5 books',
                color: '#cd7f32',
                threshold: 5,
                category: 'books_published',
                reward: 1
            },
            'silver_stack': {
                icon: '📚',
                name: 'Silver Stack',
                description: 'Published 10 books',
                color: '#c0c0c0',
                threshold: 10,
                category: 'books_published',
                reward: 2
            },
            'gold_trophy': {
                icon: '🏆',
                name: 'Gold Trophy',
                description: 'Published 25 books',
                color: '#ffd700',
                threshold: 25,
                category: 'books_published',
                reward: 5
            },
            'diamond': {
                icon: '💎',
                name: 'Diamond',
                description: 'Published 50 books',
                color: '#b9f2ff',
                threshold: 50,
                category: 'books_published',
                reward: 10
            },
            'crown': {
                icon: '👑',
                name: 'Crown',
                description: 'Published 100 books',
                color: '#ff6b6b',
                threshold: 100,
                category: 'books_published',
                reward: 20
            },
            'rocket': {
                icon: '🚀',
                name: 'Rocket',
                description: 'Published 250 books',
                color: '#4ecdc4',
                threshold: 250,
                category: 'books_published',
                reward: 50
            },
            'star': {
                icon: '🌟',
                name: 'Star',
                description: 'Published 500 books',
                color: '#ffe66d',
                threshold: 500,
                category: 'books_published',
                reward: 100
            },
            'review_magnet': {
                icon: '🧲',
                name: 'Review Magnet',
                description: '100+ total reviews',
                color: '#9b59b6',
                threshold: 100,
                category: 'reviews_earned',
                reward: 3
            },
            'bestseller': {
                icon: '⭐',
                name: 'Bestseller',
                description: 'BSR under 1000',
                color: '#e74c3c',
                threshold: 1000,
                category: 'bsr_achieved',
                reward: 5
            },
            'velocity_champion': {
                icon: '⚡',
                name: 'Velocity Champion',
                description: 'Published 10 books in 30 days',
                color: '#f39c12',
                threshold: 10,
                category: 'velocity_achieved',
                reward: 5
            }
        };
    }

    async checkAndAwardBadges(userId, bookCount, totalReviews = 0, bestBSR = null, booksLast30Days = 0) {
        const newBadges = [];
        
        try {
            // Check books published badges
            for (const [badgeId, config] of Object.entries(this.badgeConfig)) {
                if (config.category === 'books_published' && bookCount >= config.threshold) {
                    const awarded = await this.awardBadge(userId, badgeId, bookCount);
                    if (awarded) newBadges.push(badgeId);
                }
            }

            // Check review badges
            if (totalReviews >= 100) {
                const awarded = await this.awardBadge(userId, 'review_magnet', totalReviews);
                if (awarded) newBadges.push('review_magnet');
            }

            // Check BSR badges
            if (bestBSR && bestBSR < 1000) {
                const awarded = await this.awardBadge(userId, 'bestseller', bestBSR);
                if (awarded) newBadges.push('bestseller');
            }

            // Check velocity badges
            if (booksLast30Days >= 10) {
                const awarded = await this.awardBadge(userId, 'velocity_champion', booksLast30Days);
                if (awarded) newBadges.push('velocity_champion');
            }

            return newBadges;
        } catch (error) {
            console.error('Error checking badges:', error);
            return [];
        }
    }

    async awardBadge(userId, badgeId, currentValue) {
        const config = this.badgeConfig[badgeId];
        if (!config) return false;

        try {
            // Check if user already has this milestone/badge
            const existsQuery = `
                SELECT id FROM publisher_milestones 
                WHERE user_id = ? AND badge_id = ? AND achieved_date IS NOT NULL
            `;
            
            const existing = await db.get(existsQuery, [userId, badgeId]);
            if (existing) {
                return false; // Already awarded
            }

            // Award the milestone
            const awardQuery = `
                INSERT OR REPLACE INTO publisher_milestones (
                    user_id, milestone_type, milestone_category, target_value, 
                    current_value, achieved_date, reward_status, reward_description, badge_id
                ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 'granted', ?, ?)
            `;

            await db.run(awardQuery, [
                userId,
                config.threshold.toString(),
                config.category,
                config.threshold,
                currentValue,
                `${config.reward} free book generations`,
                badgeId
            ]);

            // Create the reward
            await this.createBadgeReward(userId, badgeId, config);

            // Update publisher stats badges
            await this.updatePublisherBadges(userId);

            console.log(`🏆 Badge awarded: ${config.name} to user ${userId}`);
            return true;

        } catch (error) {
            console.error(`Error awarding badge ${badgeId} to user ${userId}:`, error);
            return false;
        }
    }

    async createBadgeReward(userId, badgeId, config) {
        const rewardQuery = `
            INSERT INTO publisher_rewards (
                user_id, reward_type, reward_value, earned_for, milestone_achieved
            ) VALUES (?, 'free_generation', ?, ?, ?)
        `;

        await db.run(rewardQuery, [
            userId,
            config.reward,
            `Earned ${config.name} badge: ${config.description}`,
            badgeId
        ]);

        // Update publisher stats
        const updateStatsQuery = `
            UPDATE publisher_stats 
            SET free_generations_available = free_generations_available + ?,
                rewards_earned = rewards_earned + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        `;

        await db.run(updateStatsQuery, [config.reward, userId]);
    }

    async updatePublisherBadges(userId) {
        const badgesQuery = `
            SELECT badge_id 
            FROM publisher_milestones 
            WHERE user_id = ? AND achieved_date IS NOT NULL AND badge_id IS NOT NULL
            ORDER BY target_value ASC
        `;

        const badges = await db.all(badgesQuery, [userId]);
        const badgeIds = badges.map(b => b.badge_id);

        const updateQuery = `
            UPDATE publisher_stats 
            SET badges_earned = ?, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        `;

        await db.run(updateQuery, [JSON.stringify(badgeIds), userId]);
    }

    async getUserBadges(userId) {
        const query = `
            SELECT pm.badge_id, pm.achieved_date, pm.current_value
            FROM publisher_milestones pm
            WHERE pm.user_id = ? AND pm.achieved_date IS NOT NULL AND pm.badge_id IS NOT NULL
            ORDER BY pm.achieved_date ASC
        `;

        const userBadges = await db.all(query, [userId]);
        
        return userBadges.map(badge => ({
            id: badge.badge_id,
            ...this.badgeConfig[badge.badge_id],
            earned: true,
            earned_date: badge.achieved_date,
            value_achieved: badge.current_value
        }));
    }

    async getAvailableBadges() {
        return Object.entries(this.badgeConfig).map(([id, config]) => ({
            id,
            ...config,
            earned: false
        }));
    }

    async getBadgeProgress(userId) {
        const statsQuery = `
            SELECT total_books, verified_books, total_reviews, best_bsr, books_last_30_days
            FROM publisher_stats
            WHERE user_id = ?
        `;

        const stats = await db.get(statsQuery, [userId]);
        if (!stats) return [];

        const earnedBadges = await this.getUserBadges(userId);
        const earnedBadgeIds = earnedBadges.map(b => b.id);

        const progress = [];

        for (const [badgeId, config] of Object.entries(this.badgeConfig)) {
            if (earnedBadgeIds.includes(badgeId)) continue;

            let currentValue = 0;
            let progressPercent = 0;

            switch (config.category) {
                case 'books_published':
                    currentValue = stats.verified_books || 0;
                    break;
                case 'reviews_earned':
                    currentValue = stats.total_reviews || 0;
                    break;
                case 'bsr_achieved':
                    currentValue = stats.best_bsr || 999999;
                    progressPercent = stats.best_bsr ? Math.max(0, 100 - (stats.best_bsr / config.threshold * 100)) : 0;
                    break;
                case 'velocity_achieved':
                    currentValue = stats.books_last_30_days || 0;
                    break;
            }

            if (config.category !== 'bsr_achieved') {
                progressPercent = Math.min(100, (currentValue / config.threshold) * 100);
            }

            progress.push({
                id: badgeId,
                ...config,
                current_value: currentValue,
                progress_percent: progressPercent,
                remaining: Math.max(0, config.threshold - currentValue)
            });
        }

        // Sort by progress (closest to earning first)
        return progress.sort((a, b) => b.progress_percent - a.progress_percent);
    }

    async getRecentBadgeActivity(limit = 10) {
        const query = `
            SELECT pm.user_id, pm.badge_id, pm.achieved_date, pm.current_value,
                   ps.username, ps.display_name
            FROM publisher_milestones pm
            LEFT JOIN publisher_stats ps ON pm.user_id = ps.user_id
            WHERE pm.achieved_date IS NOT NULL AND pm.badge_id IS NOT NULL
            ORDER BY pm.achieved_date DESC
            LIMIT ?
        `;

        const activity = await db.all(query, [limit]);

        return activity.map(item => ({
            user_id: item.user_id,
            username: item.username || `Publisher${item.user_id.slice(-4)}`,
            display_name: item.display_name || item.username || `Publisher${item.user_id.slice(-4)}`,
            badge: {
                id: item.badge_id,
                ...this.badgeConfig[item.badge_id]
            },
            earned_date: item.achieved_date,
            value_achieved: item.current_value
        }));
    }

    getBadgeConfig(badgeId) {
        return this.badgeConfig[badgeId] || null;
    }

    getAllBadgeConfigs() {
        return this.badgeConfig;
    }

    formatBadgeNotification(badgeId, currentValue) {
        const config = this.badgeConfig[badgeId];
        if (!config) return null;

        return {
            title: `🎉 Badge Earned: ${config.name}!`,
            message: config.description,
            icon: config.icon,
            reward: `+${config.reward} free generations`,
            badge: {
                id: badgeId,
                ...config
            }
        };
    }

    async checkMilestoneProximity(userId) {
        const progress = await this.getBadgeProgress(userId);
        const closeToEarning = progress.filter(badge => badge.remaining <= 2 && badge.remaining > 0);
        
        return closeToEarning.map(badge => ({
            badge_id: badge.id,
            name: badge.name,
            icon: badge.icon,
            remaining: badge.remaining,
            message: `Only ${badge.remaining} more ${badge.category.replace('_', ' ')} to earn ${badge.name}!`
        }));
    }

    // Enhanced methods for MARKETPLACE-CLAUDE-TASKS.md milestone system
    async getMilestoneFeed(limit = 50) {
        try {
            const query = `
                SELECT 
                    pm.user_id, pm.badge_id, pm.achieved_date, pm.current_value, pm.milestone_type,
                    ps.username, ps.display_name,
                    pb.title as latest_book_title
                FROM publisher_milestones pm
                LEFT JOIN publisher_stats ps ON pm.user_id = ps.user_id
                LEFT JOIN (
                    SELECT teneo_user_id, title, 
                           ROW_NUMBER() OVER (PARTITION BY teneo_user_id ORDER BY created_at DESC) as rn
                    FROM published_books 
                    WHERE verification_status = 'verified'
                ) pb ON pm.user_id = pb.teneo_user_id AND pb.rn = 1
                WHERE pm.achieved_date IS NOT NULL 
                AND pm.badge_id IS NOT NULL
                AND pm.achieved_date >= datetime('now', '-30 days')
                ORDER BY pm.achieved_date DESC
                LIMIT ?
            `;

            const milestones = await db.all(query, [limit]);

            return milestones.map(milestone => {
                const badge = this.badgeConfig[milestone.badge_id];
                const publisherName = milestone.display_name || milestone.username || `Publisher${milestone.user_id.slice(-4)}`;
                
                return {
                    type: 'milestone_achieved',
                    user_id: milestone.user_id,
                    publisher_name: publisherName,
                    badge: {
                        id: milestone.badge_id,
                        name: badge?.name || 'Unknown Badge',
                        icon: badge?.icon || '🏆',
                        description: badge?.description || 'Achievement unlocked'
                    },
                    achievement_value: milestone.current_value,
                    achieved_date: milestone.achieved_date,
                    latest_book: milestone.latest_book_title,
                    message: this.generateMilestoneMessage(publisherName, badge, milestone.current_value),
                    timestamp: milestone.achieved_date
                };
            });
        } catch (error) {
            console.error('Error getting milestone feed:', error);
            return [];
        }
    }

    generateMilestoneMessage(publisherName, badge, value) {
        if (!badge) return `${publisherName} achieved a milestone!`;
        
        const messages = {
            'bronze_book': `📘 ${publisherName} published their 5th book - Bronze Book achieved!`,
            'silver_stack': `📚 ${publisherName} published 10 books - Silver Stack unlocked!`,
            'gold_trophy': `🏆 ${publisherName} hit 25 published books - Gold Trophy earned!`,
            'diamond': `💎 ${publisherName} reached 50 books - Diamond status achieved!`,
            'crown': `👑 ${publisherName} published 100 books - Crown milestone reached!`,
            'rocket': `🚀 ${publisherName} soared to 250 books published!`,
            'star': `🌟 ${publisherName} reached stellar 500 books published!`,
            'review_magnet': `🧲 ${publisherName} attracted ${value}+ reviews - Review Magnet earned!`,
            'bestseller': `⭐ ${publisherName} hit bestseller status with BSR under 1,000!`,
            'velocity_champion': `⚡ ${publisherName} published ${value} books in 30 days - Velocity Champion!`
        };
        
        return messages[badge.id] || `${publisherName} earned ${badge.name}: ${badge.description}`;
    }

    async getCommunityMilestones() {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_books,
                    COUNT(DISTINCT teneo_user_id) as active_publishers,
                    COUNT(CASE WHEN created_at >= date('now') THEN 1 END) as books_today,
                    COUNT(CASE WHEN created_at >= datetime('now', '-7 days') THEN 1 END) as books_this_week,
                    COUNT(CASE WHEN created_at >= datetime('now', '-30 days') THEN 1 END) as books_this_month
                FROM published_books 
                WHERE verification_status = 'verified'
            `;
            
            const stats = await db.get(query);
            
            // Get milestone progress
            const milestoneQuery = `
                SELECT target_count, current_count 
                FROM publication_milestones 
                WHERE milestone_name = '10K_BOOKS_GOAL'
                LIMIT 1
            `;
            
            const milestone = await db.get(milestoneQuery);
            
            return {
                community_stats: {
                    total_books: stats.total_books || 0,
                    active_publishers: stats.active_publishers || 0,
                    books_today: stats.books_today || 0,
                    books_this_week: stats.books_this_week || 0,
                    books_this_month: stats.books_this_month || 0
                },
                goal_progress: {
                    current: milestone?.current_count || 0,
                    target: milestone?.target_count || 10000,
                    percentage: milestone ? Math.round((milestone.current_count / milestone.target_count) * 100 * 10) / 10 : 0
                },
                recent_achievements: await this.getRecentBadgeActivity(10)
            };
        } catch (error) {
            console.error('Error getting community milestones:', error);
            return {
                community_stats: { total_books: 0, active_publishers: 0, books_today: 0, books_this_week: 0, books_this_month: 0 },
                goal_progress: { current: 0, target: 10000, percentage: 0 },
                recent_achievements: []
            };
        }
    }

    async getTopPublishersByCategory() {
        try {
            const query = `
                SELECT 
                    ps.user_id,
                    COALESCE(ps.display_name, ps.username, 'Publisher' || substr(ps.user_id, -4)) as publisher_name,
                    ps.verified_books,
                    ps.total_reviews,
                    ps.best_bsr,
                    ps.badges_earned,
                    COUNT(CASE WHEN pb.created_at >= datetime('now', '-30 days') THEN 1 END) as books_this_month
                FROM publisher_stats ps
                LEFT JOIN published_books pb ON ps.user_id = pb.teneo_user_id
                WHERE ps.verified_books > 0
                GROUP BY ps.user_id, ps.display_name, ps.username, ps.verified_books, ps.total_reviews, ps.best_bsr, ps.badges_earned
                ORDER BY ps.verified_books DESC
                LIMIT 25
            `;
            
            const publishers = await db.all(query);
            
            // Categorize publishers
            const topPublishers = publishers.slice(0, 10);
            const risingStars = publishers
                .filter(p => p.books_this_month >= 2)
                .sort((a, b) => b.books_this_month - a.books_this_month)
                .slice(0, 5);
            const bestSellers = publishers
                .filter(p => p.best_bsr && p.best_bsr < 50000)
                .sort((a, b) => a.best_bsr - b.best_bsr)
                .slice(0, 5);
            
            return {
                top_publishers: topPublishers.map(p => ({
                    name: p.publisher_name,
                    books_count: p.verified_books,
                    badge: this.getHighestBadgeIcon(p.badges_earned),
                    trend: p.books_this_month >= 3 ? 'up' : p.books_this_month >= 1 ? 'stable' : 'down'
                })),
                rising_stars: risingStars.map(p => ({
                    name: p.publisher_name,
                    books_this_month: p.books_this_month,
                    growth: `+${Math.round((p.books_this_month / Math.max(p.verified_books - p.books_this_month, 1)) * 100)}%`
                })),
                best_sellers: bestSellers.map(p => ({
                    name: p.publisher_name,
                    avg_bsr: p.best_bsr,
                    best_book: 'Top Performer' // Would need to query for actual book title
                }))
            };
        } catch (error) {
            console.error('Error getting top publishers by category:', error);
            return { top_publishers: [], rising_stars: [], best_sellers: [] };
        }
    }

    getHighestBadgeIcon(badgesEarnedJson) {
        try {
            const badges = JSON.parse(badgesEarnedJson || '[]');
            if (!badges.length) return '📚';
            
            // Order by prestige (highest threshold first)
            const badgeOrder = ['star', 'rocket', 'crown', 'diamond', 'gold_trophy', 'silver_stack', 'bronze_book'];
            
            for (const badgeId of badgeOrder) {
                if (badges.includes(badgeId)) {
                    return this.badgeConfig[badgeId]?.icon || '📚';
                }
            }
            
            return badges.length > 0 ? '📚' : '📘';
        } catch (error) {
            return '📚';
        }
    }

    async updatePublisherMilestoneProgress(userId) {
        try {
            // Get current publisher stats
            const statsQuery = `
                SELECT verified_books, total_reviews, best_bsr, books_last_30_days
                FROM publisher_stats
                WHERE user_id = ?
            `;
            
            const stats = await db.get(statsQuery, [userId]);
            if (!stats) return;
            
            // Check and award new badges
            const newBadges = await this.checkAndAwardBadges(
                userId,
                stats.verified_books,
                stats.total_reviews,
                stats.best_bsr,
                stats.books_last_30_days
            );
            
            return {
                badges_awarded: newBadges,
                current_stats: stats,
                proximity_alerts: await this.checkMilestoneProximity(userId)
            };
        } catch (error) {
            console.error('Error updating publisher milestone progress:', error);
            return { badges_awarded: [], current_stats: null, proximity_alerts: [] };
        }
    }
}

module.exports = BadgeService;