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
   * Only returns approved characters
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
        .from('community_characters')
        .select('*', { count: 'exact' })
        .eq('moderation_status', 'approved');

      // Apply tag filters
      if (tags.length > 0) {
        query = query.contains('tags', tags);
      }

      // Apply search
      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,personality.ilike.%${searchQuery}%`);
      }

      // Apply sorting — use only published_at as the stable fallback; import_count/view_count
      // are optional denormalized columns that may not exist on all deployments.
      switch (sortBy) {
        case 'popular':
          query = query.order('published_at', { ascending: false });
          break;
        case 'trending':
          query = query.order('published_at', { ascending: false });
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
      // Get tags from community characters and scenes
      const { data: characters, error: charError } = await this.supabase
        .from('community_characters')
        .select('tags');

      const { data: scenes, error: sceneError } = await this.supabase
        .from('community_scenes')
        .select('tags');

      if (charError && sceneError) {
        throw charError || sceneError;
      }

      // Combine and count tags
      const tagCounts = {};
      const allTags = [
        ...((characters || []).flatMap(c => c.tags || [])),
        ...((scenes || []).flatMap(s => s.tags || []))
      ];

      allTags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });

      // Sort by count and return top tags
      const sortedTags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([tag, count]) => ({ tag, count }));

      return sortedTags;
    } catch (error) {
      console.error('Error getting popular tags:', error);
      return []; // Return empty array instead of throwing
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
   * If user has auto_approve_characters enabled, character is approved immediately
   * Otherwise, it enters pending moderation status
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

      // Check user's moderation settings
      const { data: userSettings } = await this.supabase
        .from('user_settings')
        .select('auto_approve_characters')
        .eq('user_id', userId)
        .single();

      // Determine moderation status based on user's auto-approve setting
      const moderationStatus = userSettings?.auto_approve_characters ? 'approved' : 'pending';

      // Handle content locking options
      const { isLocked = false, hiddenFields = [] } = options;

      // Upload avatar image to Supabase storage if custom image is used
      let avatarImageUrl = character.avatar_image_url;
      if (character.uses_custom_image && character.avatar_image_filename) {
        const ImageService = require('./ImageService');
        const imageService = new ImageService(this.supabase);
        const publicUrl = await imageService.uploadLocalImageToSupabase(
          character.avatar_image_filename,
          'character-avatars',
          userId
        );
        if (publicUrl) {
          avatarImageUrl = publicUrl;

        }
      }

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
        avatar_image_url: avatarImageUrl,
        avatar_image_filename: character.avatar_image_filename,
        uses_custom_image: character.uses_custom_image,
        is_locked: isLocked,
        hidden_fields: hiddenFields,
        moderation_status: moderationStatus,
        top_p: character.top_p ?? null,
        frequency_penalty: character.frequency_penalty ?? null,
        presence_penalty: character.presence_penalty ?? null,
        repetition_penalty: character.repetition_penalty ?? null,
        stop_sequences: character.stop_sequences ?? null
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

      return {
        ...data,
        requiresModeration: moderationStatus === 'pending'
      };
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
        .from('community_reports')
        .insert({
          community_character_id: characterId,
          community_scene_id: null,
          reporter_user_id: userId,
          reason: reason,
          details: details,
          report_type: 'character'
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

  /**
   * Report a scene for inappropriate content
   */
  async reportScene(userId, sceneId, reason, details = '') {
    try {
      const { data, error } = await this.supabase
        .from('community_reports')
        .insert({
          community_scene_id: sceneId,
          community_character_id: null,
          reporter_user_id: userId,
          reason: reason,
          details: details,
          report_type: 'scene'
        })
        .select()
        .single();

      if (error) {
        console.error('Error reporting scene:', error);
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Error reporting scene:', error);
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
          query = query.order('published_at', { ascending: false });
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
  async publishScene(userId, sceneId, options = {}, localScene = null) {
    try {
      // If localScene is provided, use it; otherwise try to fetch from Supabase (legacy)
      let scene = localScene;
      
      if (!scene) {
        // Try Supabase for backwards compatibility
        const { data: supabaseScene, error: fetchError } = await this.supabase
          .from('scenarios')
          .select('*')
          .eq('id', sceneId)
          .eq('user_id', userId)
          .single();

        if (fetchError || !supabaseScene) {
          throw new Error('Scene not found or you are not the owner');
        }
        scene = supabaseScene;
      }

      // Handle content locking options
      const { isLocked = false, hiddenFields = [] } = options;

      // Upload background image to Supabase storage if custom background is used
      let backgroundImageUrl = scene.background_image_url;
      if (scene.uses_custom_background && scene.background_image_filename) {
        const ImageService = require('./ImageService');
        const imageService = new ImageService(this.supabase);
        const publicUrl = await imageService.uploadLocalImageToSupabase(
          scene.background_image_filename,
          'scene-backgrounds',
          userId
        );
        if (publicUrl) {
          backgroundImageUrl = publicUrl;

        }
      }

      // Create community copy with hidden fields set to NULL
      const communityData = {
        original_scenario_id: sceneId,
        creator_user_id: userId,
        name: scene.name,
        description: hiddenFields.includes('description') ? null : scene.description,
        initial_message: scene.initial_message,
        atmosphere: scene.atmosphere,
        background_image_url: backgroundImageUrl,
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

      // Track the import
      try {
        await this.supabase
          .from('scene_imports')
          .insert({
            original_scene_id: communityScene.original_scenario_id,
            imported_scene_id: newScene.id,
            imported_by_user_id: userId
          });
      } catch (importTrackError) {
        console.warn('Could not track scene import:', importTrackError.message);
      }

      return newScene;
    } catch (error) {
      console.error('Error importing scene:', error);
      throw error;
    }
  }

  // ============================================================================
  // SCENE FAVORITES
  // ============================================================================

  async addToSceneFavorites(userId, sceneId) {
    try {
      const { data, error } = await this.supabase
        .from('scene_favorites')
        .insert({ user_id: userId, scene_id: sceneId })
        .select()
        .single();
      if (error && error.code !== '23505') throw error; // ignore duplicate
      return data;
    } catch (error) {
      console.error('Error adding scene to favorites:', error);
      return null;
    }
  }

  async removeFromSceneFavorites(userId, sceneId) {
    try {
      const { error } = await this.supabase
        .from('scene_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('scene_id', sceneId);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error removing scene from favorites:', error);
      return true;
    }
  }

  async getUserSceneFavorites(userId, limit = 50) {
    try {
      if (!userId || userId === 'undefined' || userId === 'anonymous') return [];
      const { data, error } = await this.supabase
        .from('scene_favorites')
        .select('scene_id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting user scene favorites:', error);
      return [];
    }
  }

  async isSceneFavorited(userId, sceneId) {
    try {
      const { data, error } = await this.supabase
        .from('scene_favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('scene_id', sceneId)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return !!data;
    } catch (error) {
      console.error('Error checking scene favorite status:', error);
      return false;
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