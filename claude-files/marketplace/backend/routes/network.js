// Network API Routes for Teneo Marketplace Federation
// Enables stores to join and participate in the decentralized network

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// Store metadata
const STORE_INFO = {
    id: 'teneo-main',
    name: 'Teneo Books',
    tagline: 'Knowledge Beyond Boundaries™',
    url: process.env.STORE_URL || 'http://localhost:3001',
    api: process.env.API_URL || 'http://localhost:3001/api',
    specialties: ['AI', 'consciousness', 'paradigm-shifts', 'revolutionary-knowledge'],
    networkVersion: '1.0',
    verified: true,
    joined: '2024-01-01',
    owner: 'Teneo AI',
    contact: 'network@teneo.ai'
};

// GET /api/catalog - Expose store's catalog to the network
router.get('/catalog', async (req, res) => {
    try {
        const { brand = 'all', limit, offset = 0, storeId } = req.query;
        
        const catalogs = [];
        const brandsDir = path.join(__dirname, '../../frontend/brands');
        
        // Determine which brands to load based on storeId or brand param
        let brandsToLoad;
        if (storeId) {
            // Map storeId to brand
            const storeIdToBrand = {
                'teneo-main': 'teneo',
                'true-earth': 'true-earth',
                'wealth-wise': 'wealth-wise'
            };
            brandsToLoad = [storeIdToBrand[storeId] || 'default'];
        } else if (brand === 'all') {
            brandsToLoad = ['default', 'teneo', 'true-earth', 'wealth-wise'];
        } else {
            brandsToLoad = [brand];
        }
        
        for (const brandName of brandsToLoad) {
            try {
                const catalogPath = path.join(brandsDir, brandName, 'catalog.json');
                const catalogData = await fs.readFile(catalogPath, 'utf8');
                const catalog = JSON.parse(catalogData);
                
                // Determine store info based on brand
                const brandToStore = {
                    'teneo': { id: 'teneo-main', name: 'Teneo Books', url: 'http://localhost:3001/?brand=teneo' },
                    'true-earth': { id: 'true-earth', name: 'True Earth Publications', url: 'http://localhost:3001/?brand=true-earth' },
                    'wealth-wise': { id: 'wealth-wise', name: 'WealthWise', url: 'http://localhost:3001/?brand=wealth-wise' },
                    'default': { id: 'teneo-main', name: 'Teneo Books', url: 'http://localhost:3001' }
                };
                
                const storeInfo = brandToStore[brandName] || brandToStore['default'];
                
                // Add network metadata to each book
                const booksWithMetadata = catalog.books.map(book => ({
                    ...book,
                    storeId: storeInfo.id,
                    storeName: storeInfo.name,
                    storeUrl: storeInfo.url,
                    brand: brandName,
                    networkId: `${storeInfo.id}-${brandName}-${book.id}`,
                    available: true
                }));
                
                catalogs.push({
                    brand: brandName,
                    name: catalog.name,
                    description: catalog.description,
                    books: booksWithMetadata
                });
            } catch (error) {
                console.log(`Brand ${brandName} catalog not found`);
            }
        }
        
        // Flatten all books
        const allBooks = catalogs.flatMap(c => c.books);
        
        // Apply pagination if requested
        const paginatedBooks = limit 
            ? allBooks.slice(Number(offset), Number(offset) + Number(limit))
            : allBooks;
        
        res.json({
            success: true,
            store: STORE_INFO,
            totalBooks: allBooks.length,
            offset: Number(offset),
            limit: limit ? Number(limit) : allBooks.length,
            books: paginatedBooks,
            brands: catalogs.map(c => ({ brand: c.brand, name: c.name, count: c.books.length }))
        });
        
    } catch (error) {
        console.error('Catalog error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve catalog'
        });
    }
});

// GET /api/store/info - Return store metadata
router.get('/store/info', (req, res) => {
    res.json({
        success: true,
        store: {
            ...STORE_INFO,
            status: 'active',
            lastUpdated: new Date().toISOString(),
            features: [
                'digital-delivery',
                'shopping-cart',
                'multi-brand',
                'ai-powered',
                'network-enabled'
            ],
            stats: {
                totalBooks: 24, // Update dynamically in production
                brands: 4,
                networkConnections: 1,
                uptime: '99.9%'
            }
        }
    });
});

// GET /api/book/:id - Return detailed book info for network queries
router.get('/book/:networkId', async (req, res) => {
    try {
        const { networkId } = req.params;
        
        // Parse network ID format: storeId-brand-bookId
        const parts = networkId.split('-');
        if (parts.length < 3) {
            return res.status(400).json({
                success: false,
                error: 'Invalid network ID format'
            });
        }
        
        const brand = parts[parts.length - 2];
        const bookId = parts[parts.length - 1];
        
        // Load the specific brand catalog
        const catalogPath = path.join(__dirname, '../../frontend/brands', brand, 'catalog.json');
        const catalogData = await fs.readFile(catalogPath, 'utf8');
        const catalog = JSON.parse(catalogData);
        
        // Find the book
        const book = catalog.books.find(b => b.id === bookId);
        
        if (!book) {
            return res.status(404).json({
                success: false,
                error: 'Book not found'
            });
        }
        
        // Return detailed book info with network metadata
        res.json({
            success: true,
            book: {
                ...book,
                storeId: STORE_INFO.id,
                storeName: STORE_INFO.name,
                storeUrl: STORE_INFO.url,
                brand: brand,
                networkId: networkId,
                available: true,
                purchaseUrl: `${STORE_INFO.url}/?brand=${brand}#book-${bookId}`,
                lastUpdated: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('Book lookup error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve book details'
        });
    }
});

// POST /api/network/ping - Heartbeat to show store is active
router.post('/network/ping', (req, res) => {
    const { fromStore, timestamp } = req.body;
    
    console.log(`Network ping received from ${fromStore || 'unknown'} at ${timestamp || new Date().toISOString()}`);
    
    res.json({
        success: true,
        store: STORE_INFO.id,
        status: 'active',
        timestamp: new Date().toISOString(),
        message: 'Pong! Store is active and connected to the network.'
    });
});

// GET /api/network/search - Search within this store for network queries
router.get('/search', async (req, res) => {
    try {
        const { q, category, maxPrice, brand } = req.query;
        
        if (!q || q.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Search query is required'
            });
        }
        
        const searchTerm = q.toLowerCase();
        const results = [];
        
        // Search across all brand catalogs
        const brandsDir = path.join(__dirname, '../../frontend/brands');
        const brandsToSearch = brand ? [brand] : ['default', 'teneo', 'true-earth', 'wealth-wise'];
        
        for (const brandName of brandsToSearch) {
            try {
                const catalogPath = path.join(brandsDir, brandName, 'catalog.json');
                const catalogData = await fs.readFile(catalogPath, 'utf8');
                const catalog = JSON.parse(catalogData);
                
                // Search in books
                const matchingBooks = catalog.books.filter(book => {
                    // Text search
                    const textMatch = 
                        book.title.toLowerCase().includes(searchTerm) ||
                        book.author.toLowerCase().includes(searchTerm) ||
                        book.description.toLowerCase().includes(searchTerm) ||
                        (book.tags && book.tags.some(tag => tag.toLowerCase().includes(searchTerm)));
                    
                    // Category filter
                    const categoryMatch = !category || book.category === category;
                    
                    // Price filter
                    const priceMatch = !maxPrice || book.price <= Number(maxPrice);
                    
                    return textMatch && categoryMatch && priceMatch;
                });
                
                // Add network metadata to results
                const enrichedResults = matchingBooks.map(book => ({
                    ...book,
                    storeId: STORE_INFO.id,
                    storeName: STORE_INFO.name,
                    storeUrl: STORE_INFO.url,
                    brand: brandName,
                    networkId: `${STORE_INFO.id}-${brandName}-${book.id}`,
                    relevance: calculateRelevance(book, searchTerm)
                }));
                
                results.push(...enrichedResults);
            } catch (error) {
                console.log(`Error searching brand ${brandName}:`, error.message);
            }
        }
        
        // Sort by relevance
        results.sort((a, b) => b.relevance - a.relevance);
        
        res.json({
            success: true,
            query: q,
            store: STORE_INFO,
            totalResults: results.length,
            results: results
        });
        
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            error: 'Search failed'
        });
    }
});

// GET /api/network/stats - Store statistics for network dashboard
router.get('/stats', async (req, res) => {
    try {
        // Calculate real stats
        const brandsDir = path.join(__dirname, '../../frontend/brands');
        const brands = ['default', 'teneo', 'true-earth', 'wealth-wise'];
        let totalBooks = 0;
        let totalCollections = 0;
        const categories = new Set();
        
        for (const brandName of brands) {
            try {
                const catalogPath = path.join(brandsDir, brandName, 'catalog.json');
                const catalogData = await fs.readFile(catalogPath, 'utf8');
                const catalog = JSON.parse(catalogData);
                
                totalBooks += catalog.books.length;
                totalCollections += (catalog.collections || []).length;
                catalog.books.forEach(book => {
                    if (book.category) categories.add(book.category);
                });
            } catch (error) {
                console.log(`Brand ${brandName} stats not available`);
            }
        }
        
        res.json({
            success: true,
            store: STORE_INFO.id,
            stats: {
                totalBooks,
                totalBrands: brands.length,
                totalCollections,
                categories: Array.from(categories),
                networkStatus: 'active',
                lastUpdated: new Date().toISOString(),
                uptime: '99.9%',
                apiVersion: '1.0'
            }
        });
        
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve statistics'
        });
    }
});

// Helper function to calculate search relevance
function calculateRelevance(book, searchTerm) {
    let score = 0;
    const term = searchTerm.toLowerCase();
    
    // Title match (highest weight)
    if (book.title.toLowerCase().includes(term)) {
        score += 10;
        if (book.title.toLowerCase().startsWith(term)) {
            score += 5;
        }
    }
    
    // Author match
    if (book.author.toLowerCase().includes(term)) {
        score += 7;
    }
    
    // Description match
    if (book.description.toLowerCase().includes(term)) {
        score += 3;
    }
    
    // Tag match
    if (book.tags && book.tags.some(tag => tag.toLowerCase().includes(term))) {
        score += 5;
    }
    
    // Category match
    if (book.category && book.category.toLowerCase().includes(term)) {
        score += 4;
    }
    
    // Boost for exact matches
    if (book.title.toLowerCase() === term) {
        score += 20;
    }
    
    return score;
}

module.exports = router;