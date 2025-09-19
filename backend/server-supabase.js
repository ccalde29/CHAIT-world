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
2. Keep responses conversational and under 50 words  
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
// ENHANCED CHAT ROUTES
// ============================================================================

app.post('/api/chat/group-response', requireAuth, async (req, res) => {
  try {
    const { 
      userMessage, 
      activeCharacters, 
      scenario, 
      groupMode = 'natural',
      conversationHistory = []
    } = req.body;
    
    if (!userMessage || !activeCharacters || activeCharacters.length === 0) {
      return res.status(400).json({ 
        error: 'User message and active characters are required' 
      });
    }
    
    // Get user settings
    const userSettings = await db.getUserSettings(req.userId);
    console.log('🔧 User settings for chat:', userSettings);
    
    // Use the correct property names from the converted settings
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
    
    // Generate responses
    const responses = [];
    
    for (let i = 0; i < responsePattern.length; i++) {
      const characterId = responsePattern[i];
      const character = characterMap.get(characterId);
      
      if (!character) {
        console.error(`Character not found: ${characterId}`);
        continue;
      }
      
      try {
        const response = await callAIProvider(
          contextualMessages,
          character.personality,
          apiProvider,
          req.userId,
          userSettings.ollamaSettings || {
            baseUrl: 'http://localhost:11434',
            model: 'llama2'
          }
        );
        
        responses.push({
          character: characterId,
          response: response,
          timestamp: new Date().toISOString(),
          delay: i * 1200
        });
        
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

// Response pattern logic remains the same...
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