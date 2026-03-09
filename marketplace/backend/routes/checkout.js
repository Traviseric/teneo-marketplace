const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { safeMessage, sanitizeMetadataValue } = require('../utils/validate');
const path = require('path');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const stripeHealthService = require('../services/stripeHealthService');
const {
  sanitizeBrandId,
  lookupBookPrice,
  applyCouponToPrice,
  getNextReadOffer
} = require('../services/checkoutOfferService');
const couponService = require('../services/couponService');
const orderBumpService = require('../services/orderBumpService');
const OrderService = require('../services/orderService');
const orderService = new OrderService();
const emailService = require('../services/emailService');
const { processMixedOrder } = require('./checkoutMixed');
const nftService = require('../services/nftService');
const db = require('../database/database');
const { enrollUserInCourse } = require('./courseRoutes');

const isProduction = process.env.NODE_ENV === 'production';

// Checkout session rate limiter — 10 per hour per IP (CWE-770)
// Disabled in test environment to allow test suites to run freely
const checkoutLimiter = process.env.NODE_ENV === 'test'
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 60 * 60 * 1000,
      max: 10,
      message: { success: false, error: 'Too many checkout attempts. Please try again later.' },
      standardHeaders: true,
      legacyHeaders: false,
    });

router.post('/create-session', checkoutLimiter, async (req, res) => {
  try {
    // Do not destructure 'price' from req.body — client-supplied price is untrusted
    const {
      bookId,
      format,
      brandId: rawBrandId,
      bookTitle,
      bookAuthor,
      userEmail,
      couponCode,
      bumpAccepted,
      bumpId
    } = req.body;
    const brandId = sanitizeBrandId(rawBrandId);
    const funnelId = sanitizeMetadataValue(req.body.funnelId, 80);
    const funnelSessionId = sanitizeMetadataValue(req.body.funnelSessionId, 120);
    const courseSlug = sanitizeMetadataValue(req.body.courseSlug, 120);

    if (!bookId || !format || !bookTitle || !bookAuthor || !userEmail) {
      return res.status(400).json({
        error: 'Missing required fields: bookId, format, bookTitle, bookAuthor, userEmail'
      });
    }

    // Check Stripe availability before attempting session creation.
    // If Stripe is down, return a fallback signal so the frontend can redirect
    // to the crypto checkout flow instead of showing a generic error.
    const stripeHealth = await stripeHealthService.checkStripeHealth();
    if (!stripeHealth.healthy) {
      return res.status(503).json({
        success: false,
        stripeDown: true,
        fallbackUrl: '/checkout/crypto',
        message: 'Stripe payment temporarily unavailable — please use crypto checkout',
      });
    }

    // Look up authoritative price from catalog — never use the client-supplied price
    const catalogPrice = lookupBookPrice(bookId, format, brandId);
    if (catalogPrice == null) {
      return res.status(400).json({ success: false, error: 'Book not found in catalog' });
    }

    // Validate coupon server-side via couponService (DB + static fallback)
    let pricing;
    if (couponCode) {
      const couponResult = await couponService.validateCoupon(couponCode, catalogPrice);
      if (couponResult.valid) {
        const discountAmount = Math.round(couponResult.discountAmount * 100) / 100;
        const finalPrice = Math.max(0.5, Math.round((catalogPrice - discountAmount) * 100) / 100);
        pricing = {
          basePrice: catalogPrice,
          finalPrice,
          discountAmount,
          couponCode: couponResult.code,
          applied: discountAmount > 0,
        };
      } else {
        pricing = { basePrice: catalogPrice, finalPrice: catalogPrice, discountAmount: 0, couponCode: null, applied: false };
      }
    } else {
      pricing = applyCouponToPrice(catalogPrice, null);
    }
    const unitPrice = pricing.finalPrice;
    const orderId = `order_${Date.now()}_${bookId}`;
    const nextReadOffer = getNextReadOffer(bookId, brandId);

    // Validate order bump server-side — never trust client-supplied bump price
    let bumpLineItem = null;
    if (bumpAccepted) {
      const bump = bumpId
        ? await orderBumpService.getBumpById(bumpId)
        : await orderBumpService.getBumpForProduct(bookId);
      if (bump) {
        bumpLineItem = {
          price_data: {
            currency: 'usd',
            product_data: { name: bump.bump_product_name, description: bump.bump_description || undefined },
            unit_amount: Math.round(bump.bump_price * 100),
          },
          quantity: 1,
        };
      }
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: userEmail,
      client_reference_id: orderId,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${bookTitle} - ${format}`,
              description: `by ${bookAuthor} - Format: ${format}`,
              metadata: {
                bookId: bookId,
                format: format,
                bookTitle: bookTitle,
                bookAuthor: bookAuthor
              }
            },
            unit_amount: Math.round(unitPrice * 100),
          },
          quantity: 1,
        },
        ...(bumpLineItem ? [bumpLineItem] : []),
      ],
      mode: 'payment',
      success_url: `${process.env.PUBLIC_URL || process.env.FRONTEND_URL || 'http://localhost:3001'}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.PUBLIC_URL || process.env.FRONTEND_URL || 'http://localhost:3001'}/cancel.html`,
      metadata: {
        bookId: bookId,
        format: format,
        bookTitle: bookTitle,
        bookAuthor: bookAuthor,
        userEmail: userEmail,
        orderId: orderId,
        fulfillmentStatus: 'pending',
        brandId: brandId || '',
        couponCode: pricing.couponCode || '',
        couponDiscount: pricing.discountAmount ? String(pricing.discountAmount) : '',
        funnelId: funnelId || '',
        funnelSessionId: funnelSessionId || '',
        courseSlug: courseSlug || '',
        product_type: courseSlug ? 'course' : ''
      },
      // Production-specific payment settings
      payment_intent_data: {
        description: `Order ${orderId}: ${bookTitle}`,
        ...(isProduction && {
          statement_descriptor: 'TENEO BOOKS',
          statement_descriptor_suffix: bookId.substring(0, 10).toUpperCase(),
        }),
        metadata: {
          orderId,
          bookId
        }
      },
      billing_address_collection: isProduction ? 'required' : 'auto'
    });

    // Create order record in database at session creation time
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
      orderId: orderId,
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
    if (error.type === 'StripeCardError') {
      res.status(400).json({ error: 'Card error', message: safeMessage(error) });
    } else if (error.type === 'StripeInvalidRequestError') {
      res.status(400).json({ error: 'Invalid request', message: safeMessage(error) });
    } else {
      res.status(500).json({
        error: 'Failed to create checkout session',
        message: safeMessage(error)
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

// Stripe webhook handler
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('Webhook secret not configured');
    return res.status(500).send('Webhook secret not configured');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Idempotency — skip if already processed
  const alreadyProcessed = await orderService.isEventProcessed(event.id);
  if (alreadyProcessed) {
    console.log(`Event ${event.id} already processed, skipping`);
    return res.json({ received: true, skipped: true });
  }

  // Log the incoming event
  await orderService.logPaymentEvent({
    stripeEventId: event.id,
    eventType: event.type,
    orderId: event.data.object.metadata?.orderId,
    payload: event.data.object
  });

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
        console.log(`Unhandled event type ${event.type}`);
    }

    await orderService.markEventProcessed(event.id, true);
  } catch (error) {
    console.error(`Error processing webhook ${event.type}:`, error);
    await orderService.markEventProcessed(event.id, false, error.message);
    // Return 200 to prevent Stripe from retrying
    return res.json({ received: true, error: safeMessage(error) });
  }

  res.json({ received: true });
});

async function handleCheckoutCompleted(session) {
  console.log('Processing successful checkout:', session.id);

  // Route mixed orders (digital + physical) to the dedicated mixed fulfillment handler
  if (session.metadata && session.metadata.orderType === 'mixed') {
    console.log('Mixed order detected, routing to processMixedOrder');
    return await processMixedOrder(session);
  }

  const {
    bookId,
    bookTitle,
    bookAuthor,
    userEmail,
    orderId
  } = session.metadata;

  try {
    // Record funnel purchase event if applicable
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

    // Increment coupon used_count for DB-backed coupons (no-op for static coupons)
    if (session.metadata?.couponCode) {
      await couponService.applyCoupon(session.metadata.couponCode).catch(err =>
        console.warn('[checkout] applyCoupon failed (non-fatal):', err.message)
      );
    }

    // Mark order complete and get download token
    const { downloadToken } = await orderService.completeOrder(
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
      paymentMethod: session.payment_method_types?.[0] || 'card'
    });

    await orderService.logEmail({
      orderId,
      emailType: 'order_confirmation',
      recipientEmail: userEmail,
      subject: `Order Confirmed: "${bookTitle}"`,
      status: 'sent'
    });

    // Build download URL from token
    const downloadUrl = `${process.env.PUBLIC_URL || process.env.FRONTEND_URL || 'http://localhost:3001'}/api/download/${downloadToken}`;

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

    await orderService.logEmail({
      orderId,
      emailType: 'download_link',
      recipientEmail: userEmail,
      subject: `Your book "${bookTitle}" is ready for download`,
      status: emailResult.success ? 'sent' : 'failed',
      errorMessage: emailResult.error,
      messageId: emailResult.messageId
    });

    await orderService.fulfillOrder(orderId);

    console.log(`Download link sent to ${userEmail} for order ${orderId}`);

    // Pin purchased book to IPFS for censorship-resistant delivery (non-fatal)
    if (process.env.PINATA_JWT && bookId) {
      const bookFilePath = path.join(__dirname, '../books', `${bookId}.pdf`);
      nftService.pinBookToIPFS(bookId, bookFilePath)
        .catch(err => console.error('[IPFS] Pin failed (non-fatal):', err.message));
    }

    // Enroll buyer in course if this is a course purchase (idempotent via INSERT OR IGNORE)
    if (session.metadata?.courseSlug || session.metadata?.product_type === 'course') {
      const slug = session.metadata.courseSlug;
      const email = userEmail || session.customer_email;
      if (slug && email) {
        try {
          await enrollUserInCourse(slug, email, orderId);
          console.log(`Course enrollment granted: ${email} → ${slug} (order ${orderId})`);
        } catch (enrollErr) {
          console.error('Course enrollment failed (non-fatal):', enrollErr.message);
        }
      }
    }

  } catch (error) {
    console.error('Fulfillment error', {
      eventType: 'checkout.session.completed',
      sessionId: session?.id,
      orderId,
      customerEmail: session?.customer_details?.email,
      error: error.message,
      stack: error.stack
    });
    if (orderId) {
      await orderService.failOrder(orderId, error.message).catch(() => {});
    }
    throw error;
  }
}

async function handleCheckoutExpired(session) {
  const { orderId } = session.metadata || {};
  if (orderId) {
    await orderService.updateOrderStatus(orderId, {
      status: 'expired',
      payment_status: 'expired'
    });
  }
}

async function handlePaymentSucceeded(paymentIntent) {
  console.log('Payment succeeded:', paymentIntent.id);
  // Additional payment success handling if needed
}

async function handlePaymentFailed(paymentIntent) {
  const { orderId } = paymentIntent.metadata || {};

  if (orderId) {
    await orderService.failOrder(orderId, paymentIntent.last_payment_error?.message || 'Payment failed');

    const order = await orderService.getOrder(orderId);
    if (order && order.customer_email) {
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

async function handleChargeRefunded(charge) {
  console.log('Processing refund:', charge.id);

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

    const order = await orderService.getOrder(orderId);
    if (order && order.customer_email) {
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
      return res.status(404).json({ error: 'Order not found' });
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
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Process refund (admin endpoint)
router.post('/refund/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason = 'requested_by_customer', amount } = req.body;

    const order = await orderService.getOrder(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!order.stripe_payment_intent_id) {
      return res.status(400).json({ error: 'Order has no payment to refund' });
    }

    const refundAmount = amount || order.price;

    const refund = await stripe.refunds.create({
      payment_intent: order.stripe_payment_intent_id,
      amount: Math.round(refundAmount * 100),
      reason,
      metadata: { orderId: order.order_id }
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
      message: safeMessage(error)
    });
  }
});

// Order bump offer endpoint — returns the active bump for a given product
router.get('/bump', async (req, res) => {
  try {
    const { productId } = req.query;
    const bump = await orderBumpService.getBumpForProduct(productId || null);
    if (!bump) {
      return res.json({ bump: null });
    }
    res.json({
      bump: {
        id: bump.id,
        name: bump.bump_product_name,
        description: bump.bump_description,
        price: bump.bump_price,
      }
    });
  } catch (error) {
    console.error('Error fetching order bump:', error);
    res.status(500).json({ error: 'Failed to fetch order bump' });
  }
});

// Stripe health status endpoint — used by status pages and monitoring
router.get('/health/stripe', async (req, res) => {
  const health = await stripeHealthService.checkStripeHealth();
  const statusCode = health.healthy ? 200 : 503;
  res.status(statusCode).json({
    healthy: health.healthy,
    lastChecked: health.lastChecked ? new Date(health.lastChecked).toISOString() : null,
    ...(health.error && { error: health.error }),
  });
});

// Basic health check for monitoring
router.get('/health', async (req, res) => {
  try {
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
