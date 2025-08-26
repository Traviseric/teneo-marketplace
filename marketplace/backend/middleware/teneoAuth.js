const axios = require('axios');
const db = require('../database/database');

const TENEO_API_BASE = process.env.TENEO_API_URL || 'https://api.teneo.io';

class TeneoAuthMiddleware {
    static async validateTeneoToken(req, res, next) {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({
                    success: false,
                    error: 'Missing or invalid authorization header'
                });
            }

            const token = authHeader.substring(7);
            
            const userInfo = await TeneoAuthMiddleware.validateTokenWithTeneo(token);
            if (!userInfo) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid or expired Teneo token'
                });
            }

            req.teneoUser = userInfo;
            
            await TeneoAuthMiddleware.updateStoredToken(userInfo.id, token);
            
            next();
        } catch (error) {
            console.error('Teneo auth validation error:', error);
            res.status(500).json({
                success: false,
                error: 'Authentication validation failed'
            });
        }
    }

    static async validateTokenWithTeneo(token) {
        try {
            const response = await axios.get(`${TENEO_API_BASE}/user/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            if (response.status === 200 && response.data) {
                return {
                    id: response.data.id || response.data.user_id,
                    email: response.data.email,
                    username: response.data.username,
                    name: response.data.name || response.data.display_name,
                    verified: response.data.verified || false
                };
            }
            return null;
        } catch (error) {
            if (error.response?.status === 401) {
                console.log('Invalid Teneo token provided');
                return null;
            }
            console.error('Error validating Teneo token:', error.message);
            throw error;
        }
    }

    static async validateUserOwnsBook(teneoUserId, teneoBookId) {
        try {
            const storedToken = await TeneoAuthMiddleware.getStoredToken(teneoUserId);
            if (!storedToken) {
                throw new Error('No stored token for user');
            }

            const response = await axios.get(`${TENEO_API_BASE}/user/books/${teneoBookId}`, {
                headers: {
                    'Authorization': `Bearer ${storedToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            if (response.status === 200 && response.data) {
                return {
                    valid: true,
                    book: {
                        id: response.data.id,
                        title: response.data.title,
                        author: response.data.author,
                        created_at: response.data.created_at,
                        status: response.data.status
                    }
                };
            }
            
            return { valid: false };
        } catch (error) {
            if (error.response?.status === 404) {
                return { valid: false, error: 'Book not found or not owned by user' };
            }
            if (error.response?.status === 401) {
                return { valid: false, error: 'Token expired or invalid' };
            }
            console.error('Error validating book ownership:', error.message);
            throw error;
        }
    }

    static async updateStoredToken(userId, token) {
        const query = `
            INSERT OR REPLACE INTO teneo_auth_tokens (user_id, access_token, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
        `;
        
        try {
            await db.run(query, [userId, token]);
        } catch (error) {
            console.error('Error storing Teneo token:', error);
        }
    }

    static async getStoredToken(userId) {
        const query = `
            SELECT access_token 
            FROM teneo_auth_tokens 
            WHERE user_id = ? 
            ORDER BY updated_at DESC 
            LIMIT 1
        `;
        
        try {
            const result = await db.get(query, [userId]);
            return result ? result.access_token : null;
        } catch (error) {
            console.error('Error retrieving stored token:', error);
            return null;
        }
    }

    static async requireTeneoAuth(req, res, next) {
        await TeneoAuthMiddleware.validateTeneoToken(req, res, next);
    }

    static async requireVerifiedUser(req, res, next) {
        await TeneoAuthMiddleware.validateTeneoToken(req, res, (error) => {
            if (error) return next(error);
            
            if (!req.teneoUser?.verified) {
                return res.status(403).json({
                    success: false,
                    error: 'Verified Teneo account required'
                });
            }
            
            next();
        });
    }
}

module.exports = TeneoAuthMiddleware;