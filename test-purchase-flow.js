/**
 * Test Purchase Flow Script
 * This script helps test the complete purchase flow in development
 */

const axios = require('axios');

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

async function testPurchaseFlow() {
  console.log('🧪 Testing Purchase Flow\n');
  console.log('📚 Book Details:');
  console.log(`   Title: ${testBook.bookTitle}`);
  console.log(`   Author: ${testBook.bookAuthor}`);
  console.log(`   Price: $${testBook.price}`);
  console.log(`   Email: ${testBook.userEmail}\n`);

  try {
    // Step 1: Create checkout session
    console.log('1️⃣ Creating checkout session...');
    const response = await axios.post(`${API_URL}/api/checkout/create-session`, testBook);
    
    const { checkoutUrl, sessionId, orderId } = response.data;
    
    console.log('✅ Checkout session created successfully!');
    console.log(`   Order ID: ${orderId}`);
    console.log(`   Session ID: ${sessionId}`);
    console.log(`   Checkout URL: ${checkoutUrl}\n`);
    
    console.log('📋 Next Steps:');
    console.log('1. Open the checkout URL in your browser');
    console.log('2. Use Stripe test card: 4242 4242 4242 4242');
    console.log('3. Use any future expiry date and any 3-digit CVC');
    console.log('4. Complete the payment\n');
    
    console.log('🔍 To test the webhook locally:');
    console.log('1. Install Stripe CLI: https://stripe.com/docs/stripe-cli');
    console.log('2. Run: stripe listen --forward-to localhost:3001/api/checkout/webhook');
    console.log('3. Complete the payment in the browser\n');
    
    console.log('📊 To check order status:');
    console.log(`   GET ${API_URL}/api/checkout/order/${orderId}\n`);
    
    // Step 2: Check order status
    console.log('2️⃣ Checking initial order status...');
    const orderResponse = await axios.get(`${API_URL}/api/checkout/order/${orderId}`);
    
    console.log('📦 Order Status:');
    console.log(`   Status: ${orderResponse.data.order.status}`);
    console.log(`   Payment: ${orderResponse.data.order.paymentStatus}`);
    console.log(`   Fulfillment: ${orderResponse.data.order.fulfillmentStatus}\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Monitor order status
async function monitorOrder(orderId) {
  console.log(`\n🔄 Monitoring order ${orderId}...`);
  console.log('Press Ctrl+C to stop\n');
  
  setInterval(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/checkout/order/${orderId}`);
      const order = response.data.order;
      
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[${timestamp}] Status: ${order.status} | Payment: ${order.paymentStatus} | Fulfillment: ${order.fulfillmentStatus}`);
      
      if (order.status === 'completed' && order.fulfillmentStatus === 'fulfilled') {
        console.log('\n✅ Order fulfilled successfully!');
        console.log('📧 Check the test email for download link');
        process.exit(0);
      }
    } catch (error) {
      console.error('Error checking order:', error.message);
    }
  }, 5000); // Check every 5 seconds
}

// Run test based on command line arguments
const command = process.argv[2];
const orderId = process.argv[3];

if (command === 'monitor' && orderId) {
  monitorOrder(orderId);
} else {
  testPurchaseFlow();
  
  console.log('\n💡 TIP: To monitor an order, run:');
  console.log('   node test-purchase-flow.js monitor ORDER_ID');
}