// ============================================================================
// Character Relationship Management Routes (Bot-to-Bot)
// ============================================================================

const express = require('express');

module.exports = (db) => {
const router = express.Router();

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

    // Get relationships from local database
    let relationships = await db.getRelationshipsForCharacter(characterId, userId, target_type);

    // Enrich relationships with target details
    const characterRelationships = relationships.filter(r => r.target_type === 'character');
    const userRelationships = relationships.filter(r => r.target_type === 'user');

    // Fetch character details
    if (characterRelationships.length > 0) {
      const targetCharacterIds = characterRelationships.map(r => r.target_id);

      for (const rel of relationships) {
        if (rel.target_type === 'character') {
          const targetChar = await db.getCharacter(rel.target_id, userId);
          if (targetChar) {
            rel.target_character = {
              id: targetChar.id,
              name: targetChar.name,
              avatar: targetChar.avatar,
              color: targetChar.color,
              uses_custom_image: targetChar.uses_custom_image,
              avatar_image_url: targetChar.avatar_image_url
            };
          }
        }
      }
    }

    // Fetch persona details
    if (userRelationships.length > 0) {
      for (const rel of relationships) {
        if (rel.target_type === 'user') {
          const targetPersona = await db.getPersona(rel.target_id, userId);
          if (targetPersona) {
            rel.target_persona = {
              id: targetPersona.id,
              name: targetPersona.name,
              avatar: targetPersona.avatar,
              color: targetPersona.color,
              uses_custom_image: targetPersona.uses_custom_image,
              avatar_image_url: targetPersona.avatar_image_url
            };

          } else {
            console.warn('[Relationships GET] No persona found for target_id:', rel.target_id);
          }
        }
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
    const sourceChar = await db.getCharacter(characterId, userId);

    if (!sourceChar) {
      return res.status(404).json({ error: 'Source character not found or unauthorized' });
    }

    let targetType, targetId, targetName;

    if (target_character_id) {
      // Bot-to-bot relationship
      const targetChar = await db.getCharacter(target_character_id, userId);

      if (!targetChar) {
        return res.status(404).json({ error: 'Target character not found or unauthorized' });
      }

      targetType = 'character';
      targetId = target_character_id;
      targetName = targetChar.name;
    } else {
      // Bot-to-user relationship
      const targetPersona = await db.getPersona(target_persona_id, userId);

      if (!targetPersona) {
        return res.status(404).json({ error: 'Target persona not found or unauthorized' });
      }

      targetType = 'user';
      targetId = String(target_persona_id);
      targetName = targetPersona.name;
    }

    // Insert or update relationship in local database
    const relationship = await db.createOrUpdateRelationship(characterId, userId, {
      target_type: targetType,
      target_id: targetId,
      relationship_type: relationship_type,
      trust_level: trust_level !== undefined ? trust_level : 0.5,
      familiarity_level: familiarity_level !== undefined ? familiarity_level : 0.5,
      emotional_bond: emotional_bond !== undefined ? emotional_bond : 0.0,
      custom_context: custom_context || null
    });

    // If this is a character-to-character relationship, create the reverse relationship
    if (targetType === 'character') {
      await db.createOrUpdateRelationship(targetId, userId, {
        target_type: 'character',
        target_id: characterId,
        relationship_type: relationship_type,
        trust_level: trust_level !== undefined ? trust_level : 0.5,
        familiarity_level: familiarity_level !== undefined ? familiarity_level : 0.5,
        emotional_bond: emotional_bond !== undefined ? emotional_bond : 0.0,
        custom_context: custom_context || null
      });

    }

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

    // Get the relationship to check if it's character-to-character
    const existingRelationships = await db.getRelationshipsForCharacter(characterId, userId);
    const relationshipToDelete = existingRelationships?.find(r => r.target_id === targetId);

    // Delete relationship from local database
    await db.deleteRelationship(characterId, userId, targetId);

    // If this was a character-to-character relationship, also delete the reverse
    if (relationshipToDelete && relationshipToDelete.target_type === 'character') {
      await db.deleteRelationship(targetId, userId, characterId);

    }

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

    // Get all user's characters except the current one from local database
    const allCharacters = (await db.getCharacters(userId)).filter(c => c.id !== characterId);

    // Get all user's personas from local database
    const personasResponse = await db.getUserPersona(userId);
    const allPersonas = personasResponse.personas || [];

    // Get existing relationships for this character
    const existingRelationships = await db.getRelationshipsForCharacter(characterId, userId);

    const relatedCharacterIds = existingRelationships?.filter(r => r.target_type === 'character').map(r => r.target_id) || [];
    const relatedPersonaIds = existingRelationships?.filter(r => r.target_type === 'user').map(r => r.target_id) || [];

    // Filter out characters and personas that already have relationships
    const availableCharacters = allCharacters.filter(c => !relatedCharacterIds.includes(c.id));
    const availablePersonas = allPersonas.filter(p => !relatedPersonaIds.includes(String(p.id))).map(p => ({
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

return router;
};
