const express = require('express');
const router = express.Router();
const db = require('../database/database');
const TeneoAuthMiddleware = require('../middleware/teneoAuth');
const LeaderboardService = require('../services/leaderboardService');

const leaderboardService = new LeaderboardService();

router.get('/leaderboards', async (req, res) => {
    try {
        const { type, limit = 10 } = req.query;
        
        if (type) {
            const leaderboard = await leaderboardService.getLeaderboard(type, parseInt(limit));
            res.json({
                success: true,
                data: {
                    type,
                    title: leaderboardService.getLeaderboardTitle(type),
                    description: leaderboardService.getLeaderboardDescription(type),
                    entries: leaderboard
                }
            });
        } else {
            const leaderboards = await leaderboardService.getAllLeaderboards(parseInt(limit));
            const formattedLeaderboards = {};
            
            for (const [key, entries] of Object.entries(leaderboards)) {
                formattedLeaderboards[key] = {
                    title: leaderboardService.getLeaderboardTitle(key),
                    description: leaderboardService.getLeaderboardDescription(key),
                    entries
                };
            }
            
            res.json({
                success: true,
                data: formattedLeaderboards
            });
        }
    } catch (error) {
        console.error('Error fetching leaderboards:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch leaderboards'
        });
    }
});

router.get('/profile/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const profile = await getPublisherProfile(userId);
        if (!profile) {
            return res.status(404).json({
                success: false,
                error: 'Publisher profile not found'
            });
        }

        if (profile.profile_visibility === 'private') {
            const isOwner = req.teneoUser?.id === userId;
            if (!isOwner) {
                return res.status(403).json({
                    success: false,
                    error: 'This profile is private'
                });
            }
        }

        const books = await getPublisherBooks(userId, profile.show_books);
        const timeline = await getPublishingTimeline(userId);
        const rankings = await leaderboardService.getUserRankings(userId);

        res.json({
            success: true,
            data: {
                profile,
                books,
                timeline,
                rankings
            }
        });

    } catch (error) {
        console.error('Error fetching publisher profile:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch publisher profile'
        });
    }
});

router.get('/profile/:userId/stats', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const statsQuery = `
            SELECT 
                ps.*,
                pm.milestone_type, pm.achieved_date, pm.reward_description, pm.badge_id
            FROM publisher_stats ps
            LEFT JOIN publisher_milestones pm ON ps.user_id = pm.user_id 
                AND pm.achieved_date IS NOT NULL AND pm.milestone_category = 'books_published'
            WHERE ps.user_id = ?
            ORDER BY pm.target_value ASC
        `;
        
        const results = await db.all(statsQuery, [userId]);
        
        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Publisher stats not found'
            });
        }

        const profile = results[0];
        const milestones = results
            .filter(r => r.milestone_type)
            .map(r => ({
                type: r.milestone_type,
                achieved_date: r.achieved_date,
                reward_description: r.reward_description,
                badge_id: r.badge_id
            }));

        const badges = leaderboardService.parseBadges(profile.badges_earned || '[]');
        const nextMilestone = getNextMilestone(profile.verified_books);

        res.json({
            success: true,
            data: {
                stats: {
                    total_books: profile.total_books,
                    verified_books: profile.verified_books,
                    best_bsr: profile.best_bsr,
                    avg_bsr: profile.avg_bsr,
                    total_reviews: profile.total_reviews,
                    avg_rating: profile.avg_rating,
                    books_last_30_days: profile.books_last_30_days,
                    first_book_date: profile.first_book_date,
                    last_book_date: profile.last_book_date,
                    free_generations_available: profile.free_generations_available
                },
                badges,
                milestones,
                next_milestone: nextMilestone
            }
        });

    } catch (error) {
        console.error('Error fetching publisher stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch publisher stats'
        });
    }
});

router.put('/profile/:userId', TeneoAuthMiddleware.requireTeneoAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (req.teneoUser.id !== userId) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized to edit this profile'
            });
        }

        const {
            username,
            display_name,
            profile_bio,
            profile_image_url,
            social_twitter,
            social_linkedin,
            social_website,
            profile_visibility,
            show_stats,
            show_books
        } = req.body;

        await ensurePublisherStatsExists(userId);

        const updateQuery = `
            UPDATE publisher_stats SET
                username = COALESCE(?, username),
                display_name = COALESCE(?, display_name),
                profile_bio = COALESCE(?, profile_bio),
                profile_image_url = COALESCE(?, profile_image_url),
                social_twitter = COALESCE(?, social_twitter),
                social_linkedin = COALESCE(?, social_linkedin),
                social_website = COALESCE(?, social_website),
                profile_visibility = COALESCE(?, profile_visibility),
                show_stats = COALESCE(?, show_stats),
                show_books = COALESCE(?, show_books),
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        `;

        await db.run(updateQuery, [
            username, display_name, profile_bio, profile_image_url,
            social_twitter, social_linkedin, social_website,
            profile_visibility, show_stats, show_books, userId
        ]);

        const updatedProfile = await getPublisherProfile(userId);

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: updatedProfile
        });

    } catch (error) {
        console.error('Error updating publisher profile:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update profile'
        });
    }
});

router.get('/rewards/:userId', TeneoAuthMiddleware.requireTeneoAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (req.teneoUser.id !== userId) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized to view rewards'
            });
        }

        const rewardsQuery = `
            SELECT reward_type, reward_value, earned_for, milestone_achieved,
                   status, earned_date, claimed_date
            FROM publisher_rewards
            WHERE user_id = ?
            ORDER BY earned_date DESC
        `;

        const rewards = await db.all(rewardsQuery, [userId]);

        const summaryQuery = `
            SELECT 
                COUNT(*) as total_rewards,
                COUNT(CASE WHEN status = 'available' THEN 1 END) as available_rewards,
                SUM(CASE WHEN reward_type = 'free_generation' AND status = 'available' THEN reward_value ELSE 0 END) as free_generations_available
            FROM publisher_rewards
            WHERE user_id = ?
        `;

        const summary = await db.get(summaryQuery, [userId]);

        res.json({
            success: true,
            data: {
                rewards,
                summary
            }
        });

    } catch (error) {
        console.error('Error fetching rewards:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch rewards'
        });
    }
});

router.post('/rewards/:userId/claim/:rewardId', TeneoAuthMiddleware.requireTeneoAuth, async (req, res) => {
    try {
        const { userId, rewardId } = req.params;
        
        if (req.teneoUser.id !== userId) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized to claim rewards'
            });
        }

        const rewardQuery = `
            SELECT * FROM publisher_rewards
            WHERE id = ? AND user_id = ? AND status = 'available'
        `;

        const reward = await db.get(rewardQuery, [rewardId, userId]);
        
        if (!reward) {
            return res.status(404).json({
                success: false,
                error: 'Reward not found or already claimed'
            });
        }

        await db.run('BEGIN TRANSACTION');

        try {
            const updateRewardQuery = `
                UPDATE publisher_rewards 
                SET status = 'claimed', claimed_date = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            
            await db.run(updateRewardQuery, [rewardId]);

            if (reward.reward_type === 'free_generation') {
                const updateStatsQuery = `
                    UPDATE publisher_stats 
                    SET free_generations_available = free_generations_available - ?
                    WHERE user_id = ?
                `;
                
                await db.run(updateStatsQuery, [reward.reward_value, userId]);
            }

            await db.run('COMMIT');

            res.json({
                success: true,
                message: 'Reward claimed successfully',
                data: {
                    reward_type: reward.reward_type,
                    reward_value: reward.reward_value
                }
            });

        } catch (error) {
            await db.run('ROLLBACK');
            throw error;
        }

    } catch (error) {
        console.error('Error claiming reward:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to claim reward'
        });
    }
});

router.get('/search', async (req, res) => {
    try {
        const { q, limit = 10 } = req.query;
        
        if (!q || q.length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Search query must be at least 2 characters'
            });
        }

        const searchQuery = `
            SELECT user_id, username, display_name, total_books, verified_books, 
                   badges_earned, profile_image_url
            FROM publisher_stats
            WHERE profile_visibility = 'public'
            AND (username LIKE ? OR display_name LIKE ?)
            AND verified_books > 0
            ORDER BY verified_books DESC
            LIMIT ?
        `;

        const searchTerm = `%${q}%`;
        const results = await db.all(searchQuery, [searchTerm, searchTerm, parseInt(limit)]);

        const formattedResults = results.map(publisher => ({
            ...publisher,
            badges: leaderboardService.parseBadges(publisher.badges_earned || '[]')
        }));

        res.json({
            success: true,
            data: {
                query: q,
                results: formattedResults,
                count: results.length
            }
        });

    } catch (error) {
        console.error('Error searching publishers:', error);
        res.status(500).json({
            success: false,
            error: 'Search failed'
        });
    }
});

async function getPublisherProfile(userId) {
    const query = `
        SELECT * FROM publisher_stats 
        WHERE user_id = ?
    `;
    
    const profile = await db.get(query, [userId]);
    
    if (!profile) {
        return null;
    }

    return {
        ...profile,
        badges: leaderboardService.parseBadges(profile.badges_earned || '[]'),
        social_links: {
            twitter: profile.social_twitter,
            linkedin: profile.social_linkedin,
            website: profile.social_website
        }
    };
}

async function getPublisherBooks(userId, showBooks = true) {
    if (!showBooks) return [];

    const booksQuery = `
        SELECT id, title, author, cover_image_url, current_price, currency,
               bestseller_rank, rating_average, rating_count, created_at, amazon_url
        FROM published_books
        WHERE teneo_user_id = ? AND verification_status = 'verified'
        ORDER BY created_at DESC
    `;

    return await db.all(booksQuery, [userId]);
}

async function getPublishingTimeline(userId) {
    const timelineQuery = `
        SELECT 
            DATE(created_at) as date,
            COUNT(*) as books_count
        FROM published_books
        WHERE teneo_user_id = ? AND verification_status = 'verified'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
    `;

    return await db.all(timelineQuery, [userId]);
}

async function ensurePublisherStatsExists(userId) {
    const existsQuery = `SELECT id FROM publisher_stats WHERE user_id = ?`;
    const exists = await db.get(existsQuery, [userId]);
    
    if (!exists) {
        const insertQuery = `
            INSERT INTO publisher_stats (user_id, created_at, updated_at)
            VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;
        await db.run(insertQuery, [userId]);
    }
}

function getNextMilestone(currentBooks) {
    const milestones = [5, 10, 25, 50, 100, 250, 500];
    const nextMilestone = milestones.find(m => m > currentBooks);
    
    if (!nextMilestone) {
        return null;
    }
    
    const progress = currentBooks;
    const remaining = nextMilestone - currentBooks;
    const progressPercent = (progress / nextMilestone) * 100;
    
    const rewardMap = {
        5: 1, 10: 2, 25: 5, 50: 10,
        100: 20, 250: 50, 500: 100
    };
    
    return {
        target: nextMilestone,
        current: currentBooks,
        remaining,
        progress_percent: progressPercent,
        reward: `${rewardMap[nextMilestone]} free generations`
    };
}

module.exports = router;