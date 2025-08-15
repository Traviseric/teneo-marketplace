/**
 * Direct Purchase Test - Uses environment variables directly
 */

require('dotenv').config();
const axios = require('axios');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3001';
const TEST_EMAIL = 'test@example.com';

// Test book data
const testBook = {
  bookId: 'advanced-ai-consciousness',
  bookTitle: 'Advanced AI Consciousness',
  bookAuthor: 'Dr. Sarah Chen',
  format: 'ebook',
  price: 29.99,
  userEmail: TEST_EMAIL
};

async function createDirectCheckout() {
  console.log('🧪 Creating Checkout Session Directly with Stripe\n');
  console.log('📚 Book Details:');
  console.log(`   Title: ${testBook.bookTitle}`);
  console.log(`   Author: ${testBook.bookAuthor}`);
  console.log(`   Price: $${testBook.price}`);
  console.log(`   Email: ${testBook.userEmail}\n`);

  try {
    const orderId = `order_${Date.now()}_${testBook.bookId}`;
    
    // Create Stripe checkout session directly
    console.log('Creating checkout session with Stripe API...');
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: testBook.userEmail,
      client_reference_id: orderId,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: testBook.bookTitle,
            description: `by ${testBook.bookAuthor} - Format: ${testBook.format}`,
            metadata: {
              bookId: testBook.bookId,
              format: testBook.format
            }
          },
          unit_amount: Math.round(testBook.price * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${API_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${API_URL}/cancel.html`,
      metadata: {
        orderId,
        bookId: testBook.bookId,
        format: testBook.format,
        bookTitle: testBook.bookTitle,
        bookAuthor: testBook.bookAuthor,
        userEmail: testBook.userEmail
      }
    });
    
    console.log('✅ Checkout session created successfully!');
    console.log(`   Order ID: ${orderId}`);
    console.log(`   Session ID: ${session.id}`);
    console.log(`   Checkout URL: ${session.url}\n`);
    
    console.log('📋 Next Steps:');
    console.log('1. Click the link below to open the checkout page:');
    console.log(`   ${session.url}\n`);
    console.log('2. Use Stripe test card: 4242 4242 4242 4242');
    console.log('3. Use any future expiry date (e.g., 12/34)');
    console.log('4. Use any 3-digit CVC (e.g., 123)');
    console.log('5. Use any billing ZIP code\n');
    
    console.log('🔍 To receive webhooks locally:');
    console.log('1. In a new terminal, run:');
    console.log('   stripe listen --forward-to localhost:3001/api/checkout/webhook');
    console.log('2. Copy the webhook signing secret and update your .env file');
    console.log('3. Complete the payment in the browser\n');
    
    // Try to create order in database
    try {
      await axios.post(`${API_URL}/api/checkout/create-session`, testBook);
      console.log('✅ Order record created in database');
    } catch (error) {
      console.log('⚠️  Note: Could not create order in database (server may need restart)');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.type === 'StripeInvalidRequestError') {
      console.log('\nError details:', error.raw.message);
    }
  }
}

createDirectCheckout();