/**
 * Character Comment Routes
 * API endpoints for commenting on published characters
 */

const express = require('express');
const CharacterCommentService = require('../services/CharacterCommentService');

module.exports = (supabase) => {
  const router = express.Router();
  const commentService = new CharacterCommentService(supabase);

  /**
   * Get all comments for a character
   * GET /api/character-comments/:characterId
   */
  router.get('/:characterId', async (req, res) => {
    try {
      const comments = await commentService.getCharacterComments(req.params.characterId);
      res.json(comments);
    } catch (error) {
      console.error('Error getting character comments:', error);
      res.status(500).json({ error: 'Failed to get comments' });
    }
  });

  /**
   * Get comment count for a character
   * GET /api/character-comments/:characterId/count
   */
  router.get('/:characterId/count', async (req, res) => {
    try {
      const count = await commentService.getCharacterCommentCount(req.params.characterId);
      res.json({ count });
    } catch (error) {
      console.error('Error getting comment count:', error);
      res.status(500).json({ error: 'Failed to get comment count' });
    }
  });

  /**
   * Add a comment to a character
   * POST /api/character-comments/:characterId
   * Body: { comment: string }
   */
  router.post('/:characterId', async (req, res) => {
    try {
      const { comment } = req.body;

      if (!comment) {
        return res.status(400).json({ error: 'Comment is required' });
      }

      const newComment = await commentService.addCharacterComment(
        req.userId,
        req.params.characterId,
        comment
      );
      res.status(201).json(newComment);
    } catch (error) {
      console.error('Error adding character comment:', error);

      if (error.message === 'Character not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === 'Cannot comment on unpublished characters') {
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
   * PUT /api/character-comments/comment/:commentId
   * Body: { comment: string }
   */
  router.put('/comment/:commentId', async (req, res) => {
    try {
      const { comment } = req.body;

      if (!comment) {
        return res.status(400).json({ error: 'Comment is required' });
      }

      const updatedComment = await commentService.updateCharacterComment(
        req.userId,
        req.params.commentId,
        comment
      );
      res.json(updatedComment);
    } catch (error) {
      console.error('Error updating character comment:', error);

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
   * DELETE /api/character-comments/comment/:commentId
   */
  router.delete('/comment/:commentId', async (req, res) => {
    try {
      const result = await commentService.deleteCharacterComment(
        req.userId,
        req.params.commentId
      );
      res.json(result);
    } catch (error) {
      console.error('Error deleting character comment:', error);
      res.status(500).json({ error: 'Failed to delete comment' });
    }
  });

  return router;
};
