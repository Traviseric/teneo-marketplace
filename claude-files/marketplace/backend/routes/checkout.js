const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../services/database-service');
const emailService = require('../services/email-service');
const crypto = require('crypto');

// Helper to generate order ID
function generateOrderId() {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    return `TEN-${timestamp}-${random.toUpperCase()}`;
}

// POST /api/checkout/create-session
// Create a production-ready checkout session
router.post('/create-session', async (req, res) => {
    try {
        const { items, customerEmail, brand = 'default' } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No items provided for checkout'
            });
        }

        if (!customerEmail) {
            return res.status(400).json({
                success: false,
                error: 'Customer email is required'
            });
        }

        // Create or get customer
        const customer = await db.createCustomer(customerEmail);

        // Calculate total and prepare line items
        let total = 0;
        const lineItems = items.map(item => {
            const amount = Math.round(item.price * 100); // Convert to cents
            total += amount * (item.quantity || 1);

            return {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: item.title,
                        description: `by ${item.author}`,
                        metadata: {
                            bookId: item.id,
                            brand: brand
                        }
                    },
                    unit_amount: amount,
                },
                quantity: item.quantity || 1,
            };
        });

        // Create order ID
        const orderId = generateOrderId();

        // Determine if we're in test or live mode
        const isTestMode = process.env.STRIPE_MODE !== 'live';

        // Create Stripe checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            customer_email: customerEmail,
            success_url: `${process.env.SITE_URL || req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
            cancel_url: `${process.env.SITE_URL || req.headers.origin}/cancel`,
            metadata: {
                orderId: orderId,
                brand: brand,
                customerId: customer.id.toString(),
                itemCount: items.length.toString(),
                isTestMode: isTestMode.toString()
            },
            // Production features
            allow_promotion_codes: true,
            billing_address_collection: 'required',
            shipping_address_collection: {
                allowed_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'ES', 'IT', 'NL', 'SE', 'NO', 'DK', 'FI', 'CH', 'AT', 'BE', 'IE', 'NZ', 'JP', 'SG', 'HK']
            },
            automatic_tax: {
                enabled: false // Enable this when you have tax configuration
            },
            invoice_creation: {
                enabled: true,
                invoice_data: {
                    description: `Order ${orderId} - Digital Books`,
                    metadata: {
                        orderId: orderId
                    },
                    custom_fields: [
                        {
                            name: 'Order ID',
                            value: orderId
                        }
                    ],
                    footer: 'Thank you for your purchase!'
                }
            }
        });

        // Create pending order in database
        const dbOrderId = await db.createOrder({
            orderId: orderId,
            customerId: customer.id,
            stripeSessionId: session.id,
            brand: brand,
            total: total / 100, // Convert back to dollars
            status: 'pending',
            paymentStatus: 'pending',
            metadata: {
                items: items,
                sessionUrl: session.url,
                isTestMode: isTestMode
            }
        });

        // Add order items
        await db.addOrderItems(dbOrderId, items);

        // Track checkout creation
        await db.trackEvent({
            eventType: 'checkout_created',
            orderId: dbOrderId,
            customerId: customer.id,
            brand: brand,
            metadata: {
                sessionId: session.id,
                total: total / 100
            }
        });

        res.json({
            success: true,
            sessionId: session.id,
            orderId: orderId,
            checkoutUrl: session.url,
            isTestMode: isTestMode
        });

    } catch (error) {
        console.error('Checkout session error:', error);
        
        // Check for specific Stripe errors
        if (error.type === 'StripeAuthenticationError') {
            return res.status(500).json({
                success: false,
                error: 'Payment system configuration error. Please contact support.',
                isConfigError: true
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to create checkout session',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// POST /api/checkout/webhook
// Handle Stripe webhooks for order completion
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.error('Webhook secret not configured');
        return res.status(500).send('Webhook not configured');
    }

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Check if we've already processed this event (idempotency)
    const isProcessed = await db.isWebhookProcessed(event.id);
    if (isProcessed) {
        console.log('Webhook already processed:', event.id);
        return res.json({ received: true, duplicate: true });
    }

    // Record the webhook
    await db.recordWebhook(event.id, event.type, event.data);

    try {
        // Handle the event
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(event.data.object);
                break;

            case 'payment_intent.succeeded':
                await handlePaymentSucceeded(event.data.object);
                break;

            case 'payment_intent.payment_failed':
                await handlePaymentFailed(event.data.object);
                break;

            case 'customer.created':
                await handleCustomerCreated(event.data.object);
                break;

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        // Mark webhook as processed
        await db.markWebhookProcessed(event.id);

        res.json({ received: true });

    } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).send('Webhook processing failed');
    }
});

// Handle successful checkout completion
async function handleCheckoutCompleted(session) {
    console.log('Processing checkout completion:', session.id);

    const orderId = session.metadata.orderId;
    const customerId = session.metadata.customerId;
    const brand = session.metadata.brand || 'default';
    const isTestMode = session.metadata.isTestMode === 'true';

    try {
        // Update order status
        await db.updateOrderStatus(orderId, 'completed', 'paid');

        // Get complete order details
        const order = await db.getCompleteOrder(orderId);
        if (!order) {
            throw new Error('Order not found: ' + orderId);
        }

        // Create download tokens for each item
        const downloadTokens = [];
        for (const item of order.items) {
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

            await db.createDownloadToken({
                token: token,
                orderId: orderId,
                bookId: item.book_id,
                customerEmail: order.email,
                maxDownloads: 5,
                expiresAt: expiresAt
            });

            downloadTokens.push({
                bookId: item.book_id,
                title: item.title,
                token: token,
                downloadUrl: `${process.env.SITE_URL || 'http://localhost:3001'}/api/download/file/${item.book_id}?token=${token}`,
                maxDownloads: 5
            });
        }

        // Send order confirmation email
        const emailResult = await emailService.sendOrderConfirmation(order.email, {
            orderId: orderId,
            customerName: order.customer_name,
            date: order.created_at,
            total: order.total,
            brand: brand,
            items: order.items.map(item => ({
                id: item.book_id,
                title: item.title,
                author: item.author,
                price: item.price
            })),
            downloadUrl: `${process.env.SITE_URL || 'http://localhost:3001'}/downloads?order=${orderId}`
        });

        // Log email
        await db.logEmail({
            orderId: orderId,
            customerEmail: order.email,
            emailType: 'order_confirmation',
            subject: `Order Confirmation - ${orderId}`,
            status: emailResult.success ? 'sent' : 'failed',
            messageId: emailResult.messageId,
            error: emailResult.error
        });

        // Send download links email
        const downloadEmailResult = await emailService.sendDownloadLinks(
            order.email,
            order.items,
            downloadTokens,
            brand
        );

        // Log download email
        await db.logEmail({
            orderId: orderId,
            customerEmail: order.email,
            emailType: 'download_links',
            subject: 'Your Download Links',
            status: downloadEmailResult.success ? 'sent' : 'failed',
            messageId: downloadEmailResult.messageId,
            error: downloadEmailResult.error
        });

        // Send welcome email for first-time customers
        const customerOrders = await db.getCustomerOrders(order.email);
        if (customerOrders.length === 1) {
            const welcomeResult = await emailService.sendWelcomeEmail(
                order.email,
                order.customer_name,
                brand
            );

            await db.logEmail({
                orderId: orderId,
                customerEmail: order.email,
                emailType: 'welcome',
                subject: 'Welcome!',
                status: welcomeResult.success ? 'sent' : 'failed',
                messageId: welcomeResult.messageId,
                error: welcomeResult.error
            });
        }

        // Track successful order
        await db.trackEvent({
            eventType: 'order_completed',
            orderId: order.id,
            customerId: customerId,
            brand: brand,
            metadata: {
                total: order.total,
                itemCount: order.items.length,
                isTestMode: isTestMode
            }
        });

        console.log(`Order ${orderId} completed successfully`);

    } catch (error) {
        console.error('Error processing checkout completion:', error);
        
        // Update order with error status
        await db.updateOrderStatus(orderId, 'error', 'paid');
        
        // Track error
        await db.trackEvent({
            eventType: 'order_error',
            orderId: orderId,
            metadata: {
                error: error.message,
                stage: 'checkout_completed'
            }
        });
    }
}

// Handle successful payment
async function handlePaymentSucceeded(paymentIntent) {
    console.log('Payment succeeded:', paymentIntent.id);
    
    // Track successful payment
    await db.trackEvent({
        eventType: 'payment_succeeded',
        metadata: {
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency
        }
    });
}

// Handle failed payment
async function handlePaymentFailed(paymentIntent) {
    console.log('Payment failed:', paymentIntent.id);
    
    // Track failed payment
    await db.trackEvent({
        eventType: 'payment_failed',
        metadata: {
            paymentIntentId: paymentIntent.id,
            error: paymentIntent.last_payment_error?.message
        }
    });
}

// Handle new customer creation
async function handleCustomerCreated(customer) {
    console.log('New Stripe customer created:', customer.id);
    
    // Update customer with Stripe ID if they exist
    if (customer.email) {
        const dbCustomer = await db.getCustomerByEmail(customer.email);
        if (dbCustomer && !dbCustomer.stripe_customer_id) {
            await db.createCustomer(customer.email, customer.name, customer.id);
        }
    }
}

// GET /api/checkout/verify/:orderId
// Verify order status
router.get('/verify/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        
        const order = await db.getOrderById(orderId);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        res.json({
            success: true,
            order: {
                orderId: order.order_id,
                status: order.status,
                paymentStatus: order.payment_status,
                total: order.total,
                brand: order.brand,
                createdAt: order.created_at,
                completedAt: order.completed_at
            }
        });

    } catch (error) {
        console.error('Order verification error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to verify order'
        });
    }
});

// GET /api/checkout/mode
// Get current Stripe mode (test/live)
router.get('/mode', (req, res) => {
    const isTestMode = process.env.STRIPE_MODE !== 'live';
    const hasKeys = !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_PUBLISHABLE_KEY;
    
    res.json({
        success: true,
        mode: isTestMode ? 'test' : 'live',
        configured: hasKeys,
        webhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
        emailConfigured: !!process.env.EMAIL_USER
    });
});

module.exports = router;