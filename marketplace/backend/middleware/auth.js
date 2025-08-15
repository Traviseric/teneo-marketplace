// Secure authentication middleware for admin routes
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');

// Create rate limiter for login attempts
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: 'Too many login attempts from this IP, please try again after 15 minutes',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many login attempts',
            message: 'Please try again after 15 minutes',
            retryAfter: 900 // 15 minutes in seconds
        });
    }
});

// Admin credentials - in production, store hashed password in database
// Default password hash for 'admin123' - MUST BE CHANGED IN PRODUCTION
const DEFAULT_ADMIN_HASH = '$2b$10$8KqG0H5oGX4gRRrqDv7YxeT1Y0fGzFkiOEi7LvJO8QMo6nPBRqGOu';

// Get admin password hash from environment or use default (for initial setup only)
function getAdminPasswordHash() {
    return process.env.ADMIN_PASSWORD_HASH || DEFAULT_ADMIN_HASH;
}

// Middleware to check if user is authenticated
function authenticateAdmin(req, res, next) {
    // Check if session exists and is valid
    if (!req.session || !req.session.isAdmin) {
        return res.status(401).json({ 
            error: 'Unauthorized',
            message: 'Please login to access this resource'
        });
    }
    
    // Check if session has expired (24 hours)
    const sessionAge = Date.now() - req.session.loginTime;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    if (sessionAge > maxAge) {
        req.session.destroy();
        return res.status(401).json({ 
            error: 'Session expired',
            message: 'Please login again'
        });
    }
    
    // Update last activity time
    req.session.lastActivity = Date.now();
    
    // Log admin action for audit trail
    logAdminAction(req);
    
    next();
}

// Compare password with hash
async function verifyPassword(password, hash) {
    try {
        return await bcrypt.compare(password, hash);
    } catch (error) {
        console.error('Password verification error:', error);
        return false;
    }
}

// Generate password hash
async function hashPassword(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
}

// Log admin actions for audit trail
const auditService = require('../services/auditService');

async function logAdminAction(req) {
    await auditService.logDataAccess(req, req.path, req.method);
}

// Middleware to ensure HTTPS in production
function requireHTTPS(req, res, next) {
    if (process.env.NODE_ENV === 'production' && !req.secure && req.get('x-forwarded-proto') !== 'https') {
        return res.redirect('https://' + req.get('host') + req.url);
    }
    next();
}

module.exports = {
    authenticateAdmin,
    loginLimiter,
    verifyPassword,
    hashPassword,
    requireHTTPS,
    getAdminPasswordHash,
    logAdminAction
};