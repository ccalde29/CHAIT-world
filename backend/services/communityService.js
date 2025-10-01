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
  async incrementViewCount(characterId) {
    try {
      const { error } = await this.supabase
        .rpc('increment_character_views', { character_id: characterId });

      if (error) throw error;
      return true;
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
  async importCharacter(userId, originalCharacterId) {
    try {
      // Get the original character
      const { data: originalChar, error: fetchError } = await this.supabase
        .from('characters')
        .select('*')
        .eq('id', originalCharacterId)
        .eq('is_public', true)
        .single();

      if (fetchError) throw fetchError;
      if (!originalChar) throw new Error('Character not found or not public');

      // Create a copy for the user
      const { data: newChar, error: createError } = await this.supabase
        .from('characters')
        .insert({
          user_id: userId,
          name: originalChar.name,
          age: originalChar.age,
          sex: originalChar.sex,
          personality: originalChar.personality,
          appearance: originalChar.appearance,
          background: originalChar.background,
          avatar: originalChar.avatar,
          color: originalChar.color,
          chat_examples: originalChar.chat_examples,
          relationships: [], // Don't copy relationships
          tags: originalChar.tags,
          temperature: originalChar.temperature,
          max_tokens: originalChar.max_tokens,
          context_window: originalChar.context_window,
          memory_enabled: originalChar.memory_enabled,
          avatar_image_url: originalChar.avatar_image_url,
          avatar_image_filename: originalChar.avatar_image_filename,
          uses_custom_image: originalChar.uses_custom_image,
          is_public: false // Imported characters are private by default
        })
        .select()
        .single();

      if (createError) throw createError;

      // Track the import
      await this.supabase
        .from('character_imports')
        .insert({
          original_character_id: originalCharacterId,
          imported_character_id: newChar.id,
          imported_by_user_id: userId
        });

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

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding to favorites:', error);
      throw error;
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

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error removing from favorites:', error);
      throw error;
    }
  }

  /**
   * Get user's favorited characters
   */
  async getUserFavorites(userId, limit = 50) {
    try {
      const { data, error } = await this.supabase
        .from('character_favorites')
        .select(`
          character_id,
          created_at,
          characters (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data.map(fav => ({
        ...fav.characters,
        favorited_at: fav.created_at
      }));
    } catch (error) {
      console.error('Error getting user favorites:', error);
      throw error;
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
  async publishCharacter(userId, characterId) {
    try {
      // Validate character before publishing
      const { data: validation, error: validationError } = await this.supabase
        .rpc('validate_character_for_publish', { char_id: characterId });

      if (validationError) throw validationError;

      if (!validation[0].is_valid) {
        throw new Error(validation[0].error_message);
      }

      // Update character to public
      const { data, error } = await this.supabase
        .from('characters')
        .update({
          is_public: true,
          moderation_status: 'approved', // Auto-approve for now
          published_at: new Date().toISOString()
        })
        .eq('id', characterId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
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
      const { data, error } = await this.supabase
        .from('characters')
        .update({
          is_public: false,
          moderation_status: 'pending'
        })
        .eq('id', characterId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
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
}

module.exports = CommunityService;