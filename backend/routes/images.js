// backend/routes/images.js
// Routes for image upload and management

const express = require('express');
const router = express.Router();

module.exports = (db) => {
    /**
     * Update character image
     * PUT /api/characters/:id/image
     */
    router.put('/characters/:id/image', async (req, res) => {
        try {
            const { url, filename, useCustomImage } = req.body;

            const result = await db.updateCharacterImage(req.userId, req.params.id, {
                url,
                filename,
                useCustomImage
            });

            res.json({
                ...result,
                message: 'Character image updated successfully'
            });

        } catch (error) {
            console.error('Error updating character image:', error);
            res.status(500).json({ error: 'Failed to update character image' });
        }
    });

    /**
     * Update user persona image
     * PUT /api/user/persona/image
     */
    router.put('/user/persona/image', async (req, res) => {
        try {
            const { url, filename, useCustomImage } = req.body;

            const result = await db.updateUserPersonaImage(req.userId, {
                url,
                filename,
                useCustomImage
            });

            res.json({
                ...result,
                message: 'Persona image updated successfully'
            });

        } catch (error) {
            console.error('Error updating persona image:', error);
            res.status(500).json({ error: 'Failed to update persona image' });
        }
    });

    /**
     * Update scenario image
     * PUT /api/scenarios/:id/image
     */
    router.put('/scenarios/:id/image', async (req, res) => {
        try {
            const { url, filename, useCustomImage } = req.body;

            const defaultScenarios = ['coffee-shop', 'study-group', 'party'];
            if (defaultScenarios.includes(req.params.id)) {
                return res.status(400).json({
                    error: 'Default scenarios cannot have custom backgrounds. Create a custom scenario instead.'
                });
            }

            const result = await db.updateScenarioImage(req.userId, req.params.id, {
                url,
                filename,
                useCustomImage
            });

            res.json({
                ...result,
                message: 'Scene background updated successfully'
            });

        } catch (error) {
            console.error('Error updating scenario image:', error);
            res.status(500).json({ error: 'Failed to update scenario background' });
        }
    });

    /**
     * Delete an image
     * DELETE /api/images/:type/:filename
     */
    router.delete('/:type/:filename', async (req, res) => {
        try {
            const { type, filename } = req.params;

            if (!['character', 'persona', 'scene'].includes(type)) {
                return res.status(400).json({ error: 'Invalid image type' });
            }

            await db.deleteImage(req.userId, filename, type);

            res.json({ message: 'Image deleted successfully' });

        } catch (error) {
            console.error('Error deleting image:', error);
            res.status(500).json({ error: 'Failed to delete image' });
        }
    });

    return router;
};
