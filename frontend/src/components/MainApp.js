/**
 * Main Application Component - Refactored Version
 * Uses custom hooks and modular components for better maintainability
 */

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../hooks/useChat';
import { useCharacters } from '../hooks/useCharacters';
import { useSettings } from '../hooks/useSettings';
import { usePersonas } from '../hooks/usePersonas';
import { useTokens } from '../hooks/useTokens';
import { createUnifiedApiClient } from '../utils/unifiedApiClient';
import { isNativePlatform } from '../utils/platform';
import { Capacitor } from '@capacitor/core';

// Components
import ChatInterface from './ChatInterface';
import ActiveChatPanel from './ActiveChatPanel';
import NewChatModal from './NewChatModal';
import CharacterSceneHub from './CharacterSceneHub';
import SettingsModal from './SettingsModal';
import CharacterEditor from './CharacterEditor';
import SceneEditor from './SceneEditor';
import PersonaManager from './PersonaManager';
import CharacterMemoryViewer from './CharacterMemoryViewer';
import NavigationSidebar from './NavigationSidebar';
import CommunityHub from './CommunityHub';
import ModerationPanel from './ModerationPanel';
import OfflineIndicator from './OfflineIndicator';
import LoginRequiredModal from './LoginRequiredModal';

const MainApp = () => {
  const { user, signOut } = useAuth();

  // ============================================================================
  // API CLIENT
  // ============================================================================

  const apiRequest = useMemo(() => createUnifiedApiClient(user.id), [user.id]);

  // ============================================================================
  // CUSTOM HOOKS
  // ============================================================================

  const chat = useChat(apiRequest);
  const charactersState = useCharacters(apiRequest);
  const settings = useSettings(apiRequest);
  const personasState = usePersonas(apiRequest);
  const tokens = useTokens(apiRequest);

  // ============================================================================
  // UI STATE
  // ============================================================================

  // Modal states
  const [showSettings, setShowSettings] = useState(false);
  const [showCharacterEditor, setShowCharacterEditor] = useState(false);
  const [showSceneEditor, setShowSceneEditor] = useState(false);
  const [showCommunityHub, setShowCommunityHub] = useState(false);
  const [showMemoryViewer, setShowMemoryViewer] = useState(false);
  const [showPersonaEditor, setShowPersonaEditor] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  // View and panel states
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(true);
  const [editingCharacter, setEditingCharacter] = useState(null);
  const [editingScene, setEditingScene] = useState(null);
  const [selectedCharacterForMemory, setSelectedCharacterForMemory] = useState(null);
  const [loginRequiredFor, setLoginRequiredFor] = useState('');

  // Active view state - remember last view in localStorage
  const [activeView, setActiveView] = useState(() => {
    return localStorage.getItem('chait-active-view') || 'chat';
  });

  // Admin state
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Sidebar collapse state for mobile
  const [isCollapsed, setIsCollapsed] = useState(true);
  
  // Session refresh trigger and callback ref
  const [sessionRefreshTrigger, setSessionRefreshTrigger] = useState(0);
  const loadSessionsRef = useRef(null);

  // Save active view to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('chait-active-view', activeView);
  }, [activeView]);

  // Load admin status from user settings
  useEffect(() => {
    const loadAdminStatus = async () => {
      try {
        const response = await apiRequest('/api/user/settings');
        console.log('[MainApp] User settings loaded:', response);
        console.log('[MainApp] Admin status:', response?.isAdmin);
        setIsAdmin(response?.isAdmin || false);
      } catch (error) {
        console.error('[MainApp] Failed to load admin status:', error);
        // On native platform, check if user email matches admin email
        if (user?.email === 'ccalde29@gmail.com') {
          console.log('[MainApp] Setting admin based on email match');
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      }
    };
    loadAdminStatus();
  }, [user.id, user.email, apiRequest]);

  // Debug: Log when admin status changes
  useEffect(() => {
    console.log('[MainApp] isAdmin state changed to:', isAdmin);
  }, [isAdmin]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleStartNewChat = async (scene, characters, customTitle = '') => {
    // Set scene and characters
    charactersState.setCurrentScenario(scene.id);
    charactersState.setActiveCharacters(characters);

    // Clear current chat
    chat.clearChat();

    // Create a new session in the backend with the initial message
    try {
      const defaultTitle = `${scene.name} - ${new Date().toLocaleDateString()}`;
      const response = await apiRequest('/api/chat/sessions/create-with-initial-message', {
        method: 'POST',
        body: JSON.stringify({
          scenario_id: scene.id,
          active_characters: characters.map(c => c.id),
          initial_message: scene.initial_message,
          title: customTitle.trim() || defaultTitle
        })
      });

      // Load the newly created session (which includes the initial message)
      if (response.sessionId) {
        await chat.loadChatSession(response.sessionId);
        
        // Refresh the sessions list in the sidebar
        if (loadSessionsRef.current) {
          loadSessionsRef.current();
        }
      }
    } catch (error) {
      console.error('Failed to create chat session:', error);
      // Fallback: add initial message locally if backend fails
      if (scene.initial_message) {
        chat.addSystemMessage(scene.initial_message);
      }
    }

    // Close modal and switch to chat view
    setShowNewChatModal(false);
    setActiveView('chat');
  };

  const handleSendMessage = async () => {
    await chat.sendMessage(
      charactersState.activeCharacters,
      charactersState.currentScenario,
      personasState.activePersona ? { hasPersona: true, persona: personasState.activePersona } : null,
      (newSessionId) => {
        // Callback when new session is created - refresh immediately
        if (loadSessionsRef.current) {
          loadSessionsRef.current();
        }
      }
    );
    // Refresh token balance after sending message
    console.log('[MainApp] Refreshing token balance after message sent');
    await tokens.refreshBalance();
  };

  const handlePersonaSwitch = async (personaId) => {
    try {
      await personasState.activatePersona(personaId);
      // Refresh to load the newly activated persona
      await personasState.fetchActivePersona();
    } catch (error) {
      console.error('Failed to switch persona:', error);
      window.alert('Failed to switch persona');
    }
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
  // NAVIGATION HANDLER
  // ============================================================================

  const handleNavigate = (view) => {
    // Check if view requires authentication
    const requiresAuth = view === 'community';
    
    if (requiresAuth && !user) {
      setLoginRequiredFor(view);
      setShowLoginModal(true);
      return;
    }

    // If navigating away from chat, clear the active chat panel
    if (activeView === 'chat' && view !== 'chat') {
      charactersState.setActiveCharacters([]);
      charactersState.setCurrentScenario(null);
    }

    // Navigate to view
    setActiveView(view);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  const filteredCharacters = charactersState.getFilteredCharacters();

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Offline Status Indicator */}
      <OfflineIndicator />
      
      {/* Left Sidebar - Navigation & Chat History */}
      <NavigationSidebar
        apiRequest={apiRequest}
        currentSessionId={chat.currentSessionId}
        refreshTrigger={sessionRefreshTrigger}
        onSessionsLoad={(loadFn) => { loadSessionsRef.current = loadFn; }}
        tokenBalance={tokens.balance}
        tokensLoading={tokens.loading}
        onSessionSelect={async (session) => {
          try {
            // First, restore the active characters from the session
            let sessionCharacters = [];
            if (session.active_characters && session.active_characters.length > 0) {
              sessionCharacters = session.active_characters
                .map(charId => charactersState.characters.find(c => c.id === charId))
                .filter(Boolean); // Remove any not found
              charactersState.setActiveCharacters(sessionCharacters);
            }

            // Load the chat session with character data for enrichment
            const fullSession = await chat.loadChatSession(session.id, sessionCharacters);

            // Restore the scene from the session
            if (fullSession.scenario_id) {
              charactersState.setCurrentScenario(fullSession.scenario_id);
            }

            // Switch to chat view
            setActiveView('chat');
          } catch (error) {
            console.error('Failed to load session:', error);
          }
        }}
        onDeleteSession={async (sessionId) => {
          try {
            await apiRequest(`/api/chat/sessions/${sessionId}`, {
              method: 'DELETE'
            });
            // If we deleted the current session, clear everything
            if (chat.currentSessionId === sessionId) {
              chat.clearChat();
              charactersState.setActiveCharacters([]);
              charactersState.setCurrentScenario(null);
              setActiveView('manage');
            }
            // Trigger session list refresh
            setSessionRefreshTrigger(prev => prev + 1);
          } catch (error) {
            console.error('Failed to delete session:', error);
          }
        }}
        onNewChat={() => {
          setShowNewChatModal(true);
        }}
        onNavigate={handleNavigate}
        activeView={activeView}
        isAdmin={isAdmin}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Center Panel - View Switching */}
        {activeView === 'chat' && (
          <ChatInterface
            messages={chat.messages}
            userInput={chat.userInput}
            isGenerating={chat.isGenerating}
            generatingPersonaResponse={chat.generatingPersonaResponse}
            error={chat.error}
            messagesEndRef={chat.messagesEndRef}
            editingMessageId={chat.editingMessageId}
            userPersona={personasState.activePersona ? { hasPersona: true, persona: personasState.activePersona } : null}
            findCharacterById={charactersState.findCharacterById}
            onInputChange={chat.setUserInput}
            onSendMessage={handleSendMessage}
            onEditMessage={async (messageId, newContent) => {
              await chat.editMessage(
                messageId,
                newContent,
                charactersState.activeCharacters,
                charactersState.currentScenario,
                personasState.activePersona ? { hasPersona: true, persona: personasState.activePersona } : null,
                (sessionId) => {
                  setSessionRefreshTrigger(prev => prev + 1);
                }
              );
              // Refresh token balance after editing message
              tokens.refreshBalance();
            }}
            onStartEdit={chat.setEditingMessageId}
            onCancelEdit={() => chat.setEditingMessageId(null)}
            onGeneratePersonaResponse={() => chat.generatePersonaResponse(
              personasState.activePersona ? { hasPersona: true, persona: personasState.activePersona } : null,
              charactersState.findScenarioById(charactersState.currentScenario)
            )}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !chat.isGenerating) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
        )}

        {activeView === 'community' && (
          <div className="flex-1 overflow-hidden">
            <CommunityHub
              fullScreen={true}
              apiRequest={apiRequest}
              onImportCharacter={async (communityChar) => {
                try {
                  await apiRequest(`/api/community/characters/${communityChar.id}/import`, {
                    method: 'POST'
                  });
                  await charactersState.loadCharacters();
                  alert('Character imported successfully!');
                } catch (error) {
                  console.error('Error importing character:', error);
                  alert('Failed to import character');
                }
              }}
              onImportScene={async (communityScene) => {
                try {
                  await apiRequest(`/api/community/scenes/${communityScene.id}/import`, {
                    method: 'POST'
                  });
                  await charactersState.loadScenarios();
                  alert('Scene imported successfully!');
                } catch (error) {
                  console.error('Error importing scene:', error);
                  alert('Failed to import scene');
                }
              }}
              onClose={() => setActiveView('chat')}
            />
          </div>
        )}

        {activeView === 'manage' && (
          <div className="flex-1 overflow-hidden">
            <CharacterSceneHub
              fullScreen={true}
              characters={charactersState.characters}
              scenes={charactersState.scenarios}
              user={user}
              apiRequest={apiRequest}
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
          </div>
        )}

        {activeView === 'moderation' && isAdmin && (
          <div className="flex-1 overflow-hidden">
            <ModerationPanel
              fullScreen={true}
              apiRequest={apiRequest}
            />
          </div>
        )}

        {activeView === 'settings' && (
          <div className="flex-1 overflow-hidden">
            <SettingsModal
              user={user}
              settings={settings.userSettings}
              onSave={settings.saveUserSettings}
              onClose={() => setActiveView('chat')}
              fullScreen={true}
            />
          </div>
        )}

        {activeView === 'persona' && (
          <div className="flex-1 overflow-hidden">
            <PersonaManager
              personasState={personasState}
              user={user}
              apiRequest={apiRequest}
              onClose={() => setActiveView('chat')}
              fullScreen={true}
            />
          </div>
        )}
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
          apiRequest={apiRequest}
          user={user}
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
        <PersonaManager
          personasState={personasState}
          onClose={() => setShowPersonaEditor(false)}
          user={user}
          apiRequest={apiRequest}
        />
      )}

      {/* Login Required Modal */}
      <LoginRequiredModal
        isOpen={showLoginModal}
        onClose={() => {
          setShowLoginModal(false);
          setLoginRequiredFor('');
        }}
        feature={loginRequiredFor}
      />
    </div>
  );
};

export default MainApp;
