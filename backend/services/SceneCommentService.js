/**
 * Scene Comment Service
 * Handles comments on published scenes in the Community Hub
 */

class SceneCommentService {
  constructor(supabase) {
    this.supabase = supabase;
  }

  /**
   * Get all comments for a scene
   * @param {string} sceneId - The scene ID
   * @returns {Promise<Array>} Array of comments with user info
   */
  async getSceneComments(sceneId) {
    try {
      // Get comments
      const { data: comments, error } = await this.supabase
        .from('scene_comments')
        .select('id, scene_id, user_id, comment, created_at, updated_at')
        .eq('scene_id', sceneId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

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
        scene_id: comment.scene_id,
        user_id: comment.user_id,
        comment: comment.comment,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        username: userMap.get(comment.user_id)?.username || 'Anonymous',
        display_name: userMap.get(comment.user_id)?.display_name || 'Anonymous'
      }));

      return formattedData;
    } catch (error) {
      console.error('Error getting scene comments:', error);
      throw error;
    }
  }

  /**
   * Add a comment to a scene
   * @param {string} userId - The user ID
   * @param {string} sceneId - The scene ID
   * @param {string} comment - The comment text
   * @returns {Promise<Object>} The created comment
   */
  async addSceneComment(userId, sceneId, comment) {
    try {
      // Validate comment length
      if (!comment || comment.trim().length === 0) {
        throw new Error('Comment cannot be empty');
      }
      if (comment.length > 1000) {
        throw new Error('Comment must be 1000 characters or less');
      }

      // Check if scene exists in community (is published and approved)
      const { data: communityScene, error: sceneError } = await this.supabase
        .from('community_scenes')
        .select('id')
        .eq('id', sceneId)
        .single();

      if (sceneError || !communityScene) {
        throw new Error('Scene not found in community or not available for comments');
      }

      // Insert the comment
      const { data, error } = await this.supabase
        .from('scene_comments')
        .insert({
          user_id: userId,
          scene_id: sceneId,
          comment: comment.trim()
        })
        .select('id, scene_id, user_id, comment, created_at, updated_at')
        .single();

      if (error) throw error;

      // Get user info
      const { data: { user } } = await this.supabase.auth.admin.getUserById(userId);

      const username = user?.email?.split('@')[0] || 'Anonymous';
      const display_name = user?.user_metadata?.display_name || username;

      // Format the response
      return {
        id: data.id,
        scene_id: data.scene_id,
        user_id: data.user_id,
        comment: data.comment,
        created_at: data.created_at,
        updated_at: data.updated_at,
        username: username,
        display_name: display_name
      };
    } catch (error) {
      console.error('Error adding scene comment:', error);
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
  async updateSceneComment(userId, commentId, newComment) {
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
        .from('scene_comments')
        .update({
          comment: newComment.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId)
        .eq('user_id', userId)
        .select('id, scene_id, user_id, comment, created_at, updated_at')
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
        scene_id: data.scene_id,
        user_id: data.user_id,
        comment: data.comment,
        created_at: data.created_at,
        updated_at: data.updated_at,
        username: username,
        display_name: display_name
      };
    } catch (error) {
      console.error('Error updating scene comment:', error);
      throw error;
    }
  }

  /**
   * Soft delete a comment (only by the comment owner)
   * @param {string} userId - The user ID
   * @param {string} commentId - The comment ID
   * @returns {Promise<Object>} Success message
   */
  async deleteSceneComment(userId, commentId) {
    try {
      // Soft delete by setting is_deleted flag
      const { error } = await this.supabase
        .from('scene_comments')
        .update({
          is_deleted: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId)
        .eq('user_id', userId);

      if (error) throw error;

      return { message: 'Comment deleted successfully' };
    } catch (error) {
      console.error('Error deleting scene comment:', error);
      throw error;
    }
  }

  /**
   * Get comment count for a scene
   * @param {string} sceneId - The scene ID
   * @returns {Promise<number>} Number of comments
   */
  async getSceneCommentCount(sceneId) {
    try {
      const { count, error } = await this.supabase
        .from('scene_comments')
        .select('*', { count: 'exact', head: true })
        .eq('scene_id', sceneId)
        .eq('is_deleted', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error getting scene comment count:', error);
      throw error;
    }
  }
}

module.exports = SceneCommentService;
