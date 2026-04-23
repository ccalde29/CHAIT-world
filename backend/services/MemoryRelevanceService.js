// ============================================================================
// Memory Relevance Service
// Scores and retrieves relevant memories for current conversation context
// ============================================================================

class MemoryRelevanceService {
  /**
   * Get memories relevant to current conversation
   */
  static async getRelevantMemories(memoryService, characterId, userId, currentMessage, context, limit = null) {
    // Dynamic limit based on conversation importance
    if (!limit) {
      limit = context.conversationImportance > 0.7 ? 12 : 8;
    }
    
    // Get memories across all sessions with recency weighting
    const allMemories = await memoryService.db.getMemoriesAcrossSessions(characterId, userId, 50);
    
    if (!allMemories || allMemories.length === 0) {
      return [];
    }

    // Score each memory by relevance
    const scoredMemories = allMemories.map(memory => ({
      ...memory,
      relevance_score: this.calculateRelevance(memory, currentMessage, context)
    }));

    // Sort by combined importance + relevance
    scoredMemories.sort((a, b) => {
      const scoreA = (a.importance_score || 0.5) * 0.4 + a.relevance_score * 0.6;
      const scoreB = (b.importance_score || 0.5) * 0.4 + b.relevance_score * 0.6;
      return scoreB - scoreA;
    });

    // Get top memories
    const topMemories = scoredMemories.slice(0, limit);
    
    // Consolidate similar memories to avoid redundancy
    const consolidated = this.consolidateMemories(topMemories);
    
    // Update access timestamps for retrieved memories
    for (const memory of consolidated) {
      memoryService.db.updateMemoryAccess(memory.id);
    }

    return consolidated;
  }

  /**
   * Calculate relevance score for a memory
   */
  static calculateRelevance(memory, currentMessage, context = {}) {
    let score = 0;

    // 1. Keyword matching
    const memoryWords = this.extractKeywords(memory.memory_content);
    const messageWords = this.extractKeywords(currentMessage);
    const commonWords = memoryWords.filter(w => messageWords.includes(w));
    score += Math.min(commonWords.length * 0.15, 0.5);

    // 2. Recency bonus
    if (memory.last_accessed) {
      const daysSince = this.getDaysDifference(memory.last_accessed, new Date());
      if (daysSince < 1) score += 0.3;
      else if (daysSince < 7) score += 0.2;
      else if (daysSince < 30) score += 0.1;
    }

    // 3. Topic matching
    if (context.active_topics && context.active_topics.length > 0) {
      const memoryLower = memory.memory_content.toLowerCase();
      const topicMatches = context.active_topics.filter(topic => 
        memoryLower.includes(topic.toLowerCase())
      );
      score += topicMatches.length * 0.1;
    }

    // 4. Memory type relevance
    if (memory.memory_type === 'preference' || memory.memory_type === 'fact') {
      score += 0.1; // Preferences and facts are generally more relevant
    }

    // 5. Emotional context matching
    if (context.emotional_intensity > 0.7 && memory.memory_type === 'emotional_event') {
      score += 0.2; // Emotional memories more relevant in emotional conversations
    }

    return Math.min(score, 1.0);
  }

  /**
   * Extract meaningful keywords from text
   */
  static extractKeywords(text) {
    // Handle undefined, null, or non-string values
    if (!text || typeof text !== 'string') {
      return [];
    }

    const commonWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'am', 'is', 'are', 'was',
      'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can',
      'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'its'
    ]);

    return text.toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter(word => 
        word.length > 3 && 
        !commonWords.has(word) && 
        !/^\d+$/.test(word)
      );
  }

  /**
   * Calculate days difference between dates
   */
  static getDaysDifference(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Consolidate similar memories to reduce redundancy
   */
  static consolidateMemories(memories) {
    if (memories.length <= 5) return memories;

    const consolidated = [];
    const processed = new Set();

    for (let i = 0; i < memories.length; i++) {
      if (processed.has(i)) continue;

      const current = memories[i];
      const similar = [];

      // Find similar memories
      for (let j = i + 1; j < memories.length; j++) {
        if (processed.has(j)) continue;

        if (this.areSimilar(current.memory_content, memories[j].memory_content)) {
          similar.push(memories[j]);
          processed.add(j);
        }
      }

      if (similar.length > 0) {
        // Combine similar memories
        const combined = {
          ...current,
          memory_content: current.memory_content,
          importance_score: Math.max(
            current.importance_score,
            ...similar.map(m => m.importance_score || 0.5)
          )
        };
        consolidated.push(combined);
      } else {
        consolidated.push(current);
      }

      processed.add(i);
    }

    return consolidated;
  }

  /**
   * Check if two memory texts are similar
   */
  static areSimilar(text1, text2, threshold = 0.6) {
    const words1 = this.extractKeywords(text1);
    const words2 = this.extractKeywords(text2);

    if (words1.length === 0 || words2.length === 0) return false;

    const common = words1.filter(w => words2.includes(w));
    const similarity = common.length / Math.max(words1.length, words2.length);

    return similarity >= threshold;
  }
}

module.exports = MemoryRelevanceService;
