// ============================================================================
// CHAIT World - Simplified Group Chat Endpoint (v2.0)
// Streamlined response generation with core decision logic
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
const MemoryService = require('../services/MemoryService');
const memoryService = new MemoryService(supabase);

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
    // STEP 2: LOAD USER SETTINGS (API KEYS)
    // ========================================================================
    
      const { data: userSettings, error: settingsError } = await supabase
        .from('user_settings')
        .select('api_keys, ollama_settings')
        .eq('user_id', userId)
        .single();

      // api_keys is already a JSONB object, no need to parse
      const apiKeys = userSettings?.api_keys || {
        openai: null,
        anthropic: null,
        openrouter: null,
        google: null
      };

      const ollamaSettings = userSettings?.ollama_settings || {
        baseUrl: 'http://localhost:11434'
      };
      if (process.env.NODE_ENV === 'development') {
        console.log('[Settings] Loaded settings for user:', userId);
        console.log('[Settings] Has OpenAI key:', !!apiKeys.openai);
        console.log('[Settings] Has Anthropic key:', !!apiKeys.anthropic);
        console.log('[Settings] Has OpenRouter key:', !!apiKeys.openrouter);
        console.log('[Settings] Has Google key:', !!apiKeys.google);
        // NEVER LOG: console.log('[Settings] API Keys:', apiKeys); // DANGEROUS!
      }
    // ========================================================================
    // STEP 3: DETERMINE WHO SHOULD RESPOND (SIMPLIFIED LOGIC)
    // ========================================================================

    // Get recent speaker history (last 3 messages)
    const recentSpeakers = conversationHistory
      .slice(-3)
      .filter(m => m.type === 'character')
      .map(m => m.character_id || m.character);

    // 1. Check if user mentioned any character by name
    const directlyMentioned = characters.filter(char =>
      userMessage.toLowerCase().includes(char.name.toLowerCase())
    );

    let respondingCharacters = [];

    if (directlyMentioned.length > 0) {
      // All mentioned characters will respond
      respondingCharacters = directlyMentioned;
      console.log(`[Decision] ${directlyMentioned.length} character(s) directly mentioned`);
    } else {
      // 2. Select 1-2 characters who haven't spoken recently
      const availableCharacters = characters.filter(char =>
        !recentSpeakers.includes(char.id)
      );

      if (availableCharacters.length > 0) {
        // Randomly pick 1-2 from those who haven't spoken recently
        const numResponders = Math.random() > 0.5 ? 2 : 1;
        respondingCharacters = availableCharacters
          .sort(() => Math.random() - 0.5)
          .slice(0, Math.min(numResponders, availableCharacters.length));
      } else {
        // Everyone spoke recently, just pick the oldest speaker
        respondingCharacters = [characters[0]];
      }

      console.log(`[Decision] ${respondingCharacters.length} character(s) selected to respond`);
    }
    
    // ========================================================================
    // STEP 4: LOAD BOT-TO-BOT RELATIONSHIPS
    // ========================================================================

    // Load relationships for all responding characters
    const characterRelationshipsMap = new Map();

    for (const char of respondingCharacters) {
      try {
        const { data: relationships } = await supabase
          .from('character_relationships')
          .select('*')
          .eq('character_id', char.id)
          .eq('user_id', userId)
          .eq('target_type', 'character');

        if (relationships) {
          characterRelationshipsMap.set(char.id, relationships);
        }
      } catch (error) {
        console.error(`[Relationships] Error loading for ${char.name}:`, error);
        characterRelationshipsMap.set(char.id, []);
      }
    }

    // ========================================================================
    // STEP 5: GENERATE RESPONSES FOR SELECTED CHARACTERS
    // ========================================================================

    const responses = [];

    // Generate responses sequentially with staggered delays
    for (let index = 0; index < respondingCharacters.length; index++) {
      const char = respondingCharacters[index];
      const isPrimary = index === 0;

      try {
        // Build conversation history that includes previous responses in this turn
        let updatedHistory = conversationHistory;
        if (index > 0) {
          // Include previous character responses from this turn
          updatedHistory = [
            ...conversationHistory,
            { role: 'user', content: userMessage }
          ];

          // Add previous responses from this turn
          for (let i = 0; i < index; i++) {
            updatedHistory.push({
              role: 'assistant',
              content: `[${respondingCharacters[i].name}]: ${responses[i].response}`
            });
          }
        }

        // Get other characters in the chat (excluding current character)
        const otherCharacters = characters.filter(c => c.id !== char.id);

        // Get this character's relationships
        const characterRelationships = characterRelationshipsMap.get(char.id) || [];

        const systemPrompt = buildSystemPrompt(char, userPersona, currentScene, otherCharacters, characterRelationships);
        const messages = buildConversationMessages(systemPrompt, updatedHistory, isPrimary ? userMessage : null);

        console.log(`[Response] Generating for ${char.name}...`);

        const response = await AIProviderService.generateResponse(
          char,
          messages,
          apiKeys,
          ollamaSettings
        );

        // Save to database
        await supabase
          .from('messages')
          .insert({
            session_id: activeSessionId,
            type: 'character',
            character_id: char.id,
            content: response,
            is_primary_response: isPrimary
          });

        // Update message count
        await supabase.rpc('increment_message_count', {
          p_session_id: activeSessionId
        });

        responses.push({
          character: char.id,
          characterName: char.name,
          response: response,
          timestamp: new Date().toISOString(),
          delay: index * 1200, // Stagger by 1.2s
          isPrimary: isPrimary
        });

        // Persist memories and relationships
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
          console.error(`[Memory] Error processing memories for ${char.name}:`, memErr);
        }

        console.log(`[Response] ${char.name}: "${response}"`);

      } catch (error) {
        console.error(`[Response] Error for ${char.name}:`, error);
        if (isPrimary) {
          // If primary fails, still add error response
          responses.push({
            character: char.id,
            characterName: char.name,
            response: "Sorry, I'm having trouble responding right now...",
            timestamp: new Date().toISOString(),
            delay: index * 1200,
            error: true
          });
        }
        // Secondary failures are silent
      }
    }
    
    // ========================================================================
    // STEP 6: RETURN ALL RESPONSES
    // ========================================================================

    console.log(`[Group Chat v2.0] Generated ${responses.length} responses`);

    res.json({
      sessionId: activeSessionId,
      responses
    });
    
  } catch (error) {
    console.error('[Group Chat v2.0] Error:', error);
    res.status(500).json({
      error: 'Failed to generate group response',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function buildSystemPrompt(character, userPersona, currentScene, otherCharacters, characterRelationships) {
  let prompt = `You are ${character.name}.\n\n`;
  prompt += `PERSONALITY & BACKGROUND:\n${character.personality}\n\n`;

  if (userPersona) {
    const personaDescription = userPersona.personality || userPersona.description || '';
    const personaName = userPersona.name || 'the user';
    prompt += `USER PERSONA:\nYou are talking to ${personaName}. ${personaDescription}\n\n`;
  }

  if (currentScene) {
    prompt += `CURRENT SCENE:\n${currentScene.description}\n\n`;
  }

  // Add bot-to-bot relationship context
  if (otherCharacters && otherCharacters.length > 0 && characterRelationships && characterRelationships.length > 0) {
    prompt += `YOUR RELATIONSHIPS WITH OTHERS IN THIS CHAT:\n`;

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
- Respond naturally and conversationally
- Keep responses concise (2-4 sentences typical)
- Use actions in *asterisks* to show body language or emotions
- Don't break the fourth wall or mention being an AI
- React authentically to what others say`;

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

module.exports = router;
