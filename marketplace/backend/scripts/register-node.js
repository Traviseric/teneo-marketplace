/**
 * register-node.js
 *
 * Registers this marketplace node with a federation registry endpoint.
 * Usage: node marketplace/backend/scripts/register-node.js
 *
 * Required env vars:
 *   REGISTRY_URL    — URL of the federation registry (e.g. https://registry.teneo.io)
 *   PUBLIC_URL      — This node's public URL (e.g. https://my-store.example.com)
 *   STORE_ID        — Unique store identifier (e.g. my-store)
 * Optional:
 *   MARKETPLACE_NAME — Human-readable store name
 */

require('dotenv').config();

const axios = require('axios');
const networkConfig = require('../config/network');

async function registerNode() {
    const registryUrl = process.env.REGISTRY_URL;
    const publicUrl = process.env.PUBLIC_URL;
    const storeId = process.env.STORE_ID;

    if (!registryUrl) {
        console.error('Error: REGISTRY_URL environment variable is required.');
        console.error('Set it to the federation registry endpoint, e.g.:');
        console.error('  REGISTRY_URL=https://registry.teneo.io npm run register-node');
        process.exit(1);
    }

    if (!publicUrl) {
        console.error('Error: PUBLIC_URL environment variable is required.');
        process.exit(1);
    }

    if (!storeId) {
        console.error('Error: STORE_ID environment variable is required.');
        process.exit(1);
    }

    // Wait for networkConfig to init (keys may not be ready synchronously)
    await new Promise(resolve => setTimeout(resolve, 500));

    const payload = {
        storeId,
        name: process.env.MARKETPLACE_NAME || storeId,
        publicUrl,
        publicKey: networkConfig.publicKey,
        services: {
            search: true,
            catalog: networkConfig.shareCatalog,
            referrals: networkConfig.acceptReferrals
        },
        revenueSharePct: networkConfig.referralPercentage || 10,
        version: '1.0.0',
        registeredAt: new Date().toISOString()
    };

    console.log(`Registering node "${storeId}" at ${registryUrl}...`);

    try {
        const response = await axios.post(`${registryUrl}/api/nodes/register`, payload, {
            timeout: 10000,
            headers: { 'Content-Type': 'application/json' }
        });

        console.log('Node registered successfully!');
        console.log('Registry response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        if (error.response) {
            console.error(`Registration failed: HTTP ${error.response.status}`);
            console.error('Response:', error.response.data);
        } else {
            console.error('Registration failed:', error.message);
            console.error('Ensure REGISTRY_URL is reachable and the registry is running.');
        }
        process.exit(1);
    }
}

registerNode();
