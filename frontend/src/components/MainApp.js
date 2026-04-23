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
import { createApiClient } from '../utils/apiClient';

// Shell components
import AppShell from './AppShell';
import ViewRouter from './ViewRouter';
import ModalLayer from './ModalLayer';

const MainApp = () => {
  const { user } = useAuth();

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
  const personasState = usePersonas(apiRequest);

  // ============================================================================
  // UI STATE
  // ============================================================================

  // Modal states
  const [showCharacterEditor, setShowCharacterEditor] = useState(false);
  const [showSceneEditor, setShowSceneEditor] = useState(false);
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
        setIsAdmin(response?.isAdmin || false);
      } catch (error) {
        console.error('[MainApp] Failed to load admin status:', error);
        // On native platform, check if user email matches admin email
        if (user?.email === 'ccalde29@gmail.com') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      }
    };
    loadAdminStatus();
  }, [user.id, user.email, apiRequest]);

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

  const handleSessionSelect = async (session) => {
    try {
      let sessionCharacters = [];
      if (session.active_characters && session.active_characters.length > 0) {
        sessionCharacters = session.active_characters
          .map(charId => charactersState.characters.find(c => c.id === charId))
          .filter(Boolean);
        charactersState.setActiveCharacters(sessionCharacters);
      }
      const fullSession = await chat.loadChatSession(session.id, sessionCharacters);
      if (fullSession.scenario_id) {
        charactersState.setCurrentScenario(fullSession.scenario_id);
      }
      setActiveView('chat');
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    try {
      await apiRequest(`/api/chat/sessions/${sessionId}`, { method: 'DELETE' });
      if (chat.currentSessionId === sessionId) {
        chat.clearChat();
        charactersState.setActiveCharacters([]);
        charactersState.setCurrentScenario(null);
        setActiveView('manage');
      }
      setSessionRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Failed to delete session:', error);
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

  const viewProps = {
    // ── Chat ──────────────────────────────────────────────────────────────────
    messages: chat.messages,
    userInput: chat.userInput,
    isGenerating: chat.isGenerating,
    generatingPersonaResponse: chat.generatingPersonaResponse,
    error: chat.error,
    messagesEndRef: chat.messagesEndRef,
    editingMessageId: chat.editingMessageId,
    userPersona: personasState.activePersona
      ? { hasPersona: true, persona: personasState.activePersona }
      : null,
    findCharacterById: charactersState.findCharacterById,
    onInputChange: chat.setUserInput,
    onSendMessage: handleSendMessage,
    onEditMessage: async (messageId, newContent) => {
      await chat.editMessage(
        messageId,
        newContent,
        charactersState.activeCharacters,
        charactersState.currentScenario,
        personasState.activePersona ? { hasPersona: true, persona: personasState.activePersona } : null,
        () => setSessionRefreshTrigger(p => p + 1)
      );
    },
    onStartEdit: chat.setEditingMessageId,
    onCancelEdit: () => chat.setEditingMessageId(null),
    onGeneratePersonaResponse: () => chat.generatePersonaResponse(
      personasState.activePersona ? { hasPersona: true, persona: personasState.activePersona } : null,
      charactersState.findScenarioById(charactersState.currentScenario)
    ),
    onKeyPress: (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !chat.isGenerating) {
        e.preventDefault();
        handleSendMessage();
      }
    },

    // ── Manage ────────────────────────────────────────────────────────────────
    characters: charactersState.characters,
    scenes: charactersState.scenarios,
    user,
    apiRequest,
    onAddCharacter: () => { setEditingCharacter(null); setShowCharacterEditor(true); },
    onEditCharacter: (char) => { setEditingCharacter(char); setShowCharacterEditor(true); },
    onDeleteCharacter: handleDeleteCharacter,
    onAddScene: () => { setEditingScene(null); setShowSceneEditor(true); },
    onEditScene: (scene) => { setEditingScene(scene); setShowSceneEditor(true); },
    onDeleteScene: handleDeleteScene,
    onPublishScene: async (sceneId, options = {}) => {
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
    },
    onUnpublishScene: handleUnpublishScene,
    onOpenMemoryViewer: (char) => { setSelectedCharacterForMemory(char); setShowMemoryViewer(true); },
    onPublishCharacter: handlePublishCharacter,
    onUnpublishCharacter: handleUnpublishCharacter,

    // ── Community ─────────────────────────────────────────────────────────────
    onImportCharacter: async (c) => {
      try {
        await apiRequest(`/api/community/characters/${c.id}/import`, { method: 'POST' });
        await charactersState.loadCharacters();
        alert('Character imported successfully!');
      } catch (error) {
        console.error('Error importing character:', error);
        alert('Failed to import character');
      }
    },
    onImportScene: async (s) => {
      try {
        await apiRequest(`/api/community/scenes/${s.id}/import`, { method: 'POST' });
        await charactersState.loadScenarios();
        alert('Scene imported successfully!');
      } catch (error) {
        console.error('Error importing scene:', error);
        alert('Failed to import scene');
      }
    },
    onCloseCommunity: () => setActiveView('chat'),

    // ── Settings ──────────────────────────────────────────────────────────────
    userSettings: settings.userSettings,
    onSaveSettings: settings.saveUserSettings,
    onCloseSettings: () => setActiveView('chat'),

    // ── Persona ───────────────────────────────────────────────────────────────
    personasState,
    onClosePersona: () => setActiveView('chat'),
  };

  const modalsState = {
    showNewChatModal,
    showCharacterEditor,
    showSceneEditor,
    showMemoryViewer,
    showPersonaEditor,
    showLoginModal,
    editingCharacter,
    editingScene,
    selectedCharacterForMemory,
    loginRequiredFor,
  };

  const modalHandlers = {
    onStartNewChat: handleStartNewChat,
    onCloseNewChat: () => setShowNewChatModal(false),
    onSaveCharacter: handleSaveCharacter,
    onCloseCharacterEditor: () => { setShowCharacterEditor(false); setEditingCharacter(null); },
    onSaveScene: async (sceneData) => {
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
    },
    onDeleteScene: handleDeleteScene,
    onPublishScene: async (sceneId) => {
      try {
        await apiRequest(`/api/community/scenes/${sceneId}/publish`, { method: 'POST' });
        await charactersState.loadScenarios();
        alert('Scene published to community!');
      } catch (error) {
        console.error('Error publishing scene:', error);
        alert('Failed to publish scene');
      }
    },
    onUnpublishScene: async (sceneId) => {
      try {
        await apiRequest(`/api/community/scenes/${sceneId}/unpublish`, { method: 'POST' });
        await charactersState.loadScenarios();
        alert('Scene removed from community');
      } catch (error) {
        console.error('Error unpublishing scene:', error);
        alert('Failed to unpublish scene');
      }
    },
    onCloseSceneEditor: () => { setShowSceneEditor(false); setEditingScene(null); },
    onCloseMemoryViewer: () => { setShowMemoryViewer(false); setSelectedCharacterForMemory(null); },
    onClosePersonaEditor: () => setShowPersonaEditor(false),
    onCloseLoginModal: () => { setShowLoginModal(false); setLoginRequiredFor(''); },
  };

  const sharedData = {
    user,
    userSettings: settings.userSettings,
    apiRequest,
    scenes: charactersState.scenarios,
    characters: charactersState.characters,
    personasState,
    currentScenario: charactersState.currentScenario,
    onScenarioSelect: charactersState.setCurrentScenario,
  };

  return (
    <>
      <AppShell
        apiRequest={apiRequest}
        currentSessionId={chat.currentSessionId}
        sessionRefreshTrigger={sessionRefreshTrigger}
        onSessionsLoad={(loadFn) => { loadSessionsRef.current = loadFn; }}
        onSessionSelect={handleSessionSelect}
        onDeleteSession={handleDeleteSession}
        onNewChat={() => setShowNewChatModal(true)}
        onNavigate={handleNavigate}
        activeView={activeView}
        isAdmin={isAdmin}
        currentScene={charactersState.findScenarioById(charactersState.currentScenario)}
        activeCharacters={charactersState.activeCharacters}
        onRemoveCharacter={(char) => charactersState.setActiveCharacters(prev => prev.filter(c => c.id !== char.id))}
        onChangeScene={() => setShowNewChatModal(true)}
        rightPanelCollapsed={rightPanelCollapsed}
        onToggleRightPanel={() => setRightPanelCollapsed(r => !r)}
      >
        <ViewRouter activeView={activeView} isAdmin={isAdmin} viewProps={viewProps} />
      </AppShell>

      <ModalLayer modals={modalsState} handlers={modalHandlers} shared={sharedData} />
    </>
  );
};

export default MainApp;
