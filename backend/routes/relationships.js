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

    if (error) {
      console.error('[Relationships] Error fetching relationships:', error);
      return res.status(500).json({ error: 'Failed to fetch relationships' });
    }

    // If fetching character relationships, enrich with target character details
    if (target_type === 'character' || !target_type) {
      const characterRelationships = relationships.filter(r => r.target_type === 'character');

      if (characterRelationships.length > 0) {
        const targetCharacterIds = characterRelationships.map(r => r.target_id);

        const { data: characters } = await supabase
          .from('characters')
          .select('id, name, avatar, color, uses_custom_image, avatar_image_url')
          .in('id', targetCharacterIds);

        // Enrich relationships with character data
        relationships.forEach(rel => {
          if (rel.target_type === 'character') {
            const targetChar = characters?.find(c => c.id === rel.target_id);
            if (targetChar) {
              rel.target_character = targetChar;
            }
          }
        });
      }
    }

    res.json({ relationships });

  } catch (error) {
    console.error('[Relationships] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/characters/:characterId/relationships
 * Create or update a bot-to-bot relationship
 */
router.post('/:characterId/relationships', async (req, res) => {
  try {
    const userId = req.headers['user-id'];
    const { characterId } = req.params;
    const {
      target_character_id,
      relationship_type,
      trust_level,
      familiarity_level,
      emotional_bond,
      custom_context
    } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!target_character_id || !relationship_type) {
      return res.status(400).json({
        error: 'target_character_id and relationship_type are required'
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

    // Verify the target character exists and belongs to the user
    const { data: targetChar } = await supabase
      .from('characters')
      .select('id, name')
      .eq('id', target_character_id)
      .eq('user_id', userId)
      .single();

    if (!targetChar) {
      return res.status(404).json({ error: 'Target character not found or unauthorized' });
    }

    // Use the database function to upsert
    const { data: relationship, error } = await supabase
      .rpc('upsert_bot_relationship', {
        p_character_id: characterId,
        p_user_id: userId,
        p_target_character_id: target_character_id,
        p_relationship_type: relationship_type,
        p_trust_level: trust_level !== undefined ? trust_level : 0.5,
        p_familiarity_level: familiarity_level !== undefined ? familiarity_level : 0.5,
        p_emotional_bond: emotional_bond !== undefined ? emotional_bond : 0.0,
        p_custom_context: custom_context || null
      });

    if (error) {
      console.error('[Relationships] Error creating relationship:', error);
      return res.status(500).json({ error: 'Failed to create relationship' });
    }

    console.log(`[Relationships] Created relationship: ${sourceChar.name} → ${targetChar.name} (${relationship_type})`);

    res.json({
      success: true,
      relationship,
      message: `Relationship created: ${sourceChar.name} → ${targetChar.name}`
    });

  } catch (error) {
    console.error('[Relationships] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/characters/:characterId/relationships/:targetCharacterId
 * Delete a bot-to-bot relationship
 */
router.delete('/:characterId/relationships/:targetCharacterId', async (req, res) => {
  try {
    const userId = req.headers['user-id'];
    const { characterId, targetCharacterId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { error } = await supabase
      .from('character_relationships')
      .delete()
      .eq('character_id', characterId)
      .eq('user_id', userId)
      .eq('target_type', 'character')
      .eq('target_id', targetCharacterId);

    if (error) {
      console.error('[Relationships] Error deleting relationship:', error);
      return res.status(500).json({ error: 'Failed to delete relationship' });
    }

    console.log(`[Relationships] Deleted relationship: ${characterId} → ${targetCharacterId}`);

    res.json({ success: true, message: 'Relationship deleted successfully' });

  } catch (error) {
    console.error('[Relationships] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/characters/:characterId/relationships/available
 * Get list of characters that can have relationships (excluding already related ones)
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

    // Get existing relationships for this character
    const { data: existingRelationships } = await supabase
      .from('character_relationships')
      .select('target_id')
      .eq('character_id', characterId)
      .eq('user_id', userId)
      .eq('target_type', 'character');

    const relatedIds = existingRelationships?.map(r => r.target_id) || [];

    // Filter out characters that already have relationships
    const availableCharacters = allCharacters?.filter(c => !relatedIds.includes(c.id)) || [];

    res.json({ characters: availableCharacters });

  } catch (error) {
    console.error('[Relationships] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
