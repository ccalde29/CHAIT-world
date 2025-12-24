// ============================================================================
// Token Models Routes (Admin Only)
// Manage admin-created AI model presets that use server API keys and cost tokens
// ============================================================================

const express = require('express');
const { requireAdmin } = require('../middleware/adminAuth');

module.exports = (db) => {
  const router = express.Router();

  /**
   * GET /api/token-models
   * Get all active token models (available to all users)
   */
  router.get('/', async (req, res) => {
    try {
      const models = db.localDb.all(
        'SELECT * FROM token_models WHERE is_active = 1 ORDER BY token_cost ASC, display_name ASC'
      );

      // Parse tags JSON string to array
      const parsedModels = models.map(model => ({
        ...model,
        tags: model.tags ? JSON.parse(model.tags) : []
      }));

      res.json({ models: parsedModels || [] });

    } catch (error) {
      console.error('[TokenModels] Error fetching models:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * GET /api/token-models/admin
   * Get all token models including inactive (admin only)
   */
  router.get('/admin', requireAdmin, async (req, res) => {
    try {
      const models = db.localDb.all(
        'SELECT * FROM token_models ORDER BY created_at DESC'
      );

      // Parse tags JSON string to array
      const parsedModels = models.map(model => ({
        ...model,
        tags: model.tags ? JSON.parse(model.tags) : []
      }));

      res.json({ models: parsedModels || [] });

    } catch (error) {
      console.error('[TokenModels] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * POST /api/token-models
   * Create a new token model (admin only)
   */
  router.post('/', requireAdmin, async (req, res) => {
    try {
      const {
        name,
        display_name,
        description,
        ai_provider,
        model_id,
        token_cost,
        custom_system_prompt,
        temperature,
        max_tokens,
        tags
      } = req.body;

      // Validation
      if (!name || !display_name || !ai_provider || !model_id) {
        return res.status(400).json({
          error: 'Name, display name, AI provider, and model ID are required'
        });
      }

      const validProviders = ['openai', 'anthropic', 'google', 'openrouter'];
      if (!validProviders.includes(ai_provider)) {
        return res.status(400).json({
          error: `Invalid AI provider. Must be one of: ${validProviders.join(', ')}`
        });
      }

      if (token_cost !== undefined && (token_cost < 0 || token_cost > 100)) {
        return res.status(400).json({
          error: 'Token cost must be between 0 and 100'
        });
      }

      if (temperature !== undefined && (temperature < 0 || temperature > 2.0)) {
        return res.status(400).json({
          error: 'Temperature must be between 0.0 and 2.0'
        });
      }

      if (max_tokens !== undefined && (max_tokens < 50 || max_tokens > 1000)) {
        return res.status(400).json({
          error: 'Max tokens must be between 50 and 1000'
        });
      }

      const result = db.localDb.run(
        `INSERT INTO token_models (
          name, display_name, description, ai_provider, model_id, token_cost,
          custom_system_prompt, temperature, max_tokens, tags, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name.trim(),
          display_name.trim(),
          description?.trim() || null,
          ai_provider,
          model_id.trim(),
          token_cost || 1,
          custom_system_prompt?.trim() || null,
          temperature !== undefined ? temperature : 0.7,
          max_tokens !== undefined ? max_tokens : 150,
          tags ? JSON.stringify(tags) : null,
          1
        ]
      );

      // Get the created model - convert rowid to string for TEXT PRIMARY KEY
      const model = db.localDb.get('SELECT * FROM token_models WHERE rowid = ?', [result.lastInsertRowid]);
      
      if (model) {
        // Parse tags back to array
        model.tags = model.tags ? JSON.parse(model.tags) : [];
        console.log(`[TokenModels] Created token model: ${model.name} (${ai_provider}/${model_id}) - ${token_cost} tokens`);
        res.status(201).json({ model, message: 'Token model created successfully' });
      } else {
        console.error('[TokenModels] Model created but could not retrieve it');
        res.status(500).json({ error: 'Model created but could not retrieve it' });
      }

    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'A token model with this name already exists' });
      }
      console.error('[TokenModels] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * PUT /api/token-models/:id
   * Update a token model (admin only)
   */
  router.put('/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const {
        name,
        display_name,
        description,
        ai_provider,
        model_id,
        token_cost,
        custom_system_prompt,
        temperature,
        max_tokens,
        tags,
        is_active
      } = req.body;

      // Check if model exists
      const existing = db.localDb.get('SELECT * FROM token_models WHERE id = ?', [id]);
      if (!existing) {
        return res.status(404).json({ error: 'Token model not found' });
      }

      // Validate if provided
      if (ai_provider) {
        const validProviders = ['openai', 'anthropic', 'google', 'openrouter'];
        if (!validProviders.includes(ai_provider)) {
          return res.status(400).json({
            error: `Invalid AI provider. Must be one of: ${validProviders.join(', ')}`
          });
        }
      }

      if (token_cost !== undefined && (token_cost < 0 || token_cost > 100)) {
        return res.status(400).json({ error: 'Token cost must be between 0 and 100' });
      }

      if (temperature !== undefined && (temperature < 0 || temperature > 2.0)) {
        return res.status(400).json({ error: 'Temperature must be between 0.0 and 2.0' });
      }

      if (max_tokens !== undefined && (max_tokens < 50 || max_tokens > 1000)) {
        return res.status(400).json({ error: 'Max tokens must be between 50 and 1000' });
      }

      // Build update query
      db.localDb.run(
        `UPDATE token_models SET
          name = COALESCE(?, name),
          display_name = COALESCE(?, display_name),
          description = COALESCE(?, description),
          ai_provider = COALESCE(?, ai_provider),
          model_id = COALESCE(?, model_id),
          token_cost = COALESCE(?, token_cost),
          custom_system_prompt = COALESCE(?, custom_system_prompt),
          temperature = COALESCE(?, temperature),
          max_tokens = COALESCE(?, max_tokens),
          tags = COALESCE(?, tags),
          is_active = COALESCE(?, is_active),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [
          name?.trim(),
          display_name?.trim(),
          description?.trim(),
          ai_provider,
          model_id?.trim(),
          token_cost,
          custom_system_prompt?.trim(),
          temperature,
          max_tokens,
          tags ? JSON.stringify(tags) : undefined,
          is_active,
          id
        ]
      );

      const model = db.localDb.get('SELECT * FROM token_models WHERE id = ?', [id]);

      console.log(`[TokenModels] Updated token model: ${model.name}`);
      res.json({ model, message: 'Token model updated successfully' });

    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'A token model with this name already exists' });
      }
      console.error('[TokenModels] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * DELETE /api/token-models/:id
   * Delete a token model (admin only)
   */
  router.delete('/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      // Check if model exists first
      const existing = db.localDb.get('SELECT name FROM token_models WHERE id = ?', [id]);

      if (!existing) {
        return res.status(404).json({ error: 'Token model not found' });
      }

      db.localDb.run('DELETE FROM token_models WHERE id = ?', [id]);

      console.log(`[TokenModels] Deleted token model: ${existing.name}`);
      res.json({ success: true, message: 'Token model deleted successfully' });

    } catch (error) {
      console.error('[TokenModels] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
