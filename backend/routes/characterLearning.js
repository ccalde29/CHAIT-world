/**
 * Character Learning Routes
 * API endpoints for character learning patterns and interactions
 */

const express = require('express');
const CharacterLearningService = require('../services/CharacterLearningService');

module.exports = (db) => {
  const router = express.Router();
  const learningService = new CharacterLearningService(db);

  /**
   * Get learning data for a specific character
   * GET /api/learning/characters/:characterId
   */
  router.get('/characters/:characterId', async (req, res) => {
    try {
      const data = await learningService.getCharacterLearning(
        req.userId,
        req.params.characterId
      );
      res.json(data);
    } catch (error) {
      console.error('Error getting character learning:', error);
      res.status(500).json({ error: 'Failed to get learning data' });
    }
  });

  /**
   * Record an interaction with a character
   * POST /api/learning/characters/:characterId/interaction
   */
  router.post('/characters/:characterId/interaction', async (req, res) => {
    try {
      const data = await learningService.recordInteraction(
        req.userId,
        req.params.characterId
      );
      res.json(data);
    } catch (error) {
      console.error('Error recording interaction:', error);
      res.status(500).json({ error: 'Failed to record interaction' });
    }
  });

  /**
   * Add a topic that was discussed
   * POST /api/learning/characters/:characterId/topics
   * Body: { topic: string, context?: string }
   */
  router.post('/characters/:characterId/topics', async (req, res) => {
    try {
      const { topic, context } = req.body;

      if (!topic) {
        return res.status(400).json({ error: 'Topic is required' });
      }

      const data = await learningService.addTopicDiscussed(
        req.userId,
        req.params.characterId,
        topic,
        context
      );
      res.json(data);
    } catch (error) {
      console.error('Error adding topic:', error);
      res.status(500).json({ error: 'Failed to add topic' });
    }
  });

  /**
   * Record an emotional pattern
   * POST /api/learning/characters/:characterId/emotions
   * Body: { emotion: string, intensity?: number (0-1) }
   */
  router.post('/characters/:characterId/emotions', async (req, res) => {
    try {
      const { emotion, intensity = 0.5 } = req.body;

      if (!emotion) {
        return res.status(400).json({ error: 'Emotion is required' });
      }

      if (intensity < 0 || intensity > 1) {
        return res.status(400).json({ error: 'Intensity must be between 0 and 1' });
      }

      const data = await learningService.recordEmotionalPattern(
        req.userId,
        req.params.characterId,
        emotion,
        intensity
      );
      res.json(data);
    } catch (error) {
      console.error('Error recording emotion:', error);
      res.status(500).json({ error: 'Failed to record emotional pattern' });
    }
  });

  /**
   * Add a learning insight
   * POST /api/learning/characters/:characterId/insights
   * Body: { insight: string, category?: string }
   */
  router.post('/characters/:characterId/insights', async (req, res) => {
    try {
      const { insight, category = 'general' } = req.body;

      if (!insight) {
        return res.status(400).json({ error: 'Insight is required' });
      }

      const data = await learningService.addLearningInsight(
        req.userId,
        req.params.characterId,
        insight,
        category
      );
      res.json(data);
    } catch (error) {
      console.error('Error adding insight:', error);
      res.status(500).json({ error: 'Failed to add learning insight' });
    }
  });

  /**
   * Update response quality rating
   * POST /api/learning/characters/:characterId/quality
   * Body: { quality: number (0-1) }
   */
  router.post('/characters/:characterId/quality', async (req, res) => {
    try {
      const { quality } = req.body;

      if (quality === undefined || quality < 0 || quality > 1) {
        return res.status(400).json({ error: 'Quality must be between 0 and 1' });
      }

      const data = await learningService.updateResponseQuality(
        req.userId,
        req.params.characterId,
        quality
      );
      res.json(data);
    } catch (error) {
      console.error('Error updating quality:', error);
      res.status(500).json({ error: 'Failed to update response quality' });
    }
  });

  /**
   * Get learning overview for all characters
   * GET /api/learning/overview
   */
  router.get('/overview', async (req, res) => {
    try {
      const data = await learningService.getUserLearningOverview(req.userId);
      res.json(data);
    } catch (error) {
      console.error('Error getting learning overview:', error);
      res.status(500).json({ error: 'Failed to get learning overview' });
    }
  });

  /**
   * Delete learning data for a character
   * DELETE /api/learning/characters/:characterId
   */
  router.delete('/characters/:characterId', async (req, res) => {
    try {
      const data = await learningService.deleteCharacterLearning(
        req.userId,
        req.params.characterId
      );
      res.json(data);
    } catch (error) {
      console.error('Error deleting learning data:', error);
      res.status(500).json({ error: 'Failed to delete learning data' });
    }
  });

  return router;
};
