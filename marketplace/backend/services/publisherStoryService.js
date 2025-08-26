// Publisher Story System Service
const db = require('../database/database');

class PublisherStoryService {
    // Get all stories for a book
    async getBookStories(bookId) {
        try {
            const stories = await db.all(`
                SELECT ps.*, 
                    (SELECT COUNT(*) FROM story_votes sv WHERE sv.story_id = ps.id AND sv.vote_type = 'helpful') as helpful_count,
                    (SELECT COUNT(*) FROM story_comments sc WHERE sc.story_id = ps.id AND sc.approved = 1) as comment_count
                FROM publisher_stories ps
                WHERE ps.published_book_id = ? AND ps.published = 1
                ORDER BY ps.helpful_count DESC, ps.created_at DESC
            `, [bookId]);
            
            return stories;
        } catch (error) {
            console.error('Error getting book stories:', error);
            return [];
        }
    }

    // Add a new story
    async addStory(bookId, storyData) {
        try {
            const { story_type, title, content } = storyData;
            
            const result = await db.run(`
                INSERT INTO publisher_stories (published_book_id, story_type, title, content)
                VALUES (?, ?, ?, ?)
            `, [bookId, story_type, title, content]);
            
            return { success: true, storyId: result.lastID };
        } catch (error) {
            console.error('Error adding story:', error);
            throw error;
        }
    }

    // Vote on a story (helpful/not helpful)
    async voteOnStory(storyId, voterEmail, voteType) {
        try {
            // Remove existing vote if any
            await db.run(`
                DELETE FROM story_votes WHERE story_id = ? AND voter_email = ?
            `, [storyId, voterEmail]);
            
            // Add new vote
            await db.run(`
                INSERT INTO story_votes (story_id, voter_email, vote_type)
                VALUES (?, ?, ?)
            `, [storyId, voterEmail, voteType]);
            
            // Update story helpful count
            await db.run(`
                UPDATE publisher_stories 
                SET helpful_count = (
                    SELECT COUNT(*) FROM story_votes 
                    WHERE story_id = ? AND vote_type = 'helpful'
                )
                WHERE id = ?
            `, [storyId, storyId]);
            
            return { success: true };
        } catch (error) {
            console.error('Error voting on story:', error);
            throw error;
        }
    }

    // Add comment to story
    async addComment(storyId, commentData) {
        try {
            const { commenter_name, commenter_email, comment } = commentData;
            
            const result = await db.run(`
                INSERT INTO story_comments (story_id, commenter_name, commenter_email, comment)
                VALUES (?, ?, ?, ?)
            `, [storyId, commenter_name, commenter_email, comment]);
            
            return { success: true, commentId: result.lastID };
        } catch (error) {
            console.error('Error adding comment:', error);
            throw error;
        }
    }

    // Get publishing tips by category
    async getPublishingTips(category = null) {
        try {
            let query = `
                SELECT pt.*, ps.title as source_story_title 
                FROM publishing_tips pt
                LEFT JOIN publisher_stories ps ON pt.source_story_id = ps.id
                WHERE 1=1
            `;
            const params = [];
            
            if (category) {
                query += ' AND pt.category = ?';
                params.push(category);
            }
            
            query += ' ORDER BY pt.helpful_count DESC, pt.created_at DESC';
            
            const tips = await db.all(query, params);
            return tips;
        } catch (error) {
            console.error('Error getting publishing tips:', error);
            return [];
        }
    }

    // Add publisher to marketplace waitlist
    async joinMarketplaceWaitlist(publisherData) {
        try {
            const { publisher_email, publisher_name, books_published } = publisherData;
            
            // Generate unique referral code
            const referralCode = this.generateReferralCode(publisher_name);
            
            const result = await db.run(`
                INSERT OR REPLACE INTO marketplace_waitlist 
                (publisher_email, publisher_name, books_published, referral_code)
                VALUES (?, ?, ?, ?)
            `, [publisher_email, publisher_name, books_published, referralCode]);
            
            return { success: true, referralCode };
        } catch (error) {
            console.error('Error joining marketplace waitlist:', error);
            throw error;
        }
    }

    // Get marketplace statistics
    async getMarketplaceStats() {
        try {
            const stats = await db.get(`
                SELECT 
                    COUNT(*) as waitlist_count,
                    COUNT(CASE WHEN status = 'claimed' THEN 1 END) as claimed_stores,
                    COUNT(CASE WHEN status = 'founding_member' THEN 1 END) as founding_members,
                    SUM(books_published) as total_books
                FROM marketplace_waitlist
            `);
            
            // Get current milestone progress
            const milestone = await db.get(`
                SELECT * FROM marketplace_milestones 
                WHERE milestone_type = 'book_count' 
                ORDER BY created_at DESC LIMIT 1
            `);
            
            return {
                ...stats,
                milestone: milestone || { target_value: 10000, current_value: 0, percentage: 0 }
            };
        } catch (error) {
            console.error('Error getting marketplace stats:', error);
            return {
                waitlist_count: 0,
                claimed_stores: 0,
                founding_members: 0,
                total_books: 0,
                milestone: { target_value: 10000, current_value: 0, percentage: 0 }
            };
        }
    }

    // Get featured success stories
    async getFeaturedSuccessStories(limit = 5) {
        try {
            const stories = await db.all(`
                SELECT * FROM success_stories 
                WHERE featured = 1 
                ORDER BY featured_order ASC, created_at DESC 
                LIMIT ?
            `, [limit]);
            
            return stories;
        } catch (error) {
            console.error('Error getting success stories:', error);
            return [];
        }
    }

    // Add collaboration request
    async addCollaborationRequest(requestData) {
        try {
            const { published_book_id, request_type, title, description, created_by_email } = requestData;
            
            const result = await db.run(`
                INSERT INTO collaboration_requests 
                (published_book_id, request_type, title, description, created_by_email)
                VALUES (?, ?, ?, ?, ?)
            `, [published_book_id, request_type, title, description, created_by_email]);
            
            return { success: true, requestId: result.lastID };
        } catch (error) {
            console.error('Error adding collaboration request:', error);
            throw error;
        }
    }

    // Get network visualization data
    async getNetworkVisualizationData() {
        try {
            // Get publishers with their book counts
            const publishers = await db.all(`
                SELECT 
                    mw.publisher_email,
                    mw.publisher_name,
                    mw.books_published,
                    mw.status,
                    COUNT(pb.id) as actual_books
                FROM marketplace_waitlist mw
                LEFT JOIN published_books pb ON pb.teneo_user_id = mw.publisher_email
                GROUP BY mw.publisher_email
            `);
            
            // Get connections between publishers
            const connections = await db.all(`
                SELECT 
                    publisher_a_email,
                    publisher_b_email,
                    connection_type,
                    connection_strength
                FROM publisher_connections
            `);
            
            return { publishers, connections };
        } catch (error) {
            console.error('Error getting network data:', error);
            return { publishers: [], connections: [] };
        }
    }

    // Generate referral code
    generateReferralCode(name) {
        const cleanName = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
        const namePrefix = cleanName.substring(0, 4);
        const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `${namePrefix}${randomSuffix}`;
    }

    // Process referral and reward
    async processReferral(referralCode, newPublisherEmail) {
        try {
            // Find referrer
            const referrer = await db.get(`
                SELECT * FROM marketplace_waitlist WHERE referral_code = ?
            `, [referralCode]);
            
            if (!referrer) {
                return { success: false, error: 'Invalid referral code' };
            }
            
            // Add referral record
            await db.run(`
                INSERT INTO publisher_referrals 
                (referrer_email, referred_email, referral_code, status)
                VALUES (?, ?, ?, 'pending')
            `, [referrer.publisher_email, newPublisherEmail, referralCode]);
            
            // Add connection
            await db.run(`
                INSERT OR IGNORE INTO publisher_connections 
                (publisher_a_email, publisher_b_email, connection_type)
                VALUES (?, ?, 'referral')
            `, [referrer.publisher_email, newPublisherEmail]);
            
            return { success: true, referrerName: referrer.publisher_name };
        } catch (error) {
            console.error('Error processing referral:', error);
            throw error;
        }
    }

    // Get comparison data for Amazon vs Teneo Marketplace
    getMarketplaceComparison() {
        return {
            amazon: {
                royalty: '70%',
                control: 'Limited',
                data_access: 'None',
                exclusivity: 'Required',
                payment_terms: '60 days',
                customer_data: 'Amazon owns',
                pricing_control: 'Limited',
                marketing_tools: 'Basic'
            },
            teneo: {
                royalty: '95%',
                control: 'Full',
                data_access: 'Complete',
                exclusivity: 'Never',
                payment_terms: '7 days',
                customer_data: 'You own',
                pricing_control: 'Complete',
                marketing_tools: 'AI-powered'
            }
        };
    }
}

module.exports = new PublisherStoryService();