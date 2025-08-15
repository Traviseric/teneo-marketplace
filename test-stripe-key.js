require('dotenv').config();

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

console.log('Testing Stripe API key...\n');
console.log('Key starts with:', process.env.STRIPE_SECRET_KEY?.substring(0, 20) + '...');

async function testStripeKey() {
  try {
    // Try to list products (this will fail with invalid key)
    const products = await stripe.products.list({ limit: 1 });
    console.log('✅ Stripe key is valid!');
    console.log(`Found ${products.data.length} products`);
    
    // Test creating a simple price
    const price = await stripe.prices.create({
      currency: 'usd',
      unit_amount: 1000,
      product_data: {
        name: 'Test Product',
      },
    });
    
    console.log('✅ Successfully created test price:', price.id);
    console.log('\nYour Stripe keys are working correctly!');
    
  } catch (error) {
    console.error('❌ Stripe key test failed:', error.message);
    
    if (error.message.includes('Invalid API Key')) {
      console.log('\nPlease check that your Stripe key is correct and active.');
    }
  }
}

testStripeKey();