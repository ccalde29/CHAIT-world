// ============================================================================
// Database Service Layer
// backend/services/database.js
// ============================================================================

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

class DatabaseService {
  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service role for backend
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    this.encryptionKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
  }

  // ============================================================================
  // ENCRYPTION UTILITIES
  // ============================================================================

  encryptApiKey(text) {
    if (!text) return null;
    
    try {
      const algorithm = 'aes-256-gcm';
      const iv = crypto.randomBytes(16);
      
      // Create a proper 32-byte key from the encryption key
      const key = crypto.createHash('sha256').update(this.encryptionKey.toString()).digest();
      
      const cipher = crypto.createCipherGCM(algorithm, key, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        algorithm: 'aes-256-gcm'
      };
    } catch (error) {
      console.error('Encryption error:', error);
      
      // Fallback: simple base64 encoding (less secure but works)
      console.warn('Falling back to base64 encoding');
      return {
        encrypted: Buffer.from(text).toString('base64'),
        iv: null,
        authTag: null,
        algorithm: 'base64'
      };
    }
  }

  decryptApiKey(encryptedData) {
    if (!encryptedData) return null;
    
    try {
      // Handle base64 fallback
      if (encryptedData.algorithm === 'base64') {
        return Buffer.from(encryptedData.encrypted, 'base64').toString('utf8');
      }
      
      // Handle proper AES-GCM decryption
      if (encryptedData.algorithm === 'aes-256-gcm') {
        const key = crypto.createHash('sha256').update(this.encryptionKey.toString()).digest();
        const iv = Buffer.from(encryptedData.iv, 'hex');
        
        const decipher = crypto.createDecipherGCM('aes-256-gcm', key, iv);
        decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
        
        let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
      }
      
      // Fallback for unknown algorithm
      throw new Error('Unknown encryption algorithm');
      
    } catch (error) {
      console.error('Decryption error:', error);
      
      // Try base64 fallback as last resort
      try {
        return Buffer.from(encryptedData.encrypted, 'base64').toString('utf8');
      } catch (fallbackError) {
        console.error('All decryption methods failed:', fallbackError);
        return null;
      }
    }
  }

  // ============================================================================
  // CHARACTER MANAGEMENT
  // ============================================================================

  async getCharacters(userId) {
    try {
      // Get custom characters
      const { data: customChars, error: customError } = await this.supabase
        .from('characters')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (customError) throw customError;

      // Get hidden default characters
      const { data: hiddenDefaults, error: hiddenError } = await this.supabase
        .from('hidden_default_characters')
        .select('character_id')
        .eq('user_id', userId);

      if (hiddenError) throw hiddenError;

      const hiddenDefaultIds = new Set(hiddenDefaults.map(h => h.character_id));

      // Default characters (defined in application)
      const defaultCharacters = [
        {
          id: 'maya',
          name: 'Maya',
          personality: 'Energetic art student who loves creativity, colors, and seeing the artistic side of everything. Optimistic and playful with a tendency to get excited about visual concepts.',
          avatar: '🎨',
          color: 'from-pink-500 to-purple-500',
          response_style: 'playful',
          is_default: true
        },
        {
          id: 'alex',
          name: 'Alex',
          personality: 'Thoughtful philosophy major who asks deep questions about human nature, meaning, and existence. Contemplative and curious, often references philosophical concepts.',
          avatar: '🤔',
          color: 'from-blue-500 to-indigo-500',
          response_style: 'contemplative',
          is_default: true
        },
        {
          id: 'zoe',
          name: 'Zoe',
          personality: 'Sarcastic tech enthusiast with quick wit and dry humor. Knowledgeable about technology and internet culture, slightly cynical but ultimately caring.',
          avatar: '💻',
          color: 'from-green-500 to-teal-500',
          response_style: 'witty',
          is_default: true
        },
        {
          id: 'finn',
          name: 'Finn',
          personality: 'Laid-back musician who goes with the flow and relates everything back to music, lyrics, or cultural moments. Supportive and chill with a creative soul.',
          avatar: '🎸',
          color: 'from-orange-500 to-red-500',
          response_style: 'chill',
          is_default: true
        }
      ];

      // Filter out hidden defaults and combine with custom characters
      const visibleDefaults = defaultCharacters.filter(char => !hiddenDefaultIds.has(char.id));
      const allCharacters = [...visibleDefaults, ...(customChars || [])];

      return {
        characters: allCharacters,
        total: allCharacters.length
      };

    } catch (error) {
      console.error('Database error getting characters:', error);
      throw error;
    }
  }

  async createCharacter(userId, characterData) {
    try {
      const { data, error } = await this.supabase
        .from('characters')
        .insert({
          user_id: userId,
          name: characterData.name,
          personality: characterData.personality,
          avatar: characterData.avatar || '🤖',
          color: characterData.color || 'from-gray-500 to-slate-500',
          response_style: 'custom'
        })
        .select()
        .single();

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('Database error creating character:', error);
      throw error;
    }
  }

  async updateCharacter(userId, characterId, updates) {
    try {
      // Check if it's a default character being modified
      const defaultCharacterIds = ['maya', 'alex', 'zoe', 'finn'];
      
      if (defaultCharacterIds.includes(characterId)) {
        // Create a new custom character based on the default
        const newCharacter = {
          user_id: userId,
          name: updates.name,
          personality: updates.personality,
          avatar: updates.avatar,
          color: updates.color,
          response_style: 'custom',
          is_modified_default: true,
          original_id: characterId
        };

        const { data, error } = await this.supabase
          .from('characters')
          .insert(newCharacter)
          .select()
          .single();

        if (error) throw error;

        // Hide the original default character
        await this.hideDefaultCharacter(userId, characterId);

        return data;
      } else {
        // Update existing custom character
        const { data, error } = await this.supabase
          .from('characters')
          .update({
            name: updates.name,
            personality: updates.personality,
            avatar: updates.avatar,
            color: updates.color,
            updated_at: new Date().toISOString()
          })
          .eq('id', characterId)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;
        return data;
      }

    } catch (error) {
      console.error('Database error updating character:', error);
      throw error;
    }
  }

  async deleteCharacter(userId, characterId) {
    try {
      const defaultCharacterIds = ['maya', 'alex', 'zoe', 'finn'];
      
      if (defaultCharacterIds.includes(characterId)) {
        // Hide default character
        await this.hideDefaultCharacter(userId, characterId);
        return { message: 'Default character hidden', characterId };
      } else {
        // Delete custom character
        const { error } = await this.supabase
          .from('characters')
          .delete()
          .eq('id', characterId)
          .eq('user_id', userId);

        if (error) throw error;
        return { message: 'Character deleted', characterId };
      }

    } catch (error) {
      console.error('Database error deleting character:', error);
      throw error;
    }
  }

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
      console.error('Database error hiding character:', error);
      throw error;
    }
  }
// ============================================================================
// USER PERSONA MANAGEMENT METHODS
// Add these methods to your DatabaseService class in database.js
// ============================================================================

/**
 * Get user's persona
 */
async getUserPersona(userId) {
  try {
    const { data, error } = await this.supabase
      .from('user_personas')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    // Return default persona if none exists
    if (!data) {
      return {
        hasPersona: false,
        persona: {
          name: 'User',
          personality: 'A curious individual engaging in conversation',
          interests: [],
          communication_style: 'casual and friendly',
          avatar: '👤',
          color: 'from-blue-500 to-indigo-500'
        }
      };
    }

    return {
      hasPersona: true,
      persona: {
        id: data.id,
        name: data.name,
        personality: data.personality,
        interests: data.interests || [],
        communication_style: data.communication_style || '',
        avatar: data.avatar,
        color: data.color,
        created_at: data.created_at
      }
    };

  } catch (error) {
    console.error('Database error getting user persona:', error);
    throw error;
  }
}

/**
 * Create or update user persona
 */
async createOrUpdateUserPersona(userId, personaData) {
  try {
    // First, deactivate any existing active persona
    await this.supabase
      .from('user_personas')
      .update({ is_active: false })
      .eq('user_id', userId);

    // Create new active persona
    const { data, error } = await this.supabase
      .from('user_personas')
      .insert({
        user_id: userId,
        name: personaData.name,
        personality: personaData.personality,
        interests: personaData.interests,
        communication_style: personaData.communication_style,
        avatar: personaData.avatar,
        color: personaData.color,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;
    return data;

  } catch (error) {
    console.error('Database error creating/updating user persona:', error);
    throw error;
  }
}

/**
 * Delete user persona (deactivate)
 */
async deleteUserPersona(userId) {
  try {
    const { error } = await this.supabase
      .from('user_personas')
      .update({ is_active: false })
      .eq('user_id', userId);

    if (error) throw error;
    return { message: 'User persona deleted successfully' };

  } catch (error) {
    console.error('Database error deleting user persona:', error);
    throw error;
  }
}
  // ============================================================================
  // USER SETTINGS MANAGEMENT
  // ============================================================================

  async getUserSettings(userId) {
    try {
      const { data, error } = await this.supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      // Return default settings if none exist
      if (!data) {
        const defaultSettings = {
          user_id: userId,
          api_provider: 'openai',
          ollama_base_url: 'http://localhost:11434',
          ollama_model: 'llama2',
          default_scenario: 'coffee-shop',
          preferences: {
            responseDelay: true,
            showTypingIndicator: true,
            maxCharactersInGroup: 5
          }
        };

        // Create default settings
        const { data: newSettings, error: createError } = await this.supabase
          .from('user_settings')
          .insert(defaultSettings)
          .select()
          .single();

        if (createError) throw createError;
        
        // Convert to frontend format
        return this.convertSettingsToFrontend(newSettings);
      }

      // Convert to frontend format
      return this.convertSettingsToFrontend(data);

    } catch (error) {
      console.error('Database error getting user settings:', error);
      throw error;
    }
  }

  async updateUserSettings(userId, updates) {
    try {
      console.log('🔧 Original updates:', updates);
      
      // Convert frontend format to database format
      const dbUpdates = this.convertSettingsToDatabase(updates);
      console.log('🗄️ Database updates:', dbUpdates);
      
      // Handle API key encryption
      if (updates.apiKeys) {
        if (updates.apiKeys.openai) {
          dbUpdates.openai_key_encrypted = JSON.stringify(this.encryptApiKey(updates.apiKeys.openai));
        }
        if (updates.apiKeys.anthropic) {
          dbUpdates.anthropic_key_encrypted = JSON.stringify(this.encryptApiKey(updates.apiKeys.anthropic));
        }
      }

      const { data, error } = await this.supabase
        .from('user_settings')
        .upsert({
          user_id: userId,
          ...dbUpdates,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      
      // Convert back to frontend format
      return this.convertSettingsToFrontend(data);

    } catch (error) {
      console.error('Database error updating user settings:', error);
      throw error;
    }
  }

  convertSettingsToFrontend(dbSettings) {
    return {
      user_id: dbSettings.user_id,
      apiProvider: dbSettings.api_provider,
      apiKeys: {
        openai: dbSettings.openai_key_encrypted ? '***configured***' : '',
        anthropic: dbSettings.anthropic_key_encrypted ? '***configured***' : ''
      },
      ollamaSettings: {
        baseUrl: dbSettings.ollama_base_url,
        model: dbSettings.ollama_model
      },
      defaultScenario: dbSettings.default_scenario,
      preferences: dbSettings.preferences || {
        responseDelay: true,
        showTypingIndicator: true,
        maxCharactersInGroup: 5
      },
      created_at: dbSettings.created_at,
      updated_at: dbSettings.updated_at
    };
  }

  // Helper function to convert frontend format to database format
  convertSettingsToDatabase(frontendSettings) {
    const dbSettings = {};
    
    // Map camelCase to snake_case
    if (frontendSettings.apiProvider !== undefined) {
      dbSettings.api_provider = frontendSettings.apiProvider;
    }
    
    if (frontendSettings.ollamaSettings) {
      if (frontendSettings.ollamaSettings.baseUrl !== undefined) {
        dbSettings.ollama_base_url = frontendSettings.ollamaSettings.baseUrl;
      }
      if (frontendSettings.ollamaSettings.model !== undefined) {
        dbSettings.ollama_model = frontendSettings.ollamaSettings.model;
      }
    }
    
    if (frontendSettings.defaultScenario !== undefined) {
      dbSettings.default_scenario = frontendSettings.defaultScenario;
    }
    
    if (frontendSettings.preferences !== undefined) {
      dbSettings.preferences = frontendSettings.preferences;
    }
    
    return dbSettings;
  }

  async getDecryptedApiKeys(userId) {
    try {
      const { data, error } = await this.supabase
        .from('user_settings')
        .select('openai_key_encrypted, anthropic_key_encrypted')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      const apiKeys = {
        openai: null,
        anthropic: null
      };

      if (data.openai_key_encrypted) {
        try {
          const encryptedData = JSON.parse(data.openai_key_encrypted);
          apiKeys.openai = this.decryptApiKey(encryptedData);
        } catch (e) {
          console.error('Error decrypting OpenAI key:', e);
        }
      }

      if (data.anthropic_key_encrypted) {
        try {
          const encryptedData = JSON.parse(data.anthropic_key_encrypted);
          apiKeys.anthropic = this.decryptApiKey(encryptedData);
        } catch (e) {
          console.error('Error decrypting Anthropic key:', e);
        }
      }

      return apiKeys;

    } catch (error) {
      console.error('Database error getting API keys:', error);
      throw error;
    }
  }

  // ============================================================================
  // SCENARIO MANAGEMENT
  // ============================================================================

  async getScenarios(userId) {
    try {
      // Get custom scenarios
      const { data: customScenarios, error } = await this.supabase
        .from('scenarios')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Default scenarios (defined in application)
      const defaultScenarios = [
        {
          id: 'coffee-shop',
          name: 'Coffee Shop Hangout',
          description: 'Casual afternoon at a cozy coffee shop',
          context: 'The group is hanging out at a cozy coffee shop on a relaxed afternoon, sharing drinks and casual conversation.',
          atmosphere: 'relaxed and friendly',
          is_default: true
        },
        {
          id: 'study-group',
          name: 'Study Session',
          description: 'Working on assignments together',
          context: 'The group is in a study session, working on assignments together but taking breaks to chat and help each other.',
          atmosphere: 'focused but collaborative',
          is_default: true
        },
        {
          id: 'party',
          name: 'House Party',
          description: 'Weekend party with music and games',
          context: 'The group is at a weekend house party with music playing, people socializing, and a fun, energetic atmosphere.',
          atmosphere: 'energetic and social',
          is_default: true
        }
      ];

      const allScenarios = [...defaultScenarios, ...(customScenarios || [])];

      return {
        scenarios: allScenarios,
        total: allScenarios.length
      };

    } catch (error) {
      console.error('Database error getting scenarios:', error);
      throw error;
    }
  }

  async createScenario(userId, scenarioData) {
    try {
      const { data, error } = await this.supabase
        .from('scenarios')
        .insert({
          user_id: userId,
          name: scenarioData.name,
          description: scenarioData.description,
          context: scenarioData.context,
          atmosphere: scenarioData.atmosphere || 'neutral'
        })
        .select()
        .single();

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('Database error creating scenario:', error);
      throw error;
    }
  }

  async updateScenario(userId, scenarioId, updates) {
    try {
      const { data, error } = await this.supabase
        .from('scenarios')
        .update({
          name: updates.name,
          description: updates.description,
          context: updates.context,
          atmosphere: updates.atmosphere,
          updated_at: new Date().toISOString()
        })
        .eq('id', scenarioId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('Database error updating scenario:', error);
      throw error;
    }
  }

  async deleteScenario(userId, scenarioId) {
    try {
      const { error } = await this.supabase
        .from('scenarios')
        .delete()
        .eq('id', scenarioId)
        .eq('user_id', userId);

      if (error) throw error;
      return { message: 'Scenario deleted', scenarioId };

    } catch (error) {
      console.error('Database error deleting scenario:', error);
      throw error;
    }
  }

  // ============================================================================
  // CHAT SESSION MANAGEMENT
  // ============================================================================

  async createChatSession(userId, sessionData) {
    try {
      const { data, error } = await this.supabase
        .from('chat_sessions')
        .insert({
          user_id: userId,
          scenario_id: sessionData.scenario,
          active_characters: sessionData.activeCharacters,
          group_mode: sessionData.groupMode || 'natural'
        })
        .select()
        .single();

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('Database error creating chat session:', error);
      throw error;
    }
  }

  async saveChatMessage(sessionId, messageData) {
    try {
      const { data, error } = await this.supabase
        .from('messages')
        .insert({
          session_id: sessionId,
          type: messageData.type,
          content: messageData.content,
          character_id: messageData.character || null
        })
        .select()
        .single();

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('Database error saving message:', error);
      throw error;
    }
  }

  async getChatHistory(userId, limit = 10) {
    try {
      const { data, error } = await this.supabase
        .from('chat_sessions')
        .select(`
          *,
          messages (
            id,
            type,
            content,
            character_id,
            timestamp
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('Database error getting chat history:', error);
      throw error;
    }
  }
}

module.exports = DatabaseService;
