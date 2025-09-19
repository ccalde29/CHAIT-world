/**
 * Main Application Component (after authentication)
 * Complete file with Supabase integration and proper settings handling
 */

import React, { useState, useEffect, useRef } from 'react';
import { Send, Users, Settings, Plus, MessageCircle, Zap, Wifi, WifiOff, Edit, Trash2, LogOut, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import SettingsModal from './SettingsModal';
import CharacterEditor from './CharacterEditor';
import SceneEditor from './SceneEditor';
import UserPersonaEditor from './UserPersonaEditor';

// API Configuration
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? process.env.REACT_APP_API_URL || 'https://your-app.herokuapp.com'
  : 'http://localhost:3001';

const MainApp = () => {
  const { user, signOut } = useAuth();
  
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  // Chat state
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  
  // Characters and scenarios
  const [characters, setCharacters] = useState([]);
  const [activeCharacters, setActiveCharacters] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [currentScenario, setCurrentScenario] = useState('coffee-shop');
  
  // Settings and configuration
  const [userSettings, setUserSettings] = useState({});
  const [groupDynamicsMode, setGroupDynamicsMode] = useState('natural');
  const [apiStatus, setApiStatus] = useState('disconnected');
  
  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showCharacterEditor, setShowCharacterEditor] = useState(false);
  const [showSceneEditor, setShowSceneEditor] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState(null);
  const [userPersona, setUserPersona] = useState(null);
  const [showPersonaEditor, setShowPersonaEditor] = useState(false);
  const messagesEndRef = useRef(null);

  // ============================================================================
  // API FUNCTIONS
  // ============================================================================

  /**
   * Make API request with user authentication
   */
  const apiRequest = async (endpoint, options = {}) => {
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'user-id': user.id,
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  };

  /**
   * Check API health and connection status
   */
  const checkApiStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (response.ok) {
        setApiStatus('connected');
        setError(null);
        return true;
      } else {
        setApiStatus('error');
        return false;
      }
    } catch (err) {
      setApiStatus('disconnected');
      setError('Cannot connect to AI service. Make sure the backend is running.');
      return false;
    }
  };

  /**
   * Load all characters (default + custom)
   */
  const loadCharacters = async () => {
    try {
      const data = await apiRequest('/api/characters');
      console.log('📥 Loaded characters:', data);
      setCharacters(data.characters || []);
      
      // Set initial active characters if none selected
      if (activeCharacters.length === 0 && data.characters.length > 0) {
        const defaultActive = data.characters
          .filter(char => char.is_default)
          .slice(0, 3)
          .map(char => char.id);
        setActiveCharacters(defaultActive);
      }
    } catch (err) {
      console.error('Failed to load characters:', err);
      setError('Failed to load characters');
    }
  };

  /**
   * Load available scenarios
   */
  const loadScenarios = async () => {
    try {
      const data = await apiRequest('/api/scenarios');
      console.log('📥 Loaded scenarios:', data);
      setScenarios(data.scenarios || []);
    } catch (err) {
      console.error('Failed to load scenarios:', err);
    }
  };

  /**
   * Load user settings
   */
  const loadUserSettings = async () => {
    try {
      const settings = await apiRequest('/api/user/settings');
      console.log('📥 Loaded user settings:', settings);
      setUserSettings(settings);
      
      // Update UI state based on settings (use correct property name)
      if (settings.defaultScenario) {
        setCurrentScenario(settings.defaultScenario);
      }
    } catch (err) {
      console.error('Failed to load user settings:', err);
    }
  };

  /**
   * Save user settings
   */
  const saveUserSettings = async (updates) => {
    try {
      console.log('📤 Saving user settings:', updates);
      const response = await apiRequest('/api/user/settings', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      
      console.log('✅ Settings saved response:', response);
      setUserSettings(response.settings);
      setError(null);
      return true;
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError('Failed to save settings: ' + err.message);
      return false;
    }
  };

  /**
   * Create a new custom character
   */
  const createCharacter = async (characterData) => {
    try {
      console.log('📤 Creating character:', characterData);
      const newCharacter = await apiRequest('/api/characters', {
        method: 'POST',
        body: JSON.stringify(characterData),
      });
      
      console.log('✅ Character created:', newCharacter);
      await loadCharacters();
      setError(null);
      return newCharacter;
    } catch (err) {
      console.error('Failed to create character:', err);
      setError('Failed to create character: ' + err.message);
      return null;
    }
  };

  /**
   * Update an existing character
   */
  const updateCharacter = async (characterId, updates) => {
    try {
      console.log('📤 Updating character:', characterId, updates);
      await apiRequest(`/api/characters/${characterId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      
      console.log('✅ Character updated');
      await loadCharacters();
      setError(null);
      return true;
    } catch (err) {
      console.error('Failed to update character:', err);
      setError('Failed to update character: ' + err.message);
      return false;
    }
  };

  /**
   * Delete a character
   */
  const deleteCharacter = async (characterId) => {
    try {
      console.log('📤 Deleting character:', characterId);
      await apiRequest(`/api/characters/${characterId}`, {
        method: 'DELETE',
      });
      
      console.log('✅ Character deleted');
      // Remove from active characters if present
      setActiveCharacters(prev => prev.filter(id => id !== characterId));
      
      // Refresh characters list
      await loadCharacters();
      setError(null);
      return true;
    } catch (err) {
      console.error('Failed to delete character:', err);
      setError('Failed to delete character: ' + err.message);
      return false;
    }
  };
/**
 * Load user's persona
 */
const loadUserPersona = async () => {
  try {
    const persona = await apiRequest('/api/user/persona');
    console.log('📥 Loaded user persona:', persona);
    setUserPersona(persona);
  } catch (err) {
    console.error('Failed to load user persona:', err);
    // Set default if loading fails
    setUserPersona({
      hasPersona: false,
      persona: {
        name: 'User',
        personality: 'A curious individual engaging in conversation',
        interests: [],
        communication_style: 'casual and friendly',
        avatar: '👤',
        color: 'from-blue-500 to-indigo-500'
      }
    });
  }
};

/**
 * Save user persona
 */
const saveUserPersona = async (personaData) => {
  try {
    console.log('📤 Saving user persona:', personaData);
    const response = await apiRequest('/api/user/persona', {
      method: 'POST',
      body: JSON.stringify(personaData),
    });
    
    console.log('✅ Persona saved:', response);
    await loadUserPersona(); // Reload to get updated data
    setError(null);
    return true;
  } catch (err) {
    console.error('Failed to save user persona:', err);
    setError('Failed to save persona: ' + err.message);
    return false;
  }
};
  // ============================================================================
  // CHAT FUNCTIONS
  // ============================================================================

  /**
   * Send message and get AI responses
   */
  const handleSendMessage = async () => {
    if (!userInput.trim() || isGenerating || apiStatus !== 'connected') return;
    if (activeCharacters.length === 0) {
      setError('Please select at least one character to chat with');
      return;
    }

    const userMessage = {
      type: 'user',
      content: userInput,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = userInput;
    setUserInput('');
    setIsGenerating(true);
    setError(null);

    try {
      // Build conversation history
      const conversationHistory = messages
        .filter(m => m.type !== 'system')
        .slice(-10)
        .map(m => ({
          role: m.type === 'user' ? 'user' : 'assistant',
          content: m.content,
          character: m.character || null
        }));

      console.log('📤 Sending chat request:', {
        userMessage: currentInput,
        activeCharacters,
        scenario: currentScenario,
        groupMode: groupDynamicsMode
      });

      // Call the group response API
      const response = await apiRequest('/api/chat/group-response', {
        method: 'POST',
        body: JSON.stringify({
          userMessage: currentInput,
          activeCharacters: activeCharacters,
          scenario: currentScenario,
          groupMode: groupDynamicsMode,
          conversationHistory: conversationHistory
        })
      });

      console.log('✅ Chat response received:', response);

      // Add each character response with realistic timing
      if (response.responses && response.responses.length > 0) {
        response.responses.forEach((charResponse, index) => {
          setTimeout(() => {
            const characterMessage = {
              type: 'character',
              character: charResponse.character,
              content: charResponse.response,
              timestamp: new Date(),
              hasError: charResponse.error
            };
            
            setMessages(prev => [...prev, characterMessage]);
            
            // Mark as done when last response is added
            if (index === response.responses.length - 1) {
              setIsGenerating(false);
            }
          }, charResponse.delay || (index * 1200));
        });
      } else {
        setIsGenerating(false);
        setError('No character responses generated');
      }

    } catch (err) {
      console.error('Error sending message:', err);
      setError(`Failed to get AI response: ${err.message}`);
      setIsGenerating(false);
      
      // Add error message to chat
      setMessages(prev => [...prev, {
        type: 'system',
        content: `⚠️ Error: ${err.message}. Please check your settings and try again.`,
        timestamp: new Date()
      }]);
    }
  };

  /**
   * Toggle character active state
   */
  const toggleCharacter = (characterId) => {
    if (isGenerating) return;
    
    setActiveCharacters(prev => 
      prev.includes(characterId)
        ? prev.filter(id => id !== characterId)
        : [...prev, characterId]
    );
  };

  // ============================================================================
  // UI HELPER FUNCTIONS
  // ============================================================================

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getStatusColor = () => {
    switch (apiStatus) {
      case 'connected': return 'text-green-400';
      case 'error': return 'text-yellow-400';
      case 'disconnected': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = () => {
    return apiStatus === 'connected' ? <Wifi size={16} /> : <WifiOff size={16} />;
  };

  const findCharacterById = (id) => {
    return characters.find(char => char.id === id);
  };

  const findScenarioById = (id) => {
    return scenarios.find(scenario => scenario.id === id);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Initialize app on mount
  useEffect(() => {
  const initializeApp = async () => {
    console.log('🚀 Initializing app for user:', user?.email);
    const isConnected = await checkApiStatus();
    if (isConnected) {
      await Promise.all([
        loadCharacters(),
        loadScenarios(),
        loadUserSettings(),
        loadUserPersona() // ADD THIS LINE
      ]);
    }
  };

    if (user) {
    initializeApp();
  }

  // Update welcome message to include user persona name
  const userName = userPersona?.persona?.name || user?.user_metadata?.full_name || user?.email;
  setMessages([
    {
      type: 'system',
      content: `Welcome back, ${userName}! Ready to chat with your AI characters?`,
      timestamp: new Date()
    }
  ]);
}, [user]); // Keep the dependency array as [user]

useEffect(() => {
  if (userPersona && messages.length > 0) {
    const userName = userPersona.persona.name || user?.user_metadata?.full_name || user?.email;
    setMessages(prev => prev.map((msg, index) => 
      index === 0 && msg.type === 'system' 
        ? { ...msg, content: `Welcome back, ${userName}! Ready to chat with your AI characters?` }
        : msg
    ));
  }
}, [userPersona]);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Update welcome message when scenario changes
  useEffect(() => {
    const scenario = findScenarioById(currentScenario);
    if (scenario && messages.length > 0) {
      setMessages(prev => [
        {
          type: 'system',
          content: `Now chatting in: ${scenario.name} - ${scenario.description}`,
          timestamp: new Date()
        }
      ]);
    }
  }, [currentScenario, scenarios]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex">
      {/* Sidebar */}
      <div className="w-80 bg-black/20 backdrop-blur-sm border-r border-white/10 p-6 overflow-y-auto">
        {/* Header with User Menu */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <Users className="text-purple-400" size={24} />
            <h1 className="text-xl font-bold text-white">
              CH
              <span className="text-purple-400">AI</span>
              T World
            </h1>
          </div>
          
          {/* User Menu */}
          <div className="relative">
            <button
  			  onClick={() => setShowUserMenu(!showUserMenu)}
 			   className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/10 transition-colors"
			  >
 			   <div className={`w-8 h-8 bg-gradient-to-r ${
			      userPersona?.hasPersona ? userPersona.persona.color : 'from-purple-500 to-blue-500'
			    } rounded-full flex items-center justify-center`}>
			      {userPersona?.hasPersona ? (
			        <span className="text-white text-sm">{userPersona.persona.avatar}</span>
 			     ) : user?.user_metadata?.avatar_url ? (
			        <img 
			          src={user.user_metadata.avatar_url} 
			          alt="Profile" 
 			         className="w-8 h-8 rounded-full"
 			       />
 			     ) : (
  			      <User className="text-white" size={16} />
			      )}
			    </div>
			  </button>
  
			  {showUserMenu && (
			    <div className="absolute right-0 top-12 bg-slate-800 border border-white/10 rounded-lg p-2 min-w-48 z-10">
			      <div className="px-3 py-2 border-b border-white/10 mb-2">
  			      <p className="text-sm font-medium text-white">
  			        {userPersona?.hasPersona ? userPersona.persona.name : user?.user_metadata?.full_name || 'User'}
  			      </p>
  			      <p className="text-xs text-gray-400">{user?.email}</p>
   			     {userPersona?.hasPersona && (
   				      <p className="text-xs text-blue-300 mt-1">Persona Active</p>
   			     )}
  			    </div>
   			   <button
   			     onClick={() => {
  			      	setShowPersonaEditor(true);
   			     	setShowUserMenu(false);
  			      }}
   			     className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors"
  			    >
    				<User size={16} />
    			    {userPersona?.hasPersona ? 'Edit Persona' : 'Create Persona'}
   			    </button>
  			    <button
   			     onClick={handleSignOut}
    				className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors"
   			   	>
     			   <LogOut size={16} />
     			   Sign Out
    			  </button>
              </div>
            )}
          </div>
        </div>

        {/* API Status */}
        <div className="mb-6">
          <div className={`flex items-center gap-2 text-sm ${getStatusColor()}`}>
            {getStatusIcon()}
            <span>AI Service: {apiStatus}</span>
            <button 
              onClick={checkApiStatus}
              className="ml-auto text-xs bg-white/10 px-2 py-1 rounded hover:bg-white/20 transition-colors"
            >
              Refresh
            </button>
          </div>
          {error && (
            <div className="mt-2 text-xs text-red-300 bg-red-500/20 p-2 rounded">
              {error}
            </div>
          )}
        </div>

        {/* Settings Buttons */}
        <div className="mb-6 space-y-2">
          <button
    		onClick={() => setShowPersonaEditor(true)}
    		className="w-full flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-3 text-white hover:bg-white/10 transition-colors"
  		>
   		 <User size={18} />
		    <div className="flex-1 text-left">
		      <div className="text-sm">Your Persona</div>
 		     <div className="text-xs text-gray-400">
		        {userPersona?.hasPersona ? userPersona.persona.name : 'Set up your character'}
		      </div>
		    </div>
		    {userPersona?.hasPersona && (
 		     <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${userPersona.persona.color} flex items-center justify-center text-xs`}>
 		       {userPersona.persona.avatar}
 		     </div>
		    )}
		  </button>
  
		  <button
		    onClick={() => setShowSettings(true)}
 		   className="w-full flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-3 text-white hover:bg-white/10 transition-colors"
		  >
		    <Settings size={18} />
 		   <span>Settings & API Keys</span>
 		 </button>
 		 
 		 <button
   		 onClick={() => setShowSceneEditor(true)}
  		  className="w-full flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-3 text-white hover:bg-white/10 transition-colors"
 		 >
   		 <MessageCircle size={18} />
  		  <span>Manage Scenes</span>
 		 </button>
        </div>

        {/* Scenario Selection */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Scenario</h3>
          <select 
            value={currentScenario}
            onChange={(e) => setCurrentScenario(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-purple-400"
            disabled={isGenerating}
          >
            {scenarios.map((scenario) => (
              <option key={scenario.id} value={scenario.id} className="bg-gray-800">
                {scenario.name}
              </option>
            ))}
          </select>
        </div>

        {/* Group Dynamics Mode */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Group Dynamics</h3>
          <select 
            value={groupDynamicsMode}
            onChange={(e) => setGroupDynamicsMode(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-purple-400"
            disabled={isGenerating}
          >
            <option value="natural" className="bg-gray-800">Natural Flow</option>
            <option value="round-robin" className="bg-gray-800">Round Robin</option>
            <option value="all-respond" className="bg-gray-800">Everyone Responds</option>
          </select>
        </div>

        {/* Character Selection */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-300">
              Characters ({activeCharacters.length} active)
            </h3>
            <button
              onClick={() => setShowCharacterEditor(true)}
              className="flex items-center gap-1 text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded hover:bg-purple-500/30 transition-colors"
            >
              <Plus size={12} />
              Create
            </button>
          </div>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {characters.map((character) => (
              <div
                key={character.id}
                onClick={() => !isGenerating && toggleCharacter(character.id)}
                className={`p-3 rounded-lg border transition-all ${
                  isGenerating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                } ${
                  activeCharacters.includes(character.id)
                    ? `bg-gradient-to-r ${character.color} border-white/20`
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {character.avatar}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-white text-sm">{character.name}</div>
                      {character.is_default && (
                        <span className="text-xs bg-blue-500/20 text-blue-300 px-1 py-0.5 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-300 line-clamp-2">{character.personality}</div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCharacter(character);
                        setShowCharacterEditor(true);
                      }}
                      className="p-1 text-gray-400 hover:text-white transition-colors"
                      title="Edit character"
                    >
                      <Edit size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete ${character.name}?`)) {
                          deleteCharacter(character.id);
                        }
                      }}
                      className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                      title="Delete character"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-black/20 backdrop-blur-sm border-b border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">
                {findScenarioById(currentScenario)?.name || 'Chat Room'}
              </h2>
              <p className="text-sm text-gray-400">
                {findScenarioById(currentScenario)?.description || 'Group conversation'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {activeCharacters.map(id => {
                const character = findCharacterById(id);
                return character ? (
                  <div key={id} className="flex items-center gap-1 bg-white/10 rounded-full px-2 py-1">
                    <span className="text-sm">{character.avatar}</span>
                    <span className="text-xs text-white">{character.name}</span>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message, index) => (
            <div key={index} className="animate-in slide-in-from-bottom-2 duration-300">
              {message.type === 'system' ? (
                <div className="text-center">
                  <span className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-sm">
                    {message.content}
                  </span>
                </div>
              ) : message.type === 'user' ? (
                <div className="flex justify-end">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl rounded-br-sm px-4 py-2 max-w-xs">
                    {message.content}
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${
                    findCharacterById(message.character)?.color || 'from-gray-500 to-gray-600'
                  } flex items-center justify-center text-sm`}>
                    {findCharacterById(message.character)?.avatar || '🤖'}
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">
                      {findCharacterById(message.character)?.name || 'Unknown'}
                      {message.hasError && <span className="text-red-400 ml-2">⚠ Error</span>}
                    </div>
                    <div className={`backdrop-blur-sm text-white rounded-2xl rounded-tl-sm px-4 py-2 max-w-md ${
                      message.hasError ? 'bg-red-500/20' : 'bg-white/10'
                    }`}>
                      {message.content}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {isGenerating && (
            <div className="flex items-center gap-2 text-gray-400">
              <Zap size={16} className="animate-pulse" />
              <span className="text-sm">AI characters are thinking...</span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-black/20 backdrop-blur-sm border-t border-white/10 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={
                apiStatus !== 'connected' 
                  ? "AI service offline..." 
                  : activeCharacters.length === 0
                  ? "Select characters first..."
                  : `Chat with ${activeCharacters.length} AI character${activeCharacters.length === 1 ? '' : 's'}...`
              }
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
              disabled={isGenerating || apiStatus !== 'connected' || activeCharacters.length === 0}
            />
            <button
              onClick={handleSendMessage}
              disabled={!userInput.trim() || isGenerating || apiStatus !== 'connected' || activeCharacters.length === 0}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 transition-all"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showSettings && (
        <SettingsModal
          userSettings={userSettings}
          onSave={saveUserSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showCharacterEditor && (
        <CharacterEditor
          character={editingCharacter}
          onSave={async (characterData) => {
            if (editingCharacter) {
              await updateCharacter(editingCharacter.id, characterData);
            } else {
              await createCharacter(characterData);
            }
            setShowCharacterEditor(false);
            setEditingCharacter(null);
          }}
          onClose={() => {
            setShowCharacterEditor(false);
            setEditingCharacter(null);
          }}
        />
      )}

      {showSceneEditor && (
        <SceneEditor
          scenarios={scenarios}
          onSave={async (sceneData) => {
            try {
              console.log('📤 Saving scene:', sceneData);
              if (sceneData.id) {
                await apiRequest(`/api/scenarios/${sceneData.id}`, {
                  method: 'PUT',
                  body: JSON.stringify(sceneData),
                });
              } else {
                await apiRequest('/api/scenarios', {
                  method: 'POST',
                  body: JSON.stringify(sceneData),
                });
              }
              await loadScenarios();
              setError(null);
            } catch (err) {
              setError('Failed to save scene: ' + err.message);
            }
            setShowSceneEditor(false);
          }}
          onDelete={async (sceneId) => {
            try {
              console.log('📤 Deleting scene:', sceneId);
              await apiRequest(`/api/scenarios/${sceneId}`, {
                method: 'DELETE',
              });
              await loadScenarios();
              setError(null);
            } catch (err) {
              setError('Failed to delete scene: ' + err.message);
            }
          }}
          onClose={() => setShowSceneEditor(false)}
        />
      )}
      {showPersonaEditor && (
 		 <UserPersonaEditor
	    	userPersona={userPersona}
		    onSave={async (personaData) => {
		      const success = await saveUserPersona(personaData);
		      if (success) {
		        setShowPersonaEditor(false);
 		     }
 		   }}
 		   onClose={() => setShowPersonaEditor(false)}
 		 />
		)}

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div 
          className="fixed inset-0 z-5" 
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </div>
  );
};

export default MainApp;