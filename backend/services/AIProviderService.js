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
   * @param {Object} options - Additional options
   * @returns {Promise<string>} - AI response text
   */
  static async generateResponse(character, messages, apiKeys = {}, ollamaSettings = {}, options = {}) {
    const provider = character.ai_provider || 'openai';
    const model = character.ai_model || 'gpt-3.5-turbo';

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

        case 'lmstudio':
          // LM Studio settings should be in ollamaSettings object with lmStudioSettings key
          const lmStudioSettings = ollamaSettings?.lmStudioSettings || ollamaSettings || {};
          return await this.callLMStudio(model, messages, lmStudioSettings, character);

        case 'custom':
          return await this.callCustomModel(model, messages, apiKeys.openrouter, character, apiKeys);

        default:
          throw new Error(`Unsupported AI provider: ${provider}`);
      }
      
    } catch (error) {
      console.error(`[AI Service] Error with ${provider}:`, error.message);
      
      // Try fallback if configured
      if (character.fallback_provider && character.fallback_model) {

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
        temperature: character.temperature ?? 0.8,
        max_tokens: character.max_tokens || 150,
        ...(character.top_p != null && { top_p: character.top_p }),
        ...(character.frequency_penalty != null ? { frequency_penalty: character.frequency_penalty } : { frequency_penalty: 0.3 }),
        ...(character.presence_penalty != null ? { presence_penalty: character.presence_penalty } : { presence_penalty: 0.6 }),
        ...(character.stop_sequences?.length && { stop: character.stop_sequences })
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
        temperature: character.temperature ?? 0.8,
        system: systemMessage,
        messages: conversationMessages,
        ...(character.top_p != null && { top_p: character.top_p }),
        ...(character.stop_sequences?.length && { stop_sequences: character.stop_sequences })
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
        temperature: character.temperature ?? 0.8,
        max_tokens: character.max_tokens || 150,
        ...(character.top_p != null && { top_p: character.top_p }),
        ...(character.frequency_penalty != null && { frequency_penalty: character.frequency_penalty }),
        ...(character.presence_penalty != null && { presence_penalty: character.presence_penalty }),
        ...(character.repetition_penalty != null && { repetition_penalty: character.repetition_penalty }),
        ...(character.stop_sequences?.length && { stop: character.stop_sequences })
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: { message: errorText } };
      }
      console.error('[OpenRouter] API Error:', response.status, errorData);
      throw new Error(errorData.error?.message || `OpenRouter API error: ${response.status} - ${errorText.substring(0, 200)}`);
    }
    
    const data = await response.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('[OpenRouter] Unexpected response format:', data);
      throw new Error('Invalid response format from OpenRouter');
    }
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

    // Ensure alternating user/model messages (Gemini requirement)
    // If first message is not 'user', add a dummy user message
    if (contents.length > 0 && contents[0].role !== 'user') {
      contents.unshift({
        role: 'user',
        parts: [{ text: 'Hello' }]
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: contents,
          generationConfig: {
            temperature: character.temperature ?? 0.8,
            maxOutputTokens: character.max_tokens || 150,
            ...(character.top_p != null && { topP: character.top_p }),
            ...(character.stop_sequences?.length && { stopSequences: character.stop_sequences })
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const errorMessage = error.error?.message || `Gemini API error: ${response.status}`;
      console.error('Gemini API Error:', errorMessage, error);
      throw new Error(errorMessage);
    }

    const data = await response.json();

    // Check for prompt feedback (blocked content)
    if (data.promptFeedback && data.promptFeedback.blockReason) {
      console.error('Gemini blocked the prompt:', data.promptFeedback);
      throw new Error(`Gemini blocked the request: ${data.promptFeedback.blockReason}`);
    }

    // Validate response structure
    if (!data.candidates || data.candidates.length === 0) {
      console.error('Invalid Gemini response structure:', JSON.stringify(data, null, 2));
      throw new Error('Invalid response from Gemini API - no candidates returned');
    }

    const candidate = data.candidates[0];

    // Check if content was blocked (only block on actual safety issues)
    const blockedReasons = ['SAFETY', 'RECITATION', 'OTHER'];
    if (candidate.finishReason && blockedReasons.includes(candidate.finishReason)) {
      console.error('Gemini response blocked:', candidate);
      throw new Error(`Gemini blocked the response: ${candidate.finishReason}`);
    }

    // MAX_TOKENS and STOP are acceptable finish reasons
    // MAX_TOKENS just means we hit the limit but still got a response

    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      console.error('Invalid Gemini content structure:', JSON.stringify(candidate, null, 2));
      throw new Error('Invalid response from Gemini API - malformed content');
    }

    return candidate.content.parts[0].text.trim();
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
        temperature: character.temperature ?? 0.8,
        stream: false,
        options: {
          ...(character.top_p != null && { top_p: character.top_p }),
          ...(character.repetition_penalty != null && { repeat_penalty: character.repetition_penalty }),
          ...(character.stop_sequences?.length && { stop: character.stop_sequences })
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.response.trim();
  }

  // ==========================================================================
  // LM STUDIO (OpenAI-compatible API for local GGUF models)
  // ==========================================================================

  static async callLMStudio(model, messages, lmStudioSettings = {}, character) {
    const baseUrl = lmStudioSettings.baseUrl || 'http://localhost:1234';

    try {
      // LM Studio uses OpenAI-compatible API
      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: character.temperature ?? 0.8,
          max_tokens: character.max_tokens || 150,
          ...(character.top_p != null && { top_p: character.top_p }),
          ...(character.frequency_penalty != null && { frequency_penalty: character.frequency_penalty }),
          ...(character.presence_penalty != null && { presence_penalty: character.presence_penalty }),
          ...(character.stop_sequences?.length && { stop: character.stop_sequences })
        })
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error('[LM Studio] Error response:', response.status, errorText);
        throw new Error(`LM Studio API error: ${response.status} - ${errorText || 'Unknown error'}. Make sure LM Studio is running and a model is loaded.`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error('[LM Studio] Invalid response structure:', data);
        throw new Error('LM Studio returned invalid response structure');
      }
      
      return data.choices[0].message.content.trim();
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Cannot connect to LM Studio. Make sure LM Studio is running at ' + baseUrl);
      }
      throw error;
    }
  }

  // ==========================================================================
  // PROVIDER UTILITIES
  // ==========================================================================
  
  /**
   * Test API key validity for a provider
   */
  static async testApiKey(provider, apiKey, ollamaSettings = {}, model = null) {
    try {
      const testMessages = [
        { role: 'system', content: 'You are a test assistant.' },
        { role: 'user', content: 'Say "OK" if you can read this.' }
      ];

      const testCharacter = {
        ai_provider: provider,
        ai_model: model || this.getDefaultModel(provider),
        temperature: 0.7,
        max_tokens: 100
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
      'openai': 'gpt-4o-mini',
      'anthropic': 'claude-haiku-4-5',
      'openrouter': 'openai/gpt-4o-mini',
      'google': 'gemini-2.5-flash',
      'ollama': 'llama2',
      'lmstudio': 'local-model'
    };

    return defaults[provider.toLowerCase()] || 'gpt-4o-mini';
  }
  
  /**
   * Get available models for a provider
   */
  static async getAvailableModels(provider, apiKey, ollamaSettings = {}, lmStudioSettings = {}, userId = null) {
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

        case 'lmstudio':
          return await this.getLMStudioModels(lmStudioSettings);

        case 'custom':
          return await this.getCustomModels(userId);

        default:
          return [];
      }
    } catch (error) {
      console.error(`Error fetching models for ${provider}:`, error);
      return [];
    }
  }
  
  static async getOpenAIModels(apiKey) {
    // If no API key, return static list of common models
    if (!apiKey) {
      return [
        { id: 'gpt-4o', name: 'GPT-4o (Latest)' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
        { id: 'gpt-4', name: 'GPT-4' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
      ];
    }

    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });

      if (!response.ok) {
        // Return static list if API call fails
        return [
          { id: 'gpt-4o', name: 'GPT-4o (Latest)' },
          { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
          { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
          { id: 'gpt-4', name: 'GPT-4' },
          { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
        ];
      }

      const data = await response.json();
      const gptModels = data.data
        .filter(m => {
          // Only include GPT chat models (exclude all non-chat models)
          const id = m.id.toLowerCase();
          return (id.startsWith('gpt-') &&
                  !id.includes('instruct') &&
                  !id.includes('embedding') &&
                  !id.includes('whisper') &&
                  !id.includes('tts') &&
                  !id.includes('dall-e') &&
                  !id.includes('davinci') &&
                  !id.includes('babbage') &&
                  !id.includes('ada') &&
                  !id.includes('curie') &&
                  !id.includes('audio') &&
                  !id.includes('realtime'));
        })
        .sort((a, b) => {
          // Sort by version (4 before 3.5)
          if (a.id.includes('gpt-4') && !b.id.includes('gpt-4')) return -1;
          if (!a.id.includes('gpt-4') && b.id.includes('gpt-4')) return 1;
          return a.id.localeCompare(b.id);
        })
        .map(m => ({ id: m.id, name: m.id }));

      // If we got models from API, return them
      if (gptModels.length > 0) {
        return gptModels;
      }

      // Otherwise return static list
      return [
        { id: 'gpt-4o', name: 'GPT-4o (Latest)' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
        { id: 'gpt-4', name: 'GPT-4' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
      ];
    } catch (error) {
      console.error('Error fetching OpenAI models:', error);
      // Return static list on error
      return [
        { id: 'gpt-4o', name: 'GPT-4o (Latest)' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
        { id: 'gpt-4', name: 'GPT-4' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
      ];
    }
  }
  
  static getAnthropicModels() {
    return [
      { id: 'claude-opus-4-6', name: 'Claude Opus 4.6 (Most Intelligent)' },
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6 (Balanced)' },
      { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5 (Fastest)' }
    ];
  }
  
  static async getOpenRouterModels(apiKey) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}
      });

      if (!response.ok) return [];

      const data = await response.json();

      // Sort by pricing tier (free first)
      return data.data
        .map(m => ({
          id: m.id,
          name: m.name,
          tier: m.pricing?.prompt === '0' ? 'free' : 'paid',
          context: m.context_length
        }))
        .sort((a, b) => {
          // Free models first
          if (a.tier === 'free' && b.tier !== 'free') return -1;
          if (a.tier !== 'free' && b.tier === 'free') return 1;
          // Then by name
          return a.name.localeCompare(b.name);
        });
    } catch (error) {
      console.error('Error fetching OpenRouter models:', error);
      return [];
    }
  }
  
  static getGeminiModels() {
    return [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
      { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite' },
      { id: 'gemini-2.0-pro', name: 'Gemini 2.0 Pro' }
    ];
  }
  
  static async getOllamaModels(ollamaSettings) {
      const baseUrl = ollamaSettings.baseUrl || 'http://localhost:11434';

      try {
          const response = await fetch(`${baseUrl}/api/tags`);

          if (!response.ok) return [];

          const data = await response.json();
          return data.models.map(m => ({
          id: m.name,
          name: `${m.name} (${(m.size / 1e9).toFixed(1)}GB)` // Show model size
          }));
      } catch (error) {
          console.error('Error fetching Ollama models:', error);
          return [];
      }
  }

  static async getLMStudioModels(lmStudioSettings) {
    const baseUrl = lmStudioSettings.baseUrl || 'http://localhost:1234';

    try {
      const response = await fetch(`${baseUrl}/v1/models`);

      if (!response.ok) return [];

      const data = await response.json();
      return data.data.map(m => ({
        id: m.id,
        name: m.id
      }));
    } catch (error) {
      console.error('Error fetching LM Studio models:', error);
      return [];
    }
  }

  // ==========================================================================
  // CUSTOM MODELS
  // ==========================================================================

  static async callCustomModel(presetId, messages, openRouterApiKey, character, apiKeys = {}) {
    // Look up the preset from local SQLite
    const { getInstance } = require('./LocalDatabaseService');
    const localDb = getInstance();
    const preset = localDb.getCustomModel(presetId);

    if (!preset || !preset.is_active) {
      throw new Error('Custom model preset not found or inactive');
    }

    // Inject optional custom system prompt
    const enhancedMessages = [...messages];
    if (preset.custom_system_prompt) {
      const systemIndex = enhancedMessages.findIndex(m => m.role === 'system');
      if (systemIndex >= 0) {
        enhancedMessages[systemIndex].content =
          `${enhancedMessages[systemIndex].content}\n\n${preset.custom_system_prompt}`;
      } else {
        enhancedMessages.unshift({ role: 'system', content: preset.custom_system_prompt });
      }
    }

    // Build a merged character-like object with preset params overriding character params
    const mergedCharacter = {
      ...character,
      temperature: preset.temperature ?? character.temperature,
      max_tokens: preset.max_tokens ?? character.max_tokens,
      top_p: preset.top_p ?? character.top_p ?? null,
      frequency_penalty: preset.frequency_penalty ?? character.frequency_penalty ?? null,
      presence_penalty: preset.presence_penalty ?? character.presence_penalty ?? null,
      repetition_penalty: preset.repetition_penalty ?? character.repetition_penalty ?? null,
      stop_sequences: preset.stop_sequences ?? character.stop_sequences ?? null,
    };

    // Route to the preset's configured provider using the user's API key for that provider
    const mergedApiKeys = { ...apiKeys, openrouter: openRouterApiKey };
    switch (preset.provider) {
      case 'openai':
        return await this.callOpenAI(preset.model_id, enhancedMessages, mergedApiKeys.openai, mergedCharacter);
      case 'anthropic':
        return await this.callAnthropic(preset.model_id, enhancedMessages, mergedApiKeys.anthropic, mergedCharacter);
      case 'openrouter':
        return await this.callOpenRouter(preset.model_id, enhancedMessages, mergedApiKeys.openrouter, mergedCharacter);
      case 'google':
      case 'gemini':
        return await this.callGemini(preset.model_id, enhancedMessages, mergedApiKeys.google, mergedCharacter);
      case 'ollama':
        return await this.callOllama(preset.model_id, enhancedMessages, apiKeys.ollamaSettings || {}, mergedCharacter);
      case 'lmstudio':
        return await this.callLMStudio(preset.model_id, enhancedMessages, apiKeys.lmStudioSettings || {}, mergedCharacter);
      default:
        throw new Error(`Custom model preset has unsupported provider: ${preset.provider}`);
    }
  }

  static async getCustomModels(userId) {
    try {
      const { getInstance } = require('./LocalDatabaseService');
      const localDb = getInstance();
      const models = localDb.getCustomModels(userId);
      return (models || []).filter(m => m.is_active).map(m => ({
        id: m.id,
        name: `${m.display_name}${m.tags?.length ? ' (' + m.tags.join(', ') + ')' : ''}`,
        description: m.description
      }));
    } catch (error) {
      console.error('Error fetching custom models:', error);
      return [];
    }
  }

}

module.exports = AIProviderService;
