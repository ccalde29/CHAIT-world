/**
 * AppShell
 *
 * The outermost layout frame for the whole application.
 * Owns nothing except the three-column flex structure:
 *
 *   [ NavigationSidebar ] [ main content (children) ] [ ActiveChatPanel? ]
 *
 * Business logic lives in MainApp; this component is purely structural.
 */

import React from 'react';
import NavigationSidebar from './NavigationSidebar';
import ActiveChatPanel from './ActiveChatPanel';
import { BG_APP } from '../styles/layout';

const AppShell = ({
  // ── Sidebar props ──────────────────────────────────────────────────────────
  apiRequest,
  currentSessionId,
  sessionRefreshTrigger,
  onSessionsLoad,
  onSessionSelect,
  onDeleteSession,
  onNewChat,
  onNavigate,
  activeView,
  isAdmin,

  // ── Right panel props ──────────────────────────────────────────────────────
  currentScene,
  activeCharacters,
  onRemoveCharacter,
  onChangeScene,
  rightPanelCollapsed,
  onToggleRightPanel,

  // ── Main slot ──────────────────────────────────────────────────────────────
  children,
}) => (
  <div className={`flex h-screen ${BG_APP} text-white`}>

    {/* Left sidebar — navigation + chat history */}
    <NavigationSidebar
      apiRequest={apiRequest}
      currentSessionId={currentSessionId}
      refreshTrigger={sessionRefreshTrigger}
      onSessionsLoad={onSessionsLoad}
      onSessionSelect={onSessionSelect}
      onDeleteSession={onDeleteSession}
      onNewChat={onNewChat}
      onNavigate={onNavigate}
      activeView={activeView}
      isAdmin={isAdmin}
    />

    {/* Centre — current view fills remaining space */}
    <div className="flex-1 flex flex-col overflow-hidden">
      {children}
    </div>

    {/* Right panel — active chat context, only during chat view */}
    {activeView === 'chat' && (
      <ActiveChatPanel
        currentScene={currentScene}
        activeCharacters={activeCharacters}
        onRemoveCharacter={onRemoveCharacter}
        onChangeScene={onChangeScene}
        isCollapsed={rightPanelCollapsed}
        onToggleCollapse={onToggleRightPanel}
      />
    )}
  </div>
);

export default AppShell;
