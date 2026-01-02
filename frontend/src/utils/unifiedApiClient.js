/**
 * Unified API Client
 * Routes requests to either:
 * - Backend API (when running on web)
 * - Mobile Database Service (when running on iOS/Android)
 */

import { isNativePlatform } from './platform';
import { getMobileDatabaseService } from '../services/MobileDatabaseService';
import { createApiClient as createWebApiClient } from './apiClient';
import { supabase } from '../lib/supabase';

class UnifiedApiClient {
  constructor(userId) {
    this.userId = userId;
    this.isNative = isNativePlatform();
    
    if (this.isNative) {
      // On native, skip local DB initialization - we'll use Supabase directly where possible
      console.log('[UnifiedAPI] Native platform - using hybrid mode (local + Supabase)');
      this.mobileDb = null;
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
      if (endpoint.startsWith('/api/community')) {
        return this.handleCommunityRequest(endpoint, options);
      } else if (endpoint.startsWith('/api/moderation') || endpoint.startsWith('/api/admin') || 
                 endpoint.startsWith('/api/tokens') || endpoint.startsWith('/api/pricing')) {
        // Admin endpoints - pass through to backend via Supabase edge functions or return mock data
        return this.handleAdminRequest(endpoint, options);
      } else if (endpoint.startsWith('/api/characters')) {
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
            offlineMode: false,
            communityFeatures: true
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

  /**
   * Handle admin/moderation requests - use Supabase for data
   */
  async handleAdminRequest(endpoint, options) {
    const method = options.method || 'GET';
    console.log('[UnifiedAPI Admin]', method, endpoint);

    // For now, return empty data structures for admin endpoints on mobile
    // These would need proper Supabase table setup to work fully
    if (endpoint === '/api/moderation/queue') {
      return { queue: [] };
    }
    if (endpoint === '/api/moderation/reports') {
      return { reports: [] };
    }
    if (endpoint === '/api/moderation/stats') {
      return { pending: 0, approved: 0, rejected: 0, unresolvedReports: 0 };
    }
    if (endpoint === '/api/pricing/recommendations') {
      return { recommendations: {}, tierPricing: {} };
    }
    if (endpoint === '/api/tokens/admin/all-balances') {
      return { balances: [] };
    }
    if (endpoint.startsWith('/api/admin/keys')) {
      return { keys: [] };
    }
    if (endpoint.startsWith('/api/tokens/models')) {
      // Fetch token models from Supabase
      const { data, error } = await supabase
        .from('token_models')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return { models: data || [] };
    }
    if (endpoint === '/api/token-models/analytics') {
      // Return empty analytics data for mobile
      return {
        totalTransactions: 0,
        totalTokensUsed: 0,
        averageCostPerTransaction: 0,
        modelBreakdown: [],
        dailyUsage: []
      };
    }
    if (endpoint === '/api/token-models/refresh-pricing') {
      // Mock refresh pricing on mobile
      return { success: true, message: 'Pricing refreshed (mobile mode)' };
    }
    if (endpoint.startsWith('/api/tokens/failed')) {
      // Return empty failed transactions for mobile
      return { failed_transactions: [] };
    }

    throw new Error(`Admin endpoint not implemented: ${endpoint}`);
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

  /**
   * Handle community requests using Supabase directly
   */
  async handleCommunityRequest(endpoint, options) {
    const method = options.method || 'GET';
    console.log('[UnifiedAPI Community]', method, endpoint);

    // Parse endpoint to determine action
    if (endpoint.startsWith('/api/community/characters')) {
      // GET /api/community/characters - List community characters
      if (method === 'GET') {
        const url = new URL(`https://dummy.com${endpoint}`);
        const params = url.searchParams;
        
        const limit = parseInt(params.get('limit') || '20');
        const offset = parseInt(params.get('offset') || '0');
        const sortBy = params.get('sortBy') || 'recent';
        const search = params.get('search') || '';
        const tags = params.get('tags') || '';

        let query = supabase
          .from('community_characters')
          .select('*', { count: 'exact' });

        // Search filter
        if (search) {
          query = query.or(`name.ilike.%${search}%,personality.ilike.%${search}%`);
        }

        // Tags filter
        if (tags) {
          const tagArray = tags.split(',');
          query = query.contains('tags', tagArray);
        }

        // Sorting
        if (sortBy === 'popular') {
          query = query.order('favorite_count', { ascending: false });
        } else if (sortBy === 'trending') {
          query = query.order('view_count', { ascending: false });
        } else {
          query = query.order('created_at', { ascending: false });
        }

        // Pagination
        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;
        
        if (error) throw error;

        return {
          characters: data || [],
          hasMore: (offset + limit) < count
        };
      }

      // Handle character-specific endpoints
      const charMatch = endpoint.match(/\/api\/community\/characters\/([^\/]+)\/(.+)/);
      if (charMatch) {
        const [, charId, action] = charMatch;

        // POST /api/community/characters/:id/view - Track view
        if (action === 'view' && method === 'POST') {
          const { error } = await supabase.rpc('increment_character_views', {
            character_id: charId
          });
          if (error) console.error('Failed to increment views:', error);
          return { success: true };
        }

        // POST /api/community/characters/:id/favorite - Toggle favorite
        if (action === 'favorite' && method === 'POST') {
          const { error } = await supabase.rpc('increment_character_favorites', {
            character_id: charId
          });
          if (error) throw error;
          return { success: true };
        }

        // DELETE /api/community/characters/:id/favorite - Remove favorite
        if (action === 'favorite' && method === 'DELETE') {
          const { error } = await supabase.rpc('decrement_character_favorites', {
            character_id: charId
          });
          if (error) throw error;
          return { success: true };
        }

        // GET /api/community/characters/:id/comments - Get comments
        if (action === 'comments' && method === 'GET') {
          const { data, error } = await supabase
            .from('character_comments')
            .select('*')
            .eq('character_id', charId)
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          return { comments: data || [] };
        }

        // POST /api/community/characters/:id/comments - Add comment
        if (action === 'comments' && method === 'POST') {
          const body = JSON.parse(options.body);
          const { data, error } = await supabase
            .from('character_comments')
            .insert({
              character_id: charId,
              user_id: this.userId,
              comment: body.comment
            })
            .select()
            .single();
          
          if (error) throw error;
          return { comment: data };
        }

        // POST /api/community/characters/:id/import - Import character
        if (action === 'import' && method === 'POST') {
          // Fetch the character from community
          const { data: charData, error: charError } = await supabase
            .from('community_characters')
            .select('*')
            .eq('id', charId)
            .single();
          
          if (charError) throw charError;
          
          // Insert into user's characters (this would need local DB or Supabase user table)
          // For now, just return the character data
          return { character: charData };
        }
      }
    }

    // Handle scene endpoints
    if (endpoint.startsWith('/api/community/scenes')) {
      // GET /api/community/scenes - List community scenes
      if (method === 'GET') {
        const url = new URL(`https://dummy.com${endpoint}`);
        const params = url.searchParams;
        
        const limit = parseInt(params.get('limit') || '20');
        const offset = parseInt(params.get('offset') || '0');
        const sortBy = params.get('sortBy') || 'recent';
        const search = params.get('search') || '';

        let query = supabase
          .from('community_scenes')
          .select('*', { count: 'exact' });

        // Search filter
        if (search) {
          query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
        }

        // Sorting
        if (sortBy === 'popular') {
          query = query.order('favorite_count', { ascending: false });
        } else {
          query = query.order('created_at', { ascending: false });
        }

        // Pagination
        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;
        
        if (error) throw error;

        return {
          scenes: data || [],
          hasMore: (offset + limit) < count
        };
      }

      // Handle scene-specific endpoints
      const sceneMatch = endpoint.match(/\/api\/community\/scenes\/([^\/]+)\/(.+)/);
      if (sceneMatch) {
        const [, sceneId, action] = sceneMatch;

        // POST /api/community/scenes/:id/view - Track view
        if (action === 'view' && method === 'POST') {
          const { error } = await supabase.rpc('increment_scene_views', {
            scene_id: sceneId
          });
          if (error) console.error('Failed to increment views:', error);
          return { success: true };
        }

        // POST /api/community/scenes/:id/import - Import scene
        if (action === 'import' && method === 'POST') {
          // Fetch the scene from community
          const { data: sceneData, error: sceneError } = await supabase
            .from('community_scenes')
            .select('*')
            .eq('id', sceneId)
            .single();
          
          if (sceneError) throw sceneError;
          
          // Return the scene data for import
          return { scene: sceneData };
        }
      }
    }

    throw new Error(`Community endpoint not implemented: ${endpoint}`);
  }
}

// Export factory function
export const createUnifiedApiClient = (userId) => {
  const client = new UnifiedApiClient(userId);
  return (endpoint, options) => client.request(endpoint, options);
};
