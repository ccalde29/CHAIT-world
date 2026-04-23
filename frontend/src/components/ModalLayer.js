/**
 * ModalLayer
 *
 * Collects every floating modal / overlay into one place.
 * MainApp passes a `modals` state object and a `handlers` object;
 * ModalLayer renders whichever ones are currently open.
 *
 * Nothing here manages state — it only renders.
 */

import React from 'react';
import NewChatModal from './NewChatModal';
import CharacterEditor from './CharacterEditor';
import SceneEditor from './SceneEditor';
import CharacterMemoryViewer from './CharacterMemoryViewer';
import PersonaManager from './PersonaManager';
import LoginRequiredModal from './LoginRequiredModal';

/**
 * @param {object} modals   — visibility / data flags from MainApp state
 * @param {object} handlers — callback functions from MainApp
 * @param {object} shared   — data shared across multiple modals (user, settings, etc.)
 */
const ModalLayer = ({ modals, handlers, shared }) => {
  const {
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
  } = modals;

  const {
    onStartNewChat,
    onCloseNewChat,
    onSaveCharacter,
    onCloseCharacterEditor,
    onSaveScene,
    onDeleteScene,
    onPublishScene,
    onUnpublishScene,
    onCloseSceneEditor,
    onCloseMemoryViewer,
    onClosePersonaEditor,
    onCloseLoginModal,
  } = handlers;

  const {
    user,
    userSettings,
    apiRequest,
    scenes,
    characters,
    personasState,
    currentScenario,
    onScenarioSelect,
  } = shared;

  return (
    <>
      {/* New chat / scene picker */}
      {showNewChatModal && (
        <NewChatModal
          scenes={scenes}
          characters={characters}
          onStart={onStartNewChat}
          onClose={onCloseNewChat}
        />
      )}

      {/* Character create / edit */}
      {showCharacterEditor && (
        <CharacterEditor
          character={editingCharacter}
          user={user}
          userSettings={userSettings}
          onSave={onSaveCharacter}
          onClose={onCloseCharacterEditor}
        />
      )}

      {/* Scene create / edit */}
      {showSceneEditor && (
        <SceneEditor
          scenarios={scenes}
          initialEditingScene={editingScene}
          apiRequest={apiRequest}
          user={user}
          onSave={onSaveScene}
          onDelete={onDeleteScene}
          onPublish={onPublishScene}
          onUnpublish={onUnpublishScene}
          onClose={onCloseSceneEditor}
          currentScenario={currentScenario}
          onScenarioSelect={onScenarioSelect}
        />
      )}

      {/* Character memory viewer */}
      {showMemoryViewer && selectedCharacterForMemory && (
        <CharacterMemoryViewer
          character={selectedCharacterForMemory}
          onClose={onCloseMemoryViewer}
          apiRequest={apiRequest}
        />
      )}

      {/* Persona editor (modal variant — not the full-screen view) */}
      {showPersonaEditor && (
        <PersonaManager
          personasState={personasState}
          user={user}
          apiRequest={apiRequest}
          onClose={onClosePersonaEditor}
        />
      )}

      {/* Login gate — always in DOM, isOpen controls display */}
      <LoginRequiredModal
        isOpen={showLoginModal}
        onClose={onCloseLoginModal}
        feature={loginRequiredFor}
      />
    </>
  );
};

export default ModalLayer;
