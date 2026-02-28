// API Configuration
// Centralizes all API endpoints and auto-detects environment

const _IS_DEV = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const _API_BASE = _IS_DEV ? 'http://localhost:3001' : '';

window.API_CONFIG = {
    // Auto-detected base URL — empty string means same-origin in production
    API_BASE: _API_BASE,

    // For legacy compatibility (was a hardcoded Render URL)
    API_URL: _API_BASE,

    // API Endpoints
    ENDPOINTS: {
        BOOKS: '/api/books',
        CHECKOUT: '/api/checkout/create-session',
        DOWNLOAD_TOKEN: '/api/download/create-token',
        DOWNLOAD_FILE: '/api/download/file',
        NETWORK_SEARCH: '/api/network/search',
        NETWORK_CATALOG: '/api/network/catalog',
        NETWORK_BOOK: '/api/network/book',
        NETWORK_STATS: '/api/network/stats',
        NETWORK_PING: '/api/network/ping',
        NEWSLETTER: '/api/newsletter',
        WEBHOOK: '/api/checkout/webhook',
        AUTH_ME: '/api/auth/me',
        AUTH_LOGIN: '/api/auth/login',
        AUTH_LOGOUT: '/api/auth/logout',
        FRONTEND_CONFIG: '/api/config/frontend'
    },

    // Network Configuration
    NETWORK: {
        TIMEOUT: 5000,
        MAX_RETRIES: 3,
        RETRY_DELAY: 1000
    },

    IS_DEVELOPMENT: _IS_DEV,

    // Helper: build full URL (no-op in production since API_BASE is '')
    buildURL: function(endpoint) {
        return this.API_BASE + endpoint;
    },

    buildNetworkURL: function(storeApiBase, endpoint) {
        return storeApiBase + endpoint;
    }
};

// Legacy global
window.API_URL = window.API_CONFIG.API_BASE;

// Load Stripe publishable key from backend config endpoint
window.STRIPE_PUBLISHABLE_KEY = window.STRIPE_PUBLISHABLE_KEY || '';
(function loadFrontendConfig() {
    fetch(window.API_CONFIG.buildURL('/api/config/frontend'))
        .then(function(r) { return r.json(); })
        .then(function(cfg) {
            if (cfg && cfg.stripePublishableKey) {
                window.STRIPE_PUBLISHABLE_KEY = cfg.stripePublishableKey;
            }
        })
        .catch(function() { /* config endpoint optional */ });
})();
