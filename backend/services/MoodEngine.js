// ============================================================================
// CHAIT World - Mood Engine (v1.5)
// Manages character emotional states and mood transitions
// ============================================================================

/**
 * Mood Engine
 * Handles character emotional states that affect behavior without visible labels
 */
class MoodEngine {
  
  // ============================================================================
  // MOOD DEFINITIONS
  // ============================================================================
  
  static MOODS = {
    neutral: {
      name: 'neutral',
      baseline: 0.5,
      description: 'Balanced, default state'
    },
    excited: {
      name: 'excited',
      baseline: 0.7,
      description: 'Enthusiastic, energetic, might interrupt'
    },
    content: {
      name: 'content',
      baseline: 0.6,
      description: 'Relaxed, pleasant, comfortable'
    },
    annoyed: {
      name: 'annoyed',
      baseline: 0.6,
      description: 'Impatient, short responses, less engaged'
    },
    defensive: {
      name: 'defensive',
      baseline: 0.7,
      description: 'Guarded, justifies positions, combative'
    },
    sad: {
      name: 'sad',
      baseline: 0.5,
      description: 'Quieter, withdrawn, less engaged'
    }
  };
  
  // ============================================================================
  // TRIGGER PATTERNS
  // ============================================================================
  
  static TRIGGERS = {
    disagreement: {
      keywords: [
        'no', 'nope', 'nah', 'wrong', 'incorrect', 'disagree', 
        'won\'t work', 'can\'t', 'shouldn\'t', 'but', 'however',
        'actually', 'that\'s not', 'i don\'t think', 'doubt'
      ],
      transitions: {
        neutral: { target: 'annoyed', strength: 0.3 },
        excited: { target: 'annoyed', strength: 0.4 },
        content: { target: 'neutral', strength: 0.2 },
        annoyed: { target: 'annoyed', strength: 0.4 }, // Escalates
        defensive: { target: 'defensive', strength: 0.3 },
        sad: { target: 'sad', strength: 0.2 }
      }
    },
    
    agreement: {
      keywords: [
        'yes', 'yeah', 'yep', 'exactly', 'right', 'agree', 
        'you\'re right', 'good point', 'that\'s true', 'definitely',
        'absolutely', 'for sure', 'i think so too'
      ],
      transitions: {
        neutral: { target: 'content', strength: 0.2 },
        excited: { target: 'excited', strength: 0.2 },
        content: { target: 'content', strength: 0.1 },
        annoyed: { target: 'neutral', strength: 0.3 }, // Calms down
        defensive: { target: 'neutral', strength: 0.3 },
        sad: { target: 'neutral', strength: 0.2 }
      }
    },
    
    compliment: {
      keywords: [
        'great', 'amazing', 'awesome', 'perfect', 'brilliant',
        'love', 'wonderful', 'excellent', 'fantastic', 'impressive',
        'smart', 'clever', 'good job', 'well done', 'nice'
      ],
      transitions: {
        neutral: { target: 'content', strength: 0.4 },
        excited: { target: 'excited', strength: 0.3 },
        content: { target: 'content', strength: 0.2 },
        annoyed: { target: 'content', strength: 0.5 },
        defensive: { target: 'content', strength: 0.4 },
        sad: { target: 'content', strength: 0.5 }
      }
    },
    
    joke: {
      keywords: [
        'lol', 'lmao', 'haha', 'hehe', '*laugh', '*chuckle',
        'funny', 'hilarious', '😂', '🤣', 'joke'
      ],
      transitions: {
        neutral: { target: 'content', strength: 0.3 },
        excited: { target: 'excited', strength: 0.2 },
        content: { target: 'content', strength: 0.2 },
        annoyed: { target: 'neutral', strength: 0.5 }, // Resets tension
        defensive: { target: 'neutral', strength: 0.4 },
        sad: { target: 'neutral', strength: 0.3 }
      }
    },
    
    criticism: {
      keywords: [
        'bad', 'terrible', 'awful', 'hate', 'stupid', 'dumb',
        'ridiculous', 'nonsense', 'pointless', 'useless'
      ],
      transitions: {
        neutral: { target: 'defensive', strength: 0.4 },
        excited: { target: 'defensive', strength: 0.5 },
        content: { target: 'annoyed', strength: 0.3 },
        annoyed: { target: 'defensive', strength: 0.5 },
        defensive: { target: 'defensive', strength: 0.4 },
        sad: { target: 'sad', strength: 0.3 }
      }
    },
    
    sadness: {
      keywords: [
        'sad', 'depressed', 'upset', 'cry', 'hurt', 'pain',
        'disappointed', 'unhappy', 'miserable', 'sorry'
      ],
      transitions: {
        neutral: { target: 'sad', strength: 0.3 },
        excited: { target: 'neutral', strength: 0.3 },
        content: { target: 'neutral', strength: 0.2 },
        annoyed: { target: 'sad', strength: 0.3 },
        defensive: { target: 'sad', strength: 0.3 },
        sad: { target: 'sad', strength: 0.2 }
      }
    }
  };
  
  // ============================================================================
  // MOOD ANALYSIS
  // ============================================================================
  
  /**
   * Analyze message content and detect triggers
   * @param {string} message - The message to analyze
   * @returns {Array} - Array of detected triggers
   */
  static analyzeTriggers(message) {
    const messageLower = message.toLowerCase();
    const detectedTriggers = [];
    
    // Check each trigger type
    for (const [triggerType, triggerData] of Object.entries(this.TRIGGERS)) {
      // Check if any keywords match
      const matchedKeywords = triggerData.keywords.filter(keyword => 
        messageLower.includes(keyword.toLowerCase())
      );
      
      if (matchedKeywords.length > 0) {
        detectedTriggers.push({
          type: triggerType,
          keywords: matchedKeywords,
          strength: Math.min(matchedKeywords.length * 0.2, 1.0) // Multiple keywords = stronger
        });
      }
    }
    
    return detectedTriggers;
  }
  
  /**
   * Calculate new mood based on current state and triggers
   * @param {string} currentMood - Current mood state
   * @param {number} currentIntensity - Current mood intensity (0-1)
   * @param {Array} triggers - Detected triggers from message
   * @param {number} temperature - Character's temperature setting
   * @returns {Object} - New mood state { mood, intensity }
   */
  static calculateNewMood(currentMood, currentIntensity, triggers, temperature = 0.8) {
    if (triggers.length === 0) {
      // No triggers - natural decay toward neutral
      return this.applyMoodDecay(currentMood, currentIntensity);
    }
    
    // Apply strongest trigger
    const primaryTrigger = triggers.reduce((strongest, current) => 
      current.strength > strongest.strength ? current : strongest
    );
    
    const triggerData = this.TRIGGERS[primaryTrigger.type];
    const transition = triggerData.transitions[currentMood];
    
    if (!transition) {
      return { mood: currentMood, intensity: currentIntensity };
    }
    
    // Calculate new intensity
    // Temperature affects volatility (higher temp = bigger swings)
    const volatilityFactor = temperature * 1.2;
    const intensityChange = transition.strength * volatilityFactor * primaryTrigger.strength;
    
    let newIntensity = currentIntensity;
    
    // If changing moods, start at baseline
    if (transition.target !== currentMood) {
      newIntensity = this.MOODS[transition.target].baseline + intensityChange;
    } else {
      // Escalating same mood
      newIntensity = Math.min(currentIntensity + intensityChange, 1.0);
    }
    
    // Clamp intensity
    newIntensity = Math.max(0.0, Math.min(1.0, newIntensity));
    
    return {
      mood: transition.target,
      intensity: newIntensity
    };
  }
  
  /**
   * Apply natural mood decay toward neutral
   * @param {string} mood - Current mood
   * @param {number} intensity - Current intensity
   * @returns {Object} - Decayed mood state
   */
  static applyMoodDecay(mood, intensity) {
    if (mood === 'neutral') {
      return { mood, intensity: 0.5 };
    }
    
    // Decay rate: stronger emotions decay faster
    const decayRate = 0.1 * intensity;
    const newIntensity = Math.max(0.3, intensity - decayRate);
    
    // If intensity drops too low, return to neutral
    if (newIntensity < 0.4) {
      return { mood: 'neutral', intensity: 0.5 };
    }
    
    return { mood, intensity: newIntensity };
  }
  
  // ============================================================================
  // MOOD PROMPTS
  // ============================================================================
  
  /**
   * Build mood-specific prompt additions
   * CRITICAL: Never explicitly states the mood name
   * Shows mood through behavioral suggestions
   * @param {string} mood - Character's mood
   * @param {number} intensity - Mood intensity (0-1)
   * @param {Object} character - Character object
   * @returns {string} - Prompt additions
   */
  static buildMoodPrompt(mood, intensity, character) {
    // Don't add prompts for low-intensity neutral
    if (mood === 'neutral' && intensity < 0.6) {
      return '';
    }
    
    const intensityLevel = intensity > 0.7 ? 'strong' : 'moderate';
    const prompts = {
      excited: {
        moderate: `You're feeling energetic and enthusiastic right now. Show this through:
- Slightly faster, more animated responses
- Use of exclamation points occasionally
- Might jump in quickly when interested
- Positive, engaged tone`,
        strong: `You're very excited and energized! Express this naturally through:
- Quick, animated responses with energy
- Multiple exclamation points!
- Physical actions like *lights up*, *leans forward*, *grins*
- Might interrupt or speak without waiting for pause
- Highly engaged and enthusiastic tone`
      },
      
      content: {
        moderate: `You're feeling relaxed and pleasant. Show this through:
- Calm, comfortable responses
- Occasional *smiles* or *relaxes*
- Agreeable and easygoing tone
- Less reactive to minor annoyances`,
        strong: `You're very content and happy right now! Express this through:
- Warm, friendly responses
- Frequent smiles and positive actions (*beams*, *chuckles*)
- Very agreeable and supportive
- Visibly enjoying the conversation`
      },
      
      annoyed: {
        moderate: `You're somewhat annoyed. Show this subtly through:
- Shorter, more curt responses
- Less elaboration than usual
- Occasional *sighs* or *frowns*
- Slightly impatient tone
- Less engaged than normal`,
        strong: `You're quite annoyed! Express this clearly through:
- Very short, clipped responses
- Actions like *crosses arms*, *sighs heavily*, *rolls eyes*
- Impatient or sarcastic tone
- Minimal engagement
- Might say things like "whatever", "fine", or "sure"`
      },
      
      defensive: {
        moderate: `You're feeling defensive. Show this through:
- Justify or explain your position more
- Actions like *crosses arms*, *stiffens*
- Slight edge to your tone
- Push back on disagreement`,
        strong: `You're very defensive! Express this through:
- Strongly defend your position
- Actions like *stands firm*, *narrows eyes*
- Combative or argumentative tone
- Counter-arguments to criticism
- Phrases like "That's not fair" or "You don't understand"`
      },
      
      sad: {
        moderate: `You're feeling a bit down. Show this through:
- Quieter, more withdrawn responses
- Actions like *looks down*, *sighs softly*
- Less enthusiastic tone
- Shorter responses than usual`,
        strong: `You're quite sad. Express this through:
- Very quiet, withdrawn responses
- Actions like *looks away*, *voice wavers*, *wipes eyes*
- Melancholy or dejected tone
- Minimal responses
- Might express sadness with phrases like "I don't know..." or "It's fine..."`
      },
      
      neutral: {
        moderate: `You're in a balanced state. Respond naturally according to your personality.`,
        strong: ``
      }
    };
    
    const prompt = prompts[mood]?.[intensityLevel] || '';
    
    if (!prompt) return '';
    
    return `\n\n[CURRENT EMOTIONAL STATE - DO NOT MENTION THIS EXPLICITLY]\n${prompt}\n[Respond in character while naturally expressing these behaviors]`;
  }
  
  // ============================================================================
  // UTILITIES
  // ============================================================================
  
  /**
   * Get initial mood state for new session
   * @returns {Object} - Default mood state
   */
  static getDefaultMood() {
    return {
      mood: 'neutral',
      intensity: 0.5
    };
  }
  
  /**
   * Check if mood is strong enough to affect speaking priority
   * @param {string} mood - Mood state
   * @param {number} intensity - Mood intensity
   * @returns {number} - Priority modifier (-0.2 to +0.3)
   */
  static getMoodSpeakingModifier(mood, intensity) {
    // Excited characters more eager to speak
    if (mood === 'excited' && intensity > 0.6) {
      return 0.3 * intensity;
    }
    
    // Annoyed/defensive characters might jump in
    if ((mood === 'annoyed' || mood === 'defensive') && intensity > 0.7) {
      return 0.2 * intensity;
    }
    
    // Sad characters less likely to speak
    if (mood === 'sad' && intensity > 0.6) {
      return -0.2 * intensity;
    }
    
    return 0;
  }
}

module.exports = MoodEngine;