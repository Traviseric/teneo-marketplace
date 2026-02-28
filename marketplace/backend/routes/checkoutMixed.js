const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const OrderService = require('../services/orderService');
const LuluService = require('../services/luluService');
const emailService = require('../services/emailService');
const { safeMessage } = require('../utils/validate');

// Initialize services
const orderService = new OrderService();
const luluService = new LuluService();

// Create mixed checkout session (digital + physical)
router.post('/create-mixed-session', async (req, res) => {
    try {
        const { 
            items, 
            userEmail, 
            shippingAddress,
            shippingMethod,
            shippingCost 
        } = req.body;

        // Validate items
        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'No items in cart' });
        }

        // Separate digital and physical items
        const digitalItems = [];
        const physicalItems = [];
        let totalAmount = 0;

        for (const item of items) {
            if (item.type === 'bundle') {
                // Handle bundles
                const hasDigital = item.formats.includes('digital_pdf');
                const physicalFormats = item.formats.filter(f => f !== 'digital_pdf');
                
                if (hasDigital) {
                    digitalItems.push({
                        bookId: item.id,
                        bookTitle: item.title,
                        format: 'digital_pdf',
                        price: 0 // Bundle price handled separately
                    });
                }
                
                physicalFormats.forEach(format => {
                    physicalItems.push({
                        bookId: item.id,
                        bookTitle: item.title,
                        format: format,
                        quantity: item.quantity || 1
                    });
                });
                
                totalAmount += item.price * (item.quantity || 1);
            } else {
                // Single format item
                if (item.format === 'digital_pdf') {
                    digitalItems.push(item);
                } else {
                    physicalItems.push(item);
                }
                totalAmount += item.price * (item.quantity || 1);
            }
        }

        // Check if shipping required
        const requiresShipping = physicalItems.length > 0;
        if (requiresShipping && !shippingAddress) {
            return res.status(400).json({ error: 'Shipping address required for physical items' });
        }

        // Add shipping cost
        if (requiresShipping && shippingCost) {
            totalAmount += shippingCost;
        }

        // Generate order ID
        const orderId = `order_${Date.now()}_mixed`;

        // Build line items for Stripe
        const lineItems = [];
        
        // Add product items
        items.forEach(item => {
            lineItems.push({
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: item.bundleName || `${item.title} - ${item.formatName}`,
                        description: `by ${item.author}`,
                        metadata: {
                            bookId: item.id,
                            type: item.type,
                            formats: JSON.stringify(item.formats || [item.format])
                        }
                    },
                    unit_amount: Math.round(item.price * 100),
                },
                quantity: item.quantity || 1
            });
        });

        // Add shipping as line item if applicable
        if (requiresShipping && shippingCost > 0) {
            lineItems.push({
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `Shipping - ${shippingMethod}`,
                        description: 'Delivery to your address'
                    },
                    unit_amount: Math.round(shippingCost * 100),
                },
                quantity: 1
            });
        }

        // Create Stripe checkout session
        const sessionConfig = {
            payment_method_types: ['card'],
            customer_email: userEmail,
            client_reference_id: orderId,
            line_items: lineItems,
            mode: 'payment',
            success_url: `${process.env.FRONTEND_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/cancel.html`,
            metadata: {
                orderId,
                orderType: requiresShipping ? 'mixed' : 'digital',
                hasDigital: digitalItems.length > 0,
                hasPhysical: physicalItems.length > 0,
                digitalItems: JSON.stringify(digitalItems),
                physicalItems: JSON.stringify(physicalItems),
                userEmail
            }
        };

        // Add shipping address collection if needed
        if (requiresShipping) {
            sessionConfig.shipping_address_collection = {
                allowed_countries: ['US', 'CA', 'GB', 'AU']
            };
            
            // Pre-fill shipping if provided
            if (shippingAddress) {
                sessionConfig.metadata.shippingAddress = JSON.stringify(shippingAddress);
                sessionConfig.metadata.shippingMethod = shippingMethod;
            }
        }

        const session = await stripe.checkout.sessions.create(sessionConfig);

        // Create order record
        await orderService.createOrder({
            orderId,
            stripeSessionId: session.id,
            customerEmail: userEmail,
            bookId: items[0].id, // Primary book ID
            bookTitle: items.map(i => i.title).join(', '),
            bookAuthor: items.map(i => i.author).join(', '),
            format: requiresShipping ? 'mixed' : 'digital',
            price: totalAmount,
            currency: 'USD',
            metadata: {
                orderType: requiresShipping ? 'mixed' : 'digital',
                itemCount: items.length,
                hasDigital: digitalItems.length > 0,
                hasPhysical: physicalItems.length > 0,
                shippingMethod,
                shippingCost
            }
        });

        res.json({ 
            checkoutUrl: session.url,
            sessionId: session.id,
            orderId,
            requiresShipping
        });

    } catch (error) {
        console.error('Mixed checkout error:', error);
        res.status(500).json({ 
            error: 'Failed to create checkout session',
            message: safeMessage(error)
        });
    }
});

// Handle mixed order fulfillment after payment
async function processMixedOrder(session) {
    const { 
        orderId, 
        digitalItems, 
        physicalItems,
        userEmail 
    } = session.metadata;

    const digitalItemsParsed = JSON.parse(digitalItems || '[]');
    const physicalItemsParsed = JSON.parse(physicalItems || '[]');

    // Process digital items immediately — isolate from physical so a digital failure
    // does not prevent physical items from being submitted to Lulu
    if (digitalItemsParsed.length > 0) {
        try {
            await processDigitalDelivery(orderId, digitalItemsParsed, userEmail);
        } catch (digitalErr) {
            // fulfillment_status already set to 'digital_delivery_failed' inside processDigitalDelivery
            console.error('Digital delivery failed for order', orderId, '— physical processing will continue:', digitalErr.message);
        }
    }

    // Process physical items through Lulu
    if (physicalItemsParsed.length > 0) {
        const shippingAddress = session.shipping || JSON.parse(session.metadata.shippingAddress || '{}');
        await processPhysicalDelivery(orderId, physicalItemsParsed, shippingAddress, session.metadata.shippingMethod);
    }

    // Send comprehensive order confirmation
    await sendMixedOrderConfirmation(orderId, userEmail, digitalItemsParsed, physicalItemsParsed);
}

// Process digital delivery
async function processDigitalDelivery(orderId, digitalItems, userEmail) {
    try {
        // Update order with download token
        const { downloadToken } = await orderService.completeOrder(orderId, 'digital_fulfilled');

        // Generate download URLs
        const downloadUrls = digitalItems.map(item => ({
            bookTitle: item.bookTitle,
            downloadUrl: `${process.env.FRONTEND_URL}/api/download/${downloadToken}?book=${item.bookId}`
        }));

        // Send download email
        await emailService.sendDownloadEmail({
            userEmail,
            bookTitle: digitalItems.map(i => i.bookTitle).join(', '),
            bookAuthor: 'Multiple Authors',
            downloadUrls,
            orderId,
            expiresIn: '24 hours',
            maxDownloads: 5
        });

    } catch (error) {
        console.error('Digital delivery error:', error);

        // Record failure on the order so admin can identify affected customers
        try {
            await orderService.updateOrderStatus(orderId, {
                fulfillment_status: 'digital_delivery_failed',
                metadata: JSON.stringify({
                    digital_error: error.message,
                    failed_at: new Date().toISOString()
                })
            });
        } catch (updateErr) {
            console.error('Failed to record digital delivery error on order:', updateErr);
        }

        // Re-throw so the caller (processMixedOrder) is aware of the failure
        throw error;
    }
}

// Process physical delivery through Lulu
async function processPhysicalDelivery(orderId, physicalItems, shippingAddress, shippingMethod) {
    try {
        // Prepare line items for Lulu
        const lineItems = physicalItems.map(item => ({
            bookId: item.bookId,
            formatType: item.format,
            title: item.bookTitle,
            quantity: item.quantity || 1
        }));

        // Create Lulu print job
        const printJobResult = await luluService.createPrintJob({
            lineItems,
            shippingAddress,
            shippingMethod: shippingMethod || 'GROUND',
            contactEmail: shippingAddress.email,
            externalId: orderId
        });

        if (printJobResult.success) {
            // Save print job details
            await luluService.savePrintJob({
                orderId,
                bookId: physicalItems[0].bookId,
                formatType: 'mixed',
                luluPrintJobId: printJobResult.printJobId,
                luluOrderId: printJobResult.orderId,
                status: printJobResult.status,
                quantity: physicalItems.reduce((sum, item) => sum + (item.quantity || 1), 0),
                shippingMethod,
                shippingCost: 0 // Already included in order total
            });

            // Update order status
            await orderService.updateOrderStatus(orderId, {
                fulfillment_status: 'print_job_created',
                metadata: JSON.stringify({
                    luluPrintJobId: printJobResult.printJobId,
                    printStatus: printJobResult.status
                })
            });
        }

    } catch (error) {
        console.error('Physical delivery error:', error);
        // Don't fail the entire order if print job fails
        await orderService.updateOrderStatus(orderId, {
            fulfillment_status: 'print_job_failed',
            metadata: JSON.stringify({ error: error.message })
        });
    }
}

// Send comprehensive order confirmation
async function sendMixedOrderConfirmation(orderId, userEmail, digitalItems, physicalItems) {
    const emailData = {
        userEmail,
        orderId,
        orderType: 'mixed',
        digitalItems: digitalItems.map(item => ({
            title: item.bookTitle,
            format: 'PDF',
            status: 'Ready for download'
        })),
        physicalItems: physicalItems.map(item => ({
            title: item.bookTitle,
            format: item.format,
            quantity: item.quantity || 1,
            status: 'Being prepared for printing'
        }))
    };

    await emailService.sendMixedOrderConfirmation(emailData);
}

// Calculate shipping endpoint
router.post('/shipping/calculate', async (req, res) => {
    try {
        const { lineItems, destination } = req.body;

        if (!lineItems || lineItems.length === 0) {
            return res.status(400).json({ error: 'No items to ship' });
        }

        // Build shipping address
        const shippingAddress = {
            country: destination.country || 'US',
            state: destination.state || '',
            city: destination.city || '',
            zip: destination.zip
        };

        // Get shipping options from Lulu
        const result = await luluService.getShippingOptions(lineItems, shippingAddress);

        if (result.success) {
            res.json({
                success: true,
                options: result.options
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }

    } catch (error) {
        console.error('Shipping calculation error:', error);
        res.status(500).json({
            error: 'Failed to calculate shipping'
        });
    }
});

module.exports = {
    router,
    processMixedOrder
};