/**
 * ViewRouter
 *
 * Maps the `activeView` string to the correct content component.
 * Replaces the six inline `{activeView === 'x' && <Component />}` blocks
 * that previously lived in MainApp's render.
 *
 * Every prop each view needs is passed through a single flat `viewProps`
 * object — ViewRouter destructures and distributes them so MainApp only
 * has to build one object.
 */

import React from 'react';
import ChatInterface from './ChatInterface';
import CharacterSceneHub from './CharacterSceneHub';
import CommunityHub from './CommunityHub';
import SettingsModal from './SettingsModal';
import PersonaManager from './PersonaManager';
import ModerationPanel from './ModerationPanel';

const ViewRouter = ({ activeView, isAdmin, viewProps }) => {
  const {
    // ── Chat ──────────────────────────────────────────────────────────────────
    messages,
    userInput,
    isGenerating,
    generatingPersonaResponse,
    error,
    messagesEndRef,
    editingMessageId,
    userPersona,
    findCharacterById,
    onInputChange,
    onSendMessage,
    onEditMessage,
    onStartEdit,
    onCancelEdit,
    onGeneratePersonaResponse,
    onKeyPress,

    // ── Manage ────────────────────────────────────────────────────────────────
    characters,
    scenes,
    user,
    apiRequest,
    onAddCharacter,
    onEditCharacter,
    onDeleteCharacter,
    onAddScene,
    onEditScene,
    onDeleteScene,
    onPublishScene,
    onUnpublishScene,
    onOpenMemoryViewer,
    onPublishCharacter,
    onUnpublishCharacter,

    // ── Community ─────────────────────────────────────────────────────────────
    onImportCharacter,
    onImportScene,
    onCloseCommunity,

    // ── Settings ──────────────────────────────────────────────────────────────
    userSettings,
    onSaveSettings,
    onCloseSettings,

    // ── Persona ───────────────────────────────────────────────────────────────
    personasState,
    onClosePersona,
  } = viewProps;

  switch (activeView) {
    case 'chat':
      return (
        <ChatInterface
          messages={messages}
          userInput={userInput}
          isGenerating={isGenerating}
          generatingPersonaResponse={generatingPersonaResponse}
          error={error}
          messagesEndRef={messagesEndRef}
          editingMessageId={editingMessageId}
          userPersona={userPersona}
          findCharacterById={findCharacterById}
          onInputChange={onInputChange}
          onSendMessage={onSendMessage}
          onEditMessage={onEditMessage}
          onStartEdit={onStartEdit}
          onCancelEdit={onCancelEdit}
          onGeneratePersonaResponse={onGeneratePersonaResponse}
          onKeyPress={onKeyPress}
        />
      );

    case 'manage':
      return (
        <div className="flex-1 overflow-hidden">
          <CharacterSceneHub
            fullScreen
            characters={characters}
            scenes={scenes}
            user={user}
            apiRequest={apiRequest}
            onAddCharacter={onAddCharacter}
            onEditCharacter={onEditCharacter}
            onDeleteCharacter={onDeleteCharacter}
            onAddScene={onAddScene}
            onEditScene={onEditScene}
            onDeleteScene={onDeleteScene}
            onPublishScene={onPublishScene}
            onUnpublishScene={onUnpublishScene}
            onOpenMemoryViewer={onOpenMemoryViewer}
            onPublishCharacter={onPublishCharacter}
            onUnpublishCharacter={onUnpublishCharacter}
          />
        </div>
      );

    case 'community':
      return (
        <div className="flex-1 overflow-hidden">
          <CommunityHub
            fullScreen
            apiRequest={apiRequest}
            onImportCharacter={onImportCharacter}
            onImportScene={onImportScene}
            onClose={onCloseCommunity}
          />
        </div>
      );

    case 'moderation':
      return isAdmin ? (
        <div className="flex-1 overflow-hidden">
          <ModerationPanel fullScreen apiRequest={apiRequest} />
        </div>
      ) : null;

    case 'settings':
      return (
        <div className="flex-1 overflow-hidden">
          <SettingsModal
            user={user}
            settings={userSettings}
            onSave={onSaveSettings}
            onClose={onCloseSettings}
            fullScreen
            apiRequest={apiRequest}
          />
        </div>
      );

    case 'persona':
      return (
        <div className="flex-1 overflow-hidden">
          <PersonaManager
            personasState={personasState}
            user={user}
            apiRequest={apiRequest}
            onClose={onClosePersona}
            fullScreen
          />
        </div>
      );

    default:
      return null;
  }
};

export default ViewRouter;
