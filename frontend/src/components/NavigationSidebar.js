// NavigationSidebar.js
// Main navigation sidebar with chat history and menu items

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Plus,
  Users,
  Film,
  Globe,
  Settings,
  User,
  LogOut,
  ChevronDown,
  ChevronRight,
  Lock,
  Shield
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const NavigationSidebar = ({
  apiRequest,
  currentSessionId,
  onSessionSelect,
  onNewChat,
  onNavigate,
  activeView,
  isAdmin
}) => {
  const { user, signOut } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showChatHistory, setShowChatHistory] = useState(true);

  // Load chat sessions function
  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/api/chat/sessions');
      setSessions(response.sessions || []);
    } catch (error) {
      console.error('Failed to load sessions:', error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  // Load sessions when user changes
  useEffect(() => {
    if (user) {
      loadSessions();
    } else {
      setSessions([]);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const menuItems = [
    {
      id: 'manage',
      label: 'Management',
      icon: Users,
      requiresAuth: false
    },
    {
      id: 'community',
      label: 'Community',
      icon: Globe,
      requiresAuth: false
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      requiresAuth: false
    }
  ];

  // Add admin menu item if user is admin
  if (isAdmin) {
    menuItems.push({
      id: 'moderation',
      label: 'Admin',
      icon: Shield,
      requiresAuth: false
    });
  }

  const handleMenuClick = (item) => {
    if (item.requiresAuth && !user) {
      // Show login modal
      onNavigate('login-required', item.id);
    } else {
      onNavigate(item.id);
    }
  };

  return (
    <div className="w-64 bg-slate-900 border-r border-white/10 flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <h1 className="text-xl font-bold text-white">CHAIT World</h1>
        <p className="text-xs text-gray-400">Local AI Chat</p>
      </div>

      {/* New Chat Button */}
      <div className="p-4">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium"
        >
          <Plus size={20} />
          New Chat
        </button>
      </div>

      {/* Chat History Section */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pb-2">
          <button
            onClick={() => setShowChatHistory(!showChatHistory)}
            className="w-full flex items-center justify-between text-gray-400 hover:text-white transition-colors py-2"
          >
            <div className="flex items-center gap-2">
              <MessageSquare size={16} />
              <span className="text-sm font-medium">Chat History</span>
            </div>
            {showChatHistory ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        {showChatHistory && (
          <div className="px-2">
            {loading ? (
              <div className="text-center text-gray-500 py-4 text-sm">
                Loading chats...
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center text-gray-500 py-4 text-sm px-2">
                No chat history yet
              </div>
            ) : (
              <div className="space-y-1">
                {sessions.map(session => (
                  <button
                    key={session.id}
                    onClick={() => onSessionSelect(session)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      currentSessionId === session.id
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    <div className="text-sm font-medium truncate">
                      {session.title || 'Untitled Chat'}
                    </div>
                    <div className="text-xs text-gray-400 truncate">
                      {new Date(session.created_at).toLocaleDateString()}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Menu Items */}
        <div className="mt-6 px-2 space-y-1">
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => handleMenuClick(item)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </div>
                {item.locked && <Lock size={16} className="text-gray-400" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* User Profile Section */}
      <div className="border-t border-white/10 p-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
              <User size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">
                {user?.email || 'User'}
              </div>
              <div className="text-xs text-gray-400">Signed In</div>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default NavigationSidebar;
