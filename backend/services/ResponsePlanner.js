// ============================================================================
// Response Planner Service
// Plans multi-character responses for coherence and natural flow
// ============================================================================

class ResponsePlanner {
  /**
   * Plan which characters should respond and in what way
   */
  static planGroupResponse(userMessage, characters, conversationHistory, conversationState) {
    const plan = {
      responders: [],
      roles: {},
      target_lengths: {},
      interpersonal_dynamics: {}
    };

    // 1. Determine who should respond
    const directlyMentioned = this.findMentionedCharacters(userMessage, characters);
    const recentSpeakers = conversationState.getRecentSpeakers(3);
    
    if (directlyMentioned.length > 0) {
      // All mentioned characters respond
      plan.responders = directlyMentioned;
      
      // First mentioned is primary
      plan.roles[directlyMentioned[0].id] = 'address_question';
      
      // Others add perspective
      for (let i = 1; i < directlyMentioned.length; i++) {
        plan.roles[directlyMentioned[i].id] = 'add_perspective';
      }
    } else {
      // Select 1-2 characters who haven't spoken recently
      const available = characters.filter(c => !recentSpeakers.includes(c.id));
      
      if (available.length > 0) {
        const numResponders = Math.random() > 0.6 ? 2 : 1;
        plan.responders = available
          .sort(() => Math.random() - 0.5)
          .slice(0, Math.min(numResponders, available.length));
      } else {
        // Everyone spoke recently, pick oldest speaker
        plan.responders = [characters[0]];
      }
      
      // Set roles
      if (plan.responders.length > 0) {
        plan.roles[plan.responders[0].id] = 'address_question';
      }
      if (plan.responders.length > 1) {
        plan.roles[plan.responders[1].id] = 'add_perspective';
      }
    }

    // 2. Set target response lengths
    for (const char of plan.responders) {
      const role = plan.roles[char.id];
      
      if (role === 'address_question') {
        plan.target_lengths[char.id] = 'medium';
      } else {
        plan.target_lengths[char.id] = 'brief';
      }
    }

    // 3. Determine interpersonal dynamics
    for (let i = 0; i < plan.responders.length; i++) {
      for (let j = i + 1; j < plan.responders.length; j++) {
        const char1 = plan.responders[i];
        const char2 = plan.responders[j];
        const key = `${char1.id}_${char2.id}`;
        
        // Default to neutral
        plan.interpersonal_dynamics[key] = this.determineDynamic(
          char1,
          char2,
          conversationState
        );
      }
    }

    return plan;
  }

  /**
   * Find characters mentioned by name in message
   */
  static findMentionedCharacters(message, characters) {
    const mentioned = [];
    const lowerMessage = message.toLowerCase();
    
    for (const char of characters) {
      if (char && char.name && lowerMessage.includes(char.name.toLowerCase())) {
        mentioned.push(char);
      }
    }
    
    return mentioned;
  }

  /**
   * Determine interaction dynamic between two characters
   */
  static determineDynamic(char1, char2, conversationState) {
    // Default dynamics based on conversation mood
    const mood = conversationState.state.mood;
    
    const dynamics = {
      'neutral': 'cooperative',
      'playful': 'playful_banter',
      'tense': 'cautious',
      'serious': 'supportive',
      'intimate': 'supportive',
      'excited': 'enthusiastic'
    };
    
    return dynamics[mood] || 'cooperative';
  }

  /**
   * Validate response plan for coherence
   */
  static validatePlan(plan, characters) {
    // Ensure at least one responder
    if (plan.responders.length === 0) {
      plan.responders = [characters[0]];
      plan.roles[characters[0].id] = 'address_question';
      plan.target_lengths[characters[0].id] = 'medium';
    }

    // Ensure all responders have roles
    for (const char of plan.responders) {
      if (!plan.roles[char.id]) {
        plan.roles[char.id] = 'add_perspective';
      }
      if (!plan.target_lengths[char.id]) {
        plan.target_lengths[char.id] = 'brief';
      }
    }

    return plan;
  }

  /**
   * Build response context for a specific character
   */
  static buildCharacterContext(character, plan, conversationState, scene) {
    const context = {
      role: plan.roles[character.id] || 'respond',
      target_length: plan.target_lengths[character.id] || 'medium',
      conversation_mood: conversationState.state.mood,
      conversation_phase: conversationState.state.conversation_phase,
      is_primary: plan.roles[character.id] === 'address_question',
      group_size: plan.responders.length,
      directly_mentioned: plan.responders.some(c => c.id === character.id && plan.roles[c.id] === 'address_question')
    };

    // Add scene context
    if (scene && scene.context_rules) {
      context.scene_formality = scene.context_rules.formality_required || 0.5;
      context.noise_level = scene.context_rules.noise_level || 0.5;
    }

    return context;
  }

  /**
   * Check responses for contradictions
   */
  static validateGroupCoherence(responses) {
    if (responses.length < 2) return true;

    const issues = [];

    // Check for direct contradictions in facts
    for (let i = 0; i < responses.length; i++) {
      for (let j = i + 1; j < responses.length; j++) {
        const contradiction = this.detectContradiction(
          responses[i].response,
          responses[j].response
        );
        
        if (contradiction) {
          issues.push({
            type: 'contradiction',
            between: [responses[i].characterName, responses[j].characterName],
            detail: contradiction
          });
        }
      }
    }

    return issues.length === 0;
  }

  /**
   * Detect contradictions between two responses
   */
  static detectContradiction(response1, response2) {
    // Simple contradiction detection
    const negations = {
      'yes': 'no',
      'agree': 'disagree',
      'true': 'false',
      'correct': 'incorrect',
      'right': 'wrong'
    };

    const lower1 = response1.toLowerCase();
    const lower2 = response2.toLowerCase();

    for (const [word, opposite] of Object.entries(negations)) {
      if (lower1.includes(word) && lower2.includes(opposite)) {
        return `Potential contradiction: "${word}" vs "${opposite}"`;
      }
      if (lower1.includes(opposite) && lower2.includes(word)) {
        return `Potential contradiction: "${opposite}" vs "${word}"`;
      }
    }

    return null;
  }
}

module.exports = ResponsePlanner;
