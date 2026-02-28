// marketplace/backend/server.js
require('dotenv').config();

// Environment variable validation
function validateEnvironment() {
    if (process.env.NODE_ENV === 'production') {
        const fatal = [];
        if (!process.env.ADMIN_PASSWORD_HASH) {
            fatal.push('ADMIN_PASSWORD_HASH must be set in production. Run: node scripts/generate-password-hash.js --generate');
        }
        if (!process.env.SESSION_SECRET) {
            fatal.push('SESSION_SECRET must be set in production (min 32 chars)');
        } else if (process.env.SESSION_SECRET.length < 32) {
            fatal.push('SESSION_SECRET must be at least 32 characters in production');
        }
        if (fatal.length > 0) {
            console.error('FATAL: Missing required environment configuration:');
            fatal.forEach(msg => console.error(' -', msg));
            process.exit(1);
        }
    } else {
        if (!process.env.ADMIN_PASSWORD_HASH) {
            console.warn('⚠️  ADMIN_PASSWORD_HASH not set. Admin login will fail until configured.');
        }
        if (!process.env.SESSION_SECRET) {
            const crypto = require('crypto');
            process.env.SESSION_SECRET = crypto.randomBytes(64).toString('hex');
            console.warn('⚠️  Using auto-generated session secret (dev only). Set SESSION_SECRET in production!');
        }
    }
    
    // Warn about optional but important variables
    const importantVars = [
        'STRIPE_SECRET_KEY',
        'STRIPE_PUBLISHABLE_KEY',
        'EMAIL_USER'
    ];

    if (!process.env.OPENAI_API_KEY) {
        console.warn('⚠️  OPENAI_API_KEY not set — AI Discovery will use keyword search fallback');
    }
    
    const missingImportant = importantVars.filter(varName => !process.env[varName]);
    if (missingImportant.length > 0) {
        console.warn('⚠️  WARNING: Missing optional environment variables:');
        missingImportant.forEach(varName => {
            console.warn(`  - ${varName}`);
        });
        console.warn('Some features may not work properly.\n');
    }
}

validateEnvironment();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const bodyParser = require('body-parser');
const session = require('express-session');
const csurf = require('csurf');
const crypto = require('crypto');
const brandRoutes = require('./routes/brandRoutes');
const checkoutRoutes = process.env.NODE_ENV === 'production'
  ? require('./routes/checkoutProduction')
  : require('./routes/checkout');
const { router: checkoutMixedRoutes } = require('./routes/checkoutMixed');
const cryptoCheckoutRoutes = require('./routes/cryptoCheckout');
const catalogRoutes = require('./routes/catalogRoutes');
const downloadRoutes = require('./routes/downloadRoutes');
const luluAdminRoutes = require('./routes/luluAdmin');
const adminRoutes = require('./routes/adminRoutes');
const networkRoutes = require('./routes/networkRoutes');
const configRoutes = require('./routes/configRoutes');
const publishedBooksRoutes = require('./routes/publishedBooks');
const publisherProfileRoutes = require('./routes/publisherProfiles');
const bookAnalyticsRoutes = require('./routes/bookAnalytics');
const digestRoutes = require('./routes/digestRoutes');
const manualEnhancementRoutes = require('./routes/manualEnhancement');
const webhookRoutes = require('./routes/webhooks');
const aiDiscoveryRoutes = require('./routes/aiDiscovery');
const censorshipTrackerRoutes = require('./routes/censorshipTracker');
const nftRoutes = require('./routes/nft');
const authRoutes = require('./routes/auth');
const couponsRoutes = require('./routes/couponsRoutes');
const emailTrackingRoutes = require('./routes/emailTracking');

// Funnel builder routes
const funnelRoutes = require('../../funnel-module/backend/routes/funnels');

// Course platform routes
const courseRoutes = require('./routes/courseRoutes');

const { safeMessage } = require('./utils/validate');

const app = express();

// Security headers (CWE-693)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://api.stripe.com"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

// Import auth middleware
const { requireHTTPS } = require('./middleware/auth');

// Force HTTPS in production
app.use(requireHTTPS);

// Session configuration
// SESSION_SECRET is guaranteed to be set by validateEnvironment() above:
//   - production: exits with FATAL error if missing or < 32 chars (CWE-330)
//   - development: auto-generated random secret if not provided
const sessionSecret = process.env.SESSION_SECRET;
app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        httpOnly: true, // Prevent XSS attacks
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'strict' // CSRF protection
    },
    name: 'teneo.sid' // Custom session name
}));

// Middleware - Updated CORS for Teneo domains
app.use(cors({
    origin: [
        'https://teneo.io',
        'https://www.teneo.io', 
        'https://staging.teneo.io',
        'http://localhost:3333',  // Teneo development
        process.env.FRONTEND_URL || 'http://localhost:3000'  // Keep backward compatibility
    ],
    credentials: true, // Allow cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// CSRF protection for all POST/PUT/DELETE routes except specific endpoints
const csrfProtection = csurf({ cookie: false });
const csrfExcludePaths = [
    '/api/checkout/webhook',
    '/api/checkout/mixed',
    '/api/lulu/webhook',
    '/api/crypto/btcpay/webhook', // BTCPay payment webhook
    '/webhooks' // Orchestrator webhooks
]; // Webhook endpoints need to be excluded

app.use((req, res, next) => {
    // Skip CSRF entirely in test environment
    if (process.env.NODE_ENV === 'test') {
        return next();
    }
    // Skip CSRF for webhook endpoints
    if (csrfExcludePaths.some(path => req.path.startsWith(path))) {
        return next();
    }
    // Skip CSRF for GET requests and public API endpoints
    if (req.method === 'GET' || req.path.startsWith('/api/health') || req.path.startsWith('/api/network/status')) {
        return next();
    }
    // Apply CSRF protection to all other routes
    csrfProtection(req, res, next);
});

// Endpoint to get CSRF token
app.get('/api/csrf-token', (req, res) => {
    res.json({ csrfToken: req.csrfToken ? req.csrfToken() : null });
});
app.use('/api/brands', brandRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/checkout/mixed', checkoutMixedRoutes);
app.use('/api/crypto', cryptoCheckoutRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/download', downloadRoutes);
app.use('/api/lulu', luluAdminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/network', networkRoutes);
app.use('/api/config', configRoutes);
app.use('/api/published', publishedBooksRoutes);
app.use('/api/publishers', publisherProfileRoutes);
app.use('/api/books', bookAnalyticsRoutes);
app.use('/api/digest', digestRoutes);
app.use('/api/manual-enhancement', manualEnhancementRoutes);
app.use('/webhooks', webhookRoutes);
app.use('/api/discovery', aiDiscoveryRoutes);
app.use('/api/censorship', censorshipTrackerRoutes);
app.use('/api/nft', nftRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/coupons', couponsRoutes);
app.use('/api/email', emailTrackingRoutes);

// Funnel builder API
app.use('/api/funnels', funnelRoutes);

// Course platform API
app.use('/api/courses', courseRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'teneo-marketplace-api'
    });
});

// Stripe-specific health endpoint (also accessible via /api/checkout/health/stripe)
app.get('/api/health/stripe', async (req, res) => {
    const { checkStripeHealth } = require('./services/stripeHealthService');
    const health = await checkStripeHealth();
    const statusCode = health.healthy ? 200 : 503;
    res.status(statusCode).json({
        healthy: health.healthy,
        lastChecked: health.lastChecked ? new Date(health.lastChecked).toISOString() : null,
        ...(health.error && { error: health.error }),
    });
});

// Note: /api/brands is handled by brandRoutes router

// Get books (optionally filtered by brand)
app.get('/api/books', async (req, res) => {
    try {
        const { brand, limit, offset } = req.query;
        const brandsPath = path.join(__dirname, '..', 'frontend', 'brands');
        let allBooks = [];

        if (brand && brand !== 'all') {
            // Get books from specific brand
            const catalogPath = path.join(brandsPath, brand, 'catalog.json');
            try {
                const catalogContent = await fs.readFile(catalogPath, 'utf8');
                const catalog = JSON.parse(catalogContent);
                allBooks = catalog.books || [];
            } catch (error) {
                console.error(`Error loading catalog for brand ${brand}:`, error);
            }
        } else {
            // Get books from all brands
            const brandDirs = await fs.readdir(brandsPath);
            
            for (const brandDir of brandDirs) {
                const brandPath = path.join(brandsPath, brandDir);
                const stat = await fs.stat(brandPath);
                
                if (stat.isDirectory()) {
                    const catalogPath = path.join(brandPath, 'catalog.json');
                    try {
                        const catalogContent = await fs.readFile(catalogPath, 'utf8');
                        const catalog = JSON.parse(catalogContent);
                        if (catalog.books) {
                            // Add brand info to each book
                            const brandedBooks = catalog.books.map(book => ({
                                ...book,
                                brand: brandDir,
                                brandName: catalog.name || brandDir
                            }));
                            allBooks = allBooks.concat(brandedBooks);
                        }
                    } catch (error) {
                        // Skip brands with invalid catalogs
                    }
                }
            }
        }

        // Apply pagination if requested
        let result = allBooks;
        if (limit) {
            const start = parseInt(offset) || 0;
            const end = start + parseInt(limit);
            result = allBooks.slice(start, end);
        }

        res.json({
            success: true,
            data: result,
            total: allBooks.length,
            limit: limit ? parseInt(limit) : null,
            offset: offset ? parseInt(offset) : 0
        });
    } catch (error) {
        console.error('Error fetching books:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch books',
            message: safeMessage(error)
        });
    }
});

// Search across all brands
app.get('/api/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({ 
                success: false,
                error: 'Search query is required' 
            });
        }

        const searchTerm = q.toLowerCase();
        const brandsPath = path.join(__dirname, '..', 'frontend', 'brands');
        const brandDirs = await fs.readdir(brandsPath);
        let searchResults = [];

        for (const brandDir of brandDirs) {
            const brandPath = path.join(brandsPath, brandDir);
            const stat = await fs.stat(brandPath);
            
            if (stat.isDirectory()) {
                const catalogPath = path.join(brandPath, 'catalog.json');
                try {
                    const catalogContent = await fs.readFile(catalogPath, 'utf8');
                    const catalog = JSON.parse(catalogContent);
                    
                    if (catalog.books) {
                        const matches = catalog.books.filter(book => {
                            return (
                                book.title?.toLowerCase().includes(searchTerm) ||
                                book.author?.toLowerCase().includes(searchTerm) ||
                                book.description?.toLowerCase().includes(searchTerm) ||
                                book.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
                            );
                        });

                        if (matches.length > 0) {
                            const brandedMatches = matches.map(book => ({
                                ...book,
                                brand: brandDir,
                                brandName: catalog.name || brandDir
                            }));
                            searchResults = searchResults.concat(brandedMatches);
                        }
                    }
                } catch (error) {
                    // Skip brands with invalid catalogs
                }
            }
        }

        res.json({
            success: true,
            query: q,
            results: searchResults,
            count: searchResults.length
        });
    } catch (error) {
        console.error('Error searching books:', error);
        res.status(500).json({ 
            success: false,
            error: 'Search failed',
            message: safeMessage(error)
        });
    }
});

// Get specific brand catalog
app.get('/api/brands/:brandId/catalog', async (req, res) => {
    try {
        // Sanitize brandId to prevent path traversal (CWE-22)
        const brandsBase = path.resolve(__dirname, '..', 'frontend', 'brands');
        const safe = path.basename(req.params.brandId || '');
        if (!safe || safe === '.' || safe === '..') {
            return res.status(400).json({ success: false, error: 'Invalid brand ID' });
        }
        const resolved = path.resolve(brandsBase, safe);
        if (!resolved.startsWith(brandsBase + path.sep) && resolved !== brandsBase) {
            return res.status(400).json({ success: false, error: 'Invalid brand ID' });
        }
        const catalogPath = path.join(brandsBase, safe, 'catalog.json');

        const catalogContent = await fs.readFile(catalogPath, 'utf8');
        const catalog = JSON.parse(catalogContent);

        res.json({
            success: true,
            brand: safe,
            catalog: catalog
        });
    } catch (error) {
        console.error(`Error fetching catalog for brand ${req.params.brandId}:`, error);
        res.status(404).json({
            success: false,
            error: 'Brand catalog not found',
            message: safeMessage(error)
        });
    }
});

// Network API endpoints
app.get('/api/network/search', async (req, res) => {
    try {
        const { q } = req.query;
        // For now, return results from local search
        // In future, this will aggregate from network stores
        const localResults = await searchBooks(q);
        
        res.json({
            success: true,
            query: q,
            results: localResults,
            stores: [{
                id: 'teneo-main',
                name: 'Teneo Marketplace',
                resultCount: localResults.length
            }]
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: 'Network search failed',
            message: safeMessage(error)
        });
    }
});

// Helper function for searching books
async function searchBooks(query) {
    if (!query) return [];
    
    const searchTerm = query.toLowerCase();
    const brandsPath = path.join(__dirname, '..', 'frontend', 'brands');
    const brandDirs = await fs.readdir(brandsPath);
    let results = [];

    for (const brandDir of brandDirs) {
        const catalogPath = path.join(brandsPath, brandDir, 'catalog.json');
        try {
            const catalogContent = await fs.readFile(catalogPath, 'utf8');
            const catalog = JSON.parse(catalogContent);
            
            if (catalog.books) {
                const matches = catalog.books.filter(book => {
                    return (
                        book.title?.toLowerCase().includes(searchTerm) ||
                        book.author?.toLowerCase().includes(searchTerm) ||
                        book.description?.toLowerCase().includes(searchTerm)
                    );
                });
                results = results.concat(matches.map(book => ({
                    ...book,
                    brand: brandDir
                })));
            }
        } catch (error) {
            // Skip invalid catalogs
        }
    }
    
    return results;
}

// Error handling for undefined routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ 
        error: 'API endpoint not found',
        path: req.originalUrl
    });
});

// Serve static files in development
if (process.env.NODE_ENV !== 'production') {
    // Serve frontend files
    app.use(express.static(path.join(__dirname, '..', 'frontend')));

    // Serve funnel builder module
    app.use('/funnel-builder', express.static(path.join(__dirname, '..', '..', 'funnel-module', 'frontend')));

    // Serve course module
    app.use('/courses', express.static(path.join(__dirname, '..', '..', 'course-module', 'frontend')));

    // Specific routes for admin and setup
    app.get('/setup', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'frontend', 'setup.html'));
    });

    app.get('/admin', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'frontend', 'admin.html'));
    });

    app.get('/published', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'frontend', 'published.html'));
    });

    app.get('/published/profile/:userId', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'frontend', 'publisher-profile.html'));
    });

    app.get('/rewards', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'frontend', 'rewards.html'));
    });
}

// Static file serving - MUST BE LAST
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '..', 'frontend')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
    });
}

// Only start the server when this file is run directly (not when imported by tests)
if (require.main === module) {
    // Initialize database on startup
    const initDatabase = async () => {
        try {
            await require('./database/init');
            console.log('📊 Database initialized');
        } catch (error) {
            console.error('Failed to initialize database:', error);
        }
    };

    // Initialize cron jobs
    const CronJobService = require('./services/cronJobs');
    const cronService = new CronJobService();

    const PORT = process.env.PORT || 3001;
    app.listen(PORT, async () => {
        await initDatabase();
        cronService.start();
        console.log(`✅ Teneo Marketplace API running on port ${PORT}`);
        console.log(`🌍 API available at http://localhost:${PORT}/api`);
        console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`📈 Published books dashboard: http://localhost:${PORT}/published`);
    });
}

module.exports = app;