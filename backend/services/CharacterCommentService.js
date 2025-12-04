/**
 * Character Comment Service
 * Handles comments on published characters in the Community Hub
 */

class CharacterCommentService {
  constructor(supabase) {
    this.supabase = supabase;
  }

  /**
   * Get all comments for a character
   * @param {string} characterId - The character ID
   * @returns {Promise<Array>} Array of comments with user info
   */
  async getCharacterComments(characterId) {
    try {
      const { data, error } = await this.supabase
        .from('character_comments')
        .select(`
          id,
          character_id,
          user_id,
          comment,
          created_at,
          updated_at,
          profiles:user_id (
            username,
            display_name
          )
        `)
        .eq('character_id', characterId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Format the response to include user info at the top level
      const formattedData = (data || []).map(comment => ({
        id: comment.id,
        character_id: comment.character_id,
        user_id: comment.user_id,
        comment: comment.comment,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        username: comment.profiles?.username || 'Anonymous',
        display_name: comment.profiles?.display_name || comment.profiles?.username || 'Anonymous'
      }));

      return formattedData;
    } catch (error) {
      console.error('Error getting character comments:', error);
      throw error;
    }
  }

  /**
   * Add a comment to a character
   * @param {string} userId - The user ID
   * @param {string} characterId - The character ID
   * @param {string} comment - The comment text
   * @returns {Promise<Object>} The created comment
   */
  async addCharacterComment(userId, characterId, comment) {
    try {
      // Validate comment length
      if (!comment || comment.trim().length === 0) {
        throw new Error('Comment cannot be empty');
      }
      if (comment.length > 1000) {
        throw new Error('Comment must be 1000 characters or less');
      }

      // Check if character exists and is published
      const { data: character, error: characterError } = await this.supabase
        .from('characters')
        .select('id, is_published')
        .eq('id', characterId)
        .single();

      if (characterError) {
        if (characterError.code === 'PGRST116') {
          throw new Error('Character not found');
        }
        throw characterError;
      }

      if (!character.is_published) {
        throw new Error('Cannot comment on unpublished characters');
      }

      // Insert the comment
      const { data, error } = await this.supabase
        .from('character_comments')
        .insert({
          user_id: userId,
          character_id: characterId,
          comment: comment.trim()
        })
        .select(`
          id,
          character_id,
          user_id,
          comment,
          created_at,
          updated_at,
          profiles:user_id (
            username,
            display_name
          )
        `)
        .single();

      if (error) throw error;

      // Format the response
      return {
        id: data.id,
        character_id: data.character_id,
        user_id: data.user_id,
        comment: data.comment,
        created_at: data.created_at,
        updated_at: data.updated_at,
        username: data.profiles?.username || 'Anonymous',
        display_name: data.profiles?.display_name || data.profiles?.username || 'Anonymous'
      };
    } catch (error) {
      console.error('Error adding character comment:', error);
      throw error;
    }
  }

  /**
   * Update a comment (only by the comment owner)
   * @param {string} userId - The user ID
   * @param {string} commentId - The comment ID
   * @param {string} newComment - The updated comment text
   * @returns {Promise<Object>} The updated comment
   */
  async updateCharacterComment(userId, commentId, newComment) {
    try {
      // Validate comment length
      if (!newComment || newComment.trim().length === 0) {
        throw new Error('Comment cannot be empty');
      }
      if (newComment.length > 1000) {
        throw new Error('Comment must be 1000 characters or less');
      }

      // Update the comment (RLS policy ensures user owns it)
      const { data, error } = await this.supabase
        .from('character_comments')
        .update({
          comment: newComment.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId)
        .eq('user_id', userId)
        .select(`
          id,
          character_id,
          user_id,
          comment,
          created_at,
          updated_at,
          profiles:user_id (
            username,
            display_name
          )
        `)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Comment not found or you do not have permission to edit it');
        }
        throw error;
      }

      // Format the response
      return {
        id: data.id,
        character_id: data.character_id,
        user_id: data.user_id,
        comment: data.comment,
        created_at: data.created_at,
        updated_at: data.updated_at,
        username: data.profiles?.username || 'Anonymous',
        display_name: data.profiles?.display_name || data.profiles?.username || 'Anonymous'
      };
    } catch (error) {
      console.error('Error updating character comment:', error);
      throw error;
    }
  }

  /**
   * Soft delete a comment (only by the comment owner)
   * @param {string} userId - The user ID
   * @param {string} commentId - The comment ID
   * @returns {Promise<Object>} Success message
   */
  async deleteCharacterComment(userId, commentId) {
    try {
      // Soft delete by setting is_deleted flag
      const { error } = await this.supabase
        .from('character_comments')
        .update({
          is_deleted: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId)
        .eq('user_id', userId);

      if (error) throw error;

      return { message: 'Comment deleted successfully' };
    } catch (error) {
      console.error('Error deleting character comment:', error);
      throw error;
    }
  }

  /**
   * Get comment count for a character
   * @param {string} characterId - The character ID
   * @returns {Promise<number>} Number of comments
   */
  async getCharacterCommentCount(characterId) {
    try {
      const { count, error } = await this.supabase
        .from('character_comments')
        .select('*', { count: 'exact', head: true })
        .eq('character_id', characterId)
        .eq('is_deleted', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error getting character comment count:', error);
      throw error;
    }
  }
}

module.exports = CharacterCommentService;
