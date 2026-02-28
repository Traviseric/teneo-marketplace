const express = require('express');
const router = express.Router();

// Public configuration endpoint
router.get('/public', (req, res) => {
    res.json({
        marketplace: {
            name: process.env.MARKETPLACE_NAME || 'Book Marketplace',
            tagline: process.env.MARKETPLACE_TAGLINE || 'Your Digital Bookstore',
            description: process.env.MARKETPLACE_DESCRIPTION || 'A decentralized marketplace for digital and print books',
            logo: process.env.MARKETPLACE_LOGO || '📚',
            supportEmail: process.env.SUPPORT_EMAIL || 'support@example.com',
            networkEmail: process.env.NETWORK_EMAIL || 'network@example.com'
        },
        branding: {
            primaryColor: process.env.PRIMARY_COLOR || '#7C3AED',
            secondaryColor: process.env.SECONDARY_COLOR || '#6D28D9',
            accentColor: process.env.ACCENT_COLOR || '#FEA644'
        },
        copyright: {
            holder: process.env.COPYRIGHT_HOLDER || 'Your Organization',
            year: process.env.COPYRIGHT_YEAR || new Date().getFullYear()
        },
        features: {
            networkEnabled: process.env.ENABLE_NETWORK === 'true',
            printOnDemand: process.env.ENABLE_PRINT_ON_DEMAND === 'true',
            digitalDownloads: process.env.ENABLE_DIGITAL_DOWNLOADS !== 'false' // Default true
        }
    });
});

// Frontend configuration — serves non-secret env vars to the browser
router.get('/frontend', (req, res) => {
    res.json({
        stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
        marketplaceName: process.env.MARKETPLACE_NAME || 'Teneo Marketplace',
        teneoAuthEnabled: process.env.AUTH_PROVIDER === 'teneo' || process.env.TENEO_AUTH_ENABLED === 'true'
    });
});

module.exports = router;