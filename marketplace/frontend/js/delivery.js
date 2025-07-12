// Digital Delivery System for Teneo Marketplace
// Handles book downloads, purchase verification, and delivery management

class DigitalDelivery {
    constructor() {
        this.purchases = [];
        this.downloadLimit = 5;
        this.expirationDays = 30;
        this.init();
    }

    init() {
        this.loadPurchases();
    }

    // Load purchases from localStorage
    loadPurchases() {
        try {
            const saved = localStorage.getItem('teneoPurchases');
            if (saved) {
                this.purchases = JSON.parse(saved);
                // Clean up expired purchases
                this.cleanupExpiredPurchases();
            }
        } catch (error) {
            console.error('Error loading purchases:', error);
            this.purchases = [];
        }
    }

    // Save purchases to localStorage
    savePurchases() {
        try {
            localStorage.setItem('teneoPurchases', JSON.stringify(this.purchases));
        } catch (error) {
            console.error('Error saving purchases:', error);
        }
    }

    // Generate unique order ID
    generateOrderId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 9);
        return `TEN-${timestamp}-${random.toUpperCase()}`;
    }

    // Generate download token
    generateDownloadToken() {
        return Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
    }

    // Record a new purchase
    recordPurchase(orderData) {
        const orderId = orderData.orderId || this.generateOrderId();
        const purchase = {
            orderId: orderId,
            sessionId: orderData.sessionId,
            customerEmail: orderData.customerEmail,
            items: orderData.items,
            total: orderData.total,
            purchaseDate: new Date().toISOString(),
            expirationDate: this.calculateExpirationDate(),
            downloads: {},
            status: 'completed'
        };

        // Initialize download counts for each item
        orderData.items.forEach(item => {
            purchase.downloads[item.id] = {
                bookId: item.id,
                title: item.title,
                downloadCount: 0,
                maxDownloads: this.downloadLimit,
                downloadToken: this.generateDownloadToken(),
                digitalFile: item.digitalFile || `/books/${item.brandId || 'default'}/${item.id}.pdf`
            };
        });

        this.purchases.push(purchase);
        this.savePurchases();

        // Send confirmation email (simulated)
        this.sendConfirmationEmail(purchase);

        return purchase;
    }

    // Calculate expiration date
    calculateExpirationDate() {
        const date = new Date();
        date.setDate(date.getDate() + this.expirationDays);
        return date.toISOString();
    }

    // Clean up expired purchases
    cleanupExpiredPurchases() {
        const now = new Date();
        this.purchases = this.purchases.filter(purchase => {
            const expiration = new Date(purchase.expirationDate);
            return expiration > now;
        });
        this.savePurchases();
    }

    // Verify purchase by order ID
    verifyPurchase(orderId) {
        const purchase = this.purchases.find(p => p.orderId === orderId);
        if (!purchase) {
            return { valid: false, error: 'Order not found' };
        }

        const expiration = new Date(purchase.expirationDate);
        if (expiration < new Date()) {
            return { valid: false, error: 'Download link has expired' };
        }

        return { valid: true, purchase: purchase };
    }

    // Process download request
    async processDownload(orderId, bookId) {
        const verification = this.verifyPurchase(orderId);
        if (!verification.valid) {
            return { success: false, error: verification.error };
        }

        const purchase = verification.purchase;
        const downloadInfo = purchase.downloads[bookId];

        if (!downloadInfo) {
            return { success: false, error: 'Book not found in order' };
        }

        if (downloadInfo.downloadCount >= downloadInfo.maxDownloads) {
            return { success: false, error: 'Download limit reached' };
        }

        try {
            // Request a secure download token from the backend
            const response = await fetch('/api/download/create-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    bookId: bookId,
                    orderId: orderId,
                    customerEmail: purchase.customerEmail
                })
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to create download token');
            }

            // Increment download count
            downloadInfo.downloadCount++;
            downloadInfo.lastDownload = new Date().toISOString();
            this.savePurchases();

            // Return download information with secure URL
            return {
                success: true,
                downloadUrl: result.downloadUrl,
                downloadToken: result.token,
                remainingDownloads: downloadInfo.maxDownloads - downloadInfo.downloadCount,
                fileName: `${bookId}.pdf`
            };
        } catch (error) {
            console.error('Download error:', error);
            return { 
                success: false, 
                error: 'Failed to process download. Please try again.' 
            };
        }
    }

    // Simulate sending confirmation email
    sendConfirmationEmail(purchase) {
        console.log('Sending confirmation email to:', purchase.customerEmail);
        
        // In a real system, this would send an actual email
        // For demo, we'll show a console message and create a notification
        const emailContent = {
            to: purchase.customerEmail,
            subject: `Your Teneo Order ${purchase.orderId} - Download Links Inside`,
            body: `
Thank you for your purchase!

Order ID: ${purchase.orderId}
Purchase Date: ${new Date(purchase.purchaseDate).toLocaleDateString()}

Your books are ready for download:
${Object.values(purchase.downloads).map(book => 
    `- ${book.title}: Download at http://localhost:3001/downloads.html?order=${purchase.orderId}`
).join('\n')}

Your download links will expire on ${new Date(purchase.expirationDate).toLocaleDateString()}.
You can download each book up to ${this.downloadLimit} times.

Best regards,
The Teneo Team
            `
        };

        console.log('Email content:', emailContent);

        // Show notification to user
        if (window.showNotification) {
            window.showNotification(
                'Download links sent to ' + purchase.customerEmail,
                'success'
            );
        }
    }

    // Get purchase details for display
    getPurchaseDetails(orderId) {
        const verification = this.verifyPurchase(orderId);
        if (!verification.valid) {
            return null;
        }

        const purchase = verification.purchase;
        const now = new Date();
        const expiration = new Date(purchase.expirationDate);
        const daysRemaining = Math.ceil((expiration - now) / (1000 * 60 * 60 * 24));

        return {
            orderId: purchase.orderId,
            purchaseDate: purchase.purchaseDate,
            expirationDate: purchase.expirationDate,
            daysRemaining: daysRemaining,
            items: Object.values(purchase.downloads).map(item => ({
                bookId: item.bookId,
                title: item.title,
                downloadCount: item.downloadCount,
                maxDownloads: item.maxDownloads,
                remainingDownloads: item.maxDownloads - item.downloadCount,
                canDownload: item.downloadCount < item.maxDownloads
            })),
            total: purchase.total,
            status: purchase.status
        };
    }

    // Handle successful Stripe payment
    handleStripeSuccess(sessionId) {
        // In a real system, this would verify with Stripe API
        // For demo, we'll simulate the order data
        const orderData = {
            sessionId: sessionId,
            orderId: this.generateOrderId(),
            customerEmail: 'demo@example.com', // Would come from Stripe
            items: this.getCartItemsForDemo(), // Would come from Stripe metadata
            total: this.getCartTotalForDemo()
        };

        const purchase = this.recordPurchase(orderData);
        return purchase.orderId;
    }

    // Demo helper: Get cart items
    getCartItemsForDemo() {
        // In real system, this would come from Stripe session
        if (window.cart && window.cart.cart.length > 0) {
            return window.cart.cart.map(item => ({
                id: item.id,
                title: item.title,
                price: item.price,
                brandId: window.brandManager ? window.brandManager.currentBrand : 'default'
            }));
        }
        
        // Fallback demo data
        return [{
            id: 'consciousness-revolution',
            title: 'The Consciousness Revolution',
            price: 29.99,
            brandId: 'teneo'
        }];
    }

    // Demo helper: Get cart total
    getCartTotalForDemo() {
        if (window.cart) {
            return window.cart.getCartTotal();
        }
        return 29.99;
    }

    // Create download link (for demo purposes)
    createDownloadLink(bookId, downloadToken) {
        // In production, this would be a secure S3 or CDN link
        // For demo, we'll use a local path
        return `/books/download/${bookId}?token=${downloadToken}`;
    }

    // Check if user has purchased a specific book
    hasPurchasedBook(bookId) {
        return this.purchases.some(purchase => 
            purchase.downloads && purchase.downloads[bookId]
        );
    }

    // Get all active purchases for a user
    getActivePurchases() {
        this.cleanupExpiredPurchases();
        return this.purchases.map(purchase => ({
            orderId: purchase.orderId,
            purchaseDate: purchase.purchaseDate,
            itemCount: Object.keys(purchase.downloads).length,
            status: purchase.status
        }));
    }

    // Reset download count (admin function)
    resetDownloadCount(orderId, bookId) {
        const purchase = this.purchases.find(p => p.orderId === orderId);
        if (purchase && purchase.downloads[bookId]) {
            purchase.downloads[bookId].downloadCount = 0;
            this.savePurchases();
            return true;
        }
        return false;
    }

    // Extend expiration date (admin function)
    extendExpiration(orderId, additionalDays) {
        const purchase = this.purchases.find(p => p.orderId === orderId);
        if (purchase) {
            const currentExpiration = new Date(purchase.expirationDate);
            currentExpiration.setDate(currentExpiration.getDate() + additionalDays);
            purchase.expirationDate = currentExpiration.toISOString();
            this.savePurchases();
            return true;
        }
        return false;
    }
}

// Global delivery instance
let delivery;

// Initialize delivery system when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    delivery = new DigitalDelivery();
    window.delivery = delivery; // Make globally available
    
    console.log('Digital delivery system initialized');
});

// Show notification helper
window.showNotification = function(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `delivery-notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
};

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DigitalDelivery;
}