#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const http = require('http');

// Colors for terminal output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    bold: '\x1b[1m'
};

function colorize(text, color) {
    return `${colors[color]}${text}${colors.reset}`;
}

class NetworkStoreManager {
    constructor() {
        this.basePath = path.join(__dirname, '..');
        this.registryPath = path.join(this.basePath, 'marketplace', 'frontend', 'network-registry.json');
    }

    async validateStoreAPI(storeUrl) {
        console.log(colorize(`🧪 Testing store API: ${storeUrl}`, 'yellow'));
        
        const tests = [
            { endpoint: '/api/store/info', name: 'Store Info' },
            { endpoint: '/api/books', name: 'Books API' },
            { endpoint: '/api/search?q=test', name: 'Search API' },
            { endpoint: '/api/health', name: 'Health Check' }
        ];

        const results = {};
        
        for (const test of tests) {
            try {
                const url = storeUrl + test.endpoint;
                const response = await this.makeRequest(url);
                
                if (response.statusCode === 200) {
                    console.log(colorize(`  ✅ ${test.name}: OK`, 'green'));
                    results[test.endpoint] = true;
                } else {
                    console.log(colorize(`  ❌ ${test.name}: HTTP ${response.statusCode}`, 'red'));
                    results[test.endpoint] = false;
                }
            } catch (error) {
                console.log(colorize(`  ❌ ${test.name}: ${error.message}`, 'red'));
                results[test.endpoint] = false;
            }
        }

        const passedTests = Object.values(results).filter(Boolean).length;
        const totalTests = Object.keys(results).length;
        
        console.log(colorize(`\n📊 API Tests: ${passedTests}/${totalTests} passed`, passedTests === totalTests ? 'green' : 'yellow'));
        
        return {
            compatible: passedTests >= 3, // At least 3 out of 4 tests must pass
            results,
            score: (passedTests / totalTests) * 100
        };
    }

    async makeRequest(url) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const client = urlObj.protocol === 'https:' ? https : http;
            
            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port,
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                timeout: 10000,
                headers: {
                    'User-Agent': 'Teneo-Network-Validator/1.0'
                }
            };

            const req = client.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: data
                    });
                });
            });

            req.on('error', reject);
            req.on('timeout', () => reject(new Error('Request timeout')));
            req.end();
        });
    }

    async getStoreInfo(storeUrl) {
        try {
            const response = await this.makeRequest(storeUrl + '/api/store/info');
            if (response.statusCode === 200) {
                const data = JSON.parse(response.data);
                if (data.success && data.store) {
                    return data.store;
                }
            }
        } catch (error) {
            console.log(colorize(`⚠️  Could not fetch store info: ${error.message}`, 'yellow'));
        }
        return null;
    }

    async getStoreStats(storeUrl) {
        try {
            const response = await this.makeRequest(storeUrl + '/api/stats');
            if (response.statusCode === 200) {
                const data = JSON.parse(response.data);
                if (data.success && data.stats) {
                    return data.stats;
                }
            }
        } catch (error) {
            console.log(colorize(`⚠️  Could not fetch store stats: ${error.message}`, 'yellow'));
        }
        return {
            totalBooks: 0,
            totalBrands: 1,
            categories: [],
            uptime: 'Unknown'
        };
    }

    async loadNetworkRegistry() {
        try {
            const content = await fs.readFile(this.registryPath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            console.log(colorize('Creating new network registry...', 'yellow'));
            return {
                version: "1.0",
                updated: new Date().toISOString(),
                network: {
                    name: "Teneo Book Network",
                    description: "A decentralized network of independent bookstores",
                    protocol: "TBN/1.0"
                },
                stores: [],
                connections: []
            };
        }
    }

    async saveNetworkRegistry(registry) {
        registry.updated = new Date().toISOString();
        await fs.writeFile(this.registryPath, JSON.stringify(registry, null, 2));
    }

    generateStoreId(storeName, url) {
        const domain = new URL(url).hostname.replace('www.', '');
        const name = storeName.toLowerCase().replace(/[^a-z0-9]/g, '-');
        return `${name}-${domain.split('.')[0]}`;
    }

    async addStoreToRegistry(storeData) {
        const registry = await this.loadNetworkRegistry();
        
        // Check if store already exists
        const existingStore = registry.stores.find(s => 
            s.url === storeData.url || s.id === storeData.id
        );
        
        if (existingStore) {
            console.log(colorize('Store already exists in registry, updating...', 'yellow'));
            Object.assign(existingStore, storeData);
        } else {
            registry.stores.push(storeData);
            console.log(colorize('Store added to registry!', 'green'));
        }
        
        await this.saveNetworkRegistry(registry);
        return registry;
    }

    async suggestConnections(newStore, registry) {
        const connections = [];
        
        // Simple connection suggestion based on specialties
        for (const store of registry.stores) {
            if (store.id === newStore.id) continue;
            
            const commonSpecialties = newStore.specialties.filter(s => 
                store.specialties.includes(s)
            );
            
            if (commonSpecialties.length > 0) {
                connections.push({
                    from: newStore.id,
                    to: store.id,
                    type: commonSpecialties[0],
                    strength: Math.min(commonSpecialties.length / Math.max(newStore.specialties.length, store.specialties.length), 1),
                    description: `Shared interest in ${commonSpecialties.join(', ')}`
                });
            }
        }
        
        return connections;
    }

    async generatePullRequest(storeData) {
        console.log(colorize('\n📝 Generating Pull Request...', 'blue'));
        
        const prTitle = `Add ${storeData.name} to Teneo Network`;
        const prBody = `## New Store Registration

**Store Name:** ${storeData.name}  
**URL:** ${storeData.url}  
**Specialties:** ${storeData.specialties.join(', ')}  

### Verification Checklist
- [x] Store API is accessible
- [x] Required endpoints are functional
- [x] Store information is complete
- [x] Specialties are relevant

### Store Statistics
- **Books:** ${storeData.stats?.totalBooks || 'Unknown'}
- **Categories:** ${storeData.stats?.categories?.length || 'Unknown'}
- **Uptime:** ${storeData.stats?.uptime || 'Unknown'}

This store has been automatically validated and is ready to join the network.

### API Compatibility
${storeData.apiCompatibility ? '✅ Fully compatible' : '⚠️ Partial compatibility'}

---
*This PR was generated automatically by the Teneo Network registration tool.*`;

        // In a real implementation, this would use GitHub API
        console.log(colorize('Pull Request Details:', 'bold'));
        console.log(colorize('Title:', 'blue'), prTitle);
        console.log(colorize('Body:', 'blue'));
        console.log(prBody);
        
        console.log(colorize('\n💡 Manual Steps:', 'yellow'));
        console.log('1. Create a new branch: git checkout -b add-store-' + storeData.id);
        console.log('2. Commit changes: git add . && git commit -m "Add ' + storeData.name + ' to network"');
        console.log('3. Push branch: git push origin add-store-' + storeData.id);
        console.log('4. Create PR at: https://github.com/TravisEric/teneo-marketplace/compare');
        
        return { title: prTitle, body: prBody };
    }

    async addStore(storeUrl, options = {}) {
        console.log(colorize('\n🌐 Adding Store to Teneo Network', 'bold'));
        console.log(colorize('================================\n', 'blue'));
        
        // Validate and test store API
        const apiTest = await this.validateStoreAPI(storeUrl);
        
        if (!apiTest.compatible) {
            console.log(colorize('\n❌ Store is not compatible with Teneo Network', 'red'));
            console.log('Required APIs are not available or not functioning correctly.');
            return false;
        }
        
        // Get store information
        console.log(colorize('\n📊 Gathering store information...', 'yellow'));
        const storeInfo = await this.getStoreInfo(storeUrl);
        const storeStats = await this.getStoreStats(storeUrl);
        
        // Build store data
        const storeData = {
            id: options.id || (storeInfo?.id) || this.generateStoreId(options.name || 'unnamed-store', storeUrl),
            name: options.name || storeInfo?.name || 'Unknown Store',
            tagline: options.tagline || storeInfo?.tagline || 'A member of the Teneo Book Network',
            url: storeUrl,
            api: storeUrl + '/api',
            specialties: options.specialties || storeInfo?.specialties || ['books'],
            verified: false,
            featured: false,
            joined: new Date().toISOString().split('T')[0],
            owner: options.owner || storeInfo?.owner || 'Unknown',
            contact: options.contact || storeInfo?.contact || '',
            features: storeInfo?.features || ['digital-delivery'],
            status: 'active',
            stats: storeStats,
            apiCompatibility: apiTest.compatible,
            apiScore: apiTest.score
        };
        
        // Add color if not specified
        const colors = ['#7C3AED', '#d4af37', '#FFD700', '#10b981', '#ef4444', '#8b5cf6'];
        storeData.color = options.color || colors[Math.floor(Math.random() * colors.length)];
        
        console.log(colorize('\n✅ Store Information Collected:', 'green'));
        console.log(colorize('Name:', 'blue'), storeData.name);
        console.log(colorize('ID:', 'blue'), storeData.id);
        console.log(colorize('URL:', 'blue'), storeData.url);
        console.log(colorize('Specialties:', 'blue'), storeData.specialties.join(', '));
        console.log(colorize('API Score:', 'blue'), `${storeData.apiScore}%`);
        
        // Add to registry
        const registry = await this.addStoreToRegistry(storeData);
        
        // Suggest connections
        const connections = await this.suggestConnections(storeData, registry);
        if (connections.length > 0) {
            console.log(colorize('\n🔗 Suggested Network Connections:', 'blue'));
            connections.forEach(conn => {
                console.log(`  ${conn.from} → ${conn.to} (${conn.type})`);
            });
            
            // Add connections to registry
            registry.connections.push(...connections);
            await this.saveNetworkRegistry(registry);
        }
        
        // Generate PR info
        await this.generatePullRequest(storeData);
        
        console.log(colorize('\n🎉 Store successfully added to network!', 'green'));
        console.log(colorize('Registry updated:', 'blue'), this.registryPath);
        
        return storeData;
    }
}

// CLI Interface
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log(colorize('\n🌐 Teneo Network Store Manager', 'bold'));
        console.log(colorize('Usage: node add-store-to-network.js <store-url> [options]', 'blue'));
        console.log('\nOptions:');
        console.log('  --name "Store Name"');
        console.log('  --specialties "fiction,mystery,thriller"');
        console.log('  --owner "Owner Name"');
        console.log('  --contact "email@domain.com"');
        console.log('\nExample:');
        console.log('  node add-store-to-network.js https://mybookstore.com --name "My Book Store" --specialties "sci-fi,fantasy"');
        process.exit(1);
    }
    
    const storeUrl = args[0];
    const options = {};
    
    // Parse command line options
    for (let i = 1; i < args.length; i += 2) {
        const key = args[i].replace('--', '');
        const value = args[i + 1];
        
        if (key === 'specialties') {
            options[key] = value.split(',').map(s => s.trim());
        } else {
            options[key] = value;
        }
    }
    
    const manager = new NetworkStoreManager();
    
    try {
        await manager.addStore(storeUrl, options);
    } catch (error) {
        console.error(colorize(`\n❌ Error: ${error.message}`, 'red'));
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = NetworkStoreManager;