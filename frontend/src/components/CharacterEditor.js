// ============================================================================
// CHAIT World - Enhanced Character Editor (v1.5)
// Includes per-character AI provider and model selection
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  X, Save, User, MessageCircle, Sparkles, Sliders,
  Brain, Zap, Tag, Globe, RefreshCw, AlertCircle
} from 'lucide-react';
import ImageUpload from './ImageUpload';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const CharacterEditorV15 = ({
  character,
  onSave,
  onClose,
  user,
  userSettings
}) => {
  
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [formData, setFormData] = useState({
    name: '',
    age: 18,
    sex: '',
    personality: '',
    appearance: '',
    background: '',
    avatar: '🤖',
    tags: [],
    temperature: 0.8,
    max_tokens: 150,
    context_window: 8000,
    memory_enabled: true,
    chat_examples: [],
    relationships: [],

    // Image fields
    avatar_image_url: null,
    avatar_image_filename: null,
    uses_custom_image: false,

    // AI Provider settings
    ai_provider: 'openai',
    ai_model: 'gpt-3.5-turbo'
  });
  
  const [tagInput, setTagInput] = useState('');
  const [availableModels, setAvailableModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  // ============================================================================
  // INITIALIZE
  // ============================================================================
  
  useEffect(() => {
    if (character) {
      // Edit mode - populate existing character
      setFormData({
        name: character.name || '',
        age: character.age || 18,
        sex: character.sex || '',
        personality: character.personality || '',
        appearance: character.appearance || '',
        background: character.background || '',
        avatar: character.avatar || '🤖',
        tags: character.tags || [],
        temperature: character.temperature || 0.8,
        max_tokens: character.max_tokens || 150,
        context_window: character.context_window || 8000,
        memory_enabled: character.memory_enabled !== false,
        chat_examples: character.chat_examples || [],
        relationships: character.relationships || [],
        avatar_image_url: character.avatar_image_url || null,
        avatar_image_filename: character.avatar_image_filename || null,
        uses_custom_image: character.uses_custom_image || false,
        ai_provider: character.ai_provider || 'openai',
        ai_model: character.ai_model || ''  // Will be set by loadAvailableModels
      });
    } else {
      // Create mode - use defaults
      setFormData(prev => ({
        ...prev,
        ai_provider: 'openai',
        ai_model: ''  // Will be set by loadAvailableModels
      }));
    }
  }, [character]);
  
  // Load available models when provider changes or on initial mount
  useEffect(() => {
    if (formData.ai_provider) {
      loadAvailableModels(formData.ai_provider);
    }
  }, [formData.ai_provider]);
  
  // ============================================================================
  // LOAD AVAILABLE MODELS
  // ============================================================================
  
  const loadAvailableModels = async (provider) => {
    setLoadingModels(true);
    setError(null);

    try {
      // Get the appropriate API key from user settings
      let apiKey = null;

      if (userSettings?.apiKeys) {
        switch (provider) {
          case 'openai':
            apiKey = userSettings.apiKeys.openai;
            break;
          case 'anthropic':
            apiKey = userSettings.apiKeys.anthropic;
            break;
          case 'openrouter':
            apiKey = userSettings.apiKeys.openrouter;
            break;
          case 'google':
            apiKey = userSettings.apiKeys.google;
            break;
        }
      }

      const response = await fetch(`${API_BASE_URL}/api/providers/models`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': user.id
        },
        body: JSON.stringify({
          provider,
          apiKey,
          ollamaSettings: userSettings?.ollamaSettings
        })
      });

      const data = await response.json();

      if (data.models && data.models.length > 0) {
        setAvailableModels(data.models);

        // Auto-select first model if current model not in list or is empty
        const currentModelExists = data.models.find(m => m.id === formData.ai_model);
        if (!currentModelExists || !formData.ai_model) {
          setFormData(prev => ({ ...prev, ai_model: data.models[0].id }));
        }
        // Clear any previous errors since models loaded successfully
        setError(null);
      } else {
        setAvailableModels([]);
        // Only show error if no models returned
        if (!data.models || data.models.length === 0) {
          setError(`No models available for ${provider}. Configure API key in Settings.`);
        }
      }

    } catch (err) {
      console.error('Error loading models:', err);
      setAvailableModels([]);
      setError('Failed to load models. Check your API key in Settings.');
    } finally {
      setLoadingModels(false);
    }
  };
  
  // ============================================================================
  // HANDLERS
  // ============================================================================
  
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };
  
  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };
  
  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };
  
  const handleProviderChange = (provider) => {
    // Set default models for each provider
    const defaultModels = {
      'openai': 'gpt-4o-mini',
      'anthropic': 'claude-3-5-haiku-20241022',
      'openrouter': 'openai/gpt-4o-mini',
      'google': 'gemini-1.5-flash-latest',
      'ollama': 'llama2'
    };

    setFormData(prev => ({
      ...prev,
      ai_provider: provider,
      ai_model: defaultModels[provider] || 'gpt-4o-mini' // Set default, will be updated when models load
    }));
  };
  
  // ============================================================================
  // VALIDATION & SAVE
  // ============================================================================
  
  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Character name is required');
      return false;
    }

    if (!formData.age || formData.age < 18) {
      setError('Character must be 18 years or older');
      return false;
    }

    if (!formData.personality.trim()) {
      setError('Personality description is required');
      return false;
    }

    if (formData.personality.trim().length < 20) {
      setError('Personality description must be at least 20 characters');
      return false;
    }

    if (!formData.ai_model) {
      setError('Please select an AI model');
      return false;
    }

    return true;
  };
  
  const handleSave = async () => {
    if (!validateForm()) return;
    
    setSaving(true);
    setError(null);
    
    try {
      const characterData = {
        ...formData,
        tags: formData.tags.length > 0 ? formData.tags : ['custom']
      };
      
      await onSave(characterData);
      onClose();
      
    } catch (err) {
      console.error('Error saving character:', err);
      setError('Failed to save character. Please try again.');
      setSaving(false);
    }
  };
  
  // ============================================================================
  // PROVIDER INFO
  // ============================================================================
  
  const getProviderInfo = () => {
    const providers = {
      openai: {
        name: 'OpenAI',
        icon: '🤖',
        color: 'text-green-400',
        description: 'GPT models - reliable and versatile'
      },
      anthropic: {
        name: 'Anthropic',
        icon: '🧠',
        color: 'text-purple-400',
        description: 'Claude models - thoughtful and nuanced'
      },
      openrouter: {
        name: 'OpenRouter',
        icon: '🌐',
        color: 'text-blue-400',
        description: 'Access to 100+ models'
      },
      google: {
        name: 'Google',
        icon: '✨',
        color: 'text-yellow-400',
        description: 'Gemini models - fast and efficient'
      },
      ollama: {
        name: 'Ollama',
        icon: '💻',
        color: 'text-cyan-400',
        description: 'Local models - free and private'
      }
    };
    
    return providers[formData.ai_provider] || providers.openai;
  };
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  const providerInfo = getProviderInfo();
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl border border-white/10 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 sticky top-0 bg-gray-900 z-10">
          <div className="flex items-center gap-3">
            <User className="text-red-500" size={24} />
            <h2 className="text-xl font-bold text-white">
              {character ? 'Edit Character' : 'Create Character'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Error Message - Only show if there's an error and no models loaded */}
        {error && availableModels.length === 0 && (
          <div className="mx-6 mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400">
            <AlertCircle size={16} />
            <span className="text-sm">{error}</span>
          </div>
        )}
        
        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Sparkles size={18} className="text-red-500" />
              Basic Information
            </h3>
            
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Character Name *
                <span className={`ml-2 text-xs ${
                  formData.name.length > 50 ? 'text-red-400' : 'text-gray-500'
                }`}>
                  ({formData.name.length} / 50 characters)
                </span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Sarah, Marcus, Luna"
                maxLength={50}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-400"
              />
            </div>

            {/* Age and Sex */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Age * (18+)
                </label>
                <input
                  type="number"
                  min="18"
                  max="150"
                  value={formData.age}
                  onChange={(e) => handleInputChange('age', parseInt(e.target.value) || 18)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-red-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Sex/Gender
                </label>
                <select
                  value={formData.sex}
                  onChange={(e) => handleInputChange('sex', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-red-400"
                >
                  <option value="" className="bg-gray-800">Prefer not to say</option>
                  <option value="male" className="bg-gray-800">Male</option>
                  <option value="female" className="bg-gray-800">Female</option>
                  <option value="non-binary" className="bg-gray-800">Non-binary</option>
                  <option value="other" className="bg-gray-800">Other</option>
                </select>
              </div>
            </div>

            {/* Custom Avatar Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Avatar Image *
              </label>
              <ImageUpload
                currentImage={formData.avatar_image_url}
                currentEmoji={formData.avatar}
                onImageChange={(imageData) => {
                  setFormData(prev => ({
                    ...prev,
                    avatar_image_url: imageData.url,
                    avatar_image_filename: imageData.filename,
                    uses_custom_image: imageData.useCustomImage
                  }));
                }}
                type="character"
                aspectRatio="square"
                imageOnly={true}
              />
              <p className="text-xs text-gray-500 mt-1">
                Upload a custom avatar image for this character (required)
              </p>
            </div>

            {/* Appearance */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Appearance
                <span className={`ml-2 text-xs ${
                  formData.appearance.length > 1000 ? 'text-red-400' : 'text-gray-500'
                }`}>
                  ({formData.appearance.length} / 1000 characters)
                </span>
              </label>
              <p className="text-xs text-gray-400 mb-2">
                Describe the character's physical appearance, style, and notable features. This helps paint a picture of who they are.
              </p>
              <textarea
                value={formData.appearance}
                onChange={(e) => handleInputChange('appearance', e.target.value)}
                placeholder="Physical description, style, notable features..."
                rows={2}
                maxLength={1000}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-400 resize-y min-h-[60px]"
              />
            </div>

            {/* Personality */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Personality & Background *
                <span className={`ml-2 text-xs ${
                  formData.personality.length > 500 ? 'text-red-400' : 'text-gray-500'
                }`}>
                  ({formData.personality.length} / 500 characters)
                </span>
              </label>
              <p className="text-xs text-gray-400 mb-2">
                This is the core of your character. Describe their personality traits, background story, speaking style, interests, and how they interact with others. Be specific and detailed - this directly shapes how the AI will roleplay this character.
              </p>
              <textarea
                value={formData.personality}
                onChange={(e) => handleInputChange('personality', e.target.value)}
                placeholder="Describe who this character is, their personality traits, background, speaking style, interests, etc."
                rows={6}
                maxLength={500}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-400 resize-y min-h-[140px]"
              />
            </div>
            
            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Tag size={14} className="inline mr-1" />
                Tags
              </label>
              
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="Add a tag..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-400"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white text-sm transition-colors"
                >
                  Add
                </button>
              </div>
              
              {/* Tag List */}
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map(tag => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-xs flex items-center gap-2"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-red-100"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* AI Model Selection */}
          <div className="pt-6 border-t border-white/10 space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Brain size={18} className="text-red-500" />
              AI Model Configuration
            </h3>

            {/* Provider Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                AI Provider *
              </label>
              <p className="text-xs text-gray-400 mb-2">
                Choose which AI service will power this character. Each provider offers different models with unique strengths. Make sure you've configured the API key for your chosen provider in Settings.
              </p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {['openai', 'anthropic', 'openrouter', 'google', 'ollama'].map(provider => {
                  const info = {
                    openai: { name: 'OpenAI', icon: '🤖' },
                    anthropic: { name: 'Anthropic', icon: '🧠' },
                    openrouter: { name: 'OpenRouter', icon: '🌐' },
                    google: { name: 'Google', icon: '✨' },
                    ollama: { name: 'Ollama', icon: '💻' }
                  }[provider];
                  
                  const isSelected = formData.ai_provider === provider;
                  
                  return (
                    <button
                      type="button"
                      key={provider}
                      onClick={() => handleProviderChange(provider)}
                      className={`p-3 rounded-lg border transition-all ${
                        isSelected
                          ? 'bg-red-500/20 border-red-500 text-white'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      <div className="text-2xl mb-1">{info.icon}</div>
                      <div className="text-xs font-medium">{info.name}</div>
                    </button>
                  );
                })}
              </div>
              
              <div className={`mt-2 p-3 rounded-lg bg-white/5 border border-white/10`}>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{providerInfo.icon}</span>
                  <div>
                    <div className="text-sm font-medium text-white">
                      {providerInfo.name}
                    </div>
                    <div className="text-xs text-gray-400">
                      {providerInfo.description}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Model Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-300">
                  Model *
                </label>
                <button
                  type="button"
                  onClick={() => loadAvailableModels(formData.ai_provider)}
                  disabled={loadingModels}
                  className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <RefreshCw size={12} className={loadingModels ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>
              <p className="text-xs text-gray-400 mb-2">
                Select the specific AI model for this character. Different models have different capabilities, speeds, and costs. Larger models (like GPT-4) are smarter but slower and more expensive.
              </p>
              
              {loadingModels ? (
                <div className="p-4 bg-white/5 border border-white/10 rounded-lg text-center">
                  <div className="animate-spin inline-block w-5 h-5 border-2 border-white/20 border-t-red-500 rounded-full mb-2"></div>
                  <p className="text-sm text-gray-400">Loading models...</p>
                </div>
              ) : (
                <select
                  value={formData.ai_model}
                  onChange={(e) => handleInputChange('ai_model', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-red-400"
                >
                  {/* Show current model as fallback if models haven't loaded */}
                  {availableModels.length === 0 && formData.ai_model && (
                    <option value={formData.ai_model} className="bg-gray-800">
                      {formData.ai_model}
                    </option>
                  )}
                  {availableModels.map(model => (
                    <option key={model.id} value={model.id} className="bg-gray-800">
                      {model.name || model.id}
                    </option>
                  ))}
                </select>
              )}

              {!loadingModels && availableModels.length === 0 && !formData.ai_model && (
                <p className="text-xs text-yellow-400 mt-2">
                  ⚠️ Configure your {providerInfo.name} API key in Settings to see available models
                </p>
              )}
              
              <p className="text-xs text-gray-500 mt-1">
                Different models have different personalities and capabilities
              </p>
            </div>
          </div>
          
          {/* Advanced Settings */}
          <div className="pt-6 border-t border-white/10 space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Sliders size={18} className="text-red-500" />
              Advanced Settings
            </h3>

            {/* Temperature */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Temperature: {formData.temperature.toFixed(2)}
              </label>
              <p className="text-xs text-gray-400 mb-2">
                Controls the randomness and creativity of responses. Lower values (0.3-0.7) produce more consistent and focused responses. Higher values (0.8-1.5) produce more creative and unpredictable responses. Also affects mood volatility.
              </p>
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.05"
                value={formData.temperature}
                onChange={(e) => handleInputChange('temperature', parseFloat(e.target.value))}
                className="w-full accent-red-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Focused & Consistent</span>
                <span>Creative & Random</span>
              </div>
            </div>
            
            {/* Max Tokens */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Response Length: {formData.max_tokens} tokens
              </label>
              <p className="text-xs text-gray-400 mb-2">
                Sets the maximum length of the character's responses. Approximately 1 token equals 0.75 words, so 150 tokens is about 2-3 sentences. Shorter responses are faster and cheaper, longer responses allow for more detailed replies.
              </p>
              <input
                type="range"
                min="50"
                max="500"
                step="10"
                value={formData.max_tokens}
                onChange={(e) => handleInputChange('max_tokens', parseInt(e.target.value))}
                className="w-full accent-red-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Short (50)</span>
                <span>Medium (250)</span>
                <span>Long (500)</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-white/10 bg-gray-900 sticky bottom-0">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          
          <button
            onClick={handleSave}
            disabled={saving || loadingModels || !formData.ai_model}
            className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save size={16} />
            {saving ? 'Saving...' : character ? 'Update Character' : 'Create Character'}
          </button>
        </div>
        
      </div>
    </div>
  );
};

export default CharacterEditorV15;
