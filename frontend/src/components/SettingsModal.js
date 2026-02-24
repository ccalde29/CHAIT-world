// ============================================================================
// CHAIT World - Enhanced Settings Modal (v1.5)
// Supports multiple AI providers with API key management
// ============================================================================

import React, { useState, useEffect } from 'react';
import { X, Settings, Key, Zap, CheckCircle, AlertCircle, Eye, EyeOff, Loader, Cpu } from 'lucide-react';
import ModelManager from './ModelManager';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const TABS = [
  { id: 'api-keys',      label: 'API Keys',      icon: Key },
  { id: 'model-manager', label: 'Model Manager', icon: Cpu },
  { id: 'group-chat',    label: 'Group Chat',    icon: Zap },
];

const SettingsModalV15 = ({ user, settings, onSave, onClose, fullScreen = false, apiRequest }) => {
  
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [formData, setFormData] = useState({
    // API Keys
    openaiKey: '',
    anthropicKey: '',
    openrouterKey: '',
    googleKey: '',

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
    defaultProvider: 'openai',

    // Admin settings
    autoApproveCharacters: false,
    adminSystemPrompt: ''
  });
  
  // UI state
  const [showKeys, setShowKeys] = useState({
    openai: false,
    anthropic: false,
    openrouter: false,
    google: false
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
  const [activeTab, setActiveTab] = useState('api-keys');
  
  // Model selection state
  const [availableModels, setAvailableModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('openai');
  
  // ============================================================================
  // INITIALIZE FROM SETTINGS
  // ============================================================================
  
  useEffect(() => {
    if (settings) {
      const savedProvider = (settings.defaultProvider && settings.defaultProvider !== 'token')
        ? settings.defaultProvider
        : 'openai';
      
      setFormData({
        openaiKey: settings.apiKeys?.openai || '',
        anthropicKey: settings.apiKeys?.anthropic || '',
        openrouterKey: settings.apiKeys?.openrouter || '',
        googleKey: settings.apiKeys?.google || '',
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
                : 'text-orange-400 bg-red-400/20'
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
          <p className="text-xs text-orange-400 mt-1">{status.message}</p>
        )}
      </div>
    );
  };
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <div className={fullScreen 
      ? "h-full bg-gray-900 flex flex-col" 
      : "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    }>
      <div className={fullScreen 
        ? "flex flex-col h-full overflow-hidden" 
        : "bg-gray-900 rounded-2xl border border-white/10 w-full max-w-3xl max-h-[90vh] overflow-y-auto"
      }>
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gray-900 shrink-0">
          <div className="flex items-center gap-3">
            <Settings className="text-orange-500" size={24} />
            <h2 className="text-xl font-bold text-white">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-white/10 px-6 bg-gray-900 shrink-0">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>
        
        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mx-6 mt-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg flex items-center gap-2 text-green-400">
            <CheckCircle size={16} />
            <span className="text-sm">{successMessage}</span>
          </div>
        )}
        
        {error && (
          <div className="mx-6 mt-4 p-3 bg-orange-600/20 border border-red-500/30 rounded-lg flex items-center gap-2 text-orange-400">
            <AlertCircle size={16} />
            <span className="text-sm">{error}</span>
          </div>
        )}
        
        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">

          {/* ── API Keys tab ─────────────────────────────────────────────── */}
          {activeTab === 'api-keys' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                  <Key size={18} className="text-orange-500" />
                  AI Provider API Keys
                </h3>
                <p className="text-sm text-gray-400">
                  Configure your API keys for different AI providers. Each character can use a different provider.
                </p>
              </div>

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
                        : 'text-orange-400 bg-red-400/20'
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
                  Run models locally with Ollama. <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">Learn more</a>
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
                        : 'text-orange-400 bg-red-400/20'
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
                  Run models locally with LM Studio. Change to network IP if accessing from another device. <a href="https://lmstudio.ai" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">Learn more</a>
                </p>
              </div>
              </div>

              {/* Tips */}
              <div className="p-4 bg-orange-600/10 border border-orange-500/20 rounded-lg">
                <h4 className="text-sm font-semibold text-orange-400 mb-2">💡 Tips</h4>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• You only need keys for providers you want to use</li>
                  <li>• OpenRouter gives you access to 100+ models with one key</li>
                  <li>• Ollama is free but requires local installation</li>
                  <li>• Each character can use a different provider/model</li>
                </ul>
              </div>
            </div>
          )}

          {/* ── Model Manager tab ───────────────────────────────────────── */}
          {activeTab === 'model-manager' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                  <Cpu size={18} className="text-orange-500" />
                  Model Manager
                </h3>
                <p className="text-sm text-gray-400">
                  Create reusable model presets with custom parameters. Apply them to any character from the Character Editor.
                </p>
              </div>
              <ModelManager apiRequest={apiRequest} />
            </div>
          )}

          {/* ── Group Chat tab ───────────────────────────────────────────── */}
          {activeTab === 'group-chat' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                  <Zap size={18} className="text-orange-500" />
                  Group Chat Settings
                </h3>
                <p className="text-sm text-gray-400">Control pacing and default model selection for group chats.</p>
              </div>

              <div className="space-y-5">
                {/* Default Model */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Default Character Model</label>
                  <p className="text-xs text-gray-400 mb-2">This model will be pre-selected when creating new characters.</p>
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
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic</option>
                      <option value="google">Google AI</option>
                      <option value="openrouter">OpenRouter</option>
                      <option value="local">Local (Ollama/LM Studio)</option>
                    </select>
                  </div>
                  <select
                    value={formData.defaultModel}
                    onChange={(e) => handleInputChange('defaultModel', e.target.value)}
                    disabled={loadingModels || availableModels.length === 0}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-400 disabled:opacity-50"
                  >
                    <option value="">Select a model...</option>
                    {availableModels.map((model) => (
                      <option key={model.id} value={model.id}>{model.name}</option>
                    ))}
                  </select>
                  {loadingModels && <p className="text-xs text-gray-500 mt-1">Loading models...</p>}
                  {!loadingModels && availableModels.length === 0 && (
                    <p className="text-xs text-yellow-400 mt-1">
                      Configure your {selectedProvider} API key in the API Keys tab to see available models.
                    </p>
                  )}
                </div>

                {/* Message Delay */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Message Delay: {formData.messageDelay}ms
                  </label>
                  <input
                    type="range" min="0" max="3000" step="100"
                    value={formData.messageDelay}
                    onChange={(e) => handleInputChange('messageDelay', parseInt(e.target.value))}
                    className="w-full accent-red-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Delay between character responses for realistic pacing</p>
                </div>

                {/* System Prompt Override */}
                <div className="pt-4 border-t border-white/10">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    System Prompt Override (Optional)
                  </label>
                  <textarea
                    value={formData.adminSystemPrompt}
                    onChange={(e) => handleInputChange('adminSystemPrompt', e.target.value)}
                    placeholder="Overrides the default system prompt for your chats..."
                    rows={4}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-400 resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    When set, this replaces the default system prompt for your chats only.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-white/10 bg-gray-900 shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
