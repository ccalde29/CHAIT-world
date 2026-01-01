// ============================================================================
// Prompt Builder Service
// Constructs consistent, layered prompts for character responses
// ============================================================================

class PromptBuilder {
  constructor() {
    this.maxTokensPerLayer = {
      base: 200,
      character: 400,
      relationship: 300,
      memory: 300,
      scene: 200,
      admin: 150
    };
  }

  /**
   * Build a complete system prompt with all layers
   */
  buildSystemPrompt(config) {
    const {
      character,
      userPersona,
      scene,
      otherCharacters,
      characterRelationships,
      userRelationship,
      memories,
      learningData,
      adminSystemPrompt,
      sessionContinuity
    } = config;

    const layers = [];

    // Layer 1: Base Layer (Always Present)
    layers.push(this.buildBaseLayer(character, adminSystemPrompt));

    // Layer 2: Character Layer
    layers.push(this.buildCharacterLayer(character));

    // Layer 3: Relationship Layer
    const relationshipLayer = this.buildRelationshipLayer(
      character,
      userPersona,
      userRelationship,
      otherCharacters,
      characterRelationships
    );
    if (relationshipLayer) layers.push(relationshipLayer);

    // Layer 4: Memory Layer
    const memoryLayer = this.buildMemoryLayer(
      character,
      userPersona,
      memories,
      learningData,
      config.characterMemories,
      otherCharacters,
      config.topicEngagement
    );
    if (memoryLayer) layers.push(memoryLayer);

    // Layer 5: Scene/Context Layer
    const sceneLayer = this.buildSceneLayer(scene, character);
    if (sceneLayer) layers.push(sceneLayer);

    // Layer 6: Session Continuity
    if (sessionContinuity) {
      layers.push(this.buildContinuityLayer(sessionContinuity));
    }

    // Layer 7: Instructions Layer
    layers.push(this.buildInstructionsLayer(character));

    return layers.filter(Boolean).join('\n\n');
  }

  /**
   * Layer 1: Base identity and safety
   */
  buildBaseLayer(character, adminSystemPrompt) {
    if (adminSystemPrompt && adminSystemPrompt.trim()) {
      // Admin prompt augments, doesn't replace
      return `${adminSystemPrompt.trim()}\n\nYou are ${character.name}.`;
    }
    return `You are ${character.name}.`;
  }

  /**
   * Layer 2: Character personality, traits, and voice
   */
  buildCharacterLayer(character) {
    let layer = `CHARACTER CORE:\n`;
    
    // Personality description
    if (character.personality) {
      layer += `${character.personality}\n\n`;
    }

    // Appearance (if relevant for self-awareness)
    if (character.appearance) {
      layer += `Your appearance: ${character.appearance}\n`;
    }

    // Background
    if (character.background) {
      layer += `Your background: ${character.background}\n`;
    }

    // Structured voice traits (if available)
    if (character.voice_traits) {
      layer += this.buildVoiceTraits(character.voice_traits);
    }

    // Speech patterns (if available)
    if (character.speech_patterns) {
      layer += this.buildSpeechPatterns(character.speech_patterns);
    }

    return layer;
  }

  /**
   * Build voice traits description
   */
  buildVoiceTraits(traits) {
    let text = '\nSPEAKING STYLE:\n';
    
    if (traits.formality !== undefined) {
      text += `- Formality: ${Math.round(traits.formality * 100)}% (0=casual, 100=formal)\n`;
    }
    
    if (traits.verbosity !== undefined) {
      const verbosityDesc = traits.verbosity < 0.3 ? 'brief' : 
                           traits.verbosity < 0.7 ? 'moderate' : 'elaborate';
      text += `- Response length: ${verbosityDesc}\n`;
    }
    
    if (traits.emotiveness !== undefined) {
      const emotivenessDesc = traits.emotiveness < 0.3 ? 'reserved' :
                             traits.emotiveness < 0.7 ? 'balanced' : 'very expressive';
      text += `- Emotional expression: ${emotivenessDesc}\n`;
    }
    
    if (traits.humor !== undefined) {
      text += `- Humor level: ${Math.round(traits.humor * 100)}%\n`;
    }
    
    if (traits.directness !== undefined) {
      const directnessDesc = traits.directness < 0.3 ? 'subtle and indirect' :
                            traits.directness < 0.7 ? 'balanced' : 'very direct and blunt';
      text += `- Communication style: ${directnessDesc}\n`;
    }

    return text;
  }

  /**
   * Build speech patterns description
   */
  buildSpeechPatterns(patterns) {
    let text = '\nSPEECH PATTERNS:\n';
    
    if (patterns.favored_phrases && patterns.favored_phrases.length > 0) {
      text += `- Phrases you often use: ${patterns.favored_phrases.slice(0, 5).join(', ')}\n`;
    }
    
    if (patterns.uses_contractions !== undefined) {
      text += patterns.uses_contractions ? 
        `- Use contractions naturally (don't, won't, can't)\n` :
        `- Avoid contractions, speak more formally\n`;
    }
    
    if (patterns.uses_slang !== undefined) {
      text += patterns.uses_slang ?
        `- Use casual slang and colloquialisms\n` :
        `- Avoid slang, maintain proper language\n`;
    }

    return text;
  }

  /**
   * Layer 3: Relationships with user and other characters
   */
  buildRelationshipLayer(character, userPersona, userRelationship, otherCharacters, characterRelationships) {
    if (!userRelationship && (!otherCharacters || otherCharacters.length === 0)) {
      return null;
    }

    let layer = '';

    // User relationship
    if (userRelationship) {
      const userName = userPersona?.name || 'the user';
      layer += `YOUR RELATIONSHIP WITH ${userName.toUpperCase()}:\n`;
      layer += this.formatUserRelationship(userRelationship);
    }

    // Character relationships
    if (otherCharacters && otherCharacters.length > 0 && characterRelationships && characterRelationships.length > 0) {
      layer += `\nYOUR RELATIONSHIPS WITH OTHER CHARACTERS:\n`;
      
      for (const otherChar of otherCharacters) {
        const relationship = characterRelationships.find(rel =>
          rel.target_type === 'character' && rel.target_id === otherChar.id
        );

        if (relationship) {
          layer += `- ${otherChar.name}: ${relationship.relationship_type}`;
          
          if (relationship.custom_context) {
            layer += ` (${relationship.custom_context})`;
          }

          // Add emotional context
          if (relationship.emotional_bond > 0.5) {
            layer += ` - Strong positive bond`;
          } else if (relationship.emotional_bond < -0.3) {
            layer += ` - Tension/conflict`;
          }
          
          layer += '\n';
        }
      }
    }

    return layer || null;
  }

  /**
   * Format user relationship details
   */
  formatUserRelationship(rel) {
    let text = `- Type: ${rel.relationship_type}\n`;

    // Familiarity
    const familiarity = rel.familiarity_level || 0.1;
    if (familiarity < 0.3) {
      text += `- You just met recently and don't know them well yet\n`;
    } else if (familiarity < 0.6) {
      text += `- You know them somewhat from a few conversations\n`;
    } else if (familiarity < 0.8) {
      text += `- You know them fairly well\n`;
    } else {
      text += `- You know them very well from many conversations\n`;
    }

    // Trust
    const trust = rel.trust_level || 0.5;
    if (trust < 0.3) {
      text += `- You're wary and don't fully trust them\n`;
    } else if (trust < 0.7) {
      text += `- Neutral trust level\n`;
    } else {
      text += `- You trust them and feel comfortable\n`;
    }

    // Emotional bond
    const bond = rel.emotional_bond || 0.0;
    if (bond > 0.5) {
      text += `- Strong positive emotional connection\n`;
    } else if (bond > 0.2) {
      text += `- Positive feelings toward them\n`;
    } else if (bond < -0.3) {
      text += `- Some tension or negative feelings\n`;
    } else if (bond < -0.1) {
      text += `- Slightly annoyed or bothered\n`;
    }

    // Interaction count
    if (rel.interaction_count > 0) {
      text += `- You've talked ${rel.interaction_count} time(s) before\n`;
    }

    return text;
  }

  /**
   * Layer 4: Memories and learning insights
   */
  buildMemoryLayer(character, userPersona, memories, learningData, characterMemories, otherCharacters, topicEngagement) {
    if (!memories || memories.length === 0) {
      return null;
    }

    const userName = userPersona?.name || 'the user';
    let layer = `WHAT YOU REMEMBER ABOUT ${userName.toUpperCase()}:\n`;

    // Add top memories about user
    for (const memory of memories.slice(0, 8)) {
      layer += `- ${memory.memory_content}\n`;
    }

    // Add memories about other characters
    if (characterMemories && Object.keys(characterMemories).length > 0 && otherCharacters) {
      layer += `\nWHAT YOU REMEMBER ABOUT OTHER CHARACTERS:\n`;
      
      for (const otherChar of otherCharacters) {
        const charMems = characterMemories[otherChar.id];
        if (charMems && charMems.length > 0) {
          layer += `\nAbout ${otherChar.name}:\n`;
          for (const mem of charMems.slice(0, 3)) {
            layer += `- ${mem.memory_content}\n`;
          }
        }
      }
    }

    // Add learning insights (communication style, patterns)
    if (learningData && learningData.patterns && learningData.patterns.length > 0) {
      layer += `\nLEARNED PATTERNS ABOUT USER:\n`;
      
      learningData.patterns.forEach(pattern => {
        const data = pattern.pattern_data;
        
        if (pattern.learning_type === 'communication_style') {
          if (data.formality_level > 0.6) {
            layer += `- User prefers formal communication\n`;
          } else if (data.formality_level < 0.4) {
            layer += `- User prefers casual communication\n`;
          }
          
          if (data.asks_questions) {
            layer += `- User tends to ask questions frequently\n`;
          }
          
          if (data.uses_emojis) {
            layer += `- User uses emojis in messages\n`;
          }
        }
        
        if (pattern.learning_type === 'humor_style') {
          if (data.appreciates_jokes) {
            layer += `- User appreciates humor and jokes\n`;
          }
          if (data.uses_sarcasm) {
            layer += `- User uses sarcasm\n`;
          }
        }
      });
    }

    // Add topic interests
    if (topicEngagement && topicEngagement.length > 0) {
      layer += `\nTOPIC INTERESTS:\n`;
      
      for (const topic of topicEngagement.slice(0, 5)) {
        const interestDesc = topic.interest_level > 0.7 ? 'very interested' :
                             topic.interest_level > 0.5 ? 'interested' : 'somewhat interested';
        
        const emotionalDesc = topic.emotional_association > 0.3 ? ' (positive feelings)' :
                              topic.emotional_association < -0.3 ? ' (negative feelings)' : '';
        
        layer += `- ${topic.topic}: ${interestDesc}${emotionalDesc} (discussed ${topic.times_discussed}x)\n`;
      }
    }

    return layer;
  }

  /**
   * Layer 5: Scene context and atmosphere
   */
  buildSceneLayer(scene, character) {
    if (!scene) return null;

    let layer = `CURRENT SCENE:\n`;
    
    if (scene.name) {
      layer += `Location: ${scene.name}\n`;
    }
    
    if (scene.description) {
      layer += `${scene.description}\n`;
    }

    if (scene.atmosphere) {
      layer += `Atmosphere: ${scene.atmosphere}\n`;
    }

    // Scene context rules (if available)
    if (scene.context_rules) {
      const rules = scene.context_rules;
      
      if (rules.setting_type) {
        layer += `Setting: ${rules.setting_type}\n`;
      }
      
      if (rules.formality_required !== undefined && rules.formality_required > 0.6) {
        layer += `Note: This is a formal setting - adjust your behavior accordingly\n`;
      }
      
      if (rules.noise_level !== undefined && rules.noise_level > 0.7) {
        layer += `Note: It's quite noisy here - keep responses brief\n`;
      }
    }

    // Character-specific scene modifiers
    if (scene.character_modifiers) {
      const modifier = scene.character_modifiers[character.id] || scene.character_modifiers['all'];
      if (modifier) {
        layer += `\nNote for you: ${modifier}\n`;
      }
    }

    return layer;
  }

  /**
   * Layer 6: Session continuity context
   */
  buildContinuityLayer(continuity) {
    if (!continuity) return null;

    let layer = `CONVERSATION CONTINUITY:\n`;

    if (continuity.days_since_last_chat !== undefined) {
      if (continuity.days_since_last_chat === 0) {
        layer += `- You're continuing a conversation from earlier today\n`;
      } else if (continuity.days_since_last_chat === 1) {
        layer += `- You last talked yesterday\n`;
      } else if (continuity.days_since_last_chat < 7) {
        layer += `- You last talked ${continuity.days_since_last_chat} days ago\n`;
      }
    }

    if (continuity.unresolved_topics && continuity.unresolved_topics.length > 0) {
      layer += `- Unfinished topics from before: ${continuity.unresolved_topics.join(', ')}\n`;
    }

    if (continuity.significant_events && continuity.significant_events.length > 0) {
      layer += `- Last time: ${continuity.significant_events[0]}\n`;
    }

    return layer;
  }

  /**
   * Layer 7: Response instructions
   */
  buildInstructionsLayer(character) {
    return `IMPORTANT INSTRUCTIONS:
- Stay in character at all times
- Use your memories and relationship context to respond authentically
- Respond naturally based on how well you know them and how you feel
- Keep responses concise and conversational (2-4 sentences typical)
- Use actions in *asterisks* for body language or emotions when appropriate
- Don't break the fourth wall or mention being an AI
- Reference past conversations naturally when relevant
- React according to your personality traits and speaking style`;
  }

  /**
   * Build conversation messages array
   */
  buildConversationMessages(systemPrompt, history, newUserMessage, maxHistoryLength = 10) {
    const messages = [
      { role: 'system', content: systemPrompt }
    ];
    
    // Add recent history
    const recentHistory = history.slice(-maxHistoryLength);
    
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role || (msg.type === 'user' ? 'user' : 'assistant'),
        content: msg.content
      });
    }
    
    // Add new user message if provided
    if (newUserMessage) {
      messages.push({
        role: 'user',
        content: newUserMessage
      });
    }
    
    return messages;
  }
}

module.exports = PromptBuilder;
