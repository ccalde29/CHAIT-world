// ============================================================================
// CHAIT World - Unified AI Provider Service
// Handles routing to OpenAI, Anthropic, OpenRouter, Google Gemini, and Ollama
// ============================================================================

const fetch = require('node-fetch');

/**
 * Unified AI Provider Service
 * Routes character AI calls to the appropriate provider based on character settings
 */
class AIProviderService {
  
  /**
   * Main entry point - calls AI based on character's configured provider
   * @param {Object} character - Character object with ai_provider and ai_model
   * @param {Array} messages - Conversation messages in OpenAI format
   * @param {Object} apiKeys - User's API keys for various providers
   * @param {Object} ollamaSettings - Ollama configuration
   * @returns {Promise<string>} - AI response text
   */
  static async generateResponse(character, messages, apiKeys = {}, ollamaSettings = {}) {
    const provider = character.ai_provider || 'openai';
    const model = character.ai_model || 'gpt-3.5-turbo';
    
    console.log(`[AI Service] Generating response for ${character.name} using ${provider}/${model}`);
    
    try {
      // Route to appropriate provider
      switch (provider.toLowerCase()) {
        case 'openai':
          return await this.callOpenAI(model, messages, apiKeys.openai, character);
        
        case 'anthropic':
          return await this.callAnthropic(model, messages, apiKeys.anthropic, character);
        
        case 'openrouter':
          return await this.callOpenRouter(model, messages, apiKeys.openrouter, character);
        
        case 'google':
        case 'gemini':
          return await this.callGemini(model, messages, apiKeys.google, character);
        
        case 'ollama':
          return await this.callOllama(model, messages, ollamaSettings, character);
        
        default:
          throw new Error(`Unsupported AI provider: ${provider}`);
      }
      
    } catch (error) {
      console.error(`[AI Service] Error with ${provider}:`, error.message);
      
      // Try fallback if configured
      if (character.fallback_provider && character.fallback_model) {
        console.log(`[AI Service] Attempting fallback: ${character.fallback_provider}/${character.fallback_model}`);
        
        const fallbackChar = {
          ...character,
          ai_provider: character.fallback_provider,
          ai_model: character.fallback_model
        };
        
        return await this.generateResponse(fallbackChar, messages, apiKeys, ollamaSettings);
      }
      
      throw error;
    }
  }
  
  // ==========================================================================
  // OPENAI
  // ==========================================================================
  
  static async callOpenAI(model, messages, apiKey, character) {
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: character.temperature || 0.8,
        max_tokens: character.max_tokens || 150,
        presence_penalty: 0.6,
        frequency_penalty: 0.3
      })
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content.trim();
  }
  
  // ==========================================================================
  // ANTHROPIC CLAUDE
  // ==========================================================================
  
  static async callAnthropic(model, messages, apiKey, character) {
    if (!apiKey) {
      throw new Error('Anthropic API key not configured');
    }
    
    // Convert OpenAI format to Anthropic format
    const systemMessage = messages.find(m => m.role === 'system')?.content || '';
    const conversationMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }));
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: character.max_tokens || 150,
        temperature: character.temperature || 0.8,
        system: systemMessage,
        messages: conversationMessages
      })
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `Anthropic API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.content[0].text.trim();
  }
  
  // ==========================================================================
  // OPENROUTER (Universal Gateway)
  // ==========================================================================
  
  static async callOpenRouter(model, messages, apiKey, character) {
    if (!apiKey) {
      throw new Error('OpenRouter API key not configured');
    }
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://chaitworld.com', // Replace with your domain
        'X-Title': 'CHAIT World'
      },
      body: JSON.stringify({
        model: model, // e.g., 'anthropic/claude-3.5-sonnet'
        messages: messages,
        temperature: character.temperature || 0.8,
        max_tokens: character.max_tokens || 150
      })
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `OpenRouter API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content.trim();
  }
  
  // ==========================================================================
  // GOOGLE GEMINI
  // ==========================================================================
  
  static async callGemini(model, messages, apiKey, character) {
    if (!apiKey) {
      throw new Error('Google API key not configured');
    }
    
    // Convert to Gemini format
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));
    
    // Add system message as first user message if exists
    const systemMessage = messages.find(m => m.role === 'system');
    if (systemMessage) {
      contents.unshift({
        role: 'user',
        parts: [{ text: `System instructions: ${systemMessage.content}` }]
      });
    }
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: contents,
          generationConfig: {
            temperature: character.temperature || 0.8,
            maxOutputTokens: character.max_tokens || 150
          }
        })
      }
    );
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `Gemini API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.candidates[0].content.parts[0].text.trim();
  }
  
  // ==========================================================================
  // OLLAMA (Local Models)
  // ==========================================================================
  
  static async callOllama(model, messages, ollamaSettings = {}, character) {
    const baseUrl = ollamaSettings.baseUrl || 'http://localhost:11434';
    
    // Convert to Ollama format
    const prompt = messages
      .map(m => {
        if (m.role === 'system') return `System: ${m.content}`;
        if (m.role === 'user') return `User: ${m.content}`;
        return `Assistant: ${m.content}`;
      })
      .join('\n\n');
    
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        temperature: character.temperature || 0.8,
        stream: false
      })
    });
    
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.response.trim();
  }
  
  // ==========================================================================
  // PROVIDER UTILITIES
  // ==========================================================================
  
  /**
   * Test API key validity for a provider
   */
  static async testApiKey(provider, apiKey, ollamaSettings = {}) {
    try {
      const testMessages = [
        { role: 'system', content: 'You are a test assistant.' },
        { role: 'user', content: 'Say "OK" if you can read this.' }
      ];
      
      const testCharacter = {
        ai_provider: provider,
        ai_model: this.getDefaultModel(provider),
        temperature: 0.7,
        max_tokens: 10
      };
      
      const response = await this.generateResponse(
        testCharacter,
        testMessages,
        { [provider]: apiKey },
        ollamaSettings
      );
      
      return { success: true, message: 'API key is valid', response };
      
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
  
  /**
   * Get default model for a provider
   */
  static getDefaultModel(provider) {
    const defaults = {
      'openai': 'gpt-3.5-turbo',
      'anthropic': 'claude-3-haiku-20240307',
      'openrouter': 'openai/gpt-3.5-turbo',
      'google': 'gemini-pro',
      'ollama': 'llama2'
    };
    
    return defaults[provider.toLowerCase()] || 'gpt-3.5-turbo';
  }
  
  /**
   * Get available models for a provider
   */
  static async getAvailableModels(provider, apiKey, ollamaSettings = {}) {
    try {
      switch (provider.toLowerCase()) {
        case 'openai':
          return await this.getOpenAIModels(apiKey);
        
        case 'anthropic':
          return this.getAnthropicModels();
        
        case 'openrouter':
          return await this.getOpenRouterModels(apiKey);
        
        case 'google':
          return this.getGeminiModels();
        
        case 'ollama':
          return await this.getOllamaModels(ollamaSettings);
        
        default:
          return [];
      }
    } catch (error) {
      console.error(`Error fetching models for ${provider}:`, error);
      return [];
    }
  }
  
  static async getOpenAIModels(apiKey) {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    
    if (!response.ok) return [];
    
    const data = await response.json();
    return data.data
      .filter(m => m.id.includes('gpt'))
      .map(m => ({ id: m.id, name: m.id }));
  }
  
  static getAnthropicModels() {
    return [
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' }
    ];
  }
  
  static async getOpenRouterModels(apiKey) {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    
    if (!response.ok) return [];
    
    const data = await response.json();
    return data.data.map(m => ({ id: m.id, name: m.name }));
  }
  
  static getGeminiModels() {
    return [
      { id: 'gemini-pro', name: 'Gemini Pro' },
      { id: 'gemini-pro-vision', name: 'Gemini Pro Vision' }
    ];
  }
  
  static async getOllamaModels(ollamaSettings) {
    const baseUrl = ollamaSettings.baseUrl || 'http://localhost:11434';
    
    const response = await fetch(`${baseUrl}/api/tags`);
    
    if (!response.ok) return [];
    
    const data = await response.json();
    return data.models.map(m => ({ id: m.name, name: m.name }));
  }
}

module.exports = AIProviderService;