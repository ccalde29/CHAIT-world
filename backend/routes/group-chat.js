// ============================================================================
// CHAIT World - Enhanced Group Chat Endpoint (v3.0)
// Layered prompts, multi-character planning, and consistency improvements
// ============================================================================

const express = require('express');
const AIProviderService = require('../services/AIProviderService');
const { aiCallLimiter } = require('../middleware/rateLimiter');
const { createClient } = require('@supabase/supabase-js');

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

// Export function that accepts db parameter
module.exports = (db) => {
  const router = express.Router();
  
  // Initialize Supabase for community features (memory, learning, relationships)
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
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
      const newSession = await db.createChatSession(userId, {
        scenario_id: currentScene || 'default',
        active_characters: activeCharacters,
        title: currentScene ? `Chat in ${currentScene}` : 'New Chat',
        group_mode: 'natural'
      });

      activeSessionId = newSession.id;
      console.log(`[Session] Created new session: ${activeSessionId}`);
    } else {
      console.log(`[Session] Using existing session: ${activeSessionId}`);
    }

    // Save user message to database
    await db.saveChatMessage(activeSessionId, {
      type: 'user',
      content: userMessage
    });

    console.log(`[Session] Saved user message to session ${activeSessionId}`);

    // ========================================================================
    // STEP 1: LOAD CHARACTER DATA
    // ========================================================================
    
    const characterPromises = activeCharacters.map(charId => db.getCharacter(charId));
    const characters = (await Promise.all(characterPromises)).filter(char => char !== undefined);
    
    if (!characters || characters.length === 0) {
      return res.status(500).json({ error: 'Failed to load character data' });
    }
    
    // ========================================================================
    // STEP 2: LOAD USER SETTINGS & SCENE DATA
    // ========================================================================

    const userSettings = await db.getUserSettings(userId);

    const apiKeys = userSettings?.apiKeys || {
      openai: null,
      anthropic: null,
      openrouter: null,
      google: null
    };

    const ollamaSettings = userSettings?.ollamaSettings || {
      baseUrl: 'http://localhost:11434'
    };
    
    // Add LM Studio settings
    ollamaSettings.lmStudioSettings = userSettings?.lmStudioSettings || {
      baseUrl: 'http://127.0.0.1:1234'
    };

    const adminSystemPrompt = userSettings?.adminSystemPrompt || null;

    // Load scene data with context rules
    let sceneData = null;
    if (currentScene) {
      sceneData = await db.getScenario(userId, currentScene);
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

    // Limit to max 3 responding characters to prevent conversation breakdown
    const respondingCharacters = responsePlan.responders.slice(0, 3);

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
        await db.saveChatMessage(activeSessionId, {
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

  return router;
};
