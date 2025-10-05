/**
 * Chat History Sidebar Component - Enhanced Version
 * Features: Collapsible, Real-time updates, Delete functionality
 */

import React, { useState, useEffect } from 'react';
import { 
  MessageCircle, 
  Plus, 
  Trash2, 
  Edit3, 
  Calendar, 
  Users, 
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';

const ChatHistorySidebar = ({ 
  apiRequest, 
  currentSessionId, 
  onSessionSelect, 
  onNewChat,
  characters,
  onHistoryUpdate // Add this prop to trigger updates from parent
}) => {
  const [chatSessions, setChatSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState(null);

  // Load chat history
  const loadChatHistory = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/api/chat/sessions');
      setChatSessions(response.sessions || []);
      console.log('📚 Loaded chat history:', response.sessions?.length || 0, 'sessions');
    } catch (error) {
      console.error('Failed to load chat history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Delete session with confirmation
  const deleteSession = async (sessionId, event) => {
    if (event) {
      event.stopPropagation();
    }
    
    setDeletingSessionId(sessionId);
    
    // Show confirmation
    const confirmed = window.confirm('Delete this chat? This cannot be undone.');
    
    if (!confirmed) {
      setDeletingSessionId(null);
      return;
    }
    
    try {
      await apiRequest(`/api/chat/sessions/${sessionId}`, { method: 'DELETE' });
      
      // Remove from local state
      setChatSessions(prev => prev.filter(s => s.id !== sessionId));
      
      // If deleted session was current, trigger new chat
      if (sessionId === currentSessionId) {
        onNewChat();
      }
      
      console.log('🗑️ Deleted session:', sessionId);
    } catch (error) {
      console.error('Failed to delete session:', error);
      alert('Failed to delete chat. Please try again.');
    } finally {
      setDeletingSessionId(null);
    }
  };

  // Update session title
  const updateSessionTitle = async (sessionId, newTitle) => {
    if (!newTitle.trim()) {
      setEditingSessionId(null);
      setEditTitle('');
      return;
    }
    
    try {
      await apiRequest(`/api/chat/sessions/${sessionId}`, {
        method: 'PUT',
        body: JSON.stringify({ title: newTitle.trim() })
      });
      
      setChatSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, title: newTitle.trim() } : s
      ));
      setEditingSessionId(null);
      setEditTitle('');
      
      console.log('✏️ Updated session title:', sessionId);
    } catch (error) {
      console.error('Failed to update session title:', error);
      alert('Failed to update chat title. Please try again.');
    }
  };

  // Start editing title
  const startEditing = (session, event) => {
    if (event) {
      event.stopPropagation();
    }
    setEditingSessionId(session.id);
    setEditTitle(session.title);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingSessionId(null);
    setEditTitle('');
  };

  // Format relative time
  const formatRelativeTime = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  // Get character names for session
  const getSessionCharacterNames = (activeCharacters) => {
    if (!activeCharacters || !characters) return '';
    
    const characterNames = activeCharacters
      .map(id => characters.find(c => c.id === id)?.name)
      .filter(Boolean)
      .slice(0, 3);
    
    if (characterNames.length === 0) return 'No characters';
    if (activeCharacters.length > 3) {
      return `${characterNames.join(', ')} +${activeCharacters.length - 3}`;
    }
    return characterNames.join(', ');
  };

  // Handle new chat
  const handleNewChat = () => {
    // Reload history to show the previous chat
    loadChatHistory();
    onNewChat();
  };

  // Initial load
  useEffect(() => {
    loadChatHistory();
  }, []);

  // Reload when current session changes (new chat started)
  useEffect(() => {
    if (currentSessionId) {
      // Small delay to ensure backend has saved the session
      const timer = setTimeout(() => {
        loadChatHistory();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentSessionId]);

  // Listen for history updates from parent
  useEffect(() => {
    if (onHistoryUpdate) {
      loadChatHistory();
    }
  }, [onHistoryUpdate]);

  // Toggle collapse
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <>
      {/* Collapsed View - Thin Bar */}
      {isCollapsed && (
        <div className="w-12 bg-black/20 backdrop-blur-sm border-r border-white/10 flex flex-col items-center py-4">
          <button
            onClick={toggleCollapse}
            className="p-2 text-gray-400 hover:text-white transition-colors mb-4"
            title="Expand chat history"
          >
            <ChevronRight size={20} />
          </button>
          
          <button
            onClick={handleNewChat}
            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors mb-4"
            title="New chat"
          >
            <Plus size={20} />
          </button>
          
          <div className="flex-1 flex items-center">
            <MessageCircle size={20} className="text-gray-500" />
          </div>
          
          {chatSessions.length > 0 && (
            <div className="mt-4 bg-red-500/20 text-red-300 text-xs px-2 py-1 rounded-full">
              {chatSessions.length}
            </div>
          )}
        </div>
      )}

      {/* Expanded View - Full Sidebar */}
      {!isCollapsed && (
        <div className="w-80 bg-black/20 backdrop-blur-sm border-r border-white/10 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MessageCircle className="text-red-400" size={20} />
                <h2 className="text-lg font-semibold text-white">Chat History</h2>
                {chatSessions.length > 0 && (
                  <span className="bg-red-500/20 text-red-300 text-xs px-2 py-0.5 rounded-full">
                    {chatSessions.length}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleNewChat}
                  className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg transition-colors text-sm"
                  title="Start new chat"
                >
                  <Plus size={16} />
                  New
                </button>
                
                <button
                  onClick={toggleCollapse}
                  className="p-1.5 text-gray-400 hover:text-white transition-colors"
                  title="Collapse sidebar"
                >
                  <ChevronLeft size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Chat Sessions List */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-400"></div>
              </div>
            ) : chatSessions.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle size={32} className="mx-auto mb-3 text-gray-500" />
                <p className="text-gray-400 text-sm">No chat history yet</p>
                <p className="text-gray-500 text-xs mt-1">Start a conversation to see it here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {chatSessions.map((session) => (
                  <div
                    key={session.id}
                    className={`group relative rounded-lg border transition-all ${
                      session.id === currentSessionId
                        ? 'bg-red-500/20 border-red-400/30'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    } ${
                      deletingSessionId === session.id ? 'opacity-50 pointer-events-none' : 'cursor-pointer'
                    }`}
                    onClick={() => {
                      if (editingSessionId !== session.id) {
                        onSessionSelect(session);
                      }
                    }}
                  >
                    {/* Delete Overlay */}
                    {deletingSessionId === session.id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg z-10">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      </div>
                    )}

                    <div className="p-3">
                      {/* Session Title */}
                      <div className="flex items-start justify-between mb-2">
                        {editingSessionId === session.id ? (
                          <div className="flex-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onBlur={() => updateSessionTitle(session.id, editTitle)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  updateSessionTitle(session.id, editTitle);
                                } else if (e.key === 'Escape') {
                                  cancelEditing();
                                }
                              }}
                              className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-red-400"
                              autoFocus
                            />
                            <button
                              onClick={cancelEditing}
                              className="p-1 text-gray-400 hover:text-white transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <h3 className="text-white text-sm font-medium line-clamp-2 flex-1 pr-2">
                              {session.title}
                            </h3>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => startEditing(session, e)}
                                className="p-1 text-gray-400 hover:text-white transition-colors"
                                title="Rename chat"
                              >
                                <Edit3 size={12} />
                              </button>
                              <button
                                onClick={(e) => deleteSession(session.id, e)}
                                className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                                title="Delete chat"
                                disabled={deletingSessionId === session.id}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Session Info */}
                      {editingSessionId !== session.id && (
                        <div className="space-y-1">
                          {/* Characters */}
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Users size={10} />
                            <span className="truncate">
                              {getSessionCharacterNames(session.active_characters)}
                            </span>
                          </div>

                          {/* Last Message Preview */}
                          {session.latest_message && (
                            <div className="text-xs text-gray-400 line-clamp-1">
                              {session.latest_message.type === 'user' ? 'You: ' : ''}
                              {session.latest_message.content}
                            </div>
                          )}

                          {/* Timestamp and Message Count */}
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar size={10} />
                              <span>{formatRelativeTime(session.updated_at)}</span>
                            </div>
                            <span>{session.message_count || 0} messages</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Current Session Indicator */}
                    {session.id === currentSessionId && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-400 rounded-l-lg"></div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer with Tips */}
          {!loading && chatSessions.length > 0 && (
            <div className="p-4 border-t border-white/10">
              <div className="text-xs text-gray-500">
                <p className="mb-1">💡 <span className="text-gray-400">Tips:</span></p>
                <ul className="space-y-0.5 ml-3">
                  <li>• Click a chat to continue it</li>
                  <li>• Hover to edit or delete</li>
                  <li>• Press Enter to save title</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default ChatHistorySidebar;
