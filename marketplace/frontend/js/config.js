// API Configuration
// This file centralizes all API endpoints and configuration

window.API_CONFIG = {
    // Main API Base URL
    API_URL: 'https://teneo-marketplace-api.onrender.com',
    
    // API Endpoints
    ENDPOINTS: {
        BOOKS: '/api/books',
        CHECKOUT: '/api/create-checkout-session',
        DOWNLOAD_TOKEN: '/api/download/create-token',
        DOWNLOAD_FILE: '/api/download/file',
        NETWORK_SEARCH: '/api/network/search',
        NETWORK_CATALOG: '/api/network/catalog',
        NETWORK_BOOK: '/api/network/book',
        NETWORK_STATS: '/api/network/stats',
        NETWORK_PING: '/api/network/ping',
        NEWSLETTER: '/api/newsletter',
        WEBHOOK: '/api/checkout/webhook'
    },
    
    // Network Configuration
    NETWORK: {
        TIMEOUT: 5000, // 5 second timeout for network requests
        MAX_RETRIES: 3,
        RETRY_DELAY: 1000
    },
    
    // Environment Detection
    IS_DEVELOPMENT: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    
    // Helper function to build full URL
    buildURL: function(endpoint) {
        return this.API_URL + endpoint;
    },
    
    // Helper function for network store API calls
    buildNetworkURL: function(storeApiBase, endpoint) {
        return storeApiBase + endpoint;
    }
};

// For backwards compatibility, also set as global
window.API_URL = window.API_CONFIG.API_URL;

    API_URL: window.API_CONFIG.API_URL,
    Environment: window.API_CONFIG.IS_DEVELOPMENT ? 'Development' : 'Production'
});