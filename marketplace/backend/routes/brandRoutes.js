// marketplace/backend/routes/brandRoutes.js
const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const { authenticateAdmin } = require('../middleware/auth');
const { publicApiLimit } = require('../middleware/rateLimits');

// Base directory for all brand assets — used for path traversal validation
const BRANDS_BASE = path.resolve(__dirname, '../../frontend/brands');

/**
 * Sanitize a brandId to prevent path traversal (CWE-22).
 * Returns the safe basename or null if invalid.
 */
function safeBrandId(brandId) {
    if (!brandId || typeof brandId !== 'string') return null;
    const safe = path.basename(brandId);
    if (!safe || safe === '.' || safe === '..') return null;
    // Ensure the resolved path stays within BRANDS_BASE
    const resolved = path.resolve(BRANDS_BASE, safe);
    if (!resolved.startsWith(BRANDS_BASE + path.sep) && resolved !== BRANDS_BASE) return null;
    return safe;
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const rawBrandId = req.params.brandId || req.body.brandId;
        const brandId = safeBrandId(rawBrandId);
        if (!brandId) {
            return cb(new Error('Invalid brand ID'));
        }
        const uploadPath = path.join(BRANDS_BASE, brandId, 'assets');

        try {
            await fs.mkdir(uploadPath, { recursive: true });
            cb(null, uploadPath);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|pdf|svg/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

// Get all brands
router.get('/', publicApiLimit, async (req, res) => {
    try {
        const brandDirs = await fs.readdir(BRANDS_BASE);
        const brands = [];

        for (const brandDir of brandDirs) {
            const brandPath = path.join(BRANDS_BASE, brandDir);
            const stat = await fs.stat(brandPath);

            if (stat.isDirectory()) {
                try {
                    const config = await loadBrandConfig(brandDir);
                    const catalog = await loadBrandCatalog(brandDir);

                    brands.push({
                        id: brandDir,
                        name: catalog.name || config.name || brandDir,
                        description: catalog.description || config.description || '',
                        theme: config.theme || {},
                        bookCount: catalog.books ? catalog.books.length : 0,
                        active: config.active !== false
                    });
                } catch (error) {
                    console.error(`Error loading brand ${brandDir}:`, error);
                }
            }
        }

        res.json({
            success: true,
            brands: brands,
            count: brands.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch brands',
            message: error.message
        });
    }
});

// Get specific brand details
router.get('/:brandId', publicApiLimit, async (req, res) => {
    try {
        const brandId = safeBrandId(req.params.brandId);
        if (!brandId) {
            return res.status(400).json({ success: false, error: 'Invalid brand ID' });
        }
        const config = await loadBrandConfig(brandId);
        const catalog = await loadBrandCatalog(brandId);

        res.json({
            success: true,
            brand: {
                id: brandId,
                config: config,
                catalog: catalog
            }
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            error: 'Brand not found',
            message: error.message
        });
    }
});

// Create new brand
router.post('/', authenticateAdmin, async (req, res) => {
    try {
        const { name, tagline, description, template } = req.body;
        const brandId = safeBrandId(req.body.brandId);

        if (!brandId || !name) {
            return res.status(400).json({
                success: false,
                error: 'Brand ID and name are required'
            });
        }

        const brandPath = path.join(BRANDS_BASE, brandId);

        // Check if brand already exists
        try {
            await fs.access(brandPath);
            return res.status(409).json({
                success: false,
                error: 'Brand already exists'
            });
        } catch {
            // Brand doesn't exist, continue
        }

        // Create brand directory structure
        await fs.mkdir(brandPath, { recursive: true });
        await fs.mkdir(path.join(brandPath, 'assets'), { recursive: true });
        await fs.mkdir(path.join(brandPath, 'css'), { recursive: true });

        // Create config.json
        const config = {
            name: name,
            tagline: tagline || '',
            description: description || '',
            theme: {
                primaryColor: '#6366F1',
                secondaryColor: '#4F46E5',
                accentColor: '#10B981',
                fontFamily: 'Inter, sans-serif'
            },
            logo: '📚',
            active: true,
            createdAt: new Date().toISOString()
        };

        await fs.writeFile(
            path.join(brandPath, 'config.json'),
            JSON.stringify(config, null, 2)
        );

        // Create catalog.json
        const catalog = {
            name: name,
            description: description || '',
            books: [],
            collections: [],
            featured: []
        };

        await fs.writeFile(
            path.join(brandPath, 'catalog.json'),
            JSON.stringify(catalog, null, 2)
        );

        // Copy template files if specified
        if (template && template !== 'blank') {
            await copyTemplate(template, brandId);
        }

        res.json({
            success: true,
            message: 'Brand created successfully',
            brand: {
                id: brandId,
                config: config,
                catalog: catalog
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to create brand',
            message: error.message
        });
    }
});

// Update brand config
router.put('/:brandId/config', authenticateAdmin, async (req, res) => {
    try {
        const brandId = safeBrandId(req.params.brandId);
        if (!brandId) {
            return res.status(400).json({ success: false, error: 'Invalid brand ID' });
        }
        const updates = req.body;

        const config = await loadBrandConfig(brandId);
        const updatedConfig = { ...config, ...updates };

        await fs.writeFile(
            path.join(BRANDS_BASE, brandId, 'config.json'),
            JSON.stringify(updatedConfig, null, 2)
        );

        res.json({
            success: true,
            message: 'Brand config updated',
            config: updatedConfig
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to update brand config',
            message: error.message
        });
    }
});

// Update brand catalog
router.put('/:brandId/catalog', authenticateAdmin, async (req, res) => {
    try {
        const brandId = safeBrandId(req.params.brandId);
        if (!brandId) {
            return res.status(400).json({ success: false, error: 'Invalid brand ID' });
        }
        const updates = req.body;

        const catalog = await loadBrandCatalog(brandId);
        const updatedCatalog = { ...catalog, ...updates };

        await fs.writeFile(
            path.join(BRANDS_BASE, brandId, 'catalog.json'),
            JSON.stringify(updatedCatalog, null, 2)
        );

        res.json({
            success: true,
            message: 'Brand catalog updated',
            catalog: updatedCatalog
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to update brand catalog',
            message: error.message
        });
    }
});

// Add book to brand catalog
router.post('/:brandId/books', authenticateAdmin, async (req, res) => {
    try {
        const brandId = safeBrandId(req.params.brandId);
        if (!brandId) {
            return res.status(400).json({ success: false, error: 'Invalid brand ID' });
        }
        const bookData = req.body;

        const catalog = await loadBrandCatalog(brandId);

        // Generate book ID if not provided
        if (!bookData.id) {
            bookData.id = `book-${Date.now()}`;
        }

        // Add timestamps
        bookData.createdAt = new Date().toISOString();
        bookData.updatedAt = bookData.createdAt;

        // Add to catalog
        catalog.books = catalog.books || [];
        catalog.books.push(bookData);

        await fs.writeFile(
            path.join(BRANDS_BASE, brandId, 'catalog.json'),
            JSON.stringify(catalog, null, 2)
        );

        res.json({
            success: true,
            message: 'Book added successfully',
            book: bookData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to add book',
            message: error.message
        });
    }
});

// Update book in brand catalog
router.put('/:brandId/books/:bookId', authenticateAdmin, async (req, res) => {
    try {
        const brandId = safeBrandId(req.params.brandId);
        if (!brandId) {
            return res.status(400).json({ success: false, error: 'Invalid brand ID' });
        }
        const { bookId } = req.params;
        const updates = req.body;

        const catalog = await loadBrandCatalog(brandId);
        const bookIndex = catalog.books.findIndex(book => book.id === bookId);

        if (bookIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Book not found'
            });
        }

        // Update book
        catalog.books[bookIndex] = {
            ...catalog.books[bookIndex],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        await fs.writeFile(
            path.join(BRANDS_BASE, brandId, 'catalog.json'),
            JSON.stringify(catalog, null, 2)
        );

        res.json({
            success: true,
            message: 'Book updated successfully',
            book: catalog.books[bookIndex]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to update book',
            message: error.message
        });
    }
});

// Delete book from brand catalog
router.delete('/:brandId/books/:bookId', authenticateAdmin, async (req, res) => {
    try {
        const brandId = safeBrandId(req.params.brandId);
        if (!brandId) {
            return res.status(400).json({ success: false, error: 'Invalid brand ID' });
        }
        const { bookId } = req.params;

        const catalog = await loadBrandCatalog(brandId);
        const bookIndex = catalog.books.findIndex(book => book.id === bookId);

        if (bookIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Book not found'
            });
        }

        // Remove book
        const deletedBook = catalog.books.splice(bookIndex, 1)[0];

        await fs.writeFile(
            path.join(BRANDS_BASE, brandId, 'catalog.json'),
            JSON.stringify(catalog, null, 2)
        );

        res.json({
            success: true,
            message: 'Book deleted successfully',
            book: deletedBook
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to delete book',
            message: error.message
        });
    }
});

// Upload brand asset (logo, book cover, etc.)
router.post('/:brandId/upload', authenticateAdmin, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        const brandId = safeBrandId(req.params.brandId);
        if (!brandId) {
            return res.status(400).json({ success: false, error: 'Invalid brand ID' });
        }

        const fileUrl = `/brands/${brandId}/assets/${req.file.filename}`;

        res.json({
            success: true,
            message: 'File uploaded successfully',
            file: {
                filename: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size,
                url: fileUrl
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to upload file',
            message: error.message
        });
    }
});

// Delete brand
router.delete('/:brandId', authenticateAdmin, async (req, res) => {
    try {
        const brandId = safeBrandId(req.params.brandId);
        if (!brandId) {
            return res.status(400).json({ success: false, error: 'Invalid brand ID' });
        }
        const brandPath = path.join(BRANDS_BASE, brandId);

        // Check if brand exists
        await fs.access(brandPath);

        // Remove brand directory
        await fs.rm(brandPath, { recursive: true, force: true });

        res.json({
            success: true,
            message: 'Brand deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to delete brand',
            message: error.message
        });
    }
});

// Helper functions
async function loadBrandConfig(brandId) {
    const safe = safeBrandId(brandId);
    if (!safe) throw new Error('Invalid brand ID');
    const configPath = path.join(BRANDS_BASE, safe, 'config.json');
    const configContent = await fs.readFile(configPath, 'utf8');
    return JSON.parse(configContent);
}

async function loadBrandCatalog(brandId) {
    const safe = safeBrandId(brandId);
    if (!safe) throw new Error('Invalid brand ID');
    const catalogPath = path.join(BRANDS_BASE, safe, 'catalog.json');
    const catalogContent = await fs.readFile(catalogPath, 'utf8');
    return JSON.parse(catalogContent);
}

async function copyTemplate(templateId, brandId) {
    const safeTemplate = safeBrandId(templateId);
    const safeBrand = safeBrandId(brandId);
    if (!safeTemplate || !safeBrand) {
        throw new Error('Invalid template or brand ID');
    }
    const templatePath = path.join(BRANDS_BASE, safeTemplate);
    const brandPath = path.join(BRANDS_BASE, safeBrand);

    try {
        // Copy CSS files
        const templateCss = path.join(templatePath, 'css', 'theme.css');
        const brandCss = path.join(brandPath, 'css', 'theme.css');

        try {
            await fs.copyFile(templateCss, brandCss);
        } catch (error) {
            console.log('No template CSS to copy');
        }

        // Load template catalog for sample books
        const templateCatalog = await loadBrandCatalog(safeTemplate);
        if (templateCatalog.books && templateCatalog.books.length > 0) {
            const brandCatalog = await loadBrandCatalog(safeBrand);
            brandCatalog.books = templateCatalog.books.slice(0, 3); // Copy first 3 books as samples

            await fs.writeFile(
                path.join(brandPath, 'catalog.json'),
                JSON.stringify(brandCatalog, null, 2)
            );
        }
    } catch (error) {
        console.error('Error copying template:', error);
    }
}

module.exports = router;
