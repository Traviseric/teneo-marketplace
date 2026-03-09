const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const { authenticateAdmin } = require('../middleware/auth');
const arxmintService = require('../services/arxmintService');
const { stampPDF } = require('../services/pdfStampingService');

const OrderService = require('../services/orderService');
const db = require('../database/database');

// Initialize order service
const orderService = new OrderService();

// Configure multer for PDF uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../books'));
  },
  filename: (req, file, cb) => {
    // Use bookId from request body as filename — sanitize to prevent path traversal
    const rawId = req.body.bookId || 'unknown';
    const safeId = path.basename(rawId).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${safeId}.pdf`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Only allow PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});


// GET /api/download/:token - Download file with token
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    // Get order by download token
    const order = await orderService.getOrderByDownloadToken(token);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Invalid or expired download link'
      });
    }

    // Check expiry before serving the file
    if (order.download_expiry && new Date() > new Date(order.download_expiry)) {
      return res.status(410).json({
        success: false,
        error: 'Download link has expired. Please contact support if you need assistance.'
      });
    }

    // Check download limit
    if (order.download_count >= 5) {
      await orderService.logDownload(
        order.order_id,
        token,
        req.ip,
        req.headers['user-agent'],
        'failed',
        'Download limit exceeded'
      );
      
      return res.status(429).json({
        success: false,
        error: 'Download limit exceeded'
      });
    }
    
    // DB-backed rate limit: max 10 download attempts per IP per minute (CWE-770)
    // Queries download_logs which persists across restarts — no longer reset by crashes/deploys
    const clientIp = req.ip || 'unknown';
    const { count: recentCount } = await db.get(
      `SELECT COUNT(*) as count FROM download_logs WHERE ip_address = ? AND created_at > datetime('now', '-1 minute')`,
      [clientIp]
    );

    if (recentCount >= 10) {
      await orderService.logDownload(
        order.order_id,
        token,
        req.ip,
        req.headers['user-agent'],
        'failed',
        'Too many attempts'
      );

      return res.status(429).json({
        success: false,
        error: 'Too many download attempts. Please wait a minute.'
      });
    }
    
    // Check if file exists
    const pdfPath = path.join(__dirname, '../books', `${order.book_id}.pdf`);
    try {
      await fs.access(pdfPath);
    } catch (error) {
      await orderService.logDownload(
        order.order_id,
        token,
        req.ip,
        req.headers['user-agent'],
        'failed',
        'File not found'
      );
      
      return res.status(404).json({
        success: false,
        error: 'Book file not found'
      });
    }
    
    // Increment download count
    await orderService.incrementDownloadCount(order.order_id);
    
    // Log successful download
    await orderService.logDownload(
      order.order_id,
      token,
      req.ip,
      req.headers['user-agent'],
      'success'
    );
    
    console.log(`Download: ${order.book_id} order=${order.order_id} (${order.download_count + 1}/5)`);
    
    // If ArxMint enabled, advertise L402 paywall capability alongside token auth
    // Clients that support L402 can use Lightning/ecash instead of purchase tokens
    if (arxmintService.enabled) {
      res.setHeader('X-ArxMint-L402', 'supported');
    }

    // Set headers for file download
    res.setHeader('Content-Type', 'application/pdf');
    const safeTitle = (order.book_title || 'download').replace(/["\\;\r\n]/g, '_');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.pdf"`);
    res.setHeader('X-Download-Count', order.download_count + 1);
    res.setHeader('X-Downloads-Remaining', 5 - (order.download_count + 1));

    // Stamp PDFs with buyer identity (content protection — traced if shared)
    // Stamped buffer is served directly, never written to disk
    const rawBuffer = await fs.readFile(pdfPath);
    try {
      const stamped = await stampPDF(rawBuffer, order.customer_email, order.customer_name);
      res.setHeader('Content-Length', stamped.length);
      res.end(stamped);
    } catch (stampErr) {
      // If stamping fails (corrupt PDF, encryption), fall back to raw file
      console.warn(`PDF stamping failed for order ${order.order_id}, serving raw:`, stampErr.message);
      res.setHeader('Content-Length', rawBuffer.length);
      res.end(rawBuffer);
    }
    
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download file'
    });
  }
});

// POST /api/download/upload - Upload PDF file (requires auth)
router.post('/upload', authenticateAdmin, upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No PDF file uploaded'
      });
    }
    
    const { bookId } = req.body;
    if (!bookId) {
      return res.status(400).json({
        success: false,
        error: 'Book ID is required'
      });
    }
    
    // File was saved by multer with bookId as filename
    const filePath = req.file.path;
    const fileSize = req.file.size;
    
    res.json({
      success: true,
      message: 'PDF uploaded successfully',
      bookId,
      filename: req.file.filename,
      size: fileSize,
      path: filePath
    });
    
  } catch (error) {
    console.error('Error uploading PDF:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload PDF'
    });
  }
});

// GET /api/download/list - List uploaded PDFs (requires auth)
router.get('/list', authenticateAdmin, async (req, res) => {
  try {
    const booksDir = path.join(__dirname, '../books');
    
    // Create directory if it doesn't exist
    try {
      await fs.access(booksDir);
    } catch (error) {
      await fs.mkdir(booksDir, { recursive: true });
    }
    
    const files = await fs.readdir(booksDir);
    const pdfFiles = files.filter(file => file.endsWith('.pdf'));
    
    const fileDetails = await Promise.all(
      pdfFiles.map(async (file) => {
        const filePath = path.join(booksDir, file);
        const stats = await fs.stat(filePath);
        
        return {
          bookId: file.replace('.pdf', ''),
          filename: file,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      })
    );
    
    res.json({
      success: true,
      files: fileDetails
    });
    
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list files'
    });
  }
});

// DELETE /api/download/:bookId - Delete PDF file (requires auth)
router.delete('/:bookId', authenticateAdmin, async (req, res) => {
  try {
    const { bookId } = req.params;
    const safeBookId = path.basename(bookId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = path.join(__dirname, '../books', `${safeBookId}.pdf`);
    
    try {
      await fs.access(filePath);
      await fs.unlink(filePath);
      
      res.json({
        success: true,
        message: 'PDF deleted successfully'
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: 'PDF file not found'
      });
    }
    
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete file'
    });
  }
});

// GET /api/download/token/:token/info - Get token info
router.get('/token/:token/info', async (req, res) => {
  try {
    const { token } = req.params;
    
    // Get order by download token
    const order = await orderService.getOrderByDownloadToken(token);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
    
    const downloadExpiry = new Date(order.download_expiry);
    const now = new Date();
    const isExpired = now > downloadExpiry;
    const timeRemaining = downloadExpiry - now;
    const downloadsRemaining = 5 - order.download_count;
    
    res.json({
      success: true,
      tokenInfo: {
        bookId: order.book_id,
        orderId: order.order_id,
        isExpired,
        timeRemaining: isExpired ? 0 : timeRemaining,
        downloadCount: order.download_count,
        maxDownloads: 5,
        downloadsRemaining: isExpired ? 0 : downloadsRemaining,
        createdAt: order.created_at
      }
    });
    
  } catch (error) {
    console.error('Error getting token info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get token info'
    });
  }
});

module.exports = router;