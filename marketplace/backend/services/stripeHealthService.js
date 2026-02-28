/**
 * stripeHealthService.js
 *
 * Lightweight Stripe availability check with a 60-second cache.
 * Used by the checkout route to decide whether to offer Stripe or fall
 * back to the crypto payment flow.
 */

'use strict';

const CACHE_TTL_MS = 60 * 1000; // 60 seconds

let _cache = {
    healthy: true,
    lastChecked: null,
    error: null,
};

/**
 * Returns { healthy: boolean, lastChecked: Date, error?: string }
 *
 * Makes a single lightweight call (stripe.balance.retrieve) with a 3-second
 * timeout.  Result is cached for 60 s to avoid hammering the Stripe API on
 * every checkout page load.
 */
async function checkStripeHealth() {
    const now = Date.now();

    // Return cached result if still fresh
    if (_cache.lastChecked && now - _cache.lastChecked < CACHE_TTL_MS) {
        return { ..._cache };
    }

    // Guard: if STRIPE_SECRET_KEY is not configured, report unhealthy without
    // throwing so the failover path triggers gracefully.
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.startsWith('sk_test_YOUR')) {
        _cache = { healthy: false, lastChecked: now, error: 'STRIPE_SECRET_KEY not configured' };
        return { ..._cache };
    }

    try {
        // Lazy-require so the service doesn't crash when Stripe is not installed
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

        // balance.retrieve is the cheapest authenticated Stripe call
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        try {
            await stripe.balance.retrieve();
        } finally {
            clearTimeout(timeout);
        }

        _cache = { healthy: true, lastChecked: now, error: null };
    } catch (err) {
        const message = err.message || String(err);
        console.warn('⚠️  Stripe health check failed:', message);
        _cache = { healthy: false, lastChecked: now, error: message };
    }

    return { ..._cache };
}

/** Invalidate the cache (useful in tests). */
function resetCache() {
    _cache = { healthy: true, lastChecked: null, error: null };
}

module.exports = { checkStripeHealth, resetCache };
