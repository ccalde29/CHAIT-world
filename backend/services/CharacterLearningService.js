/**
 * Character Learning Service
 * Handles character learning patterns, interaction tracking, and insights
 */

class CharacterLearningService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Record an interaction and update learning patterns
   */
  async recordInteraction(userId, characterId, conversationContext = {}) {
    try {
      const { userMessage, characterResponse, userPersona } = conversationContext;
      
      if (!userMessage || !characterResponse) {
        return { success: true };
      }
      
      // COMMUNICATION STYLE LEARNING
      await this.learnCommunicationStyle(characterId, userMessage, userPersona);
      
      // EMOTIONAL RESPONSE LEARNING
      await this.learnEmotionalResponse(characterId, userMessage, characterResponse);
      
      // HUMOR STYLE LEARNING
      await this.learnHumorStyle(characterId, userMessage);
      
      return { success: true };
    } catch (error) {
      console.error('Error recording interaction:', error);
      return null;
    }
  }

  /**
   * Learn user's communication style
   */
  async learnCommunicationStyle(characterId, userMessage, userPersona) {
    const existing = this.db.getCharacterLearning(characterId, 'communication_style');
    
    // Analyze message characteristics
    const messageLength = userMessage.length;
    const hasQuestions = /\?/.test(userMessage);
    const hasEmojis = /[\u{1F600}-\u{1F64F}]/u.test(userMessage);
    const isUppercase = userMessage === userMessage.toUpperCase() && messageLength > 5;
    const punctuationDensity = (userMessage.match(/[!?.]/g) || []).length / messageLength;
    
    // Build pattern data
    const newData = {
      avg_message_length: messageLength,
      asks_questions: hasQuestions,
      uses_emojis: hasEmojis,
      uses_caps: isUppercase,
      punctuation_density: punctuationDensity,
      formality_level: this.estimateFormality(userMessage)
    };
    
    if (existing) {
      // Merge with existing pattern (moving average)
      const oldData = existing.pattern_data;
      const merged = {
        avg_message_length: (oldData.avg_message_length * 0.8 + messageLength * 0.2),
        asks_questions: oldData.asks_questions || hasQuestions,
        uses_emojis: oldData.uses_emojis || hasEmojis,
        uses_caps: oldData.uses_caps || isUppercase,
        punctuation_density: (oldData.punctuation_density * 0.8 + punctuationDensity * 0.2),
        formality_level: (oldData.formality_level * 0.8 + newData.formality_level * 0.2)
      };
      
      const confidence = Math.min(existing.confidence_score + 0.05, 1.0);
      this.db.createOrUpdateLearning(characterId, 'communication_style', merged, confidence);
    } else {
      this.db.createOrUpdateLearning(characterId, 'communication_style', newData, 0.3);
    }
  }

  /**
   * Learn emotional response patterns
   */
  async learnEmotionalResponse(characterId, userMessage, characterResponse) {
    const userEmotion = this.detectEmotion(userMessage);
    const charEmotion = this.detectEmotion(characterResponse);
    
    if (!userEmotion || !charEmotion) return;
    
    const existing = this.db.getCharacterLearning(characterId, 'emotional_response');
    
    const newPattern = {
      [`${userEmotion}_triggers_${charEmotion}`]: true,
      last_user_emotion: userEmotion,
      last_char_emotion: charEmotion
    };
    
    if (existing) {
      const oldData = existing.pattern_data;
      const merged = { ...oldData, ...newPattern };
      this.db.createOrUpdateLearning(characterId, 'emotional_response', merged, 
        Math.min(existing.confidence_score + 0.05, 1.0));
    } else {
      this.db.createOrUpdateLearning(characterId, 'emotional_response', newPattern, 0.3);
    }
  }

  /**
   * Learn humor style preferences
   */
  async learnHumorStyle(characterId, userMessage) {
    const hasJoke = /\b(lol|haha|lmao|😂|funny|hilarious)\b/i.test(userMessage);
    const hasSarcasm = /(yeah right|sure|totally|definitely not)/i.test(userMessage);
    const hasPun = /\b(pun intended|get it|see what i did)\b/i.test(userMessage);
    
    if (!hasJoke && !hasSarcasm && !hasPun) return;
    
    const existing = this.db.getCharacterLearning(characterId, 'humor_style');
    
    const newPattern = {
      appreciates_jokes: hasJoke,
      uses_sarcasm: hasSarcasm,
      enjoys_puns: hasPun
    };
    
    if (existing) {
      const oldData = existing.pattern_data;
      const merged = {
        appreciates_jokes: oldData.appreciates_jokes || hasJoke,
        uses_sarcasm: oldData.uses_sarcasm || hasSarcasm,
        enjoys_puns: oldData.enjoys_puns || hasPun
      };
      this.db.createOrUpdateLearning(characterId, 'humor_style', merged, 
        Math.min(existing.confidence_score + 0.1, 1.0));
    } else {
      this.db.createOrUpdateLearning(characterId, 'humor_style', newPattern, 0.4);
    }
  }

  /**
   * Get all learning data for a character
   */
  async getCharacterLearning(userId, characterId) {
    try {
      const patterns = this.db.getCharacterLearning(characterId);
      
      return {
        character_id: characterId,
        user_id: userId,
        patterns: patterns || [],
        total_interactions: patterns ? patterns.reduce((sum, p) => sum + (p.usage_count || 0), 0) : 0
      };
    } catch (error) {
      console.error('Error getting character learning:', error);
      return null;
    }
  }

  /**
   * Helper: Estimate formality level
   */
  estimateFormality(text) {
    const formalWords = ['please', 'thank you', 'sir', 'madam', 'kindly', 'appreciate'];
    const informalWords = ['yeah', 'nah', 'gonna', 'wanna', 'lol', 'hey'];
    
    const lower = text.toLowerCase();
    const formalCount = formalWords.filter(w => lower.includes(w)).length;
    const informalCount = informalWords.filter(w => lower.includes(w)).length;
    
    if (formalCount > informalCount) return 0.7;
    if (informalCount > formalCount) return 0.3;
    return 0.5;
  }

  /**
   * Helper: Detect emotion in text
   */
  detectEmotion(text) {
    const lower = text.toLowerCase();
    
    if (/\b(happy|excited|joy|great|wonderful|amazing)\b/.test(lower)) return 'positive';
    if (/\b(sad|upset|disappointed|unhappy)\b/.test(lower)) return 'negative';
    if (/\b(angry|mad|frustrated|furious)\b/.test(lower)) return 'angry';
    if (/\b(worried|anxious|nervous|scared)\b/.test(lower)) return 'anxious';
    
    return null;
  }

  /**
   * Delete learning data for a character
   */
  async deleteCharacterLearning(userId, characterId) {
    try {
      this.db.deleteLearningPatterns(characterId);
      return { message: 'Learning data deleted' };
    } catch (error) {
      console.error('Error deleting learning data:', error);
      return { message: 'Error deleting learning data' };
    }
  }
}

module.exports = CharacterLearningService;

module.exports = CharacterLearningService;
