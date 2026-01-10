// ============================================================================
// CHAIT World - Enhanced Settings Modal (v1.5)
// Supports multiple AI providers with API key management
// ============================================================================

import React, { useState, useEffect } from 'react';
import { X, Settings, Key, Zap, CheckCircle, AlertCircle, Eye, EyeOff, Loader, Shield } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const SettingsModalV15 = ({ user, settings, onSave, onClose, fullScreen = false }) => {
  
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [formData, setFormData] = useState({
    // API Keys
    openaiKey: '',
    anthropicKey: '',
    openrouterKey: '',
    googleKey: '',

    // Admin API Keys (for token models)
    adminOpenaiKey: '',
    adminAnthropicKey: '',
    adminGoogleKey: '',
    adminOpenrouterKey: '',

    // Ollama settings
    ollamaUrl: 'http://localhost:11434',
    ollamaTestModel: 'llama2',

    // LM Studio settings
    lmStudioUrl: 'http://127.0.0.1:1234',
    lmStudioTestModel: 'local-model',

    // Group dynamics
    groupDynamicsMode: 'natural',

    // Display preferences
    messageDelay: 1200,
    defaultModel: '',
    defaultProvider: 'token',

    // Admin settings
    autoApproveCharacters: false,
    adminSystemPrompt: ''
  });
  
  // UI state
  const [showKeys, setShowKeys] = useState({
    openai: false,
    anthropic: false,
    openrouter: false,
    google: false,
    adminOpenai: false,
    adminAnthropic: false,
    adminGoogle: false,
    adminOpenrouter: false
  });
  
  const [testingKey, setTestingKey] = useState(null);
  const [keyStatus, setKeyStatus] = useState({
    openai: null,
    anthropic: null,
    openrouter: null,
    google: null,
    ollama: null,
    lmstudio: null
  });
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // Model selection state
  const [availableModels, setAvailableModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('token');
  
  // Track which admin keys are saved
  const [hasSavedAdminKeys, setHasSavedAdminKeys] = useState({
    openai: false,
    anthropic: false,
    google: false,
    openrouter: false
  });
  
  // ============================================================================
  // INITIALIZE FROM SETTINGS
  // ============================================================================
  
  useEffect(() => {
    if (settings) {
      const savedProvider = settings.defaultProvider || 'token';
      
      setFormData({
        openaiKey: settings.apiKeys?.openai || '',
        anthropicKey: settings.apiKeys?.anthropic || '',
        openrouterKey: settings.apiKeys?.openrouter || '',
        googleKey: settings.apiKeys?.google || '',
        adminOpenaiKey: '',
        adminAnthropicKey: '',
        adminGoogleKey: '',
        adminOpenrouterKey: '',
        ollamaUrl: settings.ollamaSettings?.baseUrl || 'http://localhost:11434',
        ollamaTestModel: settings.ollamaSettings?.testModel || 'llama2',
        lmStudioUrl: settings.lmStudioSettings?.baseUrl || 'http://127.0.0.1:1234',
        lmStudioTestModel: settings.lmStudioSettings?.testModel || 'local-model',
        groupDynamicsMode: settings.groupDynamicsMode || 'natural',
        messageDelay: settings.messageDelay || 1200,
        defaultModel: settings.defaultModel || '',
        defaultProvider: savedProvider,
        autoApproveCharacters: settings.autoApproveCharacters || false,
        adminSystemPrompt: settings.adminSystemPrompt || ''
      });
      
      // Set selected provider from saved settings
      setSelectedProvider(savedProvider);
      
      // Load admin API keys if user is admin
      if (settings.isAdmin) {
        loadAdminKeys();
      }
      
      // Load models for default model selection
      loadAvailableModels(savedProvider);
    }
  }, [settings]);
  
  // ============================================================================
  // LOAD AVAILABLE MODELS
  // ============================================================================
  
  const loadAvailableModels = async (provider) => {
    if (!settings) return;
    
    setLoadingModels(true);
    setAvailableModels([]);
    
    try {
      // Handle token models
      if (provider === 'token') {
        const response = await fetch(`${API_BASE_URL}/api/token-models`, {
          headers: { 'user-id': user.id }
        });
        const data = await response.json();
        if (data.models && data.models.length > 0) {
          const formattedModels = data.models.map(m => ({
            id: m.id,
            name: `${m.display_name} (${m.token_cost} tokens)`
          }));
          setAvailableModels(formattedModels);
        }
        setLoadingModels(false);
        return;
      }
      
      let apiKey = null;
      
      if (settings.apiKeys) {
        switch (provider) {
          case 'openai':
            apiKey = settings.apiKeys.openai;
            break;
          case 'anthropic':
            apiKey = settings.apiKeys.anthropic;
            break;
          case 'google':
            apiKey = settings.apiKeys.google;
            break;
          case 'openrouter':
            apiKey = settings.apiKeys.openrouter;
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
          ollamaSettings: settings.ollamaSettings,
          lmStudioSettings: settings.lmStudioSettings
        })
      });
      
      const data = await response.json();
      
      if (data.models && data.models.length > 0) {
        setAvailableModels(data.models);
      }
    } catch (err) {
      console.error('Error loading models:', err);
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
    
    // Clear status when user edits key
    if (field.endsWith('Key')) {
      const provider = field.replace('Key', '');
      setKeyStatus(prev => ({ ...prev, [provider]: null }));
    }
  };
  
  const toggleShowKey = (provider) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };
  
  // ============================================================================
  // API KEY TESTING
  // ============================================================================
  
  const testApiKey = async (provider) => {
    setTestingKey(provider);
    setKeyStatus(prev => ({ ...prev, [provider]: null }));
    setError(null);
    
    try {
      let apiKey;
      let ollamaSettings = null;
      
      // Get the appropriate API key
      switch (provider) {
        case 'openai':
          apiKey = formData.openaiKey;
          break;
        case 'anthropic':
          apiKey = formData.anthropicKey;
          break;
        case 'openrouter':
          apiKey = formData.openrouterKey;
          break;
        case 'google':
          apiKey = formData.googleKey;
          break;
        case 'ollama':
          ollamaSettings = { baseUrl: formData.ollamaUrl };
          break;
        default:
          throw new Error('Unknown provider');
      }
      
      // Validate key exists (except for Ollama)
      if (provider !== 'ollama' && !apiKey) {
        setKeyStatus(prev => ({
          ...prev,
          [provider]: { success: false, message: 'API key is required' }
        }));
        setTestingKey(null);
        return;
      }
      
      // Test the key
      const requestBody = {
        provider,
        apiKey,
        ollamaSettings
      };

      // For Ollama and LM Studio, send the user-specified model to test
      if (provider === 'ollama') {
        requestBody.model = formData.ollamaTestModel || 'llama2';
      } else if (provider === 'lmstudio') {
        requestBody.model = formData.lmStudioTestModel || 'local-model';
      }

      const response = await fetch(`${API_BASE_URL}/api/providers/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': user.id
        },
        body: JSON.stringify(requestBody)
      });
      
      const result = await response.json();
      
      setKeyStatus(prev => ({ ...prev, [provider]: result }));
      
      if (result.success) {
        setSuccessMessage(`${provider.toUpperCase()} connection successful!`);
        setTimeout(() => setSuccessMessage(null), 3000);
      }
      
    } catch (err) {
      console.error('Error testing API key:', err);
      setKeyStatus(prev => ({
        ...prev,
        [provider]: {
          success: false,
          message: 'Failed to test connection. Check your network and try again.'
        }
      }));
    } finally {
      setTestingKey(null);
    }
  };
  
  // ============================================================================
  // ADMIN API KEYS MANAGEMENT
  // ============================================================================
  
  const loadAdminKeys = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin-keys`, {
        headers: { 'user-id': user.id }
      });
      const data = await response.json();
      
      if (data.keys) {
        // Store which keys are saved
        setHasSavedAdminKeys({
          openai: !!data.hasKeys?.openai,
          anthropic: !!data.hasKeys?.anthropic,
          google: !!data.hasKeys?.google,
          openrouter: !!data.hasKeys?.openrouter
        });
        
        // Keys are masked from server, we'll only show masked versions
        // When user types a new key, it will replace the masked one
        setFormData(prev => ({
          ...prev,
          adminOpenaiKey: data.keys.openai || '',
          adminAnthropicKey: data.keys.anthropic || '',
          adminGoogleKey: data.keys.google || '',
          adminOpenrouterKey: data.keys.openrouter || ''
        }));
      }
    } catch (error) {
      console.error('Failed to load admin keys:', error);
    }
  };
  
  const testAdminKey = async (provider) => {
    const keyMap = {
      openai: formData.adminOpenaiKey,
      anthropic: formData.adminAnthropicKey,
      google: formData.adminGoogleKey,
      openrouter: formData.adminOpenrouterKey
    };
    
    const apiKey = keyMap[provider];
    
    if (!apiKey || apiKey.includes('...')) {
      setError('Please enter a valid API key first');
      return;
    }
    
    setTestingKey(`admin-${provider}`);
    setKeyStatus(prev => ({ ...prev, [`admin-${provider}`]: null }));
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/providers/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': user.id
        },
        body: JSON.stringify({ provider, apiKey })
      });
      
      const result = await response.json();
      setKeyStatus(prev => ({ ...prev, [`admin-${provider}`]: result }));
      
      if (result.success) {
        setSuccessMessage(`Admin ${provider.toUpperCase()} key verified!`);
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      setKeyStatus(prev => ({ 
        ...prev, 
        [`admin-${provider}`]: { success: false, error: err.message }
      }));
    } finally {
      setTestingKey(null);
    }
  };
  
  const saveAdminKeys = async () => {
    try {
      const keysToSave = {};
      
      // Only send keys that look like full keys (not masked)
      if (formData.adminOpenaiKey && !formData.adminOpenaiKey.includes('...')) {
        keysToSave.openai_key = formData.adminOpenaiKey;
      }
      if (formData.adminAnthropicKey && !formData.adminAnthropicKey.includes('...')) {
        keysToSave.anthropic_key = formData.adminAnthropicKey;
      }
      if (formData.adminGoogleKey && !formData.adminGoogleKey.includes('...')) {
        keysToSave.google_key = formData.adminGoogleKey;
      }
      if (formData.adminOpenrouterKey && !formData.adminOpenrouterKey.includes('...')) {
        keysToSave.openrouter_key = formData.adminOpenrouterKey;
      }
      
      if (Object.keys(keysToSave).length === 0) {
        return; // No new keys to save
      }
      
      await fetch(`${API_BASE_URL}/api/admin-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': user.id
        },
        body: JSON.stringify(keysToSave)
      });
      
    } catch (error) {
      console.error('Failed to save admin keys:', error);
      throw error;
    }
  };
  
  // ============================================================================
  // SAVE SETTINGS
  // ============================================================================
  
  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const newSettings = {
        apiKeys: {
          openai: formData.openaiKey,
          anthropic: formData.anthropicKey,
          openrouter: formData.openrouterKey,
          google: formData.googleKey
        },
        ollamaSettings: {
          baseUrl: formData.ollamaUrl
        },
        lmStudioSettings: {
          baseUrl: formData.lmStudioUrl
        },
        groupDynamicsMode: formData.groupDynamicsMode,
        messageDelay: formData.messageDelay,
        defaultModel: formData.defaultModel,
        defaultProvider: selectedProvider,
        autoApproveCharacters: formData.autoApproveCharacters,
        adminSystemPrompt: formData.adminSystemPrompt
      };

      await onSave(newSettings);
      
      // Save admin API keys if user is admin
      if (settings.isAdmin) {
        await saveAdminKeys();
      }
      
      setSuccessMessage('Settings saved successfully!');
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1500);
      
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  
  const renderKeyInput = (provider, label, placeholder) => {
    const keyField = `${provider}Key`;
    const status = keyStatus[provider];
    const isTesting = testingKey === provider;
    
    return (
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-300">{label}</label>
          {status && (
            <span className={`text-xs px-2 py-1 rounded ${
              status.success 
                ? 'text-green-400 bg-green-400/20' 
                : 'text-red-400 bg-red-400/20'
            }`}>
              {status.success ? '✓ Valid' : '✗ Invalid'}
            </span>
          )}
        </div>
        
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type={showKeys[provider] ? 'text' : 'password'}
              value={formData[keyField]}
              onChange={(e) => handleInputChange(keyField, e.target.value)}
              placeholder={placeholder}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 pr-10 text-white placeholder-gray-500 focus:outline-none focus:border-red-400"
            />
            <button
              onClick={() => toggleShowKey(provider)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              {showKeys[provider] ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          
          <button
            onClick={() => testApiKey(provider)}
            disabled={isTesting || !formData[keyField]}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isTesting ? (
              <>
                <Loader size={16} className="animate-spin" />
                Testing...
              </>
            ) : (
              'Test'
            )}
          </button>
        </div>
        
        {status && !status.success && (
          <p className="text-xs text-red-400 mt-1">{status.message}</p>
        )}
      </div>
    );
  };
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <div className={fullScreen 
      ? "h-full bg-gray-900 overflow-y-auto" 
      : "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    }>
      <div className={fullScreen 
        ? "h-full" 
        : "bg-gray-900 rounded-2xl border border-white/10 w-full max-w-3xl max-h-[90vh] overflow-y-auto"
      }>
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 sticky top-0 bg-gray-900 z-10">
          <div className="flex items-center gap-3">
            <Settings className="text-red-500" size={24} />
            <h2 className="text-xl font-bold text-white">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mx-6 mt-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg flex items-center gap-2 text-green-400">
            <CheckCircle size={16} />
            <span className="text-sm">{successMessage}</span>
          </div>
        )}
        
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400">
            <AlertCircle size={16} />
            <span className="text-sm">{error}</span>
          </div>
        )}
        
        {/* Content */}
        <div className="p-6 space-y-8">
          
          {/* Group Chat Settings - Moved to top */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Zap size={18} className="text-red-500" />
              Group Chat Settings
            </h3>
            
            <div className="space-y-4">
              {/* Default Model */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Default Character Model
                </label>
                <p className="text-xs text-gray-400 mb-2">
                  This model will be pre-selected when creating new characters.
                </p>
                
                {/* Provider Selector */}
                <div className="flex gap-2 mb-2">
                  <select
                    value={selectedProvider}
                    onChange={(e) => {
                      const newProvider = e.target.value;
                      setSelectedProvider(newProvider);
                      setFormData(prev => ({ ...prev, defaultModel: '' }));
                      loadAvailableModels(newProvider);
                    }}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-400"
                  >
                    <option value="token">Token Models (Recommended)</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="google">Google AI</option>
                    <option value="openrouter">OpenRouter</option>
                    <option value="local">Local (Ollama/LM Studio)</option>
                  </select>
                </div>
                
                {/* Model Dropdown */}
                <select
                  value={formData.defaultModel}
                  onChange={(e) => handleInputChange('defaultModel', e.target.value)}
                  disabled={loadingModels || availableModels.length === 0}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-400 disabled:opacity-50"
                >
                  <option value="">Select a model...</option>
                  {availableModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
                
                {loadingModels && (
                  <p className="text-xs text-gray-500 mt-1">Loading models...</p>
                )}
                
                {!loadingModels && availableModels.length === 0 && (
                  <p className="text-xs text-yellow-400 mt-1">
                    {selectedProvider === 'token' 
                      ? 'No token models available. Contact admin or create token models in Admin Panel.'
                      : `Configure your ${selectedProvider} API key below to see available models.`
                    }
                  </p>
                )}
              </div>

              {/* Message Delay */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Message Delay: {formData.messageDelay}ms
                </label>
                <input
                  type="range"
                  min="0"
                  max="3000"
                  step="100"
                  value={formData.messageDelay}
                  onChange={(e) => handleInputChange('messageDelay', parseInt(e.target.value))}
                  className="w-full accent-red-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Delay between character responses for realistic pacing
                </p>
              </div>
            </div>
          </div>
          
          {/* AI Provider Keys Section */}
          <div className="pt-6 border-t border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Key size={18} className="text-red-500" />
              AI Provider API Keys
            </h3>
            
            <p className="text-sm text-gray-400 mb-4">
              Configure your API keys for different AI providers. Each character can use a different provider.
            </p>
            
            <div className="space-y-4">
              {renderKeyInput('openai', 'OpenAI API Key', 'sk-...')}
              {renderKeyInput('anthropic', 'Anthropic API Key', 'sk-ant-...')}
              {renderKeyInput('openrouter', 'OpenRouter API Key', 'sk-or-...')}
              {renderKeyInput('google', 'Google API Key', 'AIza...')}
              
              {/* Ollama Settings */}
              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-300">
                    Ollama (Local Models)
                  </label>
                  {keyStatus.ollama && (
                    <span className={`text-xs px-2 py-1 rounded ${
                      keyStatus.ollama.success
                        ? 'text-green-400 bg-green-400/20'
                        : 'text-red-400 bg-red-400/20'
                    }`}>
                      {keyStatus.ollama.success ? '✓ Connected' : '✗ Offline'}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-gray-400 mb-1 block">Server URL</label>
                      <input
                        type="text"
                        value={formData.ollamaUrl}
                        onChange={(e) => handleInputChange('ollamaUrl', e.target.value)}
                        placeholder="http://localhost:11434"
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-400"
                      />
                    </div>

                    <div className="flex-1">
                      <label className="text-xs text-gray-400 mb-1 block">Model to Test</label>
                      <input
                        type="text"
                        value={formData.ollamaTestModel}
                        onChange={(e) => handleInputChange('ollamaTestModel', e.target.value)}
                        placeholder="llama2"
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-400"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => testApiKey('ollama')}
                    disabled={testingKey === 'ollama'}
                    className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {testingKey === 'ollama' ? (
                      <>
                        <Loader size={16} className="animate-spin" />
                        Testing connection to {formData.ollamaTestModel}...
                      </>
                    ) : (
                      'Test Connection'
                    )}
                  </button>
                </div>

                <p className="text-xs text-gray-500 mt-2">
                  Run models locally with Ollama. <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:underline">Learn more</a>
                </p>
              </div>

              {/* LM Studio Settings */}
              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-300">
                    LM Studio (Local Models)
                  </label>
                  {keyStatus.lmstudio && (
                    <span className={`text-xs px-2 py-1 rounded ${
                      keyStatus.lmstudio.success
                        ? 'text-green-400 bg-green-400/20'
                        : 'text-red-400 bg-red-400/20'
                    }`}>
                      {keyStatus.lmstudio.success ? '✓ Connected' : '✗ Offline'}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-gray-400 mb-1 block">Server URL</label>
                      <input
                        type="text"
                        value={formData.lmStudioUrl}
                        onChange={(e) => handleInputChange('lmStudioUrl', e.target.value)}
                        placeholder="http://127.0.0.1:1234"
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-400"
                      />
                    </div>

                    <div className="flex-1">
                      <label className="text-xs text-gray-400 mb-1 block">Model to Test</label>
                      <input
                        type="text"
                        value={formData.lmStudioTestModel}
                        onChange={(e) => handleInputChange('lmStudioTestModel', e.target.value)}
                        placeholder="local-model"
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-400"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => testApiKey('lmstudio')}
                    disabled={testingKey === 'lmstudio'}
                    className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {testingKey === 'lmstudio' ? (
                      <>
                        <Loader size={16} className="animate-spin" />
                        Testing connection to {formData.lmStudioTestModel}...
                      </>
                    ) : (
                      'Test Connection'
                    )}
                  </button>
                </div>

                <p className="text-xs text-gray-500 mt-2">
                  Run models locally with LM Studio. Change to network IP if accessing from another device. <a href="https://lmstudio.ai" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:underline">Learn more</a>
                </p>
              </div>
            </div>
          </div>
          
          {/* Admin Settings - Only show if user is admin */}
          {settings.isAdmin && (
            <div className="pt-6 border-t border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Shield size={18} className="text-purple-500" />
                Admin Settings
              </h3>

              <div className="space-y-6">
                {/* Admin API Keys Section */}
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-purple-400 mb-2 flex items-center gap-2">
                    <Key size={16} />
                    Admin API Keys for Token Models
                  </h4>
                  <p className="text-xs text-gray-400 mb-4">
                    These API keys are used when users chat with token models. Your keys, their tokens.
                  </p>

                  <div className="space-y-3">
                    {/* OpenAI Admin Key */}
                    <div>
                      <label className="text-xs font-medium text-gray-300 mb-1.5 flex items-center justify-between">
                        <span>OpenAI API Key</span>
                        {hasSavedAdminKeys.openai && (
                          <span className="text-green-400 text-xs flex items-center gap-1">
                            <CheckCircle size={12} />
                            Saved
                          </span>
                        )}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type={showKeys.adminOpenai ? 'text' : 'password'}
                          value={formData.adminOpenaiKey}
                          onChange={(e) => handleInputChange('adminOpenaiKey', e.target.value)}
                          placeholder="sk-proj-..."
                          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-400"
                        />
                        <button
                          onClick={() => toggleShowKey('adminOpenai')}
                          className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                        >
                          {showKeys.adminOpenai ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button
                          onClick={() => testAdminKey('openai')}
                          disabled={testingKey === 'admin-openai'}
                          className="px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 rounded-lg transition-colors text-sm disabled:opacity-50"
                        >
                          {testingKey === 'admin-openai' ? <Loader size={16} className="animate-spin" /> : 'Test'}
                        </button>
                      </div>
                      {keyStatus['admin-openai'] && (
                        <div className={`flex items-center gap-2 mt-1 text-xs ${
                          keyStatus['admin-openai'].success ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {keyStatus['admin-openai'].success ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                          {keyStatus['admin-openai'].success ? 'Valid' : keyStatus['admin-openai'].error}
                        </div>
                      )}
                    </div>

                    {/* Anthropic Admin Key */}
                    <div>
                      <label className="text-xs font-medium text-gray-300 mb-1.5 flex items-center justify-between">
                        <span>Anthropic API Key</span>
                        {hasSavedAdminKeys.anthropic && (
                          <span className="text-green-400 text-xs flex items-center gap-1">
                            <CheckCircle size={12} />
                            Saved
                          </span>
                        )}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type={showKeys.adminAnthropic ? 'text' : 'password'}
                          value={formData.adminAnthropicKey}
                          onChange={(e) => handleInputChange('adminAnthropicKey', e.target.value)}
                          placeholder="sk-ant-..."
                          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-400"
                        />
                        <button
                          onClick={() => toggleShowKey('adminAnthropic')}
                          className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                        >
                          {showKeys.adminAnthropic ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button
                          onClick={() => testAdminKey('anthropic')}
                          disabled={testingKey === 'admin-anthropic'}
                          className="px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 rounded-lg transition-colors text-sm disabled:opacity-50"
                        >
                          {testingKey === 'admin-anthropic' ? <Loader size={16} className="animate-spin" /> : 'Test'}
                        </button>
                      </div>
                      {keyStatus['admin-anthropic'] && (
                        <div className={`flex items-center gap-2 mt-1 text-xs ${
                          keyStatus['admin-anthropic'].success ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {keyStatus['admin-anthropic'].success ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                          {keyStatus['admin-anthropic'].success ? 'Valid' : keyStatus['admin-anthropic'].error}
                        </div>
                      )}
                    </div>

                    {/* Google Admin Key */}
                    <div>
                      <label className="text-xs font-medium text-gray-300 mb-1.5 flex items-center justify-between">
                        <span>Google AI API Key</span>
                        {hasSavedAdminKeys.google && (
                          <span className="text-green-400 text-xs flex items-center gap-1">
                            <CheckCircle size={12} />
                            Saved
                          </span>
                        )}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type={showKeys.adminGoogle ? 'text' : 'password'}
                          value={formData.adminGoogleKey}
                          onChange={(e) => handleInputChange('adminGoogleKey', e.target.value)}
                          placeholder="AIza..."
                          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-400"
                        />
                        <button
                          onClick={() => toggleShowKey('adminGoogle')}
                          className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                        >
                          {showKeys.adminGoogle ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button
                          onClick={() => testAdminKey('google')}
                          disabled={testingKey === 'admin-google'}
                          className="px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 rounded-lg transition-colors text-sm disabled:opacity-50"
                        >
                          {testingKey === 'admin-google' ? <Loader size={16} className="animate-spin" /> : 'Test'}
                        </button>
                      </div>
                      {keyStatus['admin-google'] && (
                        <div className={`flex items-center gap-2 mt-1 text-xs ${
                          keyStatus['admin-google'].success ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {keyStatus['admin-google'].success ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                          {keyStatus['admin-google'].success ? 'Valid' : keyStatus['admin-google'].error}
                        </div>
                      )}
                    </div>

                    {/* OpenRouter Admin Key */}
                    <div>
                      <label className="text-xs font-medium text-gray-300 mb-1.5 flex items-center justify-between">
                        <span>OpenRouter API Key</span>
                        {hasSavedAdminKeys.openrouter && (
                          <span className="text-green-400 text-xs flex items-center gap-1">
                            <CheckCircle size={12} />
                            Saved
                          </span>
                        )}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type={showKeys.adminOpenrouter ? 'text' : 'password'}
                          value={formData.adminOpenrouterKey}
                          onChange={(e) => handleInputChange('adminOpenrouterKey', e.target.value)}
                          placeholder="sk-or-..."
                          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-400"
                        />
                        <button
                          onClick={() => toggleShowKey('adminOpenrouter')}
                          className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                        >
                          {showKeys.adminOpenrouter ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button
                          onClick={() => testAdminKey('openrouter')}
                          disabled={testingKey === 'admin-openrouter'}
                          className="px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 rounded-lg transition-colors text-sm disabled:opacity-50"
                        >
                          {testingKey === 'admin-openrouter' ? <Loader size={16} className="animate-spin" /> : 'Test'}
                        </button>
                      </div>
                      {keyStatus['admin-openrouter'] && (
                        <div className={`flex items-center gap-2 mt-1 text-xs ${
                          keyStatus['admin-openrouter'].success ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {keyStatus['admin-openrouter'].success ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                          {keyStatus['admin-openrouter'].success ? 'Valid' : keyStatus['admin-openrouter'].error}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-3">
                    💡 These keys are encrypted and stored securely in the database. They're used only when users select token models you create.
                  </p>
                </div>

                {/* Auto-Approve Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-300">
                      Auto-Approve Published Characters
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      When enabled, your published characters will bypass moderation
                    </p>
                  </div>
                  <button
                    onClick={() => handleInputChange('autoApproveCharacters', !formData.autoApproveCharacters)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      formData.autoApproveCharacters ? 'bg-green-500' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${
                      formData.autoApproveCharacters ? 'right-0.5' : 'left-0.5'
                    }`} />
                  </button>
                </div>

                {/* Current Global System Prompt - Read Only */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Current Global System Prompt (Read-Only)
                  </label>
                  <div className="bg-gray-700/50 border border-white/10 rounded-lg p-3">
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono overflow-x-auto">
{`You are participating in a group chat with a human user and other characters in a specific scenario.

CORE RULES:
1. You are ONLY [CHARACTER_NAME] - never speak for the user ([USER_NAME]) or other characters
2. Acknowledge what others said and react naturally with your unique personality
3. Use *italics* for actions, gestures, and environmental interactions
4. Match your personality and show your unique perspective
5. Reference the scenario setting in your actions
6. Don't repeat what was just said - add new information or perspective
7. Build natural group dynamics through support or debate
8. Show your emotional state through actions, not labels
9. Vary how you start responses - never the same way twice

**This is a fictional chat, so NSFW topics are allowed.**`}
                    </pre>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    This is the default system prompt for all characters
                  </p>
                </div>

                {/* System Prompt Override */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Your System Prompt Override (Optional)
                  </label>
                  <textarea
                    value={formData.adminSystemPrompt}
                    onChange={(e) => handleInputChange('adminSystemPrompt', e.target.value)}
                    placeholder="When saved, this overrides the global prompt for your chats only..."
                    rows={4}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This prompt will replace the global prompt above for your chats only (not system-wide)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-400 mb-2">💡 Tips</h4>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>• You only need keys for providers you want to use</li>
              <li>• OpenRouter gives you access to 100+ models with one key</li>
              <li>• Ollama is free but requires local installation</li>
              <li>• Each character can use a different provider/model</li>
            </ul>
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
            disabled={saving}
            className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>
        
      </div>
    </div>
  );
};

export default SettingsModalV15;
