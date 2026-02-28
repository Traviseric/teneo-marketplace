/**
 * NFT Routes
 *
 * API endpoints for Proof of Read NFTs:
 * - Mint book NFTs
 * - Badge claiming
 * - Library management
 * - Inheritance setup
 */

const express = require('express');
const router = express.Router();
const nftService = require('../services/nftService');
const db = require('../database/database');
const { publicApiLimit } = require('../middleware/rateLimits');
const { safeMessage } = require('../utils/validate');

/**
 * POST /api/nft/mint
 * Mint a book NFT after purchase
 *
 * Body: {
 *   userAddress: string,
 *   bookId: string,
 *   brand: string,
 *   bookData: { title, author, description, category, filePath }
 * }
 */
router.post('/mint', publicApiLimit, async (req, res) => {
    try {
        const { userAddress, bookId, brand, bookData } = req.body;

        if (!userAddress || !bookId || !brand || !bookData) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        // Check if already minted
        const existing = await db.get(`
            SELECT * FROM nft_mints
            WHERE user_address = ? AND book_id = ?
        `, [userAddress, bookId]);

        if (existing) {
            return res.status(400).json({
                success: false,
                error: 'NFT already minted for this book'
            });
        }

        // Mint the NFT
        const result = await nftService.mintBookNFT(userAddress, bookId, brand, bookData);

        if (!result || result.tokenId === null) {
            return res.status(503).json({
                success: false,
                error: 'NFT minting is not available: smart contracts are not configured on this server.'
            });
        }

        // Check for new badges
        const newBadges = await nftService.checkAndAwardBadges(userAddress);

        res.json({
            success: true,
            nft: result,
            newBadges: newBadges.map(b => b.name),
            message: newBadges.length > 0
                ? `NFT minted! You earned ${newBadges.length} new badge(s)!`
                : 'NFT minted successfully!'
        });

    } catch (error) {
        console.error('Error minting NFT:', error);
        res.status(500).json({
            success: false,
            error: safeMessage(error)
        });
    }
});

/**
 * GET /api/nft/library/:address
 * Get all books owned by a wallet address
 */
router.get('/library/:address', publicApiLimit, async (req, res) => {
    try {
        const { address } = req.params;
        const books = await nftService.getUserLibrary(address);

        res.json({
            success: true,
            count: books.length,
            books
        });

    } catch (error) {
        console.error('Error getting library:', error);
        res.status(500).json({
            success: false,
            error: safeMessage(error)
        });
    }
});

/**
 * GET /api/nft/badges/:address
 * Get all badges earned by a wallet address
 */
router.get('/badges/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const badges = await nftService.getUserBadges(address);

        // Group by category
        const grouped = {
            milestone: badges.filter(b => b.category === 'milestone'),
            controversial: badges.filter(b => b.category === 'controversial'),
            topic: badges.filter(b => b.category === 'topic'),
            special: badges.filter(b => b.category === 'special')
        };

        res.json({
            success: true,
            total: badges.length,
            badges,
            grouped
        });

    } catch (error) {
        console.error('Error getting badges:', error);
        res.status(500).json({
            success: false,
            error: safeMessage(error)
        });
    }
});

/**
 * POST /api/nft/claim-badges/:address
 * Check for and claim any eligible badges
 */
router.post('/claim-badges/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const newBadges = await nftService.checkAndAwardBadges(address);

        res.json({
            success: true,
            claimed: newBadges.length,
            badges: newBadges
        });

    } catch (error) {
        console.error('Error claiming badges:', error);
        res.status(500).json({
            success: false,
            error: safeMessage(error)
        });
    }
});

/**
 * GET /api/nft/stats/:address
 * Get library statistics for a wallet
 */
router.get('/stats/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const stats = await nftService.getLibraryStats(address);

        res.json({
            success: true,
            stats
        });

    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({
            success: false,
            error: safeMessage(error)
        });
    }
});

/**
 * POST /api/nft/inheritance/create
 * Create or update inheritance plan
 *
 * Body: {
 *   ownerAddress: string,
 *   beneficiaries: string[], // Array of wallet addresses
 *   releaseDate: number,     // Unix timestamp
 *   heartbeatInterval: number, // Days between check-ins
 *   notes: string            // Message to beneficiaries
 * }
 */
router.post('/inheritance/create', async (req, res) => {
    try {
        const { ownerAddress, beneficiaries, releaseDate, heartbeatInterval, notes } = req.body;

        if (!ownerAddress || !beneficiaries || beneficiaries.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        // Save to database
        await db.run(`
            INSERT OR REPLACE INTO library_inheritance
            (owner_address, beneficiaries, release_date, heartbeat_interval,
             last_heartbeat, notes, is_active, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
        `, [
            ownerAddress,
            JSON.stringify(beneficiaries),
            releaseDate,
            heartbeatInterval * 86400, // Convert days to seconds
            Math.floor(Date.now() / 1000),
            notes || ''
        ]);

        // TODO: Call smart contract when deployed
        // const tx = await inheritanceContract.createInheritancePlan(
        //     beneficiaries, releaseDate, heartbeatInterval, notes
        // );

        res.json({
            success: true,
            message: 'Inheritance plan created',
            plan: {
                ownerAddress,
                beneficiaries,
                releaseDate,
                heartbeatInterval,
                notes
            }
        });

    } catch (error) {
        console.error('Error creating inheritance plan:', error);
        res.status(500).json({
            success: false,
            error: safeMessage(error)
        });
    }
});

/**
 * POST /api/nft/inheritance/heartbeat
 * Send heartbeat to delay automatic execution
 *
 * Body: {
 *   ownerAddress: string
 * }
 */
router.post('/inheritance/heartbeat', async (req, res) => {
    try {
        const { ownerAddress } = req.body;

        if (!ownerAddress) {
            return res.status(400).json({
                success: false,
                error: 'Missing owner address'
            });
        }

        // Update last heartbeat
        const result = await db.run(`
            UPDATE library_inheritance
            SET last_heartbeat = ?, updated_at = CURRENT_TIMESTAMP
            WHERE owner_address = ? AND is_active = 1
        `, [Math.floor(Date.now() / 1000), ownerAddress]);

        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                error: 'No active inheritance plan found'
            });
        }

        // TODO: Call smart contract when deployed
        // const tx = await inheritanceContract.heartbeat();

        res.json({
            success: true,
            message: 'Heartbeat received',
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('Error sending heartbeat:', error);
        res.status(500).json({
            success: false,
            error: safeMessage(error)
        });
    }
});

/**
 * GET /api/nft/inheritance/:address
 * Get inheritance plan details
 */
router.get('/inheritance/:address', async (req, res) => {
    try {
        const { address } = req.params;

        const plan = await db.get(`
            SELECT * FROM library_inheritance
            WHERE owner_address = ?
        `, [address]);

        if (!plan) {
            return res.status(404).json({
                success: false,
                error: 'No inheritance plan found'
            });
        }

        // Parse beneficiaries JSON
        plan.beneficiaries = JSON.parse(plan.beneficiaries);

        // Calculate status
        const now = Math.floor(Date.now() / 1000);
        const timeSinceHeartbeat = now - plan.last_heartbeat;
        const canExecute = plan.is_active && (
            now >= plan.release_date ||
            (plan.heartbeat_interval > 0 && timeSinceHeartbeat >= plan.heartbeat_interval)
        );

        res.json({
            success: true,
            plan: {
                ownerAddress: plan.owner_address,
                beneficiaries: plan.beneficiaries,
                releaseDate: plan.release_date,
                heartbeatInterval: Math.floor(plan.heartbeat_interval / 86400), // Convert to days
                lastHeartbeat: plan.last_heartbeat,
                isActive: plan.is_active,
                isExecuted: plan.is_executed,
                notes: plan.notes,
                canExecute,
                status: canExecute ? 'READY_TO_EXECUTE' : (plan.is_executed ? 'EXECUTED' : 'ACTIVE')
            }
        });

    } catch (error) {
        console.error('Error getting inheritance plan:', error);
        res.status(500).json({
            success: false,
            error: safeMessage(error)
        });
    }
});

/**
 * GET /api/nft/inheritance/beneficiary/:address
 * Get plans where user is a beneficiary
 */
router.get('/inheritance/beneficiary/:address', async (req, res) => {
    try {
        const { address } = req.params;

        const plans = await db.all(`
            SELECT * FROM library_inheritance
            WHERE beneficiaries LIKE ?
        `, [`%"${address}"%`]);

        res.json({
            success: true,
            count: plans.length,
            plans: plans.map(p => ({
                ...p,
                beneficiaries: JSON.parse(p.beneficiaries)
            }))
        });

    } catch (error) {
        console.error('Error getting beneficiary plans:', error);
        res.status(500).json({
            success: false,
            error: safeMessage(error)
        });
    }
});

/**
 * POST /api/nft/inheritance/execute/:ownerAddress
 * Execute inheritance plan (transfer NFTs to beneficiaries)
 */
router.post('/inheritance/execute/:ownerAddress', async (req, res) => {
    try {
        const { ownerAddress } = req.params;

        const plan = await db.get(`
            SELECT * FROM library_inheritance
            WHERE owner_address = ? AND is_active = 1
        `, [ownerAddress]);

        if (!plan) {
            return res.status(404).json({
                success: false,
                error: 'No active inheritance plan found'
            });
        }

        // Check if can execute
        const now = Math.floor(Date.now() / 1000);
        const timeSinceHeartbeat = now - plan.last_heartbeat;
        const canExecute = now >= plan.release_date ||
            (plan.heartbeat_interval > 0 && timeSinceHeartbeat >= plan.heartbeat_interval);

        if (!canExecute) {
            return res.status(400).json({
                success: false,
                error: 'Inheritance plan cannot be executed yet',
                releaseDate: plan.release_date,
                lastHeartbeat: plan.last_heartbeat
            });
        }

        // TODO: Call smart contract when deployed
        // const tx = await inheritanceContract.executeInheritance(ownerAddress);
        // const receipt = await tx.wait();

        // Mark as executed
        await db.run(`
            UPDATE library_inheritance
            SET is_executed = 1, is_active = 0, executed_at = CURRENT_TIMESTAMP
            WHERE owner_address = ?
        `, [ownerAddress]);

        const beneficiaries = JSON.parse(plan.beneficiaries);

        res.json({
            success: true,
            message: 'Inheritance executed',
            ownerAddress,
            beneficiaries,
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('Error executing inheritance:', error);
        res.status(500).json({
            success: false,
            error: safeMessage(error)
        });
    }
});

/**
 * GET /api/nft/wallet/:address
 * Get wallet info and statistics
 */
router.get('/wallet/:address', async (req, res) => {
    try {
        const { address } = req.params;

        // Get or create wallet record
        let wallet = await db.get(`
            SELECT * FROM user_wallets
            WHERE wallet_address = ?
        `, [address]);

        if (!wallet) {
            await db.run(`
                INSERT INTO user_wallets (wallet_address)
                VALUES (?)
            `, [address]);

            wallet = await db.get(`
                SELECT * FROM user_wallets
                WHERE wallet_address = ?
            `, [address]);
        }

        // Get stats
        const stats = await nftService.getLibraryStats(address);

        // Update wallet stats
        await db.run(`
            UPDATE user_wallets
            SET total_nfts = ?, total_badges = ?, last_activity = CURRENT_TIMESTAMP
            WHERE wallet_address = ?
        `, [stats.totalBooks, stats.totalBadges, address]);

        res.json({
            success: true,
            wallet: {
                address: wallet.wallet_address,
                displayName: wallet.display_name,
                connectedAt: wallet.connected_at,
                stats
            }
        });

    } catch (error) {
        console.error('Error getting wallet info:', error);
        res.status(500).json({
            success: false,
            error: safeMessage(error)
        });
    }
});

/**
 * GET /api/nft/transfers/:tokenId
 * Get transfer history for a book NFT
 */
router.get('/transfers/:tokenId', async (req, res) => {
    try {
        const { tokenId } = req.params;

        const transfers = await db.all(`
            SELECT * FROM nft_transfers
            WHERE token_id = ?
            ORDER BY transferred_at DESC
        `, [tokenId]);

        res.json({
            success: true,
            count: transfers.length,
            transfers
        });

    } catch (error) {
        console.error('Error getting transfers:', error);
        res.status(500).json({
            success: false,
            error: safeMessage(error)
        });
    }
});

/**
 * GET /api/nft/ipfs/:hash
 * Get IPFS pin status and access info
 */
router.get('/ipfs/:hash', async (req, res) => {
    try {
        const { hash } = req.params;

        const pin = await db.get(`
            SELECT * FROM ipfs_pins
            WHERE ipfs_hash = ?
        `, [hash]);

        if (!pin) {
            return res.status(404).json({
                success: false,
                error: 'IPFS hash not found'
            });
        }

        // Update access count
        await db.run(`
            UPDATE ipfs_pins
            SET access_count = access_count + 1, last_accessed = CURRENT_TIMESTAMP
            WHERE ipfs_hash = ?
        `, [hash]);

        res.json({
            success: true,
            ipfs: {
                hash: pin.ipfs_hash,
                contentType: pin.content_type,
                bookId: pin.book_id,
                pinStatus: pin.pin_status,
                pinService: pin.pin_service,
                gateway: `https://gateway.pinata.cloud/ipfs/${hash}`,
                pinnedAt: pin.pinned_at
            }
        });

    } catch (error) {
        console.error('Error getting IPFS info:', error);
        res.status(500).json({
            success: false,
            error: safeMessage(error)
        });
    }
});

/**
 * GET /api/nft/leaderboard
 * Get badge leaderboard (top collectors)
 */
router.get('/leaderboard', async (req, res) => {
    try {
        const { limit = 100 } = req.query;

        const leaderboard = await db.all(`
            SELECT * FROM badge_leaderboard
            LIMIT ?
        `, [parseInt(limit)]);

        res.json({
            success: true,
            count: leaderboard.length,
            leaderboard
        });

    } catch (error) {
        console.error('Error getting leaderboard:', error);
        res.status(500).json({
            success: false,
            error: safeMessage(error)
        });
    }
});

/**
 * GET /api/nft/badge-definitions
 * Get all available badges and their requirements
 */
router.get('/badge-definitions', async (req, res) => {
    try {
        const badges = await db.all(`
            SELECT * FROM badge_definitions
            WHERE is_active = 1
            ORDER BY badge_id
        `);

        // Group by category
        const grouped = {
            milestone: badges.filter(b => b.category === 'milestone'),
            controversial: badges.filter(b => b.category === 'controversial'),
            topic: badges.filter(b => b.category === 'topic'),
            special: badges.filter(b => b.category === 'special')
        };

        res.json({
            success: true,
            total: badges.length,
            badges,
            grouped
        });

    } catch (error) {
        console.error('Error getting badge definitions:', error);
        res.status(500).json({
            success: false,
            error: safeMessage(error)
        });
    }
});

module.exports = router;
