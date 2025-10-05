// ============================================================================
// CHAIT World - AI Provider Routes
// API endpoints for testing keys and fetching available models
// ============================================================================

const express = require('express');
const router = express.Router();
const AIProviderService = require('../services/AIProviderService');

/**
 * Test API key for a specific provider
 * POST /api/providers/test
 * Body: { provider, apiKey, ollamaSettings }
 */
router.post('/test', async (req, res) => {
  try {
    const { provider, apiKey, ollamaSettings } = req.body;
    
    if (!provider) {
      return res.status(400).json({ error: 'Provider is required' });
    }
    
    // For Ollama, we don't need an API key
    if (provider.toLowerCase() === 'ollama') {
      const result = await AIProviderService.testApiKey(provider, null, ollamaSettings);
      return res.json(result);
    }
    
    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }
    
    const result = await AIProviderService.testApiKey(provider, apiKey, ollamaSettings);
    res.json(result);
    
  } catch (error) {
    console.error('Error testing API key:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to test API key',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get available models for a provider
 * POST /api/providers/models
 * Body: { provider, apiKey, ollamaSettings }
 */
router.post('/models', async (req, res) => {
  try {
    const { provider, apiKey, ollamaSettings } = req.body;
    
    if (!provider) {
      return res.status(400).json({ error: 'Provider is required' });
    }
    
    const models = await AIProviderService.getAvailableModels(
      provider,
      apiKey,
      ollamaSettings
    );
    
    res.json({ models });
    
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({ 
      error: 'Failed to fetch models',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
/**
 * Get list of installed Ollama models
 * POST /api/providers/ollama/models
 * Body: { baseUrl }
 */
router.post('/ollama/models', async (req, res) => {
  try {
    const { baseUrl } = req.body;
    const ollamaSettings = { baseUrl: baseUrl || 'http://localhost:11434' };
    
    const models = await AIProviderService.getOllamaModels(ollamaSettings);
    
    res.json({ models });
    
  } catch (error) {
    console.error('Error fetching Ollama models:', error);
    res.status(500).json({
      error: 'Failed to fetch Ollama models. Make sure Ollama is running.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
/**
 * Get all supported providers and their info
 * GET /api/providers/list
 */
router.get('/list', (req, res) => {
  const providers = [
    {
      id: 'openai',
      name: 'OpenAI',
      description: 'GPT-3.5, GPT-4, and other OpenAI models',
      requiresKey: true,
      defaultModel: 'gpt-3.5-turbo',
      icon: '🤖',
      websiteUrl: 'https://platform.openai.com'
    },
    {
      id: 'anthropic',
      name: 'Anthropic',
      description: 'Claude 3 Opus, Sonnet, and Haiku',
      requiresKey: true,
      defaultModel: 'claude-3-haiku-20240307',
      icon: '🧠',
      websiteUrl: 'https://console.anthropic.com'
    },
    {
      id: 'openrouter',
      name: 'OpenRouter',
      description: 'Access 100+ models through one API',
      requiresKey: true,
      defaultModel: 'openai/gpt-5',
      icon: '🌐',
      websiteUrl: 'https://openrouter.ai'
    },
    {
      id: 'google',
      name: 'Google Gemini',
      description: 'Gemini 2.5 Flash',
      requiresKey: true,
      defaultModel: 'gemini-2.5-pro-flash',
      icon: '✨',
      websiteUrl: 'https://ai.google.dev'
    },
    {
      id: 'ollama',
      name: 'Ollama (Local)',
      description: 'Run models locally on your machine',
      requiresKey: false,
      defaultModel: 'mtaylor91/l3-stheno-maid-blackroot:8b',
      icon: '💻',
      websiteUrl: 'https://ollama.ai'
    }
  ];
  
  res.json({ providers });
});

/**
 * Get recommended models for different use cases
 * GET /api/providers/recommendations
 */
router.get('/recommendations', (req, res) => {
  const recommendations = {
    fastest: [
      { provider: 'openai', model: 'gpt-3.5', description: 'Fast and affordable' },
      { provider: 'google', model: 'gemini-pro', description: 'Quick responses' },
      { provider: 'anthropic', model: 'claude-3-haiku-20240307', description: 'Speedy Claude' }
    ],
    smartest: [
      { provider: 'openai', model: 'gpt-4-turbo-preview', description: 'Most capable GPT' },
      { provider: 'anthropic', model: 'claude-3-opus-20240229', description: 'Highest quality Claude' },
      { provider: 'openrouter', model: 'anthropic/claude-3-opus-20240229', description: 'Opus via OpenRouter' }
    ],
    balanced: [
      { provider: 'openai', model: 'gpt-5', description: 'Good balance of speed/quality' },
      { provider: 'anthropic', model: 'claude-3-sonnet-20240229', description: 'Middle-tier Claude' },
      { provider: 'google', model: 'gemini-pro', description: 'Balanced Gemini' }
    ],
    free: [
      { provider: 'ollama', model: 'llama2', description: 'Free local model' },
      { provider: 'ollama', model: 'mistral', description: 'Free local Mistral' }
    ]
  };
  
  res.json({ recommendations });
});

module.exports = router;
