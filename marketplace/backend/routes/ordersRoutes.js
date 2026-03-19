/**
 * Customer-facing order routes.
 *
 * POST /api/orders/:orderId/dispute — self-service dispute filing (no admin auth required;
 * ownership is verified by matching customer_email in the order).
 */

const express = require('express');
const router = express.Router();
const OrderService = require('../services/orderService');
const emailService = require('../services/emailService');

const orderService = new OrderService();

// POST /api/orders/:orderId/dispute
// Body: { reason: string, email: string }
router.post('/:orderId/dispute', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { reason, email } = req.body;

        if (!reason || !email) {
            return res.status(422).json({ success: false, error: 'reason and email are required' });
        }

        // Validate ownership — order must belong to the supplied email
        const order = await orderService.getOrder(orderId);
        if (!order || order.customer_email !== email) {
            // Return 404 to avoid leaking order existence to non-owners
            return res.status(404).json({ success: false, error: 'Order not found' });
        }

        if (order.payment_status === 'refunded') {
            return res.status(409).json({ success: false, error: 'Order has already been refunded' });
        }

        // Advance state machine (best-effort; completed → disputed is the expected path)
        try {
            await orderService.updateOrderState(orderId, 'disputed', {
                dispute_reason: reason,
                disputed_at: new Date().toISOString()
            });
        } catch (stateErr) {
            console.warn(`[orders/dispute] State transition skipped for ${orderId}: ${stateErr.message}`);
        }

        // Alert admin
        try {
            await emailService.sendDisputeAlert({ orderId, reason, email });
        } catch (emailErr) {
            console.warn(`[orders/dispute] Failed to send dispute alert for ${orderId}:`, emailErr.message);
        }

        res.json({
            success: true,
            message: 'Dispute logged. We will contact you within 24 hours.'
        });
    } catch (error) {
        console.error('[orders/dispute] Error:', error);
        res.status(500).json({ success: false, error: 'Failed to log dispute' });
    }
});

module.exports = router;
