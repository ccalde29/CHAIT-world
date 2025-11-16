// backend/routes/characters.js
// Routes for character management

const express = require('express');
const router = express.Router();

module.exports = (characterService) => {
    /**
     * Get all characters
     * GET /api/characters
     */
    router.get('/', async (req, res) => {
        try {
            const { sortBy, tags, search } = req.query;

            const result = await characterService.getCharacters(req.userId);

            // Apply client-side filters if provided
            let characters = result.characters;

            if (tags) {
                const tagArray = tags.split(',');
                characters = characters.filter(char =>
                    char.tags?.some(tag => tagArray.includes(tag))
                );
            }

            if (search) {
                const searchLower = search.toLowerCase();
                characters = characters.filter(char =>
                    char.name.toLowerCase().includes(searchLower) ||
                    char.personality.toLowerCase().includes(searchLower)
                );
            }

            if (sortBy === 'alphabetical') {
                characters.sort((a, b) => a.name.localeCompare(b.name));
            } else if (sortBy === 'recent') {
                characters.sort((a, b) =>
                    new Date(b.created_at || 0) - new Date(a.created_at || 0)
                );
            }

            res.json({
                characters,
                total: characters.length
            });
        } catch (error) {
            console.error('Error fetching characters:', error);
            res.status(500).json({ error: 'Failed to fetch characters' });
        }
    });

    /**
     * Create a new character
     * POST /api/characters
     */
    router.post('/', async (req, res) => {
        try {
            const characterData = req.body;

            // Validate age
            if (!characterData.age || characterData.age < 18) {
                return res.status(400).json({
                    error: 'Character must be 18 or older'
                });
            }

            const character = await characterService.createCharacter(
                req.userId,
                characterData
            );

            res.status(201).json({
                ...character,
                message: 'Character created successfully'
            });

        } catch (error) {
            console.error('Error creating character:', error);

            if (error.validationErrors) {
                return res.status(400).json({
                    error: error.validationErrors[0]
                });
            }

            if (error.code === '23505') {
                return res.status(400).json({
                    error: 'Character name already exists'
                });
            }

            res.status(500).json({ error: 'Failed to create character' });
        }
    });

    /**
     * Update a character
     * PUT /api/characters/:id
     */
    router.put('/:id', async (req, res) => {
        try {
            const characterData = req.body;

            // Validate age
            if (characterData.age && characterData.age < 18) {
                return res.status(400).json({
                    error: 'Character must be 18 or older'
                });
            }

            const character = await characterService.updateCharacter(
                req.userId,
                req.params.id,
                characterData
            );

            res.json({
                ...character,
                message: 'Character updated successfully'
            });

        } catch (error) {
            console.error('Error updating character:', error);

            if (error.validationErrors) {
                return res.status(400).json({
                    error: error.validationErrors[0]
                });
            }

            if (error.code === '23505') {
                return res.status(400).json({
                    error: 'Character name already exists'
                });
            }

            res.status(500).json({ error: 'Failed to update character' });
        }
    });

    /**
     * Delete a character
     * DELETE /api/characters/:id
     */
    router.delete('/:id', async (req, res) => {
        try {
            const result = await characterService.deleteCharacter(
                req.userId,
                req.params.id
            );
            res.json(result);
        } catch (error) {
            console.error('Error deleting character:', error);
            res.status(500).json({ error: 'Failed to delete character' });
        }
    });

    return router;
};
