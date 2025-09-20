// ============================================================================
// Updated Backend Server with Database Integration
// backend/server-supabase.js
// ============================================================================

/**
 * CHAIT World Backend Server - Supabase Edition
 * 
 * Enhanced Node.js/Express server with Supabase database integration,
 * user authentication, and encrypted API key storage.
 */

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

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Authentication middleware
const requireAuth = (req, res, next) => {
  const userId = req.headers['user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  req.userId = userId;
  next();
};

// ============================================================================
// GLOBAL SYSTEM PROMPT & AI INTEGRATION
// ============================================================================

const GLOBAL_SYSTEM_PROMPT = `You are participating in a group chat with a human user and other AI characters. 

IMPORTANT RULES:
1. NEVER speak for or impersonate the user
2. Keep responses conversational and under 100 words  
3. Stay completely in character at all times
4. Respond naturally to the group dynamic - you can reference what others said
5. Don't break the fourth wall or mention that you're an AI
6. Be engaging and authentic to your personality
7. Sometimes you don't need to respond to every message - be natural

The conversation is taking place in a specific scenario context. Pay attention to the setting and adjust your responses accordingly.`;

/**
 * Enhanced AI API caller with user-specific API keys
 */
async function callAIProvider(messages, characterPrompt, provider, userId, ollamaSettings) {
  try {
    // Get user's decrypted API keys
    const apiKeys = await db.getDecryptedApiKeys(userId);
    
    switch (provider.toLowerCase()) {
      case 'openai':
        if (!apiKeys.openai) {
          throw new Error('OpenAI API key not configured');
        }
        return await callOpenAI(messages, characterPrompt, apiKeys.openai);
        
      case 'anthropic':
        if (!apiKeys.anthropic) {
          throw new Error('Anthropic API key not configured');
        }
        return await callAnthropic(messages, characterPrompt, apiKeys.anthropic);
        
      case 'ollama':
        return await callOllama(
          messages, 
          characterPrompt, 
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

// AI provider functions remain the same as before...
async function callOpenAI(messages, characterPrompt, apiKey) {
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: GLOBAL_SYSTEM_PROMPT },
        { role: 'system', content: characterPrompt },
        ...messages
      ],
      max_tokens: 100,
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
    
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-haiku-20240307',
      max_tokens: 100,
      system: systemPrompt,
      messages: messages
    }, {
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      timeout: 10000
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
        max_tokens: 100,
        stop: ['\n\nHuman:', '\n\nAssistant:']
      }
    }, {
      timeout: 15000
    });
    
    return response.data.response.trim();
  } catch (error) {
    console.error('Ollama API Error:', error.response?.data || error.message);
    throw new Error(`Ollama API failed: ${error.message}`);
  }
}

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
    const { name, personality, avatar, color } = req.body;
    
    if (!name || !personality) {
      return res.status(400).json({ 
        error: 'Name and personality are required fields' 
      });
    }
    
    const character = await db.createCharacter(req.userId, {
      name: name.trim(),
      personality: personality.trim(),
      avatar: avatar || '🤖',
      color: color || 'from-gray-500 to-slate-500'
    });
    
    res.status(201).json({
      ...character,
      message: 'Character created successfully'
    });
    
  } catch (error) {
    console.error('Error creating character:', error);
    
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ 
        error: 'Character name already exists' 
      });
    }
    
    res.status(500).json({ error: 'Failed to create character' });
  }
});

app.put('/api/characters/:id', requireAuth, async (req, res) => {
  try {
    const { name, personality, avatar, color } = req.body;
    
    if (!name || !personality) {
      return res.status(400).json({ 
        error: 'Name and personality are required fields' 
      });
    }
    
    const character = await db.updateCharacter(req.params.id, req.userId, {
      name: name.trim(),
      personality: personality.trim(),
      avatar: avatar,
      color: color
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
    
    console.log('📤 Sending settings to frontend:', settings);
    res.json(settings);
  } catch (error) {
    console.error('Error fetching user settings:', error);
    res.status(500).json({ error: 'Failed to fetch user settings' });
  }
});

app.put('/api/user/settings', requireAuth, async (req, res) => {
  try {
    console.log('📥 Received settings update:', req.body);
    
    const settings = await db.updateUserSettings(req.userId, req.body);
    
    console.log('✅ Settings updated successfully:', settings);
    
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
    // Check if it's a default scenario
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
// IMAGE UPLOAD API ROUTES
// Add these routes to your server-supabase.js file
// ============================================================================

/**
 * Update character image
 * PUT /api/characters/:id/image
 */
app.put('/api/characters/:id/image', requireAuth, async (req, res) => {
  try {
    const { url, filename, useCustomImage } = req.body;
    
    const result = await db.updateCharacterImage(req.userId, req.params.id, {
      url,
      filename,
      useCustomImage
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

/**
 * Update user persona image
 * PUT /api/user/persona/image
 */
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

/**
 * Update scenario background image
 * PUT /api/scenarios/:id/image
 */
app.put('/api/scenarios/:id/image', requireAuth, async (req, res) => {
  try {
    const { url, filename, useCustomImage } = req.body;
    
    // Check if it's a default scenario
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

/**
 * Delete uploaded image
 * DELETE /api/images/:type/:filename
 */
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
// USER PERSONA MANAGEMENT ROUTES
// ============================================================================

/**
 * Get user's persona
 * GET /api/user/persona
 */
app.get('/api/user/persona', requireAuth, async (req, res) => {
  try {
    const result = await db.getUserPersona(req.userId);
    res.json(result);
  } catch (error) {
    console.error('Error fetching user persona:', error);
    res.status(500).json({ error: 'Failed to fetch user persona' });
  }
});

/**
 * Create or update user persona
 * POST /api/user/persona
 */
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

/**
 * Delete user persona (reset to default)
 * DELETE /api/user/persona
 */
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
// ENHANCED CHAT SYSTEM WITH MEMORY INTEGRATION
// Replace your existing group-response route in server-supabase.js
// ============================================================================

/**
 * Enhanced AI API caller with memory and persona integration
 */
async function callAIProviderWithMemory(messages, characterPrompt, provider, userId, ollamaSettings, characterContext) {
  try {
    // Get user's decrypted API keys
    const apiKeys = await db.getDecryptedApiKeys(userId);
    
    // Build enhanced system prompt with memory and persona
    const enhancedPrompt = buildEnhancedCharacterPrompt(characterPrompt, characterContext);
    
    switch (provider.toLowerCase()) {
      case 'openai':
        if (!apiKeys.openai) {
          throw new Error('OpenAI API key not configured');
        }
        return await callOpenAIWithMemory(messages, enhancedPrompt, apiKeys.openai);
        
      case 'anthropic':
        if (!apiKeys.anthropic) {
          throw new Error('Anthropic API key not configured');
        }
        return await callAnthropicWithMemory(messages, enhancedPrompt, apiKeys.anthropic);
        
      case 'ollama':
        return await callOllamaWithMemory(
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
 * Build enhanced character prompt with memory and persona
 */
function buildEnhancedCharacterPrompt(basePersonality, characterContext) {
  const { userPersona, memories, relationship, conversationContext } = characterContext;
  
  let enhancedPrompt = `${GLOBAL_SYSTEM_PROMPT}

CHARACTER PERSONALITY:
${basePersonality}

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
Familiarity Level: ${Math.round(relationship.familiarity_level * 100)}% (0% = stranger, 100% = very close)
Trust Level: ${Math.round(relationship.trust_level * 100)}% (0% = no trust, 100% = complete trust)
Emotional Bond: ${Math.round((relationship.emotional_bond + 1) * 50)}% (0% = dislike, 50% = neutral, 100% = strong positive feelings)
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

  // Add conversation context
  if (conversationContext && conversationContext.context_summary) {
    enhancedPrompt += `

RECENT CONVERSATION CONTEXT:
${conversationContext.context_summary}`;

    if (conversationContext.important_points && conversationContext.important_points.length > 0) {
      enhancedPrompt += `

KEY POINTS TO REMEMBER:
${conversationContext.important_points.map(point => `- ${point}`).join('\n')}`;
    }
  }

  // Enhanced character identity rules
  enhancedPrompt += `

CRITICAL IDENTITY RULES:
1. Always refer to the user as "${userPersona.name}" - NEVER use "[User's Name]", "User", or generic terms
2. You are ONLY this character - never speak for ${userPersona.name} or other characters
3. Respond based on your relationship level and shared history
4. Remember and reference past conversations and memories naturally
5. Your responses should reflect your familiarity level with ${userPersona.name}
6. If you don't know something about ${userPersona.name}, you can ask rather than assume
7. Stay completely in character while being contextually aware of your relationship`;

  return enhancedPrompt;
}

/**
 * Enhanced OpenAI API call with memory context
 */
async function callOpenAIWithMemory(messages, enhancedPrompt, apiKey) {
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: enhancedPrompt },
        ...messages
      ],
      max_tokens: 150, // Slightly increased for more context-aware responses
      temperature: 0.8, // Slightly lower for more consistent character behavior
      presence_penalty: 0.6,
      frequency_penalty: 0.3
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000 // Increased timeout for memory processing
    });
    
    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('OpenAI API Error:', error.response?.data || error.message);
    throw new Error(`OpenAI API failed: ${error.response?.data?.error?.message || error.message}`);
  }
}

/**
 * Enhanced Anthropic API call with memory context
 */
async function callAnthropicWithMemory(messages, enhancedPrompt, apiKey) {
  try {
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-haiku-20240307',
      max_tokens: 150,
      system: enhancedPrompt,
      messages: messages
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

/**
 * Enhanced Ollama API call with memory context
 */
async function callOllamaWithMemory(messages, enhancedPrompt, baseUrl = 'http://localhost:11434', model = 'llama2') {
  try {
    const conversationPrompt = `${enhancedPrompt}\n\nConversation:\n${
      messages.map(m => `${m.role === 'user' ? 'Human' : 'Assistant'}: ${m.content}`).join('\n')
    }\n\nResponse:`;

    const response = await axios.post(`${baseUrl}/api/generate`, {
      model: model,
      prompt: conversationPrompt,
      stream: false,
      options: {
        temperature: 0.8,
        max_tokens: 150,
        stop: ['\n\nHuman:', '\n\nAssistant:']
      }
    }, {
      timeout: 20000
    });
    
    return response.data.response.trim();
  } catch (error) {
    console.error('Ollama API Error:', error.response?.data || error.message);
    throw new Error(`Ollama API failed: ${error.message}`);
  }
}
// ============================================================================
// MISSING FUNCTIONS - Add these to your server-supabase.js file
// Add them right after the callOllamaWithMemory function and before the group-response route
// ============================================================================

/**
 * Determine which characters should respond based on group dynamics mode
 */
function determineResponsePattern(activeCharacters, groupMode, conversationHistory) {
  switch (groupMode) {
    case 'natural':
      // Natural flow: 1-3 characters respond, influenced by recent activity
      const recentSpeakers = conversationHistory
        .slice(-5)
        .filter(m => m.type === 'character')
        .map(m => m.character);
      
      // Prefer characters who haven't spoken recently
      const sortedByRecency = activeCharacters.sort((a, b) => {
        const aLastIndex = recentSpeakers.lastIndexOf(a);
        const bLastIndex = recentSpeakers.lastIndexOf(b);
        return aLastIndex - bLastIndex; // Characters who spoke less recently come first
      });
      
      const numResponders = Math.min(
        Math.floor(Math.random() * 2) + 1, // 1-2 characters usually
        sortedByRecency.length
      );
      
      return sortedByRecency.slice(0, numResponders);
      
    case 'round-robin':
      // Round robin: next character in line
      const lastResponder = conversationHistory
        .slice()
        .reverse()
        .find(m => m.type === 'character')?.character;
        
      const lastIndex = activeCharacters.indexOf(lastResponder);
      const nextIndex = (lastIndex + 1) % activeCharacters.length;
      return [activeCharacters[nextIndex]];
      
    case 'all-respond':
      // Everyone responds
      return [...activeCharacters];
      
    default:
      return [activeCharacters[0]]; // Fallback
  }
}
/**
 * Enhanced group response route with memory integration
 */
app.post('/api/chat/group-response', requireAuth, async (req, res) => {
  try {
    const { 
      userMessage, 
      activeCharacters, 
      scenario, 
      groupMode = 'natural',
      conversationHistory = [],
      sessionId = null
    } = req.body;
    
    if (!userMessage || !activeCharacters || activeCharacters.length === 0) {
      return res.status(400).json({ 
        error: 'User message and active characters are required' 
      });
    }
    
    // Get user settings
    const userSettings = await db.getUserSettings(req.userId);
    const apiProvider = userSettings.apiProvider || 'openai';
    
    // Get user's characters
    const { characters } = await db.getCharacters(req.userId);
    const characterMap = new Map(characters.map(char => [char.id, char]));
    
    // Build conversation context
    const contextualMessages = [
      { role: 'system', content: `Context: ${scenario}` },
      ...conversationHistory.slice(-10),
      { role: 'user', content: userMessage }
    ];
    
    // Determine response pattern
    let responsePattern = determineResponsePattern(
      activeCharacters, 
      groupMode, 
      conversationHistory
    );
    
    // Generate responses with memory integration
    const responses = [];
    
    for (let i = 0; i < responsePattern.length; i++) {
      const characterId = responsePattern[i];
      const character = characterMap.get(characterId);
      
      if (!character) {
        console.error(`Character not found: ${characterId}`);
        continue;
      }
      
      try {
        // Build character context with memories and relationships
        const characterContext = await db.buildCharacterContext(
          characterId, 
          req.userId, 
          sessionId
        );
        
        console.log(`📝 Character context for ${character.name}:`, {
          userPersona: characterContext.userPersona.name,
          memoryCount: characterContext.memories.length,
          relationshipType: characterContext.relationship.relationship_type,
          familiarityLevel: characterContext.relationship.familiarity_level
        });
        
        // Generate response with memory context
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
        
        responses.push({
          character: characterId,
          response: response,
          timestamp: new Date().toISOString(),
          delay: i * 1200
        });
        
        // Process memories and relationships after successful response
        await processConversationMemories(
          characterId,
          req.userId,
          userMessage,
          response,
          characterContext,
          sessionId
        );
        
      } catch (error) {
        console.error(`Error generating response for character ${characterId}:`, error);
        responses.push({
          character: characterId,
          response: "Sorry, I'm having trouble responding right now...",
          timestamp: new Date().toISOString(),
          delay: i * 1200,
          error: true
        });
      }
    }
    
    if (responses.length === 0) {
      return res.status(500).json({ 
        error: 'No character responses could be generated' 
      });
    }
    
    res.json({ responses });
    
  } catch (error) {
    console.error('Error generating group response:', error);
    res.status(500).json({ 
      error: 'Failed to generate group response',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Process conversation for memories and relationship updates
 */
async function processConversationMemories(characterId, userId, userMessage, characterResponse, characterContext, sessionId) {
  try {
    // Analyze conversation for new memories
    const newMemories = db.analyzeConversationForMemories(
      userMessage, 
      characterResponse, 
      characterContext.userPersona
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
    
    // Update conversation context if session provided
    if (sessionId) {
      const conversationSummary = await generateConversationSummary(
        userMessage,
        characterResponse,
        characterContext.conversationContext
      );
      
      await db.updateConversationContext(sessionId, characterId, userId, {
        summary: conversationSummary,
        important_points: extractImportantPoints(userMessage, characterResponse),
        last_messages: [userMessage, characterResponse],
        token_count: estimateTokenCount(userMessage + characterResponse)
      });
    }
    
    console.log(`✅ Updated memories and relationship for ${characterId}`);
    
  } catch (error) {
    console.error('Error processing conversation memories:', error);
    // Don't throw error - memory processing shouldn't break chat
  }
}

/**
 * Generate conversation summary for context management
 */
async function generateConversationSummary(userMessage, characterResponse, existingContext) {
  try {
    // Simple extractive summary for now - could be enhanced with AI summarization
    const recentExchange = `User: ${userMessage.substring(0, 100)}... Character: ${characterResponse.substring(0, 100)}...`;
    
    if (existingContext && existingContext.context_summary) {
      return `${existingContext.context_summary}\n\nRecent: ${recentExchange}`;
    }
    
    return `Recent conversation: ${recentExchange}`;
    
  } catch (error) {
    console.error('Error generating conversation summary:', error);
    return 'Conversation in progress';
  }
}

/**
 * Extract important points from conversation
 */
function extractImportantPoints(userMessage, characterResponse) {
  const points = [];
  
  // Extract personal information mentions
  const personalRegex = /(?:my name is|i'm|i am|i work|i live|i like|i love|i hate) ([^.!?]+)/gi;
  let match;
  
  while ((match = personalRegex.exec(userMessage)) !== null) {
    points.push(`User mentioned: ${match[0]}`);
  }
  
  // Extract emotional expressions
  const emotionalRegex = /(?:i feel|i'm feeling|that makes me|i'm) (sad|happy|excited|angry|frustrated|worried|nervous|proud|grateful)/gi;
  while ((match = emotionalRegex.exec(userMessage)) !== null) {
    points.push(`User expressed feeling: ${match[1]}`);
  }
  
  return points.slice(0, 5); // Limit to 5 most recent important points
}

/**
 * Simple token estimation
 */
function estimateTokenCount(text) {
  // Rough estimation: ~4 characters per token for English text
  return Math.ceil(text.length / 4);
}
// ============================================================================
// MEMORY MANAGEMENT ROUTES
// ============================================================================

/**
 * Get character memories for debugging/admin
 * GET /api/character/:id/memories
 */
app.get('/api/character/:characterId/memories', requireAuth, async (req, res) => {
  try {
    const memories = await db.getCharacterMemories(req.params.characterId, req.userId, 20);
    res.json({ memories });
  } catch (error) {
    console.error('Error fetching character memories:', error);
    res.status(500).json({ error: 'Failed to fetch character memories' });
  }
});

/**
 * Get character relationship status
 * GET /api/character/:id/relationship
 */
app.get('/api/character/:characterId/relationship', requireAuth, async (req, res) => {
  try {
    const relationship = await db.getCharacterRelationship(req.params.characterId, req.userId);
    res.json({ relationship });
  } catch (error) {
    console.error('Error fetching character relationship:', error);
    res.status(500).json({ error: 'Failed to fetch character relationship' });
  }
});

/**
 * Clear character memories (for testing/reset)
 * DELETE /api/character/:id/memories
 */
app.delete('/api/character/:characterId/memories', requireAuth, async (req, res) => {
  try {
    const { error } = await db.supabase
      .from('character_memories')
      .delete()
      .eq('character_id', req.params.characterId)
      .eq('user_id', req.userId);
      
    if (error) throw error;
    
    res.json({ message: 'Character memories cleared successfully' });
  } catch (error) {
    console.error('Error clearing character memories:', error);
    res.status(500).json({ error: 'Failed to clear character memories' });
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
    database: 'Supabase'
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
🚀 CHAIT World Server Started (Supabase Edition)
📡 Port: ${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
🗄️  Database: Supabase
🔐 Auth: Google OAuth
🎭 Features: Characters, Scenes, Settings, Chat History
  `);
});

module.exports = app;