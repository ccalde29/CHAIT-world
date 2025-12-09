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
      // Get comments (use updated_at for ordering if created_at doesn't exist yet)
      const { data: comments, error } = await this.supabase
        .from('character_comments')
        .select('id, character_id, user_id, comment, updated_at')
        .eq('character_id', characterId)
        .eq('is_deleted', false)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      if (!comments || comments.length === 0) {
        return [];
      }

      // Fetch user info from auth.users
      const { data: users, error: userError } = await this.supabase.auth.admin.listUsers();

      if (userError) {
        console.warn('Could not fetch user info:', userError);
        // Return comments without user info
        return comments.map(comment => ({
          ...comment,
          username: 'Anonymous',
          display_name: 'Anonymous'
        }));
      }

      // Create a map of user_id -> user email
      const userMap = new Map();
      users.users.forEach(user => {
        const username = user.email?.split('@')[0] || 'Anonymous';
        userMap.set(user.id, {
          username: username,
          display_name: user.user_metadata?.display_name || username
        });
      });

      // Format the response to include user info
      const formattedData = comments.map(comment => ({
        id: comment.id,
        character_id: comment.character_id,
        user_id: comment.user_id,
        comment: comment.comment,
        created_at: comment.created_at || comment.updated_at, // Fallback to updated_at if created_at missing
        updated_at: comment.updated_at,
        username: userMap.get(comment.user_id)?.username || 'Anonymous',
        display_name: userMap.get(comment.user_id)?.display_name || 'Anonymous'
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

      // Check if character exists in community (is published and approved)
      const { data: communityCharacter, error: characterError } = await this.supabase
        .from('community_characters')
        .select('id')
        .eq('id', characterId)
        .single();

      if (characterError || !communityCharacter) {
        throw new Error('Character not found in community or not available for comments');
      }

      // Insert the comment
      const { data, error } = await this.supabase
        .from('character_comments')
        .insert({
          user_id: userId,
          character_id: characterId,
          comment: comment.trim()
        })
        .select('id, character_id, user_id, comment, updated_at')
        .single();

      if (error) throw error;

      // Get user info
      const { data: { user } } = await this.supabase.auth.admin.getUserById(userId);

      const username = user?.email?.split('@')[0] || 'Anonymous';
      const display_name = user?.user_metadata?.display_name || username;

      // Format the response
      return {
        id: data.id,
        character_id: data.character_id,
        user_id: data.user_id,
        comment: data.comment,
        created_at: data.created_at || data.updated_at, // Fallback to updated_at if created_at missing
        updated_at: data.updated_at,
        username: username,
        display_name: display_name
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
        .select('id, character_id, user_id, comment, updated_at')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Comment not found or you do not have permission to edit it');
        }
        throw error;
      }

      // Get user info
      const { data: { user } } = await this.supabase.auth.admin.getUserById(userId);

      const username = user?.email?.split('@')[0] || 'Anonymous';
      const display_name = user?.user_metadata?.display_name || username;

      // Format the response
      return {
        id: data.id,
        character_id: data.character_id,
        user_id: data.user_id,
        comment: data.comment,
        created_at: data.created_at || data.updated_at, // Fallback to updated_at if created_at missing
        updated_at: data.updated_at,
        username: username,
        display_name: display_name
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
