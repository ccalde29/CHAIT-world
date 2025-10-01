// ============================================================================
// Character Service
// Handles all character-related business logic
// backend/services/characterService.js
// ============================================================================

const { createClient } = require('@supabase/supabase-js');

class CharacterService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
  }

  // ============================================================================
  // CHARACTER CRUD OPERATIONS (Enhanced)
  // ============================================================================

  /**
   * Get all characters for a user (default + custom)
   */
  async getCharacters(userId) {
    try {
      // Get custom characters
      const { data: customChars, error: customError } = await this.supabase
        .from('characters')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (customError) throw customError;

      // Get hidden defaults
      const { data: hiddenDefaults, error: hiddenError } = await this.supabase
        .from('hidden_default_characters')
        .select('character_id')
        .eq('user_id', userId);

      if (hiddenError) throw hiddenError;

      const hiddenDefaultIds = new Set(hiddenDefaults.map(h => h.character_id));

      // Default characters
      const defaultCharacters = [
        {
          id: 'maya',
          name: 'Maya',
          personality: 'Energetic art student who loves creativity, colors, and seeing the artistic side of everything. Optimistic and playful with a tendency to get excited about visual concepts.',
          avatar: '🎨',
          color: 'from-pink-500 to-purple-500',
          age: 22,
          sex: 'female',
          appearance: 'Bright-eyed with paint-stained fingers, colorful style',
          background: 'Art student with a passion for visual expression',
          response_style: 'playful',
          is_default: true,
          tags: ['creative', 'optimistic', 'artist']
        },
        {
          id: 'alex',
          name: 'Alex',
          personality: 'Thoughtful philosophy major who asks deep questions about human nature, meaning, and existence. Contemplative and curious, often references philosophical concepts.',
          avatar: '🤔',
          color: 'from-blue-500 to-indigo-500',
          age: 24,
          sex: 'non-binary',
          appearance: 'Thoughtful expression, often lost in contemplation',
          background: 'Philosophy student exploring the big questions',
          response_style: 'contemplative',
          is_default: true,
          tags: ['philosophical', 'thoughtful', 'curious']
        },
        {
          id: 'zoe',
          name: 'Zoe',
          personality: 'Sarcastic tech enthusiast with quick wit and dry humor. Knowledgeable about technology and internet culture, slightly cynical but ultimately caring.',
          avatar: '💻',
          color: 'from-green-500 to-teal-500',
          age: 26,
          sex: 'female',
          appearance: 'Sharp eyes, tech gear always nearby',
          background: 'Software developer with a sarcastic edge',
          response_style: 'witty',
          is_default: true,
          tags: ['tech', 'sarcastic', 'witty']
        },
        {
          id: 'finn',
          name: 'Finn',
          personality: 'Laid-back musician who goes with the flow and relates everything back to music, lyrics, or cultural moments. Supportive and chill with a creative soul.',
          avatar: '🎸',
          color: 'from-orange-500 to-red-500',
          age: 23,
          sex: 'male',
          appearance: 'Relaxed demeanor, often has headphones',
          background: 'Musician always finding the rhythm in life',
          response_style: 'chill',
          is_default: true,
          tags: ['music', 'chill', 'creative']
        }
      ];

      const visibleDefaults = defaultCharacters.filter(
        char => !hiddenDefaultIds.has(char.id)
      );

      const allCharacters = [...visibleDefaults, ...(customChars || [])];

      return {
        characters: allCharacters,
        total: allCharacters.length
      };
    } catch (error) {
      console.error('Error getting characters:', error);
      throw error;
    }
  }

  /**
   * Create a new custom character
   */
  async createCharacter(userId, characterData) {
    try {
      // Validate required fields
      this.validateCharacterData(characterData);

      const { data, error } = await this.supabase
        .from('characters')
        .insert({
          user_id: userId,
          name: characterData.name,
          age: characterData.age,
          sex: characterData.sex || null,
          personality: characterData.personality,
          appearance: characterData.appearance || null,
          background: characterData.background || null,
          avatar: characterData.avatar || '🤖',
          color: characterData.color || 'from-gray-500 to-slate-500',
          chat_examples: characterData.chat_examples || [],
          relationships: characterData.relationships || [],
          tags: characterData.tags || [],
          temperature: characterData.temperature || 0.7,
          max_tokens: characterData.max_tokens || 150,
          context_window: characterData.context_window || 8000,
          memory_enabled: characterData.memory_enabled !== false,
          avatar_image_url: characterData.avatar_image_url || null,
          avatar_image_filename: characterData.avatar_image_filename || null,
          uses_custom_image: characterData.uses_custom_image || false
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating character:', error);
      throw error;
    }
  }

  /**
   * Update a character
   */
  async updateCharacter(userId, characterId, updates) {
    try {
      const defaultCharacterIds = ['maya', 'alex', 'zoe', 'finn'];

      // If updating a default character, create a custom version
      if (defaultCharacterIds.includes(characterId)) {
        const newCharacter = await this.createCharacter(userId, {
          ...updates,
          is_modified_default: true,
          original_id: characterId
        });

        // Hide the default character
        await this.hideDefaultCharacter(userId, characterId);

        return newCharacter;
      }

      // Regular update for custom characters
      const updateData = {
        name: updates.name,
        age: updates.age,
        sex: updates.sex,
        personality: updates.personality,
        appearance: updates.appearance,
        background: updates.background,
        avatar: updates.avatar,
        color: updates.color,
        chat_examples: updates.chat_examples,
        relationships: updates.relationships,
        tags: updates.tags,
        temperature: updates.temperature,
        max_tokens: updates.max_tokens,
        context_window: updates.context_window,
        memory_enabled: updates.memory_enabled,
        avatar_image_url: updates.avatar_image_url,
        avatar_image_filename: updates.avatar_image_filename,
        uses_custom_image: updates.uses_custom_image,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('characters')
        .update(updateData)
        .eq('id', characterId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating character:', error);
      throw error;
    }
  }

  /**
   * Delete a character
   */
  async deleteCharacter(userId, characterId) {
    try {
      const defaultCharacterIds = ['maya', 'alex', 'zoe', 'finn'];

      if (defaultCharacterIds.includes(characterId)) {
        await this.hideDefaultCharacter(userId, characterId);
        return { message: 'Default character hidden', characterId };
      }

      const { error } = await this.supabase
        .from('characters')
        .delete()
        .eq('id', characterId)
        .eq('user_id', userId);

      if (error) throw error;
      return { message: 'Character deleted', characterId };
    } catch (error) {
      console.error('Error deleting character:', error);
      throw error;
    }
  }

  /**
   * Hide a default character for a user
   */
  async hideDefaultCharacter(userId, characterId) {
    try {
      const { error } = await this.supabase
        .from('hidden_default_characters')
        .upsert({
          user_id: userId,
          character_id: characterId
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error hiding character:', error);
      throw error;
    }
  }

  // ============================================================================
  // CHARACTER VALIDATION
  // ============================================================================

  validateCharacterData(data) {
    const errors = [];

    if (!data.name || data.name.trim().length === 0) {
      errors.push('Character name is required');
    }

    if (!data.age || data.age < 18) {
      errors.push('Character age must be 18 or older');
    }

    if (!data.personality || data.personality.trim().length < 20) {
      errors.push('Character personality must be at least 20 characters');
    }

    if (data.temperature !== undefined && (data.temperature < 0 || data.temperature > 2)) {
      errors.push('Temperature must be between 0 and 2');
    }

    if (data.max_tokens !== undefined && (data.max_tokens < 50 || data.max_tokens > 1000)) {
      errors.push('Max tokens must be between 50 and 1000');
    }

    if (data.context_window !== undefined && (data.context_window < 1000 || data.context_window > 32000)) {
      errors.push('Context window must be between 1000 and 32000');
    }

    if (errors.length > 0) {
      const error = new Error('Validation failed');
      error.validationErrors = errors;
      throw error;
    }

    return true;
  }

  // ============================================================================
  // SYSTEM PROMPT BUILDING (Enhanced)
  // ============================================================================

  buildSystemPrompt(character, userPersona, characterContext) {
    let prompt = `You are ${character.name}`;

    // Add basic identity
    if (character.age) {
      prompt += `, ${character.age} years old`;
    }
    if (character.sex) {
      prompt += `, ${character.sex}`;
    }
    prompt += `.`;

    // Add appearance
    if (character.appearance) {
      prompt += `\n\nAppearance: ${character.appearance}`;
    }

    // Add personality
    prompt += `\n\nPersonality: ${character.personality}`;

    // Add background/history
    if (character.background) {
      prompt += `\n\nBackground: ${character.background}`;
    }

    // Add user information
    if (userPersona) {
      prompt += `\n\nYou are talking with ${userPersona.name}.`;
      prompt += `\nAbout them: ${userPersona.personality}`;
      
      if (userPersona.interests && userPersona.interests.length > 0) {
        prompt += `\nTheir interests: ${userPersona.interests.join(', ')}`;
      }
    }

    // Add relationships to other characters
    if (character.relationships && character.relationships.length > 0) {
      prompt += `\n\nYour relationships with other characters:\n`;
      character.relationships.forEach(rel => {
        prompt += `- ${rel.characterName}: ${rel.relationship}\n`;
      });
    }

    // Add chat examples (few-shot learning)
    if (character.chat_examples && character.chat_examples.length > 0) {
      prompt += `\n\nExample interactions:\n`;
      character.chat_examples.forEach(example => {
        prompt += `User: ${example.user}\nYou: ${example.character}\n\n`;
      });
    }

    // Add memory context
    if (characterContext?.memories && characterContext.memories.length > 0) {
      prompt += `\n\nImportant things you remember about ${userPersona?.name || 'the user'}:\n`;
      characterContext.memories.forEach(memory => {
        prompt += `- ${memory.memory_content}\n`;
      });
    }

    // Add relationship context
    if (characterContext?.relationship) {
      const rel = characterContext.relationship;
      prompt += `\n\nYour relationship: ${rel.relationship_type}`;
      prompt += `\nFamiliarity: ${Math.round(rel.familiarity_level * 100)}%`;
      prompt += `\nTrust: ${Math.round(rel.trust_level * 100)}%`;
    }

    // Add awareness of other characters in conversation
    if (characterContext?.otherCharacterMessages && characterContext.otherCharacterMessages.length > 0) {
      prompt += `\n\nRecent messages from other characters in this conversation:\n`;
      characterContext.otherCharacterMessages.slice(0, 3).reverse().forEach(msg => {
        prompt += `- ${msg.content}\n`;
      });
      prompt += `\nYou can reference, respond to, or build upon what these other characters said.`;
    }

    prompt += `\n\nStay completely in character. Respond naturally based on your personality, background, and current context.`;

    return prompt;
  }
}

module.exports = CharacterService;