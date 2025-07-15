// Network Client for Teneo Marketplace Federation
// Handles network discovery, cross-store search, and federation features

class NetworkClient {
    constructor() {
        this.registryUrl = '/network-registry.json';
        this.localApiUrl = window.location.origin + '/api';
        this.networkCache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.storeInfo = null;
        this.networkStores = [];
        this.init();
    }

    async init() {
        await this.loadStoreInfo();
        await this.loadNetworkRegistry();
    }

    // Load local store information
    async loadStoreInfo() {
        try {
            const response = await fetch(`${this.localApiUrl}/store/info`);
            const data = await response.json();
            if (data.success) {
                this.storeInfo = data.store;
            }
        } catch (error) {
            console.error('Failed to load store info:', error);
        }
    }

    // Load network registry of all participating stores
    async loadNetworkRegistry() {
        try {
            // Check cache first
            const cached = this.getFromCache('registry');
            if (cached) {
                this.networkStores = cached.stores || cached;
                this.registryData = cached;
                return this.networkStores;
            }

            const response = await fetch(this.registryUrl);
            const data = await response.json();
            this.networkStores = data.stores || [];
            this.registryData = data;
            
            // Cache the registry
            this.setCache('registry', data);
            
            console.log(`Loaded ${this.networkStores.length} stores from network registry`);
            return this.networkStores;
        } catch (error) {
            console.error('Failed to load network registry:', error);
            // Fallback to local store only
            this.networkStores = this.storeInfo ? [{
                ...this.storeInfo,
                status: 'local'
            }] : [];
            return this.networkStores;
        }
    }

    // Register this store with the network (for store owners)
    async registerWithNetwork(storeData) {
        try {
            // In production, this would POST to a central registry API
            // For now, we'll simulate success
            console.log('Registering store with network:', storeData);
            
            const registration = {
                ...storeData,
                id: storeData.id || `store-${Date.now()}`,
                joined: new Date().toISOString(),
                verified: false,
                status: 'pending'
            };

            // Show success message
            if (window.showNotification) {
                window.showNotification('Store registration submitted! Awaiting network approval.', 'success');
            }

            return { success: true, registration };
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, error: error.message };
        }
    }

    // Search across all network stores
    async searchNetwork(query, options = {}) {
        const { 
            category = null, 
            maxPrice = null,
            timeout = 5000,
            includeLocal = true 
        } = options;

        const searchPromises = [];
        const results = {
            query,
            timestamp: new Date().toISOString(),
            stores: [],
            totalResults: 0,
            errors: []
        };

        // Search local store if requested
        if (includeLocal && this.storeInfo) {
            searchPromises.push(
                this.searchStore(this.storeInfo, query, { category, maxPrice })
                    .then(storeResults => {
                        results.stores.push({
                            ...this.storeInfo,
                            results: storeResults.results || [],
                            resultCount: storeResults.totalResults || 0,
                            status: 'success'
                        });
                    })
                    .catch(error => {
                        results.errors.push({
                            store: this.storeInfo.id,
                            error: error.message
                        });
                    })
            );
        }

        // Search network stores
        for (const store of this.networkStores) {
            if (store.id === this.storeInfo?.id) continue; // Skip local if already searched

            const searchPromise = Promise.race([
                this.searchStore(store, query, { category, maxPrice }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout')), timeout)
                )
            ]).then(storeResults => {
                results.stores.push({
                    ...store,
                    results: storeResults.results || [],
                    resultCount: storeResults.totalResults || 0,
                    status: 'success'
                });
            }).catch(error => {
                results.stores.push({
                    ...store,
                    results: [],
                    resultCount: 0,
                    status: 'error',
                    error: error.message
                });
                results.errors.push({
                    store: store.id,
                    error: error.message
                });
            });

            searchPromises.push(searchPromise);
        }

        // Wait for all searches to complete
        await Promise.allSettled(searchPromises);

        // Calculate total results
        results.totalResults = results.stores.reduce((sum, store) => 
            sum + (store.resultCount || 0), 0
        );

        // Sort stores by result count
        results.stores.sort((a, b) => (b.resultCount || 0) - (a.resultCount || 0));

        return results;
    }

    // Search a specific store
    async searchStore(store, query, options = {}) {
        const cacheKey = `search-${store.id}-${query}-${JSON.stringify(options)}`;
        
        // Check cache
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }

        try {
            const params = new URLSearchParams({ q: query });
            if (options.category) params.append('category', options.category);
            if (options.maxPrice) params.append('maxPrice', options.maxPrice);

            const response = await fetch(`${store.api}/search?${params}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            // Cache successful results
            if (data.success) {
                this.setCache(cacheKey, data);
            }

            return data;
        } catch (error) {
            console.error(`Error searching store ${store.id}:`, error);
            throw error;
        }
    }

    // Get catalog from a specific store
    async getStoreCatalog(store, options = {}) {
        const { brand = 'all', limit = null, offset = 0 } = options;
        const cacheKey = `catalog-${store.id}-${brand}-${limit}-${offset}`;
        
        // Check cache
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }

        try {
            const params = new URLSearchParams({ brand });
            if (limit) params.append('limit', limit);
            if (offset) params.append('offset', offset);

            const response = await fetch(`${store.api}/catalog?${params}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            // Cache successful results
            if (data.success) {
                this.setCache(cacheKey, data);
            }

            return data;
        } catch (error) {
            console.error(`Error fetching catalog from ${store.id}:`, error);
            throw error;
        }
    }

    // Get detailed book information from network
    async getNetworkBook(networkId) {
        try {
            // Parse network ID to determine store
            const parts = networkId.split('-');
            const storeId = parts[0];
            
            // Find the store
            const store = this.networkStores.find(s => s.id === storeId) || this.storeInfo;
            
            if (!store) {
                throw new Error('Store not found');
            }

            const response = await fetch(`${store.api}/book/${networkId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`Error fetching book ${networkId}:`, error);
            throw error;
        }
    }

    // Get network statistics
    async getNetworkStats() {
        const stats = {
            totalStores: this.networkStores.length,
            activeStores: 0,
            totalBooks: 0,
            totalBrands: 0,
            categories: new Set(),
            lastUpdated: new Date().toISOString()
        };

        const statsPromises = [];

        for (const store of this.networkStores) {
            const promise = fetch(`${store.api}/stats`)
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        stats.activeStores++;
                        stats.totalBooks += data.stats.totalBooks || 0;
                        stats.totalBrands += data.stats.totalBrands || 0;
                        (data.stats.categories || []).forEach(cat => stats.categories.add(cat));
                    }
                })
                .catch(error => {
                    console.log(`Store ${store.id} stats unavailable`);
                });

            statsPromises.push(promise);
        }

        await Promise.allSettled(statsPromises);

        stats.categories = Array.from(stats.categories);
        return stats;
    }

    // Ping a store to check if it's active
    async pingStore(store) {
        try {
            const response = await fetch(`${store.api}/network/ping`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fromStore: this.storeInfo?.id || 'anonymous',
                    timestamp: new Date().toISOString()
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            return { active: data.success, latency: Date.now() - new Date().getTime() };
        } catch (error) {
            return { active: false, error: error.message };
        }
    }

    // Check network health
    async checkNetworkHealth() {
        const health = {
            timestamp: new Date().toISOString(),
            stores: []
        };

        const healthPromises = this.networkStores.map(store => 
            this.pingStore(store).then(result => ({
                ...store,
                ...result
            }))
        );

        health.stores = await Promise.all(healthPromises);
        health.activeCount = health.stores.filter(s => s.active).length;
        health.totalCount = health.stores.length;
        health.healthPercentage = (health.activeCount / health.totalCount) * 100;

        return health;
    }

    // Cache management
    setCache(key, data) {
        this.networkCache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    getFromCache(key) {
        const cached = this.networkCache.get(key);
        if (!cached) return null;

        // Check if cache is expired
        if (Date.now() - cached.timestamp > this.cacheTimeout) {
            this.networkCache.delete(key);
            return null;
        }

        return cached.data;
    }

    clearCache() {
        this.networkCache.clear();
    }

    // Format price across different stores
    formatNetworkPrice(price, currency = 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(price);
    }

    // Get trending books across network
    async getTrendingBooks(limit = 10) {
        try {
            // For MVP, we'll aggregate top books from each store
            const allBooks = [];
            
            for (const store of this.networkStores.slice(0, 5)) { // Limit to 5 stores
                try {
                    const catalog = await this.getStoreCatalog(store, { limit: 5 });
                    if (catalog.success && catalog.books) {
                        allBooks.push(...catalog.books);
                    }
                } catch (error) {
                    console.log(`Failed to get trending from ${store.id}`);
                }
            }

            // Sort by rating and return top N
            return allBooks
                .sort((a, b) => (b.rating || 0) - (a.rating || 0))
                .slice(0, limit);
        } catch (error) {
            console.error('Error getting trending books:', error);
            return [];
        }
    }
}

// Global network client instance
let networkClient;

// Initialize network client when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    networkClient = new NetworkClient();
    window.networkClient = networkClient; // Make globally available
    
    console.log('Network client initialized');
    
    // Load network data
    await networkClient.init();
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NetworkClient;
}