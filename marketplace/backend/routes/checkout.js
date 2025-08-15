const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const emailService = require('../services/emailService');
const axios = require('axios');

router.post('/create-session', async (req, res) => {
  try {
    const { bookId, format, price, bookTitle, bookAuthor, userEmail } = req.body;

    if (!bookId || !format || !price || !bookTitle || !bookAuthor || !userEmail) {
      return res.status(400).json({ 
        error: 'Missing required fields: bookId, format, price, bookTitle, bookAuthor, userEmail' 
      });
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
            unit_amount: Math.round(price * 100),
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
      message: error.message 
    });
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