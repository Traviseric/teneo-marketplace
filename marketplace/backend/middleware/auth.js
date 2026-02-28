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

// Get admin password hash from environment — no hardcoded fallback
function getAdminPasswordHash() {
    const hash = process.env.ADMIN_PASSWORD_HASH;
    if (!hash) {
        if (process.env.NODE_ENV === 'production') {
            console.error('FATAL: ADMIN_PASSWORD_HASH must be set in production environment');
            process.exit(1);
        }
        console.warn('WARNING: ADMIN_PASSWORD_HASH not set. Admin login will fail. Run: node scripts/generate-password-hash.js --generate');
        return null; // Login will always fail if hash not set
    }
    return hash;
}

// Middleware to check if user is authenticated
function authenticateAdmin(req, res, next) {
    // Fail fast if admin auth is not configured
    if (!process.env.ADMIN_PASSWORD_HASH) {
        return res.status(503).json({
            error: 'Admin authentication not configured',
            message: 'Set ADMIN_PASSWORD_HASH environment variable'
        });
    }

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