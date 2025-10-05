// ============================================================================
// CHAIT World - Enhanced Group Chat Endpoint (v1.5)
// Multi-pass response generation with mood system and speaking queue
// ============================================================================

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const AIProviderService = require('../services/AIProviderService');
const MoodEngine = require('../services/MoodEngine');
const SpeakingQueue = require('../services/SpeakingQueue');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * POST /api/chat/group-response-v15
 * Enhanced group chat with mood system and multi-pass generation
 */
router.post('/group-response-v15', async (req, res) => {
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
    
    console.log(`[Group Chat v1.5] Processing for ${activeCharacters.length} characters`);
    
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
    // STEP 3: LOAD SESSION STATES AND CONTEXT
    // ========================================================================
    
    const [sessionStates, topicEngagements, relationships] = await Promise.all([
      SpeakingQueue.getSessionStates(activeCharacters, sessionId, userId, supabase),
      SpeakingQueue.getTopicEngagements(activeCharacters, userId, supabase),
      SpeakingQueue.getRelationships(activeCharacters, userId, supabase)
    ]);
    
    // ========================================================================
    // STEP 4: UPDATE CHARACTER MOODS BASED ON USER MESSAGE
    // ========================================================================
    
    const triggers = MoodEngine.analyzeTriggers(userMessage);
    console.log(`[Mood Engine] Detected triggers:`, triggers.map(t => t.type));
    
    // Update moods for all characters
    for (const character of characters) {
      const sessionState = sessionStates.find(s => s.character_id === character.id);
      const currentMood = sessionState?.current_mood || 'neutral';
      const currentIntensity = sessionState?.mood_intensity || 0.5;
      
      // Calculate new mood
      const newMoodState = MoodEngine.calculateNewMood(
        currentMood,
        currentIntensity,
        triggers,
        character.temperature || 0.8
      );
      
      console.log(`[Mood Engine] ${character.name}: ${currentMood}(${currentIntensity.toFixed(2)}) → ${newMoodState.mood}(${newMoodState.intensity.toFixed(2)})`);
      
      // Save to database
      await supabase.rpc('upsert_character_mood', {
        p_character_id: character.id,
        p_session_id: sessionId,
        p_user_id: userId,
        p_mood: newMoodState.mood,
        p_intensity: newMoodState.intensity
      });
      
      // Update session state in memory
      const stateIndex = sessionStates.findIndex(s => s.character_id === character.id);
      if (stateIndex >= 0) {
        sessionStates[stateIndex].current_mood = newMoodState.mood;
        sessionStates[stateIndex].mood_intensity = newMoodState.intensity;
      } else {
        sessionStates.push({
          character_id: character.id,
          session_id: sessionId,
          user_id: userId,
          current_mood: newMoodState.mood,
          mood_intensity: newMoodState.intensity,
          messages_this_session: 0,
          last_spoke_at: null
        });
      }
    }
    
    // ========================================================================
    // STEP 5: BUILD SPEAKING QUEUE
    // ========================================================================
    
    const context = {
      userMessage,
      totalMessages: conversationHistory.length,
      lastSpeaker: conversationHistory.length > 0 
        ? conversationHistory[conversationHistory.length - 1].character 
        : null,
      topicEngagements,
      relationships
    };
    
    const queue = SpeakingQueue.buildQueue(characters, sessionStates, context);
    
    console.log(`[Speaking Queue] Primary: ${queue.primary.character.name} (${queue.primary.score.toFixed(2)})`);
    console.log(`[Speaking Queue] Secondary (${queue.secondary.length}):`, queue.secondary.map(s => `${s.character.name}(${s.score.toFixed(2)})`));
    console.log(`[Speaking Queue] Silent (${queue.silent.length}):`, queue.silent.map(s => s.character.name));
    
    // ========================================================================
    // STEP 6: GENERATE PRIMARY RESPONSE
    // ========================================================================
    
    const responses = [];
    
    const primaryChar = queue.primary.character;
    const primaryState = queue.primary.sessionState;
    
    try {
      // Build context with mood
      const moodPrompt = MoodEngine.buildMoodPrompt(
        primaryState.current_mood,
        primaryState.mood_intensity,
        primaryChar
      );
      
      const systemPrompt = buildSystemPrompt(primaryChar, userPersona, currentScene, moodPrompt);
      const messages = buildConversationMessages(systemPrompt, conversationHistory, userMessage);
      
      console.log(`[Primary] Generating response for ${primaryChar.name}...`);
      
      const response = await AIProviderService.generateResponse(
        primaryChar,
        messages,
        apiKeys,
        ollamaSettings
      );
      
      // Save primary response to database immediately
      const { data: savedMessage } = await supabase
        .from('messages')
        .insert({
          session_id: sessionId,
          user_id: userId,
          type: 'character',
          character: primaryChar.id,
          content: response,
          mood_at_time: primaryState.current_mood,
          mood_intensity: primaryState.mood_intensity,
          is_primary_response: true
        })
        .select()
        .single();
      
      responses.push({
        character: primaryChar.id,
        characterName: primaryChar.name,
        response: response,
        timestamp: new Date().toISOString(),
        delay: 0,
        isPrimary: true,
        mood: primaryState.current_mood,
        moodIntensity: primaryState.mood_intensity
      });
      
      // Update session state
      await SpeakingQueue.updateSessionState(primaryChar.id, sessionId, userId, supabase);
      await SpeakingQueue.updateTopicEngagement(primaryChar.id, userId, userMessage, supabase);
      
      console.log(`[Primary] ${primaryChar.name}: "${response}"`);
      
    } catch (error) {
      console.error(`[Primary] Error for ${primaryChar.name}:`, error);
      responses.push({
        character: primaryChar.id,
        characterName: primaryChar.name,
        response: "Sorry, I'm having trouble responding right now...",
        timestamp: new Date().toISOString(),
        delay: 0,
        error: true
      });
    }
    
    // ========================================================================
    // STEP 7: GENERATE SECONDARY RESPONSES
    // (Characters react to primary response + user message)
    // ========================================================================
    
    if (queue.secondary.length > 0) {
      // Generate secondary responses in parallel
      const secondaryPromises = queue.secondary.map(async (scored, index) => {
        const char = scored.character;
        const state = scored.sessionState;
        
        try {
          // Build context including primary response
          const moodPrompt = MoodEngine.buildMoodPrompt(
            state.current_mood,
            state.mood_intensity,
            char
          );
          
          // Add primary response to conversation history
          const updatedHistory = [
            ...conversationHistory,
            {
              role: 'user',
              content: userMessage
            },
            {
              role: 'assistant',
              content: `[${primaryChar.name}]: ${responses[0].response}`
            }
          ];
          
          const systemPrompt = buildSystemPrompt(char, userPersona, currentScene, moodPrompt);
          const messages = buildConversationMessages(systemPrompt, updatedHistory, null);
          
          console.log(`[Secondary] Generating response for ${char.name}...`);
          
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
              session_id: sessionId,
              user_id: userId,
              type: 'character',
              character: char.id,
              content: response,
              mood_at_time: state.current_mood,
              mood_intensity: state.mood_intensity,
              is_primary_response: false
            });
          
          // Update session state
          await SpeakingQueue.updateSessionState(char.id, sessionId, userId, supabase);
          await SpeakingQueue.updateTopicEngagement(char.id, userId, userMessage, supabase);
          
          console.log(`[Secondary] ${char.name}: "${response}"`);
          
          return {
            character: char.id,
            characterName: char.name,
            response: response,
            timestamp: new Date().toISOString(),
            delay: (index + 1) * 1200, // Stagger by 1.2s
            isPrimary: false,
            mood: state.current_mood,
            moodIntensity: state.mood_intensity
          };
          
        } catch (error) {
          console.error(`[Secondary] Error for ${char.name}:`, error);
          return null; // Silent failure for secondary
        }
      });
      
      const secondaryResponses = await Promise.all(secondaryPromises);
      
      // Add successful secondary responses
      secondaryResponses
        .filter(r => r !== null)
        .forEach(r => responses.push(r));
    }
    
    // ========================================================================
    // STEP 8: RETURN ALL RESPONSES
    // ========================================================================
    
    console.log(`[Group Chat v1.5] Generated ${responses.length} responses`);
    
    res.json({
      responses,
      queue: {
        primary: queue.primary.character.name,
        secondary: queue.secondary.map(s => s.character.name),
        silent: queue.silent.map(s => s.character.name)
      },
      moods: sessionStates.map(s => ({
        character: characters.find(c => c.id === s.character_id)?.name,
        mood: s.current_mood,
        intensity: s.mood_intensity
      }))
    });
    
  } catch (error) {
    console.error('[Group Chat v1.5] Error:', error);
    res.status(500).json({
      error: 'Failed to generate group response',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function buildSystemPrompt(character, userPersona, currentScene, moodPrompt) {
  let prompt = `You are ${character.name}.\n\n`;
  prompt += `PERSONALITY & BACKGROUND:\n${character.personality}\n\n`;
  
  if (userPersona) {
    prompt += `USER PERSONA:\n${userPersona.description}\n\n`;
  }
  
  if (currentScene) {
    prompt += `CURRENT SCENE:\n${currentScene.description}\n\n`;
  }
  
  prompt += `IMPORTANT INSTRUCTIONS:
- Stay in character at all times
- Respond naturally and conversationally
- Keep responses concise (2-4 sentences typical)
- Use actions in *asterisks* to show body language or emotions
- Don't break the fourth wall or mention being an AI
- React authentically to what others say`;
  
  if (moodPrompt) {
    prompt += moodPrompt;
  }
  
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
