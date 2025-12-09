// ============================================================================
// Conversation State Tracker
// Tracks conversation state and dynamics for coherent group interactions
// ============================================================================

class ConversationStateTracker {
  constructor() {
    this.state = {
      mood: 'neutral',
      active_topics: [],
      speaking_turns: [],
      interpersonal_dynamics: {},
      conversation_phase: 'opening'
    };
  }

  /**
   * Update conversation state based on new message
   */
  updateState(message, character, conversationHistory) {
    this.updateMood(message, conversationHistory);
    this.updateTopics(message);
    this.updateSpeakingTurns(character);
    this.updatePhase(conversationHistory);
    
    return this.state;
  }

  /**
   * Detect and update conversation mood
   */
  updateMood(message, history) {
    const recentMessages = [...history.slice(-3), message];
    const allText = recentMessages.map(m => m.content).join(' ').toLowerCase();
    
    // Mood detection based on keywords
    const moodMarkers = {
      tense: ['angry', 'frustrated', 'annoyed', 'upset', 'argument'],
      playful: ['haha', 'lol', 'funny', 'joke', 'kidding'],
      serious: ['important', 'serious', 'concern', 'worried', 'careful'],
      intimate: ['love', 'care', 'close', 'trust', 'personal'],
      excited: ['amazing', 'excited', 'awesome', 'fantastic', 'incredible']
    };
    
    let maxScore = 0;
    let detectedMood = 'neutral';
    
    for (const [mood, keywords] of Object.entries(moodMarkers)) {
      const score = keywords.filter(kw => allText.includes(kw)).length;
      if (score > maxScore) {
        maxScore = score;
        detectedMood = mood;
      }
    }
    
    this.state.mood = maxScore > 0 ? detectedMood : 'neutral';
  }

  /**
   * Extract and track active topics
   */
  updateTopics(message) {
    // Simple topic extraction (can be enhanced)
    const words = message.content.toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 4);
    
    // Update topic frequency
    for (const word of words) {
      const existingTopic = this.state.active_topics.find(t => t.topic === word);
      if (existingTopic) {
        existingTopic.mentions++;
        existingTopic.last_mentioned = Date.now();
      } else if (this.state.active_topics.length < 10) {
        this.state.active_topics.push({
          topic: word,
          mentions: 1,
          last_mentioned: Date.now()
        });
      }
    }
    
    // Keep only recent topics
    this.state.active_topics = this.state.active_topics
      .filter(t => Date.now() - t.last_mentioned < 300000) // 5 minutes
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 5);
  }

  /**
   * Track who has been speaking
   */
  updateSpeakingTurns(character) {
    // Skip if no character provided (e.g., user messages)
    if (!character) {
      return;
    }
    
    this.state.speaking_turns.push({
      character_id: character.id,
      character_name: character.name,
      timestamp: Date.now()
    });
    
    // Keep last 10 turns
    this.state.speaking_turns = this.state.speaking_turns.slice(-10);
  }

  /**
   * Update conversation phase
   */
  updatePhase(history) {
    const messageCount = history.length;
    
    if (messageCount < 3) {
      this.state.conversation_phase = 'opening';
    } else if (messageCount < 15) {
      this.state.conversation_phase = 'discussion';
    } else {
      this.state.conversation_phase = 'ongoing';
    }
  }

  /**
   * Get recent speakers (for turn-taking logic)
   */
  getRecentSpeakers(count = 3) {
    return this.state.speaking_turns
      .slice(-count)
      .map(t => t.character_id);
  }

  /**
   * Check if character spoke recently
   */
  spokeRecently(characterId, withinTurns = 3) {
    const recentSpeakers = this.getRecentSpeakers(withinTurns);
    return recentSpeakers.includes(characterId);
  }

  /**
   * Get conversation summary for context
   */
  getSummary() {
    return {
      mood: this.state.mood,
      phase: this.state.conversation_phase,
      active_topics: this.state.active_topics.slice(0, 3).map(t => t.topic),
      turn_count: this.state.speaking_turns.length
    };
  }

  /**
   * Reset state (for new conversation)
   */
  reset() {
    this.state = {
      mood: 'neutral',
      active_topics: [],
      speaking_turns: [],
      interpersonal_dynamics: {},
      conversation_phase: 'opening'
    };
  }
}

module.exports = ConversationStateTracker;
