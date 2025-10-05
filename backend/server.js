/**
 * AI Group Chat Backend Server
 * 
 * A Node.js/Express server that orchestrates group conversations between 
 * multiple AI characters with distinct personalities. Supports multiple
 * AI providers (OpenAI, Anthropic, Ollama) and dynamic character management.
 * 
 * @version 1.0.0
 * @author AI Group Chat Team
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

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

// ============================================================================
// GLOBAL SYSTEM PROMPT & CONFIGURATION
// ============================================================================

/**
 * Universal system prompt applied to all AI characters
 * This ensures consistent behavior across all character interactions
 */
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
 * Default character configurations
 * These serve as examples and fallbacks, but users can create custom characters
 */
const DEFAULT_CHARACTERS = {
  maya: {
    name: 'Maya',
    personality: 'Energetic art student who loves creativity, colors, and seeing the artistic side of everything. Optimistic and playful with a tendency to get excited about visual concepts.',
    avatar: '🎨',
    color: 'from-pink-500 to-purple-500',
    responseStyle: 'playful',
    isDefault: true
  },
  alex: {
    name: 'Alex', 
    personality: 'Thoughtful philosophy major who asks deep questions about human nature, meaning, and existence. Contemplative and curious, often references philosophical concepts.',
    avatar: '🤔',
    color: 'from-blue-500 to-indigo-500',
    responseStyle: 'contemplative',
    isDefault: true
  },
  zoe: {
    name: 'Zoe',
    personality: 'Sarcastic tech enthusiast with quick wit and dry humor. Knowledgeable about technology and internet culture, slightly cynical but ultimately caring.',
    avatar: '💻',
    color: 'from-green-500 to-teal-500', 
    responseStyle: 'witty',
    isDefault: true
  },
  finn: {
    name: 'Finn',
    personality: 'Laid-back musician who goes with the flow and relates everything back to music, lyrics, or cultural moments. Supportive and chill with a creative soul.',
    avatar: '🎸',
    color: 'from-orange-500 to-red-500',
    responseStyle: 'chill',
    isDefault: true
  }
};

/**
 * Scenario contexts that influence character responses
 */
const SCENARIO_CONTEXTS = {
  'coffee-shop': {
    name: 'Coffee Shop Hangout',
    description: 'A cozy coffee shop atmosphere with the aroma of fresh coffee and soft background music. Perfect for casual conversations.',
    context: 'The group is hanging out at a cozy coffee shop on a relaxed afternoon, sharing drinks and casual conversation.'
  },
  'study-group': {
    name: 'Study Session', 
    description: 'A focused but collaborative environment where friends work on assignments together.',
    context: 'The group is in a study session, working on assignments together but taking breaks to chat and help each other.'
  },
  'party': {
    name: 'House Party',
    description: 'An energetic social gathering with music, laughter, and a lively atmosphere.',
    context: 'The group is at a weekend house party with music playing, people socializing, and a fun, energetic atmosphere.'
  }
};

// ============================================================================
// IN-MEMORY DATA STORAGE (TODO: Replace with database)
// ============================================================================

/**
 * In-memory storage for custom characters, user settings, and custom scenes
 * This will be replaced with proper database storage in the next iteration
 */
let customCharacters = new Map(); // userId -> Map<characterId, characterData>
let userSettings = new Map(); // userId -> userSettings
let customScenes = new Map(); // userId -> Map<sceneId, sceneData> = new Map(); // userId -> userSettings

/**
 * Generate unique IDs for characters and users
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ============================================================================
// AI PROVIDER INTEGRATION
// ============================================================================

/**
 * OpenAI API Integration
 * Uses GPT models for character responses
 */
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
      presence_penalty: 0.6, // Encourage diverse responses
      frequency_penalty: 0.3 // Reduce repetition
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 second timeout
    });
    
    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('OpenAI API Error:', error.response?.data || error.message);
    throw new Error(`OpenAI API failed: ${error.response?.data?.error?.message || error.message}`);
  }
}

/**
 * Anthropic Claude API Integration  
 * Uses Claude models for character responses
 */
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

/**
 * Ollama API Integration (Local AI Models)
 * Supports any model available in local Ollama installation
 */
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
      timeout: 15000 // Ollama can be slower
    });
    
    return response.data.response.trim();
  } catch (error) {
    console.error('Ollama API Error:', error.response?.data || error.message);
    throw new Error(`Ollama API failed: ${error.message}`);
  }
}

/**
 * Universal AI API caller
 * Routes to appropriate provider based on user settings
 */
async function callAIProvider(messages, characterPrompt, provider, userApiKeys, ollamaSettings) {
  switch (provider.toLowerCase()) {
    case 'openai':
      if (!userApiKeys.openai) throw new Error('OpenAI API key required');
      return await callOpenAI(messages, characterPrompt, userApiKeys.openai);
      
    case 'anthropic':
      if (!userApiKeys.anthropic) throw new Error('Anthropic API key required');
      return await callAnthropic(messages, characterPrompt, userApiKeys.anthropic);
      
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
}

// ============================================================================
// CHARACTER MANAGEMENT ROUTES
// ============================================================================

/**
 * Get all available characters for a user (default + custom - deleted)
 * GET /api/characters
 */
app.get('/api/characters', (req, res) => {
  try {
    const userId = req.headers['user-id'] || 'anonymous';
    
    // Get default characters
    const defaultChars = Object.entries(DEFAULT_CHARACTERS).map(([id, char]) => ({
      id,
      ...char
    }));
    
    // Get user's custom characters and deletion records
    const userCustomChars = customCharacters.get(userId) || new Map();
    const customChars = [];
    const deletedDefaultIds = new Set();
    
    // Process user's custom data
    for (const [id, char] of userCustomChars.entries()) {
      if (char.isDeleted) {
        // This is a deletion record for a default character
        deletedDefaultIds.add(char.originalId);
      } else {
        // This is a regular custom character
        customChars.push({
          id,
          ...char,
          isDefault: false
        });
      }
    }
    
    // Filter out deleted default characters
    const filteredDefaultChars = defaultChars.filter(char => !deletedDefaultIds.has(char.id));
    
    res.json({
      characters: [...filteredDefaultChars, ...customChars],
      total: filteredDefaultChars.length + customChars.length
    });
    
  } catch (error) {
    console.error('Error fetching characters:', error);
    res.status(500).json({ error: 'Failed to fetch characters' });
  }
});

/**
 * Create a new custom character
 * POST /api/characters
 */
app.post('/api/characters', (req, res) => {
  try {
    const userId = req.headers['user-id'] || 'anonymous';
    const { name, personality, avatar, color } = req.body;
    
    // Validate required fields
    if (!name || !personality) {
      return res.status(400).json({ 
        error: 'Name and personality are required fields' 
      });
    }
    
    // Validate character name uniqueness for this user
    const userChars = customCharacters.get(userId) || new Map();
    const existingChar = Array.from(userChars.values()).find(
      char => char.name.toLowerCase() === name.toLowerCase()
    );
    
    if (existingChar) {
      return res.status(400).json({ 
        error: 'Character name already exists' 
      });
    }
    
    // Create new character
    const characterId = generateId();
    const newCharacter = {
      name: name.trim(),
      personality: personality.trim(),
      avatar: avatar || '🤖',
      color: color || 'from-gray-500 to-slate-500',
      responseStyle: 'custom',
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Store character
    if (!customCharacters.has(userId)) {
      customCharacters.set(userId, new Map());
    }
    customCharacters.get(userId).set(characterId, newCharacter);
    
    res.status(201).json({
      id: characterId,
      ...newCharacter,
      message: 'Character created successfully'
    });
    
  } catch (error) {
    console.error('Error creating character:', error);
    res.status(500).json({ error: 'Failed to create character' });
  }
});

/**
 * Update an existing character (both custom and default)
 * PUT /api/characters/:id
 */
app.put('/api/characters/:id', (req, res) => {
  try {
    const userId = req.headers['user-id'] || 'anonymous';
    const characterId = req.params.id;
    const { name, personality, avatar, color } = req.body;
    
    // Validate required fields
    if (!name || !personality) {
      return res.status(400).json({ 
        error: 'Name and personality are required fields' 
      });
    }
    
    // Get user's custom characters
    const userChars = customCharacters.get(userId) || new Map();
    
    let existingCharacter;
    let isDefaultCharacter = false;
    
    // Check if it's a default character
    if (DEFAULT_CHARACTERS[characterId]) {
      existingCharacter = DEFAULT_CHARACTERS[characterId];
      isDefaultCharacter = true;
    } else {
      existingCharacter = userChars.get(characterId);
    }
    
    if (!existingCharacter) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    // Check name uniqueness (excluding current character)
    // Check both custom characters and other default characters
    const nameConflict = Array.from(userChars.entries()).find(
      ([id, char]) => id !== characterId && char.name.toLowerCase() === name.toLowerCase()
    ) || Object.entries(DEFAULT_CHARACTERS).find(
      ([id, char]) => id !== characterId && char.name.toLowerCase() === name.toLowerCase()
    );
    
    if (nameConflict) {
      return res.status(400).json({ 
        error: 'Character name already exists' 
      });
    }
    
    // Create updated character
    const updatedCharacter = {
      ...existingCharacter,
      name: name.trim(),
      personality: personality.trim(),
      avatar: avatar || existingCharacter.avatar,
      color: color || existingCharacter.color,
      isDefault: isDefaultCharacter,
      updatedAt: new Date().toISOString()
    };
    
    if (isDefaultCharacter) {
      // For default characters, store the customized version in user's custom characters
      // This way we preserve the original defaults while allowing user customization
      updatedCharacter.originalId = characterId;
      updatedCharacter.isDefault = false; // Mark as custom since it's been modified
      updatedCharacter.isModifiedDefault = true; // Track that it was originally a default
      const newId = `${characterId}_${userId}_modified`;
      userChars.set(newId, updatedCharacter);
      
      res.json({
        id: newId,
        ...updatedCharacter,
        message: 'Default character customized successfully'
      });
    } else {
      // Regular custom character update
      userChars.set(characterId, updatedCharacter);
      
      res.json({
        id: characterId,
        ...updatedCharacter,
        message: 'Character updated successfully'
      });
    }
    
  } catch (error) {
    console.error('Error updating character:', error);
    res.status(500).json({ error: 'Failed to update character' });
  }
});

/**
 * Delete a character (both custom and default)
 * DELETE /api/characters/:id
 */
app.delete('/api/characters/:id', (req, res) => {
  try {
    const userId = req.headers['user-id'] || 'anonymous';
    const characterId = req.params.id;
    
    // Get user's custom characters
    const userChars = customCharacters.get(userId) || new Map();
    
    // Check if it's a default character
    if (DEFAULT_CHARACTERS[characterId]) {
      // For default characters, we can't actually delete them from the global defaults
      // but we can mark them as "hidden" for this user by creating a deletion record
      const deletionRecord = {
        originalId: characterId,
        isDeleted: true,
        deletedAt: new Date().toISOString()
      };
      
      // Store deletion record with a special ID
      const deletionId = `${characterId}_${userId}_deleted`;
      userChars.set(deletionId, deletionRecord);
      
      res.json({ 
        message: 'Default character hidden successfully',
        deletedCharacterId: characterId
      });
    } else if (userChars.has(characterId)) {
      // Regular custom character deletion
      userChars.delete(characterId);
      
      res.json({ 
        message: 'Character deleted successfully',
        deletedCharacterId: characterId
      });
    } else {
      return res.status(404).json({ error: 'Character not found' });
    }
    
  } catch (error) {
    console.error('Error deleting character:', error);
    res.status(500).json({ error: 'Failed to delete character' });
  }
});

// ============================================================================
// USER SETTINGS MANAGEMENT
// ============================================================================

/**
 * Get user settings
 * GET /api/user/settings
 */
app.get('/api/user/settings', (req, res) => {
  try {
    const userId = req.headers['user-id'] || 'anonymous';
    
    const settings = userSettings.get(userId) || {
      apiProvider: 'openai',
      apiKeys: {
        openai: '',
        anthropic: ''
      },
      ollamaSettings: {
        baseUrl: 'http://localhost:11434',
        model: 'llama2'
      },
      defaultScenario: 'coffee-shop',
      preferences: {
        responseDelay: true,
        showTypingIndicator: true,
        maxCharactersInGroup: 5
      }
    };
    
    // Don't send API keys back to client for security
    const safeSettings = {
      ...settings,
      apiKeys: {
        openai: settings.apiKeys.openai ? '***configured***' : '',
        anthropic: settings.apiKeys.anthropic ? '***configured***' : ''
      }
    };
    
    res.json(safeSettings);
    
  } catch (error) {
    console.error('Error fetching user settings:', error);
    res.status(500).json({ error: 'Failed to fetch user settings' });
  }
});

/**
 * Update user settings
 * PUT /api/user/settings
 */
app.put('/api/user/settings', (req, res) => {
  try {
    const userId = req.headers['user-id'] || 'anonymous';
    const updates = req.body;
    
    // Get existing settings
    const currentSettings = userSettings.get(userId) || {
      apiProvider: 'openai',
      apiKeys: { openai: '', anthropic: '' },
      ollamaSettings: { baseUrl: 'http://localhost:11434', model: 'llama2' },
      defaultScenario: 'coffee-shop',
      preferences: {
        responseDelay: true,
        showTypingIndicator: true,
        maxCharactersInGroup: 5
      }
    };
    
    // Validate API provider
    if (updates.apiProvider && !['openai', 'anthropic', 'ollama'].includes(updates.apiProvider)) {
      return res.status(400).json({ 
        error: 'Invalid API provider. Must be: openai, anthropic, or ollama' 
      });
    }
    
    // Validate scenario
    if (updates.defaultScenario && !SCENARIO_CONTEXTS[updates.defaultScenario]) {
      return res.status(400).json({ 
        error: 'Invalid default scenario' 
      });
    }
    
    // Update settings (deep merge)
    const updatedSettings = {
      ...currentSettings,
      ...updates,
      apiKeys: {
        ...currentSettings.apiKeys,
        ...(updates.apiKeys || {})
      },
      ollamaSettings: {
        ...currentSettings.ollamaSettings,
        ...(updates.ollamaSettings || {})
      },
      preferences: {
        ...currentSettings.preferences,
        ...(updates.preferences || {})
      },
      updatedAt: new Date().toISOString()
    };
    
    // Store updated settings
    userSettings.set(userId, updatedSettings);
    
    // Return safe settings (without API keys)
    const safeSettings = {
      ...updatedSettings,
      apiKeys: {
        openai: updatedSettings.apiKeys.openai ? '***configured***' : '',
        anthropic: updatedSettings.apiKeys.anthropic ? '***configured***' : ''
      }
    };
    
    res.json({
      settings: safeSettings,
      message: 'Settings updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating user settings:', error);
    res.status(500).json({ error: 'Failed to update user settings' });
  }
});

// ============================================================================
// CHAT & CONVERSATION ROUTES  
// ============================================================================

/**
 * Generate group response from multiple AI characters
 * POST /api/chat/group-response
 */
app.post('/api/chat/group-response', async (req, res) => {
  try {
    const userId = req.headers['user-id'] || 'anonymous';
    const { 
      userMessage, 
      activeCharacters, 
      scenario, 
      groupMode = 'natural',
      conversationHistory = []
    } = req.body;
    
    // Validate input
    if (!userMessage || !activeCharacters || activeCharacters.length === 0) {
      return res.status(400).json({ 
        error: 'User message and active characters are required' 
      });
    }
    
    // Get user settings for API configuration
    const settings = userSettings.get(userId) || { apiProvider: 'openai' };
    const apiProvider = settings.apiProvider;
    
    // Get scenario context
    const scenarioContext = SCENARIO_CONTEXTS[scenario]?.context || '';
    
    // Build conversation context
    const contextualMessages = [
      { role: 'system', content: `Context: ${scenarioContext}` },
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
      { role: 'user', content: userMessage }
    ];
    
    // Determine response pattern based on group mode
    let responsePattern = determineResponsePattern(
      activeCharacters, 
      groupMode, 
      conversationHistory
    );
    
    // Generate responses for each character in the pattern
    const responses = [];
    const userChars = customCharacters.get(userId) || new Map();
    
    for (let i = 0; i < responsePattern.length; i++) {
      const characterId = responsePattern[i];
      
      try {
        // Get character data (default or custom)
        const character = DEFAULT_CHARACTERS[characterId] || userChars.get(characterId);
        
        if (!character) {
          console.error(`Character not found: ${characterId}`);
          continue;
        }
        
        // Generate character response
        const response = await callAIProvider(
          contextualMessages,
          character.personality,
          apiProvider,
          settings.apiKeys || {},
          settings.ollamaSettings || {}
        );
        
        responses.push({
          character: characterId,
          response: response,
          timestamp: new Date().toISOString(),
          delay: i * 1200 // Stagger responses for realistic timing
        });
        
      } catch (error) {
        console.error(`Error generating response for character ${characterId}:`, error);
        // Continue with other characters even if one fails
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
 * Get available scenarios (default + custom)
 * GET /api/scenarios
 */
app.get('/api/scenarios', (req, res) => {
  try {
    const userId = req.headers['user-id'] || 'anonymous';
    
    // Get default scenarios
    const defaultScenarios = Object.entries(SCENARIO_CONTEXTS).map(([key, scenario]) => ({
      id: key,
      ...scenario,
      isDefault: true
    }));
    
    // Get user's custom scenarios
    const userScenes = customScenes.get(userId) || new Map();
    const customScenarios = Array.from(userScenes.entries()).map(([id, scene]) => ({
      id,
      ...scene,
      isDefault: false
    }));
    
    res.json({ 
      scenarios: [...defaultScenarios, ...customScenarios],
      total: defaultScenarios.length + customScenarios.length
    });
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    res.status(500).json({ error: 'Failed to fetch scenarios' });
  }
});

/**
 * Create a new custom scenario
 * POST /api/scenarios
 */
app.post('/api/scenarios', (req, res) => {
  try {
    const userId = req.headers['user-id'] || 'anonymous';
    const { name, description, context, atmosphere } = req.body;
    
    // Validate required fields
    if (!name || !description || !context) {
      return res.status(400).json({ 
        error: 'Name, description, and context are required fields' 
      });
    }
    
    // Validate scenario name uniqueness for this user
    const userScenes = customScenes.get(userId) || new Map();
    const existingScene = Array.from(userScenes.values()).find(
      scene => scene.name.toLowerCase() === name.toLowerCase()
    );
    
    // Also check against default scenarios
    const defaultNameConflict = Object.values(SCENARIO_CONTEXTS).find(
      scenario => scenario.name.toLowerCase() === name.toLowerCase()
    );
    
    if (existingScene || defaultNameConflict) {
      return res.status(400).json({ 
        error: 'Scene name already exists' 
      });
    }
    
    // Create new scenario
    const sceneId = generateId();
    const newScene = {
      name: name.trim(),
      description: description.trim(),
      context: context.trim(),
      atmosphere: atmosphere?.trim() || 'neutral',
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Store scenario
    if (!customScenes.has(userId)) {
      customScenes.set(userId, new Map());
    }
    customScenes.get(userId).set(sceneId, newScene);
    
    res.status(201).json({
      id: sceneId,
      ...newScene,
      message: 'Scene created successfully'
    });
    
  } catch (error) {
    console.error('Error creating scenario:', error);
    res.status(500).json({ error: 'Failed to create scenario' });
  }
});

/**
 * Update an existing scenario
 * PUT /api/scenarios/:id
 */
app.put('/api/scenarios/:id', (req, res) => {
  try {
    const userId = req.headers['user-id'] || 'anonymous';
    const sceneId = req.params.id;
    const { name, description, context, atmosphere } = req.body;
    
    // Check if it's a default scenario (cannot be edited)
    if (SCENARIO_CONTEXTS[sceneId]) {
      return res.status(400).json({ 
        error: 'Default scenarios cannot be edited. Create a custom scenario instead.' 
      });
    }
    
    // Get user's custom scenarios
    const userScenes = customScenes.get(userId) || new Map();
    const existingScene = userScenes.get(sceneId);
    
    if (!existingScene) {
      return res.status(404).json({ error: 'Scene not found' });
    }
    
    // Validate required fields
    if (!name || !description || !context) {
      return res.status(400).json({ 
        error: 'Name, description, and context are required fields' 
      });
    }
    
    // Check name uniqueness (excluding current scene)
    const nameConflict = Array.from(userScenes.entries()).find(
      ([id, scene]) => id !== sceneId && scene.name.toLowerCase() === name.toLowerCase()
    ) || Object.values(SCENARIO_CONTEXTS).find(
      scenario => scenario.name.toLowerCase() === name.toLowerCase()
    );
    
    if (nameConflict) {
      return res.status(400).json({ 
        error: 'Scene name already exists' 
      });
    }
    
    // Update scenario
    const updatedScene = {
      ...existingScene,
      name: name.trim(),
      description: description.trim(),
      context: context.trim(),
      atmosphere: atmosphere?.trim() || existingScene.atmosphere,
      updatedAt: new Date().toISOString()
    };
    
    userScenes.set(sceneId, updatedScene);
    
    res.json({
      id: sceneId,
      ...updatedScene,
      message: 'Scene updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating scenario:', error);
    res.status(500).json({ error: 'Failed to update scenario' });
  }
});

/**
 * Delete a custom scenario
 * DELETE /api/scenarios/:id
 */
app.delete('/api/scenarios/:id', (req, res) => {
  try {
    const userId = req.headers['user-id'] || 'anonymous';
    const sceneId = req.params.id;
    
    // Check if it's a default scenario (cannot be deleted)
    if (SCENARIO_CONTEXTS[sceneId]) {
      return res.status(400).json({ 
        error: 'Default scenarios cannot be deleted' 
      });
    }
    
    // Get user's custom scenarios
    const userScenes = customScenes.get(userId) || new Map();
    
    if (!userScenes.has(sceneId)) {
      return res.status(404).json({ error: 'Scene not found' });
    }
    
    // Delete scenario
    userScenes.delete(sceneId);
    
    res.json({ 
      message: 'Scene deleted successfully',
      deletedSceneId: sceneId
    });
    
  } catch (error) {
    console.error('Error deleting scenario:', error);
    res.status(500).json({ error: 'Failed to delete scenario' });
  }
});

// ============================================================================
// HEALTH & UTILITY ROUTES
// ============================================================================
/**
 * Health check endpoint
 * GET /health
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * Get server statistics
 * GET /api/stats
 */
app.get('/api/stats', (req, res) => {
  try {
    const totalCustomCharacters = Array.from(customCharacters.values())
      .reduce((total, userMap) => total + userMap.size, 0);
    
    const totalUsers = userSettings.size;
    
    res.json({
      stats: {
        totalUsers,
        totalCustomCharacters,
        defaultCharacters: Object.keys(DEFAULT_CHARACTERS).length,
        availableScenarios: Object.keys(SCENARIO_CONTEXTS).length,
        uptime: process.uptime()
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// ============================================================================
// ERROR HANDLING & SERVER STARTUP
// ============================================================================

/**
 * Global error handler
 */
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

/**
 * Handle 404 routes
 */
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

/**
 * Start the server
 */
app.listen(PORT, () => {
  console.log(`
🚀 AI Group Chat Server Started
📡 Port: ${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
📊 API Providers: ${process.env.OPENAI_API_KEY ? 'OpenAI ✓' : 'OpenAI ✗'} ${process.env.ANTHROPIC_API_KEY ? 'Anthropic ✓' : 'Anthropic ✗'} Ollama (Local)
🎭 Default Characters: ${Object.keys(DEFAULT_CHARACTERS).length}
🎬 Available Scenarios: ${Object.keys(SCENARIO_CONTEXTS).length}
  `);
});

module.exports = app;
