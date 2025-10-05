// ============================================================================
// CHAIT World - Enhanced Settings Modal (v1.5)
// Supports multiple AI providers with API key management
// ============================================================================

import React, { useState, useEffect } from 'react';
import { X, Settings, Key, Zap, CheckCircle, AlertCircle, Eye, EyeOff, Loader } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const SettingsModalV15 = ({ user, settings, onSave, onClose }) => {
  
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
    
    // Group dynamics
    groupDynamicsMode: 'natural',
    
    // Display preferences
    messageDelay: 1200
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
    ollama: null
  });
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // ============================================================================
  // INITIALIZE FROM SETTINGS
  // ============================================================================
  
  useEffect(() => {
    if (settings) {
      setFormData({
        openaiKey: settings.apiKeys?.openai || '',
        anthropicKey: settings.apiKeys?.anthropic || '',
        openrouterKey: settings.apiKeys?.openrouter || '',
        googleKey: settings.apiKeys?.google || '',
        ollamaUrl: settings.ollamaSettings?.baseUrl || 'http://localhost:11434',
        groupDynamicsMode: settings.groupDynamicsMode || 'natural',
        messageDelay: settings.messageDelay || 1200
      });
    }
  }, [settings]);
  
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
      const response = await fetch(`${API_BASE_URL}/api/providers/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': user.id
        },
        body: JSON.stringify({
          provider,
          apiKey,
          ollamaSettings
        })
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
        groupDynamicsMode: formData.groupDynamicsMode,
        messageDelay: formData.messageDelay
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl border border-white/10 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        
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
          
          {/* AI Provider Keys Section */}
          <div>
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
                    Ollama URL (Local Models)
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
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.ollamaUrl}
                    onChange={(e) => handleInputChange('ollamaUrl', e.target.value)}
                    placeholder="http://localhost:11434"
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-400"
                  />
                  
                  <button
                    onClick={() => testApiKey('ollama')}
                    disabled={testingKey === 'ollama'}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {testingKey === 'ollama' ? (
                      <>
                        <Loader size={16} className="animate-spin" />
                        Testing...
                      </>
                    ) : (
                      'Test'
                    )}
                  </button>
                </div>
                
                <p className="text-xs text-gray-500 mt-2">
                  Run models locally with Ollama. <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:underline">Learn more</a>
                </p>
              </div>
            </div>
          </div>
          
          {/* Group Chat Settings */}
          <div className="pt-6 border-t border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Zap size={18} className="text-red-500" />
              Group Chat Settings
            </h3>
            
            <div className="space-y-4">
              {/* Group Dynamics Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Response Pattern
                </label>
                <select
                  value={formData.groupDynamicsMode}
                  onChange={(e) => handleInputChange('groupDynamicsMode', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-red-400"
                >
                  <option value="natural" className="bg-gray-800">Natural Flow (Recommended)</option>
                  <option value="round-robin" className="bg-gray-800">Round Robin (Turn-based)</option>
                  <option value="all-respond" className="bg-gray-800">All Respond</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  How characters decide when to speak in group chats
                </p>
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
