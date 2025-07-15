// marketplace/backend/server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const bodyParser = require('body-parser');
const brandRoutes = require('./routes/brandRoutes');
const checkoutRoutes = require('./routes/checkout');
const catalogRoutes = require('./routes/catalogRoutes');

const app = express();

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/api/brands', brandRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/catalog', catalogRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'teneo-marketplace-api'
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
            message: error.message 
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
            message: error.message 
        });
    }
});

// Get specific brand catalog
app.get('/api/brands/:brandId/catalog', async (req, res) => {
    try {
        const { brandId } = req.params;
        const catalogPath = path.join(__dirname, '..', 'frontend', 'brands', brandId, 'catalog.json');
        
        const catalogContent = await fs.readFile(catalogPath, 'utf8');
        const catalog = JSON.parse(catalogContent);
        
        res.json({
            success: true,
            brand: brandId,
            catalog: catalog
        });
    } catch (error) {
        console.error(`Error fetching catalog for brand ${req.params.brandId}:`, error);
        res.status(404).json({ 
            success: false,
            error: 'Brand catalog not found',
            message: error.message 
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
            message: error.message 
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
    
    // Specific routes for admin and setup
    app.get('/setup', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'frontend', 'setup.html'));
    });
    
    app.get('/admin', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'frontend', 'admin.html'));
    });
}

// Static file serving - MUST BE LAST
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '..', 'frontend')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
    });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`✅ Teneo Marketplace API running on port ${PORT}`);
    console.log(`🌍 API available at http://localhost:${PORT}/api`);
});

module.exports = app;