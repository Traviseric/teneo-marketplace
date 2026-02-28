const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const axios = require('axios');
const db = require('../database/database');
const { isValidEmail } = require('../utils/validate');

// Generate unique order ID
function generateOrderId() {
    return 'ORD-' + Date.now() + '-' + crypto.randomBytes(8).toString('hex');
}

// ─── Real-time Crypto Pricing ─────────────────────────────────────────────────

// CoinGecko coin IDs for each payment method
const COIN_IDS = {
    bitcoin: 'bitcoin',
    lightning: 'bitcoin', // Lightning uses BTC
    monero: 'monero'
};

// Price cache: { coinId: { usdPrice, fetchedAt } }
const priceCache = new Map();
const PRICE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch real-time USD price for a coin from CoinGecko (free tier, no key needed).
 * Falls back to hardcoded approximate values if the API is unavailable.
 */
async function getUsdPrice(coinId) {
    const cached = priceCache.get(coinId);
    if (cached && Date.now() - cached.fetchedAt < PRICE_CACHE_TTL_MS) {
        return cached.usdPrice;
    }

    try {
        const resp = await axios.get(
            `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
            { timeout: 5000 }
        );
        const usdPrice = resp.data[coinId] && resp.data[coinId].usd;
        if (!usdPrice) throw new Error('No price data returned');

        priceCache.set(coinId, { usdPrice, fetchedAt: Date.now() });
        return usdPrice;
    } catch (error) {
        console.warn(`⚠️  CoinGecko price fetch failed for ${coinId}: ${error.message} — using fallback`);
        // Hardcoded fallbacks (will be slightly wrong but allow checkout to proceed)
        const fallbacks = { bitcoin: 65000, monero: 150 };
        return fallbacks[coinId] || 65000;
    }
}

/**
 * Convert USD amount to crypto amount using real-time rates.
 */
async function getCryptoAmount(method, usdAmount) {
    const coinId = COIN_IDS[method] || 'bitcoin';
    const usdPerCoin = await getUsdPrice(coinId);
    return (usdAmount / usdPerCoin).toFixed(8);
}

// ─── DB Helpers ───────────────────────────────────────────────────────────────

function dbRun(sql, params) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err); else resolve(this);
        });
    });
}

function dbGet(sql, params) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err); else resolve(row);
        });
    });
}

// Get payment address helper
function getPaymentAddress(method) {
    const addresses = {
        bitcoin: process.env.BTC_ADDRESS || 'CONFIGURE_BTC_ADDRESS_IN_ENV',
        lightning: process.env.LIGHTNING_ADDRESS || 'CONFIGURE_LIGHTNING_ADDRESS_IN_ENV',
        monero: process.env.XMR_ADDRESS || 'CONFIGURE_XMR_ADDRESS_IN_ENV'
    };
    return addresses[method] || addresses.bitcoin;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// Create pending crypto order
router.post('/create-order', async (req, res) => {
    try {
        const { bookId, bookTitle, bookAuthor, email, paymentMethod, brandId, amountUsd } = req.body;

        if (!bookId || !paymentMethod) {
            return res.status(400).json({ success: false, error: 'Missing required fields: bookId and paymentMethod' });
        }
        if (!isValidEmail(email)) {
            return res.status(400).json({ success: false, error: 'Valid email address required' });
        }

        const usdAmount = parseFloat(amountUsd) || 10; // default $10 if not provided
        const orderId = generateOrderId();
        const paymentAddress = getPaymentAddress(paymentMethod);
        const cryptoAmount = await getCryptoAmount(paymentMethod, usdAmount);

        // Save order to database
        await dbRun(
            `INSERT INTO orders
             (order_id, customer_email, book_id, book_title, book_author, format, price, currency, status, payment_status, metadata)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending_payment', ?)`,
            [
                orderId,
                email.toLowerCase(),
                bookId,
                bookTitle || bookId,
                bookAuthor || 'Unknown Author',
                'digital',
                usdAmount,
                'USD',
                JSON.stringify({ paymentMethod, cryptoAmount, walletAddress: paymentAddress, brandId: brandId || 'default' })
            ]
        );

        res.json({
            success: true,
            orderId,
            paymentMethod,
            address: paymentAddress,
            amount: cryptoAmount,
            amountUsd,
            book: { id: bookId, title: bookTitle || bookId },
            instructions: {
                step1: `Send ${cryptoAmount} ${paymentMethod.toUpperCase()} to: ${paymentAddress}`,
                step2: `Include order ID in memo/notes: ${orderId}`,
                step3: `Email payment proof to orders@teneo.market with subject: Order ${orderId}`,
                step4: 'Your download link will be sent within 1–24 hours after verification'
            },
            statusUrl: `/api/crypto/order-status/${orderId}`
        });

    } catch (error) {
        console.error('Crypto order creation error:', error);
        res.status(500).json({ success: false, error: 'Failed to create order' });
    }
});

// Get order status by order ID
router.get('/order-status/:orderId', async (req, res) => {
    try {
        const order = await dbGet(
            'SELECT order_id, customer_email, book_title, price, status, payment_status, created_at FROM orders WHERE order_id = ?',
            [req.params.orderId]
        );
        if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

        res.json({
            success: true,
            orderId: order.order_id,
            email: order.customer_email,
            bookTitle: order.book_title,
            amountUsd: order.price,
            status: order.status,
            paymentStatus: order.payment_status,
            createdAt: order.created_at
        });
    } catch (error) {
        console.error('Order status error:', error);
        res.status(500).json({ success: false, error: 'Failed to get order status' });
    }
});

// Get current exchange rates (for frontend display)
router.get('/rates', async (req, res) => {
    try {
        const [btcPrice, xmrPrice] = await Promise.all([
            getUsdPrice('bitcoin'),
            getUsdPrice('monero')
        ]);
        res.json({
            success: true,
            rates: {
                bitcoin: btcPrice,
                lightning: btcPrice,
                monero: xmrPrice
            },
            currency: 'USD',
            cachedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Rates error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch rates' });
    }
});

// Verify payment (manual for MVP; automated with BTCPay in future)
router.post('/verify-payment', async (req, res) => {
    try {
        const { orderId, transactionId } = req.body;
        if (!orderId) return res.status(400).json({ success: false, error: 'orderId required' });

        // Update order with transaction ID for admin review
        await dbRun(
            `UPDATE orders SET metadata = json_set(COALESCE(metadata, '{}'), '$.transactionId', ?), updated_at = CURRENT_TIMESTAMP WHERE order_id = ?`,
            [transactionId || '', orderId]
        );

        res.json({
            success: true,
            message: 'Payment verification submitted. Your download link will be sent within 24 hours after we confirm the transaction.',
            orderId
        });
    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({ success: false, error: 'Failed to verify payment' });
    }
});

module.exports = router;
