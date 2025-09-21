import React, { useState, useEffect } from 'react';
import { MessageCircle, Plus, Trash2, Edit3, Calendar, Users } from 'lucide-react';

const ChatHistorySidebar = ({ 
  apiRequest, 
  currentSessionId, 
  onSessionSelect, 
  onNewChat,
  characters 
}) => {
  const [chatSessions, setChatSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  // Load chat history
  const loadChatHistory = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/api/chat/sessions');
      setChatSessions(response.sessions || []);
    } catch (error) {
      console.error('Failed to load chat history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Delete session
  const deleteSession = async (sessionId) => {
    if (!window.confirm('Delete this chat? This cannot be undone.')) return;
    
    try {
      await apiRequest(`/api/chat/sessions/${sessionId}`, { method: 'DELETE' });
      setChatSessions(prev => prev.filter(s => s.id !== sessionId));
      
      // If deleted session was current, trigger new chat
      if (sessionId === currentSessionId) {
        onNewChat();
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  // Update session title
  const updateSessionTitle = async (sessionId, newTitle) => {
    try {
      await apiRequest(`/api/chat/sessions/${sessionId}`, {
        method: 'PUT',
        body: JSON.stringify({ title: newTitle })
      });
      
      setChatSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, title: newTitle } : s
      ));
      setEditingSessionId(null);
      setEditTitle('');
    } catch (error) {
      console.error('Failed to update session title:', error);
    }
  };

  // Start editing title
  const startEditing = (session) => {
    setEditingSessionId(session.id);
    setEditTitle(session.title);
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
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
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

  useEffect(() => {
    loadChatHistory();
  }, []);

  return (
    <div className="w-80 bg-black/20 backdrop-blur-sm border-r border-white/10 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <MessageCircle size={20} />
            Chat History
          </h2>
          <button
            onClick={onNewChat}
            className="flex items-center gap-1 bg-purple-500 hover:bg-purple-600 text-white px-3 py-1.5 rounded-lg transition-colors text-sm"
          >
            <Plus size={16} />
            New Chat
          </button>
        </div>
      </div>

      {/* Chat Sessions List */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400"></div>
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
                className={`p-3 rounded-lg border transition-all cursor-pointer group ${
                  session.id === currentSessionId
                    ? 'bg-purple-500/20 border-purple-400/30'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
                onClick={() => onSessionSelect(session)}
              >
                {/* Session Title */}
                <div className="flex items-start justify-between mb-2">
                  {editingSessionId === session.id ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={() => updateSessionTitle(session.id, editTitle)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          updateSessionTitle(session.id, editTitle);
                        } else if (e.key === 'Escape') {
                          setEditingSessionId(null);
                          setEditTitle('');
                        }
                      }}
                      className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-purple-400"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <h3 className="text-white text-sm font-medium line-clamp-2 flex-1">
                      {session.title}
                    </h3>
                  )}
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditing(session);
                      }}
                      className="p-1 text-gray-400 hover:text-white transition-colors"
                      title="Rename chat"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(session.id);
                      }}
                      className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                      title="Delete chat"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Session Info */}
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
                    <span>{session.message_count} messages</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatHistorySidebar;