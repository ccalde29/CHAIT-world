// ============================================================================
// User Persona Management Routes
// ============================================================================

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

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
      uses_custom_image
    } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!name || !personality) {
      return res.status(400).json({ error: 'Name and personality are required' });
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
        is_active: true
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

module.exports = router;
