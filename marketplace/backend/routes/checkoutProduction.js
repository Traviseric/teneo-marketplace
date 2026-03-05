const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const OrderService = require('../services/orderService');
const emailService = require('../services/emailService');
const axios = require('axios');
const { processMixedOrder } = require('./checkoutMixed');
const { safeMessage } = require('../utils/validate');
const db = require('../database/database');
const {
    sanitizeBrandId,
    lookupBookPrice,
    applyCouponToPrice,
    getNextReadOffer
} = require('../services/checkoutOfferService');

function sanitizeMetadataValue(value, maxLength = 120) {
    if (!value || typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.slice(0, maxLength);
}

// Initialize order service
const orderService = new OrderService();

// Determine if we're in production mode
const isProduction = process.env.NODE_ENV === 'production';

// Create checkout session
router.post('/create-session', async (req, res) => {
    try {
        // Do not destructure 'price' from req.body — client-supplied price is untrusted
        const {
            bookId,
            format,
            brandId: rawBrandId,
            bookTitle,
            bookAuthor,
            userEmail,
            couponCode
        } = req.body;
        const brandId = sanitizeBrandId(rawBrandId);
        const funnelId = sanitizeMetadataValue(req.body.funnelId, 80);
        const funnelSessionId = sanitizeMetadataValue(req.body.funnelSessionId, 120);

        // Validate required fields
        if (!bookId || !format || !bookTitle || !bookAuthor || !userEmail) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['bookId', 'format', 'bookTitle', 'bookAuthor', 'userEmail']
            });
        }

        // Look up authoritative price from catalog — never use the client-supplied price
        const catalogPrice = lookupBookPrice(bookId, format, brandId);
        if (catalogPrice == null) {
            return res.status(400).json({
                error: 'Book not found in catalog',
                bookId,
                format
            });
        }

        const pricing = applyCouponToPrice(catalogPrice, couponCode);
        const unitPrice = pricing.finalPrice;
        const nextReadOffer = getNextReadOffer(bookId, brandId);

        // Generate order ID
        const orderId = `order_${Date.now()}_${bookId}`;

        // Create Stripe checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            customer_email: userEmail,
            client_reference_id: orderId,
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: bookTitle,
                        description: `by ${bookAuthor} - Format: ${format}`,
                        metadata: {
                            bookId,
                            format,
                            bookTitle,
                            bookAuthor
                        }
                    },
                    unit_amount: Math.round(unitPrice * 100),
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${process.env.FRONTEND_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/cancel.html`,
            metadata: {
                orderId,
                bookId,
                format,
                bookTitle,
                bookAuthor,
                userEmail,
                brandId: brandId || '',
                couponCode: pricing.couponCode || '',
                couponDiscount: pricing.discountAmount ? String(pricing.discountAmount) : '',
                funnelId: funnelId || '',
                funnelSessionId: funnelSessionId || ''
            },
            // Production-specific settings
            payment_intent_data: {
                description: `Order ${orderId}: ${bookTitle}`,
                statement_descriptor: 'TENEO BOOKS',
                statement_descriptor_suffix: bookId.substring(0, 10).toUpperCase(),
                metadata: {
                    orderId,
                    bookId
                }
            },
            // Enable address collection in production
            billing_address_collection: isProduction ? 'required' : 'auto'
        });

        // Create order record in database
        await orderService.createOrder({
            orderId,
            stripeSessionId: session.id,
            customerEmail: userEmail,
            bookId,
            bookTitle,
            bookAuthor,
            format,
            price: catalogPrice,
            currency: 'USD',
            metadata: {
                sessionUrl: session.url,
                createdAt: new Date().toISOString(),
                couponCode: pricing.couponCode || null,
                discountAmount: pricing.discountAmount || 0,
                brandId: brandId || null,
                nextReadOffer
            }
        });

        res.json({ 
            checkoutUrl: session.url,
            sessionId: session.id,
            orderId,
            pricing: {
                basePrice: pricing.basePrice,
                finalPrice: pricing.finalPrice,
                discountAmount: pricing.discountAmount,
                couponCode: pricing.couponCode
            },
            nextReadOffer
        });

    } catch (error) {
        console.error('Stripe session creation error:', error);
        
        // Send appropriate error response
        if (error.type === 'StripeCardError') {
            res.status(400).json({
                error: 'Card error',
                message: safeMessage(error)
            });
        } else if (error.type === 'StripeInvalidRequestError') {
            res.status(400).json({
                error: 'Invalid request',
                message: safeMessage(error)
            });
        } else {
            res.status(500).json({
                error: 'Failed to create checkout session',
                message: isProduction ? 'An error occurred' : error.message
            });
        }
    }
});

// Retrieve Stripe session details for success page analytics
router.get('/session/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        if (!sessionId || !sessionId.startsWith('cs_')) {
            return res.status(400).json({ error: 'Invalid session ID' });
        }

        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['line_items']
        });

        res.json({
            success: true,
            orderId: session.metadata?.orderId || sessionId,
            bookId: session.metadata?.bookId || '',
            bookTitle: session.metadata?.bookTitle || 'Book purchase',
            bookAuthor: session.metadata?.bookAuthor || '',
            brandId: session.metadata?.brandId || '',
            format: session.metadata?.format || '',
            amount: session.amount_total || 0,
            currency: session.currency || 'usd',
            customerEmail: session.customer_email || session.customer_details?.email || '',
            funnelId: session.metadata?.funnelId || '',
            funnelSessionId: session.metadata?.funnelSessionId || '',
            nextReadOffer: getNextReadOffer(
                session.metadata?.bookId,
                sanitizeBrandId(session.metadata?.brandId)
            ),
            items: (session.line_items?.data || []).map(item => ({
                name: item.description || item.price?.product_data?.name || 'Book',
                quantity: item.quantity,
                amount: item.amount_total
            }))
        });
    } catch (error) {
        console.error('Error retrieving Stripe session:', error);
        res.status(500).json({ error: 'Failed to retrieve session', message: safeMessage(error) });
    }
});

// Stripe webhook handler with signature verification
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.error('Webhook secret not configured');
        return res.status(500).send('Webhook secret not configured');
    }

    let event;

    try {
        // Verify webhook signature
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error(`Webhook signature verification failed:`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Check if we've already processed this event
    const alreadyProcessed = await orderService.isEventProcessed(event.id);
    if (alreadyProcessed) {
        console.log(`Event ${event.id} already processed, skipping`);
        return res.json({ received: true, skipped: true });
    }

    // Log the event
    await orderService.logPaymentEvent({
        stripeEventId: event.id,
        eventType: event.type,
        orderId: event.data.object.metadata?.orderId,
        payload: event.data.object
    });

    // Handle the event
    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(event.data.object);
                break;
                
            case 'checkout.session.expired':
                await handleCheckoutExpired(event.data.object);
                break;
                
            case 'payment_intent.succeeded':
                await handlePaymentSucceeded(event.data.object);
                break;
                
            case 'payment_intent.payment_failed':
                await handlePaymentFailed(event.data.object);
                break;
                
            case 'charge.refunded':
                await handleChargeRefunded(event.data.object);
                break;
                
            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        // Mark event as processed
        await orderService.markEventProcessed(event.id, true);
        
    } catch (error) {
        console.error(`Error processing webhook ${event.type}:`, error);
        await orderService.markEventProcessed(event.id, false, error.message);
        
        // Still return 200 to prevent Stripe from retrying
        return res.json({ received: true, error: safeMessage(error) });
    }

    res.json({ received: true });
});

// Handle successful checkout
async function handleCheckoutCompleted(session) {
    console.log('Processing successful checkout:', session.id);

    // Route mixed orders (digital + physical) to the dedicated mixed fulfillment handler
    if (session.metadata && session.metadata.orderType === 'mixed') {
        console.log('Mixed order detected, routing to processMixedOrder');
        return await processMixedOrder(session);
    }

    const { orderId, bookId, bookTitle, bookAuthor, userEmail } = session.metadata;

    try {
        if (session.metadata?.funnelId) {
            const purchaseMetadata = JSON.stringify({
                orderId,
                amount: session.amount_total ? session.amount_total / 100 : null,
                currency: session.currency || 'usd',
                bookId,
                bookTitle
            });
            db.run(
                `INSERT INTO funnel_events (funnel_id, page_slug, event_type, session_id, metadata)
                 VALUES (?, ?, 'purchase', ?, ?)`,
                [
                    session.metadata.funnelId,
                    session.metadata.funnelId,
                    session.metadata.funnelSessionId || null,
                    purchaseMetadata
                ],
                err => {
                    if (err) {
                        console.warn('Failed to record funnel purchase event:', err.message);
                    }
                }
            );
        }

        // Update order status to completed
        const { downloadToken, downloadExpiry } = await orderService.completeOrder(
            orderId,
            session.payment_intent
        );

        // Send order confirmation email
        await emailService.sendOrderConfirmation({
            userEmail,
            bookTitle,
            bookAuthor,
            price: session.amount_total / 100,
            orderId,
            paymentMethod: session.payment_method_types[0]
        });

        // Log email sent
        await orderService.logEmail({
            orderId,
            emailType: 'order_confirmation',
            recipientEmail: userEmail,
            subject: `Order Confirmed: "${bookTitle}"`,
            status: 'sent'
        });

        // Generate download URL
        const downloadUrl = `${process.env.FRONTEND_URL}/api/download/${downloadToken}`;

        // Send download email
        const emailResult = await emailService.sendDownloadEmail({
            userEmail,
            bookTitle,
            bookAuthor,
            downloadUrl,
            orderId,
            expiresIn: '24 hours',
            maxDownloads: 5
        });

        // Log download email
        await orderService.logEmail({
            orderId,
            emailType: 'download_link',
            recipientEmail: userEmail,
            subject: `📚 Your book "${bookTitle}" is ready for download`,
            status: emailResult.success ? 'sent' : 'failed',
            errorMessage: emailResult.error,
            messageId: emailResult.messageId
        });

        // Mark order as fulfilled
        await orderService.fulfillOrder(orderId);

        console.log(`Order ${orderId} fulfilled successfully`);

    } catch (error) {
        console.error(`Error processing checkout completion for ${orderId}:`, error);
        throw error;
    }
}

// Handle expired checkout session
async function handleCheckoutExpired(session) {
    const { orderId } = session.metadata || {};
    if (orderId) {
        await orderService.updateOrderStatus(orderId, {
            status: 'expired',
            payment_status: 'expired'
        });
    }
}

// Handle successful payment
async function handlePaymentSucceeded(paymentIntent) {
    console.log('Payment succeeded:', paymentIntent.id);
    // Additional payment success handling if needed
}

// Handle failed payment
async function handlePaymentFailed(paymentIntent) {
    const { orderId } = paymentIntent.metadata || {};
    
    if (orderId) {
        await orderService.failOrder(orderId, paymentIntent.last_payment_error?.message || 'Payment failed');
        
        // Get order details for email
        const order = await orderService.getOrder(orderId);
        
        if (order && order.customer_email) {
            // Send payment failure email
            try {
                await emailService.sendPaymentFailureEmail({
                    userEmail: order.customer_email,
                    bookTitle: order.book_title,
                    orderId,
                    errorMessage: paymentIntent.last_payment_error?.message
                });
            } catch (error) {
                console.error('Error sending payment failure email:', error);
            }
        }
    }
}

// Handle refund
async function handleChargeRefunded(charge) {
    console.log('Processing refund:', charge.id);
    
    // Get the payment intent to find order
    const paymentIntent = await stripe.paymentIntents.retrieve(charge.payment_intent);
    const { orderId } = paymentIntent.metadata || {};
    
    if (orderId) {
        const refundId = `refund_${Date.now()}`;
        const refundAmount = charge.amount_refunded / 100;
        
        await orderService.refundOrder(orderId, {
            refundId,
            stripeRefundId: charge.refunds.data[0]?.id,
            amount: refundAmount,
            reason: charge.refunds.data[0]?.reason || 'requested_by_customer'
        });
        
        // Get order details for email
        const order = await orderService.getOrder(orderId);
        
        if (order && order.customer_email) {
            // Send refund confirmation email
            try {
                await emailService.sendRefundConfirmationEmail({
                    userEmail: order.customer_email,
                    bookTitle: order.book_title,
                    orderId,
                    refundAmount,
                    currency: order.currency
                });
            } catch (error) {
                console.error('Error sending refund email:', error);
            }
        }
    }
}

// Get order status
router.get('/order/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await orderService.getOrder(orderId);
        
        if (!order) {
            return res.status(404).json({
                error: 'Order not found'
            });
        }
        
        res.json({
            success: true,
            order: {
                orderId: order.order_id,
                status: order.status,
                paymentStatus: order.payment_status,
                fulfillmentStatus: order.fulfillment_status,
                bookTitle: order.book_title,
                bookAuthor: order.book_author,
                price: order.price,
                createdAt: order.created_at
            }
        });
        
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({
            error: 'Failed to fetch order'
        });
    }
});

// Process refund (admin endpoint)
router.post('/refund/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { reason = 'requested_by_customer', amount } = req.body;
        
        // Get order
        const order = await orderService.getOrder(orderId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        if (!order.stripe_payment_intent_id) {
            return res.status(400).json({ error: 'Order has no payment to refund' });
        }
        
        // Calculate refund amount
        const refundAmount = amount || order.price;
        
        // Create Stripe refund
        const refund = await stripe.refunds.create({
            payment_intent: order.stripe_payment_intent_id,
            amount: Math.round(refundAmount * 100),
            reason,
            metadata: {
                orderId: order.order_id
            }
        });
        
        res.json({
            success: true,
            refund: {
                id: refund.id,
                amount: refund.amount / 100,
                status: refund.status,
                reason: refund.reason
            }
        });
        
    } catch (error) {
        console.error('Refund error:', error);
        res.status(500).json({
            error: 'Failed to process refund',
            message: isProduction ? 'An error occurred' : error.message
        });
    }
});

// Health check for monitoring
router.get('/health', async (req, res) => {
    try {
        // Test Stripe connection
        await stripe.paymentIntents.list({ limit: 1 });
        
        res.json({
            status: 'healthy',
            stripe: 'connected',
            environment: isProduction ? 'production' : 'development'
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: safeMessage(error)
        });
    }
});

module.exports = router;
