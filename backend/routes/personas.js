// ============================================================================
// User Persona Management Routes
// ============================================================================

const express = require('express');
const router = express.Router();
const AIProviderService = require('../services/AIProviderService');

module.exports = (db) => {

/**
 * GET /api/personas
 * Get all personas for the authenticated user
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.headers['user-id'] || req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const personas = db.localDb.all(
      'SELECT * FROM user_personas WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    // Parse JSON fields
    const parsedPersonas = personas.map(p => ({
      ...p,
      interests: p.interests ? JSON.parse(p.interests) : []
    }));

    res.json({ personas: parsedPersonas });

  } catch (error) {
    console.error('[Personas] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/personas/active
 * Get the active persona for the authenticated user
 */
router.get('/active', async (req, res) => {
  try {
    const userId = req.headers['user-id'] || req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user settings to find active_persona_id
    const settings = db.localDb.get(
      'SELECT active_persona_id FROM user_settings_local WHERE user_id = ?',
      [userId]
    );

    let persona = null;

    // If active_persona_id is set, fetch that persona
    if (settings?.active_persona_id) {
      persona = db.localDb.get(
        'SELECT * FROM user_personas WHERE id = ? AND user_id = ?',
        [settings.active_persona_id, userId]
      );
    }

    // Fallback: Get first is_active persona if no active_persona_id
    if (!persona) {
      persona = db.localDb.get(
        'SELECT * FROM user_personas WHERE user_id = ? AND is_active = 1 ORDER BY created_at ASC LIMIT 1',
        [userId]
      );
    }

    // Fallback: Get any persona
    if (!persona) {
      persona = db.localDb.get(
        'SELECT * FROM user_personas WHERE user_id = ? ORDER BY created_at ASC LIMIT 1',
        [userId]
      );
    }

    if (!persona) {
      return res.status(404).json({ error: 'No persona found' });
    }

    // Parse JSON fields
    if (persona.interests && typeof persona.interests === 'string') {
      persona.interests = JSON.parse(persona.interests);
    }

    res.json({ persona });

  } catch (error) {
    console.error('[Personas] Error fetching active persona:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/personas/:personaId/activate
 * Set a persona as the active persona
 */
router.post('/:personaId/activate', async (req, res) => {
  try {
    const userId = req.headers['user-id'] || req.userId;
    const { personaId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify persona belongs to user
    const persona = db.localDb.get(
      'SELECT * FROM user_personas WHERE id = ? AND user_id = ?',
      [personaId, userId]
    );

    if (!persona) {
      return res.status(404).json({ error: 'Persona not found' });
    }

    // First, set all personas for this user to inactive
    db.localDb.run(
      'UPDATE user_personas SET is_active = 0 WHERE user_id = ?',
      [userId]
    );

    // Then set the selected persona to active
    db.localDb.run(
      'UPDATE user_personas SET is_active = 1 WHERE id = ? AND user_id = ?',
      [personaId, userId]
    );

    // Update user_settings to set active_persona_id
    const existing = db.localDb.get(
      'SELECT id FROM user_settings_local WHERE user_id = ?',
      [userId]
    );

    if (existing) {
      db.localDb.run(
        'UPDATE user_settings_local SET active_persona_id = ? WHERE user_id = ?',
        [personaId, userId]
      );
    } else {
      db.localDb.run(
        'INSERT INTO user_settings_local (user_id, active_persona_id) VALUES (?, ?)',
        [userId, personaId]
      );
    }

    res.json({
      success: true,
      persona,
      message: `Active persona set to "${persona.name}"`
    });

  } catch (error) {
    console.error('[Personas] Error activating persona:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/personas
 * Create a new persona
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.headers['user-id'];
    const {
      name,
      personality,
      interests,
      communication_style,
      avatar,
      color,
      avatar_image_url,
      avatar_image_filename,
      uses_custom_image,
      ai_provider,
      ai_model,
      temperature,
      max_tokens
    } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!name || !personality) {
      return res.status(400).json({ error: 'Name and personality are required' });
    }

    // Validate AI provider if provided
    const validProviders = ['openai', 'anthropic', 'openrouter', 'google', 'ollama', 'lmstudio', 'custom'];
    if (ai_provider && !validProviders.includes(ai_provider)) {
      return res.status(400).json({
        error: `Invalid AI provider. Must be one of: ${validProviders.join(', ')}`
      });
    }

    // If ai_provider is set (and not custom), ai_model is required
    if (ai_provider && ai_provider !== 'custom' && !ai_model) {
      return res.status(400).json({
        error: 'AI model is required when provider is set'
      });
    }

    // Validate temperature range
    if (temperature !== undefined && (temperature < 0 || temperature > 2.0)) {
      return res.status(400).json({
        error: 'Temperature must be between 0.0 and 2.0'
      });
    }

    // Validate max_tokens range
    if (max_tokens !== undefined && (max_tokens < 50 || max_tokens > 500)) {
      return res.status(400).json({
        error: 'Max tokens must be between 50 and 500'
      });
    }

    // Check if user has any existing personas
    const existingPersonas = db.localDb.all(
      'SELECT id FROM user_personas WHERE user_id = ?',
      [userId]
    );
    
    // Only set as active if this is the user's first persona
    const isActive = existingPersonas.length === 0 ? 1 : 0;

    // Insert into local database
    const stmt = db.localDb.db.prepare(`
      INSERT INTO user_personas (
        user_id, name, personality, interests, communication_style,
        avatar, color, avatar_image_url, avatar_image_filename, uses_custom_image,
        is_active, ai_provider, ai_model, temperature, max_tokens
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      userId,
      name,
      personality,
      JSON.stringify(interests || []),
      communication_style || '',
      avatar || '👤',
      color || 'from-blue-500 to-indigo-500',
      avatar_image_url || null,
      avatar_image_filename || null,
      uses_custom_image ? 1 : 0,
      isActive,
      ai_provider || 'openai',
      ai_model || null,
      temperature !== undefined ? temperature : 0.8,
      max_tokens !== undefined ? max_tokens : 150
    );

    const persona = db.localDb.get('SELECT * FROM user_personas WHERE rowid = ?', [result.lastInsertRowid]);
    
    // Parse JSON fields
    if (persona.interests && typeof persona.interests === 'string') {
      persona.interests = JSON.parse(persona.interests);
    }

    res.json({ persona });

  } catch (error) {
    console.error('[Personas] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/personas/:personaId
 * Update an existing persona
 */
router.put('/:personaId', async (req, res) => {
  try {
    const userId = req.headers['user-id'];
    const { personaId } = req.params;
    const updates = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify persona belongs to user
    const existing = db.localDb.get(
      'SELECT * FROM user_personas WHERE id = ? AND user_id = ?',
      [personaId, userId]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Persona not found' });
    }

    // Validate AI provider if provided
    const validProviders = ['openai', 'anthropic', 'openrouter', 'google', 'ollama', 'lmstudio', 'custom'];
    if (updates.ai_provider && !validProviders.includes(updates.ai_provider)) {
      return res.status(400).json({
        error: `Invalid AI provider. Must be one of: ${validProviders.join(', ')}`
      });
    }

    // If ai_provider is set (and not custom), ai_model is required
    if (updates.ai_provider && updates.ai_provider !== 'custom' && !updates.ai_model) {
      return res.status(400).json({
        error: 'AI model is required when provider is set'
      });
    }

    // Validate temperature range
    if (updates.temperature !== undefined && (updates.temperature < 0 || updates.temperature > 2.0)) {
      return res.status(400).json({
        error: 'Temperature must be between 0.0 and 2.0'
      });
    }

    // Validate max_tokens range
    if (updates.max_tokens !== undefined && (updates.max_tokens < 50 || updates.max_tokens > 500)) {
      return res.status(400).json({
        error: 'Max tokens must be between 50 and 500'
      });
    }

    // Build update query
    const fields = [];
    const values = [];
    
    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.personality !== undefined) { fields.push('personality = ?'); values.push(updates.personality); }
    if (updates.interests !== undefined) { fields.push('interests = ?'); values.push(JSON.stringify(updates.interests)); }
    if (updates.communication_style !== undefined) { fields.push('communication_style = ?'); values.push(updates.communication_style); }
    if (updates.avatar !== undefined) { fields.push('avatar = ?'); values.push(updates.avatar); }
    if (updates.color !== undefined) { fields.push('color = ?'); values.push(updates.color); }
    if (updates.avatar_image_url !== undefined) { fields.push('avatar_image_url = ?'); values.push(updates.avatar_image_url); }
    if (updates.avatar_image_filename !== undefined) { fields.push('avatar_image_filename = ?'); values.push(updates.avatar_image_filename); }
    if (updates.uses_custom_image !== undefined) { fields.push('uses_custom_image = ?'); values.push(updates.uses_custom_image ? 1 : 0); }
    if (updates.ai_provider !== undefined) { fields.push('ai_provider = ?'); values.push(updates.ai_provider); }
    if (updates.ai_model !== undefined) { fields.push('ai_model = ?'); values.push(updates.ai_model); }
    if (updates.temperature !== undefined) { fields.push('temperature = ?'); values.push(updates.temperature); }
    if (updates.max_tokens !== undefined) { fields.push('max_tokens = ?'); values.push(updates.max_tokens); }

    values.push(personaId, userId);

    db.localDb.run(
      `UPDATE user_personas SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );

    const persona = db.localDb.get('SELECT * FROM user_personas WHERE id = ?', [personaId]);
    if (persona.interests && typeof persona.interests === 'string') {
      persona.interests = JSON.parse(persona.interests);
    }

    res.json({ persona });

  } catch (error) {
    console.error('[Personas] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/personas/:personaId
 * Delete a persona
 */
router.delete('/:personaId', async (req, res) => {
  try {
    const userId = req.headers['user-id'];
    const { personaId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if this is the only persona
    const allPersonas = db.localDb.all(
      'SELECT id FROM user_personas WHERE user_id = ?',
      [userId]
    );

    if (allPersonas && allPersonas.length === 1) {
      return res.status(400).json({
        error: 'Cannot delete your only persona. Create another one first.'
      });
    }

    // Check if this is the active persona
    const settings = db.localDb.get(
      'SELECT active_persona_id FROM user_settings_local WHERE user_id = ?',
      [userId]
    );

    const isActive = settings?.active_persona_id === personaId;

    // Delete the persona
    db.localDb.run(
      'DELETE FROM user_personas WHERE id = ? AND user_id = ?',
      [personaId, userId]
    );

    // If this was the active persona, set another one as active
    if (isActive && allPersonas && allPersonas.length > 1) {
      const remainingPersona = allPersonas.find(p => p.id !== personaId);

      if (remainingPersona) {
        db.localDb.run(
          'UPDATE user_settings_local SET active_persona_id = ? WHERE user_id = ?',
          [remainingPersona.id, userId]
        );
      }
    }

    res.json({ success: true, message: 'Persona deleted successfully' });

  } catch (error) {
    console.error('[Personas] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/personas/:personaId/generate
 * Generate a draft response for the persona (auto-response feature)
 */
router.post('/:personaId/generate', async (req, res) => {
  try {
    const userId = req.headers['user-id'];
    const { personaId } = req.params;
    const { messages, sessionContext } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Verify persona belongs to user
    const persona = db.localDb.get(
      'SELECT * FROM user_personas WHERE id = ? AND user_id = ?',
      [personaId, userId]
    );

    if (!persona) {
      return res.status(404).json({ error: 'Persona not found' });
    }

    // Parse JSON fields
    if (persona.interests && typeof persona.interests === 'string') {
      persona.interests = JSON.parse(persona.interests);
    }

    // Check if persona has AI model configured
    if (!persona.ai_provider || !persona.ai_model) {
      return res.status(400).json({
        error: 'Persona does not have AI model configured. Please configure a model in persona settings.'
      });
    }

    // Get user settings for API keys
    const settings = await db.getUserSettings(userId);

    // Build persona prompt
    let personaPrompt = `You are ${persona.name}. Respond as this persona in the ongoing conversation.

PERSONALITY:
${persona.personality}`;

    if (persona.interests && persona.interests.length > 0) {
      personaPrompt += `\n\nINTERESTS:\n${persona.interests.join(', ')}`;
    }

    if (persona.communication_style) {
      personaPrompt += `\n\nCOMMUNICATION STYLE:\n${persona.communication_style}`;
    }

    if (sessionContext?.scenario) {
      personaPrompt += `\n\nCURRENT SCENE:\n${sessionContext.scenario.description || sessionContext.scenario.name}`;
    }

    personaPrompt += `\n\nRespond naturally in first person as ${persona.name}. Keep responses conversational and in-character.`;

    // Prepare character object for AIProviderService
    let personaAsCharacter = {
      name: persona.name,
      ai_provider: persona.ai_provider,
      ai_model: persona.ai_model,
      temperature: persona.temperature || 0.8,
      max_tokens: persona.max_tokens || 150
    };

    // Generate response using AIProviderService

    // Prepare settings object with both ollama and lmstudio configurations
    const localProviderSettings = {
      ...settings?.ollamaSettings,
      baseUrl: settings?.ollamaSettings?.baseUrl || 'http://localhost:11434',
      lmStudioSettings: {
        ...settings?.lmStudioSettings,
        baseUrl: settings?.lmStudioSettings?.baseUrl || 'http://127.0.0.1:1234'
      }
    };

    const response = await AIProviderService.generateResponse(
      personaAsCharacter,
      [
        { role: 'system', content: personaPrompt },
        ...messages.slice(-10) // Last 10 messages for context
      ],
      settings?.apiKeys || {},
      localProviderSettings
    );

    res.json({
      success: true,
      response,
      persona: {
        id: persona.id,
        name: persona.name,
        avatar: persona.avatar,
        color: persona.color
      }
    });

  } catch (error) {
    console.error('[Personas] Error generating response:', error);

    // More helpful error messages
    if (error.message && error.message.includes('API key')) {
      return res.status(400).json({
        error: 'API key not configured. Please add your API key in settings.'
      });
    }

    res.status(500).json({
      error: error.message || 'Failed to generate response'
    });
  }
});

return router;
};
