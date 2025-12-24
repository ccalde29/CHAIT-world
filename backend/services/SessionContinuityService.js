// ============================================================================
// Session Continuity Service
// Manages conversation continuity across sessions
// ============================================================================

class SessionContinuityService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Load continuity context for current conversation
   */
  async loadContinuityContext(characterId, userId, currentSessionId) {
    try {
      // Get previous sessions with this character
      const previousSessions = await this.getPreviousSessions(
        userId,
        characterId,
        currentSessionId,
        3
      );

      if (!previousSessions || previousSessions.length === 0) {
        return null;
      }

      const lastSession = previousSessions[0];
      const daysSince = this.calculateDaysSince(lastSession.updated_at);

      // Only return context if recent (within 30 days)
      if (daysSince > 30) {
        return null;
      }

      // Build continuity context
      const context = {
        days_since_last_chat: daysSince,
        last_session_date: lastSession.updated_at,
        unresolved_topics: await this.extractUnresolvedTopics(previousSessions),
        significant_events: await this.extractSignificantEvents(previousSessions),
        last_conversation_tone: this.inferTone(lastSession)
      };

      return context;
    } catch (error) {
      console.error('[SessionContinuity] Error loading context:', error);
      return null;
    }
  }

  /**
   * Get previous chat sessions with character
   */
  async getPreviousSessions(userId, characterId, currentSessionId, limit = 3) {
    try {
      const sessions = this.db.localDb.all(
        `SELECT * FROM chat_sessions 
         WHERE user_id = ? 
         AND id != ? 
         AND active_characters LIKE ?
         ORDER BY updated_at DESC 
         LIMIT ?`,
        [userId, currentSessionId, `%${characterId}%`, limit]
      );

      return sessions || [];
    } catch (error) {
      console.error('[SessionContinuity] Error fetching previous sessions:', error);
      return [];
    }
  }

  /**
   * Extract topics that weren't fully resolved
   */
  async extractUnresolvedTopics(sessions) {
    // Get messages from last session
    if (sessions.length === 0) return [];

    try {
      const lastSessionId = sessions[0].id;
      
      const messages = this.db.localDb.all(
        `SELECT content, sender_type FROM messages 
         WHERE session_id = ? 
         ORDER BY timestamp DESC 
         LIMIT 10`,
        [lastSessionId]
      );

      if (!messages) return [];

      // Look for questions or topics mentioned but not resolved
      const unresolvedTopics = [];
      
      for (const msg of messages) {
        if (msg.sender_type === 'user' && msg.content.includes('?')) {
          // Check if there was a satisfactory response
          const nextMessages = messages.slice(messages.indexOf(msg) + 1, messages.indexOf(msg) + 3);
          const hasDetailedResponse = nextMessages.some(m => 
            m.sender_type === 'character' && m.content.length > 50
          );
          
          if (!hasDetailedResponse) {
            // Extract the question/topic
            const topic = this.extractTopicFromQuestion(msg.content);
            if (topic && !unresolvedTopics.includes(topic)) {
              unresolvedTopics.push(topic);
            }
          }
        }
      }

      return unresolvedTopics.slice(0, 3);
    } catch (error) {
      console.error('[SessionContinuity] Error extracting topics:', error);
      return [];
    }
  }

  /**
   * Extract significant events from previous sessions
   */
  async extractSignificantEvents(sessions) {
    if (sessions.length === 0) return [];

    try {
      const lastSessionId = sessions[0].id;
      
      const messages = this.db.localDb.all(
        `SELECT content, sender_type FROM messages 
         WHERE session_id = ? 
         ORDER BY timestamp DESC 
         LIMIT 20`,
        [lastSessionId]
      );

      if (!messages) return [];

      const events = [];

      // Look for emotionally significant or action-oriented messages
      const significantKeywords = [
        'decided', 'agreed', 'promised', 'planned', 'committed',
        'important', 'significant', 'memorable', 'special',
        'realized', 'understood', 'learned', 'discovered'
      ];

      for (const msg of messages) {
        const lower = msg.content.toLowerCase();
        const hasSignificantKeyword = significantKeywords.some(kw => lower.includes(kw));
        
        if (hasSignificantKeyword && msg.content.length > 30) {
          events.push(msg.content.substring(0, 100)); // First 100 chars
        }

        if (events.length >= 2) break;
      }

      return events;
    } catch (error) {
      console.error('[SessionContinuity] Error extracting events:', error);
      return [];
    }
  }

  /**
   * Extract topic from a question
   */
  extractTopicFromQuestion(question) {
    // Remove question marks and common question words
    const cleaned = question
      .toLowerCase()
      .replace(/[?!.]/g, '')
      .replace(/^(what|where|when|why|how|who|which|can|do|does|did|is|are|was|were)\s+/gi, '');

    // Get first few meaningful words
    const words = cleaned.split(/\s+/).slice(0, 3);
    return words.join(' ').trim();
  }

  /**
   * Infer conversation tone from session
   */
  inferTone(session) {
    // Could be enhanced by analyzing actual messages
    // For now, return neutral
    return 'neutral';
  }

  /**
   * Calculate days since a date
   */
  calculateDaysSince(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Store session metadata for future continuity
   */
  async storeSessionMetadata(sessionId, metadata) {
    try {
      const metadataJson = JSON.stringify(metadata);
      
      this.db.localDb.run(
        'UPDATE chat_sessions SET metadata = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [metadataJson, sessionId]
      );

      return true;
    } catch (error) {
      console.error('[SessionContinuity] Error storing metadata:', error);
      return false;
    }
  }
}

module.exports = SessionContinuityService;
