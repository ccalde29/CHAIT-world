// ============================================================================
// CHAIT World - Enhanced Character Editor (v1.5)
// Includes per-character AI provider and model selection
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  X, Save, User, MessageCircle, Sparkles, Sliders,
  Brain, Zap, Tag, Globe, RefreshCw, AlertCircle, Users, Heart
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

  // Relationships state
  const [availableCharacters, setAvailableCharacters] = useState([]);
  const [loadingCharacters, setLoadingCharacters] = useState(false);
  const [characterRelationships, setCharacterRelationships] = useState([]);
  const [showAddRelationship, setShowAddRelationship] = useState(false);
  
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
          ollamaSettings: userSettings?.ollamaSettings,
          lmStudioSettings: userSettings?.lmStudioSettings || { baseUrl: 'http://localhost:1234' }
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
      'ollama': 'llama2',
      'lmstudio': 'local-model'
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

  // ============================================================================
  // RELATIONSHIP HANDLERS
  // ============================================================================

  const loadAvailableCharactersForRelationships = useCallback(async () => {
    if (!character?.id) return; // Only for editing existing characters

    setLoadingCharacters(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/characters/${character.id}/relationships/available`,
        {
          headers: {
            'user-id': user.id
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Combine characters and personas into a single list
        const allTargets = [
          ...(data.characters || []).map(c => ({ ...c, type: 'character' })),
          ...(data.personas || []).map(p => ({ ...p, type: 'persona' }))
        ];
        setAvailableCharacters(allTargets);
      }
    } catch (error) {
      console.error('Error loading available characters:', error);
    } finally {
      setLoadingCharacters(false);
    }
  }, [character?.id, user.id]);

  const loadCharacterRelationships = useCallback(async () => {
    if (!character?.id) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/characters/${character.id}/relationships`,
        {
          headers: {
            'user-id': user.id
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('[CharacterEditor] Loaded relationships:', data.relationships);
        setCharacterRelationships(data.relationships || []);
      }
    } catch (error) {
      console.error('Error loading relationships:', error);
    }
  }, [character?.id, user.id]);

  const handleAddRelationship = async (targetId, targetType, relationshipData) => {
    try {
      const payload = {
        ...relationshipData
      };

      // Add appropriate target field based on type
      if (targetType === 'character') {
        payload.target_character_id = targetId;
      } else if (targetType === 'persona') {
        payload.target_persona_id = targetId;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/characters/${character.id}/relationships`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'user-id': user.id
          },
          body: JSON.stringify(payload)
        }
      );

      if (response.ok) {
        await loadCharacterRelationships();
        await loadAvailableCharactersForRelationships();
        setShowAddRelationship(false);
      }
    } catch (error) {
      console.error('Error adding relationship:', error);
      alert('Failed to add relationship');
    }
  };

  const handleDeleteRelationship = async (targetCharacterId) => {
    if (!window.confirm('Are you sure you want to remove this relationship?')) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/characters/${character.id}/relationships/${targetCharacterId}`,
        {
          method: 'DELETE',
          headers: {
            'user-id': user.id
          }
        }
      );

      if (response.ok) {
        await loadCharacterRelationships();
        await loadAvailableCharactersForRelationships();
      }
    } catch (error) {
      console.error('Error deleting relationship:', error);
      alert('Failed to delete relationship');
    }
  };

  // Load relationships when editing an existing character
  useEffect(() => {
    if (character?.id) {
      console.log('[CharacterEditor] Loading relationships for character:', character.id);
      loadCharacterRelationships();
      loadAvailableCharactersForRelationships();
    }
  }, [character?.id, loadCharacterRelationships, loadAvailableCharactersForRelationships]);

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
      },
      lmstudio: {
        name: 'LM Studio',
        icon: '🖥️',
        color: 'text-indigo-400',
        description: 'Local GGUF models - high performance'
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

            {/* Bot-to-Bot Relationships */}
            {character?.id && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Users size={14} className="inline mr-1" />
                  Relationships with Other Characters
                </label>
                <p className="text-xs text-gray-400 mb-3">
                  Define how this character knows other characters in your world. This helps create more natural conversations.
                </p>

                {/* Debug info */}
                {console.log('[CharacterEditor] Relationships state:', characterRelationships)}

                {/* Existing Relationships */}
                {characterRelationships.length > 0 ? (
                  <div className="space-y-2 mb-3">
                    {characterRelationships.map(rel => {
                      const target = rel.target_character || rel.target_persona;
                      if (!target) return null;

                      return (
                        <div
                          key={rel.id}
                          className="bg-white/5 border border-white/10 rounded-lg p-3"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${target.color} flex items-center justify-center flex-shrink-0`}>
                                {target.uses_custom_image && target.avatar_image_url ? (
                                  <img
                                    src={target.avatar_image_url}
                                    alt={target.name}
                                    className="w-10 h-10 rounded-full object-cover"
                                  />
                                ) : (
                                  <span className="text-xl">{target.avatar}</span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-sm font-medium text-white">{target.name}</p>
                                  <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                                    {rel.relationship_type}
                                  </span>
                                  {rel.target_persona && (
                                    <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">
                                      User Persona
                                    </span>
                                  )}
                                </div>
                                {rel.custom_context && (
                                  <p className="text-xs text-gray-400 mb-2">{rel.custom_context}</p>
                                )}
                                <div className="flex gap-3 text-xs">
                                  <div>
                                    <span className="text-gray-500">Trust:</span>
                                    <span className="ml-1 text-white">{Math.round(rel.trust_level * 100)}%</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Familiarity:</span>
                                    <span className="ml-1 text-white">{Math.round(rel.familiarity_level * 100)}%</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Bond:</span>
                                    <span className={`ml-1 ${rel.emotional_bond > 0 ? 'text-green-400' : rel.emotional_bond < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                                      {rel.emotional_bond > 0 ? '+' : ''}{Math.round(rel.emotional_bond * 100)}%
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteRelationship(rel.target_id)}
                              className="text-red-400 hover:text-red-300 p-1"
                              title="Remove Relationship"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-400 text-sm bg-white/5 rounded-lg border border-white/10">
                    No relationships defined yet
                  </div>
                )}

                {/* Add New Relationship */}
                {!showAddRelationship && availableCharacters.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAddRelationship(true)}
                    className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Heart size={14} />
                    Add Relationship
                  </button>
                )}

                {showAddRelationship && (
                  <AddRelationshipForm
                    availableCharacters={availableCharacters}
                    onAdd={handleAddRelationship}
                    onCancel={() => setShowAddRelationship(false)}
                  />
                )}

                {character?.id && characterRelationships.length === 0 && availableCharacters.length === 0 && !loadingCharacters && (
                  <p className="text-xs text-gray-500 text-center py-4">
                    Create more characters to add relationships
                  </p>
                )}
              </div>
            )}
          </div>

          {/* AI Model Selection */}
          <div className="pt-6 border-t border-white/10 space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Brain size={18} className="text-red-500" />
              AI Model Configuration
            </h3>

            {/* Provider Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Provider Type *
              </label>
              <p className="text-xs text-gray-400 mb-3">
                Choose between cloud API providers or local models running on your machine.
              </p>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    const apiProviders = ['openai', 'anthropic', 'openrouter', 'google'];
                    if (!apiProviders.includes(formData.ai_provider)) {
                      handleProviderChange('openai');
                    }
                  }}
                  className={`p-3 rounded-lg border transition-all ${
                    ['openai', 'anthropic', 'openrouter', 'google'].includes(formData.ai_provider)
                      ? 'bg-purple-500/20 border-purple-500 text-white'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <div className="text-2xl mb-1">☁️</div>
                  <div className="text-xs font-medium">API Providers</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (formData.ai_provider !== 'ollama') {
                      handleProviderChange('ollama');
                    }
                  }}
                  className={`p-3 rounded-lg border transition-all ${
                    formData.ai_provider === 'ollama'
                      ? 'bg-cyan-500/20 border-cyan-500 text-white'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <div className="text-2xl mb-1">💻</div>
                  <div className="text-xs font-medium">Ollama</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (formData.ai_provider !== 'lmstudio') {
                      handleProviderChange('lmstudio');
                    }
                  }}
                  className={`p-3 rounded-lg border transition-all ${
                    formData.ai_provider === 'lmstudio'
                      ? 'bg-indigo-500/20 border-indigo-500 text-white'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <div className="text-2xl mb-1">🖥️</div>
                  <div className="text-xs font-medium">LM Studio</div>
                </button>
              </div>

              {/* API Provider Selection Dropdown */}
              {['openai', 'anthropic', 'openrouter', 'google'].includes(formData.ai_provider) && (
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-400 mb-2">
                    Select API Provider
                  </label>
                  <select
                    value={formData.ai_provider}
                    onChange={(e) => handleProviderChange(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-purple-400"
                  >
                    <option value="openai" className="bg-gray-800">🤖 OpenAI - GPT Models</option>
                    <option value="anthropic" className="bg-gray-800">🧠 Anthropic - Claude Models</option>
                    <option value="openrouter" className="bg-gray-800">🌐 OpenRouter - 100+ Models</option>
                    <option value="google" className="bg-gray-800">✨ Google - Gemini Models</option>
                  </select>
                </div>
              )}

              {/* Provider Info Card */}
              <div className={`p-3 rounded-lg bg-white/5 border border-white/10`}>
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
                      {model.tier === 'free' ? '🆓 ' : ''}{model.name || model.id}
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

            {/* Memory Toggle */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-300">
                  Character Memory
                </label>
                <button
                  type="button"
                  onClick={() => handleInputChange('memory_enabled', !formData.memory_enabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.memory_enabled ? 'bg-red-500' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.memory_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-gray-400">
                When enabled, this character will remember facts about you, past conversations, and build an evolving relationship over time. When disabled, each conversation starts fresh with no memory of previous interactions.
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Status: <span className={formData.memory_enabled ? 'text-green-400' : 'text-gray-400'}>
                  {formData.memory_enabled ? 'Memory Active - Character will remember your conversations' : 'Memory Disabled - Each chat starts fresh'}
                </span>
              </p>
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

// ============================================================================
// ADD RELATIONSHIP FORM COMPONENT
// ============================================================================

const AddRelationshipForm = ({ availableCharacters, onAdd, onCancel }) => {
  const [selectedTarget, setSelectedTarget] = useState('');
  const [relationshipType, setRelationshipType] = useState('friend');
  const [trustLevel, setTrustLevel] = useState(0.5);
  const [familiarityLevel, setFamiliarityLevel] = useState(0.5);
  const [emotionalBond, setEmotionalBond] = useState(0);
  const [customContext, setCustomContext] = useState('');

  const relationshipTypes = [
    'stranger', 'acquaintance', 'friend', 'close_friend', 'best_friend',
    'family', 'sibling', 'parent', 'child',
    'romantic_partner', 'ex_partner',
    'rival', 'enemy',
    'coworker', 'boss', 'employee',
    'mentor', 'student',
    'custom'
  ];

  const handleSubmit = () => {
    if (!selectedTarget) {
      alert('Please select a target');
      return;
    }

    // Parse the selectedTarget which is in format "type:id"
    const [targetType, targetId] = selectedTarget.split(':');

    onAdd(targetId, targetType, {
      relationship_type: relationshipType,
      trust_level: trustLevel,
      familiarity_level: familiarityLevel,
      emotional_bond: emotionalBond,
      custom_context: customContext.trim() || null
    });
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
      <h4 className="text-sm font-medium text-white mb-2">Add New Relationship</h4>

      {/* Target Selection */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Select Target</label>
        <select
          value={selectedTarget}
          onChange={(e) => setSelectedTarget(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white"
        >
          <option value="" className="bg-gray-800">-- Select a target --</option>
          {availableCharacters.map(target => (
            <option
              key={`${target.type}:${target.id}`}
              value={`${target.type}:${target.id}`}
              className="bg-gray-800"
            >
              {target.avatar} {target.name} {target.type === 'persona' ? '(User Persona)' : '(Character)'}
            </option>
          ))}
        </select>
      </div>

      {/* Relationship Type */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Relationship Type</label>
        <select
          value={relationshipType}
          onChange={(e) => setRelationshipType(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white"
        >
          {relationshipTypes.map(type => (
            <option key={type} value={type} className="bg-gray-800">
              {type.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* Custom Context */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Context (Optional)</label>
        <input
          type="text"
          value={customContext}
          onChange={(e) => setCustomContext(e.target.value)}
          placeholder="e.g., We grew up together, Met in college..."
          className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white placeholder-gray-500"
        />
      </div>

      {/* Trust Level */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">
          Trust Level: {Math.round(trustLevel * 100)}%
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={trustLevel}
          onChange={(e) => setTrustLevel(parseFloat(e.target.value))}
          className="w-full accent-blue-500"
        />
      </div>

      {/* Familiarity Level */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">
          Familiarity Level: {Math.round(familiarityLevel * 100)}%
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={familiarityLevel}
          onChange={(e) => setFamiliarityLevel(parseFloat(e.target.value))}
          className="w-full accent-green-500"
        />
      </div>

      {/* Emotional Bond */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">
          Emotional Bond: {emotionalBond > 0 ? '+' : ''}{Math.round(emotionalBond * 100)}%
          <span className="ml-2 text-xs">
            ({emotionalBond > 0 ? 'Positive' : emotionalBond < 0 ? 'Negative' : 'Neutral'})
          </span>
        </label>
        <input
          type="range"
          min="-1"
          max="1"
          step="0.1"
          value={emotionalBond}
          onChange={(e) => setEmotionalBond(parseFloat(e.target.value))}
          className="w-full accent-purple-500"
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white text-sm transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="flex-1 px-3 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-white text-sm transition-colors"
        >
          Add Relationship
        </button>
      </div>
    </div>
  );
};

export default CharacterEditorV15;
