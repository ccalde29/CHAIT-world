/**
 * Scene Editor Component
 * 
 * Modal component for managing scenes/locations where characters can chat.
 * Allows creating, editing, and deleting custom scenes with different atmospheres.
 */

import React, { useState, useEffect } from 'react';
import { X, MapPin, Plus, Edit, Trash2, Image, Upload, Eye } from 'lucide-react';
import ImageUpload from './ImageUpload';

const SceneEditor = ({ scenarios, onSave, onDelete, onPublish, onUnpublish, onClose, initialEditingScene = null, apiRequest, user }) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [showCreateForm, setShowCreateForm] = useState(initialEditingScene !== null);
  const [editingScene, setEditingScene] = useState(initialEditingScene);
 
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    initial_message: '',
    atmosphere: '',
    background_image_url: null,
    background_image_filename: null,
    uses_custom_background: false,
    narrator_enabled: false,
    narrator_ai_provider: 'openai',
    narrator_ai_model: 'gpt-4o-mini',
    narrator_temperature: 0.7,
    narrator_max_tokens: 100,
    narrator_trigger_mode: 'auto_interval',
    narrator_interval: 5,
    narrator_personality: ''
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [narratorModels, setNarratorModels] = useState([]);
  const [loadingNarratorModels, setLoadingNarratorModels] = useState(false);
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

  // Initialize form when editing scene is provided
  useEffect(() => {
    if (initialEditingScene) {
      setFormData({
        name: initialEditingScene.name || '',
        description: initialEditingScene.description || '',
        initial_message: initialEditingScene.initial_message || '',
        atmosphere: initialEditingScene.atmosphere || '',
        background_image_url: initialEditingScene.background_image_url || null,
        background_image_filename: initialEditingScene.background_image_filename || null,
        uses_custom_background: initialEditingScene.uses_custom_background || false,
        narrator_enabled: initialEditingScene.narrator_enabled || false,
        narrator_ai_provider: initialEditingScene.narrator_ai_provider || 'openai',
        narrator_ai_model: initialEditingScene.narrator_ai_model || 'gpt-4o-mini',
        narrator_temperature: initialEditingScene.narrator_temperature !== undefined ? initialEditingScene.narrator_temperature : 0.7,
        narrator_max_tokens: initialEditingScene.narrator_max_tokens !== undefined ? initialEditingScene.narrator_max_tokens : 100,
        narrator_trigger_mode: initialEditingScene.narrator_trigger_mode || 'auto_interval',
        narrator_interval: initialEditingScene.narrator_interval !== undefined ? initialEditingScene.narrator_interval : 5,
        narrator_personality: initialEditingScene.narrator_personality || ''
      });
    }
  }, [initialEditingScene]);

  // Load available models when narrator provider changes
  useEffect(() => {
    const loadModels = async () => {
      if (!formData.narrator_ai_provider || !apiRequest) return;

      setLoadingNarratorModels(true);
      try {
        // Custom presets come from a different endpoint
        if (formData.narrator_ai_provider === 'custom') {
          const data = await apiRequest('/api/custom-models');
          setNarratorModels((data.models || []).map(m => ({ id: m.id, name: m.display_name || m.name })));
          setLoadingNarratorModels(false);
          return;
        }

        const requestBody = { provider: formData.narrator_ai_provider };
        
        // Add settings for Ollama and LM Studio
        if (formData.narrator_ai_provider === 'ollama' && userSettings?.ollamaSettings) {
          requestBody.ollamaSettings = userSettings.ollamaSettings;
        }
        if (formData.narrator_ai_provider === 'lmstudio' && userSettings?.lmStudioSettings) {
          requestBody.lmStudioSettings = userSettings.lmStudioSettings;
        }

        const data = await apiRequest('/api/providers/models', {
          method: 'POST',
          body: JSON.stringify(requestBody)
        });

        setNarratorModels(data.models || []);
      } catch (error) {
        console.error('Error loading narrator models:', error);
        setNarratorModels([]);
      } finally {
        setLoadingNarratorModels(false);
      }
    };

    loadModels();
  }, [formData.narrator_ai_provider, apiRequest, userSettings]);

  // ============================================================================
  // FORM HANDLING
  // ============================================================================
  
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      initial_message: '',
      atmosphere: '',
      background_image_url: null,
      background_image_filename: null,
      uses_custom_background: false,
      narrator_enabled: false,
      narrator_ai_provider: 'openai',
      narrator_ai_model: 'gpt-4o-mini',
      narrator_temperature: 0.7,
      narrator_max_tokens: 100,
      narrator_trigger_mode: 'auto_interval',
      narrator_interval: 5,
      narrator_personality: ''
    });
    setValidationErrors({});
  };

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      // Handle nested fields like 'background.url'
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Scene name is required';
    } else if (formData.name.length > 50) {
      errors.name = 'Scene name must be 50 characters or less';
    }
    
    if (!formData.description.trim()) {
      errors.description = 'Scene description is required';
    } else if (formData.description.length > 200) {
      errors.description = 'Description must be 200 characters or less';
    }
    
    if (!formData.initial_message.trim()) {
      errors.initial_message = 'Initial message is required';
    } else if (formData.initial_message.length > 500) {
      errors.initial_message = 'Initial message must be 500 characters or less';
    }
    
    if (formData.atmosphere && formData.atmosphere.length > 100) {
      errors.atmosphere = 'Atmosphere must be 100 characters or less';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    setError(null);

    try {
      // Convert 'local' provider to 'ollama' if somehow present
      let narratorProvider = formData.narrator_ai_provider;
      if (narratorProvider === 'local') {
        narratorProvider = 'ollama';
      }
      
      const sceneData = {
        ...formData,
        name: formData.name.trim(),
        description: formData.description.trim(),
        initial_message: formData.initial_message.trim(),
        atmosphere: formData.atmosphere.trim() || 'neutral',
        narrator_enabled: formData.narrator_enabled,
        narrator_ai_provider: narratorProvider,
        narrator_ai_model: formData.narrator_ai_model,
        narrator_temperature: formData.narrator_temperature,
        narrator_max_tokens: formData.narrator_max_tokens,
        narrator_trigger_mode: formData.narrator_trigger_mode,
        narrator_interval: formData.narrator_interval,
        narrator_personality: formData.narrator_personality
      };

      if (editingScene) {
        sceneData.id = editingScene.id;
      }

      await onSave(sceneData);
      resetForm();
      setShowCreateForm(false);
      setEditingScene(null);
    } catch (error) {
      console.error('Failed to save scene:', error);
      setError(error.message || 'Failed to save scene. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (scene) => {
    setEditingScene(scene);
    
    // Convert legacy 'local' provider to 'ollama'
    let narratorProvider = scene.narrator_ai_provider || 'openai';
    if (narratorProvider === 'local') {
      narratorProvider = 'ollama';
    }
    
    setFormData({
      name: scene.name || '',
      description: scene.description || '',
      initial_message: scene.initial_message || '',
      atmosphere: scene.atmosphere || '',
      background_image_url: scene.background_image_url || null,
      background_image_filename: scene.background_image_filename || null,
      uses_custom_background: scene.uses_custom_background || false,
      narrator_enabled: scene.narrator_enabled || false,
      narrator_ai_provider: narratorProvider,
      narrator_ai_model: scene.narrator_ai_model || 'gpt-4o-mini',
      narrator_temperature: scene.narrator_temperature !== undefined ? scene.narrator_temperature : 0.7,
      narrator_max_tokens: scene.narrator_max_tokens !== undefined ? scene.narrator_max_tokens : 100,
      narrator_trigger_mode: scene.narrator_trigger_mode || 'auto_interval',
      narrator_interval: scene.narrator_interval !== undefined ? scene.narrator_interval : 5,
      narrator_personality: scene.narrator_personality || ''
    });
    setShowCreateForm(true);
  };

  const getFieldError = (field) => {
    return validationErrors[field];
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl border border-white/10 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <MapPin className="text-orange-400" size={24} />
            <h2 className="text-xl font-bold text-white">
              Manage Scenes & Locations
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!showCreateForm ? (
            // Scene List View
            <div>
              <div className="flex items-center justify-between mb-6">
                <p className="text-gray-300">
                  Create and customize the locations where your characters can chat.
                </p>
                <button
                  onClick={() => {
                    resetForm();
                    setShowCreateForm(true);
                  }}
                  className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Plus size={16} />
                  Create Scene
                </button>
              </div>

              {/* Existing Scenes with Background Preview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {scenarios.map((scene) => (
                  <div
                    key={scene.id}
                    className="bg-white/5 border border-white/10 rounded-lg overflow-hidden hover:bg-white/10 transition-colors"
                  >
                    {/* Background Image Preview */}
                    {scene.background_image_url && scene.uses_custom_background ? (
                      <div className="h-24 relative">
                        <img 
                          src={scene.background_image_url} 
                          alt={`${scene.name} background`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40"></div>
                      </div>
                    ) : (
                      <div className="h-24 bg-orange-500/10"></div>
                    )}
            
                    {/* Scene Content */}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-medium text-white">{scene.name}</h3>
                            {scene.is_public && (
                              <span className="px-2 py-0.5 bg-green-500/20 text-green-300 text-xs rounded-full border border-green-500/30">
                                Published
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {onPublish && onUnpublish && (
                            <button
                              onClick={() => scene.is_public ? onUnpublish(scene.id) : onPublish(scene.id)}
                              className={`p-1 transition-colors ${
                                scene.is_public
                                  ? 'text-orange-400 hover:text-orange-300'
                                  : 'text-gray-400 hover:text-orange-400'
                              }`}
                              title={scene.is_public ? 'Unpublish from community' : 'Publish to community'}
                            >
                              {scene.is_public ? <Eye size={14} /> : <Upload size={14} />}
                            </button>
                          )}
                          <button
                            onClick={() => startEdit(scene)}
                            className="p-1 text-gray-400 hover:text-white transition-colors"
                            title="Edit scene"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete "${scene.name}" scene?`)) {
                                onDelete(scene.id);
                              }
                            }}
                            className="p-1 text-gray-400 hover:text-orange-400 transition-colors"
                            title="Delete scene"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-300 mb-2">{scene.description}</p>
                      <div className="text-xs text-gray-400">
                        <span className="font-medium">Initial Message:</span> {scene.initial_message}
                      </div>
                      {scene.atmosphere && (
                        <div className="text-xs text-orange-300 mt-1">
                          <span className="font-medium">Atmosphere:</span> {scene.atmosphere}
                        </div>
                      )}
                      {scene.uses_custom_background && (
                        <div className="text-xs text-orange-300 mt-1">
                          <span className="font-medium">📸 Custom Background</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Create/Edit Form
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-white">
                  {editingScene ? 'Edit Scene' : 'Create New Scene'}
                </h3>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingScene(null);
                    resetForm();
                    setError(null);
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Back to List
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-orange-600/10 border border-red-500/50 rounded-lg p-4">
                  <p className="text-orange-400 text-sm">{error}</p>
                </div>
              )}

              {/* Scene Preview with Background */}
              <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                <h4 className="text-sm font-medium text-orange-300 mb-2 p-4 pb-0">Preview</h4>
        
                {/* Background Preview */}
                {formData.background_image_url && formData.uses_custom_background ? (
                  <div className="relative h-32 mb-4">
                    <img 
                      src={formData.background_image_url} 
                      alt="Scene background" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="text-center text-white">
                        <div className="text-lg font-medium">
                          {formData.name || 'Scene Name'}
                        </div>
                        <div className="text-sm opacity-75">
                          {formData.description || 'Scene description will appear here...'}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4">
                    <div className="text-lg font-medium text-white mb-1">
                      {formData.name || 'Scene Name'}
                    </div>
                    <div className="text-sm text-gray-300 mb-2">
                      {formData.description || 'Scene description will appear here...'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {formData.initial_message || 'Initial message will appear here...'}
                    </div>
                  </div>
                )}
              </div>

              {/* Scene Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Scene Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter scene name"
                  maxLength={50}
                  className={`w-full bg-white/5 border rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none ${
                    getFieldError('name') ? 'border-red-400' : 'border-white/10 focus:border-orange-400'
                  }`}
                />
                {getFieldError('name') && (
                  <p className="text-orange-400 text-xs mt-1">{getFieldError('name')}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">{formData.name.length}/50 characters</p>
              </div>

              {/* Scene Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description *
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Brief description of the location"
                  maxLength={200}
                  className={`w-full bg-white/5 border rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none ${
                    getFieldError('description') ? 'border-red-400' : 'border-white/10 focus:border-orange-400'
                  }`}
                />
                {getFieldError('description') && (
                  <p className="text-orange-400 text-xs mt-1">{getFieldError('description')}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">{formData.description.length}/200 characters</p>
              </div>

              {/* Background Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Image size={16} className="inline mr-2" />
                  Scene Background (Optional)
                </label>
        
                <ImageUpload
                  currentImage={formData.background_image_url}
                  currentEmoji={null} // Not used for scenes
                  onImageChange={(imageData) => {
                    setFormData(prev => ({
                      ...prev,
                      background_image_url: imageData.url,
                      background_image_filename: imageData.filename,
                      uses_custom_background: imageData.useCustomImage
                    }));
                  }}
                  type="scene"
                  aspectRatio="wide"
                />
        
                <div className="mt-2 text-xs text-gray-500">
                  <div className="flex items-start gap-2">
                    <span>💡</span>
                    <div>
                      <p><strong>Background Image Tips:</strong></p>
                      <ul className="mt-1 space-y-1 ml-2">
                        <li>• Use high-quality landscape images (1920x1080 or higher)</li>
                        <li>• Avoid busy images that would distract from conversation</li>
                        <li>• Consider the mood and atmosphere of your scene</li>
                        <li>• Images will be overlaid with semi-transparent chat interface</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Initial Message */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Initial Message *
                </label>
                <p className="text-xs text-gray-400 mb-2">
                  This message will be shown at the start of every chat in this scene. Use it to set the atmosphere, describe the setting, or provide context for the conversation. This helps establish the mood and situation for the characters.
                </p>
                <textarea
                  value={formData.initial_message}
                  onChange={(e) => handleInputChange('initial_message', e.target.value)}
                  placeholder="e.g., 'You all meet at the coffee shop on a rainy afternoon. The warm aroma of fresh coffee fills the air as you settle into comfortable chairs by the window.'"
                  rows={4}
                  maxLength={500}
                  className={`w-full bg-white/5 border rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none resize-none ${
                    getFieldError('initial_message') ? 'border-red-400' : 'border-white/10 focus:border-orange-400'
                  }`}
                />
                {getFieldError('initial_message') && (
                  <p className="text-orange-400 text-xs mt-1">{getFieldError('initial_message')}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">{formData.initial_message.length}/500 characters</p>
              </div>

              {/* Atmosphere */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Atmosphere (Optional)
                </label>
                <input
                  type="text"
                  value={formData.atmosphere}
                  onChange={(e) => handleInputChange('atmosphere', e.target.value)}
                  placeholder="e.g., relaxed and friendly, energetic and social, intimate and cozy"
                  maxLength={100}
                  className={`w-full bg-white/5 border rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none ${
                    getFieldError('atmosphere') ? 'border-red-400' : 'border-white/10 focus:border-orange-400'
                  }`}
                />
                {getFieldError('atmosphere') && (
                  <p className="text-orange-400 text-xs mt-1">{getFieldError('atmosphere')}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">{formData.atmosphere.length}/100 characters</p>
              </div>

              {/* Narrator Configuration */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-300">
                    AI Narrator (Optional)
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.narrator_enabled}
                      onChange={(e) => handleInputChange('narrator_enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-400 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                  </label>
                </div>
                <p className="text-xs text-gray-400 mb-4">
                  Enable automatic narration to describe environmental changes, set mood, and provide context during conversations
                </p>

                {formData.narrator_enabled && (
                  <div className="space-y-4">
                    {/* Trigger Mode */}
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-2">
                        Trigger Mode
                      </label>
                      <select
                        value={formData.narrator_trigger_mode}
                        onChange={(e) => handleInputChange('narrator_trigger_mode', e.target.value)}
                        className="w-full bg-gray-800 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-orange-400"
                        style={{ colorScheme: 'dark' }}
                      >
                        <option value="manual">Manual (on request only)</option>
                        <option value="auto_interval">Auto Interval (every N messages)</option>
                        <option value="action_based">Action Based (when *actions* detected)</option>
                        <option value="scene_change">Scene Change (on movement keywords)</option>
                      </select>
                    </div>

                    {/* Interval (only for auto_interval mode) */}
                    {formData.narrator_trigger_mode === 'auto_interval' && (
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-2">
                          Message Interval: {formData.narrator_interval}
                        </label>
                        <input
                          type="range"
                          min="3"
                          max="15"
                          step="1"
                          value={formData.narrator_interval}
                          onChange={(e) => handleInputChange('narrator_interval', parseInt(e.target.value))}
                          className="w-full"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Narrator will respond every {formData.narrator_interval} messages
                        </p>
                      </div>
                    )}

                    {/* AI Provider */}
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-2">
                        AI Provider
                      </label>
                      <select
                        value={formData.narrator_ai_provider}
                        onChange={(e) => handleInputChange('narrator_ai_provider', e.target.value)}
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

                    {/* Model */}
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-2">
                        Model
                      </label>
                      <select
                        value={formData.narrator_ai_model}
                        onChange={(e) => handleInputChange('narrator_ai_model', e.target.value)}
                        disabled={loadingNarratorModels}
                        className="w-full bg-gray-800 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-orange-400 disabled:opacity-50"
                        style={{ colorScheme: 'dark' }}
                      >
                        {loadingNarratorModels ? (
                          <option>Loading models...</option>
                        ) : narratorModels.length > 0 ? (
                          narratorModels.map(model => (
                            <option key={model.id} value={model.id}>
                              {model.name}
                            </option>
                          ))
                        ) : (
                          <option value={formData.narrator_ai_model}>{formData.narrator_ai_model}</option>
                        )}
                      </select>
                    </div>

                    {/* Temperature */}
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-2">
                        Temperature: {formData.narrator_temperature}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="2.0"
                        step="0.1"
                        value={formData.narrator_temperature}
                        onChange={(e) => handleInputChange('narrator_temperature', parseFloat(e.target.value))}
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
                        Max Tokens: {formData.narrator_max_tokens}
                      </label>
                      <input
                        type="range"
                        min="50"
                        max="200"
                        step="10"
                        value={formData.narrator_max_tokens}
                        onChange={(e) => handleInputChange('narrator_max_tokens', parseInt(e.target.value))}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Controls narration length (50-200 tokens)
                      </p>
                    </div>

                    {/* Narrator Personality */}
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-2">
                        Narrator Style/Personality (Optional)
                      </label>
                      <textarea
                        value={formData.narrator_personality}
                        onChange={(e) => handleInputChange('narrator_personality', e.target.value)}
                        placeholder="e.g., poetic and descriptive, matter-of-fact, dramatic and cinematic"
                        rows={2}
                        maxLength={200}
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white placeholder-gray-500 focus:outline-none focus:border-orange-400 resize-none"
                      />
                      <p className="text-xs text-gray-500 mt-1">{formData.narrator_personality.length}/200 characters</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingScene(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all"
                >
                  {saving ? 'Saving...' : editingScene ? 'Update Scene' : 'Create Scene'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SceneEditor;