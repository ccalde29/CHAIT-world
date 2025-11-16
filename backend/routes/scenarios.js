// backend/routes/scenarios.js
// Routes for scenario management

const express = require('express');
const router = express.Router();

module.exports = (db) => {
    /**
     * Get all scenarios
     * GET /api/scenarios
     */
    router.get('/', async (req, res) => {
        try {
            const result = await db.getScenarios(req.userId);
            res.json(result);
        } catch (error) {
            console.error('Error fetching scenarios:', error);
            res.status(500).json({ error: 'Failed to fetch scenarios' });
        }
    });

    /**
     * Create a new scenario
     * POST /api/scenarios
     */
    router.post('/', async (req, res) => {
        try {
            const { name, description, context, atmosphere } = req.body;

            if (!name || !description || !context) {
                return res.status(400).json({
                    error: 'Name, description, and context are required fields'
                });
            }

            const scenario = await db.createScenario(req.userId, {
                name: name.trim(),
                description: description.trim(),
                context: context.trim(),
                atmosphere: atmosphere?.trim() || 'neutral'
            });

            res.status(201).json({
                ...scenario,
                message: 'Scene created successfully'
            });

        } catch (error) {
            console.error('Error creating scenario:', error);

            if (error.code === '23505') {
                return res.status(400).json({
                    error: 'Scene name already exists'
                });
            }

            res.status(500).json({ error: 'Failed to create scenario' });
        }
    });

    /**
     * Update a scenario
     * PUT /api/scenarios/:id
     */
    router.put('/:id', async (req, res) => {
        try {
            const defaultScenarios = ['coffee-shop', 'study-group', 'party'];
            if (defaultScenarios.includes(req.params.id)) {
                return res.status(400).json({
                    error: 'Default scenarios cannot be edited. Create a custom scenario instead.'
                });
            }

            const { name, description, context, atmosphere } = req.body;

            if (!name || !description || !context) {
                return res.status(400).json({
                    error: 'Name, description, and context are required fields'
                });
            }

            const scenario = await db.updateScenario(req.userId, req.params.id, {
                name: name.trim(),
                description: description.trim(),
                context: context.trim(),
                atmosphere: atmosphere?.trim()
            });

            res.json({
                ...scenario,
                message: 'Scene updated successfully'
            });

        } catch (error) {
            console.error('Error updating scenario:', error);

            if (error.code === '23505') {
                return res.status(400).json({
                    error: 'Scene name already exists'
                });
            }

            res.status(500).json({ error: 'Failed to update scenario' });
        }
    });

    /**
     * Delete a scenario
     * DELETE /api/scenarios/:id
     */
    router.delete('/:id', async (req, res) => {
        try {
            const defaultScenarios = ['coffee-shop', 'study-group', 'party'];
            if (defaultScenarios.includes(req.params.id)) {
                return res.status(400).json({
                    error: 'Default scenarios cannot be deleted'
                });
            }

            const result = await db.deleteScenario(req.userId, req.params.id);
            res.json(result);
        } catch (error) {
            console.error('Error deleting scenario:', error);
            res.status(500).json({ error: 'Failed to delete scenario' });
        }
    });

    return router;
};
