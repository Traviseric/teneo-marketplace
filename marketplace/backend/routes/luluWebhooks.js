const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const LuluService = require('../services/luluService');
const OrderService = require('../services/orderService');
const emailService = require('../services/emailService');

const luluService = new LuluService();
const orderService = new OrderService();

// Lulu webhook signature verification
function verifyLuluWebhook(payload, signature) {
    const secret = process.env.LULU_WEBHOOK_SECRET;
    if (!secret) {
        console.error('Lulu webhook secret not configured');
        return false;
    }

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');

    return signature === expectedSignature;
}

// Main webhook handler
router.post('/lulu/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        // Verify webhook signature
        const signature = req.headers['x-lulu-signature'];
        if (!verifyLuluWebhook(req.body, signature)) {
            console.error('Invalid Lulu webhook signature');
            return res.status(401).json({ error: 'Invalid signature' });
        }

        const event = JSON.parse(req.body);
        console.log('Lulu webhook received:', event.event_type);

        // Log webhook event
        await logWebhookEvent(event);

        // Handle different event types
        switch (event.event_type) {
            case 'PRINT_JOB_STATUS_CHANGED':
                await handlePrintJobStatusChange(event);
                break;
                
            case 'PRINT_JOB_SHIPPED':
                await handlePrintJobShipped(event);
                break;
                
            case 'PRINT_JOB_CANCELED':
                await handlePrintJobCanceled(event);
                break;
                
            case 'PRINT_JOB_FAILED':
                await handlePrintJobFailed(event);
                break;
                
            default:
                console.log('Unhandled Lulu event type:', event.event_type);
        }

        res.json({ received: true });

    } catch (error) {
        console.error('Lulu webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// Handle print job status changes
async function handlePrintJobStatusChange(event) {
    const { print_job_id, status, external_id } = event.data;
    
    console.log(`Print job ${print_job_id} status changed to: ${status.name}`);

    // Update print job status in database
    await luluService.updatePrintJobStatus(print_job_id, status.name);

    // Get order details
    const order = await orderService.getOrder(external_id);
    if (!order) {
        console.error(`Order not found for external_id: ${external_id}`);
        return;
    }

    // Send status update email based on status
    switch (status.name) {
        case 'UNPAID':
            // Payment pending - shouldn't happen with our flow
            break;
            
        case 'PRODUCTION_DELAYED':
            await sendProductionDelayedEmail(order, print_job_id);
            break;
            
        case 'IN_PRODUCTION':
            await sendInProductionEmail(order, print_job_id);
            break;
            
        case 'SHIPPED':
            // Handled by PRINT_JOB_SHIPPED event
            break;
            
        case 'CANCELED':
            // Handled by PRINT_JOB_CANCELED event
            break;
            
        case 'FAILED':
            // Handled by PRINT_JOB_FAILED event
            break;
    }
}

// Handle print job shipped
async function handlePrintJobShipped(event) {
    const { print_job_id, tracking_urls, tracking_id, external_id } = event.data;
    
    console.log(`Print job ${print_job_id} shipped with tracking: ${tracking_id}`);

    // Update print job with tracking info
    await luluService.updatePrintJobStatus(print_job_id, 'SHIPPED', {
        trackingUrl: tracking_urls?.[0],
        trackingId: tracking_id
    });

    // Get order details
    const order = await orderService.getOrder(external_id);
    if (!order) {
        console.error(`Order not found for external_id: ${external_id}`);
        return;
    }

    // Send shipping confirmation email
    await sendShippingConfirmationEmail(order, tracking_urls?.[0], tracking_id);

    // Update order status
    await orderService.updateOrderStatus(external_id, {
        fulfillment_status: 'shipped',
        metadata: JSON.stringify({
            trackingUrl: tracking_urls?.[0],
            trackingId: tracking_id,
            shippedAt: new Date().toISOString()
        })
    });
}

// Handle print job canceled
async function handlePrintJobCanceled(event) {
    const { print_job_id, reason, external_id } = event.data;
    
    console.log(`Print job ${print_job_id} canceled: ${reason}`);

    // Update print job status
    await luluService.updatePrintJobStatus(print_job_id, 'CANCELED');

    // Get order details
    const order = await orderService.getOrder(external_id);
    if (!order) {
        console.error(`Order not found for external_id: ${external_id}`);
        return;
    }

    // Send cancellation email
    await sendCancellationEmail(order, reason);

    // Update order status
    await orderService.updateOrderStatus(external_id, {
        fulfillment_status: 'print_canceled',
        metadata: JSON.stringify({
            cancelReason: reason,
            canceledAt: new Date().toISOString()
        })
    });
}

// Handle print job failed
async function handlePrintJobFailed(event) {
    const { print_job_id, error_message, external_id } = event.data;
    
    console.error(`Print job ${print_job_id} failed: ${error_message}`);

    // Update print job status
    await luluService.updatePrintJobStatus(print_job_id, 'FAILED');

    // Get order details
    const order = await orderService.getOrder(external_id);
    if (!order) {
        console.error(`Order not found for external_id: ${external_id}`);
        return;
    }

    // Send failure notification email
    await sendPrintFailureEmail(order, error_message);

    // Update order status
    await orderService.updateOrderStatus(external_id, {
        fulfillment_status: 'print_failed',
        metadata: JSON.stringify({
            failureReason: error_message,
            failedAt: new Date().toISOString()
        })
    });
}

// Email notification functions
async function sendProductionDelayedEmail(order, printJobId) {
    const emailData = {
        userEmail: order.customer_email,
        orderId: order.order_id,
        bookTitle: order.book_title,
        status: 'preparing',
        message: 'Your book is being prepared for printing. We\'ll notify you when production begins.',
        estimatedTime: '2-4 hours'
    };

    await emailService.sendPrintStatusUpdate(emailData);

    // Log email
    await orderService.logEmail({
        orderId: order.order_id,
        emailType: 'print_status_delayed',
        recipientEmail: order.customer_email,
        subject: 'Your book is being prepared for printing',
        status: 'sent'
    });
}

async function sendInProductionEmail(order, printJobId) {
    const emailData = {
        userEmail: order.customer_email,
        orderId: order.order_id,
        bookTitle: order.book_title,
        status: 'printing',
        message: 'Great news! Your book is now being printed.',
        estimatedTime: '3-5 business days'
    };

    await emailService.sendPrintStatusUpdate(emailData);

    // Log email
    await orderService.logEmail({
        orderId: order.order_id,
        emailType: 'print_status_production',
        recipientEmail: order.customer_email,
        subject: 'Your book is being printed!',
        status: 'sent'
    });
}

async function sendShippingConfirmationEmail(order, trackingUrl, trackingId) {
    const emailData = {
        userEmail: order.customer_email,
        orderId: order.order_id,
        bookTitle: order.book_title,
        trackingUrl,
        trackingId,
        estimatedDelivery: calculateEstimatedDelivery(order.shipping_method)
    };

    await emailService.sendShippingConfirmation(emailData);

    // Log email
    await orderService.logEmail({
        orderId: order.order_id,
        emailType: 'shipping_confirmation',
        recipientEmail: order.customer_email,
        subject: `Your book has shipped! Track order ${trackingId}`,
        status: 'sent'
    });
}

async function sendCancellationEmail(order, reason) {
    const emailData = {
        userEmail: order.customer_email,
        orderId: order.order_id,
        bookTitle: order.book_title,
        reason: reason || 'Order canceled',
        refundInfo: 'A full refund will be processed within 5-7 business days.'
    };

    await emailService.sendPrintCancellation(emailData);

    // Log email
    await orderService.logEmail({
        orderId: order.order_id,
        emailType: 'print_cancellation',
        recipientEmail: order.customer_email,
        subject: 'Print order canceled',
        status: 'sent'
    });
}

async function sendPrintFailureEmail(order, errorMessage) {
    const emailData = {
        userEmail: order.customer_email,
        orderId: order.order_id,
        bookTitle: order.book_title,
        errorMessage: errorMessage || 'An error occurred during printing',
        supportInfo: 'Our team has been notified and will contact you within 24 hours with a solution.'
    };

    await emailService.sendPrintFailure(emailData);

    // Log email
    await orderService.logEmail({
        orderId: order.order_id,
        emailType: 'print_failure',
        recipientEmail: order.customer_email,
        subject: 'Issue with your print order',
        status: 'sent'
    });
}

// Helper functions
function calculateEstimatedDelivery(shippingMethod) {
    const today = new Date();
    const daysToAdd = {
        'MAIL': 10,
        'GROUND': 6,
        'EXPRESS': 3
    };
    
    const days = daysToAdd[shippingMethod] || 7;
    const estimatedDate = new Date(today);
    estimatedDate.setDate(estimatedDate.getDate() + days);
    
    return estimatedDate.toLocaleDateString();
}

async function logWebhookEvent(event) {
    const db = luluService.db;
    
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO lulu_webhook_events 
            (event_id, event_type, print_job_id, payload) 
            VALUES (?, ?, ?, ?)`,
            [
                event.event_id,
                event.event_type,
                event.data?.print_job_id,
                JSON.stringify(event)
            ],
            (err) => {
                if (err) reject(err);
                else resolve();
            }
        );
    });
}

// Test webhook endpoint (for development)
router.post('/lulu/test-webhook', async (req, res) => {
    const { event_type, print_job_id, status, external_id } = req.body;
    
    const testEvent = {
        event_id: `test_${Date.now()}`,
        event_type: event_type || 'PRINT_JOB_STATUS_CHANGED',
        timestamp: new Date().toISOString(),
        data: {
            print_job_id: print_job_id || 'test_print_job_123',
            external_id: external_id || 'order_123456',
            status: {
                name: status || 'IN_PRODUCTION'
            }
        }
    };
    
    // Process as regular webhook
    await handlePrintJobStatusChange(testEvent);
    
    res.json({
        success: true,
        message: 'Test webhook processed',
        event: testEvent
    });
});

module.exports = router;