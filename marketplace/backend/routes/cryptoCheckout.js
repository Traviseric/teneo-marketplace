const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../database/database');

// Generate unique order ID
function generateOrderId() {
    return 'ORD-' + Date.now() + '-' + crypto.randomBytes(8).toString('hex');
}

// Create pending crypto order
router.post('/create-order', async (req, res) => {
    try {
        const { bookId, email, paymentMethod, brandId } = req.body;

        if (!bookId || !email || !paymentMethod) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        // Generate unique order
        const orderId = generateOrderId();

        // Get payment address based on method
        const paymentAddress = getPaymentAddress(paymentMethod);

        // Get amount in crypto
        const amount = getCryptoAmount(paymentMethod, bookId);

        // Store pending order (this would go to database)
        // For now, just return the order info

        res.json({
            success: true,
            orderId,
            paymentMethod,
            address: paymentAddress,
            amount,
            book: {
                id: bookId
            },
            instructions: {
                step1: `Send ${amount} to ${paymentAddress}`,
                step2: `Email proof to orders@asymmetrybooks.com`,
                step3: `Include order ID: ${orderId}`,
                step4: 'Download link sent within 1-24 hours'
            }
        });

    } catch (error) {
        console.error('Order creation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create order'
        });
    }
});

// Verify payment (manual for MVP, automated with BTCPay later)
router.post('/verify-payment', async (req, res) => {
    try {
        const { orderId, transactionId, email } = req.body;

        // In production:
        // 1. Verify transaction on blockchain
        // 2. Mark order as paid
        // 3. Generate download token
        // 4. Send email with download link

        // For MVP: Manual verification
        res.json({
            success: true,
            message: 'Payment verification initiated. Download link will be sent to email within 24 hours.',
            orderId
        });

    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to verify payment'
        });
    }
});

// Get payment address helper
function getPaymentAddress(method) {
    const addresses = {
        'bitcoin': process.env.BTC_ADDRESS || 'CONFIGURE_BTC_ADDRESS_IN_ENV',
        'lightning': process.env.LIGHTNING_ADDRESS || 'CONFIGURE_LIGHTNING_ADDRESS_IN_ENV',
        'monero': process.env.XMR_ADDRESS || 'CONFIGURE_XMR_ADDRESS_IN_ENV'
    };
    return addresses[method] || addresses.bitcoin;
}

// Get crypto amount helper
function getCryptoAmount(method, bookId) {
    // In production: Fetch real-time price and calculate
    // For MVP: Return placeholder amounts
    const amounts = {
        'bitcoin': '0.00015', // ~$10 at $67k BTC
        'lightning': '0.00015',
        'monero': '0.065' // ~$10 at $150 XMR
    };
    return amounts[method] || amounts.bitcoin;
}

module.exports = router;
