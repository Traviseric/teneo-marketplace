const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { safeMessage } = require('../utils/validate');
const path = require('path');
const fs = require('fs');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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
const axios = require('axios');
const { processMixedOrder } = require('./checkoutMixed');

// Sanitize brandId to prevent path traversal
function sanitizeBrandId(brandId) {
  if (!brandId || typeof brandId !== 'string') return null;
  // Allow only alphanumeric, underscores, hyphens (matches actual brand directory names)
  if (!/^[a-zA-Z0-9_-]+$/.test(brandId)) return null;
  return brandId;
}

// Look up authoritative book price server-side from brand catalogs.
// Never trust the client-supplied price.
function lookupBookPrice(bookId, format, brandId) {
  const brandsPath = path.join(__dirname, '../../frontend/brands');

  let brandsToSearch;
  if (brandId) {
    brandsToSearch = [brandId];
  } else {
    try {
      brandsToSearch = fs.readdirSync(brandsPath).filter(entry => {
        try {
          return fs.statSync(path.join(brandsPath, entry)).isDirectory();
        } catch (e) {
          return false;
        }
      });
    } catch (err) {
      console.error('Error reading brands directory:', err);
      return null;
    }
  }

  for (const brand of brandsToSearch) {
    const catalogPath = path.join(brandsPath, brand, 'catalog.json');
    try {
      if (!fs.existsSync(catalogPath)) continue;
      const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));

      // Search individual books
      const books = catalog.books || [];
      const book = books.find(b => b.id === bookId);
      if (book) {
        if (format === 'hardcover' && book.hardcoverPrice != null) {
          return book.hardcoverPrice;
        }
        return book.price;
      }

      // Search collections/bundles
      const collections = catalog.collections || [];
      const collection = collections.find(c => c.id === bookId);
      if (collection) {
        return collection.price;
      }
    } catch (err) {
      console.error(`Error reading catalog for brand ${brand}:`, err);
    }
  }

  return null;
}

router.post('/create-session', checkoutLimiter, async (req, res) => {
  try {
    // Do not destructure 'price' from req.body — client-supplied price is untrusted
    const { bookId, format, brandId: rawBrandId, bookTitle, bookAuthor, userEmail } = req.body;
    const brandId = sanitizeBrandId(rawBrandId);

    if (!bookId || !format || !bookTitle || !bookAuthor || !userEmail) {
      return res.status(400).json({
        error: 'Missing required fields: bookId, format, bookTitle, bookAuthor, userEmail'
      });
    }

    // Look up authoritative price from catalog — never use the client-supplied price
    const catalogPrice = lookupBookPrice(bookId, format, brandId);
    if (catalogPrice == null) {
      return res.status(400).json({ success: false, error: 'Book not found in catalog' });
    }

    const orderId = `order_${Date.now()}_${bookId}`;

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
            unit_amount: Math.round(catalogPrice * 100),
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
        fulfillmentStatus: 'pending'
      }
    });

    res.json({ 
      checkoutUrl: session.url,
      sessionId: session.id,
      orderId: orderId
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
      bookTitle: session.metadata?.bookTitle || 'Book purchase',
      bookAuthor: session.metadata?.bookAuthor || '',
      amount: session.amount_total || 0,
      currency: session.currency || 'usd',
      customerEmail: session.customer_email || session.customer_details?.email || '',
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
        orderId,
        format
      } = session.metadata;

      try {
        // Send order confirmation email
        await emailService.sendOrderConfirmation({
          userEmail,
          bookTitle,
          bookAuthor,
          price: session.amount_total / 100,
          orderId,
          paymentMethod: 'Credit Card'
        });

        // Generate download token
        const tokenResponse = await axios.post(`${process.env.FRONTEND_URL || 'http://localhost:3001'}/api/download/generate-token`, {
          bookId,
          orderId,
          userEmail
        });

        if (tokenResponse.data.success) {
          // Send download email
          await emailService.sendDownloadEmail({
            userEmail,
            bookTitle,
            bookAuthor,
            downloadUrl: tokenResponse.data.downloadUrl,
            orderId,
            expiresIn: '24 hours',
            maxDownloads: 5
          });

          console.log(`Download link sent to ${userEmail} for order ${orderId}`);
        } else {
          console.error('Failed to generate download token:', tokenResponse.data.error);
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

module.exports = router;