// backend/routes/user.js
// Routes for user settings and persona management

const express = require('express');
const router = express.Router();
const { STRING_LIMITS } = require('../constants/defaults');

module.exports = (db) => {
    /**
     * Get user settings
     * GET /api/user/settings
     */
    router.get('/settings', async (req, res) => {
        try {
            const settings = await db.getUserSettings(req.userId);
            res.json(settings);
        } catch (error) {
            console.error('Error fetching user settings:', error);
            res.status(500).json({ error: 'Failed to fetch user settings' });
        }
    });

    /**
     * Update user settings
     * PUT /api/user/settings
     */
    router.put('/settings', async (req, res) => {
        try {
            const settings = await db.updateUserSettings(req.userId, req.body);

            res.json({
                settings: settings,
                message: 'Settings updated successfully'
            });
        } catch (error) {
            console.error('Error updating user settings:', error);
            res.status(500).json({ error: 'Failed to update user settings' });
        }
    });

    /**
     * Get user persona
     * GET /api/user/persona
     */
    router.get('/persona', async (req, res) => {
        try {
            const result = await db.getUserPersona(req.userId);
            res.json(result);
        } catch (error) {
            console.error('Error fetching user persona:', error);
            res.status(500).json({ error: 'Failed to fetch user persona' });
        }
    });

    /**
     * Create or update user persona
     * POST /api/user/persona
     */
    router.post('/persona', async (req, res) => {
        try {
            const { name, personality, interests, communication_style, avatar, color } = req.body;

            // Validation
            if (!name || !personality) {
                return res.status(400).json({
                    error: 'Name and personality are required fields'
                });
            }

            if (name.trim().length === 0 || name.trim().length > 50) {
                return res.status(400).json({
                    error: 'Name must be between 1 and 50 characters'
                });
            }

            if (personality.trim().length === 0) {
                return res.status(400).json({
                    error: 'Personality cannot be empty'
                });
            }

            if (personality.length > STRING_LIMITS.USER_PERSONA_PERSONALITY_MAX) {
                return res.status(400).json({
                    error: `Personality must be ${STRING_LIMITS.USER_PERSONA_PERSONALITY_MAX} characters or less`
                });
            }

            const persona = await db.createOrUpdateUserPersona(req.userId, {
                name: name.trim(),
                personality: personality.trim(),
                interests: interests || [],
                communication_style: communication_style?.trim() || '',
                avatar: avatar || '=d',
                color: color || 'from-blue-500 to-indigo-500'
            });

            res.json({
                ...persona,
                message: 'User persona saved successfully'
            });

        } catch (error) {
            console.error('Error saving user persona:', error);
            res.status(500).json({ error: 'Failed to save user persona' });
        }
    });

    /**
     * Delete user persona
     * DELETE /api/user/persona
     */
    router.delete('/persona', async (req, res) => {
        try {
            const result = await db.deleteUserPersona(req.userId);
            res.json(result);
        } catch (error) {
            console.error('Error deleting user persona:', error);
            res.status(500).json({ error: 'Failed to delete user persona' });
        }
    });

    return router;
};
