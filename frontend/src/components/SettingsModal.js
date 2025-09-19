/**
 * Settings Modal Component
 * 
 * Handles user settings management including API keys, preferences,
 * and AI provider configuration.
 */

import React, { useState, useEffect } from 'react';
import { X, Key, Settings, Zap, Eye, EyeOff } from 'lucide-react';

const SettingsModal = ({ userSettings, onSave, onClose }) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [formData, setFormData] = useState({
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
  });
  
  const [showApiKeys, setShowApiKeys] = useState({
    openai: false,
    anthropic: false
  });
  
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  useEffect(() => {
    if (userSettings) {
      setFormData({
        apiProvider: userSettings.apiProvider || 'openai',
        apiKeys: {
          openai: userSettings.apiKeys?.openai === '***configured***' ? '' : '',
          anthropic: userSettings.apiKeys?.anthropic === '***configured***' ? '' : ''
        },
        ollamaSettings: {
          baseUrl: userSettings.ollamaSettings?.baseUrl || 'http://localhost:11434',
          model: userSettings.ollamaSettings?.model || 'llama2'
        },
        defaultScenario: userSettings.defaultScenario || 'coffee-shop',
        preferences: {
          responseDelay: userSettings.preferences?.responseDelay !== false,
          showTypingIndicator: userSettings.preferences?.showTypingIndicator !== false,
          maxCharactersInGroup: userSettings.preferences?.maxCharactersInGroup || 5
        }
      });
    }
  }, [userSettings]);

  // ============================================================================
  // FORM HANDLING
  // ============================================================================
  
  const handleInputChange = (path, value) => {
    setFormData(prev => {
      const newData = { ...prev };
      const keys = path.split('.');
      let current = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newData;
    });
    
    // Clear validation error for this field
    if (validationErrors[path]) {
      setValidationErrors(prev => ({ ...prev, [path]: null }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    // Validate based on selected provider
    if (formData.apiProvider === 'openai' && !formData.apiKeys.openai && userSettings.apiKeys?.openai !== '***configured***') {
      errors['apiKeys.openai'] = 'OpenAI API key is required';
    }
    
    if (formData.apiProvider === 'anthropic' && !formData.apiKeys.anthropic && userSettings.apiKeys?.anthropic !== '***configured***') {
      errors['apiKeys.anthropic'] = 'Anthropic API key is required';
    }
    
    if (formData.apiProvider === 'ollama') {
      if (!formData.ollamaSettings.baseUrl) {
        errors['ollamaSettings.baseUrl'] = 'Ollama base URL is required';
      }
      if (!formData.ollamaSettings.model) {
        errors['ollamaSettings.model'] = 'Ollama model is required';
      }
    }
    
    // Validate preferences
    if (formData.preferences.maxCharactersInGroup < 1 || formData.preferences.maxCharactersInGroup > 10) {
      errors['preferences.maxCharactersInGroup'] = 'Max characters must be between 1 and 10';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setSaving(true);
    
    try {
      // Only send API keys if they were actually changed (not empty)
      const updates = {
        apiProvider: formData.apiProvider,
        ollamaSettings: formData.ollamaSettings,
        defaultScenario: formData.defaultScenario,
        preferences: formData.preferences
      };
      
      // Add API keys only if they were entered
      if (formData.apiKeys.openai) {
        updates.apiKeys = { ...updates.apiKeys, openai: formData.apiKeys.openai };
      }
      if (formData.apiKeys.anthropic) {
        updates.apiKeys = { ...updates.apiKeys, anthropic: formData.apiKeys.anthropic };
      }
      
      const success = await onSave(updates);
      if (success) {
        onClose();
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleApiKeyVisibility = (provider) => {
    setShowApiKeys(prev => ({
      ...prev,
      [provider]: !prev[provider]
    }));
  };

  const getFieldError = (path) => {
    return validationErrors[path];
  };

  const isConfigured = (provider) => {
    return userSettings.apiKeys?.[provider] === '***configured***';
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Settings className="text-purple-400" size={24} />
            <h2 className="text-xl font-bold text-white">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* AI Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              <Zap size={16} className="inline mr-2" />
              AI Provider
            </label>
            <select
              value={formData.apiProvider}
              onChange={(e) => handleInputChange('apiProvider', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-purple-400"
            >
              <option value="openai" className="bg-gray-800">OpenAI GPT-3.5</option>
              <option value="anthropic" className="bg-gray-800">Anthropic Claude</option>
              <option value="ollama" className="bg-gray-800">Ollama (Local)</option>
            </select>
          </div>

          {/* API Keys Section */}
          {(formData.apiProvider === 'openai' || formData.apiProvider === 'anthropic') && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                <Key size={16} className="inline mr-2" />
                API Keys
              </label>
              
              {formData.apiProvider === 'openai' && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">OpenAI API Key</span>
                    {isConfigured('openai') && (
                      <span className="text-xs text-green-400 bg-green-400/20 px-2 py-1 rounded">
                        ✓ Configured
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showApiKeys.openai ? "text" : "password"}
                      value={formData.apiKeys.openai}
                      onChange={(e) => handleInputChange('apiKeys.openai', e.target.value)}
                      placeholder={isConfigured('openai') ? "Enter new key to update..." : "sk-..."}
                      className={`w-full bg-white/5 border rounded-lg p-3 pr-10 text-white placeholder-gray-500 focus:outline-none ${
                        getFieldError('apiKeys.openai') ? 'border-red-400' : 'border-white/10 focus:border-purple-400'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => toggleApiKeyVisibility('openai')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showApiKeys.openai ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {getFieldError('apiKeys.openai') && (
                    <p className="text-red-400 text-xs mt-1">{getFieldError('apiKeys.openai')}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Get your API key from{' '}
                    <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" 
                       className="text-purple-400 hover:underline">
                      OpenAI Platform
                    </a>
                  </p>
                </div>
              )}

              {formData.apiProvider === 'anthropic' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Anthropic API Key</span>
                    {isConfigured('anthropic') && (
                      <span className="text-xs text-green-400 bg-green-400/20 px-2 py-1 rounded">
                        ✓ Configured
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showApiKeys.anthropic ? "text" : "password"}
                      value={formData.apiKeys.anthropic}
                      onChange={(e) => handleInputChange('apiKeys.anthropic', e.target.value)}
                      placeholder={isConfigured('anthropic') ? "Enter new key to update..." : "ant-api03-..."}
                      className={`w-full bg-white/5 border rounded-lg p-3 pr-10 text-white placeholder-gray-500 focus:outline-none ${
                        getFieldError('apiKeys.anthropic') ? 'border-red-400' : 'border-white/10 focus:border-purple-400'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => toggleApiKeyVisibility('anthropic')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showApiKeys.anthropic ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {getFieldError('apiKeys.anthropic') && (
                    <p className="text-red-400 text-xs mt-1">{getFieldError('apiKeys.anthropic')}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Get your API key from{' '}
                    <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" 
                       className="text-purple-400 hover:underline">
                      Anthropic Console
                    </a>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Ollama Settings */}
          {formData.apiProvider === 'ollama' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Ollama Configuration
              </label>
              
              <div className="space-y-4">
                <div>
                  <span className="text-sm text-gray-400 mb-2 block">Base URL</span>
                  <input
                    type="text"
                    value={formData.ollamaSettings.baseUrl}
                    onChange={(e) => handleInputChange('ollamaSettings.baseUrl', e.target.value)}
                    placeholder="http://localhost:11434"
                    className={`w-full bg-white/5 border rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none ${
                      getFieldError('ollamaSettings.baseUrl') ? 'border-red-400' : 'border-white/10 focus:border-purple-400'
                    }`}
                  />
                  {getFieldError('ollamaSettings.baseUrl') && (
                    <p className="text-red-400 text-xs mt-1">{getFieldError('ollamaSettings.baseUrl')}</p>
                  )}
                </div>
                
                <div>
                  <span className="text-sm text-gray-400 mb-2 block">Model</span>
                  <input
                    type="text"
                    value={formData.ollamaSettings.model}
                    onChange={(e) => handleInputChange('ollamaSettings.model', e.target.value)}
                    placeholder="llama2, codellama, etc."
                    className={`w-full bg-white/5 border rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none ${
                      getFieldError('ollamaSettings.model') ? 'border-red-400' : 'border-white/10 focus:border-purple-400'
                    }`}
                  />
                  {getFieldError('ollamaSettings.model') && (
                    <p className="text-red-400 text-xs mt-1">{getFieldError('ollamaSettings.model')}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Make sure the model is downloaded: <code className="bg-white/10 px-1 rounded">ollama pull {formData.ollamaSettings.model}</code>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Default Scenario */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Default Scenario
            </label>
            <select
              value={formData.defaultScenario}
              onChange={(e) => handleInputChange('defaultScenario', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-purple-400"
            >
              <option value="coffee-shop" className="bg-gray-800">Coffee Shop Hangout</option>
              <option value="study-group" className="bg-gray-800">Study Session</option>
              <option value="party" className="bg-gray-800">House Party</option>
            </select>
          </div>

          {/* Preferences */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Preferences
            </label>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-white">Response Delays</span>
                  <p className="text-xs text-gray-400">Add realistic delays between character responses</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.preferences.responseDelay}
                    onChange={(e) => handleInputChange('preferences.responseDelay', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-white">Typing Indicator</span>
                  <p className="text-xs text-gray-400">Show when characters are thinking</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.preferences.showTypingIndicator}
                    onChange={(e) => handleInputChange('preferences.showTypingIndicator', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white">Max Characters in Group</span>
                  <span className="text-sm text-purple-400">{formData.preferences.maxCharactersInGroup}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={formData.preferences.maxCharactersInGroup}
                  onChange={(e) => handleInputChange('preferences.maxCharactersInGroup', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                />
                {getFieldError('preferences.maxCharactersInGroup') && (
                  <p className="text-red-400 text-xs mt-1">{getFieldError('preferences.maxCharactersInGroup')}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;