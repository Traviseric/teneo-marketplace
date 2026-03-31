'use strict';

const express = require('express');
const router = express.Router();
const OrderService = require('../services/orderService');
const emailService = require('../services/emailService');
const printfulProvider = require('../services/printfulFulfillmentProvider');
const { decryptCredentials } = require('../services/credentialEncryption');

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

function getDb() {
  return require('../database/database');
}

async function insertWebhookEvent(event, merchantId) {
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
        JSON.stringify({ ...(event.raw || {}), _merchantId: merchantId || null }),
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

/**
 * Look up a merchant's webhook secret from their stored credentials.
 */
async function getMerchantWebhookSecret(merchantId) {
  if (!merchantId) return null;
  try {
    const db = getDb();
    const row = await db.get(
      'SELECT credentials_encrypted FROM merchant_fulfillment_providers WHERE merchant_id = ? AND provider = ? AND is_active = 1',
      [merchantId, 'printful'],
    );
    if (!row || !row.credentials_encrypted) return null;
    const creds = decryptCredentials(row.credentials_encrypted);
    return creds.webhookSecret || null;
  } catch {
    return null;
  }
}

/**
 * Process a Printful webhook event — shared by both legacy and per-merchant routes.
 */
async function processWebhookEvent(event, merchantId, res) {
  // Idempotency + audit
  const insertResult = await insertWebhookEvent(event, merchantId);
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

  // Also update the fulfillment_orders table if merchant-scoped
  if (merchantId && event.providerOrderId) {
    const db = getDb();
    const updateFields = ['status = ?', 'updated_at = CURRENT_TIMESTAMP'];
    const updateParams = [event.status || 'unknown'];

    if (event.trackingNumber) {
      updateFields.push('tracking_number = ?');
      updateParams.push(event.trackingNumber);
    }
    if (event.trackingUrl) {
      updateFields.push('tracking_url = ?');
      updateParams.push(event.trackingUrl);
    }
    if (event.carrier) {
      updateFields.push('carrier = ?');
      updateParams.push(event.carrier);
    }

    updateParams.push(String(event.providerOrderId), merchantId);
    await db.run(
      `UPDATE fulfillment_orders SET ${updateFields.join(', ')} WHERE external_order_id = ? AND merchant_id = ?`,
      updateParams,
    );
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
}

// ─── Per-merchant webhook: POST /api/webhooks/printful/:merchantId ───

router.post('/printful/:merchantId', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const { merchantId } = req.params;

    // Look up merchant's webhook secret for signature verification
    const webhookSecret = await getMerchantWebhookSecret(merchantId);
    if (webhookSecret && Buffer.isBuffer(req.body)) {
      const valid = printfulProvider.verifyWebhook(req.body, req.headers, webhookSecret);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid Printful webhook signature' });
      }
    }

    const payload = parsePayload(req.body);
    const event = printfulProvider.parseWebhookEvent(payload);
    if (!event) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    return await processWebhookEvent(event, merchantId, res);
  } catch (error) {
    console.error('[Printful Webhook] Error (merchant):', error);
    return res.status(500).json({ error: 'Failed to process Printful webhook' });
  }
});

// ─── Legacy global webhook: POST /api/webhooks/printful ─────────────

router.post('/printful', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    if (printfulProvider._legacyWebhookSecret && Buffer.isBuffer(req.body)) {
      const valid = printfulProvider.verifyWebhook(req.body, req.headers, printfulProvider._legacyWebhookSecret);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid Printful webhook signature' });
      }
    }

    const payload = parsePayload(req.body);
    const event = printfulProvider.parseWebhookEvent(payload);
    if (!event) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    return await processWebhookEvent(event, null, res);
  } catch (error) {
    console.error('[Printful Webhook] Error:', error);
    return res.status(500).json({ error: 'Failed to process Printful webhook' });
  }
});

module.exports = router;
