const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/auth');
const LuluService = require('../services/luluService');
const OrderService = require('../services/orderService');
const db = require('../database/database');
const { safeMessage } = require('../utils/validate');

const luluService = new LuluService();
const orderService = new OrderService();

// Apply admin authentication to all routes
router.use(authenticateAdmin);

// Get dashboard statistics
router.get('/stats', async (req, res) => {
    try {
        const stats = await getDashboardStats();
        res.json(stats);
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// Get list of print jobs
router.get('/print-jobs', async (req, res) => {
    try {
        const { status, limit = 50, offset = 0 } = req.query;
        
        let query = `
            SELECT 
                pj.*,
                o.customer_email,
                o.order_id,
                o.created_at as order_date,
                bf.book_id,
                b.title as book_title,
                b.author as book_author
            FROM print_jobs pj
            JOIN orders o ON pj.order_id = o.order_id
            LEFT JOIN book_formats bf ON pj.book_id = bf.book_id 
                AND pj.format_type = bf.format_type
            LEFT JOIN books b ON bf.book_id = b.id
        `;
        
        const params = [];
        if (status) {
            query += ' WHERE pj.status = ?';
            params.push(status);
        }
        
        query += ' ORDER BY pj.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const printJobs = await new Promise((resolve, reject) => {
            db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        res.json(printJobs);
    } catch (error) {
        console.error('Error fetching print jobs:', error);
        res.status(500).json({ error: 'Failed to fetch print jobs' });
    }
});

// Get single print job details
router.get('/print-jobs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get print job details
        const printJob = await new Promise((resolve, reject) => {
            db.get(
                `SELECT pj.*, o.*, b.title as book_title, b.author as book_author
                FROM print_jobs pj
                JOIN orders o ON pj.order_id = o.order_id
                LEFT JOIN books b ON pj.book_id = b.id
                WHERE pj.lulu_print_job_id = ?`,
                [id],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
        
        if (!printJob) {
            return res.status(404).json({ error: 'Print job not found' });
        }
        
        // Get webhook events for this print job
        const events = await new Promise((resolve, reject) => {
            db.all(
                `SELECT * FROM lulu_webhook_events 
                WHERE print_job_id = ? 
                ORDER BY created_at DESC`,
                [id],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
        
        // Parse shipping address if available
        if (printJob.shipping_address) {
            try {
                printJob.shipping_address = JSON.parse(printJob.shipping_address);
            } catch (e) {
                // Keep as string if parsing fails
            }
        }
        
        res.json({
            ...printJob,
            events
        });
    } catch (error) {
        console.error('Error fetching print job:', error);
        res.status(500).json({ error: 'Failed to fetch print job details' });
    }
});

// Cancel print job
router.post('/print-jobs/:id/cancel', async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        
        // Call Lulu API to cancel
        const result = await luluService.cancelPrintJob(id, reason);
        
        if (result.success) {
            // Update local status
            await luluService.updatePrintJobStatus(id, 'CANCELED');
            
            res.json({ 
                success: true, 
                message: 'Print job cancelled successfully' 
            });
        } else {
            res.status(400).json({ 
                success: false, 
                error: result.error 
            });
        }
    } catch (error) {
        console.error('Error cancelling print job:', error);
        res.status(500).json({ error: 'Failed to cancel print job' });
    }
});

// Get book formats
router.get('/formats', async (req, res) => {
    try {
        const formats = await new Promise((resolve, reject) => {
            db.all(
                `SELECT 
                    bf.*,
                    b.title as book_title,
                    b.author as book_author
                FROM book_formats bf
                JOIN books b ON bf.book_id = b.id
                WHERE bf.is_active = 1
                ORDER BY b.title, bf.format_type`,
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
        
        res.json(formats);
    } catch (error) {
        console.error('Error fetching formats:', error);
        res.status(500).json({ error: 'Failed to fetch formats' });
    }
});

// Sync with Lulu
router.post('/sync', async (req, res) => {
    try {
        const { bookIds } = req.body;
        const results = [];
        
        // Get all active formats to sync
        const formats = await new Promise((resolve, reject) => {
            let query = `
                SELECT bf.*, b.title, b.author
                FROM book_formats bf
                JOIN books b ON bf.book_id = b.id
                WHERE bf.is_active = 1 
                AND bf.format_type != 'digital_pdf'
            `;
            
            if (bookIds && bookIds.length > 0) {
                query += ` AND bf.book_id IN (${bookIds.map(() => '?').join(',')})`;
            }
            
            db.all(query, bookIds || [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        // Sync each format with Lulu
        for (const format of formats) {
            try {
                // Calculate new pricing based on page count
                const baseCost = await luluService.calculateBaseCost(
                    format.pod_package_id,
                    format.page_count
                );
                
                // Apply standard markup
                const markup = 1.4; // 40% markup
                const ourPrice = Math.ceil(baseCost * markup * 100) / 100;
                
                // Update format pricing
                await new Promise((resolve, reject) => {
                    db.run(
                        `UPDATE book_formats 
                        SET base_price = ?, our_price = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?`,
                        [baseCost, ourPrice, format.id],
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });
                
                results.push({
                    bookId: format.book_id,
                    format: format.format_type,
                    oldPrice: format.our_price,
                    newPrice: ourPrice,
                    baseCost: baseCost,
                    success: true
                });
            } catch (error) {
                results.push({
                    bookId: format.book_id,
                    format: format.format_type,
                    error: safeMessage(error),
                    success: false
                });
            }
        }
        
        res.json({
            success: true,
            synced: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results
        });
    } catch (error) {
        console.error('Error syncing with Lulu:', error);
        res.status(500).json({ error: 'Failed to sync with Lulu' });
    }
});

// Calculate pricing
router.post('/calculate-price', async (req, res) => {
    try {
        const { pages, format, quantity = 1, markup = 40 } = req.body;
        
        if (!pages || !format) {
            return res.status(400).json({ 
                error: 'Pages and format are required' 
            });
        }
        
        // Calculate base cost from Lulu
        const baseCost = await luluService.calculateBaseCost(format, pages);
        
        // Calculate markup
        const markupPercent = parseInt(markup);
        const markupAmount = baseCost * (markupPercent / 100);
        const suggestedPrice = Math.ceil((baseCost + markupAmount) * 100) / 100;
        
        // Calculate profit
        const profit = suggestedPrice - baseCost;
        
        // Bundle pricing suggestions
        const bundlePrice = suggestedPrice + 29.99; // PDF price
        
        res.json({
            baseCost,
            markupPercent,
            markupAmount,
            suggestedPrice,
            profit,
            bundlePrice,
            quantity,
            totalRevenue: suggestedPrice * quantity,
            totalProfit: profit * quantity
        });
    } catch (error) {
        console.error('Error calculating price:', error);
        res.status(500).json({ error: 'Failed to calculate pricing' });
    }
});

// Create manual print job
router.post('/manual-print-job', async (req, res) => {
    try {
        const { bookId, format, shippingAddress, shippingMethod } = req.body;
        
        // Validate input
        if (!bookId || !format || !shippingAddress) {
            return res.status(400).json({ 
                error: 'Missing required fields' 
            });
        }
        
        // Get book and format details
        const bookFormat = await new Promise((resolve, reject) => {
            db.get(
                `SELECT bf.*, b.title, b.author
                FROM book_formats bf
                JOIN books b ON bf.book_id = b.id
                WHERE bf.book_id = ? AND bf.format_type = ?`,
                [bookId, format],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
        
        if (!bookFormat) {
            return res.status(404).json({ 
                error: 'Book format not found' 
            });
        }
        
        // Create a manual order record
        const orderId = `manual_${Date.now()}`;
        await orderService.createOrder({
            orderId,
            customerEmail: shippingAddress.email,
            bookId,
            bookTitle: bookFormat.title,
            bookAuthor: bookFormat.author,
            format,
            price: bookFormat.our_price,
            currency: 'USD',
            paymentStatus: 'manual',
            metadata: {
                orderType: 'manual',
                createdBy: 'admin'
            }
        });
        
        // Create print job with Lulu
        const printJobResult = await luluService.createPrintJob({
            lineItems: [{
                bookId,
                formatType: format,
                title: bookFormat.title,
                quantity: 1,
                podPackageId: bookFormat.pod_package_id
            }],
            shippingAddress,
            shippingMethod: shippingMethod || 'GROUND',
            contactEmail: shippingAddress.email,
            externalId: orderId
        });
        
        if (printJobResult.success) {
            // Save print job record
            await luluService.savePrintJob({
                orderId,
                bookId,
                formatType: format,
                luluPrintJobId: printJobResult.printJobId,
                luluOrderId: printJobResult.orderId,
                status: printJobResult.status,
                quantity: 1,
                shippingMethod,
                shippingCost: 0
            });
            
            res.json({
                success: true,
                orderId,
                printJobId: printJobResult.printJobId,
                status: printJobResult.status
            });
        } else {
            res.status(400).json({
                success: false,
                error: printJobResult.error
            });
        }
    } catch (error) {
        console.error('Error creating manual print job:', error);
        res.status(500).json({ error: 'Failed to create print job' });
    }
});

// Helper function to get dashboard stats
async function getDashboardStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Get active print jobs count
    const activePrintJobs = await new Promise((resolve, reject) => {
        db.get(
            `SELECT COUNT(*) as count FROM print_jobs 
            WHERE status IN ('UNPAID', 'PRODUCTION_DELAYED', 'IN_PRODUCTION')`,
            (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            }
        );
    });
    
    // Get shipped this month count
    const shippedThisMonth = await new Promise((resolve, reject) => {
        db.get(
            `SELECT COUNT(*) as count FROM print_jobs 
            WHERE status = 'SHIPPED' 
            AND shipped_at >= ?`,
            [startOfMonth.toISOString()],
            (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            }
        );
    });
    
    // Get print revenue this month
    const printRevenue = await new Promise((resolve, reject) => {
        db.get(
            `SELECT SUM(o.price) as total FROM orders o
            JOIN print_jobs pj ON o.order_id = pj.order_id
            WHERE o.created_at >= ?
            AND o.payment_status = 'paid'`,
            [startOfMonth.toISOString()],
            (err, row) => {
                if (err) reject(err);
                else resolve(row.total || 0);
            }
        );
    });
    
    return {
        activePrintJobs,
        shippedThisMonth,
        printRevenue
    };
}

module.exports = router;