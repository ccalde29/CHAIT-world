// ============================================================================
// CHAIT World - Enhanced Group Chat Endpoint (v3.0)
// Layered prompts, multi-character planning, and consistency improvements
// ============================================================================

const express = require('express');
const AIProviderService = require('../services/AIProviderService');
const { aiCallLimiter } = require('../middleware/rateLimiter');
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
  
  const memoryService = new MemoryService(db);
  const learningService = new CharacterLearningService(db);
  const promptBuilder = new PromptBuilder();
  const conversationTracker = new ConversationStateTracker();
  const sessionContinuity = new SessionContinuityService(db);

  /**
   * Extract topics from text using keyword and phrase detection
   */
  function extractTopicsFromText(text, limit = 3) {
    const lower = text.toLowerCase();
    
    // Topic categories with keywords
    const topicMap = {
      'technology': ['computer', 'software', 'app', 'tech', 'code', 'program', 'ai', 'robot', 'internet', 'website'],
      'sports': ['football', 'soccer', 'basketball', 'game', 'sport', 'team', 'player', 'match', 'compete'],
      'music': ['song', 'music', 'band', 'concert', 'album', 'artist', 'sing', 'guitar', 'piano', 'listen'],
      'food': ['food', 'eat', 'cook', 'restaurant', 'meal', 'dish', 'recipe', 'hungry', 'taste', 'delicious'],
      'movies': ['movie', 'film', 'watch', 'cinema', 'actor', 'director', 'netflix', 'show', 'series'],
      'books': ['book', 'read', 'novel', 'author', 'story', 'chapter', 'library', 'write', 'reading'],
      'travel': ['travel', 'trip', 'vacation', 'visit', 'country', 'city', 'tourist', 'journey', 'explore'],
      'work': ['work', 'job', 'career', 'office', 'boss', 'project', 'meeting', 'business', 'professional'],
      'school': ['school', 'class', 'study', 'student', 'teacher', 'exam', 'homework', 'learn', 'education'],
      'family': ['family', 'parent', 'mom', 'dad', 'sibling', 'child', 'relative', 'brother', 'sister'],
      'relationships': ['love', 'relationship', 'boyfriend', 'girlfriend', 'date', 'partner', 'romance', 'friend'],
      'health': ['health', 'doctor', 'sick', 'medicine', 'hospital', 'exercise', 'fitness', 'wellness'],
      'politics': ['politics', 'government', 'election', 'president', 'vote', 'policy', 'law'],
      'science': ['science', 'research', 'experiment', 'theory', 'discovery', 'study', 'lab'],
      'art': ['art', 'paint', 'draw', 'artist', 'gallery', 'creative', 'design', 'sketch'],
      'gaming': ['game', 'play', 'gamer', 'console', 'video game', 'esports', 'gaming'],
      'fashion': ['fashion', 'clothes', 'style', 'outfit', 'wear', 'dress', 'shop', 'clothing'],
      'nature': ['nature', 'animal', 'plant', 'tree', 'forest', 'outdoor', 'wildlife', 'environment']
    };
    
    const detectedTopics = [];
    
    for (const [topic, keywords] of Object.entries(topicMap)) {
      const matchCount = keywords.filter(kw => lower.includes(kw)).length;
      if (matchCount > 0) {
        detectedTopics.push({ topic, score: matchCount });
      }
    }
    
    // Sort by score and return top topics
    return detectedTopics
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(t => t.topic);
  }

  /**
   * Detect emotion in text for topic association
   */
  function detectEmotionInText(text) {
    if (/\b(love|wonderful|amazing|great|excellent)\b/i.test(text)) return 0.5;
    if (/\b(hate|terrible|awful|horrible)\b/i.test(text)) return -0.5;
    return 0.0;
  }

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

    // ========================================================================
    // STEP 0: CREATE OR USE EXISTING SESSION
    // ========================================================================

    let activeSessionId = sessionId;

    // If no session provided, create a new one
    if (!activeSessionId) {
      // Get scenario name for better title
      let scenarioName = 'New Chat';
      if (currentScene) {
        const scenario = db.getScenario(currentScene);
        scenarioName = scenario ? `${scenario.name} - ${new Date().toLocaleDateString()}` : 'New Chat';
      }

      const newSession = await db.createChatSession(userId, {
        scenario_id: currentScene || 'default',
        active_characters: activeCharacters,
        title: scenarioName,
        group_mode: 'natural'
      });

      activeSessionId = newSession.id;
    } else {
    }

    // Save user message to database
    await db.saveChatMessage(activeSessionId, {
      type: 'user',
      content: userMessage
    });

    // ========================================================================
    // STEP 1: LOAD CHARACTER DATA
    // ========================================================================
    
    const characterPromises = activeCharacters.map(charId => db.getCharacter(charId));
    const characters = (await Promise.all(characterPromises)).filter(char => char != null); // Filters both null and undefined
    
    if (!characters || characters.length === 0) {
      console.error('[GroupChat] Failed to load characters. Active IDs:', activeCharacters);
      console.error('[GroupChat] Loaded characters:', characters);
      return res.status(500).json({ error: 'Failed to load character data. Characters may have been deleted.' });
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
        const allRelationships = db.localDb.all(
          'SELECT * FROM character_relationships WHERE character_id = ? AND user_id = ?',
          [char.id, userId]
        );

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
        
        // Load memories about other characters (from buildCharacterContext)
        if (charData.context && charData.context.characterMemories) {
          charData.characterMemories = charData.context.characterMemories;
        }
        
        // Load topic engagement
        charData.topicEngagement = db.getTopInterests(char.id, 5);

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
          sessionContinuity: charData.continuity,
          characterMemories: charData.characterMemories,
          topicEngagement: charData.topicEngagement
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

        const resolvedChar = { ...char, temperature: dynamicTemp, max_tokens: tokenBudget };

        const rawResponse = await AIProviderService.generateResponse(
          resolvedChar,
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
          // Check if AI memory extraction is enabled
          const useAIMemories = userSettings?.use_ai_memory_extraction || false;
          
          let newMemories;
          if (useAIMemories) {
            newMemories = await memoryService.extractMemoriesWithAI(
              userMessage,
              response,
              char,
              userPersona,
              userId,
              apiKeys
            );
          } else {
            newMemories = memoryService.analyzeConversationForMemories(
              userMessage,
              response,
              userPersona,
              userId
            );
          }

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
          
          // Store character-to-character memories
          const otherCharacterResponses = responses
            .filter(r => r.character !== char.id)
            .map(r => ({
              character: r.character,
              content: r.response
            }));
          
          if (otherCharacterResponses.length > 0) {
            const charactersMap = {};
            characters.forEach(c => { charactersMap[c.id] = c; });
            
            const charToCharMemories = memoryService.analyzeCharacterInteractions(
              char.id,
              otherCharacterResponses,
              charactersMap
            );
            
            for (const mem of charToCharMemories) {
              await memoryService.addCharacterMemory(char.id, userId, mem);
            }
          }
        } catch (memErr) {
          console.error(`[Memory] Error for ${char.name}:`, memErr);
        }

        // Track learning
        try {
          await learningService.recordInteraction(userId, char.id, {
            userMessage,
            characterResponse: response,
            userPersona
          });
          
          // Track topics discussed
          const topicKeywords = extractTopicsFromText(userMessage + ' ' + response);
          
          for (const topic of topicKeywords) {
            // Determine interest delta based on message length and engagement
            const interestDelta = response.length > 100 ? 0.15 : 0.05;
            
            // Determine emotional association
            const emotionalAssociation = detectEmotionInText(response);
            
            await db.createOrUpdateTopicEngagement(
              char.id,
              topic,
              interestDelta,
              emotionalAssociation
            );
          }
        } catch (learnErr) {
          console.error(`[Learning] Error for ${char.name}:`, learnErr);
        }

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

    // Store session metadata for continuity
    const conversationSummary = conversationTracker.getSummary();
    await sessionContinuity.storeSessionMetadata(activeSessionId, {
      tone: conversationSummary.mood,
      key_topics: conversationSummary.active_topics,
      message_count: conversationHistory.length + responses.length
    });

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
