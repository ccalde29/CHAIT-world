// ============================================================================
// CHAIT World - Speaking Queue System (v1.5)
// Determines which characters should respond and in what order
// ============================================================================

const MoodEngine = require('./MoodEngine');

/**
 * Speaking Queue System
 * Creates natural conversation flow by intelligently selecting responders
 */
class SpeakingQueue {
  
  /**
   * Calculate response likelihood for a character
   * @param {Object} character - Character data
   * @param {Object} sessionState - Character's session state (mood, speaking history)
   * @param {Object} context - Conversation context
   * @returns {number} - Score 0-1 indicating likelihood to respond
   */
  static calculateResponseScore(character, sessionState, context) {
    let score = 0;
    
    // ========================================================================
    // 1. TEMPERATURE FACTOR (0-0.45 points)
    // Characters with higher temperature are more likely to jump in
    // ========================================================================
    const temperatureBoost = (character.temperature || 0.8) * 0.45;
    score += temperatureBoost;
    
    // ========================================================================
    // 2. MOOD INTENSITY (0-0.3 points)
    // Strong emotions make characters more likely to speak
    // Excited/annoyed = more likely, sad = less likely
    // ========================================================================
    const moodModifier = MoodEngine.getMoodSpeakingModifier(
      sessionState.current_mood || 'neutral',
      sessionState.mood_intensity || 0.5
    );
    score += Math.abs(moodModifier) * 0.3;
    
    // ========================================================================
    // 3. TOPIC RELEVANCE (0-0.3 points)
    // Has this character discussed this topic before?
    // ========================================================================
    const topicBoost = this.calculateTopicRelevance(
      character.id,
      context.userMessage,
      context.topicEngagements || []
    );
    score += topicBoost * 0.3;
    
    // ========================================================================
    // 4. RELATIONSHIP FACTOR (0-0.2 points)
    // Is this character close to who just spoke?
    // ========================================================================
    const relationshipBoost = this.calculateRelationshipBoost(
      character,
      context.lastSpeaker,
      context.relationships || []
    );
    score += relationshipBoost * 0.2;
    
    // ========================================================================
    // 5. SPEAKING FREQUENCY PENALTY (0 to -0.3 points)
    // Penalize characters who spoke very recently
    // ========================================================================
    const frequencyPenalty = this.calculateFrequencyPenalty(
      sessionState.messages_this_session || 0,
      sessionState.last_spoke_at,
      context.totalMessages || 0
    );
    score += frequencyPenalty;
    
    // ========================================================================
    // 6. DIRECT ADDRESS BONUS (+0.5 points)
    // Huge boost if user directly addressed this character
    // ========================================================================
    if (this.isDirectlyAddressed(character, context.userMessage)) {
      score += 0.5;
    }
    
    // Clamp score between 0 and 1
    return Math.max(0, Math.min(1, score));
  }
  
  /**
   * Build speaking queue - ordered list of who should respond
   * @param {Array} activeCharacters - Characters in the conversation
   * @param {Array} sessionStates - Session states for all characters
   * @param {Object} context - Conversation context
   * @returns {Object} - { primary, secondary, silent }
   */
  static buildQueue(activeCharacters, sessionStates, context) {
    // Calculate scores for all characters
    const scoredCharacters = activeCharacters.map(character => {
      const sessionState = sessionStates.find(s => s.character_id === character.id) || {
        current_mood: 'neutral',
        mood_intensity: 0.5,
        messages_this_session: 0,
        last_spoke_at: null
      };
      
      const score = this.calculateResponseScore(character, sessionState, context);
      
      return {
        character,
        sessionState,
        score
      };
    });
    
    // Sort by score (highest first)
    scoredCharacters.sort((a, b) => b.score - a.score);
    
    // Split into categories
    const primary = scoredCharacters[0]; // Highest score always responds
    const secondary = scoredCharacters
      .slice(1)
      .filter(sc => sc.score > 0.6); // Only respond if score > 0.6
    const silent = scoredCharacters
      .slice(1)
      .filter(sc => sc.score <= 0.6);
    
    return {
      primary: primary,
      secondary: secondary,
      silent: silent,
      allScores: scoredCharacters
    };
  }
  
  // ==========================================================================
  // HELPER FUNCTIONS
  // ==========================================================================
  
  /**
   * Calculate topic relevance score
   * Has this character discussed similar topics before?
   */
  static calculateTopicRelevance(characterId, message, topicEngagements) {
    if (!topicEngagements || topicEngagements.length === 0) return 0.3; // Default moderate
    
    // Extract potential keywords from message
    const keywords = this.extractKeywords(message);
    
    // Check if character has engaged with these topics
    const relevantEngagements = topicEngagements.filter(te => 
      te.character_id === characterId &&
      keywords.some(kw => te.topic_keyword.toLowerCase().includes(kw.toLowerCase()))
    );
    
    if (relevantEngagements.length === 0) return 0.2; // Low relevance
    
    // Higher engagement count = more relevant
    const totalEngagement = relevantEngagements.reduce((sum, te) => sum + te.engagement_count, 0);
    return Math.min(totalEngagement * 0.1, 1.0); // Cap at 1.0
  }
  
  /**
   * Extract keywords from message
   */
  static extractKeywords(message) {
    // Remove common words
    const commonWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
      'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'can', 'what', 'when', 'where',
      'who', 'why', 'how', 'this', 'that', 'these', 'those', 'i', 'you',
      'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its',
      'our', 'their', 'me', 'him', 'her', 'us', 'them'
    ]);
    
    const words = message
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.has(word));
    
    return words.slice(0, 5); // Top 5 keywords
  }
  
  /**
   * Calculate relationship boost
   * Are these characters close?
   */
  static calculateRelationshipBoost(character, lastSpeaker, relationships) {
    if (!lastSpeaker) return 0;
    if (!relationships || relationships.length === 0) return 0;
    
    // Find relationship between this character and last speaker
    const relationship = relationships.find(r => 
      (r.character_id === character.id && r.related_character_id === lastSpeaker) ||
      (r.character_id === lastSpeaker && r.related_character_id === character.id)
    );
    
    if (!relationship) return 0;
    
    // Relationship strength (0-1)
    const strength = relationship.relationship_strength || 0.5;
    return strength;
  }
  
  /**
   * Calculate frequency penalty
   * Penalize characters who spoke very recently
   */
  static calculateFrequencyPenalty(messagesThisSession, lastSpokeAt, totalMessages) {
    if (!lastSpokeAt || totalMessages === 0) return 0;
    
    // How recently did they speak? (in number of messages ago)
    const messagesSinceSpoke = totalMessages - messagesThisSession;
    
    // Penalty based on recency
    if (messagesSinceSpoke === 0) return -0.3; // Just spoke - big penalty
    if (messagesSinceSpoke === 1) return -0.2;
    if (messagesSinceSpoke === 2) return -0.1;
    
    return 0; // No penalty if spoke 3+ messages ago
  }
  
  /**
   * Check if user directly addressed this character
   * Examples: "Sarah, what do you think?" or "@Marcus help me"
   */
  static isDirectlyAddressed(character, message) {
    const messageLower = message.toLowerCase();
    const nameLower = character.name.toLowerCase();
    
    // Check for direct address patterns
    const patterns = [
      `${nameLower},`,           // "Sarah,"
      `${nameLower}?`,           // "Sarah?"
      `${nameLower}!`,           // "Sarah!"
      `@${nameLower}`,           // "@Sarah"
      `hey ${nameLower}`,        // "Hey Sarah"
      `hi ${nameLower}`,         // "Hi Sarah"
      `${nameLower} what`,       // "Sarah what..."
      `${nameLower} can`,        // "Sarah can..."
      `${nameLower} do`,         // "Sarah do..."
      `ask ${nameLower}`,        // "Ask Sarah"
      `tell ${nameLower}`        // "Tell Sarah"
    ];
    
    return patterns.some(pattern => messageLower.includes(pattern));
  }
  
  /**
   * Update topic engagement after a response
   * Call this after a character successfully responds
   */
  static async updateTopicEngagement(characterId, userId, message, supabase) {
    const keywords = this.extractKeywords(message);
    
    if (keywords.length === 0) return;
    
    // Update or create engagement records for each keyword
    for (const keyword of keywords) {
      try {
        // Check if engagement exists
        const { data: existing } = await supabase
          .from('character_topic_engagement')
          .select('*')
          .eq('character_id', characterId)
          .eq('user_id', userId)
          .eq('topic_keyword', keyword)
          .single();
        
        if (existing) {
          // Update existing
          await supabase
            .from('character_topic_engagement')
            .update({
              engagement_count: existing.engagement_count + 1,
              last_discussed: new Date().toISOString()
            })
            .eq('id', existing.id);
        } else {
          // Create new
          await supabase
            .from('character_topic_engagement')
            .insert({
              character_id: characterId,
              user_id: userId,
              topic_keyword: keyword,
              engagement_count: 1,
              last_discussed: new Date().toISOString()
            });
        }
      } catch (error) {
        console.error('Error updating topic engagement:', error);
        // Don't fail the whole response if this fails
      }
    }
  }
  
  /**
   * Update session state after speaking
   */
  static async updateSessionState(characterId, sessionId, userId, supabase) {
    try {
      const { data: existing } = await supabase
        .from('character_session_state')
        .select('*')
        .eq('character_id', characterId)
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .single();
      
      if (existing) {
        await supabase
          .from('character_session_state')
          .update({
            messages_this_session: existing.messages_this_session + 1,
            last_spoke_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('character_session_state')
          .insert({
            character_id: characterId,
            session_id: sessionId,
            user_id: userId,
            messages_this_session: 1,
            last_spoke_at: new Date().toISOString()
          });
      }
    } catch (error) {
      console.error('Error updating session state:', error);
    }
  }
  
  /**
   * Get all session states for active characters
   */
  static async getSessionStates(characterIds, sessionId, userId, supabase) {
    try {
      const { data, error } = await supabase
        .from('character_session_state')
        .select('*')
        .in('character_id', characterIds)
        .eq('session_id', sessionId)
        .eq('user_id', userId);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching session states:', error);
      return [];
    }
  }
  
  /**
   * Get topic engagements for characters
   */
  static async getTopicEngagements(characterIds, userId, supabase) {
    try {
      const { data, error } = await supabase
        .from('character_topic_engagement')
        .select('*')
        .in('character_id', characterIds)
        .eq('user_id', userId)
        .order('last_discussed', { ascending: false })
        .limit(100); // Last 100 topics per character
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching topic engagements:', error);
      return [];
    }
  }
  
  /**
   * Get character relationships
   */
  static async getRelationships(characterIds, userId, supabase) {
    try {
      const { data, error } = await supabase
        .from('character_relationships')
        .select('*')
        .or(`character_id.in.(${characterIds.join(',')}),related_character_id.in.(${characterIds.join(',')})`)
        .eq('user_id', userId);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching relationships:', error);
      return [];
    }
  }
}

module.exports = SpeakingQueue;