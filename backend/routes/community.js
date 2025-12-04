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
            if (!req.userId) {
                console.warn('Import called without req.userId. Request headers:', req.headers);
                return res.status(401).json({ error: 'Authentication required' });
            }

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
     * POST /api/community/publish/:id (legacy)
     */
    // Preferred path: /:id/publish (matches frontend & README)
    router.post('/:id/publish', async (req, res) => {
        try {
            if (!req.userId) {
                console.warn('Publish called without req.userId. Request headers:', req.headers);
                return res.status(401).json({ error: 'Authentication required' });
            }
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

            // Get locking options from request body
            const { isLocked = false, hiddenFields = [] } = req.body;

            // Publish
            const published = await communityService.publishCharacter(
                req.userId,
                req.params.id,
                { isLocked, hiddenFields }
            );

            res.json({
                ...(published || {}),
                message: 'Character published to community'
            });

        } catch (error) {
            console.error('Error publishing character:', error);
            // If validation or user error, surface as 400 so frontend can show the message
            if (error && (error.message && (error.message.includes('Character') || error.message.includes('validation') || error.message.includes('required')))) {
                return res.status(400).json({ error: error.message });
            }
            res.status(500).json({ error: 'Failed to publish character' });
        }
    });

    // Legacy path kept for backward compatibility
    router.post('/publish/:id', async (req, res) => {
        try {
            if (!req.userId) {
                console.warn('Legacy publish called without req.userId. Request headers:', req.headers);
                return res.status(401).json({ error: 'Authentication required' });
            }
            // Delegate to the preferred route logic above
            const { characters } = await characterService.getCharacters(req.userId);
            const character = characters.find(c => c.id === req.params.id);

            if (!character) {
                return res.status(404).json({ error: 'Character not found' });
            }

            const validation = profanityFilter.validateCharacterContent(character);
            if (!validation.valid) {
                return res.status(400).json({
                    error: 'Character contains inappropriate content',
                    details: validation.errors
                });
            }

            // Get locking options from request body
            const { isLocked = false, hiddenFields = [] } = req.body;

            const published = await communityService.publishCharacter(
                req.userId,
                req.params.id,
                { isLocked, hiddenFields }
            );

            res.json({
                ...(published || {}),
                message: 'Character published to community'
            });

        } catch (error) {
            console.error('Error publishing character (legacy):', error);
            res.status(500).json({ error: 'Failed to publish character' });
        }
    });

    /**
     * Unpublish character from community
     * POST /api/characters/:id/unpublish
     */
    // Preferred path: /:id/unpublish
    router.post('/:id/unpublish', async (req, res) => {
        try {
            if (!req.userId) {
                console.warn('Unpublish called without req.userId. Request headers:', req.headers);
                return res.status(401).json({ error: 'Authentication required' });
            }
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

    // Legacy path for backward compatibility
    router.post('/unpublish/:id', async (req, res) => {
        try {
            if (!req.userId) {
                console.warn('Legacy unpublish called without req.userId. Request headers:', req.headers);
                return res.status(401).json({ error: 'Authentication required' });
            }
            const character = await communityService.unpublishCharacter(
                req.userId,
                req.params.id
            );

            res.json({
                ...character,
                message: 'Character removed from community'
            });
        } catch (error) {
            console.error('Error unpublishing character (legacy):', error);
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

    // ============================================================================
    // SCENE/SCENARIO ROUTES
    // ============================================================================

    /**
     * Get community scenes
     * GET /api/community/scenes
     */
    router.get('/scenes', async (req, res) => {
        try {
            const {
                limit = 20,
                offset = 0,
                sortBy = 'recent',
                search
            } = req.query;

            const options = {
                limit: parseInt(limit),
                offset: parseInt(offset),
                sortBy,
                searchQuery: search || ''
            };

            const result = await communityService.getCommunityScenes(options);
            res.json(result);

        } catch (error) {
            console.error('Error fetching community scenes:', error);
            res.status(500).json({ error: 'Failed to fetch community scenes' });
        }
    });

    /**
     * Publish scene to community
     * POST /api/community/scenes/:id/publish
     */
    router.post('/scenes/:id/publish', async (req, res) => {
        try {
            if (!req.userId) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            // Get locking options from request body
            const { isLocked = false, hiddenFields = [] } = req.body;

            const published = await communityService.publishScene(
                req.userId,
                req.params.id,
                { isLocked, hiddenFields }
            );

            res.json({
                ...published,
                message: 'Scene published to community'
            });

        } catch (error) {
            console.error('Error publishing scene:', error);
            res.status(500).json({ error: 'Failed to publish scene' });
        }
    });

    /**
     * Unpublish scene from community
     * POST /api/community/scenes/:id/unpublish
     */
    router.post('/scenes/:id/unpublish', async (req, res) => {
        try {
            if (!req.userId) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            const scene = await communityService.unpublishScene(
                req.userId,
                req.params.id
            );

            res.json({
                ...scene,
                message: 'Scene removed from community'
            });

        } catch (error) {
            console.error('Error unpublishing scene:', error);
            res.status(500).json({ error: 'Failed to unpublish scene' });
        }
    });

    /**
     * Import a community scene
     * POST /api/community/scenes/:id/import
     */
    router.post('/scenes/:id/import', async (req, res) => {
        try {
            if (!req.userId) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            const scene = await communityService.importScene(
                req.userId,
                req.params.id
            );

            res.status(201).json({
                ...scene,
                message: 'Scene imported successfully'
            });

        } catch (error) {
            console.error('Error importing scene:', error);
            res.status(500).json({ error: 'Failed to import scene' });
        }
    });

    /**
     * Increment scene view count
     * POST /api/community/scenes/:id/view
     */
    router.post('/scenes/:id/view', async (req, res) => {
        try {
            await communityService.incrementSceneViewCount(req.params.id);
            res.json({ success: true });
        } catch (error) {
            console.error('Error incrementing scene view count:', error);
            res.status(500).json({ error: 'Failed to update view count' });
        }
    });

    return router;
};
