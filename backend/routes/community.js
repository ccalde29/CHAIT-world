// backend/routes/community.js
// Routes for community hub functionality

const express = require('express');
const router = express.Router();
const profanityFilter = require('../utils/profanityFilter');

module.exports = (communityService, characterService) => {
    /**
     * Get community characters (public)
     * GET /api/community/characters
     */
    router.get('/characters', async (req, res) => {
        try {
            const {
                limit = 20,
                offset = 0,
                sortBy = 'recent',
                tags,
                search
            } = req.query;

            const options = {
                limit: parseInt(limit),
                offset: parseInt(offset),
                sortBy,
                tags: tags ? tags.split(',') : [],
                searchQuery: search || ''
            };

            const result = await communityService.getCommunityCharacters(options);
            res.json(result);

        } catch (error) {
            console.error('Error fetching community characters:', error);
            res.status(500).json({ error: 'Failed to fetch community characters' });
        }
    });

    /**
     * Get popular tags
     * GET /api/community/tags
     */
    router.get('/tags', async (req, res) => {
        try {
            const tags = await communityService.getPopularTags(20);
            res.json({ tags });
        } catch (error) {
            console.error('Error fetching popular tags:', error);
            res.status(500).json({ error: 'Failed to fetch popular tags' });
        }
    });

    /**
     * Import a community character
     * POST /api/community/characters/:id/import
     */
    router.post('/characters/:id/import', async (req, res) => {
        try {
            const character = await communityService.importCharacter(
                req.userId,
                req.params.id
            );

            res.status(201).json({
                ...character,
                message: 'Character imported successfully'
            });
        } catch (error) {
            console.error('Error importing character:', error);
            res.status(500).json({ error: 'Failed to import character' });
        }
    });

    /**
     * Increment view count
     * POST /api/community/characters/:id/view
     */
    router.post('/characters/:id/view', async (req, res) => {
        try {
            await communityService.incrementViewCount(req.params.id);
            res.json({ success: true });
        } catch (error) {
            console.error('Error incrementing view count:', error);
            res.status(500).json({ error: 'Failed to update view count' });
        }
    });

    /**
     * Publish character to community
     * POST /api/characters/:id/publish
     */
    router.post('/publish/:id', async (req, res) => {
        try {
            // Get character
            const { characters } = await characterService.getCharacters(req.userId);
            const character = characters.find(c => c.id === req.params.id);

            if (!character) {
                return res.status(404).json({ error: 'Character not found' });
            }

            // Validate content
            const validation = profanityFilter.validateCharacterContent(character);
            if (!validation.valid) {
                return res.status(400).json({
                    error: 'Character contains inappropriate content',
                    details: validation.errors
                });
            }

            // Publish
            const published = await communityService.publishCharacter(
                req.userId,
                req.params.id
            );

            res.json({
                ...published,
                message: 'Character published to community'
            });

        } catch (error) {
            console.error('Error publishing character:', error);
            res.status(500).json({ error: 'Failed to publish character' });
        }
    });

    /**
     * Unpublish character from community
     * POST /api/characters/:id/unpublish
     */
    router.post('/unpublish/:id', async (req, res) => {
        try {
            const character = await communityService.unpublishCharacter(
                req.userId,
                req.params.id
            );

            res.json({
                ...character,
                message: 'Character removed from community'
            });
        } catch (error) {
            console.error('Error unpublishing character:', error);
            res.status(500).json({ error: 'Failed to unpublish character' });
        }
    });

    /**
     * Add character to favorites
     * POST /api/community/characters/:id/favorite
     */
    router.post('/characters/:id/favorite', async (req, res) => {
        try {
            await communityService.addToFavorites(req.userId, req.params.id);
            res.json({ message: 'Added to favorites' });
        } catch (error) {
            console.error('Error adding to favorites:', error);
            res.status(500).json({ error: 'Failed to add to favorites' });
        }
    });

    /**
     * Remove character from favorites
     * DELETE /api/community/characters/:id/favorite
     */
    router.delete('/characters/:id/favorite', async (req, res) => {
        try {
            await communityService.removeFromFavorites(req.userId, req.params.id);
            res.json({ message: 'Removed from favorites' });
        } catch (error) {
            console.error('Error removing from favorites:', error);
            res.status(500).json({ error: 'Failed to remove from favorites' });
        }
    });

    /**
     * Get user's favorites
     * GET /api/community/favorites
     */
    router.get('/favorites', async (req, res) => {
        try {
            const favorites = await communityService.getUserFavorites(req.userId);
            res.json({ favorites });
        } catch (error) {
            console.error('Error fetching favorites:', error);
            res.status(500).json({ error: 'Failed to fetch favorites' });
        }
    });

    /**
     * Report a character
     * POST /api/community/characters/:id/report
     */
    router.post('/characters/:id/report', async (req, res) => {
        try {
            const { reason, details } = req.body;

            if (!reason) {
                return res.status(400).json({ error: 'Reason is required' });
            }

            await communityService.reportCharacter(
                req.userId,
                req.params.id,
                reason,
                details
            );

            res.json({ message: 'Report submitted successfully' });
        } catch (error) {
            console.error('Error reporting character:', error);
            res.status(500).json({ error: 'Failed to submit report' });
        }
    });

    return router;
};
