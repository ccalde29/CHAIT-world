// ============================================================================
// Community Service
// Handles community hub operations (browse, import, favorites, etc.)
// backend/services/communityService.js
// ============================================================================

class CommunityService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
  }

  // ============================================================================
  // BROWSE COMMUNITY CHARACTERS
  // ============================================================================

  /**
   * Get community characters with filters and sorting
   */
  async getCommunityCharacters(options = {}) {
    try {
      const {
        limit = 20,
        offset = 0,
        sortBy = 'recent', // recent, popular, trending
        tags = [],
        searchQuery = ''
      } = options;

      let query = this.supabase
        .from('community_characters') // Using the view we created
        .select('*');

      // Apply tag filters
      if (tags.length > 0) {
        query = query.contains('tags', tags);
      }

      // Apply search
      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,personality.ilike.%${searchQuery}%`);
      }

      // Apply sorting
      switch (sortBy) {
        case 'popular':
          query = query.order('import_count', { ascending: false });
          break;
        case 'trending':
          // Combination of recent + popular
          query = query.order('view_count', { ascending: false })
                      .order('published_at', { ascending: false });
          break;
        case 'recent':
        default:
          query = query.order('published_at', { ascending: false });
          break;
      }

      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        characters: data || [],
        total: count || 0,
        hasMore: (offset + limit) < (count || 0)
      };
    } catch (error) {
      console.error('Error getting community characters:', error);
      throw error;
    }
  }

  /**
   * Get popular tags from community
   */
  async getPopularTags(limit = 20) {
    try {
      const { data, error } = await this.supabase
        .rpc('get_popular_tags', { tag_limit: limit });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting popular tags:', error);
      throw error;
    }
  }

  /**
   * Increment view count when character is viewed
   */
  async incrementViewCount(communityCharacterId) {
    try {
      // Update view count on community_characters table
      const { data: character } = await this.supabase
        .from('community_characters')
        .select('view_count')
        .eq('id', communityCharacterId)
        .single();

      if (character) {
        await this.supabase
          .from('community_characters')
          .update({ view_count: (character.view_count || 0) + 1 })
          .eq('id', communityCharacterId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error incrementing view count:', error);
      return false;
    }
  }

  // ============================================================================
  // IMPORT CHARACTERS
  // ============================================================================

  /**
   * Import a community character to user's collection
   */
  async importCharacter(userId, communityCharacterId) {
    try {
      // Get the community character
      const { data: communityChar, error: fetchError } = await this.supabase
        .from('community_characters')
        .select('*')
        .eq('id', communityCharacterId)
        .single();

      if (fetchError) throw fetchError;
      if (!communityChar) throw new Error('Community character not found');

      // Handle locked content - hidden fields are already NULL in community table
      const hiddenFields = communityChar.is_locked && communityChar.hidden_fields
        ? communityChar.hidden_fields
        : [];

      const characterData = {
        user_id: userId,
        name: communityChar.name,
        age: communityChar.age,
        sex: communityChar.sex,
        // Provide default values for hidden/null fields to avoid NOT NULL constraint violations
        // Using longer text to satisfy database length constraints
        personality: communityChar.personality || 'This character\'s personality details have been hidden by the creator. You can edit this character to add your own personality description.',
        appearance: communityChar.appearance || 'This character\'s appearance details have been hidden by the creator. You can edit this character to add your own appearance description.',
        background: communityChar.background || 'This character\'s background details have been hidden by the creator. You can edit this character to add your own background story.',
        avatar: communityChar.avatar,
        color: communityChar.color,
        chat_examples: communityChar.chat_examples,
        relationships: [], // Don't copy relationships
        tags: communityChar.tags,
        temperature: communityChar.temperature,
        max_tokens: communityChar.max_tokens,
        context_window: communityChar.context_window,
        memory_enabled: communityChar.memory_enabled,
        avatar_image_url: communityChar.avatar_image_url,
        avatar_image_filename: communityChar.avatar_image_filename,
        uses_custom_image: communityChar.uses_custom_image,
        is_public: false, // Imported characters are private by default
        is_locked: communityChar.is_locked || false, // Mark as locked if source was locked
        hidden_fields: hiddenFields // Store which fields were hidden
      };

      // Create a copy for the user
      const { data: newChar, error: createError } = await this.supabase
        .from('characters')
        .insert(characterData)
        .select()
        .single();

      if (createError) throw createError;

      // Increment import count on community character
      await this.supabase
        .from('community_characters')
        .update({
          import_count: (communityChar.import_count || 0) + 1
        })
        .eq('id', communityCharacterId);

      // Track the import (optional - won't fail if table doesn't exist)
      try {
        await this.supabase
          .from('character_imports')
          .insert({
            original_character_id: communityChar.original_character_id,
            imported_character_id: newChar.id,
            imported_by_user_id: userId
          });
      } catch (importTrackError) {
        // Non-critical error - just log it
        console.warn('Could not track import in character_imports table:', importTrackError.message);
      }

      return newChar;
    } catch (error) {
      console.error('Error importing character:', error);
      throw error;
    }
  }

  // ============================================================================
  // FAVORITES
  // ============================================================================

  /**
   * Add character to favorites
   */
  async addToFavorites(userId, characterId) {
    try {
      const { data, error } = await this.supabase
        .from('character_favorites')
        .insert({
          user_id: userId,
          character_id: characterId
        })
        .select()
        .single();

      // If table doesn't exist, fail gracefully
      if (error && error.code === 'PGRST200') {
        console.warn('character_favorites table not found, favorites feature disabled');
        return null;
      }

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding to favorites:', error);
      // Return null instead of throwing to prevent blocking the UI
      return null;
    }
  }

  /**
   * Remove character from favorites
   */
  async removeFromFavorites(userId, characterId) {
    try {
      const { error } = await this.supabase
        .from('character_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('character_id', characterId);

      // If table doesn't exist, fail gracefully
      if (error && error.code === 'PGRST200') {
        console.warn('character_favorites table not found, favorites feature disabled');
        return true;
      }

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error removing from favorites:', error);
      // Return true to prevent blocking the UI
      return true;
    }
  }

  /**
   * Get user's favorited characters
   */
  async getUserFavorites(userId, limit = 50) {
    try {
      // If userId is undefined or invalid, return empty array
      if (!userId || userId === 'undefined' || userId === 'anonymous') {
        return [];
      }

      // Check if character_favorites table exists
      const { data, error } = await this.supabase
        .from('character_favorites')
        .select('character_id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      // If table doesn't exist, return empty array (graceful degradation)
      if (error && (error.code === 'PGRST200' || error.code === '22P02')) {
        console.warn('character_favorites table not found or invalid UUID, returning empty favorites');
        return [];
      }

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting user favorites:', error);
      // Return empty array instead of throwing to prevent blocking the UI
      return [];
    }
  }

  /**
   * Check if character is favorited by user
   */
  async isFavorited(userId, characterId) {
    try {
      const { data, error } = await this.supabase
        .from('character_favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('character_id', characterId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return !!data;
    } catch (error) {
      console.error('Error checking favorite status:', error);
      return false;
    }
  }

  // ============================================================================
  // PUBLISHING
  // ============================================================================

  /**
   * Publish a character to the community
   */
  async publishCharacter(userId, characterId, options = {}) {
    try {
      // Get the character from user's characters table
      const { data: character, error: fetchError } = await this.supabase
        .from('characters')
        .select('*')
        .eq('id', characterId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !character) {
        throw new Error('Character not found or you are not the owner');
      }

      // Handle content locking options
      const { isLocked = false, hiddenFields = [] } = options;

      // Create community copy with hidden fields set to NULL
      const communityData = {
        original_character_id: characterId,
        creator_user_id: userId,
        name: character.name,
        age: character.age,
        sex: character.sex,
        personality: hiddenFields.includes('personality') ? null : character.personality,
        appearance: hiddenFields.includes('appearance') ? null : character.appearance,
        background: hiddenFields.includes('background') ? null : character.background,
        avatar: character.avatar,
        color: character.color,
        chat_examples: character.chat_examples,
        tags: character.tags,
        temperature: character.temperature,
        max_tokens: character.max_tokens,
        context_window: character.context_window,
        memory_enabled: character.memory_enabled,
        avatar_image_url: character.avatar_image_url,
        avatar_image_filename: character.avatar_image_filename,
        uses_custom_image: character.uses_custom_image,
        is_locked: isLocked,
        hidden_fields: hiddenFields,
        moderation_status: 'approved'
      };

      // Insert into community_characters table
      const { data, error } = await this.supabase
        .from('community_characters')
        .insert(communityData)
        .select()
        .single();

      if (error) {
        console.error('Error inserting into community_characters:', error);
        throw error;
      }

      console.log('Character published to community:', data.id);
      return data;
    } catch (error) {
      console.error('Error publishing character:', error);
      throw error;
    }
  }

  /**
   * Unpublish a character from the community
   */
  async unpublishCharacter(userId, characterId) {
    try {
      // Delete the community copy
      const { error } = await this.supabase
        .from('community_characters')
        .delete()
        .eq('original_character_id', characterId)
        .eq('creator_user_id', userId);

      if (error) throw error;

      return { message: 'Character unpublished from community', characterId };
    } catch (error) {
      console.error('Error unpublishing character:', error);
      throw error;
    }
  }

  // ============================================================================
  // COMMENTS (Optional feature)
  // ============================================================================

  /**
   * Add comment to a character
   */
  async addComment(userId, characterId, commentText) {
    try {
      const { data, error } = await this.supabase
        .from('character_comments')
        .insert({
          user_id: userId,
          character_id: characterId,
          comment: commentText
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }

  /**
   * Get comments for a character
   */
  async getComments(characterId, limit = 20) {
    try {
      const { data, error } = await this.supabase
        .from('character_comments')
        .select('*')
        .eq('character_id', characterId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting comments:', error);
      throw error;
    }
  }

  // ============================================================================
  // REPORTS (Moderation)
  // ============================================================================

  /**
   * Report a character for inappropriate content
   */
  async reportCharacter(userId, characterId, reason, details = '') {
    try {
      const { data, error } = await this.supabase
        .from('character_reports')
        .insert({
          character_id: characterId,
          reporter_user_id: userId,
          reason: reason,
          details: details
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error reporting character:', error);
      throw error;
    }
  }

  // ============================================================================
  // SCENE/SCENARIO OPERATIONS
  // ============================================================================

  /**
   * Get community scenes with filters and sorting
   */
  async getCommunityScenes(options = {}) {
    try {
      const {
        limit = 20,
        offset = 0,
        sortBy = 'recent',
        searchQuery = ''
      } = options;

      let query = this.supabase
        .from('community_scenes') // Using the view, just like community_characters
        .select('*', { count: 'exact' });

      // Apply search
      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      // Apply sorting
      switch (sortBy) {
        case 'popular':
          query = query.order('import_count', { ascending: false });
          break;
        case 'recent':
        default:
          query = query.order('published_at', { ascending: false });
          break;
      }

      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('Supabase error fetching community scenes:', error);
        throw error;
      }

      console.log(`Community scenes fetched: ${data?.length || 0} scenes, total: ${count}`);

      return {
        scenes: data || [],
        total: count || 0,
        hasMore: (offset + limit) < (count || 0)
      };
    } catch (error) {
      console.error('Error getting community scenes:', error);
      throw error;
    }
  }

  /**
   * Publish scene to community
   */
  async publishScene(userId, sceneId, options = {}) {
    try {
      // Get the scene from user's scenarios table
      const { data: scene, error: fetchError } = await this.supabase
        .from('scenarios')
        .select('*')
        .eq('id', sceneId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !scene) {
        throw new Error('Scene not found or you are not the owner');
      }

      // Handle content locking options
      const { isLocked = false, hiddenFields = [] } = options;

      // Create community copy with hidden fields set to NULL
      const communityData = {
        original_scenario_id: sceneId,
        creator_user_id: userId,
        name: scene.name,
        description: hiddenFields.includes('description') ? null : scene.description,
        initial_message: scene.initial_message,
        atmosphere: scene.atmosphere,
        background_image_url: scene.background_image_url,
        background_image_filename: scene.background_image_filename,
        uses_custom_background: scene.uses_custom_background,
        is_locked: isLocked,
        hidden_fields: hiddenFields
      };

      // Insert into community_scenes table
      const { data, error } = await this.supabase
        .from('community_scenes')
        .insert(communityData)
        .select()
        .single();

      if (error) {
        console.error('Error inserting into community_scenes:', error);
        throw error;
      }

      console.log('Scene published to community:', data.id);
      return data;
    } catch (error) {
      console.error('Error publishing scene:', error);
      throw error;
    }
  }

  /**
   * Unpublish scene from community
   */
  async unpublishScene(userId, sceneId) {
    try {
      // Delete the community copy
      const { error } = await this.supabase
        .from('community_scenes')
        .delete()
        .eq('original_scenario_id', sceneId)
        .eq('creator_user_id', userId);

      if (error) throw error;

      return { message: 'Scene unpublished from community', sceneId };
    } catch (error) {
      console.error('Error unpublishing scene:', error);
      throw error;
    }
  }

  /**
   * Import a community scene
   */
  async importScene(userId, communitySceneId) {
    try {
      // Get the community scene
      const { data: communityScene, error: fetchError } = await this.supabase
        .from('community_scenes')
        .select('*')
        .eq('id', communitySceneId)
        .single();

      if (fetchError || !communityScene) {
        throw new Error('Community scene not found');
      }

      // Handle locked content - hidden fields are already NULL in community table
      const hiddenFields = communityScene.is_locked && communityScene.hidden_fields
        ? communityScene.hidden_fields
        : [];

      const sceneData = {
        user_id: userId,
        name: communityScene.name,
        // Provide default value for hidden/null fields to avoid NOT NULL constraint violations
        description: communityScene.description || 'This scene\'s description has been hidden by the creator. You can edit this scene to add your own description.',
        initial_message: communityScene.initial_message,
        atmosphere: communityScene.atmosphere,
        background_image_url: communityScene.background_image_url,
        background_image_filename: communityScene.background_image_filename,
        uses_custom_background: communityScene.uses_custom_background,
        is_public: false,
        is_locked: communityScene.is_locked || false, // Mark as locked if source was locked
        hidden_fields: hiddenFields // Store which fields were hidden
      };

      // Create a copy for the user
      const { data: newScene, error: insertError } = await this.supabase
        .from('scenarios')
        .insert(sceneData)
        .select()
        .single();

      if (insertError) throw insertError;

      // Increment import count on community scene
      await this.supabase
        .from('community_scenes')
        .update({
          import_count: (communityScene.import_count || 0) + 1
        })
        .eq('id', communitySceneId);

      return newScene;
    } catch (error) {
      console.error('Error importing scene:', error);
      throw error;
    }
  }

  /**
   * Increment scene view count
   */
  async incrementSceneViewCount(communitySceneId) {
    try {
      // Update view count on community_scenes table
      const { data: scene } = await this.supabase
        .from('community_scenes')
        .select('view_count')
        .eq('id', communitySceneId)
        .single();

      if (scene) {
        await this.supabase
          .from('community_scenes')
          .update({ view_count: (scene.view_count || 0) + 1 })
          .eq('id', communitySceneId);
      }
    } catch (error) {
      console.error('Error incrementing scene view count:', error);
    }
  }
}

module.exports = CommunityService;