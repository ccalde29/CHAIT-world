// ============================================================================
// Token Models Panel
// Admin panel for managing token-based AI model presets
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Sparkles, X } from 'lucide-react';

const TokenModelsPanel = ({ apiRequest }) => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null or model object
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [providerModels, setProviderModels] = useState({
    openai: [],
    anthropic: [],
    google: [],
    openrouter: []
  });
  const [loadingProviderModels, setLoadingProviderModels] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    ai_provider: 'openai',
    model_id: '',
    token_cost: 10,
    custom_system_prompt: '',
    temperature: 0.7,
    max_tokens: 150,
    tags: []
  });

  const [validationErrors, setValidationErrors] = useState({});

  // Fetch token models
  const fetchModels = async () => {
    setLoading(true);
    try {
      const response = await apiRequest('/api/token-models/admin');
      setModels(response.models || []);
    } catch (error) {
      console.error('[TokenModels] Error fetching models:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all provider models
  const fetchProviderModels = async (provider) => {
    setLoadingProviderModels(true);
    try {
      const response = await apiRequest('/api/providers/models', {
        method: 'POST',
        body: JSON.stringify({ provider })
      });
      setProviderModels(prev => ({
        ...prev,
        [provider]: response.models || []
      }));
    } catch (error) {
      console.error(`[TokenModels] Error fetching ${provider} models:`, error);
    } finally {
      setLoadingProviderModels(false);
    }
  };

  useEffect(() => {
    fetchModels();
    // Fetch models for all providers
    ['openai', 'anthropic', 'google', 'openrouter'].forEach(provider => {
      fetchProviderModels(provider);
    });
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      display_name: '',
      description: '',
      ai_provider: 'openai',
      model_id: '',
      token_cost: 10,
      custom_system_prompt: '',
      temperature: 0.7,
      max_tokens: 150,
      tags: []
    });
    setValidationErrors({});
    setEditing(null);
    setShowForm(false);
  };

  const handleNew = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (model) => {
    setEditing(model);
    setFormData({
      name: model.name,
      display_name: model.display_name,
      description: model.description || '',
      ai_provider: model.ai_provider,
      model_id: model.model_id,
      token_cost: model.token_cost,
      custom_system_prompt: model.custom_system_prompt || '',
      temperature: model.temperature,
      max_tokens: model.max_tokens,
      tags: model.tags || []
    });
    setShowForm(true);
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    if (!formData.display_name.trim()) {
      errors.display_name = 'Display name is required';
    }
    if (!formData.ai_provider) {
      errors.ai_provider = 'AI Provider is required';
    }
    if (!formData.model_id) {
      errors.model_id = 'Model is required';
    }
    if (!formData.token_cost || formData.token_cost < 1) {
      errors.token_cost = 'Token cost must be at least 1';
    }
    if (formData.temperature < 0 || formData.temperature > 2.0) {
      errors.temperature = 'Temperature must be between 0.0 and 2.0';
    }
    if (formData.max_tokens < 50 || formData.max_tokens > 1000) {
      errors.max_tokens = 'Max tokens must be between 50 and 1000';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      if (editing) {
        await apiRequest(`/api/token-models/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
      } else {
        await apiRequest('/api/token-models', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      }

      await fetchModels();
      resetForm();
    } catch (error) {
      console.error('[TokenModels] Error saving model:', error);
      alert(error.message || 'Failed to save token model');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (model) => {
    if (!window.confirm(`Are you sure you want to delete "${model.display_name}"?\n\nNote: Existing transactions using this model will have their model reference removed.`)) {
      return;
    }

    try {
      const response = await apiRequest(`/api/token-models/${model.id}`, {
        method: 'DELETE'
      });
      
      await fetchModels();
      alert(`Successfully deleted "${model.display_name}"`);
    } catch (error) {
      console.error('[TokenModels] Error deleting model:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to delete token model';
      alert(`Error: ${errorMsg}\n\nMake sure you have admin permissions.`);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  if (showForm) {
    return (
      <div className="max-w-4xl">
        <div className="bg-gray-800 border border-white/10 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">
              {editing ? 'Edit Token Model' : 'Create Token Model'}
            </h3>
            <button
              onClick={resetForm}
              className="text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Internal Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., creative-storyteller"
                className={`w-full bg-white/5 border rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none ${
                  validationErrors.name ? 'border-red-400' : 'border-white/10 focus:border-orange-400'
                }`}
              />
              {validationErrors.name && (
                <p className="text-orange-400 text-xs mt-1">{validationErrors.name}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">Unique identifier (lowercase, hyphens only)</p>
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Display Name *
              </label>
              <input
                type="text"
                value={formData.display_name}
                onChange={(e) => handleInputChange('display_name', e.target.value)}
                placeholder="e.g., Creative Storyteller"
                className={`w-full bg-white/5 border rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none ${
                  validationErrors.display_name ? 'border-red-400' : 'border-white/10 focus:border-orange-400'
                }`}
              />
              {validationErrors.display_name && (
                <p className="text-orange-400 text-xs mt-1">{validationErrors.display_name}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Brief description of this model preset..."
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-400 resize-none"
              />
            </div>

            {/* AI Provider */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                AI Provider *
              </label>
              <select
                value={formData.ai_provider}
                onChange={(e) => {
                  handleInputChange('ai_provider', e.target.value);
                  handleInputChange('model_id', ''); // Reset model when provider changes
                }}
                className={`w-full bg-white/5 border rounded-lg p-3 text-white focus:outline-none ${
                  validationErrors.ai_provider ? 'border-red-400' : 'border-white/10 focus:border-orange-400'
                }`}
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="google">Google AI</option>
                <option value="openrouter">OpenRouter</option>
              </select>
              {validationErrors.ai_provider && (
                <p className="text-orange-400 text-xs mt-1">{validationErrors.ai_provider}</p>
              )}
            </div>

            {/* Model Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Model *
              </label>
              <select
                value={formData.model_id}
                onChange={(e) => handleInputChange('model_id', e.target.value)}
                disabled={loadingProviderModels}
                className={`w-full bg-white/5 border rounded-lg p-3 text-white focus:outline-none ${
                  validationErrors.model_id ? 'border-red-400' : 'border-white/10 focus:border-orange-400'
                } disabled:opacity-50`}
              >
                <option value="">
                  {loadingProviderModels ? 'Loading models...' : 'Select a model'}
                </option>
                {providerModels[formData.ai_provider]?.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
              {validationErrors.model_id && (
                <p className="text-orange-400 text-xs mt-1">{validationErrors.model_id}</p>
              )}
            </div>

            {/* Token Cost */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Token Cost per Message *
              </label>
              <input
                type="number"
                value={formData.token_cost}
                onChange={(e) => handleInputChange('token_cost', parseInt(e.target.value) || 1)}
                min="1"
                placeholder="10"
                className={`w-full bg-white/5 border rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none ${
                  validationErrors.token_cost ? 'border-red-400' : 'border-white/10 focus:border-orange-400'
                }`}
              />
              {validationErrors.token_cost && (
                <p className="text-orange-400 text-xs mt-1">{validationErrors.token_cost}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">How many tokens users pay per message</p>
            </div>

            {/* Custom System Prompt */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Custom System Prompt (Optional)
              </label>
              <textarea
                value={formData.custom_system_prompt}
                onChange={(e) => handleInputChange('custom_system_prompt', e.target.value)}
                placeholder="This prompt will be prepended to all character prompts using this model..."
                rows={6}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-400 resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use this to modify the model's behavior globally
              </p>
            </div>

            {/* Temperature */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
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
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max Tokens: {formData.max_tokens}
              </label>
              <input
                type="range"
                min="50"
                max="1000"
                step="10"
                value={formData.max_tokens}
                onChange={(e) => handleInputChange('max_tokens', parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <button
                onClick={resetForm}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all"
              >
                {saving ? 'Saving...' : editing ? 'Update Model' : 'Create Model'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white">Token Models</h3>
          <p className="text-sm text-gray-400 mt-1">
            Create AI model presets that users can access with tokens
          </p>
        </div>
        <button
          onClick={handleNew}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-all flex items-center gap-2"
        >
          <Plus size={18} />
          New Model
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">Loading custom models...</div>
        </div>
      ) : models.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 border border-white/10 rounded-lg">
          <Sparkles className="mx-auto mb-4 text-orange-400" size={48} />
          <p className="text-gray-400">No token models yet</p>
          <p className="text-sm text-gray-500 mt-2">Create your first token model preset</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {models.map(model => (
            <div
              key={model.id}
              className="bg-gray-800 border border-white/10 rounded-lg p-4 hover:border-orange-400/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="text-white font-medium">{model.display_name}</h4>
                  <p className="text-xs text-gray-400 mt-1">{model.name}</p>
                </div>
                <div className={`px-2 py-1 rounded text-xs ${
                  model.is_active
                    ? 'bg-green-500/20 text-green-300'
                    : 'bg-gray-500/20 text-gray-300'
                }`}>
                  {model.is_active ? 'Active' : 'Inactive'}
                </div>
              </div>

              {model.description && (
                <p className="text-sm text-gray-400 mb-3 line-clamp-2">{model.description}</p>
              )}

              <div className="space-y-1 mb-3">
                <div className="text-xs text-gray-500">
                  <span className="font-medium">Provider:</span> {model.ai_provider.toUpperCase()}
                </div>
                <div className="text-xs text-gray-500">
                  <span className="font-medium">Model:</span> {model.model_id}
                </div>
                <div className="text-xs text-gray-500">
                  <span className="font-medium">Cost:</span> {model.token_cost} tokens/msg |
                  <span className="font-medium"> Temp:</span> {model.temperature}
                </div>
              </div>

              {model.tags && model.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {model.tags.map((tag, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-orange-600/20 text-orange-300 text-xs rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-3 border-t border-white/10">
                <button
                  onClick={() => handleEdit(model)}
                  className="flex-1 px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <Edit2 size={14} />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(model)}
                  className="flex-1 px-3 py-2 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 rounded transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TokenModelsPanel;
