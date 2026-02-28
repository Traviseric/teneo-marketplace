/**
 * Shared rate limiters for public API endpoints.
 * express-rate-limit is already a project dependency (added in task 001).
 */
const rateLimit = require('express-rate-limit');

// For AI-powered endpoints that trigger OpenAI API calls
const aiRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            error: 'Too many requests. AI search is limited to 20 requests per minute.',
            retryAfter: 60
        });
    }
});

// For general public API endpoints (catalog browsing, brand listing, NFT, censorship)
const publicApiLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            error: 'Too many requests. Please try again later.',
            retryAfter: 900
        });
    }
});

module.exports = { aiRateLimit, publicApiLimit };
