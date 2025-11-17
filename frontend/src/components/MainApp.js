/**
 * Main Application Component - Refactored Version
 * Uses custom hooks and modular components for better maintainability
 */

import React, { useState, useRef, useMemo } from 'react';
import { Settings, Plus, Zap, User, LogOut, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../hooks/useChat';
import { useCharacters } from '../hooks/useCharacters';
import { useSettings } from '../hooks/useSettings';
import { createApiClient } from '../utils/apiClient';

// Components
import ChatInterface from './ChatInterface';
import ActiveChatPanel from './ActiveChatPanel';
import NewChatModal from './NewChatModal';
import CharacterSceneHub from './CharacterSceneHub';
import SettingsModal from './SettingsModal';
import CharacterEditor from './CharacterEditor';
import SceneEditor from './SceneEditor';
import UserPersonaEditor from './UserPersonaEditor';
import CharacterMemoryViewer from './CharacterMemoryViewer';
import ChatHistorySidebar from './ChatHistorySidebar';
import CommunityHub from './CommunityHub';

const MainApp = () => {
  const { user, signOut } = useAuth();

  // ============================================================================
  // API CLIENT
  // ============================================================================

  const apiRequest = useMemo(() => createApiClient(user.id), [user.id]);

  // ============================================================================
  // CUSTOM HOOKS
  // ============================================================================

  const chat = useChat(apiRequest);
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
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showManagementHub, setShowManagementHub] = useState(true); // Show by default
  const [chatHistoryCollapsed, setChatHistoryCollapsed] = useState(true); // Collapsed by default
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(true); // Collapsed by default
  const [editingCharacter, setEditingCharacter] = useState(null);
  const [editingScene, setEditingScene] = useState(null);
  const [selectedCharacterForMemory, setSelectedCharacterForMemory] = useState(null);

  const userMenuRef = useRef(null);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleStartNewChat = (scene, characters) => {
    // Set scene and characters
    charactersState.setCurrentScenario(scene.id);
    charactersState.setActiveCharacters(characters);

    // Clear current chat
    chat.clearChat();

    // Close modal
    setShowNewChatModal(false);
  };

  const handleSendMessage = () => {
    chat.sendMessage(
      charactersState.activeCharacters,
      charactersState.currentScenario,
      settings.userPersona
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

  const handleDeleteScene = async (sceneId) => {
    try {
      await apiRequest(`/api/scenarios/${sceneId}`, {
        method: 'DELETE'
      });
      await charactersState.loadScenarios();
    } catch (error) {
      console.error('Error deleting scene:', error);
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
      {/* Leftmost - Chat History Sidebar (Always visible) */}
      <ChatHistorySidebar
        apiRequest={apiRequest}
        currentSessionId={chat.currentSessionId}
        onSessionSelect={(session) => {
          chat.loadChatSession(session.id);
        }}
        onNewChat={() => {
          chat.clearChat();
        }}
        characters={charactersState.characters}
        isCollapsed={chatHistoryCollapsed}
        onToggleCollapse={() => setChatHistoryCollapsed(!chatHistoryCollapsed)}
      />

      {/* Left Sidebar - Character/Scene Management Hub */}
      {showManagementHub && (
        <CharacterSceneHub
          characters={charactersState.characters}
          scenes={charactersState.scenarios}
          onAddCharacter={() => {
            setEditingCharacter(null);
            setShowCharacterEditor(true);
          }}
          onEditCharacter={(character) => {
            setEditingCharacter(character);
            setShowCharacterEditor(true);
          }}
          onDeleteCharacter={handleDeleteCharacter}
          onAddScene={() => {
            setEditingScene(null);
            setShowSceneEditor(true);
          }}
          onEditScene={(scene) => {
            setEditingScene(scene);
            setShowSceneEditor(true);
          }}
          onDeleteScene={handleDeleteScene}
          onOpenMemoryViewer={(character) => {
            setSelectedCharacterForMemory(character);
            setShowMemoryViewer(true);
          }}
        />
      )}

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
              onClick={() => setShowNewChatModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 rounded-lg transition-all font-medium flex items-center gap-2"
              title="Start New Chat"
            >
              <Plus size={18} />
              New Chat
            </button>

            <button
              onClick={() => setShowManagementHub(!showManagementHub)}
              className={`p-2 rounded-lg transition-colors ${
                showManagementHub ? 'bg-purple-500 text-white' : 'hover:bg-white/10'
              }`}
              title="Toggle Management Hub"
            >
              <Users size={20} />
            </button>

            <button
              onClick={() => setShowCommunityHub(true)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Community Hub"
            >
              <Zap size={20} />
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

      {/* Active Chat Panel (Right Sidebar) */}
      <ActiveChatPanel
        currentScene={charactersState.findScenarioById(charactersState.currentScenario)}
        activeCharacters={charactersState.activeCharacters}
        onRemoveCharacter={(character) => {
          charactersState.setActiveCharacters(prev => prev.filter(c => c.id !== character.id));
        }}
        onChangeScene={() => setShowNewChatModal(true)}
        isCollapsed={rightPanelCollapsed}
        onToggleCollapse={() => setRightPanelCollapsed(!rightPanelCollapsed)}
      />

      {/* Modals */}
      {showNewChatModal && (
        <NewChatModal
          scenes={charactersState.scenarios}
          characters={charactersState.characters}
          onStart={handleStartNewChat}
          onClose={() => setShowNewChatModal(false)}
        />
      )}

      {/* Other Modals */}
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
          userCharacters={charactersState.characters}
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
