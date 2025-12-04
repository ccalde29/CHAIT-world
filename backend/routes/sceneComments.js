/**
 * Scene Comment Routes
 * API endpoints for commenting on published scenes
 */

const express = require('express');
const SceneCommentService = require('../services/SceneCommentService');

module.exports = (supabase) => {
  const router = express.Router();
  const commentService = new SceneCommentService(supabase);

  /**
   * Get all comments for a scene
   * GET /api/scene-comments/:sceneId
   */
  router.get('/:sceneId', async (req, res) => {
    try {
      const comments = await commentService.getSceneComments(req.params.sceneId);
      res.json(comments);
    } catch (error) {
      console.error('Error getting scene comments:', error);
      res.status(500).json({ error: 'Failed to get comments' });
    }
  });

  /**
   * Get comment count for a scene
   * GET /api/scene-comments/:sceneId/count
   */
  router.get('/:sceneId/count', async (req, res) => {
    try {
      const count = await commentService.getSceneCommentCount(req.params.sceneId);
      res.json({ count });
    } catch (error) {
      console.error('Error getting comment count:', error);
      res.status(500).json({ error: 'Failed to get comment count' });
    }
  });

  /**
   * Add a comment to a scene
   * POST /api/scene-comments/:sceneId
   * Body: { comment: string }
   */
  router.post('/:sceneId', async (req, res) => {
    try {
      const { comment } = req.body;

      if (!comment) {
        return res.status(400).json({ error: 'Comment is required' });
      }

      const newComment = await commentService.addSceneComment(
        req.userId,
        req.params.sceneId,
        comment
      );
      res.status(201).json(newComment);
    } catch (error) {
      console.error('Error adding scene comment:', error);

      if (error.message === 'Scene not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === 'Cannot comment on unpublished scenes') {
        return res.status(403).json({ error: error.message });
      }
      if (error.message.includes('characters')) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: 'Failed to add comment' });
    }
  });

  /**
   * Update a comment
   * PUT /api/scene-comments/comment/:commentId
   * Body: { comment: string }
   */
  router.put('/comment/:commentId', async (req, res) => {
    try {
      const { comment } = req.body;

      if (!comment) {
        return res.status(400).json({ error: 'Comment is required' });
      }

      const updatedComment = await commentService.updateSceneComment(
        req.userId,
        req.params.commentId,
        comment
      );
      res.json(updatedComment);
    } catch (error) {
      console.error('Error updating scene comment:', error);

      if (error.message.includes('not found') || error.message.includes('permission')) {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('characters')) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: 'Failed to update comment' });
    }
  });

  /**
   * Delete a comment
   * DELETE /api/scene-comments/comment/:commentId
   */
  router.delete('/comment/:commentId', async (req, res) => {
    try {
      const result = await commentService.deleteSceneComment(
        req.userId,
        req.params.commentId
      );
      res.json(result);
    } catch (error) {
      console.error('Error deleting scene comment:', error);
      res.status(500).json({ error: 'Failed to delete comment' });
    }
  });

  return router;
};
