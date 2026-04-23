// backend/routes/custom-models.js
// CRUD routes for local custom model presets

const express = require('express');

module.exports = (db) => {
    const router = express.Router();

    // GET /api/custom-models — list all presets for the current user
    router.get('/', async (req, res) => {
        try {
            const models = await db.getCustomModels(req.userId);
            res.json({ models });
        } catch (err) {
            console.error('[custom-models] GET /', err);
            res.status(500).json({ error: 'Failed to fetch custom models' });
        }
    });

    // GET /api/custom-models/:id
    router.get('/:id', async (req, res) => {
        try {
            const model = await db.getCustomModel(req.params.id);
            if (!model) return res.status(404).json({ error: 'Model not found' });
            res.json(model);
        } catch (err) {
            console.error('[custom-models] GET /:id', err);
            res.status(500).json({ error: 'Failed to fetch model' });
        }
    });

    // POST /api/custom-models — create a preset
    router.post('/', async (req, res) => {
        try {
            const { name, display_name, description, provider, model_id,
                    custom_system_prompt, temperature, max_tokens,
                    top_p, frequency_penalty, presence_penalty, repetition_penalty,
                    stop_sequences, tags } = req.body;

            if (!name || !provider || !model_id) {
                return res.status(400).json({ error: 'name, provider, and model_id are required' });
            }

            const model = await db.createCustomModel(req.userId, {
                name, display_name, description, provider, model_id,
                custom_system_prompt, temperature, max_tokens,
                top_p, frequency_penalty, presence_penalty, repetition_penalty,
                stop_sequences, tags
            });

            res.status(201).json(model);
        } catch (err) {
            console.error('[custom-models] POST /', err);
            res.status(500).json({ error: 'Failed to create model' });
        }
    });

    // PUT /api/custom-models/:id — update a preset
    router.put('/:id', async (req, res) => {
        try {
            const existing = await db.getCustomModel(req.params.id);
            if (!existing) return res.status(404).json({ error: 'Model not found' });

            const model = await db.updateCustomModel(req.params.id, req.body);
            res.json(model);
        } catch (err) {
            console.error('[custom-models] PUT /:id', err);
            res.status(500).json({ error: 'Failed to update model' });
        }
    });

    // DELETE /api/custom-models/:id
    router.delete('/:id', async (req, res) => {
        try {
            const existing = await db.getCustomModel(req.params.id);
            if (!existing) return res.status(404).json({ error: 'Model not found' });

            await db.deleteCustomModel(req.params.id);
            res.json({ success: true });
        } catch (err) {
            console.error('[custom-models] DELETE /:id', err);
            res.status(500).json({ error: 'Failed to delete model' });
        }
    });

    return router;
};
