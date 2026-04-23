// ============================================================================
// Provider Adapter Service
// Normalizes prompts and responses across different AI providers
// ============================================================================

class ProviderAdapter {
  /**
   * Adapt prompt for specific provider's preferences
   */
  static adaptPrompt(basePrompt, provider, character) {
    switch (provider.toLowerCase()) {
      case 'anthropic':
        return this.adaptForClaude(basePrompt, character);
      
      case 'openai':
        return this.adaptForOpenAI(basePrompt, character);
      
      case 'google':
      case 'gemini':
        return this.adaptForGemini(basePrompt, character);
      
      case 'ollama':
      case 'lmstudio':
        return this.adaptForLocal(basePrompt, character);
      
      default:
        return basePrompt;
    }
  }

  /**
   * Claude prefers structured, detailed prompts with clear sections
   */
  static adaptForClaude(prompt, character) {
    // Claude works well with XML-style tags for structure
    let adapted = prompt;
    
    // Add explicit role emphasis
    adapted = `<role>You are ${character.name}</role>\n\n` + adapted;
    
    // Claude responds better to explicit instruction emphasis
    if (adapted.includes('IMPORTANT INSTRUCTIONS:')) {
      adapted = adapted.replace(
        'IMPORTANT INSTRUCTIONS:',
        '<instructions>CRITICAL GUIDELINES:'
      ) + '\n</instructions>';
    }
    
    return adapted;
  }

  /**
   * OpenAI models work well with conversational, natural prompts
   */
  static adaptForOpenAI(prompt, character) {
    // GPT models are good with natural language, less structure needed
    // Just ensure clear sections
    return prompt;
  }

  /**
   * Gemini benefits from explicit, step-by-step instructions
   */
  static adaptForGemini(prompt, character) {
    let adapted = prompt;
    
    // Add explicit thinking guidance
    const thinkingPrompt = `\nBefore responding, consider:
1. What is your current relationship with the speaker?
2. What do you remember about them?
3. How would ${character.name} naturally react to this?
4. What tone matches the situation?\n\n`;
    
    // Insert before instructions
    if (adapted.includes('IMPORTANT INSTRUCTIONS:')) {
      adapted = adapted.replace('IMPORTANT INSTRUCTIONS:', thinkingPrompt + 'IMPORTANT INSTRUCTIONS:');
    }
    
    return adapted;
  }

  /**
   * Local models need simpler, more direct prompts
   */
  static adaptForLocal(prompt, character) {
    // Simplify and reduce verbosity for local models
    let adapted = prompt;
    
    // Remove overly complex sections
    adapted = adapted.replace(/\n{3,}/g, '\n\n'); // Reduce excessive newlines
    
    // Add simple, direct instruction
    adapted = `You are ${character.name}. Stay in character.\n\n` + adapted;
    
    return adapted;
  }

  /**
   * Calculate dynamic temperature based on context
   */
  static calculateDynamicTemperature(character, context = {}) {
    let baseTemp = character.temperature || 0.8;
    
    // Adjust based on scene formality
    if (context.scene_formality > 0.7) {
      baseTemp *= 0.85;
    }
    
    // Adjust based on emotional intensity
    if (context.emotional_intensity > 0.8) {
      baseTemp *= 1.1;
    }
    
    // Adjust based on group size
    if (context.group_size > 4) {
      baseTemp *= 0.9;
    }
    
    // Adjust based on relationship familiarity
    if (context.user_familiarity < 0.3) {
      baseTemp *= 0.8; // More careful with strangers
    }
    
    // Adjust based on conversation phase
    if (context.turn_number < 3) {
      baseTemp *= 0.85; // More consistent in opening
    }
    
    // Adjust based on scene noise level
    if (context.noise_level > 0.7) {
      baseTemp *= 0.9; // More focused in noisy environments
    }
    
    return Math.max(0.3, Math.min(baseTemp, 2.0));
  }

  /**
   * Calculate response token budget based on context
   */
  static calculateResponseBudget(character, context = {}) {
    let baseTokens = character.max_tokens || 150;
    
    // Adjust based on group size
    if (context.group_size > 3) {
      baseTokens *= 0.7;
    }
    
    // Adjust based on previous message length
    if (context.last_speaker_was_long) {
      baseTokens *= 0.6;
    }
    
    // Adjust if directly mentioned
    if (context.directly_mentioned) {
      baseTokens *= 1.2;
    }
    
    // Adjust based on scene noise level
    if (context.noise_level > 0.7) {
      baseTokens *= 0.5;
    }
    
    // Adjust based on emotional intensity
    if (context.emotional_intensity > 0.8) {
      baseTokens *= 1.3;
    }
    
    // Adjust based on character verbosity trait
    if (character.voice_traits && character.voice_traits.verbosity !== undefined) {
      const verbosity = character.voice_traits.verbosity;
      if (verbosity < 0.3) {
        baseTokens *= 0.7;
      } else if (verbosity > 0.7) {
        baseTokens *= 1.3;
      }
    }
    
    return Math.floor(baseTokens);
  }

  /**
   * Normalize response to match character voice
   */
  static normalizeResponse(response, character, provider) {
    let normalized = response.trim();
    
    // Check for style drift
    if (this.detectStyleDrift(normalized, character)) {
      // Apply corrections based on character traits
      normalized = this.adjustTone(normalized, character);
    }
    
    // Remove provider-specific artifacts
    normalized = this.cleanProviderArtifacts(normalized, provider);
    
    return normalized;
  }

  /**
   * Detect if response drifts from character's established voice
   */
  static detectStyleDrift(response, character) {
    // Check for obvious breaks
    if (response.includes('As an AI') || response.includes('I am a language model')) {
      return true;
    }
    
    // Check length against verbosity trait
    if (character.voice_traits && character.voice_traits.verbosity !== undefined) {
      const wordCount = response.split(/\s+/).length;
      const verbosity = character.voice_traits.verbosity;
      
      if (verbosity < 0.3 && wordCount > 50) return true;
      if (verbosity > 0.7 && wordCount < 20) return true;
    }
    
    return false;
  }

  /**
   * Adjust tone to match character
   */
  static adjustTone(response, character) {
    // Remove AI-awareness statements
    let adjusted = response
      .replace(/As an AI.+?[.!]/gi, '')
      .replace(/I am a language model.+?[.!]/gi, '')
      .replace(/I don't have.+?emotions[.!]/gi, '')
      .trim();
    
    // If too formal and character is casual, relax it
    if (character.voice_traits && character.voice_traits.formality < 0.3) {
      adjusted = this.casualize(adjusted);
    }
    
    return adjusted;
  }

  /**
   * Make text more casual
   */
  static casualize(text) {
    return text
      .replace(/\bI am\b/g, "I'm")
      .replace(/\bdo not\b/g, "don't")
      .replace(/\bcannot\b/g, "can't")
      .replace(/\bwill not\b/g, "won't")
      .replace(/\bshould not\b/g, "shouldn't");
  }

  /**
   * Remove provider-specific artifacts
   */
  static cleanProviderArtifacts(response, provider) {
    let cleaned = response;
    
    // Remove XML tags that might leak from Claude
    if (provider === 'anthropic') {
      cleaned = cleaned.replace(/<\/?[^>]+(>|$)/g, '');
    }
    
    // Remove markdown headers that sometimes appear
    cleaned = cleaned.replace(/^#+\s+/gm, '');
    
    return cleaned.trim();
  }

  /**
   * Analyze conversation context for decision making
   */
  static analyzeContext(conversationHistory, activeCharacters, scene) {
    const recentMessages = conversationHistory.slice(-5);
    
    const context = {
      group_size: activeCharacters.length,
      turn_number: conversationHistory.length,
      last_speaker_was_long: false,
      emotional_intensity: 0.5,
      scene_formality: 0.5,
      noise_level: 0.5,
      user_familiarity: 0.5
    };
    
    // Detect if last speaker was verbose
    if (recentMessages.length > 0) {
      const lastMessage = recentMessages[recentMessages.length - 1];
      const wordCount = lastMessage.content.split(/\s+/).length;
      context.last_speaker_was_long = wordCount > 100;
    }
    
    // Analyze emotional intensity from recent messages
    const emotionalKeywords = ['love', 'hate', 'angry', 'excited', 'sad', 'happy', 'afraid', 'worried'];
    let emotionalCount = 0;
    for (const msg of recentMessages) {
      const lower = msg.content.toLowerCase();
      emotionalCount += emotionalKeywords.filter(kw => lower.includes(kw)).length;
    }
    context.emotional_intensity = Math.min(emotionalCount * 0.2, 1.0);
    
    // Get scene context if available
    if (scene) {
      if (scene.context_rules) {
        context.scene_formality = scene.context_rules.formality_required || 0.5;
        context.noise_level = scene.context_rules.noise_level || 0.5;
      }
    }
    
    return context;
  }
}

module.exports = ProviderAdapter;
