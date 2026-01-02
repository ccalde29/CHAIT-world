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
    
    // Always create the web API client - it works on both web and mobile
    // since backend runs on localhost:3001 on the device
    this.webApi = createWebApiClient(userId);
    
    if (this.isNative) {
      console.log('[UnifiedAPI] Native platform - routing to local backend server');
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
   * Handle requests for native platform
   * On mobile: Use Supabase directly for ALL operations (no local backend server)
   * Backend server is not available on iOS/Android - use Supabase as primary database
   */
  async handleNativeRequest(endpoint, options = {}) {
    console.log('[UnifiedAPI Native]', options.method || 'GET', endpoint);

    try {
      // Route ALL requests to Supabase handlers on mobile
      // No backend server runs on device - everything uses Supabase
      
      // Community endpoints
      if (endpoint.startsWith('/api/community')) {
        return this.handleCommunityRequest(endpoint, options);
      }
      
      // Admin endpoints
      if (endpoint.startsWith('/api/moderation') || 
          endpoint.startsWith('/api/admin') || 
          endpoint.startsWith('/api/tokens') || 
          endpoint.startsWith('/api/pricing') ||
          endpoint.startsWith('/api/token-models')) {
        return this.handleAdminRequest(endpoint, options);
      }
      
      // User data endpoints - use Supabase
      if (endpoint.startsWith('/api/characters') ||
          endpoint.startsWith('/api/scenarios') ||
          endpoint.startsWith('/api/chat') ||
          endpoint.startsWith('/api/user') ||
          endpoint.startsWith('/api/personas') ||
          endpoint.startsWith('/api/settings')) {
        return this.handleUserDataRequest(endpoint, options);
      }
      
      // Health check
      if (endpoint === '/health') {
        return {
          status: 'OK',
          mode: 'mobile',
          platform: 'ios',
          storage: 'supabase'
        };
      }
      
      throw new Error(`Endpoint not implemented for mobile: ${endpoint}`);
      
    } catch (error) {
      console.error('[UnifiedAPI Native] Error:', error);
      throw error;
    }
  }

  /**
   * Handle admin requests on mobile - query Supabase directly
   */
  async handleAdminRequest(endpoint, options) {
    const method = options.method || 'GET';
    console.log('[UnifiedAPI Admin]', method, endpoint);

    // Token Models
    if (endpoint === '/api/token-models' || endpoint === '/api/token-models/all') {
      const { data, error } = await supabase
        .from('token_models')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return { models: data || [] };
    }

    // Token Models Analytics
    if (endpoint === '/api/token-models/analytics') {
      // Return minimal analytics since token_transactions schema is limited
      try {
        const { count, error } = await supabase
          .from('token_transactions')
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.warn('[Admin] Analytics query error:', error);
          return {
            totalTransactions: 0,
            totalTokensUsed: 0,
            averageCostPerTransaction: 0,
            modelBreakdown: [],
            dailyUsage: []
          };
        }

        return {
          totalTransactions: count || 0,
          totalTokensUsed: 0,
          averageCostPerTransaction: 0,
          modelBreakdown: [],
          dailyUsage: []
        };
      } catch (err) {
        console.warn('[Admin] Analytics error:', err);
        return {
          totalTransactions: 0,
          totalTokensUsed: 0,
          averageCostPerTransaction: 0,
          modelBreakdown: [],
          dailyUsage: []
        };
      }
    }

    // Failed Transactions
    if (endpoint.startsWith('/api/tokens/failed')) {
      try {
        const { data, error } = await supabase
          .from('token_transactions')
          .select('*')
          .eq('success', false)
          .order('created_at', { ascending: false })
          .limit(100);
        
        if (error) {
          console.warn('[Admin] Failed transactions query error:', error);
          return { failed_transactions: [] };
        }
        return { failed_transactions: data || [] };
      } catch (err) {
        console.warn('[Admin] Failed transactions error:', err);
        return { failed_transactions: [] };
      }
    }

    // Moderation Queue
    if (endpoint === '/api/moderation/queue') {
      const { data: characters, error: charError } = await supabase
        .from('community_characters')
        .select('*')
        .eq('moderation_status', 'pending')
        .order('created_at', { ascending: false });

      const { data: scenes, error: sceneError } = await supabase
        .from('community_scenes')
        .select('*')
        .eq('moderation_status', 'pending')
        .order('created_at', { ascending: false });

      if (charError || sceneError) throw charError || sceneError;

      return { 
        queue: [
          ...(characters || []).map(c => ({ ...c, type: 'character' })),
          ...(scenes || []).map(s => ({ ...s, type: 'scene' }))
        ]
      };
    }

    // Moderation Stats
    if (endpoint === '/api/moderation/stats') {
      const { data: characters } = await supabase
        .from('community_characters')
        .select('moderation_status');

      const { data: scenes } = await supabase
        .from('community_scenes')
        .select('moderation_status');

      const allItems = [...(characters || []), ...(scenes || [])];
      const pending = allItems.filter(i => i.moderation_status === 'pending').length;
      const approved = allItems.filter(i => i.moderation_status === 'approved').length;
      const rejected = allItems.filter(i => i.moderation_status === 'rejected').length;

      return { pending, approved, rejected, unresolvedReports: 0 };
    }

    // Pricing recommendations
    if (endpoint === '/api/pricing/recommendations') {
      return { recommendations: {}, tierPricing: {} };
    }

    // Token balances from user_tokens table
    if (endpoint === '/api/tokens/admin/all-balances') {
      try {
        const { data, error } = await supabase
          .from('user_tokens')
          .select('user_id, balance, lifetime_earned, lifetime_purchased, last_weekly_refill, created_at, updated_at')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.warn('[Admin] User tokens query error:', error);
          return { balances: [] };
        }
        return { balances: data || [] };
      } catch (err) {
        console.warn('[Admin] User tokens error:', err);
        return { balances: [] };
      }
    }

    // Admin API Keys
    if (endpoint.startsWith('/api/admin/keys')) {
      try {
        const { data, error } = await supabase
          .from('admin_api_keys')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.warn('[Admin] API keys query error:', error);
          return { keys: [] };
        }
        return { keys: data || [] };
      } catch (err) {
        console.warn('[Admin] API keys error:', err);
        return { keys: [] };
      }
    }

    // Default: route to backend
    return this.webApi(endpoint, options);
  }

  /**
   * Handle user data requests on mobile - use Supabase for storage
   * On mobile, user's characters/scenarios/chats are stored in Supabase
   * This replaces the local SQLite database used on web
   */
  async handleUserDataRequest(endpoint, options) {
    const method = options.method || 'GET';
    console.log('[UnifiedAPI UserData]', method, endpoint);

    // Characters
    if (endpoint === '/api/characters' && method === 'GET') {
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('[UserData] Characters query error:', error);
        return { characters: [] };
      }
      return { characters: data || [] };
    }

    // Scenarios
    if (endpoint === '/api/scenarios' && method === 'GET') {
      const { data, error } = await supabase
        .from('scenarios')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('[UserData] Scenarios query error:', error);
        return { scenarios: [] };
      }
      return { scenarios: data || [] };
    }

    // Chat sessions
    if (endpoint === '/api/chat/sessions' && method === 'GET') {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', this.userId)
        .order('last_message_at', { ascending: false })
        .limit(50);
      
      if (error) {
        console.error('[UserData] Chat sessions query error:', error);
        return { sessions: [] };
      }
      return { sessions: data || [] };
    }

    // User settings
    if (endpoint === '/api/user/settings' && method === 'GET') {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', this.userId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('[UserData] Settings query error:', error);
      }
      
      return data || { 
        userId: this.userId,
        apiKeys: {},
        defaultProvider: 'openai',
        defaultModel: 'gpt-3.5-turbo'
      };
    }

    // Personas
    if (endpoint === '/api/personas' && method === 'GET') {
      const { data, error } = await supabase
        .from('user_personas')
        .select('*')
        .eq('user_id', this.userId);
      
      if (error) {
        console.error('[UserData] Personas query error:', error);
        return { personas: [] };
      }
      return { personas: data || [] };
    }

    if (endpoint === '/api/personas/active' && method === 'GET') {
      const { data, error } = await supabase
        .from('user_personas')
        .select('*')
        .eq('user_id', this.userId)
        .eq('is_active', true)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('[UserData] Active persona query error:', error);
      }
      return data ? { persona: data } : { persona: null };
    }

    if (endpoint === '/api/user/persona' && method === 'GET') {
      const { data, error } = await supabase
        .from('user_personas')
        .select('*')
        .eq('user_id', this.userId);
      
      if (error) {
        console.error('[UserData] User persona query error:', error);
        return { personas: [] };
      }
      return { personas: data || [] };
    }

    // Token balance
    if (endpoint === '/api/tokens/balance' && method === 'GET') {
      const { data, error } = await supabase
        .from('user_tokens')
        .select('balance')
        .eq('user_id', this.userId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('[UserData] Token balance query error:', error);
      }
      return { balance: data?.balance || 0 };
    }

    // Import character from community
    if (endpoint.match(/\/api\/community\/characters\/([^/]+)\/import/) && method === 'POST') {
      const charId = endpoint.match(/\/api\/community\/characters\/([^/]+)\/import/)[1];
      
      // Get character from community
      const { data: communityChar, error: fetchError } = await supabase
        .from('community_characters')
        .select('*')
        .eq('id', charId)
        .single();
      
      if (fetchError) throw fetchError;

      // Create in user's characters table
      const { data: newChar, error: createError } = await supabase
        .from('characters')
        .insert({
          user_id: this.userId,
          name: communityChar.name,
          age: communityChar.age,
          sex: communityChar.sex,
          personality: communityChar.personality,
          appearance: communityChar.appearance,
          background: communityChar.background,
          avatar: communityChar.avatar,
          color: communityChar.color,
          chat_examples: communityChar.chat_examples,
          tags: communityChar.tags,
          avatar_image_url: communityChar.avatar_image_url,
          avatar_image_filename: communityChar.avatar_image_filename,
          uses_custom_image: communityChar.uses_custom_image,
          original_community_id: charId
        })
        .select()
        .single();
      
      if (createError) throw createError;
      
      return { ...newChar, message: 'Character imported successfully' };
    }

    // Import scene from community
    if (endpoint.match(/\/api\/community\/scenes\/([^/]+)\/import/) && method === 'POST') {
      const sceneId = endpoint.match(/\/api\/community\/scenes\/([^/]+)\/import/)[1];
      
      // Get scene from community
      const { data: communityScene, error: fetchError } = await supabase
        .from('community_scenes')
        .select('*')
        .eq('id', sceneId)
        .single();
      
      if (fetchError) throw fetchError;

      // Create in user's scenarios table
      const { data: newScene, error: createError } = await supabase
        .from('scenarios')
        .insert({
          user_id: this.userId,
          name: communityScene.name,
          description: communityScene.description,
          initial_message: communityScene.initial_message,
          atmosphere: communityScene.atmosphere,
          background_image_url: communityScene.background_image_url,
          background_image_filename: communityScene.background_image_filename,
          uses_custom_background: communityScene.uses_custom_background,
          original_community_id: sceneId
        })
        .select()
        .single();
      
      if (createError) throw createError;
      
      return { ...newScene, message: 'Scene imported successfully' };
    }

    // Default: return empty or throw error
    console.warn('[UserData] Unimplemented endpoint:', endpoint);
    return {};
  }

  /**
   * Handle community requests using Supabase directly
   */
  async handleCommunityRequest(endpoint, options) {
    const method = options.method || 'GET';
    console.log('[UnifiedAPI Community]', method, endpoint);

    // Parse endpoint to determine action
    if (endpoint.startsWith('/api/community/characters')) {
      // GET /api/community/tags
      if (endpoint === '/api/community/tags') {
        // Return empty tags for now
        return { tags: [] };
      }

      // GET /api/community/favorites
      if (endpoint === '/api/community/favorites') {
        if (!this.userId) {
          return { favorites: [] };
        }
        const { data, error } = await supabase
          .from('character_favorites')
          .select('*')
          .eq('user_id', this.userId);
        
        if (error) {
          console.warn('[Community] Favorites query error:', error);
          return { favorites: [] };
        }
        return { favorites: data || [] };
      }

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
          // Manually increment view_count since RPC might not exist
          const { data: currentChar } = await supabase
            .from('community_characters')
            .select('view_count')
            .eq('id', charId)
            .single();
          
          if (currentChar) {
            await supabase
              .from('community_characters')
              .update({ view_count: (currentChar.view_count || 0) + 1 })
              .eq('id', charId);
          }
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
          // Manually increment view_count since RPC might not exist
          const { data: currentScene } = await supabase
            .from('community_scenes')
            .select('view_count')
            .eq('id', sceneId)
            .single();
          
          if (currentScene) {
            await supabase
              .from('community_scenes')
              .update({ view_count: (currentScene.view_count || 0) + 1 })
              .eq('id', sceneId);
          }
          return { success: true };
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
