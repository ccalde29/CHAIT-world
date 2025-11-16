// backend/routes/memory.js
// Routes for character memory and relationship management

const express = require('express');
const router = express.Router();

module.exports = (db) => {
    /**
     * Get character memories
     * GET /api/character/:characterId/memories
     */
    router.get('/:characterId/memories', async (req, res) => {
        try {
            const memories = await db.getCharacterMemories(req.params.characterId, req.userId, 20);
            res.json({ memories });
        } catch (error) {
            console.error('Error fetching character memories:', error);
            res.status(500).json({ error: 'Failed to fetch character memories' });
        }
    });

    /**
     * Get character relationship
     * GET /api/character/:characterId/relationship
     */
    router.get('/:characterId/relationship', async (req, res) => {
        try {
            const relationship = await db.getCharacterRelationship(req.params.characterId, req.userId);
            res.json({ relationship });
        } catch (error) {
            console.error('Error fetching character relationship:', error);
            res.status(500).json({ error: 'Failed to fetch character relationship' });
        }
    });

    /**
     * Clear character memories
     * DELETE /api/character/:characterId/memories
     */
    router.delete('/:characterId/memories', async (req, res) => {
        try {
            await db.clearCharacterMemories(req.params.characterId, req.userId);
            res.json({ message: 'Character memories cleared successfully' });
        } catch (error) {
            console.error('Error clearing character memories:', error);
            res.status(500).json({ error: 'Failed to clear character memories' });
        }
    });

    return router;
};
