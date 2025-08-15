const express = require('express');
const router = express.Router();
const networkConfig = require('../config/network');
const { authenticateAdmin } = require('../middleware/auth');

// Get network status (public endpoint)
router.get('/status', async (req, res) => {
    try {
        const status = networkConfig.getNetworkStatus();
        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        console.error('Network status error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to get network status' 
        });
    }
});

// Get network discovery info (public endpoint)
router.get('/discovery', async (req, res) => {
    try {
        const discoveryInfo = networkConfig.getDiscoveryInfo();
        if (!discoveryInfo) {
            return res.status(404).json({
                success: false,
                error: 'Network not enabled'
            });
        }
        
        res.json({
            success: true,
            data: discoveryInfo
        });
    } catch (error) {
        console.error('Network discovery error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to get discovery info' 
        });
    }
});

// Admin endpoints - require authentication
router.use(authenticateAdmin);

// Get network configuration
router.get('/config', async (req, res) => {
    try {
        const config = {
            networkEnabled: networkConfig.networkEnabled,
            shareCatalog: networkConfig.shareCatalog,
            acceptReferrals: networkConfig.acceptReferrals,
            referralPercentage: networkConfig.referralPercentage,
            publicKey: networkConfig.publicKey,
            networkPeers: networkConfig.networkPeers,
            trustedStores: networkConfig.trustedStores,
            federationSettings: networkConfig.federationSettings
        };
        
        res.json({
            success: true,
            data: config
        });
    } catch (error) {
        console.error('Network config error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to get network config' 
        });
    }
});

// Update network settings
router.post('/config', async (req, res) => {
    try {
        const { networkEnabled, shareCatalog, acceptReferrals, referralPercentage } = req.body;
        
        if (typeof networkEnabled === 'boolean') {
            await networkConfig.setNetworkEnabled(networkEnabled);
        }
        
        if (typeof shareCatalog === 'boolean') {
            await networkConfig.setCatalogSharing(shareCatalog);
        }
        
        if (typeof acceptReferrals === 'boolean' && typeof referralPercentage === 'number') {
            await networkConfig.setReferralSettings(acceptReferrals, referralPercentage);
        }
        
        res.json({
            success: true,
            message: 'Network settings updated successfully'
        });
    } catch (error) {
        console.error('Network config update error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to update network settings' 
        });
    }
});

// Get network statistics
router.get('/stats', async (req, res) => {
    try {
        const stats = networkConfig.getNetworkStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Network stats error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to get network stats' 
        });
    }
});

// Network health check
router.get('/health', async (req, res) => {
    try {
        const health = await networkConfig.healthCheck();
        res.json({
            success: true,
            data: health
        });
    } catch (error) {
        console.error('Network health check error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to check network health' 
        });
    }
});

// Add trusted store
router.post('/trusted-stores', async (req, res) => {
    try {
        const { storeId, publicKey, endpoint } = req.body;
        
        if (!storeId || !publicKey || !endpoint) {
            return res.status(400).json({
                success: false,
                error: 'Store ID, public key, and endpoint are required'
            });
        }
        
        const store = await networkConfig.addTrustedStore(storeId, publicKey, endpoint);
        res.json({
            success: true,
            data: store,
            message: 'Trusted store added successfully'
        });
    } catch (error) {
        console.error('Add trusted store error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to add trusted store' 
        });
    }
});

// Remove trusted store
router.delete('/trusted-stores/:storeId', async (req, res) => {
    try {
        const { storeId } = req.params;
        await networkConfig.removeTrustedStore(storeId);
        
        res.json({
            success: true,
            message: 'Trusted store removed successfully'
        });
    } catch (error) {
        console.error('Remove trusted store error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to remove trusted store' 
        });
    }
});

// Add network peer
router.post('/peers', async (req, res) => {
    try {
        const { peerId, endpoint } = req.body;
        
        if (!peerId || !endpoint) {
            return res.status(400).json({
                success: false,
                error: 'Peer ID and endpoint are required'
            });
        }
        
        const peer = await networkConfig.addNetworkPeer(peerId, endpoint);
        res.json({
            success: true,
            data: peer,
            message: 'Network peer added successfully'
        });
    } catch (error) {
        console.error('Add network peer error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to add network peer' 
        });
    }
});

// Remove network peer
router.delete('/peers/:peerId', async (req, res) => {
    try {
        const { peerId } = req.params;
        await networkConfig.removeNetworkPeer(peerId);
        
        res.json({
            success: true,
            message: 'Network peer removed successfully'
        });
    } catch (error) {
        console.error('Remove network peer error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to remove network peer' 
        });
    }
});

// Regenerate keys
router.post('/regenerate-keys', async (req, res) => {
    try {
        // Force regeneration by clearing existing keys
        networkConfig.publicKey = null;
        networkConfig.privateKey = null;
        
        await networkConfig.generateKeysIfNeeded();
        
        res.json({
            success: true,
            message: 'Cryptographic keys regenerated successfully',
            publicKey: networkConfig.publicKey
        });
    } catch (error) {
        console.error('Regenerate keys error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to regenerate keys' 
        });
    }
});

module.exports = router;