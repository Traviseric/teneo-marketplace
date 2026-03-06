'use strict';

const express = require('express');
const router = express.Router();
const OrderService = require('../services/orderService');
const emailService = require('../services/emailService');
const printfulProvider = require('../services/printfulFulfillmentProvider');

const orderService = new OrderService();

function parsePayload(body) {
  if (Buffer.isBuffer(body)) {
    return JSON.parse(body.toString('utf8'));
  }
  if (typeof body === 'string') {
    return JSON.parse(body);
  }
  return body;
}

function safeJson(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

async function insertWebhookEvent(event) {
  const eventId = event.eventId || null;
  const sql = `
    INSERT OR IGNORE INTO printful_webhook_events
      (event_id, event_type, printful_order_id, external_order_id, payload, processed)
    VALUES (?, ?, ?, ?, ?, 0)
  `;

  return new Promise((resolve, reject) => {
    orderService.db.run(
      sql,
      [
        eventId,
        event.type,
        event.providerOrderId ? String(event.providerOrderId) : null,
        event.externalOrderId,
        JSON.stringify(event.raw || {}),
      ],
      function onRun(err) {
        if (err) return reject(err);
        resolve({ inserted: this.changes > 0 });
      }
    );
  });
}

async function markWebhookProcessed(eventId, errorMessage = null) {
  if (!eventId) return;
  const sql = `
    UPDATE printful_webhook_events
    SET processed = 1, processed_at = CURRENT_TIMESTAMP, error_message = ?
    WHERE event_id = ?
  `;
  return new Promise((resolve, reject) => {
    orderService.db.run(sql, [errorMessage, eventId], (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

router.post('/printful', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    if (printfulProvider.webhookSecret && Buffer.isBuffer(req.body)) {
      const valid = printfulProvider.verifyWebhook(req.body, req.headers);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid Printful webhook signature' });
      }
    }

    const payload = parsePayload(req.body);
    const event = printfulProvider.parseWebhookEvent(payload);
    if (!event) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    // Idempotency + audit
    const insertResult = await insertWebhookEvent(event);
    if (event.eventId && !insertResult.inserted) {
      return res.json({ ok: true, duplicate: true });
    }

    // Find internal order by external order id first, then provider order id fallback.
    let order = null;
    if (event.externalOrderId) {
      order = await orderService.getOrder(event.externalOrderId);
    }
    if (!order && event.providerOrderId) {
      order = await orderService.getOrderByPrintfulOrderId(String(event.providerOrderId));
    }

    if (!order) {
      await markWebhookProcessed(event.eventId, 'Order not found');
      return res.json({
        ok: true,
        ignored: true,
        reason: 'Order not found for Printful webhook',
      });
    }

    const currentMeta = safeJson(order.metadata);
    const nextMeta = {
      ...currentMeta,
      printful: {
        ...(currentMeta.printful || {}),
        lastWebhookType: event.type,
        lastWebhookAt: new Date().toISOString(),
      },
    };

    const updates = {
      metadata: JSON.stringify(nextMeta),
    };

    if (event.providerOrderId) {
      updates.printful_order_id = String(event.providerOrderId);
    }

    if (event.status === 'shipped') {
      updates.fulfillment_status = 'shipped';
      if (event.trackingNumber) updates.tracking_number = event.trackingNumber;
      if (event.trackingUrl) updates.tracking_url = event.trackingUrl;

      // Best effort shipping email
      if (order.customer_email && !order.customer_email.endsWith('@local.invalid')) {
        await emailService.sendShippingConfirmation({
          userEmail: order.customer_email,
          orderId: order.order_id,
          bookTitle: order.book_title,
          trackingUrl: event.trackingUrl || '',
          trackingId: event.trackingNumber || 'N/A',
          estimatedDelivery: 'See carrier updates',
        });
      }
    } else if (event.status === 'failed') {
      updates.fulfillment_status = 'print_failed';
    } else if (event.status === 'canceled') {
      updates.fulfillment_status = 'print_canceled';
    } else if (event.status === 'on_hold') {
      updates.fulfillment_status = 'print_on_hold';
    } else if (event.status === 'processing') {
      updates.fulfillment_status = 'print_processing';
    }

    await orderService.updateOrderStatus(order.order_id, updates);
    await markWebhookProcessed(event.eventId);

    return res.json({
      ok: true,
      orderId: order.order_id,
      eventType: event.type,
      status: event.status,
    });
  } catch (error) {
    console.error('[Printful Webhook] Error:', error);
    return res.status(500).json({ error: 'Failed to process Printful webhook' });
  }
});

module.exports = router;

