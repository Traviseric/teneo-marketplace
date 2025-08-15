const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const { authenticateAdmin, loginLimiter, verifyPassword, getAdminPasswordHash } = require('../middleware/auth');
const OrderService = require('../services/orderService');
const db = require('../database/database');
const auditService = require('../services/auditService');

// Initialize services
const orderService = new OrderService();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const brand = 'teneo'; // Default brand
        let dir;
        
        if (file.fieldname === 'cover') {
            dir = path.join(__dirname, '../../frontend/brands', brand, 'assets/covers');
        } else if (file.fieldname === 'pdf') {
            dir = path.join(__dirname, '../../frontend/brands', brand, 'pdfs');
        }
        
        // Ensure directory exists
        await fs.mkdir(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        cb(null, name + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({ 
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'cover') {
            if (!file.mimetype.startsWith('image/')) {
                return cb(new Error('Only image files are allowed for covers'));
            }
        } else if (file.fieldname === 'pdf') {
            if (file.mimetype !== 'application/pdf') {
                return cb(new Error('Only PDF files are allowed'));
            }
        }
        cb(null, true);
    }
});

// Admin login with rate limiting and secure password verification
router.post('/login', loginLimiter, async (req, res) => {
    const { password } = req.body;
    
    if (!password) {
        return res.status(400).json({ 
            success: false, 
            message: 'Password is required' 
        });
    }
    
    try {
        // Get hashed password from environment or default
        const adminPasswordHash = getAdminPasswordHash();
        
        // Verify password against hash
        const isValid = await verifyPassword(password, adminPasswordHash);
        
        if (isValid) {
            // Create secure session
            req.session.isAdmin = true;
            req.session.loginTime = Date.now();
            req.session.lastActivity = Date.now();
            
            // Log successful login
            await auditService.logAdminLogin(req, true);
            
            res.json({ 
                success: true, 
                message: 'Login successful',
                sessionId: req.sessionID
            });
        } else {
            // Log failed login attempt
            await auditService.logAdminLogin(req, false);
            
            res.status(401).json({ 
                success: false, 
                message: 'Invalid password' 
            });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Login failed' 
        });
    }
});

// Admin logout
router.post('/logout', async (req, res) => {
    if (req.session) {
        // Log logout action
        await auditService.logAdminLogout(req);
        
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'Logout failed' 
                });
            }
            res.json({ 
                success: true, 
                message: 'Logged out successfully' 
            });
        });
    } else {
        res.json({ 
            success: true, 
            message: 'Already logged out' 
        });
    }
});

// Check authentication status
router.get('/auth-status', (req, res) => {
    const isAuthenticated = req.session && req.session.isAdmin;
    res.json({ 
        authenticated: isAuthenticated,
        sessionId: isAuthenticated ? req.sessionID : null
    });
});

// Get dashboard data
router.get('/dashboard', authenticateAdmin, async (req, res) => {
    try {
        // Get statistics
        const totalRevenue = await getTotalRevenue();
        const totalOrders = await getTotalOrders();
        const activeBooks = await getActiveBooks();
        const conversionRate = await getConversionRate();
        const recentOrders = await getRecentOrders();
        
        res.json({
            totalRevenue,
            totalOrders,
            activeBooks,
            conversionRate,
            recentOrders
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Failed to load dashboard data' });
    }
});

// Get all orders
router.get('/orders', authenticateAdmin, async (req, res) => {
    try {
        const orders = await new Promise((resolve, reject) => {
            db.all(
                `SELECT * FROM orders 
                ORDER BY created_at DESC 
                LIMIT 100`,
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
        
        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// Process refund
router.post('/orders/:orderId/refund', authenticateAdmin, async (req, res) => {
    try {
        const { orderId } = req.params;
        const { reason } = req.body;
        
        // Get order details
        const order = await orderService.getOrder(orderId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        // Process refund through Stripe
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        
        if (order.stripe_payment_intent_id) {
            const refund = await stripe.refunds.create({
                payment_intent: order.stripe_payment_intent_id,
                reason: reason || 'requested_by_customer'
            });
            
            // Update order status
            await orderService.updateOrderStatus(orderId, {
                payment_status: 'refunded',
                refund_id: refund.id,
                refund_amount: refund.amount / 100,
                refund_reason: reason
            });
            
            // Log financial action
            await auditService.logFinancialAction(req, 'REFUND', refund.amount / 100, {
                orderId,
                refundId: refund.id,
                reason: reason || 'requested_by_customer'
            });
            
            res.json({ 
                success: true, 
                refundId: refund.id,
                amount: refund.amount / 100
            });
        } else {
            res.status(400).json({ error: 'No payment intent found' });
        }
    } catch (error) {
        console.error('Refund error:', error);
        res.status(500).json({ error: 'Failed to process refund' });
    }
});

// Get settings
router.get('/settings', authenticateAdmin, async (req, res) => {
    try {
        const settingsPath = path.join(__dirname, '../../frontend/brands/teneo/settings.json');
        
        // Default settings
        let settings = {
            storeName: process.env.MARKETPLACE_NAME || 'Book Marketplace',
            storeTagline: process.env.MARKETPLACE_TAGLINE || 'Your Digital Bookstore',
            storeDescription: process.env.MARKETPLACE_DESCRIPTION || 'A decentralized marketplace for digital and print books',
            primaryColor: '#7C3AED',
            secondaryColor: '#10B981',
            accentColor: '#FEA644',
            stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
            stripeSecretKey: process.env.STRIPE_SECRET_KEY ? '••••••••' : '',
            luluClientKey: process.env.LULU_CLIENT_KEY || '',
            luluClientSecret: process.env.LULU_CLIENT_SECRET ? '••••••••' : ''
        };
        
        // Try to load existing settings
        try {
            const data = await fs.readFile(settingsPath, 'utf8');
            settings = { ...settings, ...JSON.parse(data) };
        } catch (error) {
            // Use defaults if file doesn't exist
        }
        
        res.json(settings);
    } catch (error) {
        console.error('Error loading settings:', error);
        res.status(500).json({ error: 'Failed to load settings' });
    }
});

// Get email templates
router.get('/email-templates', authenticateAdmin, async (req, res) => {
    try {
        const templatesPath = path.join(__dirname, '../../frontend/brands/teneo/email-templates.json');
        
        // Default templates
        let templates = {
            orderConfirm: {
                subject: '✅ Order Confirmed: {{bookTitle}}',
                header: 'Thank you for your purchase! Your order has been confirmed and we\'re preparing your book.'
            },
            download: {
                subject: '📚 Your book is ready to download!',
                header: 'Great news! Your book is ready for download. Click the link below to access your PDF.'
            },
            shipping: {
                subject: '🚚 Your book has shipped!',
                header: 'Your book is on its way! Track your package using the link below.'
            }
        };
        
        // Try to load existing templates
        try {
            const data = await fs.readFile(templatesPath, 'utf8');
            templates = { ...templates, ...JSON.parse(data) };
        } catch (error) {
            // Use defaults if file doesn't exist
        }
        
        res.json(templates);
    } catch (error) {
        console.error('Error loading templates:', error);
        res.status(500).json({ error: 'Failed to load templates' });
    }
});

// Add new book
router.post('/books', authenticateAdmin, upload.fields([
    { name: 'cover', maxCount: 1 },
    { name: 'pdf', maxCount: 1 }
]), async (req, res) => {
    try {
        const bookData = JSON.parse(req.body.bookData);
        const brand = 'teneo';
        
        // Generate book ID
        const bookId = bookData.title.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
        
        // Process uploaded files
        if (req.files.cover) {
            bookData.coverImage = `/brands/${brand}/assets/covers/${req.files.cover[0].filename}`;
        }
        
        if (req.files.pdf) {
            bookData.pdfPath = `/brands/${brand}/pdfs/${req.files.pdf[0].filename}`;
        }
        
        // Load catalog
        const catalogPath = path.join(__dirname, '../../frontend/brands', brand, 'catalog.json');
        let catalog = { books: [] };
        
        try {
            const data = await fs.readFile(catalogPath, 'utf8');
            catalog = JSON.parse(data);
        } catch (error) {
            // Create new catalog
        }
        
        // Add book to catalog
        bookData.id = bookId;
        catalog.books.push(bookData);
        
        // Save catalog
        await fs.writeFile(catalogPath, JSON.stringify(catalog, null, 2));
        
        // Save to database
        await saveBookToDatabase(bookData);
        
        res.json({ 
            success: true, 
            bookId,
            message: 'Book added successfully' 
        });
    } catch (error) {
        console.error('Error adding book:', error);
        res.status(500).json({ error: 'Failed to add book' });
    }
});

// Update book
router.put('/books/:bookId', authenticateAdmin, upload.fields([
    { name: 'cover', maxCount: 1 },
    { name: 'pdf', maxCount: 1 }
]), async (req, res) => {
    try {
        const { bookId } = req.params;
        const bookData = JSON.parse(req.body.bookData);
        const brand = 'teneo';
        
        // Process uploaded files
        if (req.files.cover) {
            bookData.coverImage = `/brands/${brand}/assets/covers/${req.files.cover[0].filename}`;
        }
        
        if (req.files.pdf) {
            bookData.pdfPath = `/brands/${brand}/pdfs/${req.files.pdf[0].filename}`;
        }
        
        // Load catalog
        const catalogPath = path.join(__dirname, '../../frontend/brands', brand, 'catalog.json');
        const data = await fs.readFile(catalogPath, 'utf8');
        const catalog = JSON.parse(data);
        
        // Update book in catalog
        const bookIndex = catalog.books.findIndex(b => b.id === bookId);
        if (bookIndex === -1) {
            return res.status(404).json({ error: 'Book not found' });
        }
        
        catalog.books[bookIndex] = { 
            ...catalog.books[bookIndex], 
            ...bookData,
            id: bookId 
        };
        
        // Save catalog
        await fs.writeFile(catalogPath, JSON.stringify(catalog, null, 2));
        
        // Update database
        await updateBookInDatabase(bookId, bookData);
        
        res.json({ 
            success: true, 
            message: 'Book updated successfully' 
        });
    } catch (error) {
        console.error('Error updating book:', error);
        res.status(500).json({ error: 'Failed to update book' });
    }
});

// Delete book
router.delete('/books/:bookId', authenticateAdmin, async (req, res) => {
    try {
        const { bookId } = req.params;
        const brand = 'teneo';
        
        // Load catalog
        const catalogPath = path.join(__dirname, '../../frontend/brands', brand, 'catalog.json');
        const data = await fs.readFile(catalogPath, 'utf8');
        const catalog = JSON.parse(data);
        
        // Remove book from catalog
        catalog.books = catalog.books.filter(b => b.id !== bookId);
        
        // Save catalog
        await fs.writeFile(catalogPath, JSON.stringify(catalog, null, 2));
        
        // Delete from database
        await deleteBookFromDatabase(bookId);
        
        res.json({ 
            success: true, 
            message: 'Book deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting book:', error);
        res.status(500).json({ error: 'Failed to delete book' });
    }
});

// Reorder books
router.post('/books/reorder', authenticateAdmin, async (req, res) => {
    try {
        const { order } = req.body;
        const brand = 'teneo';
        
        // Load catalog
        const catalogPath = path.join(__dirname, '../../frontend/brands', brand, 'catalog.json');
        const data = await fs.readFile(catalogPath, 'utf8');
        const catalog = JSON.parse(data);
        
        // Reorder books
        const reorderedBooks = [];
        order.forEach(bookId => {
            const book = catalog.books.find(b => b.id === bookId);
            if (book) {
                reorderedBooks.push(book);
            }
        });
        
        catalog.books = reorderedBooks;
        
        // Save catalog
        await fs.writeFile(catalogPath, JSON.stringify(catalog, null, 2));
        
        res.json({ 
            success: true, 
            message: 'Books reordered successfully' 
        });
    } catch (error) {
        console.error('Error reordering books:', error);
        res.status(500).json({ error: 'Failed to reorder books' });
    }
});

// Save all settings
router.post('/save-all', authenticateAdmin, async (req, res) => {
    try {
        const { settings, emailTemplates } = req.body;
        const brand = 'teneo';
        
        // Save settings
        const settingsPath = path.join(__dirname, '../../frontend/brands', brand, 'settings.json');
        await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
        
        // Save email templates
        const templatesPath = path.join(__dirname, '../../frontend/brands', brand, 'email-templates.json');
        await fs.writeFile(templatesPath, JSON.stringify(emailTemplates, null, 2));
        
        // Update environment variables if needed
        if (settings.stripePublishableKey && settings.stripePublishableKey !== '••••••••') {
            process.env.STRIPE_PUBLISHABLE_KEY = settings.stripePublishableKey;
        }
        
        if (settings.stripeSecretKey && settings.stripeSecretKey !== '••••••••') {
            process.env.STRIPE_SECRET_KEY = settings.stripeSecretKey;
        }
        
        res.json({ 
            success: true, 
            message: 'Settings saved successfully' 
        });
    } catch (error) {
        console.error('Error saving settings:', error);
        res.status(500).json({ error: 'Failed to save settings' });
    }
});

// Helper functions
async function getTotalRevenue() {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT SUM(price) as total FROM orders 
            WHERE payment_status = 'paid'`,
            (err, row) => {
                if (err) reject(err);
                else resolve(row.total || 0);
            }
        );
    });
}

async function getTotalOrders() {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT COUNT(*) as count FROM orders 
            WHERE payment_status = 'paid'`,
            (err, row) => {
                if (err) reject(err);
                else resolve(row.count || 0);
            }
        );
    });
}

async function getActiveBooks() {
    try {
        const catalogPath = path.join(__dirname, '../../frontend/brands/teneo/catalog.json');
        const data = await fs.readFile(catalogPath, 'utf8');
        const catalog = JSON.parse(data);
        return catalog.books.length;
    } catch (error) {
        return 0;
    }
}

async function getConversionRate() {
    // Simplified conversion rate calculation
    return 2.5; // Placeholder
}

async function getRecentOrders() {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT * FROM orders 
            ORDER BY created_at DESC 
            LIMIT 5`,
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
}

async function saveBookToDatabase(bookData) {
    // Save book formats to database
    for (const [formatType, format] of Object.entries(bookData.formats || {})) {
        await new Promise((resolve, reject) => {
            db.run(
                `INSERT OR REPLACE INTO book_formats 
                (book_id, format_type, pod_package_id, page_count, base_price, our_price, is_active) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    bookData.id,
                    formatType,
                    format.pod_package_id || null,
                    format.pages || null,
                    format.price * 0.6, // Estimated base cost
                    format.price,
                    format.available ? 1 : 0
                ],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }
}

async function updateBookInDatabase(bookId, bookData) {
    // Update book formats in database
    for (const [formatType, format] of Object.entries(bookData.formats || {})) {
        await new Promise((resolve, reject) => {
            db.run(
                `INSERT OR REPLACE INTO book_formats 
                (book_id, format_type, pod_package_id, page_count, base_price, our_price, is_active) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    bookId,
                    formatType,
                    format.pod_package_id || null,
                    format.pages || null,
                    format.price * 0.6, // Estimated base cost
                    format.price,
                    format.available ? 1 : 0
                ],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }
}

async function deleteBookFromDatabase(bookId) {
    return new Promise((resolve, reject) => {
        db.run(
            `DELETE FROM book_formats WHERE book_id = ?`,
            [bookId],
            (err) => {
                if (err) reject(err);
                else resolve();
            }
        );
    });
}

module.exports = router;