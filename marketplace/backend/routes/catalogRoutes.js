const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const { authenticateAdmin } = require('../middleware/auth');

// Auth decision: catalog write operations use session-based authenticateAdmin
// consistent with the rest of the admin surface (adminRoutes, brandRoutes, etc.)
const checkAuth = authenticateAdmin;

// Memory storage for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// GET /api/catalog/:brandId - Get catalog
router.get('/:brandId', async (req, res) => {
    try {
        const { brandId } = req.params;
        const catalogPath = path.join(__dirname, '../../frontend/brands', brandId, 'catalog.json');
        
        const catalogContent = await fs.readFile(catalogPath, 'utf8');
        const catalog = JSON.parse(catalogContent);
        
        res.json({
            success: true,
            catalog
        });
    } catch (error) {
        console.error('Error reading catalog:', error);
        res.status(404).json({
            success: false,
            error: 'Catalog not found'
        });
    }
});

// PUT /api/catalog/:brandId - Update catalog (requires auth)
router.put('/:brandId', checkAuth, async (req, res) => {
    try {
        const { brandId } = req.params;
        const catalogData = req.body;
        
        // Validate catalog structure
        if (!catalogData.books || !Array.isArray(catalogData.books)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid catalog format'
            });
        }
        
        const catalogPath = path.join(__dirname, '../../frontend/brands', brandId, 'catalog.json');
        
        // Create backup before saving
        try {
            const existingCatalog = await fs.readFile(catalogPath, 'utf8');
            const backupPath = path.join(__dirname, '../../frontend/brands', brandId, `catalog.backup.${Date.now()}.json`);
            await fs.writeFile(backupPath, existingCatalog);
            
            // Keep only last 5 backups
            const brandDir = path.join(__dirname, '../../frontend/brands', brandId);
            const files = await fs.readdir(brandDir);
            const backups = files.filter(f => f.startsWith('catalog.backup.')).sort();
            if (backups.length > 5) {
                for (let i = 0; i < backups.length - 5; i++) {
                    await fs.unlink(path.join(brandDir, backups[i]));
                }
            }
        } catch (backupError) {
            console.log('No existing catalog to backup');
        }
        
        // Save new catalog
        await fs.writeFile(catalogPath, JSON.stringify(catalogData, null, 2));
        
        res.json({
            success: true,
            message: 'Catalog updated successfully',
            booksCount: catalogData.books.length
        });
    } catch (error) {
        console.error('Error saving catalog:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save catalog'
        });
    }
});

// GET /api/catalog/:brandId/backup - Get latest backup
router.get('/:brandId/backup', checkAuth, async (req, res) => {
    try {
        const { brandId } = req.params;
        const brandDir = path.join(__dirname, '../../frontend/brands', brandId);
        
        const files = await fs.readdir(brandDir);
        const backups = files.filter(f => f.startsWith('catalog.backup.')).sort();
        
        if (backups.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No backups found'
            });
        }
        
        const latestBackup = backups[backups.length - 1];
        const backupContent = await fs.readFile(path.join(brandDir, latestBackup), 'utf8');
        const backupData = JSON.parse(backupContent);
        
        res.json({
            success: true,
            backup: backupData,
            timestamp: latestBackup.match(/catalog\.backup\.(\d+)\.json/)[1],
            availableBackups: backups.length
        });
    } catch (error) {
        console.error('Error reading backup:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to read backup'
        });
    }
});

// POST /api/catalog/:brandId/restore - Restore from backup
router.post('/:brandId/restore', checkAuth, async (req, res) => {
    try {
        const { brandId } = req.params;
        const { timestamp } = req.body;
        
        const brandDir = path.join(__dirname, '../../frontend/brands', brandId);
        const backupPath = path.join(brandDir, `catalog.backup.${timestamp}.json`);
        const catalogPath = path.join(brandDir, 'catalog.json');
        
        // Check if backup exists
        const backupContent = await fs.readFile(backupPath, 'utf8');
        
        // Save current as backup before restore
        const currentContent = await fs.readFile(catalogPath, 'utf8');
        const newBackupPath = path.join(brandDir, `catalog.backup.${Date.now()}.json`);
        await fs.writeFile(newBackupPath, currentContent);
        
        // Restore backup
        await fs.writeFile(catalogPath, backupContent);
        
        res.json({
            success: true,
            message: 'Catalog restored from backup'
        });
    } catch (error) {
        console.error('Error restoring backup:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to restore backup'
        });
    }
});

// POST /api/catalog/:brandId/import-csv - Import books from CSV
router.post('/:brandId/import-csv', checkAuth, upload.single('csv'), async (req, res) => {
    try {
        const { brandId } = req.params;
        
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No CSV file uploaded'
            });
        }
        
        const csvContent = req.file.buffer.toString('utf8');
        
        // Parse CSV
        const records = parse(csvContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });
        
        // Convert CSV records to book format
        const books = records.map(record => ({
            id: (record.title || '').toLowerCase().replace(/[^a-z0-9]/g, '-'),
            title: record.title || 'Untitled',
            author: record.author || 'Unknown',
            description: record.description || '',
            price: parseFloat(record.price) || 29.99,
            originalPrice: record.originalPrice ? parseFloat(record.originalPrice) : null,
            coverImage: record.coverImage || `https://via.placeholder.com/400x600?text=${encodeURIComponent(record.title || 'Book')}`,
            format: record.format ? record.format.split(',').map(f => f.trim()) : ['ebook'],
            badge: record.badge || '',
            rating: parseFloat(record.rating) || 4.5,
            pages: parseInt(record.pages) || 200,
            category: record.category || 'General',
            currency: 'USD'
        }));
        
        // Load existing catalog
        const catalogPath = path.join(__dirname, '../../frontend/brands', brandId, 'catalog.json');
        let catalog;
        
        try {
            const catalogContent = await fs.readFile(catalogPath, 'utf8');
            catalog = JSON.parse(catalogContent);
        } catch (error) {
            // Create new catalog if doesn't exist
            catalog = {
                brand: brandId,
                name: brandId,
                description: '',
                books: [],
                collections: []
            };
        }
        
        // Merge or replace books
        if (req.body.mode === 'replace') {
            catalog.books = books;
        } else {
            // Merge, avoiding duplicates by ID
            const existingIds = new Set(catalog.books.map(b => b.id));
            const newBooks = books.filter(b => !existingIds.has(b.id));
            catalog.books = [...catalog.books, ...newBooks];
        }
        
        // Generate collections if needed
        if (catalog.books.length >= 3 && catalog.collections.length === 0) {
            catalog.collections = [{
                id: 'complete-collection',
                name: 'Complete Collection',
                title: 'All Books Bundle',
                description: `Get all ${catalog.books.length} books at a discounted price`,
                books: catalog.books.map(b => b.id),
                price: Math.round(catalog.books.reduce((sum, b) => sum + b.price, 0) * 0.7),
                originalPrice: Math.round(catalog.books.reduce((sum, b) => sum + b.price, 0)),
                savings: 30,
                badge: 'Save 30%'
            }];
        }
        
        // Save updated catalog
        await fs.writeFile(catalogPath, JSON.stringify(catalog, null, 2));
        
        res.json({
            success: true,
            message: `Imported ${books.length} books`,
            totalBooks: catalog.books.length
        });
    } catch (error) {
        console.error('Error importing CSV:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to import CSV: ' + error.message
        });
    }
});

// POST /api/catalog/auth/check - Check authentication
router.post('/auth/check', checkAuth, (req, res) => {
    res.json({ success: true, authenticated: true });
});

module.exports = router;