// Network Service for Teneo Marketplace
// Handles cross-store queries, registry management, and federation

const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

class NetworkService {
    constructor() {
        this.registryPath = path.join(__dirname, '../../shared/network-registry.json');
        this.registry = null;
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.init();
    }

    async init() {
        await this.loadRegistry();
        // Refresh registry periodically
        setInterval(() => this.loadRegistry(), 30 * 60 * 1000); // 30 minutes
    }

    // Load network registry
    async loadRegistry() {
        try {
            const data = await fs.readFile(this.registryPath, 'utf8');
            this.registry = JSON.parse(data);
            console.log(`Loaded network registry with ${this.registry.stores.length} stores`);
        } catch (error) {
            console.error('Failed to load network registry:', error);
            // Create default registry if not exists
            this.registry = {
                version: '1.0',
                stores: [{
                    id: 'teneo-main',
                    name: 'Teneo Books',
                    url: 'http://localhost:3001',
                    api: 'http://localhost:3001/api',
                    status: 'active'
                }]
            };
        }
    }

    // Get all active stores
    getActiveStores() {
        if (!this.registry) return [];
        return this.registry.stores.filter(store => 
            store.status === 'active' && store.id !== 'teneo-main'
        );
    }

    // Search across network stores
    async searchNetwork(query, options = {}) {
        const results = {
            query,
            timestamp: new Date().toISOString(),
            stores: [],
            totalResults: 0
        };

        const activeStores = this.getActiveStores();
        const searchPromises = activeStores.map(store => 
            this.searchStore(store, query, options)
                .then(storeResults => ({
                    store,
                    results: storeResults,
                    status: 'success'
                }))
                .catch(error => ({
                    store,
                    results: null,
                    status: 'error',
                    error: error.message
                }))
        );

        const storeResponses = await Promise.allSettled(searchPromises);

        for (const response of storeResponses) {
            if (response.status === 'fulfilled') {
                const { store, results, status, error } = response.value;
                
                if (status === 'success' && results) {
                    results.stores.push({
                        ...store,
                        results: results.results || [],
                        resultCount: results.totalResults || 0
                    });
                    results.totalResults += results.totalResults || 0;
                } else {
                    console.error(`Search failed for store ${store.id}:`, error);
                }
            }
        }

        return results;
    }

    // Search a specific store
    async searchStore(store, query, options = {}) {
        const cacheKey = `search-${store.id}-${query}-${JSON.stringify(options)}`;
        
        // Check cache
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const params = new URLSearchParams({ q: query });
            if (options.category) params.append('category', options.category);
            if (options.maxPrice) params.append('maxPrice', options.maxPrice);

            const response = await axios.get(`${store.api}/search`, {
                params,
                timeout: 5000,
                headers: {
                    'User-Agent': 'Teneo-Network-Client/1.0',
                    'X-Network-Store': 'teneo-main'
                }
            });

            const data = response.data;
            
            // Cache successful results
            if (data.success) {
                this.setCache(cacheKey, data);
            }

            return data;
        } catch (error) {
            console.error(`Error searching store ${store.id}:`, error.message);
            throw error;
        }
    }

    // Get catalog from network store
    async getStoreCatalog(store, options = {}) {
        const cacheKey = `catalog-${store.id}-${JSON.stringify(options)}`;
        
        // Check cache
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response = await axios.get(`${store.api}/catalog`, {
                params: options,
                timeout: 10000
            });

            const data = response.data;
            
            // Cache successful results
            if (data.success) {
                this.setCache(cacheKey, data);
            }

            return data;
        } catch (error) {
            console.error(`Error fetching catalog from ${store.id}:`, error.message);
            throw error;
        }
    }

    // Aggregate catalogs from all stores
    async getNetworkCatalog(options = {}) {
        const activeStores = this.getActiveStores();
        const catalogs = [];

        const catalogPromises = activeStores.map(store =>
            this.getStoreCatalog(store, options)
                .then(catalog => ({
                    store,
                    catalog,
                    status: 'success'
                }))
                .catch(error => ({
                    store,
                    catalog: null,
                    status: 'error',
                    error: error.message
                }))
        );

        const responses = await Promise.allSettled(catalogPromises);

        for (const response of responses) {
            if (response.status === 'fulfilled' && response.value.status === 'success') {
                const { store, catalog } = response.value;
                if (catalog && catalog.books) {
                    catalogs.push({
                        store,
                        books: catalog.books
                    });
                }
            }
        }

        return catalogs;
    }

    // Ping network stores to check health
    async checkNetworkHealth() {
        const stores = this.registry ? this.registry.stores : [];
        const health = {
            timestamp: new Date().toISOString(),
            stores: []
        };

        const healthPromises = stores.map(store =>
            this.pingStore(store)
                .then(result => ({
                    ...store,
                    ...result
                }))
        );

        health.stores = await Promise.all(healthPromises);
        health.activeCount = health.stores.filter(s => s.active).length;
        health.totalCount = health.stores.length;

        return health;
    }

    // Ping a specific store
    async pingStore(store) {
        try {
            const startTime = Date.now();
            const response = await axios.post(`${store.api}/network/ping`, {
                fromStore: 'teneo-main',
                timestamp: new Date().toISOString()
            }, {
                timeout: 3000
            });

            const latency = Date.now() - startTime;
            return {
                active: response.data.success || false,
                latency,
                lastSeen: new Date().toISOString()
            };
        } catch (error) {
            return {
                active: false,
                error: error.message,
                lastSeen: null
            };
        }
    }

    // Register a new store (admin function)
    async registerStore(storeData) {
        try {
            // Validate store data
            if (!storeData.id || !storeData.name || !storeData.url || !storeData.api) {
                throw new Error('Missing required store fields');
            }

            // Check if store already exists
            if (this.registry.stores.find(s => s.id === storeData.id)) {
                throw new Error('Store ID already exists');
            }

            // Add to registry
            const newStore = {
                ...storeData,
                joined: new Date().toISOString(),
                verified: false,
                status: 'pending'
            };

            this.registry.stores.push(newStore);
            
            // Save registry
            await this.saveRegistry();

            return { success: true, store: newStore };
        } catch (error) {
            console.error('Store registration error:', error);
            return { success: false, error: error.message };
        }
    }

    // Save registry to file
    async saveRegistry() {
        try {
            this.registry.updated = new Date().toISOString();
            await fs.writeFile(
                this.registryPath,
                JSON.stringify(this.registry, null, 2),
                'utf8'
            );
            console.log('Network registry saved');
        } catch (error) {
            console.error('Failed to save registry:', error);
            throw error;
        }
    }

    // Get network statistics
    async getNetworkStats() {
        const stats = {
            totalStores: this.registry ? this.registry.stores.length : 0,
            activeStores: 0,
            totalBooks: 0,
            categories: new Set()
        };

        // Get health check to determine active stores
        const health = await this.checkNetworkHealth();
        stats.activeStores = health.activeCount;

        // Get book counts from active stores
        const activeStores = health.stores.filter(s => s.active);
        
        for (const store of activeStores) {
            try {
                const response = await axios.get(`${store.api}/stats`, {
                    timeout: 3000
                });
                
                if (response.data.success) {
                    stats.totalBooks += response.data.stats.totalBooks || 0;
                    (response.data.stats.categories || []).forEach(cat => 
                        stats.categories.add(cat)
                    );
                }
            } catch (error) {
                console.log(`Failed to get stats from ${store.id}`);
            }
        }

        stats.categories = Array.from(stats.categories);
        return stats;
    }

    // Cache management
    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    getFromCache(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;

        // Check if cache is expired
        if (Date.now() - cached.timestamp > this.cacheTimeout) {
            this.cache.delete(key);
            return null;
        }

        return cached.data;
    }

    clearCache() {
        this.cache.clear();
    }
}

// Singleton instance
let networkService;

function getNetworkService() {
    if (!networkService) {
        networkService = new NetworkService();
    }
    return networkService;
}

module.exports = {
    NetworkService,
    getNetworkService
};