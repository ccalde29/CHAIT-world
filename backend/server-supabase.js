// ============================================================================
// CHAIT World Backend - FIXED VERSION
// Features: Memory processing, character-to-character interactions, chat history
// backend/server-supabase.js
// ============================================================================

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const DatabaseService = require('./services/database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database service
const db = new DatabaseService();

// ============================================================================
// MIDDLEWARE CONFIGURATION
// ============================================================================

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

const requireAuth = (req, res, next) => {
  const userId = req.headers['user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  req.userId = userId;
  next();
};

// ============================================================================
// GLOBAL SYSTEM PROMPT - ENHANCED FOR CHARACTER INTERACTIONS
// ============================================================================

const GLOBAL_SYSTEM_PROMPT = `You are participating in a group chat with a human user and other AI characters in a specific scenario.

CRITICAL CHARACTER IDENTITY RULES:
1. You are ONLY [CHARACTER_NAME] - never speak as anyone else
2. NEVER speak for the user ([USER_NAME]) or other characters
3. NEVER use phrases like "I think [other character] would say..." or respond for others
4. If you reference what someone else said, do it as YOUR reaction, not speaking for them
5. Stay completely in your unique voice and personality at ALL times

INTERACTING WITH OTHER CHARACTERS:
6. You CAN and SHOULD acknowledge what other AI characters just said
7. React to their comments, ask them questions, agree/disagree with them
8. Build on their ideas or challenge them based on your personality
9. Create natural group dynamics - sometimes support, sometimes debate
10. Remember: other characters have their own thoughts - respect that

RESPONSE STYLE REQUIREMENTS:
11. Include physical actions, gestures, and environmental interactions in *italics*
12. React naturally to what others just said or did in the conversation
13. Keep responses under 80 words but make them vivid and engaging
14. Show your character's unique perspective on the situation
15. Use sensory details relevant to the current scenario

CONVERSATION FLOW:
16. Never start responses the same way twice in a conversation
17. Build on the group dynamic without taking over the conversation
18. Reference the scenario setting in your actions and reactions
19. Be aware of who spoke last - you can respond to the user OR another character`;

// ============================================================================
// AI PROVIDER FUNCTIONS
// ============================================================================

async function callOpenAI(messages, characterPrompt, apiKey) {
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: GLOBAL_SYSTEM_PROMPT },
        { role: 'system', content: characterPrompt },
        ...messages
      ],
      max_tokens: 150,
      temperature: 0.9,
      presence_penalty: 0.6,
      frequency_penalty: 0.3
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('OpenAI API Error:', error.response?.data || error.message);
    throw new Error(`OpenAI API failed: ${error.response?.data?.error?.message || error.message}`);
  }
}

async function callAnthropic(messages, characterPrompt, apiKey) {
  try {
    const systemPrompt = `${GLOBAL_SYSTEM_PROMPT}\n\n${characterPrompt}`;
    
    // Convert and validate messages for Claude
    const claudeMessages = messages
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }));

    // Ensure alternating user/assistant pattern
    const validatedMessages = [];
    let lastRole = null;
    
    for (const msg of claudeMessages) {
      if (msg.role === lastRole && validatedMessages.length > 0) {
        validatedMessages[validatedMessages.length - 1].content += '\n\n' + msg.content;
      } else {
        validatedMessages.push(msg);
        lastRole = msg.role;
      }
    }

    // Ensure conversation starts with user message
    if (validatedMessages.length > 0 && validatedMessages[0].role !== 'user') {
      validatedMessages.unshift({
        role: 'user',
        content: 'Please respond in character to continue our conversation.'
      });
    }

    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-haiku-20240307',
      max_tokens: 150,
      system: systemPrompt,
      messages: validatedMessages
    }, {
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      timeout: 15000
    });
    
    return response.data.content[0].text.trim();
  } catch (error) {
    console.error('Anthropic API Error:', error.response?.data || error.message);
    throw new Error(`Anthropic API failed: ${error.response?.data?.error?.message || error.message}`);
  }
}

async function callOllama(messages, characterPrompt, baseUrl = 'http://localhost:11434', model = 'llama2') {
  try {
    const systemPrompt = `${GLOBAL_SYSTEM_PROMPT}\n\n${characterPrompt}`;
    const conversationPrompt = `${systemPrompt}\n\nConversation:\n${
      messages.map(m => `${m.role === 'user' ? 'Human' : 'Assistant'}: ${m.content}`).join('\n')
    }\n\nResponse:`;

    const response = await axios.post(`${baseUrl}/api/generate`, {
      model: model,
      prompt: conversationPrompt,
      stream: false,
      options: {
        temperature: 0.9,
        max_tokens: 150,
        stop: ['\n\nHuman:', '\n\nAssistant:']
      }
    }, {
      timeout: 40000
    });
    
    return response.data.response.trim();
  } catch (error) {
    console.error('Ollama API Error:', error.response?.data || error.message);
    throw new Error(`Ollama API failed: ${error.message}`);
  }
}

/**
 * Universal AI API caller with memory integration
 */
async function callAIProviderWithMemory(messages, characterPrompt, provider, userId, ollamaSettings, characterContext) {
  try {
    const apiKeys = await db.getDecryptedApiKeys(userId);
    
    // Build enhanced system prompt with memory and persona
    const enhancedPrompt = buildEnhancedCharacterPrompt(characterPrompt, characterContext);
    
    switch (provider.toLowerCase()) {
      case 'openai':
        if (!apiKeys.openai) throw new Error('OpenAI API key not configured');
        return await callOpenAI(messages, enhancedPrompt, apiKeys.openai);
        
      case 'anthropic':
        if (!apiKeys.anthropic) throw new Error('Anthropic API key not configured');
        return await callAnthropic(messages, enhancedPrompt, apiKeys.anthropic);
        
      case 'ollama':
        return await callOllama(
          messages, 
          enhancedPrompt, 
          ollamaSettings.baseUrl || 'http://localhost:11434',
          ollamaSettings.model || 'llama2'
        );
        
      default:
        throw new Error(`Unsupported API provider: ${provider}`);
    }
  } catch (error) {
    console.error('AI Provider Error:', error);
    throw error;
  }
}

/**
 * Build enhanced character prompt with memory, persona, and other character context
 * NEW: Includes awareness of other characters
 */
function buildEnhancedCharacterPrompt(basePersonality, characterContext) {
  const { userPersona, memories, relationship, otherCharacterMessages } = characterContext;
  
  let enhancedPrompt = `${basePersonality}

USER INFORMATION:
Name: ${userPersona.name}
Personality: ${userPersona.personality}`;

  if (userPersona.interests && userPersona.interests.length > 0) {
    enhancedPrompt += `
Interests: ${userPersona.interests.join(', ')}`;
  }

  if (userPersona.communication_style) {
    enhancedPrompt += `
Communication Style: ${userPersona.communication_style}`;
  }

  // Add relationship context
  enhancedPrompt += `

RELATIONSHIP WITH ${userPersona.name.toUpperCase()}:
Relationship Type: ${relationship.relationship_type}
Familiarity Level: ${Math.round(relationship.familiarity_level * 100)}%
Trust Level: ${Math.round(relationship.trust_level * 100)}%
Emotional Bond: ${Math.round((relationship.emotional_bond + 1) * 50)}%
Total Interactions: ${relationship.interaction_count || 0}`;

  // Add memories
  if (memories && memories.length > 0) {
    enhancedPrompt += `

IMPORTANT MEMORIES ABOUT ${userPersona.name.toUpperCase()}:`;
    memories.forEach(memory => {
      enhancedPrompt += `
- ${memory.memory_content} (importance: ${Math.round(memory.importance_score * 100)}%)`;
    });
  }

  // NEW: Add context about other characters' recent messages
  if (otherCharacterMessages && otherCharacterMessages.length > 0) {
    enhancedPrompt += `

RECENT MESSAGES FROM OTHER CHARACTERS IN THIS CONVERSATION:`;
    otherCharacterMessages.slice(0, 3).reverse().forEach(msg => {
      enhancedPrompt += `
- Character said: "${msg.content}"`;
    });
    enhancedPrompt += `

You can reference, respond to, or build upon what these other characters said.`;
  }

  return enhancedPrompt;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function determineResponsePattern(activeCharacters, groupMode, conversationHistory) {
  switch (groupMode) {
    case 'natural':
      const recentSpeakers = conversationHistory
        .slice(-5)
        .filter(m => m.type === 'character')
        .map(m => m.character);
      
      const sortedByRecency = activeCharacters.sort((a, b) => {
        const aLastIndex = recentSpeakers.lastIndexOf(a);
        const bLastIndex = recentSpeakers.lastIndexOf(b);
        return aLastIndex - bLastIndex;
      });
      
      const numResponders = Math.min(
        Math.floor(Math.random() * 2) + 1,
        sortedByRecency.length
      );
      
      return sortedByRecency.slice(0, numResponders);
      
    case 'round-robin':
      const lastResponder = conversationHistory
        .slice()
        .reverse()
        .find(m => m.type === 'character')?.character;
        
      const lastIndex = activeCharacters.indexOf(lastResponder);
      const nextIndex = (lastIndex + 1) % activeCharacters.length;
      return [activeCharacters[nextIndex]];
      
    case 'all-respond':
      return [...activeCharacters];
      
    default:
      return [activeCharacters[0]];
  }
}

/**
 * Process conversation for memories and relationship updates - FIXED
 */
async function processConversationMemories(characterId, userId, userMessage, characterResponse, characterContext, sessionId) {
  try {
    console.log(`🧠 Processing memories for character ${characterId}...`);
    
    // FIXED: Pass userId to analyzeConversationForMemories
    const newMemories = db.analyzeConversationForMemories(
      userMessage, 
      characterResponse, 
      characterContext.userPersona,
      userId  // ← FIXED: Now passing userId
    );
    
    // Store new memories
    for (const memory of newMemories) {
      await db.addCharacterMemory(characterId, userId, memory);
    }
    
    // Update character relationship
    const relationshipUpdate = db.calculateRelationshipUpdate(
      characterContext.relationship,
      userMessage,
      characterResponse
    );
    
    await db.updateCharacterRelationship(characterId, userId, relationshipUpdate);
    
    console.log(`✅ Processed ${newMemories.length} memories for ${characterId}`);
    
  } catch (error) {
    console.error('Error processing conversation memories:', error);
    // Don't throw - memory processing shouldn't break chat
  }
}

// ============================================================================
// CHAT & CONVERSATION ROUTES - FIXED
// ============================================================================

app.post('/api/chat/group-response', requireAuth, async (req, res) => {
  try {
    const {
      userMessage,
      activeCharacters,
      scenario,
      groupMode = 'natural',
      conversationHistory = [],
      sessionId,
      autoCreateSession = true
    } = req.body;
    
    console.log('📥 Chat request received:', {
      userId: req.userId,
      activeCharacters,
      scenario,
      sessionId
    });
    
    if (!userMessage || !activeCharacters || activeCharacters.length === 0) {
      return res.status(400).json({
        error: 'User message and active characters are required'
      });
    }

    let currentSessionId = sessionId;
    
    // Auto-create session if none provided
    if (!currentSessionId && autoCreateSession) {
      try {
        const newSession = await db.createChatSession(req.userId, {
          scenario,
          activeCharacters,
          title: `Chat in ${scenario} - ${new Date().toLocaleDateString()}`,
          groupMode
        });
        currentSessionId = newSession.id;
        console.log('✅ Created new session:', currentSessionId);
      } catch (error) {
        console.error('❌ Failed to create session:', error);
        // Continue without session - don't fail the whole request
      }
    }

    // Save user message
    if (currentSessionId) {
      try {
        await db.saveChatMessage(currentSessionId, {
          type: 'user',
          content: userMessage
        });
        console.log('✅ User message saved');
      } catch (error) {
        console.error('❌ Failed to save user message:', error);
        // Continue without saving - don't fail the whole request
      }
    }
    
    // Get user settings
    const userSettings = await db.getUserSettings(req.userId);
    const apiProvider = userSettings.apiProvider || 'openai';
    
    console.log('🔧 Using AI provider:', apiProvider);
    
    // Get characters
    const { characters } = await db.getCharacters(req.userId);
    const characterMap = new Map(characters.map(char => [char.id, char]));
    
    // Build contextual messages with character awareness
    // NEW: Include character names in the conversation context
    const contextualMessages = [
      { role: 'system', content: `Context: ${scenario}` },
      ...conversationHistory.slice(-10).map(msg => {
        if (msg.type === 'character' && msg.character) {
          const char = characterMap.get(msg.character);
          return {
            role: 'assistant',
            content: `[${char?.name || 'Character'}]: ${msg.content}`
          };
        }
        return {
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        };
      }),
      { role: 'user', content: userMessage }
    ];
    
    // Determine response pattern
    let responsePattern = determineResponsePattern(
      activeCharacters,
      groupMode,
      conversationHistory
    );
    
    console.log('🎭 Response pattern:', responsePattern);
    
    const responses = [];
    
    // Generate responses for each character
    for (let i = 0; i < responsePattern.length; i++) {
      const characterId = responsePattern[i];
      const character = characterMap.get(characterId);
      
      if (!character) {
        console.error(`❌ Character not found: ${characterId}`);
        continue;
      }
      
      console.log(`🤖 Generating response for ${character.name}...`);
      
      try {
        // NEW: Build character context with awareness of other characters
        const otherCharacterIds = activeCharacters.filter(id => id !== characterId);
        
        const characterContext = await db.buildCharacterContext(
          characterId,
          req.userId,
          currentSessionId,
          otherCharacterIds  // ← NEW: Pass other character IDs for context
        );
        
        // Generate AI response
        const response = await callAIProviderWithMemory(
          contextualMessages,
          character.personality,
          apiProvider,
          req.userId,
          userSettings.ollamaSettings || {
            baseUrl: 'http://localhost:11434',
            model: 'llama2'
          },
          characterContext
        );
        
        console.log(`✅ Response generated for ${character.name}`);
        
        responses.push({
          character: characterId,
          response: response,
          timestamp: new Date().toISOString(),
          delay: i * 1200
        });

        // Save character response
        if (currentSessionId) {
          try {
            await db.saveChatMessage(currentSessionId, {
              type: 'character',
              content: response,
              character: characterId
            });
            console.log('✅ Character response saved');
          } catch (error) {
            console.error('❌ Failed to save character message:', error);
          }
        }
        
        // FIXED: Process memories and relationships (async, don't block)
        processConversationMemories(
          characterId,
          req.userId,
          userMessage,
          response,
          characterContext,
          currentSessionId
        ).catch(err => {
          console.error('❌ Memory processing error:', err);
        });
        
      } catch (error) {
        console.error(`❌ Error generating response for character ${characterId}:`, error);
        responses.push({
          character: characterId,
          response: "Sorry, I'm having trouble responding right now...",
          timestamp: new Date().toISOString(),
          delay: i * 1200,
          error: true
        });

        if (currentSessionId) {
          try {
            await db.saveChatMessage(currentSessionId, {
              type: 'character',
              content: "Sorry, I'm having trouble responding right now...",
              character: characterId
            });
          } catch (err) {
            console.error('❌ Failed to save error message:', err);
          }
        }
      }
    }

    // Update session with latest activity
    if (currentSessionId) {
      try {
        await db.updateChatSessionActivity(currentSessionId);
      } catch (error) {
        console.error('❌ Failed to update session activity:', error);
      }
    }
    
    if (responses.length === 0) {
      return res.status(500).json({
        error: 'No character responses could be generated'
      });
    }
    
    console.log('✅ Chat response complete, sending back to client');
    
    res.json({
      responses,
      sessionId: currentSessionId
    });
    
  } catch (error) {
    console.error('❌ Error generating group response:', error);
    res.status(500).json({
      error: 'Failed to generate group response',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================================================
// CHAT HISTORY SYSTEM
// ============================================================================

app.post('/api/chat/sessions', requireAuth, async (req, res) => {
  try {
    const { scenario, activeCharacters, title } = req.body;
    
    const session = await db.createChatSession(req.userId, {
      scenario,
      activeCharacters,
      title: title || `Chat in ${scenario}`,
      groupMode: 'natural'
    });
    
    res.status(201).json(session);
  } catch (error) {
    console.error('Error creating chat session:', error);
    res.status(500).json({ error: 'Failed to create chat session' });
  }
});

app.get('/api/chat/sessions', requireAuth, async (req, res) => {
  try {
    const sessions = await db.getChatHistory(req.userId, 20);
    res.json({ sessions });
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    res.status(500).json({ error: 'Failed to fetch chat sessions' });
  }
});

app.get('/api/chat/sessions/:sessionId', requireAuth, async (req, res) => {
  try {
    const session = await db.getChatSession(req.userId, req.params.sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Chat session not found' });
    }
    res.json(session);
  } catch (error) {
    console.error('Error fetching chat session:', error);
    res.status(500).json({ error: 'Failed to fetch chat session' });
  }
});

app.put('/api/chat/sessions/:sessionId', requireAuth, async (req, res) => {
  try {
    const { title } = req.body;
    const session = await db.updateChatSession(req.userId, req.params.sessionId, { title });
    res.json(session);
  } catch (error) {
    console.error('Error updating chat session:', error);
    res.status(500).json({ error: 'Failed to update chat session' });
  }
});

app.delete('/api/chat/sessions/:sessionId', requireAuth, async (req, res) => {
  try {
    await db.deleteChatSession(req.userId, req.params.sessionId);
    res.json({ message: 'Chat session deleted successfully' });
  } catch (error) {
    console.error('Error deleting chat session:', error);
    res.status(500).json({ error: 'Failed to delete chat session' });
  }
});

// ============================================================================
// CHARACTER MANAGEMENT ROUTES
// ============================================================================

app.get('/api/characters', requireAuth, async (req, res) => {
  try {
    const result = await db.getCharacters(req.userId);
    res.json(result);
  } catch (error) {
    console.error('Error fetching characters:', error);
    res.status(500).json({ error: 'Failed to fetch characters' });
  }
});

app.post('/api/characters', requireAuth, async (req, res) => {
  try {
    const { name, personality, avatar, color, avatar_image_url, avatar_image_filename, uses_custom_image } = req.body;
    
    if (!name || !personality) {
      return res.status(400).json({ 
        error: 'Name and personality are required fields' 
      });
    }
    
    const character = await db.createCharacter(req.userId, {
      name: name.trim(),
      personality: personality.trim(),
      avatar: avatar || '🤖',
      color: color || 'from-gray-500 to-slate-500',
      avatar_image_url,
      avatar_image_filename,
      uses_custom_image
    });
    
    res.status(201).json({
      ...character,
      message: 'Character created successfully'
    });
    
  } catch (error) {
    console.error('Error creating character:', error);
    
    if (error.code === '23505') {
      return res.status(400).json({ 
        error: 'Character name already exists' 
      });
    }
    
    res.status(500).json({ error: 'Failed to create character' });
  }
});

app.put('/api/characters/:id', requireAuth, async (req, res) => {
  try {
    const { name, personality, avatar, color, avatar_image_url, avatar_image_filename, uses_custom_image } = req.body;
    
    if (!name || !personality) {
      return res.status(400).json({
        error: 'Name and personality are required fields'
      });
    }
    
    const character = await db.updateCharacter(req.userId, req.params.id, {
      name: name.trim(),
      personality: personality.trim(),
      avatar,
      color,
      avatar_image_url,
      avatar_image_filename,
      uses_custom_image
    });
    
    res.json({
      ...character,
      message: 'Character updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating character:', error);
    
    if (error.code === '23505') {
      return res.status(400).json({
        error: 'Character name already exists'
      });
    }
    
    res.status(500).json({ error: 'Failed to update character' });
  }
});

app.delete('/api/characters/:id', requireAuth, async (req, res) => {
  try {
    const result = await db.deleteCharacter(req.userId, req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Error deleting character:', error);
    res.status(500).json({ error: 'Failed to delete character' });
  }
});

// ============================================================================
// USER SETTINGS ROUTES
// ============================================================================

app.get('/api/user/settings', requireAuth, async (req, res) => {
  try {
    const settings = await db.getUserSettings(req.userId);
    res.json(settings);
  } catch (error) {
    console.error('Error fetching user settings:', error);
    res.status(500).json({ error: 'Failed to fetch user settings' });
  }
});

app.put('/api/user/settings', requireAuth, async (req, res) => {
  try {
    const settings = await db.updateUserSettings(req.userId, req.body);
    
    res.json({
      settings: settings,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating user settings:', error);
    res.status(500).json({ error: 'Failed to update user settings' });
  }
});

// ============================================================================
// SCENARIO MANAGEMENT ROUTES
// ============================================================================

app.get('/api/scenarios', requireAuth, async (req, res) => {
  try {
    const result = await db.getScenarios(req.userId);
    res.json(result);
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    res.status(500).json({ error: 'Failed to fetch scenarios' });
  }
});

app.post('/api/scenarios', requireAuth, async (req, res) => {
  try {
    const { name, description, context, atmosphere } = req.body;
    
    if (!name || !description || !context) {
      return res.status(400).json({ 
        error: 'Name, description, and context are required fields' 
      });
    }
    
    const scenario = await db.createScenario(req.userId, {
      name: name.trim(),
      description: description.trim(),
      context: context.trim(),
      atmosphere: atmosphere?.trim() || 'neutral'
    });
    
    res.status(201).json({
      ...scenario,
      message: 'Scene created successfully'
    });
    
  } catch (error) {
    console.error('Error creating scenario:', error);
    
    if (error.code === '23505') {
      return res.status(400).json({ 
        error: 'Scene name already exists' 
      });
    }
    
    res.status(500).json({ error: 'Failed to create scenario' });
  }
});

app.put('/api/scenarios/:id', requireAuth, async (req, res) => {
  try {
    const defaultScenarios = ['coffee-shop', 'study-group', 'party'];
    if (defaultScenarios.includes(req.params.id)) {
      return res.status(400).json({ 
        error: 'Default scenarios cannot be edited. Create a custom scenario instead.' 
      });
    }
    
    const { name, description, context, atmosphere } = req.body;
    
    if (!name || !description || !context) {
      return res.status(400).json({ 
        error: 'Name, description, and context are required fields' 
      });
    }
    
    const scenario = await db.updateScenario(req.userId, req.params.id, {
      name: name.trim(),
      description: description.trim(),
      context: context.trim(),
      atmosphere: atmosphere?.trim()
    });
    
    res.json({
      ...scenario,
      message: 'Scene updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating scenario:', error);
    
    if (error.code === '23505') {
      return res.status(400).json({ 
        error: 'Scene name already exists' 
      });
    }
    
    res.status(500).json({ error: 'Failed to update scenario' });
  }
});

app.delete('/api/scenarios/:id', requireAuth, async (req, res) => {
  try {
    const defaultScenarios = ['coffee-shop', 'study-group', 'party'];
    if (defaultScenarios.includes(req.params.id)) {
      return res.status(400).json({ 
        error: 'Default scenarios cannot be deleted' 
      });
    }
    
    const result = await db.deleteScenario(req.userId, req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Error deleting scenario:', error);
    res.status(500).json({ error: 'Failed to delete scenario' });
  }
});

// ============================================================================
// USER PERSONA MANAGEMENT ROUTES
// ============================================================================

app.get('/api/user/persona', requireAuth, async (req, res) => {
  try {
    const result = await db.getUserPersona(req.userId);
    res.json(result);
  } catch (error) {
    console.error('Error fetching user persona:', error);
    res.status(500).json({ error: 'Failed to fetch user persona' });
  }
});

app.post('/api/user/persona', requireAuth, async (req, res) => {
  try {
    const { name, personality, interests, communication_style, avatar, color } = req.body;
    
    if (!name || !personality) {
      return res.status(400).json({ 
        error: 'Name and personality are required fields' 
      });
    }
    
    const persona = await db.createOrUpdateUserPersona(req.userId, {
      name: name.trim(),
      personality: personality.trim(),
      interests: interests || [],
      communication_style: communication_style?.trim() || '',
      avatar: avatar || '👤',
      color: color || 'from-blue-500 to-indigo-500'
    });
    
    res.json({
      ...persona,
      message: 'User persona saved successfully'
    });
    
  } catch (error) {
    console.error('Error saving user persona:', error);
    res.status(500).json({ error: 'Failed to save user persona' });
  }
});

app.delete('/api/user/persona', requireAuth, async (req, res) => {
  try {
    const result = await db.deleteUserPersona(req.userId);
    res.json(result);
  } catch (error) {
    console.error('Error deleting user persona:', error);
    res.status(500).json({ error: 'Failed to delete user persona' });
  }
});

// ============================================================================
// MEMORY MANAGEMENT ROUTES
// ============================================================================

app.get('/api/character/:characterId/memories', requireAuth, async (req, res) => {
  try {
    const memories = await db.getCharacterMemories(req.params.characterId, req.userId, 20);
    res.json({ memories });
  } catch (error) {
    console.error('Error fetching character memories:', error);
    res.status(500).json({ error: 'Failed to fetch character memories' });
  }
});

app.get('/api/character/:characterId/relationship', requireAuth, async (req, res) => {
  try {
    const relationship = await db.getCharacterRelationship(req.params.characterId, req.userId);
    res.json({ relationship });
  } catch (error) {
    console.error('Error fetching character relationship:', error);
    res.status(500).json({ error: 'Failed to fetch character relationship' });
  }
});

app.delete('/api/character/:characterId/memories', requireAuth, async (req, res) => {
  try {
    await db.clearCharacterMemories(req.params.characterId, req.userId);
    res.json({ message: 'Character memories cleared successfully' });
  } catch (error) {
    console.error('Error clearing character memories:', error);
    res.status(500).json({ error: 'Failed to clear character memories' });
  }
});

// ============================================================================
// IMAGE UPLOAD API ROUTES
// ============================================================================

app.put('/api/characters/:id/image', requireAuth, async (req, res) => {
  try {
    const { url, filename, useCustomImage } = req.body;
    
    const result = await db.updateCharacter(req.userId, req.params.id, {
      avatar_image_url: url,
      avatar_image_filename: filename,
      uses_custom_image: useCustomImage
    });
    
    res.json({
      ...result,
      message: 'Character image updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating character image:', error);
    res.status(500).json({ error: 'Failed to update character image' });
  }
});

app.put('/api/user/persona/image', requireAuth, async (req, res) => {
  try {
    const { url, filename, useCustomImage } = req.body;
    
    const result = await db.updateUserPersonaImage(req.userId, {
      url,
      filename,
      useCustomImage
    });
    
    res.json({
      ...result,
      message: 'Persona image updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating persona image:', error);
    res.status(500).json({ error: 'Failed to update persona image' });
  }
});

app.put('/api/scenarios/:id/image', requireAuth, async (req, res) => {
  try {
    const { url, filename, useCustomImage } = req.body;
    
    const defaultScenarios = ['coffee-shop', 'study-group', 'party'];
    if (defaultScenarios.includes(req.params.id)) {
      return res.status(400).json({
        error: 'Default scenarios cannot have custom backgrounds. Create a custom scenario instead.'
      });
    }
    
    const result = await db.updateScenarioImage(req.userId, req.params.id, {
      url,
      filename,
      useCustomImage
    });
    
    res.json({
      ...result,
      message: 'Scene background updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating scenario image:', error);
    res.status(500).json({ error: 'Failed to update scenario background' });
  }
});

app.delete('/api/images/:type/:filename', requireAuth, async (req, res) => {
  try {
    const { type, filename } = req.params;
    
    if (!['character', 'persona', 'scene'].includes(type)) {
      return res.status(400).json({ error: 'Invalid image type' });
    }
    
    await db.deleteImage(req.userId, filename, type);
    
    res.json({ message: 'Image deleted successfully' });
    
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// ============================================================================
// HEALTH & UTILITY ROUTES
// ============================================================================

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    database: 'Supabase',
    features: {
      chatHistory: true,
      characterMemory: true,
      characterInteractions: true
    }
  });
});

// ============================================================================
// ERROR HANDLING & SERVER STARTUP
// ============================================================================

app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

app.listen(PORT, () => {
  console.log(`
🚀 CHAIT World Server Started
📡 Port: ${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
🗄️  Database: Supabase
🔐 Auth: Google OAuth
✨ Features:
   ✓ Character-to-Character Interactions
   ✓ Memory & Learning System
   ✓ Chat History & Sessions
   ✓ Custom Characters & Scenes
   ✓ Image Uploads
  `);
});

module.exports = app;