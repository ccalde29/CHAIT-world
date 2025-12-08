// ============================================================================
// Character Relationship Management Routes (Bot-to-Bot)
// ============================================================================

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * GET /api/characters/:characterId/relationships
 * Get all relationships for a character (bot-to-bot and bot-to-user)
 */
router.get('/:characterId/relationships', async (req, res) => {
  try {
    const userId = req.headers['user-id'];
    const { characterId } = req.params;
    const { target_type } = req.query; // Optional filter: 'character' or 'user'

    console.log(`[Relationships GET] CharacterId: ${characterId}, UserId: ${userId}, TargetType: ${target_type}`);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let query = supabase
      .from('character_relationships')
      .select('*')
      .eq('character_id', characterId)
      .eq('user_id', userId);

    if (target_type) {
      query = query.eq('target_type', target_type);
    }

    const { data: relationships, error } = await query.order('created_at', { ascending: false });

    console.log(`[Relationships GET] Found ${relationships?.length || 0} relationships`);

    if (error) {
      console.error('[Relationships] Error fetching relationships:', error);
      return res.status(500).json({ error: 'Failed to fetch relationships' });
    }

    // Enrich relationships with target details
    const characterRelationships = relationships.filter(r => r.target_type === 'character');
    const userRelationships = relationships.filter(r => r.target_type === 'user');

    // Fetch character details
    if (characterRelationships.length > 0) {
      const targetCharacterIds = characterRelationships.map(r => r.target_id);

      const { data: characters } = await supabase
        .from('characters')
        .select('id, name, avatar, color, uses_custom_image, avatar_image_url')
        .in('id', targetCharacterIds);

      relationships.forEach(rel => {
        if (rel.target_type === 'character') {
          const targetChar = characters?.find(c => c.id === rel.target_id);
          if (targetChar) {
            rel.target_character = targetChar;
          }
        }
      });
    }

    // Fetch persona details
    if (userRelationships.length > 0) {
      // target_id is stored as a string (could be UUID), don't parse as int
      const targetPersonaIds = userRelationships.map(r => r.target_id);
      console.log('[Relationships GET] Looking up personas:', targetPersonaIds);

      const { data: personas, error: personaError } = await supabase
        .from('user_personas')
        .select('id, name, avatar, color, uses_custom_image, avatar_image_url')
        .in('id', targetPersonaIds);

      console.log('[Relationships GET] Found personas:', personas);
      if (personaError) console.error('[Relationships GET] Persona error:', personaError);

      relationships.forEach(rel => {
        if (rel.target_type === 'user') {
          // Compare as strings since target_id is stored as string
          const targetPersona = personas?.find(p => String(p.id) === String(rel.target_id));
          if (targetPersona) {
            rel.target_persona = targetPersona;
            console.log('[Relationships GET] Enriched relationship with persona:', rel);
          } else {
            console.warn('[Relationships GET] No persona found for target_id:', rel.target_id);
          }
        }
      });
    }

    res.json({ relationships });

  } catch (error) {
    console.error('[Relationships] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/characters/:characterId/relationships
 * Create or update a relationship (bot-to-bot or bot-to-user)
 */
router.post('/:characterId/relationships', async (req, res) => {
  try {
    const userId = req.headers['user-id'];
    const { characterId } = req.params;
    const {
      target_character_id,
      target_persona_id,
      relationship_type,
      trust_level,
      familiarity_level,
      emotional_bond,
      custom_context
    } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if ((!target_character_id && !target_persona_id) || !relationship_type) {
      return res.status(400).json({
        error: 'Either target_character_id or target_persona_id, and relationship_type are required'
      });
    }

    // Verify the source character belongs to the user
    const { data: sourceChar } = await supabase
      .from('characters')
      .select('id, name')
      .eq('id', characterId)
      .eq('user_id', userId)
      .single();

    if (!sourceChar) {
      return res.status(404).json({ error: 'Source character not found or unauthorized' });
    }

    let targetType, targetId, targetName;

    if (target_character_id) {
      // Bot-to-bot relationship
      const { data: targetChar } = await supabase
        .from('characters')
        .select('id, name')
        .eq('id', target_character_id)
        .eq('user_id', userId)
        .single();

      if (!targetChar) {
        return res.status(404).json({ error: 'Target character not found or unauthorized' });
      }

      targetType = 'character';
      targetId = target_character_id;
      targetName = targetChar.name;
    } else {
      // Bot-to-user relationship
      const { data: targetPersona } = await supabase
        .from('user_personas')
        .select('id, name')
        .eq('id', target_persona_id)
        .eq('user_id', userId)
        .single();

      if (!targetPersona) {
        return res.status(404).json({ error: 'Target persona not found or unauthorized' });
      }

      targetType = 'user';
      targetId = String(target_persona_id);
      targetName = targetPersona.name;
    }

    // Insert or update relationship
    const { data: relationship, error } = await supabase
      .from('character_relationships')
      .upsert({
        character_id: characterId,
        user_id: userId,
        target_type: targetType,
        target_id: targetId,
        relationship_type: relationship_type,
        trust_level: trust_level !== undefined ? trust_level : 0.5,
        familiarity_level: familiarity_level !== undefined ? familiarity_level : 0.5,
        emotional_bond: emotional_bond !== undefined ? emotional_bond : 0.0,
        custom_context: custom_context || null,
        interaction_count: 1,
        last_interaction: new Date().toISOString()
      }, {
        onConflict: 'character_id,user_id,target_type,target_id'
      })
      .select()
      .single();

    if (error) {
      console.error('[Relationships] Error creating relationship:', error);
      return res.status(500).json({ error: 'Failed to create relationship' });
    }

    console.log(`[Relationships] Created relationship: ${sourceChar.name} → ${targetName} (${relationship_type})`);

    res.json({
      success: true,
      relationship,
      message: `Relationship created: ${sourceChar.name} → ${targetName}`
    });

  } catch (error) {
    console.error('[Relationships] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/characters/:characterId/relationships/:targetId
 * Delete a relationship (bot-to-bot or bot-to-user)
 */
router.delete('/:characterId/relationships/:targetId', async (req, res) => {
  try {
    const userId = req.headers['user-id'];
    const { characterId, targetId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Delete relationship (works for both character and persona targets)
    // The unique constraint is on (character_id, user_id, target_type, target_id)
    // So we just need to match character_id, user_id, and target_id
    const { error } = await supabase
      .from('character_relationships')
      .delete()
      .eq('character_id', characterId)
      .eq('user_id', userId)
      .eq('target_id', targetId);

    if (error) {
      console.error('[Relationships] Error deleting relationship:', error);
      return res.status(500).json({ error: 'Failed to delete relationship' });
    }

    console.log(`[Relationships] Deleted relationship: ${characterId} → ${targetId}`);

    res.json({ success: true, message: 'Relationship deleted successfully' });

  } catch (error) {
    console.error('[Relationships] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/characters/:characterId/relationships/available
 * Get list of characters and personas that can have relationships (excluding already related ones)
 */
router.get('/:characterId/relationships/available', async (req, res) => {
  try {
    const userId = req.headers['user-id'];
    const { characterId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get all user's characters except the current one
    const { data: allCharacters } = await supabase
      .from('characters')
      .select('id, name, avatar, color, personality, uses_custom_image, avatar_image_url')
      .eq('user_id', userId)
      .neq('id', characterId);

    // Get all user's personas
    const { data: allPersonas } = await supabase
      .from('user_personas')
      .select('id, name, avatar, color, personality, uses_custom_image, avatar_image_url')
      .eq('user_id', userId);

    // Get existing relationships for this character
    const { data: existingRelationships } = await supabase
      .from('character_relationships')
      .select('target_id, target_type')
      .eq('character_id', characterId)
      .eq('user_id', userId);

    const relatedCharacterIds = existingRelationships?.filter(r => r.target_type === 'character').map(r => r.target_id) || [];
    const relatedPersonaIds = existingRelationships?.filter(r => r.target_type === 'user').map(r => r.target_id) || [];

    // Filter out characters and personas that already have relationships
    const availableCharacters = allCharacters?.filter(c => !relatedCharacterIds.includes(c.id)) || [];
    const availablePersonas = (allPersonas?.filter(p => !relatedPersonaIds.includes(String(p.id))) || []).map(p => ({
      ...p,
      type: 'persona'
    }));

    res.json({
      characters: availableCharacters,
      personas: availablePersonas
    });

  } catch (error) {
    console.error('[Relationships] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
