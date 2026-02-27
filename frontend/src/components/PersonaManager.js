/**
 * Persona Manager Component
 * Manages multiple user personas with full CRUD operations
 */

import React, { useState, useEffect } from 'react';
import { X, User, Palette, Smile, Sparkles, MessageCircle, Plus, Edit2, Trash2 } from 'lucide-react';
import ImageUpload from './ImageUpload';

const PersonaManager = ({ personasState, onClose, user, apiRequest, fullScreen = false }) => {
  const { personas, activePersona, createPersona, updatePersona, deletePersona, activatePersona } = personasState;

  const [view, setView] = useState('list'); // 'list' or 'edit'
  const [editingPersona, setEditingPersona] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    personality: '',
    interests: [],
    communication_style: '',
    avatar: '👤',
    color: 'bg-orange-600',
    avatar_image_url: null,
    avatar_image_filename: null,
    uses_custom_image: false,
    ai_provider: 'openai',
    ai_model: 'gpt-4o-mini',
    temperature: 0.8,
    max_tokens: 150
  });

  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [currentInterest, setCurrentInterest] = useState('');
  const [availableModels, setAvailableModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [userSettings, setUserSettings] = useState(null);

  // Load user settings for Ollama/LM Studio configuration
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await apiRequest('/api/user/settings');
        setUserSettings(settings);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    loadSettings();
  }, [apiRequest]);

  const colorOptions = [
    { name: 'Orange Light', value: 'bg-orange-500' },
    { name: 'Orange', value: 'bg-orange-600' },
    { name: 'Orange Dark', value: 'bg-orange-700' },
    { name: 'Gray Light', value: 'bg-gray-600' },
    { name: 'Gray', value: 'bg-gray-700' },
    { name: 'Gray Dark', value: 'bg-gray-800' },
    { name: 'Black Orange', value: 'bg-orange-900' },
    { name: 'Warm Gray', value: 'bg-gray-500' },
    { name: 'Deep Orange', value: 'bg-orange-800' },
    { name: 'Stone', value: 'bg-gray-700' }
  ];

  const emojiOptions = [
    '👤', '🧑', '👩', '👨', '🙂', '😊', '🤓', '😎', '🤔', '✨',
    '🌟', '💫', '🎭', '🎯', '🎸', '📚', '💻', '🎨', '🏃‍♂️', '🧘‍♀️',
    '🌙', '☀️', '🌈', '🔥', '💎', '🦋', '🌺', '🍃', '🎪', '🚀'
  ];

  const commonInterests = [
    "technology", "music", "books", "movies", "gaming", "sports", "travel",
    "cooking", "art", "science", "philosophy", "fitness", "photography",
    "writing", "nature", "history", "culture", "learning", "creativity"
  ];

  const handleNew = () => {
    setEditingPersona(null);
    setFormData({
      name: '',
      personality: '',
      interests: [],
      communication_style: '',
      avatar: '👤',
      color: 'bg-orange-600',
      avatar_image_url: null,
      avatar_image_filename: null,
      uses_custom_image: false,
      ai_provider: 'openai',
      ai_model: 'gpt-4o-mini',
      temperature: 0.8,
      max_tokens: 150
    });
    setValidationErrors({});
    setView('edit');
  };

  const handleEdit = (persona) => {
    setEditingPersona(persona);
    setFormData({
      name: persona.name || '',
      personality: persona.personality || '',
      interests: persona.interests || [],
      communication_style: persona.communication_style || '',
      avatar: persona.avatar || '👤',
      color: persona.color || 'bg-orange-600',
      avatar_image_url: persona.avatar_image_url || null,
      avatar_image_filename: persona.avatar_image_filename || null,
      uses_custom_image: persona.uses_custom_image || false,
      ai_provider: persona.ai_provider || 'openai',
      ai_model: persona.ai_model || 'gpt-4o-mini',
      temperature: persona.temperature !== undefined ? persona.temperature : 0.8,
      max_tokens: persona.max_tokens !== undefined ? persona.max_tokens : 150
    });
    setValidationErrors({});
    setView('edit');
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    } else if (formData.name.length > 50) {
      errors.name = 'Name must be 50 characters or less';
    }

    if (!formData.personality.trim()) {
      errors.personality = 'Personality description is required';
    } else if (formData.personality.length < 20) {
      errors.personality = 'Personality description should be at least 20 characters';
    } else if (formData.personality.length > 500) {
      errors.personality = 'Personality description must be 500 characters or less';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const personaData = {
        name: formData.name.trim(),
        personality: formData.personality.trim(),
        interests: formData.interests,
        communication_style: formData.communication_style.trim(),
        avatar: formData.avatar,
        color: formData.color,
        avatar_image_url: formData.avatar_image_url,
        avatar_image_filename: formData.avatar_image_filename,
        uses_custom_image: formData.uses_custom_image,
        ai_provider: formData.ai_provider,
        ai_model: formData.ai_model,
        temperature: formData.temperature,
        max_tokens: formData.max_tokens
      };

      if (editingPersona) {
        await updatePersona(editingPersona.id, personaData);
      } else {
        await createPersona(personaData);
      }

      setView('list');
      setEditingPersona(null);
    } catch (error) {
      console.error('Failed to save persona:', error);
      alert('Failed to save persona. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (persona) => {
    if (!window.confirm(`Are you sure you want to delete "${persona.name}"?`)) return;

    try {
      await deletePersona(persona.id);
    } catch (error) {
      console.error('Failed to delete persona:', error);
      alert(error.message || 'Failed to delete persona. Please try again.');
    }
  };

  const handleActivate = async (persona) => {
    try {
      await activatePersona(persona.id);
    } catch (error) {
      console.error('Failed to activate persona:', error);
      alert('Failed to activate persona. Please try again.');
    }
  };

  const addInterest = () => {
    if (currentInterest.trim() && !formData.interests.includes(currentInterest.trim().toLowerCase())) {
      setFormData(prev => ({
        ...prev,
        interests: [...prev.interests, currentInterest.trim().toLowerCase()]
      }));
      setCurrentInterest('');
    }
  };

  const removeInterest = (interest) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.filter(i => i !== interest)
    }));
  };

  const addCommonInterest = (interest) => {
    if (!formData.interests.includes(interest)) {
      setFormData(prev => ({
        ...prev,
        interests: [...prev.interests, interest]
      }));
    }
  };

  // Load available models when provider changes
  useEffect(() => {
    const loadModels = async () => {
      if (!formData.ai_provider || !apiRequest) return;

      setLoadingModels(true);
      try {
        // Custom presets come from a different endpoint
        if (formData.ai_provider === 'custom') {
          const data = await apiRequest('/api/custom-models');
          setAvailableModels((data.models || []).map(m => ({ id: m.id, name: m.display_name || m.name })));
          setLoadingModels(false);
          return;
        }

        const requestBody = { provider: formData.ai_provider };
        
        // Add settings for Ollama and LM Studio
        if (formData.ai_provider === 'ollama' && userSettings?.ollamaSettings) {
          requestBody.ollamaSettings = userSettings.ollamaSettings;
        }
        if (formData.ai_provider === 'lmstudio' && userSettings?.lmStudioSettings) {
          requestBody.lmStudioSettings = userSettings.lmStudioSettings;
        }

        const data = await apiRequest('/api/providers/models', {
          method: 'POST',
          body: JSON.stringify(requestBody)
        });

        setAvailableModels(data.models || []);
      } catch (error) {
        console.error('Error loading models:', error);
        setAvailableModels([]);
      } finally {
        setLoadingModels(false);
      }
    };

    loadModels();
  }, [formData.ai_provider, apiRequest, userSettings]);

  if (view === 'list') {
    const containerClass = fullScreen 
      ? "flex-1 bg-gray-900 flex flex-col overflow-hidden" 
      : "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4";
    
    const innerClass = fullScreen 
      ? "flex-1 flex flex-col overflow-hidden" 
      : "bg-slate-800 rounded-2xl border border-white/10 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col";

    return (
      <div className={containerClass}>
        <div className={innerClass}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <User className="text-orange-400" size={24} />
              <h2 className="text-xl font-bold text-white">Your Personas</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Info Box */}
            <div className="bg-orange-600/10 border border-blue-500/20 rounded-lg p-4">
              <h4 className="text-sm font-medium text-orange-300 mb-2">💡 What are Personas?</h4>
              <p className="text-xs text-blue-200">
                Personas represent different versions of yourself. Switch between them to interact with characters from different perspectives or moods.
              </p>
            </div>

            {/* Add Button */}
            <div className="flex justify-center">
              <button
                onClick={handleNew}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-lg transition-all font-medium text-sm"
              >
                <Plus size={16} />
                Create New Persona
              </button>
            </div>

            {/* Personas Grid */}
            {personas.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <User size={48} className="mx-auto mb-3 opacity-50" />
                <p>No personas yet. Create your first one!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {personas.map(persona => (
                  <div
                    key={persona.id}
                    className={`relative bg-white/5 border rounded-lg overflow-hidden hover:bg-white/10 transition-all group ${
                      activePersona?.id === persona.id ? 'border-orange-400 hover:border-orange-400/30' : 'border-white/10 hover:border-orange-400/30'
                    }`}
                  >
                    {/* Delete button positioned inside the card (top-right) */}
                    <button
                      onClick={() => handleDelete(persona)}
                      className="absolute right-2 top-2 z-10 flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 p-1.5 hover:bg-black/50 rounded transition-colors opacity-0 group-hover:opacity-100"
                      aria-label={`Delete ${persona.name}`}
                    >
                      <Trash2 size={14} />
                    </button>

                    {/* Persona Avatar Header */}
                    <div className="relative h-16 flex items-center justify-center bg-gray-900">
                      {persona.uses_custom_image && persona.avatar_image_url ? (
                        <img
                          src={persona.avatar_image_url}
                          alt={persona.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className={`w-8 h-8 rounded-full ${
                            persona.color || 'bg-orange-600'
                          } flex items-center justify-center text-xl`}
                        >
                          <span>{persona.avatar || '👤'}</span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-2">
                      <div className="flex items-center justify-center gap-1.5 mb-0.5">
                        <p className="font-bold text-white text-center text-sm">{persona.name}</p>
                        {activePersona?.id === persona.id && (
                          <span className="text-[10px] bg-orange-600/20 text-orange-300 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 line-clamp-2 text-center mb-1.5">
                        {persona.personality?.substring(0, 60)}...
                      </p>
                      {persona.interests && persona.interests.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 justify-center mb-1.5">
                          {persona.interests.slice(0, 3).map((interest, idx) => (
                            <span key={idx} className="text-[10px] bg-white/10 text-gray-300 px-1.5 py-0.5 rounded">
                              {interest}
                            </span>
                          ))}
                          {persona.interests.length > 3 && (
                            <span className="text-[10px] text-gray-400">+{persona.interests.length - 3}</span>
                          )}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center justify-center gap-0.5 flex-wrap">
                        {activePersona?.id !== persona.id && (
                          <button
                            onClick={() => handleActivate(persona)}
                            className="flex items-center gap-0.5 text-[10px] text-orange-400 hover:text-orange-300 px-1.5 py-0.5 hover:bg-white/5 rounded transition-colors"
                          >
                            <User size={10} />
                            Activate
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(persona)}
                          className="flex items-center gap-0.5 text-[10px] text-orange-400 hover:text-orange-300 px-1.5 py-0.5 hover:bg-white/5 rounded transition-colors"
                        >
                          <Edit2 size={10} />
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Edit View
  const containerClass = fullScreen 
    ? "flex-1 bg-gray-900 flex flex-col overflow-hidden" 
    : "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4";
  
  const innerClass = fullScreen 
    ? "flex-1 flex flex-col overflow-hidden" 
    : "bg-slate-800 rounded-2xl border border-white/10 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col";

  return (
    <div className={containerClass}>
      <div className={innerClass}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <User className="text-orange-400" size={24} />
            <h2 className="text-xl font-bold text-white">
              {editingPersona ? 'Edit Persona' : 'Create New Persona'}
            </h2>
          </div>
          <button
            onClick={() => setView('list')}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6" style={{ maxHeight: 'calc(100vh - 150px)' }}>
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Name *
              <span className="ml-2 text-xs text-gray-500">
                ({formData.name.length} / 50)
              </span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="How would you like to be addressed?"
              maxLength={50}
              className={`w-full bg-white/5 border rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none ${
                validationErrors.name ? 'border-red-400' : 'border-white/10 focus:border-orange-400'
              }`}
            />
            {validationErrors.name && (
              <p className="text-orange-400 text-xs mt-1">{validationErrors.name}</p>
            )}
          </div>

          {/* Avatar Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Avatar Image
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
              type="persona"
              aspectRatio="square"
            />
            <p className="text-xs text-gray-500 mt-1">
              Upload a custom avatar image or use an emoji
            </p>
          </div>

          {/* Emoji Selection (if not using custom image) */}
          {!formData.uses_custom_image && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Smile size={16} className="inline mr-2" />
                Avatar Emoji
              </label>
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-colors text-sm"
                >
                  Current: {formData.avatar} - Click to change
                </button>
              </div>

              {showEmojiPicker && (
                <div className="grid grid-cols-10 gap-2 p-3 bg-white/5 rounded-lg border border-white/10">
                  {emojiOptions.map((emoji, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        handleInputChange('avatar', emoji);
                        setShowEmojiPicker(false);
                      }}
                      className="w-8 h-8 text-xl hover:bg-white/10 rounded transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Color Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Palette size={16} className="inline mr-2" />
              Color Theme
            </label>
            <div className="grid grid-cols-5 gap-2">
              {colorOptions.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleInputChange('color', option.value)}
                  className={`h-12 rounded-lg ${option.value} border-2 transition-all ${
                    formData.color === option.value ? 'border-white' : 'border-transparent hover:border-white/50'
                  }`}
                  title={option.name}
                />
              ))}
            </div>
          </div>

          {/* Personality */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Personality Description *
              <span className="ml-2 text-xs text-gray-500">
                ({formData.personality.length} / 500)
              </span>
            </label>
            <textarea
              value={formData.personality}
              onChange={(e) => handleInputChange('personality', e.target.value)}
              placeholder="Describe your personality, how you like to communicate..."
              rows={6}
              maxLength={500}
              className={`w-full bg-white/5 border rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none resize-none ${
                validationErrors.personality ? 'border-red-400' : 'border-white/10 focus:border-orange-400'
              }`}
            />
            {validationErrors.personality && (
              <p className="text-orange-400 text-xs mt-1">{validationErrors.personality}</p>
            )}
          </div>

          {/* Interests */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Interests & Hobbies
            </label>

            {formData.interests.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.interests.map((interest, index) => (
                  <span
                    key={index}
                    className="flex items-center gap-1 bg-orange-600/20 text-orange-300 px-2 py-1 rounded-full text-sm"
                  >
                    {interest}
                    <button
                      onClick={() => removeInterest(interest)}
                      className="text-orange-300 hover:text-white"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={currentInterest}
                onChange={(e) => setCurrentInterest(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addInterest()}
                placeholder="Add an interest..."
                className="flex-1 bg-white/5 border border-white/10 rounded-lg p-2 text-white placeholder-gray-500 focus:outline-none focus:border-orange-400"
              />
              <button
                onClick={addInterest}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
              >
                Add
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-gray-400">Common interests:</p>
              <div className="flex flex-wrap gap-1">
                {commonInterests.map((interest, index) => (
                  <button
                    key={index}
                    onClick={() => addCommonInterest(interest)}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      formData.interests.includes(interest)
                        ? 'bg-orange-600/30 text-orange-300 cursor-default'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                    disabled={formData.interests.includes(interest)}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Communication Style */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <MessageCircle size={16} className="inline mr-2" />
              Communication Style (Optional)
            </label>
            <input
              type="text"
              value={formData.communication_style}
              onChange={(e) => handleInputChange('communication_style', e.target.value)}
              placeholder="e.g., casual and friendly, formal and direct..."
              maxLength={100}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-400"
            />
            <p className="text-xs text-gray-500 mt-1">{formData.communication_style.length}/100</p>
          </div>

          {/* AI Model Configuration */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              <Sparkles size={16} className="inline mr-2" />
              AI Model Configuration (For Auto-Response)
            </label>
            <p className="text-xs text-gray-400 mb-4">
              Configure which AI model to use when generating auto-responses for this persona
            </p>

            <div className="space-y-4">
              {/* Provider Selection */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  AI Provider
                </label>
                <select
                  value={formData.ai_provider}
                  onChange={(e) => handleInputChange('ai_provider', e.target.value)}
                  className="w-full bg-gray-800 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-orange-400"
                  style={{ colorScheme: 'dark' }}
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="openrouter">OpenRouter</option>
                  <option value="google">Google</option>
                  <option value="ollama">Ollama (Local)</option>
                  <option value="lmstudio">LM Studio (Local)</option>
                  <option value="custom">Custom Preset</option>
                </select>
              </div>

              {/* Model Selection */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  Model
                </label>
                <select
                  value={formData.ai_model}
                  onChange={(e) => handleInputChange('ai_model', e.target.value)}
                  disabled={loadingModels}
                  className="w-full bg-gray-800 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-orange-400 disabled:opacity-50"
                  style={{ colorScheme: 'dark' }}
                >
                  {loadingModels ? (
                    <option>Loading models...</option>
                  ) : availableModels.length > 0 ? (
                    availableModels.map(model => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))
                  ) : (
                    <option value={formData.ai_model}>{formData.ai_model}</option>
                  )}
                </select>
              </div>

              {/* Temperature */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  Temperature: {formData.temperature}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2.0"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) => handleInputChange('temperature', parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>More focused</span>
                  <span>More creative</span>
                </div>
              </div>

              {/* Max Tokens */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  Max Tokens: {formData.max_tokens}
                </label>
                <input
                  type="range"
                  min="50"
                  max="500"
                  step="10"
                  value={formData.max_tokens}
                  onChange={(e) => handleInputChange('max_tokens', parseInt(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Controls response length (50-500 tokens)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-white/10">
          <button
            onClick={() => setView('list')}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all"
          >
            {saving ? 'Saving...' : editingPersona ? 'Update Persona' : 'Create Persona'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PersonaManager;
