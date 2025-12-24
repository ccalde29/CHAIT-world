/**
 * Unified API Client
 * Routes requests to either:
 * - Backend API (when running on web)
 * - Mobile Database Service (when running on iOS/Android)
 */

import { isNativePlatform } from './platform';
import { getMobileDatabaseService } from '../services/MobileDatabaseService';
import { createApiClient as createWebApiClient } from './apiClient';

class UnifiedApiClient {
  constructor(userId) {
    this.userId = userId;
    this.isNative = isNativePlatform();
    
    if (this.isNative) {
      // Initialize mobile database
      this.mobileDb = getMobileDatabaseService();
      this.mobileDb.initialize().catch(err => {
        console.error('[UnifiedAPI] Failed to initialize mobile DB:', err);
      });
    } else {
      // Use web API client
      this.webApi = createWebApiClient(userId);
    }
  }

  async request(endpoint, options = {}) {
    if (this.isNative) {
      return this.handleNativeRequest(endpoint, options);
    } else {
      return this.webApi(endpoint, options);
    }
  }

  /**
   * Handle requests for native platform using local database
   */
  async handleNativeRequest(endpoint, options = {}) {
    console.log('[UnifiedAPI Native]', options.method || 'GET', endpoint);

    try {
      // Route based on endpoint
      if (endpoint.startsWith('/api/characters')) {
        return this.handleCharactersRequest(endpoint, options);
      } else if (endpoint.startsWith('/api/scenarios')) {
        return this.handleScenariosRequest(endpoint, options);
      } else if (endpoint.startsWith('/api/chat')) {
        return this.handleChatRequest(endpoint, options);
      } else if (endpoint.startsWith('/api/settings') || endpoint.startsWith('/api/user')) {
        return this.handleSettingsRequest(endpoint, options);
      } else if (endpoint.startsWith('/api/personas')) {
        return this.handlePersonasRequest(endpoint, options);
      } else if (endpoint.startsWith('/api/memory') || endpoint.startsWith('/api/character/')) {
        return this.handleMemoryRequest(endpoint, options);
      } else if (endpoint === '/health') {
        return {
          status: 'OK',
          mode: 'native',
          platform: 'ios',
          features: {
            chatHistory: true,
            characterMemory: true,
            offlineMode: true,
            communityFeatures: false
          }
        };
      }

      throw new Error(`Endpoint not implemented for native: ${endpoint}`);
    } catch (error) {
      console.error('[UnifiedAPI Native] Error:', error);
      throw error;
    }
  }

  async handleCharactersRequest(endpoint, options) {
    const method = options.method || 'GET';
    
    // GET /api/characters - List all characters
    if (endpoint === '/api/characters' && method === 'GET') {
      const rows = await this.mobileDb.query(
        'SELECT * FROM characters WHERE user_id = ? ORDER BY created_at DESC',
        [this.userId]
      );
      return { characters: rows.map(this.parseCharacterJson) };
    }

    // POST /api/characters - Create character
    if (endpoint === '/api/characters' && method === 'POST') {
      const data = JSON.parse(options.body);
      const id = this.generateId();
      
      await this.mobileDb.run(
        `INSERT INTO characters (
          id, user_id, name, age, sex, personality, appearance, background,
          avatar, color, chat_examples, tags, temperature, max_tokens
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, this.userId, data.name, data.age, data.sex,
          data.personality, data.appearance, data.background,
          data.avatar, data.color,
          JSON.stringify(data.chat_examples || []),
          JSON.stringify(data.tags || []),
          data.temperature || 0.7,
          data.max_tokens || 150
        ]
      );

      return { id, ...data };
    }

    // PUT /api/characters/:id - Update character
    const updateMatch = endpoint.match(/^\/api\/characters\/([^/]+)$/);
    if (updateMatch && method === 'PUT') {
      const charId = updateMatch[1];
      const data = JSON.parse(options.body);
      
      await this.mobileDb.run(
        `UPDATE characters SET
          name = ?, age = ?, sex = ?, personality = ?, appearance = ?,
          background = ?, avatar = ?, color = ?, chat_examples = ?,
          tags = ?, temperature = ?, max_tokens = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?`,
        [
          data.name, data.age, data.sex, data.personality, data.appearance,
          data.background, data.avatar, data.color,
          JSON.stringify(data.chat_examples || []),
          JSON.stringify(data.tags || []),
          data.temperature, data.max_tokens,
          charId, this.userId
        ]
      );

      return { success: true };
    }

    // DELETE /api/characters/:id
    const deleteMatch = endpoint.match(/^\/api\/characters\/([^/]+)$/);
    if (deleteMatch && method === 'DELETE') {
      const charId = deleteMatch[1];
      await this.mobileDb.run(
        'DELETE FROM characters WHERE id = ? AND user_id = ?',
        [charId, this.userId]
      );
      return { success: true };
    }

    throw new Error(`Characters endpoint not implemented: ${method} ${endpoint}`);
  }

  async handleScenariosRequest(endpoint, options) {
    const method = options.method || 'GET';

    // GET /api/scenarios
    if (endpoint === '/api/scenarios' && method === 'GET') {
      const rows = await this.mobileDb.query(
        'SELECT * FROM scenarios WHERE user_id = ? ORDER BY created_at DESC',
        [this.userId]
      );
      return { scenarios: rows };
    }

    // Add more scenario endpoints as needed...
    throw new Error(`Scenarios endpoint not implemented: ${method} ${endpoint}`);
  }

  async handleChatRequest(endpoint, options) {
    const method = options.method || 'GET';

    // GET /api/chat/sessions
    if (endpoint === '/api/chat/sessions' && method === 'GET') {
      const rows = await this.mobileDb.query(
        'SELECT * FROM chat_sessions WHERE user_id = ? ORDER BY last_message_at DESC LIMIT 50',
        [this.userId]
      );
      return { sessions: rows.map(s => ({
        ...s,
        active_characters: JSON.parse(s.active_characters || '[]')
      })) };
    }

    // Add more chat endpoints as needed...
    throw new Error(`Chat endpoint not implemented: ${method} ${endpoint}`);
  }

  async handleSettingsRequest(endpoint, options) {
    const method = options.method || 'GET';

    // GET /api/user/settings
    if (endpoint === '/api/user/settings' && method === 'GET') {
      const rows = await this.mobileDb.query(
        'SELECT * FROM user_settings_local WHERE user_id = ?',
        [this.userId]
      );
      
      if (rows.length > 0) {
        const settings = rows[0];
        return {
          userId: settings.user_id,
          apiKeys: JSON.parse(settings.api_keys || '{}'),
          ollamaSettings: JSON.parse(settings.ollama_settings || '{}'),
          lmStudioSettings: JSON.parse(settings.lmstudio_settings || '{}'),
          defaultProvider: settings.default_provider,
          defaultModel: settings.default_model,
          groupDynamicsMode: settings.group_dynamics_mode || 'natural',
          messageDelay: settings.message_delay || 1200
        };
      }

      return {};
    }

    throw new Error(`Settings endpoint not implemented: ${method} ${endpoint}`);
  }

  async handlePersonasRequest(endpoint, options) {
    // Implement persona endpoints...
    throw new Error(`Personas endpoint not implemented: ${endpoint}`);
  }

  async handleMemoryRequest(endpoint, options) {
    // Implement memory endpoints...
    throw new Error(`Memory endpoint not implemented: ${endpoint}`);
  }

  // Helper methods
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  parseCharacterJson(char) {
    return {
      ...char,
      chat_examples: JSON.parse(char.chat_examples || '[]'),
      tags: JSON.parse(char.tags || '[]'),
      relationships: JSON.parse(char.relationships || '[]'),
      memory_enabled: Boolean(char.memory_enabled),
      uses_custom_image: Boolean(char.uses_custom_image),
      is_default: Boolean(char.is_default)
    };
  }
}

// Export factory function
export const createUnifiedApiClient = (userId) => {
  const client = new UnifiedApiClient(userId);
  return (endpoint, options) => client.request(endpoint, options);
};
