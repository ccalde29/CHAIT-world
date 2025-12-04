/**
 * Character Learning Service
 * Handles character learning patterns, interaction tracking, and insights
 */

class CharacterLearningService {
  constructor(supabase) {
    this.supabase = supabase;
  }

  /**
   * Get learning data for a character
   */
  async getCharacterLearning(userId, characterId) {
    try {
      const { data, error } = await this.supabase
        .from('character_learning')
        .select('*')
        .eq('user_id', userId)
        .eq('character_id', characterId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        throw error;
      }

      // Return existing data or default structure
      return data || {
        character_id: characterId,
        user_id: userId,
        total_interactions: 0,
        topics_discussed: [],
        emotional_patterns: [],
        avg_response_quality: 0.5,
        learning_insights: [],
        last_interaction: null
      };
    } catch (error) {
      console.error('Error getting character learning:', error);
      throw error;
    }
  }

  /**
   * Update interaction count and last interaction time
   */
  async recordInteraction(userId, characterId) {
    try {
      // Get current data first
      const learning = await this.getCharacterLearning(userId, characterId);
      const totalInteractions = (learning.total_interactions || 0) + 1;

      const { data, error } = await this.supabase
        .from('character_learning')
        .upsert({
          user_id: userId,
          character_id: characterId,
          total_interactions: totalInteractions,
          last_interaction: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,character_id'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error recording interaction:', error);
      throw error;
    }
  }

  /**
   * Add a topic that was discussed
   */
  async addTopicDiscussed(userId, characterId, topic, context = '') {
    try {
      // Get current topics
      const learning = await this.getCharacterLearning(userId, characterId);
      const topics = learning.topics_discussed || [];

      // Check if topic already exists
      const existingTopic = topics.find(t => t.topic === topic);

      let updatedTopics;
      if (existingTopic) {
        // Increment count and update last discussed
        updatedTopics = topics.map(t =>
          t.topic === topic
            ? { ...t, count: (t.count || 1) + 1, last_discussed: new Date().toISOString(), context }
            : t
        );
      } else {
        // Add new topic
        updatedTopics = [...topics, {
          topic,
          count: 1,
          first_discussed: new Date().toISOString(),
          last_discussed: new Date().toISOString(),
          context
        }];
      }

      // Update database
      const { data, error } = await this.supabase
        .from('character_learning')
        .upsert({
          user_id: userId,
          character_id: characterId,
          topics_discussed: updatedTopics,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,character_id'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding topic:', error);
      throw error;
    }
  }

  /**
   * Record an emotional pattern (e.g., user seems happy, frustrated, excited)
   */
  async recordEmotionalPattern(userId, characterId, emotion, intensity = 0.5) {
    try {
      const learning = await this.getCharacterLearning(userId, characterId);
      const patterns = learning.emotional_patterns || [];

      // Check if emotion already exists
      const existingPattern = patterns.find(p => p.emotion === emotion);

      let updatedPatterns;
      if (existingPattern) {
        // Update average intensity and count
        const newCount = (existingPattern.count || 1) + 1;
        const newAvgIntensity = ((existingPattern.avg_intensity || 0.5) * existingPattern.count + intensity) / newCount;

        updatedPatterns = patterns.map(p =>
          p.emotion === emotion
            ? {
                ...p,
                count: newCount,
                avg_intensity: newAvgIntensity,
                last_observed: new Date().toISOString()
              }
            : p
        );
      } else {
        // Add new emotional pattern
        updatedPatterns = [...patterns, {
          emotion,
          count: 1,
          avg_intensity: intensity,
          first_observed: new Date().toISOString(),
          last_observed: new Date().toISOString()
        }];
      }

      // Update database
      const { data, error } = await this.supabase
        .from('character_learning')
        .upsert({
          user_id: userId,
          character_id: characterId,
          emotional_patterns: updatedPatterns,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,character_id'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error recording emotional pattern:', error);
      throw error;
    }
  }

  /**
   * Add a learning insight about the user
   */
  async addLearningInsight(userId, characterId, insight, category = 'general') {
    try {
      const learning = await this.getCharacterLearning(userId, characterId);
      const insights = learning.learning_insights || [];

      // Add new insight
      const newInsight = {
        insight,
        category,
        confidence: 0.5,
        discovered_at: new Date().toISOString()
      };

      const updatedInsights = [...insights, newInsight];

      // Update database
      const { data, error } = await this.supabase
        .from('character_learning')
        .upsert({
          user_id: userId,
          character_id: characterId,
          learning_insights: updatedInsights,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,character_id'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding learning insight:', error);
      throw error;
    }
  }

  /**
   * Update response quality rating
   */
  async updateResponseQuality(userId, characterId, quality) {
    try {
      const learning = await this.getCharacterLearning(userId, characterId);
      const currentQuality = learning.avg_response_quality || 0.5;
      const totalInteractions = learning.total_interactions || 1;

      // Calculate new average (weighted)
      const newAvgQuality = (currentQuality * totalInteractions + quality) / (totalInteractions + 1);

      // Update database
      const { data, error } = await this.supabase
        .from('character_learning')
        .upsert({
          user_id: userId,
          character_id: characterId,
          avg_response_quality: newAvgQuality,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,character_id'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating response quality:', error);
      throw error;
    }
  }

  /**
   * Get learning summary for all characters
   */
  async getUserLearningOverview(userId) {
    try {
      const { data, error } = await this.supabase
        .from('character_learning')
        .select('character_id, total_interactions, avg_response_quality, last_interaction')
        .eq('user_id', userId)
        .order('last_interaction', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting learning overview:', error);
      throw error;
    }
  }

  /**
   * Delete learning data for a character
   */
  async deleteCharacterLearning(userId, characterId) {
    try {
      const { error } = await this.supabase
        .from('character_learning')
        .delete()
        .eq('user_id', userId)
        .eq('character_id', characterId);

      if (error) throw error;
      return { message: 'Learning data deleted' };
    } catch (error) {
      console.error('Error deleting learning data:', error);
      throw error;
    }
  }
}

module.exports = CharacterLearningService;
