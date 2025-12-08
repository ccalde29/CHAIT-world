// ============================================================================
// User Persona Management Routes
// ============================================================================

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const AIProviderService = require('../services/AIProviderService');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * GET /api/personas
 * Get all personas for the authenticated user
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.headers['user-id'];

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: personas, error } = await supabase
      .from('user_personas')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Personas] Error fetching personas:', error);
      return res.status(500).json({ error: 'Failed to fetch personas' });
    }

    res.json({ personas });

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
    const userId = req.headers['user-id'];

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user settings to find active_persona_id
    const { data: settings } = await supabase
      .from('user_settings')
      .select('active_persona_id')
      .eq('user_id', userId)
      .single();

    let persona = null;

    // If active_persona_id is set, fetch that persona
    if (settings?.active_persona_id) {
      const { data } = await supabase
        .from('user_personas')
        .select('*')
        .eq('id', settings.active_persona_id)
        .eq('user_id', userId)
        .single();

      persona = data;
    }

    // Fallback: Get first is_active persona if no active_persona_id
    if (!persona) {
      const { data } = await supabase
        .from('user_personas')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      persona = data;
    }

    // Fallback: Get any persona
    if (!persona) {
      const { data } = await supabase
        .from('user_personas')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      persona = data;
    }

    if (!persona) {
      return res.status(404).json({ error: 'No persona found' });
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
    const userId = req.headers['user-id'];
    const { personaId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify persona belongs to user
    const { data: persona, error: personaError } = await supabase
      .from('user_personas')
      .select('*')
      .eq('id', personaId)
      .eq('user_id', userId)
      .single();

    if (personaError || !persona) {
      return res.status(404).json({ error: 'Persona not found' });
    }

    // Update user_settings to set active_persona_id
    const { error: updateError } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        active_persona_id: parseInt(personaId)
      }, {
        onConflict: 'user_id'
      });

    if (updateError) {
      console.error('[Personas] Error setting active persona:', updateError);
      return res.status(500).json({ error: 'Failed to set active persona' });
    }

    console.log(`[Personas] User ${userId} activated persona ${personaId}: ${persona.name}`);

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

    const { data: persona, error } = await supabase
      .from('user_personas')
      .insert({
        user_id: userId,
        name,
        personality,
        interests: interests || [],
        communication_style: communication_style || '',
        avatar: avatar || '👤',
        color: color || 'from-blue-500 to-indigo-500',
        avatar_image_url,
        avatar_image_filename,
        uses_custom_image: uses_custom_image || false,
        is_active: true,
        ai_provider: ai_provider || 'openai',
        ai_model,
        temperature: temperature !== undefined ? temperature : 0.8,
        max_tokens: max_tokens !== undefined ? max_tokens : 150
      })
      .select()
      .single();

    if (error) {
      console.error('[Personas] Error creating persona:', error);
      return res.status(500).json({ error: 'Failed to create persona' });
    }

    console.log(`[Personas] Created new persona ${persona.id}: ${persona.name}`);

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
    const { data: existing } = await supabase
      .from('user_personas')
      .select('*')
      .eq('id', personaId)
      .eq('user_id', userId)
      .single();

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

    const { data: persona, error } = await supabase
      .from('user_personas')
      .update(updates)
      .eq('id', personaId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('[Personas] Error updating persona:', error);
      return res.status(500).json({ error: 'Failed to update persona' });
    }

    console.log(`[Personas] Updated persona ${personaId}: ${persona.name}`);

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
    const { data: allPersonas } = await supabase
      .from('user_personas')
      .select('id')
      .eq('user_id', userId);

    if (allPersonas && allPersonas.length === 1) {
      return res.status(400).json({
        error: 'Cannot delete your only persona. Create another one first.'
      });
    }

    // Check if this is the active persona
    const { data: settings } = await supabase
      .from('user_settings')
      .select('active_persona_id')
      .eq('user_id', userId)
      .single();

    const isActive = settings?.active_persona_id === parseInt(personaId);

    // Delete the persona
    const { error } = await supabase
      .from('user_personas')
      .delete()
      .eq('id', personaId)
      .eq('user_id', userId);

    if (error) {
      console.error('[Personas] Error deleting persona:', error);
      return res.status(500).json({ error: 'Failed to delete persona' });
    }

    // If this was the active persona, set another one as active
    if (isActive && allPersonas && allPersonas.length > 1) {
      const remainingPersona = allPersonas.find(p => p.id !== parseInt(personaId));

      if (remainingPersona) {
        await supabase
          .from('user_settings')
          .update({ active_persona_id: remainingPersona.id })
          .eq('user_id', userId);
      }
    }

    console.log(`[Personas] Deleted persona ${personaId}`);

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
    const { data: persona, error } = await supabase
      .from('user_personas')
      .select('*')
      .eq('id', personaId)
      .eq('user_id', userId)
      .single();

    if (error || !persona) {
      return res.status(404).json({ error: 'Persona not found' });
    }

    // Check if persona has AI model configured
    if (!persona.ai_provider || !persona.ai_model) {
      return res.status(400).json({
        error: 'Persona does not have AI model configured. Please configure a model in persona settings.'
      });
    }

    // Get user settings for API keys
    const { data: settings } = await supabase
      .from('user_settings')
      .select('api_keys, ollama_settings')
      .eq('user_id', userId)
      .single();

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
    const personaAsCharacter = {
      name: persona.name,
      ai_provider: persona.ai_provider,
      ai_model: persona.ai_model,
      temperature: persona.temperature || 0.8,
      max_tokens: persona.max_tokens || 150
    };

    // Generate response using AIProviderService
    console.log(`[Personas] Generating auto-response for persona ${persona.name} (${persona.ai_provider}/${persona.ai_model})`);

    const response = await AIProviderService.generateResponse(
      personaAsCharacter,
      [
        { role: 'system', content: personaPrompt },
        ...messages.slice(-10) // Last 10 messages for context
      ],
      settings?.api_keys || {},
      settings?.ollama_settings || {}
    );

    console.log(`[Personas] Generated response for persona ${persona.name}: ${response.substring(0, 50)}...`);

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

module.exports = router;
