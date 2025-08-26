const express = require('express');
const router = express.Router();
const publisherStoryService = require('../services/publisherStoryService');

// Get stories for a specific book
router.get('/books/:bookId/stories', async (req, res) => {
    try {
        const { bookId } = req.params;
        const stories = await publisherStoryService.getBookStories(bookId);
        
        res.json({
            success: true,
            data: { stories }
        });
    } catch (error) {
        console.error('Error fetching book stories:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch book stories'
        });
    }
});

// Add a new story to a book
router.post('/books/:bookId/stories', async (req, res) => {
    try {
        const { bookId } = req.params;
        const storyData = req.body;
        
        const result = await publisherStoryService.addStory(bookId, storyData);
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error adding story:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add story'
        });
    }
});

// Vote on a story
router.post('/stories/:storyId/vote', async (req, res) => {
    try {
        const { storyId } = req.params;
        const { voterEmail, voteType } = req.body;
        
        const result = await publisherStoryService.voteOnStory(storyId, voterEmail, voteType);
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error voting on story:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to vote on story'
        });
    }
});

// Add comment to story
router.post('/stories/:storyId/comments', async (req, res) => {
    try {
        const { storyId } = req.params;
        const commentData = req.body;
        
        const result = await publisherStoryService.addComment(storyId, commentData);
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add comment'
        });
    }
});

// Get publishing tips by category
router.get('/tips/:category?', async (req, res) => {
    try {
        const { category } = req.params;
        const tips = await publisherStoryService.getPublishingTips(category);
        
        res.json({
            success: true,
            data: { tips }
        });
    } catch (error) {
        console.error('Error fetching tips:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch publishing tips'
        });
    }
});

// Join marketplace waitlist
router.post('/marketplace/waitlist', async (req, res) => {
    try {
        const publisherData = req.body;
        const result = await publisherStoryService.joinMarketplaceWaitlist(publisherData);
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error joining waitlist:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to join marketplace waitlist'
        });
    }
});

// Get marketplace statistics and comparison
router.get('/marketplace/stats', async (req, res) => {
    try {
        const stats = await publisherStoryService.getMarketplaceStats();
        const comparison = publisherStoryService.getMarketplaceComparison();
        
        res.json({
            success: true,
            data: { stats, comparison }
        });
    } catch (error) {
        console.error('Error fetching marketplace stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch marketplace statistics'
        });
    }
});

// Get featured success stories
router.get('/success-stories', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const stories = await publisherStoryService.getFeaturedSuccessStories(limit);
        
        res.json({
            success: true,
            data: { stories }
        });
    } catch (error) {
        console.error('Error fetching success stories:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch success stories'
        });
    }
});

// Add collaboration request
router.post('/collaboration-requests', async (req, res) => {
    try {
        const requestData = req.body;
        const result = await publisherStoryService.addCollaborationRequest(requestData);
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error adding collaboration request:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add collaboration request'
        });
    }
});

// Get network visualization data
router.get('/network/visualization', async (req, res) => {
    try {
        const networkData = await publisherStoryService.getNetworkVisualizationData();
        
        res.json({
            success: true,
            data: networkData
        });
    } catch (error) {
        console.error('Error fetching network data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch network visualization data'
        });
    }
});

// Process referral
router.post('/referrals/process', async (req, res) => {
    try {
        const { referralCode, newPublisherEmail } = req.body;
        const result = await publisherStoryService.processReferral(referralCode, newPublisherEmail);
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error processing referral:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process referral'
        });
    }
});

module.exports = router;