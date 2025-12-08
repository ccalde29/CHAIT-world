// ============================================================================
// Custom Models Routes (Admin Only)
// Manage admin-created AI model presets with custom system prompts
// ============================================================================

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { requireAdmin } = require('../middleware/adminAuth');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * GET /api/custom-models
 * Get all active custom models (available to all users)
 */
router.get('/', async (req, res) => {
  try {
    const { data: models, error } = await supabase
      .from('custom_models')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[CustomModels] Error fetching models:', error);
      return res.status(500).json({ error: 'Failed to fetch custom models' });
    }

    res.json({ models: models || [] });

  } catch (error) {
    console.error('[CustomModels] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/custom-models/admin
 * Get all custom models including inactive (admin only)
 */
router.get('/admin', requireAdmin, async (req, res) => {
  try {
    const { data: models, error } = await supabase
      .from('custom_models')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[CustomModels] Error fetching admin models:', error);
      return res.status(500).json({ error: 'Failed to fetch models' });
    }

    res.json({ models: models || [] });

  } catch (error) {
    console.error('[CustomModels] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/custom-models
 * Create a new custom model (admin only)
 */
router.post('/', requireAdmin, async (req, res) => {
  try {
    const userId = req.headers['user-id'];
    const {
      name,
      display_name,
      description,
      openrouter_model_id,
      custom_system_prompt,
      temperature,
      max_tokens,
      tags
    } = req.body;

    // Validation
    if (!name || !display_name || !openrouter_model_id) {
      return res.status(400).json({
        error: 'Name, display name, and OpenRouter model ID are required'
      });
    }

    // Validate temperature
    if (temperature !== undefined && (temperature < 0 || temperature > 2.0)) {
      return res.status(400).json({
        error: 'Temperature must be between 0.0 and 2.0'
      });
    }

    // Validate max_tokens
    if (max_tokens !== undefined && (max_tokens < 50 || max_tokens > 1000)) {
      return res.status(400).json({
        error: 'Max tokens must be between 50 and 1000'
      });
    }

    const { data: model, error } = await supabase
      .from('custom_models')
      .insert({
        created_by_admin_id: userId,
        name: name.trim(),
        display_name: display_name.trim(),
        description: description?.trim(),
        openrouter_model_id: openrouter_model_id.trim(),
        custom_system_prompt: custom_system_prompt?.trim(),
        temperature: temperature !== undefined ? temperature : 0.8,
        max_tokens: max_tokens !== undefined ? max_tokens : 150,
        tags: tags || [],
        is_active: true
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique violation
        return res.status(400).json({ error: 'A model with this name already exists' });
      }
      console.error('[CustomModels] Error creating model:', error);
      return res.status(500).json({ error: 'Failed to create custom model' });
    }

    console.log(`[CustomModels] Admin ${userId} created custom model: ${model.name}`);
    res.status(201).json({ model, message: 'Custom model created successfully' });

  } catch (error) {
    console.error('[CustomModels] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/custom-models/:id
 * Update a custom model (admin only)
 */
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates.id;
    delete updates.created_by_admin_id;
    delete updates.created_at;

    // Validate temperature if provided
    if (updates.temperature !== undefined && (updates.temperature < 0 || updates.temperature > 2.0)) {
      return res.status(400).json({
        error: 'Temperature must be between 0.0 and 2.0'
      });
    }

    // Validate max_tokens if provided
    if (updates.max_tokens !== undefined && (updates.max_tokens < 50 || updates.max_tokens > 1000)) {
      return res.status(400).json({
        error: 'Max tokens must be between 50 and 1000'
      });
    }

    // Add updated_at timestamp
    updates.updated_at = new Date().toISOString();

    const { data: model, error } = await supabase
      .from('custom_models')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique violation
        return res.status(400).json({ error: 'A model with this name already exists' });
      }
      console.error('[CustomModels] Error updating model:', error);
      return res.status(500).json({ error: 'Failed to update custom model' });
    }

    if (!model) {
      return res.status(404).json({ error: 'Custom model not found' });
    }

    console.log(`[CustomModels] Updated model: ${model.name}`);
    res.json({ model, message: 'Custom model updated successfully' });

  } catch (error) {
    console.error('[CustomModels] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/custom-models/:id
 * Delete a custom model (admin only)
 */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if model exists first
    const { data: existing } = await supabase
      .from('custom_models')
      .select('name')
      .eq('id', id)
      .single();

    if (!existing) {
      return res.status(404).json({ error: 'Custom model not found' });
    }

    const { error } = await supabase
      .from('custom_models')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[CustomModels] Error deleting model:', error);
      return res.status(500).json({ error: 'Failed to delete custom model' });
    }

    console.log(`[CustomModels] Deleted model: ${existing.name}`);
    res.json({ success: true, message: 'Custom model deleted successfully' });

  } catch (error) {
    console.error('[CustomModels] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
