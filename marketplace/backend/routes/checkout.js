const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { safeMessage } = require('../utils/validate');
const path = require('path');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const stripeHealthService = require('../services/stripeHealthService');
const {
  sanitizeBrandId,
  lookupBookPrice,
  applyCouponToPrice,
  getNextReadOffer
} = require('../services/checkoutOfferService');

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
const emailService = require('../services/emailService');
const downloadService = require('../services/downloadService');
const { processMixedOrder } = require('./checkoutMixed');
const nftService = require('../services/nftService');
const db = require('../database/database');
const { enrollUserInCourse } = require('./courseRoutes');

function sanitizeMetadataValue(value, maxLength = 120) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

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
      couponCode
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

    const pricing = applyCouponToPrice(catalogPrice, couponCode);
    const unitPrice = pricing.finalPrice;
    const orderId = `order_${Date.now()}_${bookId}`;
    const nextReadOffer = getNextReadOffer(bookId, brandId);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
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
      ],
      mode: 'payment',
      customer_email: userEmail,
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
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      message: safeMessage(error) 
    });
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

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.log(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('Payment successful:', session.id);
      
      // Extract metadata
      // Route mixed orders (digital + physical) to the dedicated mixed fulfillment handler
      if (session.metadata && session.metadata.orderType === 'mixed') {
        console.log('Mixed order detected, routing to processMixedOrder');
        try {
          await processMixedOrder(session);
        } catch (err) {
          console.error('Error processing mixed order:', err);
        }
        break;
      }

      const {
        bookId,
        bookTitle,
        bookAuthor,
        userEmail,
        orderId
      } = session.metadata;

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

        // Send order confirmation email
        await emailService.sendOrderConfirmation({
          userEmail,
          bookTitle,
          bookAuthor,
          price: session.amount_total / 100,
          orderId,
          paymentMethod: 'Credit Card'
        });

        // Generate download token directly — no HTTP self-call
        const { downloadUrl } = await downloadService.generateDownloadToken({ orderId });

        // Send download email
        await emailService.sendDownloadEmail({
          userEmail,
          bookTitle,
          bookAuthor,
          downloadUrl,
          orderId,
          expiresIn: '24 hours',
          maxDownloads: 5
        });

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
        console.error('Error processing payment completion:', error);
      }

      break;
    
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({received: true});
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

module.exports = router;
