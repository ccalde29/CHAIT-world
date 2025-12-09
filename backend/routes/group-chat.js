// ============================================================================
// CHAIT World - Enhanced Group Chat Endpoint (v3.0)
// Layered prompts, multi-character planning, and consistency improvements
// ============================================================================

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const AIProviderService = require('../services/AIProviderService');
const { aiCallLimiter } = require('../middleware/rateLimiter');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Core services
const MemoryService = require('../services/MemoryService');
const CharacterLearningService = require('../services/CharacterLearningService');

// New consistency services
const PromptBuilder = require('../services/PromptBuilder');
const ProviderAdapter = require('../services/ProviderAdapter');
const ConversationStateTracker = require('../services/ConversationStateTracker');
const ResponsePlanner = require('../services/ResponsePlanner');
const MemoryRelevanceService = require('../services/MemoryRelevanceService');
const SessionContinuityService = require('../services/SessionContinuityService');

const memoryService = new MemoryService(supabase);
const learningService = new CharacterLearningService(supabase);
const promptBuilder = new PromptBuilder();
const conversationTracker = new ConversationStateTracker();
const sessionContinuity = new SessionContinuityService(supabase);

/**
 * POST /api/chat/group-response
 * Simplified group chat with core decision logic
 */
router.post('/group-response', aiCallLimiter, async (req, res) => {
  try {
    const {
      userMessage,
      conversationHistory,
      activeCharacters,
      sessionId,
      userPersona,
      currentScene
    } = req.body;

    const userId = req.headers['user-id'];

    if (!userId || !userMessage || !activeCharacters || activeCharacters.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log(`[Group Chat v2.0] Processing for ${activeCharacters.length} characters`);

    // ========================================================================
    // STEP 0: CREATE OR USE EXISTING SESSION
    // ========================================================================

    let activeSessionId = sessionId;

    // If no session provided, create a new one
    if (!activeSessionId) {
      const { data: newSession, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: userId,
          scenario_id: currentScene || 'default',
          active_characters: activeCharacters,
          title: currentScene ? `Chat in ${currentScene}` : 'New Chat',
          group_mode: 'natural'
        })
        .select()
        .single();

      if (sessionError) {
        console.error('[Session] Error creating session:', sessionError);
        return res.status(500).json({ error: 'Failed to create chat session' });
      }

      activeSessionId = newSession.id;
      console.log(`[Session] Created new session: ${activeSessionId}`);
    } else {
      console.log(`[Session] Using existing session: ${activeSessionId}`);
    }

    // Save user message to database
    await supabase
      .from('messages')
      .insert({
        session_id: activeSessionId,
        type: 'user',
        content: userMessage
      });

    // Update message count
    const { data: session } = await supabase
      .from('chat_sessions')
      .select('message_count')
      .eq('id', activeSessionId)
      .single();

    await supabase
      .from('chat_sessions')
      .update({
        message_count: (session?.message_count || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', activeSessionId);

    console.log(`[Session] Saved user message to session ${activeSessionId}`);

    // ========================================================================
    // STEP 1: LOAD CHARACTER DATA
    // ========================================================================
    
    const { data: characters, error: charError } = await supabase
      .from('characters')
      .select('*')
      .in('id', activeCharacters);
    
    if (charError || !characters || characters.length === 0) {
      return res.status(500).json({ error: 'Failed to load character data' });
    }
    
    // ========================================================================
    // STEP 2: LOAD USER SETTINGS & SCENE DATA
    // ========================================================================

    const { data: userSettings, error: settingsError } = await supabase
      .from('user_settings')
      .select('api_keys, ollama_settings, admin_system_prompt')
      .eq('user_id', userId)
      .single();

    const apiKeys = userSettings?.api_keys || {
      openai: null,
      anthropic: null,
      openrouter: null,
      google: null
    };

    const ollamaSettings = userSettings?.ollama_settings || {
      baseUrl: 'http://localhost:11434'
    };

    const adminSystemPrompt = userSettings?.admin_system_prompt || null;

    // Load scene data with context rules
    let sceneData = null;
    if (currentScene) {
      const { data: scene } = await supabase
        .from('scenarios')
        .select('*')
        .eq('id', currentScene)
        .single();
      sceneData = scene;
    }

    // ========================================================================
    // STEP 3: ANALYZE CONTEXT & PLAN RESPONSES
    // ========================================================================

    // Update conversation state
    conversationTracker.updateState(
      { content: userMessage, type: 'user' },
      null,
      conversationHistory
    );

    // Analyze conversation context
    const context = ProviderAdapter.analyzeContext(
      conversationHistory,
      characters,
      sceneData
    );

    // Plan which characters should respond
    const responsePlan = ResponsePlanner.planGroupResponse(
      userMessage,
      characters,
      conversationHistory,
      conversationTracker
    );

    console.log(`[Planning] ${responsePlan.responders.length} character(s) will respond`);

    const respondingCharacters = responsePlan.responders;

    // ========================================================================
    // STEP 4: LOAD CONTEXT DATA FOR RESPONDING CHARACTERS
    // ========================================================================

    const characterDataMap = new Map();

    for (const char of respondingCharacters) {
      try {
        const charData = {};

        // Load relationships
        const { data: allRelationships } = await supabase
          .from('character_relationships')
          .select('*')
          .eq('character_id', char.id)
          .eq('user_id', userId);

        charData.characterRelationships = allRelationships?.filter(r => r.target_type === 'character') || [];
        charData.userRelationship = allRelationships?.find(r => r.target_type === 'user' && r.target_id === userId) || {
          relationship_type: 'acquaintance',
          trust_level: 0.5,
          familiarity_level: 0.1,
          emotional_bond: 0.0,
          interaction_count: 0
        };

        // Load relevant memories using new relevance scoring
        if (char.memory_enabled !== false) {
          charData.memories = await MemoryRelevanceService.getRelevantMemories(
            memoryService,
            char.id,
            userId,
            userMessage,
            context,
            8
          );
        } else {
          charData.memories = [];
        }

        // Load learning data
        charData.learningData = await learningService.getCharacterLearning(userId, char.id);

        // Load session continuity
        charData.continuity = await sessionContinuity.loadContinuityContext(
          char.id,
          userId,
          activeSessionId
        );

        characterDataMap.set(char.id, charData);

      } catch (error) {
        console.error(`[Data Loading] Error for ${char.name}:`, error);
        // Set defaults
        characterDataMap.set(char.id, {
          characterRelationships: [],
          userRelationship: {
            relationship_type: 'acquaintance',
            trust_level: 0.5,
            familiarity_level: 0.1,
            emotional_bond: 0.0,
            interaction_count: 0
          },
          memories: [],
          learningData: null,
          continuity: null
        });
      }
    }

    // ========================================================================
    // STEP 5: GENERATE RESPONSES WITH NEW ARCHITECTURE
    // ========================================================================

    const responses = [];
    const otherCharacters = characters.filter(c => 
      !respondingCharacters.find(rc => rc.id === c.id)
    );

    for (let index = 0; index < respondingCharacters.length; index++) {
      const char = respondingCharacters[index];
      const isPrimary = index === 0;
      const charData = characterDataMap.get(char.id);

      try {
        // Build conversation history with previous responses
        let updatedHistory = conversationHistory;
        if (index > 0) {
          updatedHistory = [
            ...conversationHistory,
            { role: 'user', content: userMessage }
          ];

          for (let i = 0; i < index; i++) {
            updatedHistory.push({
              role: 'assistant',
              content: `[${respondingCharacters[i].name}]: ${responses[i].response}`
            });
          }
        }

        // Build character-specific context
        const charContext = ResponsePlanner.buildCharacterContext(
          char,
          responsePlan,
          conversationTracker,
          sceneData
        );

        // Add user relationship familiarity to context
        charContext.user_familiarity = charData.userRelationship.familiarity_level || 0.1;
        charContext.turn_number = conversationHistory.length;

        // Build layered system prompt
        const systemPrompt = promptBuilder.buildSystemPrompt({
          character: char,
          userPersona,
          scene: sceneData,
          otherCharacters,
          characterRelationships: charData.characterRelationships,
          userRelationship: charData.userRelationship,
          memories: charData.memories,
          learningData: charData.learningData,
          adminSystemPrompt,
          sessionContinuity: charData.continuity
        });

        // Adapt prompt for provider
        const adaptedPrompt = ProviderAdapter.adaptPrompt(
          systemPrompt,
          char.ai_provider || 'openai',
          char
        );

        // Build conversation messages
        const messages = promptBuilder.buildConversationMessages(
          adaptedPrompt,
          updatedHistory,
          isPrimary ? userMessage : null
        );

        // Calculate dynamic temperature and token budget
        const dynamicTemp = ProviderAdapter.calculateDynamicTemperature(char, charContext);
        const tokenBudget = ProviderAdapter.calculateResponseBudget(char, charContext);

        console.log(`[Response] ${char.name} - Temp: ${dynamicTemp.toFixed(2)}, Tokens: ${tokenBudget}`);

        // Generate response with adjusted character settings
        const adjustedChar = {
          ...char,
          temperature: dynamicTemp,
          max_tokens: tokenBudget
        };

        const rawResponse = await AIProviderService.generateResponse(
          adjustedChar,
          messages,
          apiKeys,
          ollamaSettings
        );

        // Normalize response
        const response = ProviderAdapter.normalizeResponse(
          rawResponse,
          char,
          char.ai_provider || 'openai'
        );

        // Save to database with metadata
        await supabase
          .from('messages')
          .insert({
            session_id: activeSessionId,
            type: 'character',
            character_id: char.id,
            content: response,
            is_primary_response: isPrimary,
            response_metadata: {
              temperature_used: dynamicTemp,
              tokens_used: tokenBudget,
              provider: char.ai_provider || 'openai',
              model: char.ai_model || 'gpt-3.5-turbo'
            }
          });

        // Update conversation state
        conversationTracker.updateState(
          { content: response, type: 'character' },
          char,
          [...conversationHistory, { content: userMessage, type: 'user' }]
        );

        responses.push({
          character: char.id,
          characterName: char.name,
          response: response,
          timestamp: new Date().toISOString(),
          delay: index * 1200,
          isPrimary: isPrimary
        });

        // Process memories and relationships
        try {
          const newMemories = memoryService.analyzeConversationForMemories(
            userMessage,
            response,
            userPersona,
            userId
          );

          for (const mem of newMemories) {
            await memoryService.addCharacterMemory(char.id, userId, mem);
          }

          const currentRelationship = await memoryService.getCharacterRelationship(char.id, userId);
          const relationshipUpdate = memoryService.calculateRelationshipUpdate(
            currentRelationship,
            userMessage,
            response
          );

          await memoryService.updateCharacterRelationship(char.id, userId, relationshipUpdate);
        } catch (memErr) {
          console.error(`[Memory] Error for ${char.name}:`, memErr);
        }

        // Track learning
        try {
          await learningService.recordInteraction(userId, char.id);
          
          const topicKeywords = extractTopicsFromText(userMessage + ' ' + response);
          for (const topic of topicKeywords) {
            await learningService.addTopicDiscussed(userId, char.id, topic);
          }
        } catch (learnErr) {
          console.error(`[Learning] Error for ${char.name}:`, learnErr);
        }

        console.log(`[Response] ${char.name}: "${response.substring(0, 80)}..."`);

      } catch (error) {
        console.error(`[Response] Error for ${char.name}:`, error);
        if (isPrimary) {
          responses.push({
            character: char.id,
            characterName: char.name,
            response: "Sorry, I'm having trouble responding right now...",
            timestamp: new Date().toISOString(),
            delay: index * 1200,
            error: true
          });
        }
      }
    }

    // ========================================================================
    // STEP 6: VALIDATE COHERENCE & RETURN RESPONSES
    // ========================================================================

    // Validate group coherence
    const isCoherent = ResponsePlanner.validateGroupCoherence(responses);
    if (!isCoherent) {
      console.log('[Coherence] Warning: Potential contradictions detected in responses');
    }

    // Store session metadata for continuity
    const conversationSummary = conversationTracker.getSummary();
    await sessionContinuity.storeSessionMetadata(activeSessionId, {
      tone: conversationSummary.mood,
      key_topics: conversationSummary.active_topics,
      message_count: conversationHistory.length + responses.length
    });

    console.log(`[Group Chat v3.0] Generated ${responses.length} responses`);

    res.json({
      sessionId: activeSessionId,
      responses
    });
    
  } catch (error) {
    console.error('[Group Chat v3.0] Error:', error);
    res.status(500).json({
      error: 'Failed to generate group response',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================================================
// HELPER FUNCTIONS (Legacy - kept for backward compatibility)
// ============================================================================

function extractTopicsFromText(text) {
  const commonWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'am', 'is', 'are', 'was',
    'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can',
    'this', 'that', 'these', 'those', 'what', 'which', 'who', 'when', 'where',
    'why', 'how', 'my', 'your', 'his', 'her', 'its', 'our', 'their'
  ]);

  const words = text.toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(word =>
      word.length > 3 &&
      !commonWords.has(word) &&
      !/^\d+$/.test(word)
    );

  const frequency = {};
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });

  const topics = Object.entries(frequency)
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);

  return topics;
}

module.exports = router;
    const userName = userPersona?.name || 'the user';
    prompt += `YOUR RELATIONSHIP WITH ${userName.toUpperCase()}:\n`;

    // Describe relationship type
    prompt += `- Relationship: ${userRelationship.relationship_type}\n`;

    // Describe familiarity level
    const familiarity = userRelationship.familiarity_level || 0.1;
    if (familiarity < 0.3) {
      prompt += `- You just met them recently and don't know them well yet\n`;
    } else if (familiarity < 0.6) {
      prompt += `- You know them somewhat and have talked a few times\n`;
    } else if (familiarity < 0.8) {
      prompt += `- You know them fairly well from multiple conversations\n`;
    } else {
      prompt += `- You know them very well and have had many deep conversations\n`;
    }

    // Describe trust level
    const trust = userRelationship.trust_level || 0.5;
    if (trust < 0.3) {
      prompt += `- You're wary and don't fully trust them\n`;
    } else if (trust < 0.7) {
      prompt += `- You have a neutral level of trust\n`;
    } else {
      prompt += `- You trust them and feel comfortable around them\n`;
    }

    // Describe emotional bond
    const bond = userRelationship.emotional_bond || 0.0;
    if (bond > 0.5) {
      prompt += `- You have a strong positive emotional connection with them\n`;
    } else if (bond > 0.2) {
      prompt += `- You feel positively toward them\n`;
    } else if (bond < -0.3) {
      prompt += `- You have some tension or negative feelings toward them\n`;
    } else if (bond < -0.1) {
      prompt += `- You feel slightly annoyed or bothered by them\n`;
    }

    // Add interaction history context
    if (userRelationship.interaction_count > 0) {
      prompt += `- You've talked ${userRelationship.interaction_count} time(s) before\n`;
    }

    prompt += `\n`;
  }

  // Add character memories
  if (memories && memories.length > 0) {
    const userName = userPersona?.name || 'the user';
    prompt += `WHAT YOU REMEMBER ABOUT ${userName.toUpperCase()}:\n`;

    // Sort by importance and take top memories
    const sortedMemories = [...memories]
      .sort((a, b) => (b.importance_score || 0) - (a.importance_score || 0))
      .slice(0, 8);

    for (const memory of sortedMemories) {
      prompt += `- ${memory.memory_content}\n`;
    }

    prompt += `\n`;
  }

  // Add learning data (topics discussed)
  if (learningData && learningData.topics_discussed && learningData.topics_discussed.length > 0) {
    prompt += `TOPICS YOU'VE DISCUSSED TOGETHER:\n`;

    // Sort by count and show top topics
    const topTopics = [...learningData.topics_discussed]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topicsList = topTopics.map(t => t.topic).join(', ');
    prompt += `${topicsList}\n\n`;
  }

  if (userPersona) {
    const personaDescription = userPersona.personality || userPersona.description || '';
    const personaName = userPersona.name || 'the user';
    prompt += `ABOUT ${personaName.toUpperCase()}:\n${personaDescription}\n\n`;
  }

  if (currentScene) {
    prompt += `CURRENT SCENE:\n${currentScene.description}\n\n`;
  }

  // Add bot-to-bot relationship context
  if (otherCharacters && otherCharacters.length > 0 && characterRelationships && characterRelationships.length > 0) {
    prompt += `YOUR RELATIONSHIPS WITH OTHER CHARACTERS:\n`;

    for (const otherChar of otherCharacters) {
      const relationship = characterRelationships.find(rel =>
        rel.target_type === 'character' && rel.target_id === otherChar.id
      );

      if (relationship) {
        prompt += `- ${otherChar.name}: ${relationship.relationship_type}`;

        if (relationship.custom_context) {
          prompt += ` (${relationship.custom_context})`;
        }

        // Add emotional context based on bond strength
        if (relationship.emotional_bond > 0.5) {
          prompt += ` - You have a strong positive bond with them`;
        } else if (relationship.emotional_bond < -0.3) {
          prompt += ` - You have tension or conflict with them`;
        }

        prompt += `\n`;
      }
    }

    prompt += `\n`;
  }

  prompt += `IMPORTANT INSTRUCTIONS:
- Stay in character at all times
- Use your memories and knowledge of them to respond authentically
- Respond naturally and conversationally based on your relationship
- Keep responses concise (2-4 sentences typical)
- Use actions in *asterisks* to show body language or emotions
- Don't break the fourth wall or mention being an AI
- Reference past conversations naturally when relevant
- React based on how well you know them and how you feel about them`;

  return prompt;
}

function buildConversationMessages(systemPrompt, history, newUserMessage) {
  const messages = [
    { role: 'system', content: systemPrompt }
  ];
  
  // Add recent history (last 10 messages)
  const recentHistory = history.slice(-10);
  
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

/**
 * Extract topics from conversation text
 * Simple keyword extraction for tracking discussed topics
 */
function extractTopicsFromText(text) {
  // Remove common words and extract meaningful keywords
  const commonWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'am', 'is', 'are', 'was',
    'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can',
    'this', 'that', 'these', 'those', 'what', 'which', 'who', 'when', 'where',
    'why', 'how', 'my', 'your', 'his', 'her', 'its', 'our', 'their'
  ]);

  // Extract words
  const words = text.toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(word =>
      word.length > 3 &&
      !commonWords.has(word) &&
      !/^\d+$/.test(word)
    );

  // Count frequency
  const frequency = {};
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });

  // Get top topics (words mentioned at least twice)
  const topics = Object.entries(frequency)
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);

  return topics;
}

module.exports = router;
