/**
 * NFT Service
 *
 * Handles all blockchain interactions for Proof of Read NFTs:
 * - Minting book ownership NFTs
 * - Badge claiming
 * - IPFS uploads
 * - Library management
 * - Inheritance setup
 */

const { ethers } = require('ethers');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const db = require('../database/database');

// Import contract ABIs (will be generated after compilation)
// Use conditional loading to avoid errors before contracts are compiled
let BookOwnershipABI, KnowledgeBadgesABI, LibraryInheritanceABI;
try {
    BookOwnershipABI = require('../contracts/abi/BookOwnership.json');
    KnowledgeBadgesABI = require('../contracts/abi/KnowledgeBadges.json');
    LibraryInheritanceABI = require('../contracts/abi/LibraryInheritance.json');
} catch (error) {
    console.warn('⚠️  NFT contract ABIs not found. Run `npx hardhat compile` to generate them.');
    BookOwnershipABI = null;
    KnowledgeBadgesABI = null;
    LibraryInheritanceABI = null;
}

class NFTService {
    constructor() {
        this.provider = null;
        this.wallet = null;
        this.bookOwnershipContract = null;
        this.badgesContract = null;
        this.inheritanceContract = null;

        // Configuration
        this.network = process.env.BLOCKCHAIN_NETWORK || 'polygon'; // polygon, ethereum, localhost
        this.contractAddresses = {
            bookOwnership: process.env.BOOK_OWNERSHIP_CONTRACT_ADDRESS,
            badges: process.env.BADGES_CONTRACT_ADDRESS,
            inheritance: process.env.INHERITANCE_CONTRACT_ADDRESS
        };

        // IPFS configuration (using Pinata for simplicity)
        this.pinataApiKey = process.env.PINATA_API_KEY;
        this.pinataSecretKey = process.env.PINATA_SECRET_KEY;
        this.pinataJWT = process.env.PINATA_JWT;

        if (!process.env.PINATA_JWT) {
            console.warn('[NFT Service] PINATA_JWT not set — IPFS pinning disabled.');
        }
    }

    /**
     * Initialize blockchain connection
     */
    async initialize() {
        try {
            // Set up provider based on network
            if (this.network === 'localhost') {
                this.provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
            } else if (this.network === 'polygon') {
                this.provider = new ethers.JsonRpcProvider(
                    process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com'
                );
            } else if (this.network === 'ethereum') {
                this.provider = new ethers.JsonRpcProvider(
                    process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com'
                );
            }

            // Set up wallet
            if (process.env.PRIVATE_KEY) {
                this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
            }

            // Initialize contracts
            if (this.contractAddresses.bookOwnership) {
                this.bookOwnershipContract = new ethers.Contract(
                    this.contractAddresses.bookOwnership,
                    BookOwnershipABI,
                    this.wallet
                );
            }

            if (this.contractAddresses.badges) {
                this.badgesContract = new ethers.Contract(
                    this.contractAddresses.badges,
                    KnowledgeBadgesABI,
                    this.wallet
                );
            }

            if (this.contractAddresses.inheritance) {
                this.inheritanceContract = new ethers.Contract(
                    this.contractAddresses.inheritance,
                    LibraryInheritanceABI,
                    this.wallet
                );
            }

            console.log('✅ NFT Service initialized');
            console.log(`   Network: ${this.network}`);
            console.log(`   Wallet: ${this.wallet?.address || 'Not configured'}`);

        } catch (error) {
            console.error('Error initializing NFT Service:', error);
            throw error;
        }
    }

    /**
     * Upload book to IPFS
     * @param {Buffer} fileBuffer - Book file buffer
     * @param {Object} metadata - Book metadata
     * @returns {Promise<string>} IPFS hash
     */
    async uploadToIPFS(fileBuffer, metadata = {}) {
        if (!this.pinataJWT) {
            throw new Error('IPFS not configured: PINATA_JWT environment variable not set');
        }

        try {
            // Upload file to Pinata
            const formData = new FormData();
            formData.append('file', fileBuffer, {
                filename: metadata.filename || 'book.pdf'
            });

            // Add metadata
            const pinataMetadata = JSON.stringify({
                name: metadata.title || 'Untitled Book',
                keyvalues: {
                    author: metadata.author || 'Unknown',
                    bookId: metadata.bookId || '',
                    brand: metadata.brand || ''
                }
            });
            formData.append('pinataMetadata', pinataMetadata);

            const response = await axios.post(
                'https://api.pinata.cloud/pinning/pinFileToIPFS',
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                        'Authorization': `Bearer ${this.pinataJWT}`
                    },
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity
                }
            );

            console.log(`✅ Uploaded to IPFS: ${response.data.IpfsHash}`);
            return response.data.IpfsHash;

        } catch (error) {
            throw new Error(`IPFS upload failed: ${error.message}`);
        }
    }

    /**
     * Upload metadata to IPFS
     * @param {Object} metadata - NFT metadata
     * @returns {Promise<string>} IPFS hash
     */
    async uploadMetadataToIPFS(metadata) {
        if (!this.pinataJWT) {
            throw new Error('IPFS not configured: PINATA_JWT environment variable not set');
        }

        try {
            const response = await axios.post(
                'https://api.pinata.cloud/pinning/pinJSONToIPFS',
                metadata,
                {
                    headers: {
                        'Authorization': `Bearer ${this.pinataJWT}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data.IpfsHash;

        } catch (error) {
            throw new Error(`IPFS metadata upload failed: ${error.message}`);
        }
    }

    /**
     * Mint book NFT for user
     * @param {string} userAddress - User's wallet address
     * @param {string} bookId - Book ID
     * @param {string} brand - Brand name
     * @param {Object} bookData - Book metadata
     * @returns {Promise<Object>} Minting result
     */
    async mintBookNFT(userAddress, bookId, brand, bookData) {
        try {
            console.log(`🎨 Minting NFT for ${bookId} to ${userAddress}...`);

            // Create NFT metadata
            const metadata = {
                name: bookData.title,
                description: bookData.description || '',
                image: bookData.coverImage || '',
                attributes: [
                    { trait_type: 'Author', value: bookData.author },
                    { trait_type: 'Category', value: bookData.category || 'Uncategorized' },
                    { trait_type: 'Brand', value: brand },
                    { trait_type: 'Pages', value: bookData.pages || 0 },
                    { trait_type: 'Purchase Date', value: new Date().toISOString() }
                ],
                external_url: `${process.env.MARKETPLACE_URL}/book/${bookId}`,
                book_id: bookId,
                brand: brand
            };

            // Upload book content to IPFS (in production, encrypt first)
            let contentHash = null;
            if (bookData.filePath) {
                try {
                    const fileBuffer = await fsPromises.readFile(bookData.filePath);
                    contentHash = await this.uploadToIPFS(fileBuffer, {
                        filename: `${bookId}.pdf`,
                        title: bookData.title,
                        author: bookData.author,
                        bookId,
                        brand
                    });
                } catch (err) {
                    if (err.code === 'ENOENT') {
                        console.warn('Book file not found, skipping IPFS content upload:', bookData.filePath);
                    } else {
                        throw err;
                    }
                }
            }

            // Upload metadata to IPFS
            const metadataHash = await this.uploadMetadataToIPFS(metadata);
            const tokenURI = `ipfs://${metadataHash}`;

            // Mint NFT on blockchain
            let tx, receipt, tokenId;

            if (this.bookOwnershipContract) {
                tx = await this.bookOwnershipContract.mintBook(
                    userAddress,
                    bookId,
                    brand,
                    contentHash,
                    metadataHash,
                    tokenURI
                );

                receipt = await tx.wait();

                // Extract token ID from events
                const event = receipt.logs.find(log => {
                    try {
                        const parsed = this.bookOwnershipContract.interface.parseLog(log);
                        return parsed.name === 'BookMinted';
                    } catch {
                        return false;
                    }
                });

                if (event) {
                    const parsed = this.bookOwnershipContract.interface.parseLog(event);
                    tokenId = parsed.args.tokenId.toString();
                }
            } else {
                // Contracts not configured — cannot mint real NFT
                tokenId = null;
                console.warn('⚠️  Smart contracts not configured, skipping NFT mint');
            }

            // Only save to database when a real on-chain mint occurred
            if (tokenId !== null) {
                await db.run(`
                    INSERT INTO nft_mints
                    (user_address, book_id, brand, token_id, ipfs_hash, metadata_hash,
                     transaction_hash, minted_at, network)
                    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
                `, [
                    userAddress,
                    bookId,
                    brand,
                    tokenId,
                    contentHash,
                    metadataHash,
                    receipt?.hash,
                    this.network
                ]);

                console.log(`✅ NFT minted! Token ID: ${tokenId}`);

                return {
                    success: true,
                    tokenId,
                    ipfsHash: contentHash,
                    metadataHash,
                    transactionHash: receipt?.hash,
                    tokenURI
                };
            }

            return {
                success: false,
                tokenId: null,
                reason: 'contracts_not_configured'
            };

        } catch (error) {
            console.error('Error minting NFT:', error);
            throw error;
        }
    }

    /**
     * Check and award badges to user
     * @param {string} userAddress - User's wallet address
     * @returns {Promise<Array>} Newly earned badges
     */
    async checkAndAwardBadges(userAddress) {
        try {
            const newBadges = [];

            // Get user's book count
            const bookCount = await db.get(`
                SELECT COUNT(*) as count
                FROM nft_mints
                WHERE user_address = ?
            `, [userAddress]);

            const count = bookCount.count;

            // Check milestone badges
            const milestoneBadges = [
                { id: 0, count: 1, name: 'First Book' },
                { id: 1, count: 5, name: 'Reading Habit' },
                { id: 2, count: 10, name: 'Book Collector' },
                { id: 3, count: 25, name: 'Library Builder' },
                { id: 4, count: 50, name: 'Scholar' },
                { id: 5, count: 100, name: 'Library Master' }
            ];

            for (const badge of milestoneBadges) {
                if (count >= badge.count) {
                    const hasEarned = await db.get(`
                        SELECT * FROM badge_claims
                        WHERE user_address = ? AND badge_id = ?
                    `, [userAddress, badge.id]);

                    if (!hasEarned) {
                        await this.claimBadge(userAddress, badge.id);
                        newBadges.push(badge);
                    }
                }
            }

            // Check controversial badges (books with danger_index > 50)
            const controversialCount = await db.get(`
                SELECT COUNT(*) as count
                FROM nft_mints nm
                JOIN book_embeddings be ON nm.book_id = be.book_id
                WHERE nm.user_address = ? AND be.danger_index > 50
            `, [userAddress]);

            const controversialBadges = [
                { id: 6, count: 5, name: 'Censorship Survivor' },
                { id: 7, count: 25, name: 'Thought Criminal' },
                { id: 8, count: 50, name: 'Forbidden Library' }
            ];

            for (const badge of controversialBadges) {
                if (controversialCount.count >= badge.count) {
                    const hasEarned = await db.get(`
                        SELECT * FROM badge_claims
                        WHERE user_address = ? AND badge_id = ?
                    `, [userAddress, badge.id]);

                    if (!hasEarned) {
                        await this.claimBadge(userAddress, badge.id);
                        newBadges.push(badge);
                    }
                }
            }

            return newBadges;

        } catch (error) {
            console.error('Error checking badges:', error);
            return [];
        }
    }

    /**
     * Claim a badge
     * @param {string} userAddress - User's wallet address
     * @param {number} badgeId - Badge ID
     */
    async claimBadge(userAddress, badgeId) {
        try {
            console.log(`🏆 Claiming badge ${badgeId} for ${userAddress}...`);

            let tx, receipt;

            if (this.badgesContract) {
                tx = await this.badgesContract.claimBadge(userAddress, badgeId);
                receipt = await tx.wait();
            }

            // Save to database
            await db.run(`
                INSERT INTO badge_claims
                (user_address, badge_id, transaction_hash, claimed_at, network)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)
            `, [
                userAddress,
                badgeId,
                receipt?.hash || 'mock_tx',
                this.network
            ]);

            console.log(`✅ Badge ${badgeId} claimed!`);

        } catch (error) {
            console.error('Error claiming badge:', error);
            throw error;
        }
    }

    /**
     * Get user's library (all owned book NFTs)
     * @param {string} userAddress - User's wallet address
     * @returns {Promise<Array>} User's books
     */
    async getUserLibrary(userAddress) {
        try {
            const books = await db.all(`
                SELECT
                    nm.*,
                    be.title,
                    be.author,
                    be.description,
                    be.category,
                    be.danger_index
                FROM nft_mints nm
                LEFT JOIN book_embeddings be ON nm.book_id = be.book_id
                WHERE nm.user_address = ?
                ORDER BY nm.minted_at DESC
            `, [userAddress]);

            return books;

        } catch (error) {
            console.error('Error getting user library:', error);
            return [];
        }
    }

    /**
     * Get user's badges
     * @param {string} userAddress - User's wallet address
     * @returns {Promise<Array>} User's badges
     */
    async getUserBadges(userAddress) {
        try {
            const badges = await db.all(`
                SELECT * FROM badge_claims
                WHERE user_address = ?
                ORDER BY claimed_at DESC
            `, [userAddress]);

            // Add badge metadata
            const badgeData = [
                { id: 0, name: 'First Book', category: 'milestone' },
                { id: 1, name: 'Reading Habit', category: 'milestone' },
                { id: 2, name: 'Book Collector', category: 'milestone' },
                { id: 3, name: 'Library Builder', category: 'milestone' },
                { id: 4, name: 'Scholar', category: 'milestone' },
                { id: 5, name: 'Library Master', category: 'milestone' },
                { id: 6, name: 'Censorship Survivor', category: 'controversial' },
                { id: 7, name: 'Thought Criminal', category: 'controversial' },
                { id: 8, name: 'Forbidden Library', category: 'controversial' }
            ];

            return badges.map(b => ({
                ...b,
                ...badgeData.find(bd => bd.id === b.badge_id)
            }));

        } catch (error) {
            console.error('Error getting user badges:', error);
            return [];
        }
    }

    /**
     * Get library statistics
     * @param {string} userAddress - User's wallet address
     * @returns {Promise<Object>} Statistics
     */
    async getLibraryStats(userAddress) {
        try {
            const stats = await db.get(`
                SELECT
                    COUNT(*) as total_books,
                    COUNT(DISTINCT nm.brand) as total_brands,
                    AVG(be.danger_index) as avg_danger,
                    MIN(nm.minted_at) as first_purchase
                FROM nft_mints nm
                LEFT JOIN book_embeddings be ON nm.book_id = be.book_id
                WHERE nm.user_address = ?
            `, [userAddress]);

            const badgeCount = await db.get(`
                SELECT COUNT(*) as count FROM badge_claims
                WHERE user_address = ?
            `, [userAddress]);

            return {
                totalBooks: stats.total_books,
                totalBrands: stats.total_brands,
                averageDanger: Math.round(stats.avg_danger || 0),
                firstPurchase: stats.first_purchase,
                totalBadges: badgeCount.count
            };

        } catch (error) {
            console.error('Error getting library stats:', error);
            return {};
        }
    }
}

module.exports = new NFTService();
