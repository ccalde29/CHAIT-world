/**
 * Main Application Component - Refactored Version
 * Uses custom hooks and modular components for better maintainability
 */

import React, { useState, useRef } from 'react';
import { Settings, Plus, Zap, User, LogOut, MessageCircle, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../hooks/useChat';
import { useCharacters } from '../hooks/useCharacters';
import { useSettings } from '../hooks/useSettings';

// Components
import ChatInterface from './ChatInterface';
import CharacterPanel from './CharacterPanel';
import SettingsModal from './SettingsModal';
import CharacterEditor from './CharacterEditor';
import SceneEditor from './SceneEditor';
import UserPersonaEditor from './UserPersonaEditor';
import CharacterMemoryViewer from './CharacterMemoryViewer';
import ChatHistorySidebar from './ChatHistorySidebar';
import CommunityHub from './CommunityHub';

// API Configuration
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? process.env.REACT_APP_API_URL
  : 'http://localhost:3001';

if (process.env.NODE_ENV === 'production' && !API_BASE_URL) {
  throw new Error('REACT_APP_API_URL environment variable must be set in production');
}

const MainApp = () => {
  const { user, signOut } = useAuth();

  // ============================================================================
  // API REQUEST HELPER
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
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  };

  // ============================================================================
  // CUSTOM HOOKS
  // ============================================================================

  const chat = useChat(apiRequest, user);
  const charactersState = useCharacters(apiRequest);
  const settings = useSettings(apiRequest);

  // ============================================================================
  // UI STATE
  // ============================================================================

  const [showSettings, setShowSettings] = useState(false);
  const [showCharacterEditor, setShowCharacterEditor] = useState(false);
  const [showSceneEditor, setShowSceneEditor] = useState(false);
  const [showCommunityHub, setShowCommunityHub] = useState(false);
  const [showMemoryViewer, setShowMemoryViewer] = useState(false);
  const [showPersonaEditor, setShowPersonaEditor] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState(null);
  const [selectedCharacterForMemory, setSelectedCharacterForMemory] = useState(null);

  const userMenuRef = useRef(null);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleSendMessage = () => {
    chat.sendMessage(
      charactersState.activeCharacters,
      charactersState.currentScenario,
      settings.groupDynamicsMode
    );
  };

  const handleSaveCharacter = async (characterData) => {
    try {
      if (editingCharacter) {
        // Update
        const data = await apiRequest(`/api/characters/${editingCharacter.id}`, {
          method: 'PUT',
          body: JSON.stringify(characterData)
        });
        charactersState.setCharacters(prev =>
          prev.map(c => c.id === editingCharacter.id ? data : c)
        );
      } else {
        // Create
        const data = await apiRequest('/api/characters', {
          method: 'POST',
          body: JSON.stringify(characterData)
        });
        charactersState.setCharacters(prev => [...prev, data]);
      }
      setShowCharacterEditor(false);
      setEditingCharacter(null);
    } catch (error) {
      console.error('Error saving character:', error);
      throw error;
    }
  };

  const handleDeleteCharacter = async (characterId) => {
    try {
      await apiRequest(`/api/characters/${characterId}`, {
        method: 'DELETE'
      });
      charactersState.setCharacters(prev => prev.filter(c => c.id !== characterId));
      charactersState.setActiveCharacters(prev => prev.filter(c => c.id !== characterId));
    } catch (error) {
      console.error('Error deleting character:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  const filteredCharacters = charactersState.getFilteredCharacters();

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Chat History Sidebar */}
      {showChatHistory && (
        <ChatHistorySidebar
          apiRequest={apiRequest}
          onLoadSession={(sessionId) => {
            chat.loadChatSession(sessionId);
            setShowChatHistory(false);
          }}
          onClose={() => setShowChatHistory(false)}
        />
      )}

      {/* Character Panel */}
      <CharacterPanel
        characters={filteredCharacters}
        activeCharacters={charactersState.activeCharacters}
        characterSort={charactersState.characterSort}
        characterSearch={charactersState.characterSearch}
        selectedTagFilter={charactersState.selectedTagFilter}
        onToggleCharacter={charactersState.toggleCharacter}
        onAddCharacter={() => {
          setEditingCharacter(null);
          setShowCharacterEditor(true);
        }}
        onEditCharacter={(character) => {
          setEditingCharacter(character);
          setShowCharacterEditor(true);
        }}
        onDeleteCharacter={handleDeleteCharacter}
        onSortChange={charactersState.setCharacterSort}
        onSearchChange={charactersState.setCharacterSearch}
        onTagFilterChange={charactersState.setSelectedTagFilter}
        onOpenMemoryViewer={(character) => {
          setSelectedCharacterForMemory(character);
          setShowMemoryViewer(true);
        }}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="bg-gray-800 border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">CHAIT World</h1>
            <div className="text-sm text-gray-400">
              {charactersState.findScenarioById(charactersState.currentScenario)?.name || 'Coffee Shop'}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowChatHistory(true)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Chat History"
            >
              <MessageCircle size={20} />
            </button>

            <button
              onClick={() => setShowSceneEditor(true)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Scenes"
            >
              <Zap size={20} />
            </button>

            <button
              onClick={() => setShowCommunityHub(true)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Community"
            >
              <Users size={20} />
            </button>

            <button
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings size={20} />
            </button>

            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="User Menu"
              >
                <User size={20} />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-white/10 rounded-lg shadow-xl z-50">
                  <button
                    onClick={() => {
                      setShowPersonaEditor(true);
                      setShowUserMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-white/10 flex items-center gap-2"
                  >
                    <User size={16} />
                    Edit Persona
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full px-4 py-2 text-left hover:bg-white/10 flex items-center gap-2 text-red-400"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <ChatInterface
          messages={chat.messages}
          userInput={chat.userInput}
          isGenerating={chat.isGenerating}
          error={chat.error}
          messagesEndRef={chat.messagesEndRef}
          userPersona={settings.userPersona}
          findCharacterById={charactersState.findCharacterById}
          onInputChange={chat.setUserInput}
          onSendMessage={handleSendMessage}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !chat.isGenerating) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
        />
      </div>

      {/* Modals */}
      {showSettings && (
        <SettingsModal
          currentSettings={settings.userSettings}
          onSave={settings.saveUserSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showCharacterEditor && (
        <CharacterEditor
          character={editingCharacter}
          user={user}
          userSettings={settings.userSettings}
          onSave={handleSaveCharacter}
          onClose={() => {
            setShowCharacterEditor(false);
            setEditingCharacter(null);
          }}
        />
      )}

      {showSceneEditor && (
        <SceneEditor
          scenarios={charactersState.scenarios}
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
              await charactersState.loadScenarios();
              setShowSceneEditor(false);
            } catch (error) {
              console.error('Error saving scene:', error);
            }
          }}
          onClose={() => setShowSceneEditor(false)}
          currentScenario={charactersState.currentScenario}
          onScenarioSelect={charactersState.setCurrentScenario}
        />
      )}

      {showCommunityHub && (
        <CommunityHub
          apiRequest={apiRequest}
          onImport={async () => {
            await charactersState.loadCharacters();
            setShowCommunityHub(false);
          }}
          onClose={() => setShowCommunityHub(false)}
        />
      )}

      {showMemoryViewer && selectedCharacterForMemory && (
        <CharacterMemoryViewer
          character={selectedCharacterForMemory}
          onClose={() => {
            setShowMemoryViewer(false);
            setSelectedCharacterForMemory(null);
          }}
          apiRequest={apiRequest}
        />
      )}

      {showPersonaEditor && (
        <UserPersonaEditor
          currentPersona={settings.userPersona}
          onSave={async (personaData) => {
            await settings.saveUserPersona(personaData);
            setShowPersonaEditor(false);
          }}
          onClose={() => setShowPersonaEditor(false)}
        />
      )}
    </div>
  );
};

export default MainApp;
