'use strict';

/**
 * Managed hosting tiers — $29 / $79 / $149 per month
 *
 * stripe_price_id: set via STRIPE_PRICE_STARTER / STRIPE_PRICE_PRO / STRIPE_PRICE_WHITELABEL env vars.
 * Operators must create recurring Stripe Products + Prices in their Stripe dashboard
 * and set these env vars before subscriptions will work.
 */
module.exports = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    stripe_price_id: process.env.STRIPE_PRICE_STARTER || null,
    features: ['1 store', '100 products', 'Email support', 'Custom domain'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 79,
    stripe_price_id: process.env.STRIPE_PRICE_PRO || null,
    features: [
      '3 stores',
      'Unlimited products',
      'Priority support',
      'Custom domain',
      'Advanced analytics',
    ],
  },
  {
    id: 'whitelabel',
    name: 'White-label',
    price: 149,
    stripe_price_id: process.env.STRIPE_PRICE_WHITELABEL || null,
    features: [
      'Unlimited stores',
      'Remove OpenBazaar branding',
      'Dedicated support',
      'SLA guarantee',
      'White-label dashboard',
    ],
  },
];
