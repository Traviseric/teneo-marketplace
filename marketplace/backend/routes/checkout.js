const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

router.post('/create-session', async (req, res) => {
  try {
    const { bookId, format, price } = req.body;

    if (!bookId || !format || !price) {
      return res.status(400).json({ 
        error: 'Missing required fields: bookId, format, price' 
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Book ${bookId} - ${format}`,
              description: `Format: ${format}`,
              metadata: {
                bookId: bookId,
                format: format
              }
            },
            unit_amount: Math.round(price * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/cancel.html`,
      metadata: {
        bookId: bookId,
        format: format,
        orderId: `order_${Date.now()}_${bookId}`,
        fulfillmentStatus: 'pending'
      }
    });

    res.json({ 
      checkoutUrl: session.url,
      sessionId: session.id 
    });
  } catch (error) {
    console.error('Stripe session creation error:', error);
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      message: error.message 
    });
  }
});

module.exports = router;