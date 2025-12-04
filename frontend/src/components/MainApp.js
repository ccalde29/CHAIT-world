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

  const handleStartNewChat = async (scene, characters) => {
    // Set scene and characters
    charactersState.setCurrentScenario(scene.id);
    charactersState.setActiveCharacters(characters);

    // Clear current chat
    chat.clearChat();

    // Create a new session in the backend with the initial message
    try {
      const response = await apiRequest('/api/chat/sessions/create-with-initial-message', {
        method: 'POST',
        body: JSON.stringify({
          scenario_id: scene.id,
          active_characters: characters.map(c => c.id),
          initial_message: scene.initial_message,
          title: `${scene.name} - ${new Date().toLocaleDateString()}`
        })
      });

      // Load the newly created session (which includes the initial message)
      if (response.sessionId) {
        await chat.loadChatSession(response.sessionId);
      }
    } catch (error) {
      console.error('Failed to create chat session:', error);
      // Fallback: add initial message locally if backend fails
      if (scene.initial_message) {
        chat.addSystemMessage(scene.initial_message);
      }
    }

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
      // Show user-friendly error message
      if (error.message && error.message.includes('published')) {
        window.alert('Cannot delete a published character. Please unpublish it first from the Community Hub.');
      } else {
        window.alert('Failed to delete character: ' + (error.message || 'Unknown error'));
      }
    }
  };

  const handlePublishCharacter = async (characterId, options = {}) => {
    try {
      const data = await apiRequest(`/api/characters/${characterId}/publish`, {
        method: 'POST',
        body: JSON.stringify(options)
      });

      // Update local character state with returned published data if present
      if (data) {
        charactersState.setCharacters(prev => prev.map(c => c.id === characterId ? { ...c, ...data } : c));
      } else {
        charactersState.setCharacters(prev => prev.map(c => c.id === characterId ? { ...c, is_public: true } : c));
      }

      window.alert(data?.message || 'Character published to community');
      return true;
    } catch (error) {
      console.error('Error publishing character:', error);
      window.alert('Failed to publish character: ' + (error.message || 'Unknown error'));
      return false;
    }
  };

  const handleUnpublishCharacter = async (characterId) => {
    try {
      const data = await apiRequest(`/api/characters/${characterId}/unpublish`, {
        method: 'POST'
      });

      // Update local character state with returned data if present
      if (data) {
        charactersState.setCharacters(prev => prev.map(c => c.id === characterId ? { ...c, ...data } : c));
      } else {
        charactersState.setCharacters(prev => prev.map(c => c.id === characterId ? { ...c, is_public: false } : c));
      }

      window.alert(data?.message || 'Character unpublished from community');
    } catch (error) {
      console.error('Error unpublishing character:', error);
      window.alert('Failed to unpublish character: ' + (error.message || 'Unknown error'));
    }
  };

  const handleUnpublishScene = async (sceneId) => {
    try {
      const data = await apiRequest(`/api/community/scenes/${sceneId}/unpublish`, {
        method: 'POST'
      });

      // Update local scene state with returned data if present
      if (data) {
        charactersState.setScenarios(prev => prev.map(s => s.id === sceneId ? { ...s, ...data } : s));
      } else {
        charactersState.setScenarios(prev => prev.map(s => s.id === sceneId ? { ...s, is_public: false } : s));
      }

      window.alert(data?.message || 'Scene unpublished from community');
    } catch (error) {
      console.error('Error unpublishing scene:', error);
      window.alert('Failed to unpublish scene: ' + (error.message || 'Unknown error'));
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
      // Show user-friendly error message
      if (error.message && error.message.includes('published')) {
        window.alert('Cannot delete a published scene. Please unpublish it first from the Community Hub.');
      } else {
        window.alert('Failed to delete scene: ' + (error.message || 'Unknown error'));
      }
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
        onSessionSelect={async (session) => {
          try {
            // Load the chat session and get the full session data
            const fullSession = await chat.loadChatSession(session.id);

            // Restore the active characters from the session
            if (fullSession.active_characters && fullSession.active_characters.length > 0) {
              const sessionCharacters = fullSession.active_characters
                .map(charId => charactersState.characters.find(c => c.id === charId))
                .filter(Boolean); // Remove any not found
              charactersState.setActiveCharacters(sessionCharacters);
            }

            // Restore the scene from the session
            if (fullSession.scenario_id) {
              charactersState.setCurrentScenario(fullSession.scenario_id);
            }
          } catch (error) {
            console.error('Failed to load session:', error);
          }
        }}
        onNewChat={() => {
          chat.clearChat();
          charactersState.setActiveCharacters([]);
          charactersState.setCurrentScenario(null);
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
          onPublishScene={async (sceneId, options = {}) => {
            try {
              await apiRequest(`/api/community/scenes/${sceneId}/publish`, {
                method: 'POST',
                body: JSON.stringify(options)
              });
              await charactersState.loadScenarios();
              alert('Scene published to community!');
              return true;
            } catch (error) {
              console.error('Error publishing scene:', error);
              alert('Failed to publish scene');
              return false;
            }
          }}
          onUnpublishScene={async (sceneId) => {
            try {
              await apiRequest(`/api/community/scenes/${sceneId}/unpublish`, {
                method: 'POST'
              });
              await charactersState.loadScenarios();
              alert('Scene removed from community');
            } catch (error) {
              console.error('Error unpublishing scene:', error);
              alert('Failed to unpublish scene');
            }
          }}
          onOpenMemoryViewer={(character) => {
            setSelectedCharacterForMemory(character);
            setShowMemoryViewer(true);
          }}
          onPublishCharacter={handlePublishCharacter}
          onUnpublishCharacter={handleUnpublishCharacter}
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
          user={user}
          settings={settings.userSettings}
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
          initialEditingScene={editingScene}
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
              setEditingScene(null);
            } catch (error) {
              console.error('Error saving scene:', error);
            }
          }}
          onDelete={handleDeleteScene}
          onPublish={async (sceneId) => {
            try {
              await apiRequest(`/api/community/scenes/${sceneId}/publish`, {
                method: 'POST'
              });
              await charactersState.loadScenarios();
              alert('Scene published to community!');
            } catch (error) {
              console.error('Error publishing scene:', error);
              alert('Failed to publish scene');
            }
          }}
          onUnpublish={async (sceneId) => {
            try {
              await apiRequest(`/api/community/scenes/${sceneId}/unpublish`, {
                method: 'POST'
              });
              await charactersState.loadScenarios();
              alert('Scene removed from community');
            } catch (error) {
              console.error('Error unpublishing scene:', error);
              alert('Failed to unpublish scene');
            }
          }}
          onClose={() => {
            setShowSceneEditor(false);
            setEditingScene(null);
          }}
          currentScenario={charactersState.currentScenario}
          onScenarioSelect={charactersState.setCurrentScenario}
        />
      )}

      {showCommunityHub && (
        <CommunityHub
          apiRequest={apiRequest}
          userCharacters={charactersState.characters}
          userScenes={charactersState.scenarios}
          onUnpublishCharacter={handleUnpublishCharacter}
          onUnpublishScene={handleUnpublishScene}
          onImport={async () => {
            await charactersState.loadCharacters();
            await charactersState.loadScenarios();
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
