/**
 * Main Application Component (after authentication)
 * Fixed version with working user menu dropdown
 */

import React, { useState, useEffect, useRef } from 'react';
import { Send, Users, Settings, Plus, Zap, User, Brain, MessageCircle, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import SettingsModal from './SettingsModal';
import CharacterEditor from './CharacterEditor';
import SceneEditor from './SceneEditor';
import UserPersonaEditor from './UserPersonaEditor';
import CharacterMemoryViewer from './CharacterMemoryViewer';
import ChatHistorySidebar from './ChatHistorySidebar';

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
  const [currentSessionId, setCurrentSessionId] = useState(null);

  // Characters and scenarios
  const [characters, setCharacters] = useState([]);
  const [activeCharacters, setActiveCharacters] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [currentScenario, setCurrentScenario] = useState('coffee-shop');
  
  // Settings and configuration
  const [userSettings, setUserSettings] = useState({});
  const [groupDynamicsMode, setGroupDynamicsMode] = useState('natural');
  
  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showCharacterEditor, setShowCharacterEditor] = useState(false);
  const [showSceneEditor, setShowSceneEditor] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMemoryViewer, setShowMemoryViewer] = useState(false);
  const [showPersonaEditor, setShowPersonaEditor] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState(null);
  const [selectedCharacterForMemory, setSelectedCharacterForMemory] = useState(null);
  const [userPersona, setUserPersona] = useState(null);
  const messagesEndRef = useRef(null);
  const userMenuRef = useRef(null);
  const [historyUpdateTrigger, setHistoryUpdateTrigger] = useState(0);

  // ============================================================================
  // API FUNCTIONS
  // ============================================================================

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

  // ============================================================================
  // CHAT FUNCTIONS
  // ============================================================================

  const handleSendMessage = async () => {
    if (!userInput.trim() || isGenerating) return;
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

      console.log('📤 Sending chat request with session:', currentSessionId);

      const response = await apiRequest('/api/chat/group-response', {
        method: 'POST',
        body: JSON.stringify({
          userMessage: currentInput,
          activeCharacters: activeCharacters,
          scenario: currentScenario,
          groupMode: groupDynamicsMode,
          conversationHistory: conversationHistory,
          sessionId: currentSessionId,
          autoCreateSession: !currentSessionId
        })
      });

      console.log('✅ Chat response received:', response);

      // Update session ID if new session was created
      if (response.sessionId && !currentSessionId) {
        setCurrentSessionId(response.sessionId);
      }

      // Add character responses with timing
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
      
      setMessages(prev => [...prev, {
        type: 'system',
        content: `⚠️ Error: ${err.message}. Please check your settings and try again.`,
        timestamp: new Date()
      }]);
    }
  };

  const toggleCharacter = (characterId) => {
    if (isGenerating) return;
    
    setActiveCharacters(prev => 
      prev.includes(characterId)
        ? prev.filter(id => id !== characterId)
        : [...prev, characterId]
    );
  };

  const startNewChat = () => {
    setCurrentSessionId(null);
    setMessages([
      {
        type: 'system',
        content: `New conversation started! Ready to chat with your AI characters?`,
        timestamp: new Date()
      }
    ]);
    setError(null);
    setHistoryUpdateTrigger(prev => prev + 1);
  };

  const loadChatSession = async (session) => {
    try {
      console.log('📥 Loading chat session:', session.id);
      const response = await apiRequest(`/api/chat/sessions/${session.id}`);
      
      setCurrentSessionId(session.id);
      setCurrentScenario(response.scenario_id);
      setActiveCharacters(response.active_characters || []);
      
      // Convert database messages to UI format
      const uiMessages = response.messages.map(msg => ({
        type: msg.type,
        content: msg.content,
        character: msg.character_id,
        timestamp: new Date(msg.timestamp)
      }));
      
      setMessages(uiMessages);
      setError(null);
      
    } catch (err) {
      console.error('Failed to load chat session:', err);
      setError('Failed to load chat session');
    }
  };

  // ============================================================================
  // DATA LOADING FUNCTIONS
  // ============================================================================

  const loadCharacters = async () => {
    try {
      const data = await apiRequest('/api/characters');
      setCharacters(data.characters || []);
      
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

  const loadScenarios = async () => {
    try {
      const data = await apiRequest('/api/scenarios');
      setScenarios(data.scenarios || []);
    } catch (err) {
      console.error('Failed to load scenarios:', err);
    }
  };

  const loadUserSettings = async () => {
    try {
      const settings = await apiRequest('/api/user/settings');
      setUserSettings(settings);
      
      if (settings.defaultScenario) {
        setCurrentScenario(settings.defaultScenario);
      }
    } catch (err) {
      console.error('Failed to load user settings:', err);
    }
  };

  const loadUserPersona = async () => {
    try {
      const persona = await apiRequest('/api/user/persona');
      setUserPersona(persona);
    } catch (err) {
      console.error('Failed to load user persona:', err);
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

  // ============================================================================
  // CHARACTER MANAGEMENT FUNCTIONS
  // ============================================================================

  const createCharacter = async (characterData) => {
    try {
      const newCharacter = await apiRequest('/api/characters', {
        method: 'POST',
        body: JSON.stringify(characterData),
      });
      
      await loadCharacters();
      setError(null);
      return newCharacter;
    } catch (err) {
      console.error('Failed to create character:', err);
      setError('Failed to create character: ' + err.message);
      return null;
    }
  };

  const updateCharacter = async (characterId, updates) => {
    try {
      await apiRequest(`/api/characters/${characterId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      
      await loadCharacters();
      setError(null);
      return true;
    } catch (err) {
      console.error('Failed to update character:', err);
      setError('Failed to update character: ' + err.message);
      return false;
    }
  };

  const deleteCharacter = async (characterId) => {
    try {
      await apiRequest(`/api/characters/${characterId}`, {
        method: 'DELETE',
      });
      
      setActiveCharacters(prev => prev.filter(id => id !== characterId));
      await loadCharacters();
      setError(null);
      return true;
    } catch (err) {
      console.error('Failed to delete character:', err);
      setError('Failed to delete character: ' + err.message);
      return false;
    }
  };

  const saveUserSettings = async (updates) => {
    try {
      const response = await apiRequest('/api/user/settings', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      
      setUserSettings(response.settings);
      setError(null);
      return true;
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError('Failed to save settings: ' + err.message);
      return false;
    }
  };

  const saveUserPersona = async (personaData) => {
    try {
      const response = await apiRequest('/api/user/persona', {
        method: 'POST',
        body: JSON.stringify(personaData),
      });
      
      await loadUserPersona();
      setError(null);
      return true;
    } catch (err) {
      console.error('Failed to save user persona:', err);
      setError('Failed to save persona: ' + err.message);
      return false;
    }
  };

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const findCharacterById = (id) => {
    return characters.find(char => char.id === id);
  };

  const findScenarioById = (id) => {
    return scenarios.find(scenario => scenario.id === id);
  };

  const openMemoryViewer = (character) => {
    setSelectedCharacterForMemory(character);
    setShowMemoryViewer(true);
  };

  const closeMemoryViewer = () => {
    setShowMemoryViewer(false);
    setSelectedCharacterForMemory(null);
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

  useEffect(() => {
    const initializeApp = async () => {
      if (user) {
        console.log('🚀 Initializing app for user:', user?.email);
        await Promise.all([
          loadCharacters(),
          loadScenarios(),
          loadUserSettings(),
          loadUserPersona()
        ]);
      }
    };

    initializeApp();
  }, [user]);

  useEffect(() => {
    if (messages.length === 0) {
      const userName = userPersona?.persona?.name || user?.user_metadata?.full_name || 'User';
      setMessages([
        {
          type: 'system',
          content: `Welcome back, ${userName}! Ready to chat with your AI characters?`,
          timestamp: new Date()
        }
      ]);
    }
  }, [userPersona, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showUserMenu]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex">
      {/* Chat History Sidebar */}
      <ChatHistorySidebar
        apiRequest={apiRequest}
        currentSessionId={currentSessionId}
        onSessionSelect={loadChatSession}
        onNewChat={startNewChat}
        characters={characters}
        onHistoryUpdate={historyUpdateTrigger}
      />

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Character Selection Sidebar */}
        <div className="w-80 bg-black/20 backdrop-blur-sm border-r border-white/10 p-6 overflow-y-auto">
          {/* Header with User Menu */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Users className="text-purple-400" size={20} />
              <h2 className="text-lg font-bold text-white">Characters</h2>
            </div>
            
            {/* User Avatar - FIXED VERSION */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUserMenu(!showUserMenu);
                }}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  userPersona?.hasPersona && userPersona.persona.uses_custom_image && userPersona.persona.avatar_image_url
                    ? ''
                    : `bg-gradient-to-r ${userPersona?.hasPersona ? userPersona.persona.color : 'from-purple-500 to-blue-500'}`
                }`}>
                  {userPersona?.hasPersona && userPersona.persona.uses_custom_image && userPersona.persona.avatar_image_url ? (
                    <img
                      src={userPersona.persona.avatar_image_url}
                      alt="Your avatar"
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : userPersona?.hasPersona ? (
                    <span className="text-white text-sm">{userPersona.persona.avatar}</span>
                  ) : (
                    <User className="text-white" size={16} />
                  )}
                </div>
              </button>
              
              {/* User Menu Dropdown - FIXED */}
              {showUserMenu && (
                <div className="absolute right-0 top-12 bg-slate-800 border border-white/10 rounded-lg shadow-xl p-2 min-w-48 z-[100]">
                  <div className="px-3 py-2 border-b border-white/10 mb-2">
                    <p className="text-sm font-medium text-white">
                      {userPersona?.hasPersona ? userPersona.persona.name : user?.user_metadata?.full_name || 'User'}
                    </p>
                    <p className="text-xs text-gray-400">{user?.email}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPersonaEditor(true);
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors"
                  >
                    <User size={16} />
                    {userPersona?.hasPersona ? 'Edit Persona' : 'Create Persona'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSettings(true);
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors"
                  >
                    <Settings size={16} />
                    Settings
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSignOut();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 text-xs text-red-300 bg-red-500/20 p-3 rounded-lg border border-red-500/20">
              {error}
              <button 
                onClick={() => setError(null)}
                className="ml-2 text-red-200 hover:text-white"
              >
                ×
              </button>
            </div>
          )}

          {/* Quick Actions */}
          <div className="mb-6 space-y-2">
            <button
              onClick={() => setShowCharacterEditor(true)}
              className="w-full flex items-center gap-2 bg-purple-500/20 border border-purple-400/30 rounded-lg p-3 text-white hover:bg-purple-500/30 transition-colors"
            >
              <Plus size={18} />
              <span>Create Character</span>
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
            <h3 className="text-sm font-medium text-gray-300 mb-3">Current Scene</h3>
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
            <h3 className="text-sm font-medium text-gray-300 mb-3">Chat Style</h3>
            <select 
              value={groupDynamicsMode}
              onChange={(e) => setGroupDynamicsMode(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-purple-400"
              disabled={isGenerating}
            >
              <option value="natural" className="bg-gray-800">Natural Flow</option>
              <option value="round-robin" className="bg-gray-800">Take Turns</option>
              <option value="all-respond" className="bg-gray-800">Everyone Responds</option>
            </select>
          </div>

          {/* Character List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-300">
                Active Characters ({activeCharacters.length})
              </h3>
            </div>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {characters.map((character) => (
                <div
                  key={character.id}
                  className={`p-3 rounded-lg border transition-all ${
                    isGenerating ? 'opacity-50 cursor-not-allowed' : ''
                  } ${
                    activeCharacters.includes(character.id)
                      ? `bg-gradient-to-r ${character.color} border-white/20`
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      onClick={() => !isGenerating && toggleCharacter(character.id)}
                      className={`flex-1 flex items-center gap-3 ${!isGenerating ? 'cursor-pointer' : ''}`}
                    >
                      {/* Character Avatar */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        character.uses_custom_image && character.avatar_image_url 
                          ? '' 
                          : `bg-gradient-to-r ${character.color}`
                      }`}>
                        {character.uses_custom_image && character.avatar_image_url ? (
                          <img
                            src={character.avatar_image_url}
                            alt={`${character.name} avatar`}
                            className="w-10 h-10 rounded-full object-cover border border-white/20"
                          />
                        ) : (
                          <span className="text-2xl">
                            {character.avatar}
                          </span>
                        )}
                      </div>
                      
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
                    </div>
                    
                    {/* Character Actions */}
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openMemoryViewer(character);
                        }}
                        className="p-1 text-gray-400 hover:text-purple-400 transition-colors"
                        title="View memories"
                      >
                        <Brain size={12} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCharacter(character);
                          setShowCharacterEditor(true);
                        }}
                        className="p-1 text-gray-400 hover:text-white transition-colors"
                        title="Edit character"
                      >
                        <Settings size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col relative">
          {/* Background Image */}
          {findScenarioById(currentScenario)?.background_image_url && findScenarioById(currentScenario)?.uses_custom_background && (
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: `url(${findScenarioById(currentScenario).background_image_url})`
              }}
            >
              <div className="absolute inset-0 bg-black/60"></div>
            </div>
          )}

          {/* Chat Content */}
          <div className="relative z-10 flex flex-col h-full">
            {/* Header */}
            <div className="bg-black/20 backdrop-blur-sm border-b border-white/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {findScenarioById(currentScenario)?.name || 'Chat Room'}
                  </h2>
                  <p className="text-sm text-gray-200">
                    {findScenarioById(currentScenario)?.description || 'Group conversation'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Session Indicator */}
                  {currentSessionId && (
                    <div className="flex items-center gap-1 bg-green-500/20 rounded-full px-2 py-1 border border-green-400/30">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-xs text-green-300">Session Active</span>
                    </div>
                  )}

                  {/* Active Characters Indicator */}
                  {activeCharacters.map(id => {
                    const character = findCharacterById(id);
                    return character ? (
                      <div key={id} className="flex items-center gap-1 bg-white/10 rounded-full px-2 py-1 backdrop-blur-sm">
                        {character.uses_custom_image && character.avatar_image_url ? (
                          <img
                            src={character.avatar_image_url}
                            alt={`${character.name} avatar`}
                            className="w-5 h-5 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-sm">{character.avatar}</span>
                        )}
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
                      <span className="bg-purple-500/30 backdrop-blur-sm text-purple-100 px-3 py-1 rounded-full text-sm border border-purple-400/30">
                        {message.content}
                      </span>
                    </div>
                  ) : message.type === 'user' ? (
                    <div className="flex justify-end">
                      <div className="bg-gradient-to-r from-blue-500/90 to-purple-600/90 backdrop-blur-sm text-white rounded-2xl rounded-br-sm px-4 py-2 max-w-xs border border-white/20">
                        {message.content}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border border-white/20 ${
                        findCharacterById(message.character)?.uses_custom_image && 
                        findCharacterById(message.character)?.avatar_image_url 
                          ? '' 
                          : `bg-gradient-to-r ${findCharacterById(message.character)?.color || 'from-gray-500 to-gray-600'}`
                      }`}>
                        {findCharacterById(message.character)?.uses_custom_image &&
                         findCharacterById(message.character)?.avatar_image_url ? (
                          <img
                            src={findCharacterById(message.character).avatar_image_url}
                            alt={`${findCharacterById(message.character).name} avatar`}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          findCharacterById(message.character)?.avatar || '🤖'
                        )}
                      </div>
                      <div>
                        <div className="text-xs text-gray-200 mb-1">
                          {findCharacterById(message.character)?.name || 'Unknown'}
                          {message.hasError && <span className="text-red-400 ml-2">⚠ Error</span>}
                        </div>
                        <div className={`backdrop-blur-sm text-white rounded-2xl rounded-tl-sm px-4 py-2 max-w-md border border-white/20 ${
                          message.hasError ? 'bg-red-500/30' : 'bg-white/15'
                        }`}>
                          {message.content}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isGenerating && (
                <div className="flex items-center gap-2 text-gray-200">
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
                    activeCharacters.length === 0
                      ? "Select characters first..."
                      : `Chat with ${activeCharacters.length} AI character${activeCharacters.length === 1 ? '' : 's'}...`
                  }
                  className="flex-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-300 focus:outline-none focus:border-purple-400"
                  disabled={isGenerating || activeCharacters.length === 0}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!userInput.trim() || isGenerating || activeCharacters.length === 0}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 transition-all backdrop-blur-sm"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
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

      {showMemoryViewer && selectedCharacterForMemory && (
        <CharacterMemoryViewer
          character={selectedCharacterForMemory}
          onClose={closeMemoryViewer}
          apiRequest={apiRequest}
        />
      )}

      {showSceneEditor && (
        <SceneEditor
          scenarios={scenarios}
          onSave={async (sceneData) => {
            try {
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
    </div>
  );
};

export default MainApp;
