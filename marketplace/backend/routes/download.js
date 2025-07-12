const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// In-memory store for download tokens (in production, use database)
const downloadTokens = new Map();

// Generate secure download token
function generateSecureToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Create download token with expiration
function createDownloadToken(bookId, orderId, customerEmail) {
    const token = generateSecureToken();
    const tokenData = {
        bookId,
        orderId,
        customerEmail,
        created: new Date(),
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        downloads: 0,
        maxDownloads: 5,
        ipAddresses: []
    };
    
    downloadTokens.set(token, tokenData);
    
    // Clean up expired tokens periodically
    setTimeout(() => {
        if (downloadTokens.has(token)) {
            downloadTokens.delete(token);
        }
    }, 24 * 60 * 60 * 1000);
    
    return token;
}

// Verify download token
function verifyDownloadToken(token) {
    const tokenData = downloadTokens.get(token);
    
    if (!tokenData) {
        return { valid: false, error: 'Invalid download token' };
    }
    
    if (new Date() > tokenData.expires) {
        downloadTokens.delete(token);
        return { valid: false, error: 'Download token has expired' };
    }
    
    if (tokenData.downloads >= tokenData.maxDownloads) {
        return { valid: false, error: 'Download limit reached' };
    }
    
    return { valid: true, tokenData };
}

// POST /api/download/create-token
// Create a secure download token after successful payment
router.post('/create-token', (req, res) => {
    const { bookId, orderId, customerEmail } = req.body;
    
    if (!bookId || !orderId || !customerEmail) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields'
        });
    }
    
    const token = createDownloadToken(bookId, orderId, customerEmail);
    
    res.json({
        success: true,
        token,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        downloadUrl: `/api/download/file/${bookId}?token=${token}`
    });
});

// GET /api/download/file/:bookId
// Download a book file with token verification
router.get('/file/:bookId', (req, res) => {
    const { bookId } = req.params;
    const { token } = req.query;
    
    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Download token required'
        });
    }
    
    // Verify token
    const verification = verifyDownloadToken(token);
    if (!verification.valid) {
        return res.status(403).json({
            success: false,
            error: verification.error
        });
    }
    
    const tokenData = verification.tokenData;
    
    // Verify the token is for this book
    if (tokenData.bookId !== bookId) {
        return res.status(403).json({
            success: false,
            error: 'Token not valid for this book'
        });
    }
    
    // Determine file path based on book ID
    let filePath;
    if (bookId.startsWith('teneo-')) {
        filePath = path.join(__dirname, '../../frontend/books/teneo', `${bookId}.pdf`);
    } else if (bookId.startsWith('true-earth-')) {
        filePath = path.join(__dirname, '../../frontend/books/true-earth', `${bookId}.pdf`);
    } else if (bookId.startsWith('wealth-wise-')) {
        filePath = path.join(__dirname, '../../frontend/books/wealth-wise', `${bookId}.pdf`);
    } else {
        filePath = path.join(__dirname, '../../frontend/books/default', `${bookId}.pdf`);
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
        console.error('File not found:', filePath);
        return res.status(404).json({
            success: false,
            error: 'Book file not found'
        });
    }
    
    // Update download count and IP tracking
    tokenData.downloads++;
    const clientIp = req.ip || req.connection.remoteAddress;
    if (!tokenData.ipAddresses.includes(clientIp)) {
        tokenData.ipAddresses.push(clientIp);
    }
    
    // Log download analytics
    console.log(`Download: ${bookId} by ${tokenData.customerEmail} (${tokenData.downloads}/${tokenData.maxDownloads})`);
    
    // Set appropriate headers for PDF download
    const filename = `${bookId}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Download-Count', tokenData.downloads);
    res.setHeader('X-Downloads-Remaining', tokenData.maxDownloads - tokenData.downloads);
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.on('error', (error) => {
        console.error('File stream error:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: 'Error reading file'
            });
        }
    });
    
    fileStream.pipe(res);
});

// GET /api/download/verify/:token
// Verify a download token and get its status
router.get('/verify/:token', (req, res) => {
    const { token } = req.params;
    
    const verification = verifyDownloadToken(token);
    
    if (!verification.valid) {
        return res.json({
            success: false,
            error: verification.error
        });
    }
    
    const tokenData = verification.tokenData;
    
    res.json({
        success: true,
        bookId: tokenData.bookId,
        orderId: tokenData.orderId,
        downloads: tokenData.downloads,
        maxDownloads: tokenData.maxDownloads,
        remainingDownloads: tokenData.maxDownloads - tokenData.downloads,
        expires: tokenData.expires
    });
});

// POST /api/download/batch-tokens
// Create multiple download tokens for an order
router.post('/batch-tokens', (req, res) => {
    const { orderId, customerEmail, books } = req.body;
    
    if (!orderId || !customerEmail || !books || !Array.isArray(books)) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields'
        });
    }
    
    const tokens = books.map(book => ({
        bookId: book.id,
        title: book.title,
        token: createDownloadToken(book.id, orderId, customerEmail),
        downloadUrl: `/api/download/file/${book.id}?token=${createDownloadToken(book.id, orderId, customerEmail)}`
    }));
    
    res.json({
        success: true,
        orderId,
        customerEmail,
        tokens,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
});

// GET /api/download/analytics
// Get download analytics (admin endpoint)
router.get('/analytics', (req, res) => {
    const analytics = {
        totalTokens: downloadTokens.size,
        activeTokens: 0,
        expiredTokens: 0,
        totalDownloads: 0,
        bookDownloads: {}
    };
    
    const now = new Date();
    
    downloadTokens.forEach((tokenData, token) => {
        if (tokenData.expires > now) {
            analytics.activeTokens++;
        } else {
            analytics.expiredTokens++;
        }
        
        analytics.totalDownloads += tokenData.downloads;
        
        if (!analytics.bookDownloads[tokenData.bookId]) {
            analytics.bookDownloads[tokenData.bookId] = {
                downloads: 0,
                uniqueUsers: new Set()
            };
        }
        
        analytics.bookDownloads[tokenData.bookId].downloads += tokenData.downloads;
        analytics.bookDownloads[tokenData.bookId].uniqueUsers.add(tokenData.customerEmail);
    });
    
    // Convert Sets to counts
    Object.keys(analytics.bookDownloads).forEach(bookId => {
        analytics.bookDownloads[bookId].uniqueUsers = analytics.bookDownloads[bookId].uniqueUsers.size;
    });
    
    res.json({
        success: true,
        analytics
    });
});

module.exports = router;